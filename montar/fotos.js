/*
 * fotos.js — o "provador" de fotos: tudo roda no aparelho da lojista, nada é enviado antes de publicar.
 *  - gira a foto pelo EXIF, reduz e guarda uma cópia (para refazer o enquadramento depois);
 *  - acha a peça separando do fundo pelas bordas e corta em 4:5 com folga em volta dela;
 *  - corrige luz (estica o contraste e clareia foto escura) e comprime em JPEG ~100 KB;
 *  - descobre a cor principal da peça e dá um nome em português;
 *  - avisa quando a foto está escura, pequena, tremida ou com fundo carregado.
 */
(function (root) {
  'use strict';
  var SAIDA = { w: 720, h: 900 }, ORIG_MAX = 1600;

  var CORES = [
    ['Preto', '#151515'], ['Branco', '#F4F4F2'], ['Off-white', '#EDE8DF'], ['Cinza', '#8A8D91'], ['Grafite', '#3A3D42'],
    ['Nude', '#D8C4B0'], ['Bege', '#CDB79E'], ['Caramelo', '#B07A45'], ['Chocolate', '#5B3A2A'], ['Café', '#4B3226'], ['Marrom', '#6B4430'], ['Terracota', '#B5573A'],
    ['Vinho', '#5C1F31'], ['Vermelho', '#B5202A'], ['Coral', '#F07A6A'], ['Rosa claro', '#F2C6CF'], ['Rosa', '#E39AB4'], ['Pink', '#D62F7F'],
    ['Lilás', '#B9A3D6'], ['Roxo', '#6B3FA0'], ['Azul bebê', '#A9CBEA'], ['Azul serenity', '#86A9DD'], ['Azul', '#3E6FB0'], ['Azul royal', '#2448C4'], ['Marinho', '#22315F'],
    ['Verde menta', '#9FD8C2'], ['Verde', '#4E7A5A'], ['Verde militar', '#4B5A3A'], ['Amarelo', '#E8C547'], ['Laranja', '#E8742A']
  ];

  function hexRgb(h) { var n = parseInt(h.slice(1), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; }
  function rgbHex(r, g, b) { return '#' + [r, g, b].map(function (v) { return ('0' + Math.round(v).toString(16)).slice(-2); }).join('').toUpperCase(); }
  function lab(r, g, b) {
    var f = function (c) { c /= 255; return c > 0.04045 ? Math.pow((c + 0.055) / 1.055, 2.4) : c / 12.92; };
    r = f(r); g = f(g); b = f(b);
    var x = (r * 0.4124 + g * 0.3576 + b * 0.1805) / 0.95047, y = r * 0.2126 + g * 0.7152 + b * 0.0722, z = (r * 0.0193 + g * 0.1192 + b * 0.9505) / 1.08883;
    var t = function (v) { return v > 0.008856 ? Math.cbrt(v) : 7.787 * v + 16 / 116; };
    return [116 * t(y) - 16, 500 * (t(x) - t(y)), 200 * (t(y) - t(z))];
  }
  function dLab(a, b) { return Math.sqrt(Math.pow(a[0] - b[0], 2) + Math.pow(a[1] - b[1], 2) + Math.pow(a[2] - b[2], 2)); }
  // referências extras só para reconhecer a cor em foto (pano fotografado fica mais escuro e mais "sujo" que a cor pura)
  var EXTRAS = [['Vinho', '#6E3443'], ['Nude', '#B9A48E'], ['Bege', '#A8957F'], ['Marinho', '#2A3A6A'], ['Off-white', '#D9D4CB']];
  var CORES_LAB = CORES.concat(EXTRAS).map(function (c) { var v = hexRgb(c[1]); return [c[0], c[1], lab(v[0], v[1], v[2])]; });
  var HEX = {}; CORES.forEach(function (c) { HEX[c[0]] = c[1]; });
  function nomeDaCor(r, g, b) {
    var l = lab(r, g, b), croma = Math.sqrt(l[1] * l[1] + l[2] * l[2]), melhor = null, dm = 1e9;
    // tecido escuro e sem cor quase sempre é preto (o reflexo da luz o deixa cinza-escuro na foto)
    if (l[0] < 28 && croma < 12 && !(l[1] > 3 && l[2] > 4)) return { nome: 'Preto', hex: HEX.Preto };
    // a luz muda muito o claro/escuro; o tom (a, b) diz mais sobre a cor do que a luminosidade
    CORES_LAB.forEach(function (c) { var d = Math.pow((l[0] - c[2][0]) * 0.6, 2) + Math.pow(l[1] - c[2][1], 2) + Math.pow(l[2] - c[2][2], 2); if (d < dm) { dm = d; melhor = c; } });
    return { nome: melhor[0], hex: HEX[melhor[0]] };
  }

  function canvas(w, h) { var c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
  function carregar(arquivo) {
    if (root.createImageBitmap) return createImageBitmap(arquivo, { imageOrientation: 'from-image' }).catch(function () { return viaImg(arquivo); });
    return viaImg(arquivo);
  }
  function viaImg(fonte) {
    return new Promise(function (ok, erro) {
      var img = new Image(), url = typeof fonte === 'string' ? fonte : URL.createObjectURL(fonte);
      img.onload = function () { ok(img); }; img.onerror = function () { erro(new Error('Não deu para abrir esta imagem.')); }; img.src = url;
    });
  }

  /** Lê a foto miniatura e devolve o retângulo da peça, a cor dela, brilho, contraste e nitidez. */
  function analisar(fonte) {
    var W = 120, H = Math.max(1, Math.round(fonte.height / fonte.width * W)), c = canvas(W, H), x = c.getContext('2d', { willReadFrequently: true });
    x.drawImage(fonte, 0, 0, W, H);
    var d = x.getImageData(0, 0, W, H).data, n = W * H;
    // fundo = a cor mais comum nas bordas (a média mistura fundo e peça quando a peça encosta na borda)
    var bb = {}, nb = 0;
    function borda(k) { var q = (d[k] >> 4) + ',' + (d[k + 1] >> 4) + ',' + (d[k + 2] >> 4), v = bb[q] || (bb[q] = [0, 0, 0, 0]); v[0]++; v[1] += d[k]; v[2] += d[k + 1]; v[3] += d[k + 2]; nb++; }
    for (var i = 0; i < W; i++) { borda(i * 4); borda(((H - 1) * W + i) * 4); }
    for (var j = 1; j < H - 1; j++) { borda(j * W * 4); borda((j * W + W - 1) * 4); }
    var topo = Object.keys(bb).map(function (k) { return bb[k]; }).sort(function (a, b) { return b[0] - a[0]; })[0];
    var fr = topo[1] / topo[0], fg = topo[2] / topo[0], fb = topo[3] / topo[0], parecidas = 0;
    var perto = function (k) { return Math.abs(d[k] - fr) + Math.abs(d[k + 1] - fg) + Math.abs(d[k + 2] - fb) <= 45; };
    for (var i3 = 0; i3 < W; i3++) { if (perto(i3 * 4)) parecidas++; if (perto(((H - 1) * W + i3) * 4)) parecidas++; }
    for (var j3 = 1; j3 < H - 1; j3++) { if (perto(j3 * W * 4)) parecidas++; if (perto((j3 * W + W - 1) * 4)) parecidas++; }
    var fundoLiso = parecidas / nb;
    var minX = W, minY = H, maxX = 0, maxY = 0, cont = 0, lums = new Array(n), bins = {};
    for (var p = 0; p < n; p++) {
      var r = d[p * 4], g = d[p * 4 + 1], b = d[p * 4 + 2];
      lums[p] = 0.2126 * r + 0.7152 * g + 0.0722 * b;
      var dist = Math.abs(r - fr) + Math.abs(g - fg) + Math.abs(b - fb);
      if (dist > 60) {
        var px = p % W, py = (p / W) | 0; cont++;
        if (px < minX) minX = px; if (px > maxX) maxX = px; if (py < minY) minY = py; if (py > maxY) maxY = py;
        // cor quantizada em faixas largas; o que está no meio da foto pesa mais (a peça costuma estar ali)
        var wc = Math.exp(-(Math.pow(px / W - 0.5, 2) / 0.08 + Math.pow(py / H - 0.5, 2) / 0.12));
        var q = (r >> 5) + ',' + (g >> 5) + ',' + (b >> 5), bin = bins[q] || (bins[q] = [0, 0, 0, 0]);
        bin[0] += wc; bin[1] += r * wc; bin[2] += g * wc; bin[3] += b * wc;
      }
    }
    var parte = cont / n, caixa;
    if (parte < 0.04 || parte > 0.94 || fundoLiso < 0.3) caixa = { x: 0, y: 0, w: 1, h: 1 };
    else caixa = { x: minX / W, y: minY / H, w: (maxX - minX + 1) / W, h: (maxY - minY + 1) / H };
    // cor: junta faixas parecidas e escolhe a de maior peso. Pele, parede e sombra pesam menos;
    // cor viva pesa mais. Pele não é descartada de vez para não perder peça nude/bege em foto sem modelo.
    var fundoLab = lab(fr, fg, fb);
    var lista = Object.keys(bins).map(function (k) {
      var v = bins[k], o = { n: v[0], r: v[1] / v[0], g: v[2] / v[0], b: v[3] / v[0] };
      o.lab = lab(o.r, o.g, o.b); o.croma = Math.sqrt(o.lab[1] * o.lab[1] + o.lab[2] * o.lab[2]);
      var pele = o.r > 120 && o.r > o.g && o.g > o.b && (o.r - o.b) > 25 && (o.r - o.b) < 110 && o.r - o.g < 60;
      var pertoFundo = dLab(o.lab, fundoLab) < 25 && o.croma < 18;
      o.peso = o.n * (pele ? 0.35 : 1) * (pertoFundo ? 0.3 : 1) * (pele ? 1 : 1 + Math.min(o.croma, 40) / 40);
      return o;
    });
    lista.forEach(function (o) { o.soma = lista.reduce(function (s, x) { return s + (dLab(o.lab, x.lab) < 20 ? x.peso : 0); }, 0); });
    lista.sort(function (a, b) { return b.soma - a.soma; });
    // a cor do grupo vencedor é a média (pelo peso) das faixas vizinhas: evita pegar o tom "sujo" do meio
    var escolha = { r: fr, g: fg, b: fb };
    if (lista[0]) {
      var tr = 0, tg = 0, tb = 0, tp = 0;
      lista.forEach(function (x) { if (dLab(lista[0].lab, x.lab) < 20) { tr += x.r * x.peso; tg += x.g * x.peso; tb += x.b * x.peso; tp += x.peso; } });
      escolha = { r: tr / tp, g: tg / tp, b: tb / tp };
    }
    // balanço de branco: se o fundo é claro e quase sem cor (parede, lençol), a dominante dele é da luz, não da peça
    var er = escolha.r, eg = escolha.g, eb = escolha.b, fl = fundoLab, fc = Math.sqrt(fl[1] * fl[1] + fl[2] * fl[2]);
    if (fl[0] > 55 && fc < 20) {
      var cinza = (fr + fg + fb) / 3, k = 0.7;
      er = Math.min(255, er * (1 + k * (cinza / fr - 1))); eg = Math.min(255, eg * (1 + k * (cinza / fg - 1))); eb = Math.min(255, eb * (1 + k * (cinza / fb - 1)));
    }
    var cor = nomeDaCor(er, eg, eb);
    // brilho e contraste
    var ord = lums.slice().sort(function (a, b) { return a - b; });
    var p2 = ord[Math.floor(n * 0.02)], p98 = ord[Math.floor(n * 0.98)], media = lums.reduce(function (s, v) { return s + v; }, 0) / n;
    // nitidez: variância do laplaciano
    var soma = 0, soma2 = 0, m = 0;
    for (var yy = 1; yy < H - 1; yy++) for (var xx = 1; xx < W - 1; xx++) {
      var k2 = yy * W + xx, lap = 4 * lums[k2] - lums[k2 - 1] - lums[k2 + 1] - lums[k2 - W] - lums[k2 + W];
      soma += lap; soma2 += lap * lap; m++;
    }
    var nit = soma2 / m - Math.pow(soma / m, 2);
    return { caixa: caixa, fundoCheio: fundoLiso < 0.3, cor: cor, p2: p2, p98: p98, media: media, nitidez: nit };
  }

  /** Recorta em 4:5 em volta da peça (ou do ponto escolhido) e corrige a luz. */
  function compor(fonte, a, foco) {
    var iw = fonte.width, ih = fonte.height, alvo = SAIDA.w / SAIDA.h;
    var cx = foco ? foco.x : a.caixa.x + a.caixa.w / 2, cy = foco ? foco.y : a.caixa.y + a.caixa.h / 2;
    var ch = Math.min(ih, Math.max(a.caixa.h * ih * 1.18, a.caixa.w * iw * 1.18 / alvo, ih * 0.55)), cw = ch * alvo;
    if (cw > iw) { cw = iw; ch = cw / alvo; }
    var sx = Math.min(Math.max(cx * iw - cw / 2, 0), iw - cw), sy = Math.min(Math.max(cy * ih - ch / 2, 0), ih - ch);
    var c = canvas(SAIDA.w, SAIDA.h), x = c.getContext('2d');
    x.imageSmoothingQuality = 'high';
    x.fillStyle = '#FFFFFF'; x.fillRect(0, 0, SAIDA.w, SAIDA.h);
    x.drawImage(fonte, sx, sy, cw, ch, 0, 0, SAIDA.w, SAIDA.h);
    // luz: estica o contraste quando a foto está "lavada" e clareia quando está escura
    var faixa = a.p98 - a.p2, ganho = faixa < 210 ? Math.min(1.45, 235 / Math.max(faixa, 40)) : 1, base = faixa < 210 ? a.p2 : 0;
    var gama = a.media < 95 ? 0.82 : (a.media > 200 ? 1.08 : 1);
    if (ganho !== 1 || gama !== 1) {
      var img = x.getImageData(0, 0, SAIDA.w, SAIDA.h), d = img.data, lut = new Uint8ClampedArray(256);
      for (var v = 0; v < 256; v++) lut[v] = 255 * Math.pow(Math.min(1, Math.max(0, ((v - base) * ganho + (ganho !== 1 ? 8 : 0)) / 255)), gama);
      for (var k = 0; k < d.length; k += 4) { d[k] = lut[d[k]]; d[k + 1] = lut[d[k + 1]]; d[k + 2] = lut[d[k + 2]]; }
      x.putImageData(img, 0, 0);
    }
    return c.toDataURL('image/jpeg', 0.82);
  }

  function avisos(fonte, a) {
    var lista = [];
    if (Math.min(fonte.width, fonte.height) < 600) lista.push('Foto pequena: use a câmera do celular, não print.');
    if (a.media < 70) lista.push('Foto escura: tire perto de uma janela, sem flash.');
    if (a.nitidez < 60) lista.push('Parece tremida: apoie o celular e toque na peça para focar.');
    if (a.fundoCheio) lista.push('Fundo carregado: um fundo liso deixa a peça em destaque.');
    return lista;
  }

  /** Arquivo da câmera/galeria -> foto pronta para a vitrine. */
  function processar(arquivo) {
    return carregar(arquivo).then(function (bmp) {
      var esc = Math.min(1, ORIG_MAX / Math.max(bmp.width, bmp.height)), c = canvas(Math.round(bmp.width * esc), Math.round(bmp.height * esc));
      c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
      var a = analisar(c);
      return { img: compor(c, a, null), orig: c.toDataURL('image/jpeg', 0.85), cor: a.cor.nome, hex: a.cor.hex, avisos: avisos(bmp, a), ajuste: a };
    });
  }
  /** Refaz o enquadramento centrando no ponto que a lojista tocou (0..1 da foto original). */
  function reenquadrar(orig, foco) {
    return viaImg(orig).then(function (img) { var a = analisar(img); return compor(img, a, foco); });
  }

  root.Fotos = { processar: processar, reenquadrar: reenquadrar, CORES: CORES, nomeDaCor: nomeDaCor };
})(typeof self !== 'undefined' ? self : this);
