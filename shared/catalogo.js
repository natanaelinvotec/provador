/*
 * catalogo.js — liga o catálogo de uma loja (fotos e produtos) ao mockup da vitrine sem mexer no layout.
 *
 * O mockup tem produtos e fotos fixos. Antes de desenhar a página, o carregador chama Catalogo.aplicar():
 *  1. troca cada foto do mockup por uma foto da loja da mesma categoria (conjunto por conjunto, macacão por macacão);
 *  2. troca as listas de produtos (PRODUCTS, CLOTHES, SLIDES, KITS...) pelas da loja, no mesmo formato;
 *  3. troca os nomes de produto escritos no mockup pelos nomes da loja;
 *  4. faz os cards levarem ao produto certo (?item=).
 * Serve para a demonstração (fotos livres), para a prévia do montador (rascunho) e para a loja publicada.
 *
 * Item do catálogo: { id, nome, cat, cor, hex, preco, tamanhos:['P','M'], img, img2?, novo?, descricao? }
 */
(function (root) {
  'use strict';

  var CATEGORIAS = [
    ['conjuntos', 'Conjuntos', 'Conjunto'], ['leggings', 'Leggings', 'Legging'], ['tops', 'Tops', 'Top'],
    ['macacoes', 'Macacões', 'Macacão'], ['macaquinhos', 'Macaquinhos', 'Macaquinho'], ['acessorios', 'Acessórios', 'Acessório']
  ];
  var NOME_CAT = {}; CATEGORIAS.forEach(function (c) { NOME_CAT[c[0]] = c[1]; });
  var TAMANHOS = ['P', 'M', 'G', 'GG'];

  // fotos do mockup por categoria (mesmos nomes nas fotos da Ais e nas ilustrações)
  var FOTOS_MOCKUP = {
    conjuntos: ['flat-recorte-chocolate', 'flat-recorte-marinho', 'flat-recorte-royal', 'flat-recorte-nude', 'cruzado-vinho-modelo', 'flat-cruzado-vinho', 'flat-cruzado-preto', 'nadador-preto-modelo', 'nadador-cafe-modelo'],
    macacoes: ['macacao-serenity-academia', 'macacao-serenity-rua', 'macacao-costas-preto-modelo'],
    macaquinhos: ['macaquinho-preto-modelo', 'macaquinho-marinho-modelo']
  };
  // nomes de produto escritos no mockup, na ordem em que aparecem por categoria
  var NOMES_MOCKUP = {
    conjuntos: [['Conjunto canelado Recorte', 'Conjunto Recorte'], ['Conjunto canelado Cruzado'], ['Conjunto Nadador']],
    macacoes: [['Macacão longo Serenity', 'Macacão Serenity'], ['Macacão Costas Abertas']],
    macaquinhos: [['Macaquinho Contorno']]
  };
  var ICONE_TAG = 'M3.5 12.2V4.5a1 1 0 0 1 1-1h7.7l8.3 8.3a1.5 1.5 0 0 1 0 2.1l-6.1 6.1a1.5 1.5 0 0 1-2.1 0zM8 7.5h.01';

  function brl(v) { return (Number(v) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }); }
  function htmlEsc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function jsEsc(s) { return String(s).replace(/[\\'"`<>\n\r\u2028\u2029$]/g, function (c) { return '\\u' + ('0000' + c.charCodeAt(0).toString(16)).slice(-4); }); }
  function slug(s) { return String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40); }
  function minus(s) { s = String(s || ''); return s.charAt(0).toLowerCase() + s.slice(1); }

  /** Organiza os itens: roupas agrupadas por nome (cada cor vira uma variação) e acessórios. */
  function modelo(itens) {
    var ok = (itens || []).filter(function (i) { return i && i.img && i.nome && NOME_CAT[i.cat]; })
      .sort(function (a, b) { return (a.ordem || 0) - (b.ordem || 0); });
    var grupos = [], porNome = {};
    ok.filter(function (i) { return i.cat !== 'acessorios'; }).forEach(function (i) {
      var k = i.cat + '|' + i.nome.trim().toLowerCase();
      var g = porNome[k];
      if (!g) { g = porNome[k] = { id: slug(i.cat + '-' + i.nome) || i.id, nome: i.nome.trim(), cat: i.cat, preco: Number(i.preco) || 0, itens: [], novo: false, descricao: i.descricao || '' }; grupos.push(g); }
      g.itens.push(i); if (i.novo) g.novo = true;
    });
    var accs = ok.filter(function (i) { return i.cat === 'acessorios'; });
    var porCat = {}; ok.forEach(function (i) { (porCat[i.cat] = porCat[i.cat] || []).push(i); });
    return { itens: ok, grupos: grupos, accs: accs, porCat: porCat, vazio: !grupos.length };
  }

  function cores(g) { return g.itens.map(function (i) { return minus(i.cor || ''); }).filter(Boolean); }
  function variacao(i) { return { name: i.cor || 'Única', hex: i.hex || '#999999', a: i.img, b: i.img2 || undefined, alt: i.nome + (i.cor ? ' ' + minus(i.cor) : '') }; }
  function estoque(i) { var t = i.tamanhos && i.tamanhos.length ? i.tamanhos : TAMANHOS; return TAMANHOS.map(function (n) { return t.indexOf(n) >= 0 ? 5 : 0; }); }

  /** Quais fotos da loja entram no lugar de cada foto do mockup. */
  function mapaFotos(m) {
    var mapa = {}, roupas = m.itens.filter(function (i) { return i.cat !== 'acessorios'; });
    var todas = roupas.length ? roupas : m.itens;
    if (!todas.length) return mapa;
    var pegar = { conjuntos: ['conjuntos', 'tops', 'leggings'], macacoes: ['macacoes', 'macaquinhos'], macaquinhos: ['macaquinhos', 'macacoes', 'leggings'] };
    Object.keys(FOTOS_MOCKUP).forEach(function (cat) {
      var fonte = []; pegar[cat].forEach(function (c) { fonte = fonte.concat(m.porCat[c] || []); });
      if (!fonte.length) fonte = todas;
      FOTOS_MOCKUP[cat].forEach(function (nome, n) { mapa[nome] = fonte[n % fonte.length].img; });
    });
    return mapa;
  }

  function kits(m) {
    var g = m.grupos, a = m.accs, k = [];
    if (!g.length) return k;
    var parteA = function (i) { return i ? { img: i.img } : null; };
    var g0 = g[0], g1 = g[1] || g[0];
    var k1 = [g0.itens[0]].concat(a.slice(0, 2)); if (k1.length < 2) k1.push(g1.itens[g1.itens.length - 1]);
    var k2 = [g1.itens[0]].concat(a.slice(2, 4).length ? a.slice(2, 4) : a.slice(0, 1)); if (k2.length < 2) k2.push(g0.itens[0]);
    var duplas = g0.itens.length > 1 ? [g0.itens[0], g0.itens[1]] : [g0.itens[0], g1.itens[0]];
    [[k1, 'Kit ' + g0.nome, g0.nome + (a[0] ? ' com ' + minus(a[0].nome) : '')], [k2, 'Kit ' + g1.nome, g1.nome + (a[2] || a[0] ? ' com ' + minus((a[2] || a[0]).nome) : '')], [duplas, 'Dupla ' + g0.nome, '2 peças, cores à escolha']].forEach(function (x, n) {
      var partes = x[0].filter(Boolean);
      var total = partes.reduce(function (s, i) { return s + (Number(i.preco) || 0); }, 0);
      k.push({ id: 'kit-' + n, name: x[1], sub: x[2], units: partes.length, full: Math.round(total * 100) / 100, img: partes[0].img, parts: partes.map(parteA), sold: 0 });
    });
    return k;
  }

  /** Listas no formato de cada página do mockup. */
  function listas(m, arquivo, params) {
    var g = m.grupos, a = m.accs, o = {};
    var slides = [0, 1, 2].map(function (n) {
      var x = g[n % g.length], v = x.itens[0];
      return { id: x.id, img: v.img, alt: variacao(v).alt, title: x.nome, text: x.nome + (cores(x).length ? ', em ' + cores(x).join(', ') : '') + '.', cta: 'Ver peça', label: x.nome, price: brl(x.preco) };
    });
    var produtos = g.map(function (x, n) { return { id: x.id, name: x.nome, cat: x.cat, price: brl(x.preco), isNew: x.novo || n < 3, colors: x.itens.map(variacao) }; });
    var accsMain = a.map(function (i) { return { id: i.id, name: i.nome, sub: NOME_CAT.acessorios + (i.cor ? ', ' + minus(i.cor) : ''), price: Number(i.preco) || 0, icon: ICONE_TAG, tone: i.hex || '#C9A98B' }; });
    var ks = kits(m);
    if (arquivo === 'Main') {
      o.PRODUCTS = produtos; o.SLIDES = slides; o.KITS = ks; o.ACCS = accsMain;
      // destaques intercalam roupas, acessórios e kits como no mockup (p, p, a, p, k, p, a, p...)
      var fila = { p: produtos.map(function (x) { return x.id; }), a: accsMain.map(function (x) { return x.id; }), k: ks.map(function (x) { return x.id; }) }, pos = { p: 0, a: 0, k: 0 };
      o.HIGHLIGHTS = 'ppapkpappaka'.split('').map(function (t) {
        if (!fila[t].length || pos[t] >= fila[t].length) t = pos.p < fila.p.length ? 'p' : (fila.a.length > pos.a ? 'a' : 'k');
        return fila[t].length > pos[t] ? [t, fila[t][pos[t]++]] : null;
      }).filter(Boolean);
      o.BASES = [0, 1, 2].map(function (n) { var x = g[n % g.length]; return { name: x.nome, price: x.preco, img: x.itens[0].img }; });
      o.COMBO_ACCS = accsMain.slice(0, 4);
      var destaque = g.filter(function (x) { return x.cat === 'conjuntos'; }).sort(function (a2, b2) { return b2.itens.length - a2.itens.length; })[0] || g[0];
      o.TONES = destaque.itens.map(function (i) { return { name: i.cor || 'Única', hex: i.hex || '#999999', img: i.img }; });
    }
    if (arquivo === 'Colecao') {
      o.CLOTHES = m.itens.map(function (i) {
        var grupo = i.cat === 'acessorios' ? '' : (g.filter(function (x) { return x.itens.indexOf(i) >= 0; })[0] || {}).id;
        return { id: i.id, grupo: grupo || '', name: i.nome, color: i.cor || '', hex: i.hex || '#999999', cat: i.cat, price: Number(i.preco) || 0, img: i.img, b: i.img2 || undefined, sizes: i.cat === 'acessorios' ? [5, 5, 5, 5] : estoque(i), sold: 0, isNew: !!i.novo, alt: variacao(i).alt };
      });
      o.ACCS = [];
      o.KITS = ks.map(function (k) { return { id: k.id, name: k.name, sub: k.sub, units: k.units, full: k.full, parts: k.parts, sold: 0 }; });
      var presentes = CATEGORIAS.filter(function (c) { return m.porCat[c[0]]; }).map(function (c) { return [c[0], c[1]]; });
      o.CATS = [['todos', 'Todo o mostruário']].concat(presentes).concat(ks.length ? [['kits', 'Kits']] : []);
    }
    if (arquivo === 'Produto') {
      var x = g.filter(function (y) { return y.id === params.item; })[0] || g[0];
      o.COLORS = x.itens.map(function (i) { return { name: i.cor || 'Única', hex: i.hex || '#999999', img: i.img }; });
      var tam = x.itens[0].tamanhos && x.itens[0].tamanhos.length ? x.itens[0].tamanhos : TAMANHOS;
      o.SIZES = TAMANHOS.map(function (n) { return { name: n, out: tam.indexOf(n) < 0 }; });
      o._produto = x;
    }
    if (arquivo === 'Sacola') {
      o.BASE = g.slice(0, 2).map(function (x) { var v = x.itens[0]; return { id: x.id, name: x.nome, meta: (v.cor || 'Única') + ', tamanho M', unit: x.preco, img: v.img, alt: variacao(v).alt }; });
      o.ACCS = a.slice(0, 3).map(function (i) { return { id: i.id, name: i.nome, meta: (i.cor || 'Única') + ', tamanho único', unit: Number(i.preco) || 0, tone: i.hex || '#C9A98B', icon: ICONE_TAG }; });
    }
    return o;
  }

  // troca textos no HTML (escapando para HTML) e no script (escapando para JS)
  function trocarTextos(src, pares) {
    if (!pares.length) return src;
    var sm = src.match(/(<script type="text\/x-dc"[^>]*>)([\s\S]*?)(<\/script>)/);
    var rep = function (parte, esc) { pares.forEach(function (p) { parte = parte.split(p[0]).join(esc(p[1])); }); return parte; };
    if (!sm) return rep(src, htmlEsc);
    var i = src.indexOf(sm[0]);
    return rep(src.slice(0, i), htmlEsc) + sm[1] + rep(sm[2], jsEsc) + sm[3] + rep(src.slice(i + sm[0].length), htmlEsc);
  }

  /**
   * Aplica o catálogo na fonte de uma página. Devolve a fonte nova e deixa as listas em window.__VITRINE__.
   * Sem roupas no catálogo, devolve a fonte como está (o mockup segue igual).
   */
  function aplicar(src, arquivo, itens, params) {
    var m = modelo(itens);
    if (m.vazio) { root.__VITRINE__ = null; return src; }
    params = params || {};
    // 1) fotos
    var mapa = mapaFotos(m);
    src = src.replace(/vitrines\/[a-z0-9_-]+\/(?:img\/)?([a-z0-9-]+)\.(?:jpg|png)/g, function (all, nome) { return mapa[nome] || all; });
    // 2) listas
    var o = listas(m, arquivo, params);
    root.__VITRINE__ = o;
    src = src.replace(/const (PRODUCTS|SLIDES|KITS|ACCS|CLOTHES|CATS|COLORS|SIZES|BASES|BASE|HIGHLIGHTS|COMBO_ACCS|TONES) = \[/g, function (all, nome) {
      return Object.prototype.hasOwnProperty.call(o, nome) ? 'const ' + nome + ' = (window.__VITRINE__ && window.__VITRINE__.' + nome + ') || [' : all;
    });
    // 3) nomes escritos no mockup
    var pares = [];
    Object.keys(NOMES_MOCKUP).forEach(function (cat) {
      var deles = m.grupos.filter(function (x) { return x.cat === cat; });
      if (!deles.length) deles = m.grupos;
      NOMES_MOCKUP[cat].forEach(function (variantes, n) { var alvo = deles[n % deles.length]; variantes.forEach(function (v) { pares.push([v, alvo.nome]); }); });
    });
    if (arquivo === 'Produto' && o._produto) {
      var x = o._produto;
      pares.unshift(['Conjunto canelado Recorte', x.nome]);
      pares.push(['R$ 189,90', brl(x.preco)], ['>Conjuntos</a>', '>' + NOME_CAT[x.cat] + '</a>'],
        ['Conjunto de top e legging em tecido canelado. O top tem alça larga e faixa inferior que firma sem apertar; a legging tem cós alto e recorte diagonal na perna, que alonga a silhueta.', x.descricao || (x.nome + (cores(x).length ? ', disponível em ' + cores(x).join(', ') : '') + '.')]);
    }
    // nomes longos primeiro, para "Conjunto canelado Recorte" não virar "Conjunto canelado <nome>"
    pares.sort(function (p, q) { return q[0].length - p[0].length; });
    // a crumb ">Conjuntos</a>" é HTML: troca direto, sem escapar as tags
    var crumb = pares.filter(function (p) { return p[0] === '>Conjuntos</a>'; })[0];
    pares = pares.filter(function (p) { return p !== crumb; });
    src = trocarTextos(src, pares);
    if (crumb) src = src.replace(crumb[0], '>' + htmlEsc(crumb[1].slice(1, -4)) + '</a>');
    // 4) cards levam ao produto certo
    if (arquivo === 'Main') {
      // idem na vitrine inicial: o card montado pelo mockup leva o id do produto
      src = src.replace('        name: p.name, price: p.price, isNew: !!p.isNew,', '        id: p.id, name: p.name, price: p.price, isNew: !!p.isNew,');
      src = src.replace('<a href="Produto.dc.html" aria-label="Ver {{p.name}}">', '<a href="Produto.dc.html?item={{p.id}}" aria-label="Ver {{p.name}}">')
        .replace('<h3><a href="Produto.dc.html">{{p.name}}</a></h3>', '<h3><a href="Produto.dc.html?item={{p.id}}">{{p.name}}</a></h3>')
        .replace('<a class="btn" href="Produto.dc.html">{{sl.cta}}</a>', '<a class="btn" href="Produto.dc.html?item={{sl.id}}">{{sl.cta}}</a>');
    }
    if (arquivo === 'Colecao') {
      // o card da coleção é um objeto novo montado pelo mockup: o grupo da peça precisa ir junto
      src = src.replace("name: p.name, color: p.color || '',", "name: p.name, grupo: p.grupo || '', color: p.color || '',")
        .replace('<a href="Produto.dc.html" aria-label="Ver {{p.name}} {{p.color}}">', '<a href="Produto.dc.html?item={{p.grupo}}" aria-label="Ver {{p.name}} {{p.color}}">');
    }
    return src;
  }

  root.Catalogo = { CATEGORIAS: CATEGORIAS, TAMANHOS: TAMANHOS, modelo: modelo, aplicar: aplicar, slug: slug };
})(typeof self !== 'undefined' ? self : this);
