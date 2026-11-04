/*
 * qr.js — QR code sem biblioteca externa (modo byte, UTF-8, versões 1 a 40, correção L/M/Q/H).
 * Segue a norma ISO/IEC 18004: Reed-Solomon em GF(256), blocos intercalados, 8 máscaras e a
 * pontuação de penalidade para escolher a mais legível.
 *
 *   QR.matriz('https://wa.me/5567992122801')        → { tamanho: 29, m: [[true, false, ...], ...] }
 *   QR.svg('https://...', { borda: 4, cor: '#0A1630' }) → '<svg ...>' (quadrados num único path)
 *
 * Funciona no navegador (window.QR) e no Node (require), para o site, o painel do vendedor e o portfólio em PDF.
 */
(function (raiz, fabrica) {
  if (typeof module === 'object' && module.exports) module.exports = fabrica();
  else raiz.QR = fabrica();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var NIVEIS = { L: 0, M: 1, Q: 2, H: 3 };
  var BITS_FORMATO = [1, 0, 3, 2]; // L, M, Q, H na palavra de formato
  // palavras de correção por bloco e número de blocos, por nível e versão (índice 0 não usado)
  var ECC_POR_BLOCO = [
    [-1, 7, 10, 15, 20, 26, 18, 20, 24, 30, 18, 20, 24, 26, 30, 22, 24, 28, 30, 28, 28, 28, 28, 30, 30, 26, 28, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30],
    [-1, 10, 16, 26, 18, 24, 16, 18, 22, 22, 26, 30, 22, 22, 24, 24, 28, 28, 26, 26, 26, 26, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28],
    [-1, 13, 22, 18, 26, 18, 24, 18, 22, 20, 24, 28, 26, 24, 20, 30, 24, 28, 28, 26, 30, 28, 30, 30, 30, 30, 28, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30],
    [-1, 17, 28, 22, 16, 22, 28, 26, 26, 24, 28, 24, 28, 22, 24, 24, 30, 28, 28, 26, 28, 30, 24, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30]
  ];
  var BLOCOS = [
    [-1, 1, 1, 1, 1, 1, 2, 2, 2, 2, 4, 4, 4, 4, 4, 6, 6, 6, 6, 7, 8, 8, 9, 9, 10, 12, 12, 12, 13, 14, 15, 16, 17, 18, 19, 19, 20, 21, 22, 24, 25],
    [-1, 1, 1, 1, 2, 2, 4, 4, 4, 5, 5, 5, 8, 9, 9, 10, 10, 11, 13, 14, 16, 17, 17, 18, 20, 21, 23, 25, 26, 28, 29, 31, 33, 35, 37, 38, 40, 43, 45, 47, 49],
    [-1, 1, 1, 2, 2, 4, 4, 6, 6, 8, 8, 8, 10, 12, 16, 12, 17, 16, 18, 21, 20, 23, 23, 25, 27, 29, 34, 34, 35, 38, 40, 43, 45, 48, 51, 53, 56, 59, 62, 65, 68],
    [-1, 1, 1, 2, 4, 4, 4, 5, 6, 8, 8, 11, 11, 16, 16, 18, 16, 19, 21, 25, 25, 25, 34, 30, 32, 35, 37, 40, 42, 45, 48, 51, 54, 57, 60, 63, 66, 70, 74, 77, 81]
  ];

  function modulosBrutos(v) {
    var r = (16 * v + 128) * v + 64;
    if (v >= 2) { var n = Math.floor(v / 7) + 2; r -= (25 * n - 10) * n - 55; if (v >= 7) r -= 36; }
    return r;
  }
  function palavrasDeDados(v, n) { return Math.floor(modulosBrutos(v) / 8) - ECC_POR_BLOCO[n][v] * BLOCOS[n][v]; }

  function utf8(texto) {
    var s = unescape(encodeURIComponent(String(texto))), b = [];
    for (var i = 0; i < s.length; i++) b.push(s.charCodeAt(i));
    return b;
  }

  /* ---------- Reed-Solomon em GF(256), polinômio 0x11D ---------- */
  function mult(x, y) {
    var z = 0;
    for (var i = 7; i >= 0; i--) { z = (z << 1) ^ ((z >>> 7) * 0x11D); z ^= ((y >>> i) & 1) * x; }
    return z & 0xFF;
  }
  function divisor(grau) {
    var r = []; for (var i = 0; i < grau - 1; i++) r.push(0); r.push(1);
    var raizG = 1;
    for (var k = 0; k < grau; k++) {
      for (var j = 0; j < r.length; j++) { r[j] = mult(r[j], raizG); if (j + 1 < r.length) r[j] ^= r[j + 1]; }
      raizG = mult(raizG, 0x02);
    }
    return r;
  }
  function resto(dados, div) {
    var r = div.map(function () { return 0; });
    dados.forEach(function (b) {
      var f = b ^ r.shift(); r.push(0);
      div.forEach(function (c, i) { r[i] ^= mult(c, f); });
    });
    return r;
  }

  /* ---------- codificação ---------- */
  function escolherVersao(bytes, n) {
    for (var v = 1; v <= 40; v++) {
      var bitsContagem = v <= 9 ? 8 : 16;
      if (4 + bitsContagem + bytes.length * 8 <= palavrasDeDados(v, n) * 8) return v;
    }
    throw new Error('Texto longo demais para um QR code.');
  }
  function palavras(bytes, v, n) {
    var bits = [], por = function (val, len) { for (var i = len - 1; i >= 0; i--) bits.push((val >>> i) & 1); };
    por(4, 4); por(bytes.length, v <= 9 ? 8 : 16);
    bytes.forEach(function (b) { por(b, 8); });
    var cap = palavrasDeDados(v, n) * 8;
    por(0, Math.min(4, cap - bits.length));
    por(0, (8 - bits.length % 8) % 8);
    for (var pad = 0xEC; bits.length < cap; pad ^= 0xEC ^ 0x11) por(pad, 8);
    var out = [];
    for (var i = 0; i < bits.length; i += 8) { var x = 0; for (var j = 0; j < 8; j++) x = (x << 1) | bits[i + j]; out.push(x); }
    return out;
  }
  function comCorrecao(dados, v, n) {
    var nb = BLOCOS[n][v], ecc = ECC_POR_BLOCO[n][v], brutos = Math.floor(modulosBrutos(v) / 8);
    var curtos = nb - brutos % nb, tamCurto = Math.floor(brutos / nb), div = divisor(ecc), blocos = [], k = 0;
    for (var i = 0; i < nb; i++) {
      var d = dados.slice(k, k + tamCurto - ecc + (i < curtos ? 0 : 1)); k += d.length;
      var e = resto(d, div);
      if (i < curtos) d.push(0);
      blocos.push(d.concat(e));
    }
    var out = [];
    for (var c = 0; c < blocos[0].length; c++) {
      for (var b = 0; b < blocos.length; b++) if (c !== tamCurto - ecc || b >= curtos) out.push(blocos[b][c]);
    }
    return out;
  }

  /* ---------- desenho da matriz ---------- */
  function Grade(v) {
    var t = v * 4 + 17, m = [], f = [];
    for (var y = 0; y < t; y++) { m.push(new Array(t).fill(false)); f.push(new Array(t).fill(false)); }
    this.v = v; this.t = t; this.m = m; this.f = f;
  }
  Grade.prototype.fixo = function (x, y, escuro) { this.m[y][x] = escuro; this.f[y][x] = true; };
  Grade.prototype.padroes = function () {
    var t = this.t, i, self = this;
    for (i = 0; i < t; i++) { this.fixo(6, i, i % 2 === 0); this.fixo(i, 6, i % 2 === 0); }
    var localizador = function (cx, cy) {
      for (var dy = -4; dy <= 4; dy++) for (var dx = -4; dx <= 4; dx++) {
        var d = Math.max(Math.abs(dx), Math.abs(dy)), x = cx + dx, y = cy + dy;
        if (x >= 0 && x < t && y >= 0 && y < t) self.fixo(x, y, d !== 2 && d !== 4);
      }
    };
    localizador(3, 3); localizador(t - 4, 3); localizador(3, t - 4);
    var pos = this.alinhamento(), n = pos.length;
    for (i = 0; i < n; i++) for (var j = 0; j < n; j++) {
      if ((i === 0 && j === 0) || (i === 0 && j === n - 1) || (i === n - 1 && j === 0)) continue;
      for (var dy2 = -2; dy2 <= 2; dy2++) for (var dx2 = -2; dx2 <= 2; dx2++) this.fixo(pos[i] + dx2, pos[j] + dy2, Math.max(Math.abs(dx2), Math.abs(dy2)) !== 1);
    }
    this.formato(0, 0); // reserva a área do formato antes dos dados
    this.versao();
  };
  Grade.prototype.alinhamento = function () {
    var v = this.v;
    if (v === 1) return [];
    var n = Math.floor(v / 7) + 2, passo = v === 32 ? 26 : Math.ceil((v * 4 + 4) / (n * 2 - 2)) * 2, r = [6];
    for (var p = this.t - 7; r.length < n; p -= passo) r.splice(1, 0, p);
    return r;
  };
  Grade.prototype.formato = function (nivel, mascara) {
    var dados = BITS_FORMATO[nivel] << 3 | mascara, r = dados;
    for (var i = 0; i < 10; i++) r = (r << 1) ^ ((r >>> 9) * 0x537);
    var bits = (dados << 10 | r) ^ 0x5412, t = this.t, bit = function (k) { return ((bits >>> k) & 1) !== 0; };
    for (i = 0; i <= 5; i++) this.fixo(8, i, bit(i));
    this.fixo(8, 7, bit(6)); this.fixo(8, 8, bit(7)); this.fixo(7, 8, bit(8));
    for (i = 9; i < 15; i++) this.fixo(14 - i, 8, bit(i));
    for (i = 0; i < 8; i++) this.fixo(t - 1 - i, 8, bit(i));
    for (i = 8; i < 15; i++) this.fixo(8, t - 15 + i, bit(i));
    this.fixo(8, t - 8, true);
  };
  Grade.prototype.versao = function () {
    if (this.v < 7) return;
    var r = this.v;
    for (var i = 0; i < 12; i++) r = (r << 1) ^ ((r >>> 11) * 0x1F25);
    var bits = this.v << 12 | r;
    for (i = 0; i < 18; i++) {
      var b = ((bits >>> i) & 1) !== 0, a = this.t - 11 + i % 3, c = Math.floor(i / 3);
      this.fixo(a, c, b); this.fixo(c, a, b);
    }
  };
  Grade.prototype.dados = function (cw) {
    var i = 0, t = this.t;
    for (var dir = t - 1; dir >= 1; dir -= 2) {
      if (dir === 6) dir = 5;
      for (var vert = 0; vert < t; vert++) for (var j = 0; j < 2; j++) {
        var x = dir - j, sobe = ((dir + 1) & 2) === 0, y = sobe ? t - 1 - vert : vert;
        if (!this.f[y][x] && i < cw.length * 8) { this.m[y][x] = ((cw[i >>> 3] >>> (7 - (i & 7))) & 1) !== 0; i++; }
      }
    }
  };
  var MASCARAS = [
    function (x, y) { return (x + y) % 2 === 0; },
    function (x, y) { return y % 2 === 0; },
    function (x) { return x % 3 === 0; },
    function (x, y) { return (x + y) % 3 === 0; },
    function (x, y) { return (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0; },
    function (x, y) { return x * y % 2 + x * y % 3 === 0; },
    function (x, y) { return (x * y % 2 + x * y % 3) % 2 === 0; },
    function (x, y) { return ((x + y) % 2 + x * y % 3) % 2 === 0; }
  ];
  Grade.prototype.mascara = function (k) {
    for (var y = 0; y < this.t; y++) for (var x = 0; x < this.t; x++) if (!this.f[y][x] && MASCARAS[k](x, y)) this.m[y][x] = !this.m[y][x];
  };
  // penalidade da norma: sequências, blocos 2x2, padrão parecido com o localizador e equilíbrio claro/escuro
  Grade.prototype.penalidade = function () {
    var t = this.t, m = this.m, p = 0, x, y, escuros = 0;
    var linha = function (get) {
      var s = 0, run = 1, seq = [];
      for (var i = 0; i < t; i++) seq.push(get(i));
      for (i = 1; i <= t; i++) {
        if (i < t && seq[i] === seq[i - 1]) run++;
        else { if (run >= 5) s += 3 + run - 5; run = 1; }
      }
      var a = [true, false, true, true, true, false, true];
      for (i = 0; i + 7 <= t; i++) {
        var ok = true; for (var k = 0; k < 7; k++) if (seq[i + k] !== a[k]) { ok = false; break; }
        if (!ok) continue;
        var antes = true, depois = true;
        for (k = 1; k <= 4; k++) { if (i - k >= 0 && seq[i - k]) antes = false; if (i + 6 + k < t && seq[i + 6 + k]) depois = false; }
        if (antes || depois) s += 40;
      }
      return s;
    };
    for (y = 0; y < t; y++) p += linha(function (i) { return m[y][i]; });
    for (x = 0; x < t; x++) p += linha(function (i) { return m[i][x]; });
    for (y = 0; y < t - 1; y++) for (x = 0; x < t - 1; x++) {
      var c = m[y][x];
      if (c === m[y][x + 1] && c === m[y + 1][x] && c === m[y + 1][x + 1]) p += 3;
    }
    for (y = 0; y < t; y++) for (x = 0; x < t; x++) if (m[y][x]) escuros++;
    var total = t * t, k2 = Math.ceil(Math.abs(escuros * 20 - total * 10) / total) - 1;
    return p + Math.max(0, k2) * 10;
  };

  function matriz(texto, nivel) {
    var n = NIVEIS[nivel || 'M']; if (n == null) n = 1;
    var bytes = utf8(texto), v = escolherVersao(bytes, n);
    var cw = comCorrecao(palavras(bytes, v, n), v, n);
    var g = new Grade(v); g.padroes(); g.dados(cw);
    var melhor = 0, menor = Infinity;
    for (var k = 0; k < 8; k++) {
      g.mascara(k); g.formato(n, k);
      var pen = g.penalidade();
      if (pen < menor) { menor = pen; melhor = k; }
      g.mascara(k); // desfaz (a máscara é XOR)
    }
    g.mascara(melhor); g.formato(n, melhor);
    return { tamanho: g.t, versao: v, mascara: melhor, m: g.m };
  }

  function svg(texto, opts) {
    opts = opts || {};
    var q = matriz(texto, opts.nivel), b = opts.borda == null ? 4 : opts.borda, t = q.tamanho + b * 2, d = '';
    for (var y = 0; y < q.tamanho; y++) for (var x = 0; x < q.tamanho; x++) if (q.m[y][x]) d += 'M' + (x + b) + ' ' + (y + b) + 'h1v1h-1z';
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + t + ' ' + t + '" shape-rendering="crispEdges"' +
      (opts.rotulo ? ' role="img" aria-label="' + String(opts.rotulo).replace(/[&<>"]/g, '') + '"' : ' aria-hidden="true"') + '>' +
      '<rect width="' + t + '" height="' + t + '" fill="' + (opts.fundo || '#fff') + '"/><path fill="' + (opts.cor || '#000') + '" d="' + d + '"/></svg>';
  }

  return { matriz: matriz, svg: svg };
});
