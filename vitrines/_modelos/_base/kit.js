/*
 * kit.js — motor comum dos pré-builds 3 em diante (window.PrebuildKit).
 *
 * Cada modelo é um desenho sobre as mesmas quatro telas (vitrines/_modelos/_base/*.dc.html):
 * em modelos.json ele diz o "layout" (seções da página inicial e variantes), os "textos" e as "fotos"
 * de ambiente, e traz a sua folha de estilo em "estilos". O carregador entrega tudo isso em props.modelo.
 *
 * props das telas: cor, itens, demo, item, cat, busca, tam, chave, links, modelo { slug, nome, numero, layout, textos, fotos }.
 * As marcas da loja (@@NOME@@, @@WHATS@@, @@IG@@, @@CIDADE@@) chegam no próprio arquivo da tela.
 */
(function (root) {
  'use strict';

  var CATS = [
    ['conjuntos', 'Conjuntos', 'Conjunto'], ['leggings', 'Leggings', 'Legging'], ['tops', 'Tops', 'Top'],
    ['macacoes', 'Macacões', 'Macacão'], ['macaquinhos', 'Macaquinhos', 'Macaquinho'], ['acessorios', 'Acessórios', 'Acessório']
  ];
  var NOME_CAT = {}; CATS.forEach(function (c) { NOME_CAT[c[0]] = c[1]; });
  var ORDEM_TAM = ['P', 'M', 'G', 'GG', 'U'];
  var FOTOS = 'vitrines/_fotos/';
  var PIX = 0.05; // desconto mostrado para pagamento no Pix

  function brl(v) { return 'R$ ' + (Number(v) || 0).toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.'); }
  function slug(s) { return String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40); }
  function minus(s) { s = String(s || ''); return s.charAt(0).toLowerCase() + s.slice(1); }
  function plural(n, um, varios) { return n + ' ' + (n === 1 ? um : varios); }
  function norm(t) { return String(t || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase(); }

  /** Variáveis de cor do tema (do modelo, para a cor escolhida), no style da raiz da tela. */
  function vars(cor) {
    var c = cor || {}, claro = c.modo !== 'escuro';
    return '--bg:' + (c.bg || '#FFFFFF') + ';--surface:' + (c.surface || '#F4F4F2') + ';--line:' + (c.line || '#E2E2DE') +
      ';--accent:' + (c.accent || '#1C1C1C') + ';--on-accent:' + (c.onAccent || '#FFFFFF') + ';--accent2:' + (c.accent2 || '#B0465B') +
      ';--ink:' + (c.ink || (claro ? '#17181A' : '#F3F4F1')) + ';--muted:' + (c.muted || (claro ? '#5F636A' : '#A9ADB3')) +
      ';--deep:' + (c.deep || (claro ? '#141416' : '#000000')) + ';--on-deep:' + (c.onDeep || '#FFFFFF') +
      ';--soft:' + (c.soft || (claro ? '#F3EFEA' : '#1B1D22'));
  }

  /* ---------- catálogo ---------- */
  /**
   * Cada nome vira um produto (grupo) e cada cor uma variação.
   * O id do grupo é o mesmo dos outros modelos (categoria-nome), então os links ?item= servem em todos.
   */
  function catalogo(itens) {
    var ok = (itens || []).filter(function (i) { return i && i.img && i.nome && NOME_CAT[i.cat]; })
      .sort(function (a, b) { return (a.ordem || 0) - (b.ordem || 0); });
    var grupos = [], porId = {};
    ok.forEach(function (i, n) {
      var id = slug(i.cat + '-' + i.nome) || String(i.id || n);
      var g = porId[id];
      if (!g) {
        g = porId[id] = { id: id, nome: String(i.nome).trim(), cat: i.cat, catNome: NOME_CAT[i.cat], preco: Number(i.preco) || 0, novo: false, descricao: i.descricao || '', ordem: n, vars: [] };
        grupos.push(g);
      }
      if (i.novo) g.novo = true;
      if (!g.descricao && i.descricao) g.descricao = i.descricao;
      var tams = (i.tamanhos && i.tamanhos.length ? i.tamanhos : (i.cat === 'acessorios' ? ['U'] : ['P', 'M', 'G', 'GG'])).slice()
        .sort(function (a, b) { return ORDEM_TAM.indexOf(a) - ORDEM_TAM.indexOf(b); });
      g.vars.push({ id: i.id || id + '-' + g.vars.length, cor: i.cor || 'Única', hex: /^#[0-9A-Fa-f]{6}$/.test(i.hex || '') ? i.hex : '#9A9A9A', img: i.img, img2: i.img2 || '', tamanhos: tams, preco: Number(i.preco) || g.preco });
    });
    grupos.forEach(function (g) {
      g.img = g.vars[0].img;
      g.img2 = g.vars[0].img2 || (g.vars[1] && g.vars[1].img) || '';
      g.hexes = g.vars.map(function (v) { return v.hex; });
      g.coresTxt = g.vars.map(function (v) { return minus(v.cor); }).join(', ');
      g.alt = g.nome + (g.vars.length === 1 && g.vars[0].cor !== 'Única' ? ' ' + minus(g.vars[0].cor) : '');
      g.tams = ORDEM_TAM.filter(function (t) { return g.vars.some(function (v) { return v.tamanhos.indexOf(t) >= 0; }); });
    });
    var porCat = {};
    grupos.forEach(function (g) { (porCat[g.cat] = porCat[g.cat] || []).push(g); });
    var cats = CATS.filter(function (c) { return porCat[c[0]]; }).map(function (c) {
      var n = porCat[c[0]].reduce(function (s, g) { return s + g.vars.length; }, 0);
      return { id: c[0], nome: c[1], qtd: plural(n, 'peça', 'peças'), n: n, img: porCat[c[0]][0].img, img2: (porCat[c[0]][1] || porCat[c[0]][0]).img };
    });
    var cores = [], vistas = {};
    grupos.forEach(function (g) { g.vars.forEach(function (v) { if (!vistas[v.cor] && v.cor !== 'Única') { vistas[v.cor] = 1; cores.push({ nome: v.cor, hex: v.hex }); } }); });
    return {
      grupos: grupos, porId: porId, porCat: porCat, cats: cats, cores: cores, vazio: !grupos.length,
      roupas: grupos.filter(function (g) { return g.cat !== 'acessorios'; }),
      accs: grupos.filter(function (g) { return g.cat === 'acessorios'; }),
      novos: grupos.slice().sort(function (a, b) { return (b.novo - a.novo) || (a.ordem - b.ordem); })
    };
  }

  /* ---------- guardado no navegador (sacola e favoritos) ---------- */
  function ler(k) { try { return JSON.parse(localStorage.getItem('provador:' + k)) || []; } catch (e) { return []; } }
  function gravar(k, v) { try { localStorage.setItem('provador:' + k, JSON.stringify(v)); } catch (e) { /* navegador sem armazenamento */ } }
  function sacola(chave) {
    var k = 'sacola:' + (chave || 'demo');
    var api = {
      linhas: function () { return ler(k).filter(function (l) { return l && l.nome && l.qtd > 0; }); },
      contar: function () { return api.linhas().reduce(function (s, l) { return s + l.qtd; }, 0); },
      total: function () { return api.linhas().reduce(function (s, l) { return s + l.qtd * l.preco; }, 0); },
      /** linha: { grupo, nome, cor, tam, preco, img, qtd } */
      por: function (l) {
        var ls = api.linhas(), id = l.grupo + '|' + l.cor + '|' + l.tam, achou = null;
        ls.forEach(function (x) { if (x.id === id) achou = x; });
        if (achou) achou.qtd = Math.min(20, achou.qtd + (l.qtd || 1));
        else ls.push({ id: id, grupo: l.grupo, nome: l.nome, cor: l.cor, tam: l.tam, preco: Number(l.preco) || 0, img: l.img, qtd: Math.min(20, l.qtd || 1) });
        gravar(k, ls);
      },
      mudar: function (id, qtd) {
        var ls = api.linhas().map(function (x) { if (x.id === id) x.qtd = Math.max(0, Math.min(20, qtd)); return x; }).filter(function (x) { return x.qtd > 0; });
        gravar(k, ls);
      },
      tirar: function (id) { gravar(k, api.linhas().filter(function (x) { return x.id !== id; })); },
      limpar: function () { gravar(k, []); }
    };
    return api;
  }
  function favoritos(chave) {
    var k = 'favs:' + (chave || 'demo');
    return {
      tem: function (id) { return ler(k).indexOf(id) >= 0; },
      lista: function () { return ler(k); },
      alternar: function (id) { var l = ler(k), i = l.indexOf(id); if (i >= 0) l.splice(i, 1); else l.push(id); gravar(k, l); }
    };
  }

  /* ---------- WhatsApp da loja ---------- */
  function numeroWhats(txt) {
    var d = String(txt || '').replace(/\D/g, '');
    if (!d || /^0+$/.test(d) || d.length < 10) return '';
    return d.length <= 11 ? '55' + d : d;
  }
  function linkWhats(txt, msg) { var n = numeroWhats(txt); return n ? 'https://wa.me/' + n + '?text=' + encodeURIComponent(msg) : ''; }
  function fmtWhats(txt) {
    var d = String(txt || '').replace(/\D/g, '');
    if (d.length === 13 && d.indexOf('55') === 0) d = d.slice(2);
    if (d.length === 11) return '(' + d.slice(0, 2) + ') ' + d.slice(2, 7) + '-' + d.slice(7);
    if (d.length === 10) return '(' + d.slice(0, 2) + ') ' + d.slice(2, 6) + '-' + d.slice(6);
    return String(txt || '');
  }
  function textoPedido(loja, linhas, dados) {
    var t = 'Olá! Quero fazer este pedido na ' + loja + ':\n';
    linhas.forEach(function (l) { t += '\n• ' + l.qtd + 'x ' + l.nome + ' (' + l.cor + (l.tam && l.tam !== 'U' ? ', ' + l.tam : '') + ') — ' + brl(l.preco * l.qtd); });
    var tot = linhas.reduce(function (s, l) { return s + l.qtd * l.preco; }, 0);
    t += '\n\nTotal: ' + brl(tot);
    if (dados.pagamento === 'pix') t += ' (no Pix: ' + brl(tot * (1 - PIX)) + ')';
    t += '\nPagamento: ' + ({ pix: 'Pix', cartao: 'Cartão', combinar: 'Combinar pelo WhatsApp' }[dados.pagamento] || 'Combinar');
    if (dados.nome) t += '\nNome: ' + dados.nome;
    if (dados.cep) t += '\nCEP: ' + dados.cep;
    return t;
  }

  /* ---------- ícones (traço, 24x24) ---------- */
  var ICONE = {
    entrega: 'M3 7h11v9H3zM14 10h4l3 3v3h-7M7 19.3a1.8 1.8 0 1 0 0-3.6 1.8 1.8 0 0 0 0 3.6zM17 19.3a1.8 1.8 0 1 0 0-3.6 1.8 1.8 0 0 0 0 3.6z',
    troca: 'M4 12a8 8 0 0 1 14-5.3M20 12a8 8 0 0 1-14 5.3M18 3v4h-4M6 21v-4h4',
    pix: 'M12 3l9 9-9 9-9-9zM8.5 12h7',
    whats: 'M4.5 19.5l1.2-3.9A8 8 0 1 1 8.6 18.4z',
    cartao: 'M3 6h18v12H3zM3 10h18M7 15h4',
    seguro: 'M5 10.5h14v10H5zM8 10.5V7.5a4 4 0 0 1 8 0v3',
    tamanho: 'M4 7h16v10H4zM8 7v4M12 7v6M16 7v4',
    estrela: 'M12 4l2.4 5 5.6.6-4.2 3.8 1.2 5.5L12 16l-5 2.9 1.2-5.5L4 9.6 9.6 9z',
    coracao: 'M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z',
    tecido: 'M5 4h14v16H5zM5 9h14M5 14h14M10 4v16'
  };

  /* ---------- textos e fotos do modelo ---------- */
  var TEXTOS = {
    avisos: ['Entrega para todo o Brasil', 'Troca fácil em até 7 dias', 'Pix com 5% de desconto', 'Compre também pelo WhatsApp'],
    hero: [
      { kicker: 'Coleção nova', titulo: 'Feita para treinar', texto: 'Peças que acompanham o treino do aquecimento ao último set.', botao: 'Ver a coleção' },
      { kicker: 'Lançamentos', titulo: 'Chegou peça nova', texto: 'Conjuntos, leggings e tops que acabaram de chegar.', botao: 'Ver novidades' },
      { kicker: 'Para o dia a dia', titulo: 'Do treino para a rua', texto: 'Conforto para treinar e estilo para o resto do dia.', botao: 'Conhecer' }
    ],
    beneficios: [
      { icone: 'entrega', titulo: 'Entrega para todo o Brasil', texto: 'Frete combinado no pedido' },
      { icone: 'troca', titulo: 'Troca fácil', texto: 'Em até 7 dias depois de receber' },
      { icone: 'pix', titulo: '5% off no Pix', texto: 'Ou cartão, se preferir' },
      { icone: 'whats', titulo: 'Atendimento no WhatsApp', texto: 'Ajuda com o tamanho certo' }
    ],
    sobre: { kicker: 'Sobre a loja', titulo: 'Feita para treinar de verdade', texto: 'A @@NOME@@ escolhe peças que aguentam agachamento, corrida e suor, e que ficam bem depois do treino também.', itens: ['Peças que não ficam transparentes', 'Tecido que respira e seca rápido', 'Ajuda com o tamanho pelo WhatsApp'] },
    passos: [
      { titulo: 'Escolha a peça', texto: 'Veja a cor, o tamanho e a tabela de medidas.' },
      { titulo: 'Mande a sacola', texto: 'O pedido vai pronto para o WhatsApp da loja.' },
      { titulo: 'Pague e receba', texto: 'Pix, cartão ou boleto. Troca em até 7 dias.' }
    ],
    faq: [
      { p: 'Como faço o pedido?', r: 'Escolha as peças, ponha na sacola e toque em "Enviar pedido pelo WhatsApp". A loja confirma frete, prazo e pagamento por lá.' },
      { p: 'Quais as formas de pagamento?', r: 'Pix, cartão ou boleto, combinados com a loja. No Pix as peças saem com 5% de desconto.' },
      { p: 'Como funciona a troca?', r: 'Você tem 7 dias depois de receber para trocar de tamanho ou de cor. A peça precisa estar sem uso e com etiqueta.' },
      { p: 'Fiquei em dúvida no tamanho. E agora?', r: 'Veja a tabela de medidas na página da peça ou mande suas medidas para a loja pelo WhatsApp.' }
    ]
  };
  function textos(p) {
    var t = Object.assign({}, TEXTOS, (p.modelo && p.modelo.textos) || {});
    return t;
  }
  // fotos de ambiente: as do modelo (modelos.json "fotos"); sem elas, as de demonstração da Arena
  var AMBIENTE = {
    hero: ['arena-hero-1', 'arena-hero-2', 'arena-hero-3'], banner: 'arena-banner', sobre: 'arena-sobre', colecao: 'arena-colecao',
    duplo: ['arena-look-1', 'arena-look-2'], usos: ['arena-ig-1', 'arena-ig-2', 'arena-ig-3', 'arena-ig-4'],
    looks: ['arena-look-1', 'arena-look-2', 'arena-look-3'], ig: ['arena-ig-1', 'arena-ig-2', 'arena-ig-3', 'arena-ig-4', 'arena-ig-5', 'arena-ig-6']
  };
  function fotosDo(p) { return Object.assign({}, AMBIENTE, (p.modelo && p.modelo.fotos) || {}); }
  function foto(nome) { return nome ? FOTOS + nome + '.jpg' : ''; }
  function layout(p) {
    var l = Object.assign({ topo: 'classico', aviso: 'faixa', cartao: 'simples', rodape: 'claro', inicio: [] }, (p.modelo && p.modelo.layout) || {});
    l.sobreposto = l.sobreposto === true || l.sobreposto === 'true' ? 'true' : 'false'; // atributo data-* precisa de texto
    return l;
  }
  function trocaMarca(s, marca) { return String(s || '').replace(/@@NOME@@/g, marca.nome || 'a loja'); }

  /* ---------- partes comuns das telas ---------- */
  /**
   * Topo, menu, busca, avisos e rodapé: o que todas as telas precisam.
   * marca: { nome, whats, ig } vindos das marcas @@...@@ da tela.
   */
  function topo(comp, ativo, marca) {
    var st = comp.state || {}, p = comp.props || {};
    marca = marca || {};
    var lay = layout(p), tx = textos(p);
    var ig = p.demo ? '' : String(marca.ig || '').replace(/^@/, '').replace(/[^A-Za-z0-9._]/g, '');
    var zap = p.demo ? '' : linkWhats(marca.whats, 'Olá! Vim pelo site da ' + (marca.nome || 'loja') + '.');
    var sac = sacola(p.chave), n = sac.contar(), links = p.links || {};
    var cat = catalogo(p.itens);
    var avisos = (tx.avisos || []).map(function (a) { return trocaMarca(a, marca); });
    var ai = (st.avisoI || 0) % Math.max(1, avisos.length);
    return {
      vars: vars(p.cor),
      modeloCls: 'pb pb-' + ((p.modelo && p.modelo.slug) || 'base') + (p.cor && p.cor.modo === 'escuro' ? ' escuro' : ' claro'),
      lay: lay,
      sacolaN: String(n), temSacola: n > 0,
      sacolaRotulo: n ? 'Sacola, ' + plural(n, 'peça', 'peças') : 'Sacola vazia',
      menuAberto: !!st.menu, menuCls: st.menu ? 'menu on' : 'menu',
      abrirMenu: function () { comp.setState({ menu: !st.menu, buscaAberta: false }); },
      buscaAberta: !!st.buscaAberta, buscaCls: st.buscaAberta ? 'busca-cel on' : 'busca-cel',
      abrirBusca: function () { comp.setState({ buscaAberta: !st.buscaAberta, menu: false }); },
      termo: st.termo !== undefined ? st.termo : (p.busca || ''),
      digitar: function (e) { comp.setState({ termo: e.target.value }); },
      buscar: function () {
        var q = String((comp.state && comp.state.termo) || '').trim();
        if (ativo === 'colecao') { comp.setState({ q: q, cat: 'todos', buscaAberta: false }); return; } // a busca olha todas as categorias
        if (links.colecao) location.href = links.colecao + (q ? '&q=' + encodeURIComponent(q) : '');
      },
      on: { inicio: ativo === 'inicio' ? 'on' : '', colecao: ativo === 'colecao' && !p.cat ? 'on' : '' },
      nav: cat.cats.map(function (c) { return { id: c.id, nome: c.nome, cls: ativo === 'colecao' && (st.cat || p.cat) === c.id ? 'on' : '' }; }),
      avisos: avisos, aviso1: avisos[ai] || '', temAvisos: avisos.length > 0, variosAvisos: avisos.length > 1,
      avisoAntes: function () { comp.setState({ avisoI: (ai + avisos.length - 1) % avisos.length }); },
      avisoDepois: function () { comp.setState({ avisoI: (ai + 1) % avisos.length }); },
      zap: zap, temZap: !!zap, whatsTxt: fmtWhats(marca.whats),
      igLink: ig ? 'https://www.instagram.com/' + ig + '/' : '', temIg: !!ig, igTxt: '@' + String(marca.ig || '').replace(/^@/, ''),
      ano: String(new Date().getFullYear()),
      aviso: st.aviso || '', temAviso: !!st.aviso,
      fecharAviso: function () { comp.setState({ aviso: '' }); }
    };
  }

  /** Cartão de produto com favorito e compra rápida (peça de um tamanho só vai direto para a sacola). */
  function cardVivo(comp, g, img, etiqueta) {
    var p = comp.props || {}, sac = sacola(p.chave), favs = favoritos(p.chave);
    var v = g.vars[0], rapido = g.vars.length === 1 && v.tamanhos.length === 1, fav = favs.tem(g.id);
    return {
      id: g.id, nome: g.nome, cat: g.catNome, img: img || g.img, img2: g.img2, temImg2: !!g.img2, alt: g.alt,
      novo: g.novo, etiqueta: etiqueta || (g.novo ? 'Novo' : ''), temEtiqueta: !!(etiqueta || g.novo),
      preco: brl(g.preco), pix: brl(g.preco * (1 - PIX)),
      cores: g.hexes.slice(0, 6), maisCores: g.hexes.length > 6 ? '+' + (g.hexes.length - 6) : '', coresTxt: plural(g.vars.length, 'cor', 'cores'),
      tams: g.tams.map(function (t) { return t === 'U' ? 'Único' : t; }),
      rapido: rapido, escolher: !rapido, fav: fav, favCls: fav ? 'fav on' : 'fav',
      favRotulo: (fav ? 'Tirar dos favoritos: ' : 'Favoritar ') + g.nome,
      favoritar: function () { favs.alternar(g.id); comp.setState({ favT: Date.now() }); },
      adicionar: function () {
        sac.por({ grupo: g.id, nome: g.nome, cor: v.cor, tam: v.tamanhos[0], preco: v.preco, img: v.img, qtd: 1 });
        comp.setState({ aviso: 'Na sacola: ' + g.nome });
      }
    };
  }

  /** Rola um trilho (carrossel) a partir do botão de seta que foi tocado. */
  function rolar(dir) {
    return function (e) {
      var sec = e && e.currentTarget && e.currentTarget.closest('[data-trilho]');
      var t = sec && sec.querySelector('.trilho');
      if (t) t.scrollBy({ left: dir * Math.max(240, t.clientWidth * 0.8), behavior: 'smooth' });
    };
  }

  /* ---------- página inicial: seções do modelo ---------- */
  var FILTROS = {
    novos: function (cat) { return cat.novos; },
    todos: function (cat) { return cat.grupos; },
    roupas: function (cat) { return cat.roupas; },
    acessorios: function (cat) { return cat.accs; }
  };
  function lista(cat, filtro) {
    if (FILTROS[filtro]) return FILTROS[filtro](cat);
    if (String(filtro || '').indexOf('cat:') === 0) return cat.porCat[filtro.slice(4)] || [];
    if (String(filtro || '').indexOf('cats:') === 0) { var ids = filtro.slice(5).split(','); return cat.novos.filter(function (g) { return ids.indexOf(g.cat) >= 0; }); }
    return cat.novos;
  }
  function alvo(s) { return s && s.indexOf('cat:') === 0 ? s.slice(4) : 'todos'; }

  function telaInicio(comp, marca) {
    var p = comp.props || {}, st = comp.state || {};
    var base = topo(comp, 'inicio', marca), tx = textos(p), fotos = fotosDo(p), lay = base.lay;
    var cat = catalogo(p.itens), demo = p.demo || !cat.roupas.length;
    var curto = function (t, n) { t = String(t || ''); return t.length > n ? t.slice(0, n - 1).replace(/\s+\S*$/, '') + '…' : t; };
    var F = function (k, i) { var v = fotos[k]; return foto(Array.isArray(v) ? v[(i || 0) % v.length] : v); };

    var secoes = (lay.inicio || []).map(function (cfg, si) {
      var s = { idx: si, variante: cfg.variante || 'padrao', titulo: trocaMarca(cfg.titulo || '', marca), subtitulo: trocaMarca(cfg.subtitulo || '', marca), temTitulo: !!cfg.titulo, temSub: !!cfg.subtitulo };
      s.cls = 'sec sec-' + cfg.tipo + ' v-' + s.variante + (cfg.fundo ? ' fundo-' + cfg.fundo : '') + (cfg.nav ? ' nav-' + cfg.nav : '') + (cfg.classe ? ' ' + cfg.classe : '');
      s[cfg.tipo] = true;
      var chave = 's' + si;

      if (cfg.tipo === 'hero') {
        var txs = cfg.slides || tx.hero;
        var slides = demo
          ? txs.map(function (h, k) { return { kicker: h.kicker, titulo: h.titulo, texto: h.texto, botao: h.botao || 'Ver a coleção', cat: alvo(h.link), img: F('hero', k), alt: h.alt || 'Mulher treinando com roupa esportiva', id: '' }; })
          : cat.novos.filter(function (g) { return g.cat !== 'acessorios'; }).slice(0, 3).map(function (g) {
            return { kicker: g.novo ? 'Novidade na loja' : g.catNome, titulo: g.nome, texto: curto(g.descricao, 140) || ('Disponível em ' + g.coresTxt + '.'), botao: 'Ver a peça', cat: g.cat, img: g.img, alt: g.alt, id: g.id };
          });
        var n = slides.length, i = Math.min(st[chave] || 0, n - 1);
        var ir = function (k) { return function () { var o = {}; o[chave] = (k + n) % n; o[chave + 'p'] = true; comp.setState(o); }; };
        s.slide = Object.assign({ num: (i + 1 < 10 ? '0' : '') + (i + 1), temId: !!slides[i].id, semId: !slides[i].id }, slides[i]);
        s.total = (n < 10 ? '0' : '') + n; s.varios = n > 1;
        s.anterior = ir(i - 1); s.proximo = ir(i + 1);
        s.pontos = slides.map(function (x, k) { return { cls: k === i ? 'ponto on' : 'ponto', on: k === i, rotulo: 'Ir para o destaque ' + (k + 1), img: x.img, ir: ir(k) }; });
        s.lista = cat.cats.slice(0, 4).map(function (c) { return { id: c.id, nome: c.nome, qtd: c.qtd, img: c.img }; });
        s.temLista = s.lista.length > 0;
        s.chave = chave; s.n = n;
        comp.__giros = comp.__giros || {}; comp.__giros[chave] = n;
      } else if (cfg.tipo === 'beneficios') {
        s.itens = (cfg.itens || tx.beneficios).map(function (b) { return { titulo: b.titulo, texto: b.texto, icone: ICONE[b.icone] || ICONE.estrela }; });
      } else if (cfg.tipo === 'categorias') {
        s.itens = cat.cats.map(function (c, k) {
          return { id: c.id, nome: c.nome, qtd: c.qtd, img: cfg.fotos === 'ambiente' && demo ? F('usos', k) : c.img, num: (k + 1 < 10 ? '0' : '') + (k + 1), botao: cfg.botao || 'Ver tudo' };
        });
        s.itens = s.itens.slice(0, cfg.n || 12);
        s.temItens = s.itens.length > 0;
      } else if (cfg.tipo === 'vitrine') {
        var base0 = lista(cat, cfg.filtro);
        var abas = cfg.abas ? [{ id: 'todos', nome: cfg.abaTodos || 'Todos' }].concat(cat.cats.filter(function (c) { return base0.some(function (g) { return g.cat === c.id; }); }).map(function (c) { return { id: c.id, nome: c.nome }; })) : [];
        var aba = st[chave] || 'todos';
        var pecas = base0.filter(function (g) { return aba === 'todos' || g.cat === aba; }).slice(0, cfg.n || 8);
        s.produtos = pecas.map(function (g) { return cardVivo(comp, g, null, cfg.etiqueta && g.novo ? cfg.etiqueta : ''); });
        s.temProdutos = s.produtos.length > 0;
        s.abas = abas.map(function (a) { return { nome: a.nome, on: a.id === aba, cls: a.id === aba ? 'aba on' : 'aba', pick: function () { var o = {}; o[chave] = a.id; comp.setState(o); } }; });
        s.temAbas = abas.length > 2;
        s.cat = alvo(cfg.filtro); s.verTodos = cfg.verTodos || 'Ver todos';
        s.esq = rolar(-1); s.dir = rolar(1);
        s.foto = F(cfg.foto || 'banner'); s.fotoTitulo = trocaMarca(cfg.fotoTitulo || '', marca); s.fotoTexto = trocaMarca(cfg.fotoTexto || '', marca);
      } else if (cfg.tipo === 'banner') {
        s.kicker = cfg.kicker || ''; s.texto = trocaMarca(cfg.texto || '', marca); s.botao = cfg.botao || 'Ver agora';
        s.foto = F(cfg.foto || 'banner'); s.cat = alvo(cfg.link);
        s.temKicker = !!cfg.kicker; s.temTexto = !!cfg.texto;
        s.cores = cfg.cores ? cat.cores.slice(0, 6) : []; s.temCores = s.cores.length > 0;
      } else if (cfg.tipo === 'duplo') {
        s.itens = (cfg.itens || []).map(function (d, k) { return { kicker: d.kicker || '', titulo: d.titulo, botao: d.botao || 'Ver agora', cat: alvo(d.link), img: F(d.foto || 'duplo', k), temKicker: !!d.kicker }; });
      } else if (cfg.tipo === 'usos') {
        s.itens = (cfg.itens || []).map(function (u, k) { return { nome: u.nome, cat: alvo(u.link), img: F(u.foto || 'usos', u.foto ? 0 : k) }; });
      } else if (cfg.tipo === 'sobre') {
        var so = Object.assign({}, tx.sobre, cfg.textos || {});
        s.kicker = so.kicker; s.tituloSobre = trocaMarca(so.titulo, marca); s.texto = trocaMarca(so.texto, marca);
        s.itens = (so.itens || []).map(function (x) { return trocaMarca(x, marca); }); s.temItens = s.itens.length > 0;
        s.foto = F(cfg.foto || 'sobre'); s.botao = cfg.botao || 'Conhecer as peças';
      } else if (cfg.tipo === 'looks') {
        var roupas = cat.roupas.filter(function (g) { return g.cat === 'conjuntos' || g.cat === 'macacoes' || g.cat === 'macaquinhos'; });
        if (roupas.length < 3) roupas = roupas.concat(cat.roupas.filter(function (g) { return roupas.indexOf(g) < 0; }));
        s.itens = roupas.slice(0, cfg.n || 3).map(function (g, k) {
          var extra = cat.accs[k];
          return { id: g.id, img: demo ? F('looks', k) : g.img, alt: demo ? 'Mulher treinando com roupa esportiva' : g.alt, nome: g.nome, preco: brl(g.preco), mini: g.img, extra: extra ? extra.nome : '', temExtra: !!extra };
        });
        s.temItens = s.itens.length > 0;
        s.esq = rolar(-1); s.dir = rolar(1);
      } else if (cfg.tipo === 'tamanhos') {
        s.itens = ['P', 'M', 'G', 'GG'].map(function (t) { return { t: t, n: cat.grupos.filter(function (g) { return g.tams.indexOf(t) >= 0; }).length }; }).filter(function (x) { return x.n; });
        s.itens.forEach(function (x) { x.qtd = plural(x.n, 'peça', 'peças'); });
        s.temItens = s.itens.length > 0;
      } else if (cfg.tipo === 'passos') {
        s.itens = (cfg.itens || tx.passos).map(function (x, k) { return { n: '0' + (k + 1), titulo: x.titulo, texto: x.texto }; });
      } else if (cfg.tipo === 'instagram') {
        var imgs = demo ? (fotos.ig || []).map(function (x) { return foto(x); }) : cat.grupos.slice(0, 6).map(function (g) { return g.img; });
        s.itens = imgs.slice(0, cfg.n || 6).map(function (src) { return { img: src, link: base.igLink || '#topo', rotulo: base.temIg ? 'Ver o Instagram da loja' : 'Voltar ao topo' }; });
        s.temItens = s.itens.length >= 3 && (demo || base.temIg);
      } else if (cfg.tipo === 'contato') {
        s.foto = F(cfg.foto || 'banner'); s.texto = trocaMarca(cfg.texto || 'Tire dúvidas de tamanho, peça fotos e combine a entrega com a loja.', marca);
        s.semContato = !base.temZap && !base.temIg;
      } else if (cfg.tipo === 'faq') {
        var abertas = st[chave] || {};
        s.itens = (cfg.itens || tx.faq).map(function (f, k) {
          var on = !!abertas[k];
          return { p: f.p, r: trocaMarca(f.r, marca), on: on, cls: on ? 'faq-i on' : 'faq-i', pick: function () { var a = Object.assign({}, abertas); a[k] = !on; var o = {}; o[chave] = a; comp.setState(o); } };
        });
      }
      return s;
    }).filter(function (s) {
      if (s.categorias || s.vitrine || s.looks || s.tamanhos) return !cat.vazio;
      if (s.instagram) return s.temItens;
      return true;
    });

    return Object.assign(base, { secoes: secoes, vazio: cat.vazio });
  }

  /** Giro automático dos destaques (uma vez por tela). */
  function girar(comp) {
    if (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    comp.__giro = setInterval(function () {
      var st = comp.state || {}, g = comp.__giros || {}, o = {}, mudou = false;
      if (document.hidden) return;
      Object.keys(g).forEach(function (k) { if (g[k] > 1 && !st[k + 'p']) { o[k] = ((st[k] || 0) + 1) % g[k]; mudou = true; } });
      if (mudou) comp.setState(o);
    }, 6500);
  }

  /* ---------- coleção ---------- */
  function telaColecao(comp, marca) {
    var p = comp.props || {}, st = comp.state || {}, self = comp;
    var base = topo(comp, 'colecao', marca), lay = base.lay, fotos = fotosDo(p), tx = textos(p);
    var cat = catalogo(p.itens);
    var catAtual = st.cat !== undefined ? st.cat : (NOME_CAT[p.cat] ? p.cat : 'todos');
    var q = st.q !== undefined ? st.q : (p.busca || '');
    var faixa = st.faixa || 'todas', ordem = st.ordem || 'novos', cols = st.cols || (lay.colunas || 4), corSel = st.corSel || '', tamSel = st.tamSel !== undefined ? st.tamSel : (p.tam || '');
    var FAIXAS = [['todas', 'Todos os preços', 0, 1e9], ['ate100', 'Até R$ 100', 0, 100], ['100a200', 'De R$ 100 a R$ 200', 100, 200], ['mais200', 'Acima de R$ 200', 200, 1e9]];
    var fx = FAIXAS.filter(function (f) { return f[0] === faixa; })[0] || FAIXAS[0];
    var listaP = [];
    cat.grupos.forEach(function (g) {
      if (catAtual !== 'todos' && g.cat !== catAtual) return;
      if (q && norm(g.nome + ' ' + g.catNome + ' ' + g.coresTxt).indexOf(norm(q)) < 0) return;
      if (!(g.preco >= fx[2] && g.preco < fx[3])) return;
      var v = g.vars.filter(function (x) { return (!corSel || x.cor === corSel) && (!tamSel || x.tamanhos.indexOf(tamSel) >= 0); })[0];
      if (v) listaP.push({ g: g, v: v });
    });
    if (ordem === 'menor') listaP.sort(function (a, b) { return a.g.preco - b.g.preco; });
    else if (ordem === 'maior') listaP.sort(function (a, b) { return b.g.preco - a.g.preco; });
    else listaP.sort(function (a, b) { return (b.g.novo - a.g.novo) || (a.g.ordem - b.g.ordem); });
    var produtos = listaP.map(function (x) { return cardVivo(self, x.g, x.v.img); });
    var cont = function (c) { return c === 'todos' ? cat.grupos.length : (cat.porCat[c] || []).length; };
    var TAMS = [['P', 'P'], ['M', 'M'], ['G', 'G'], ['GG', 'GG'], ['U', 'Único']];
    var temFiltro = faixa !== 'todas' || !!corSel || !!tamSel || !!q || catAtual !== 'todos';
    var nomeCat = NOME_CAT[catAtual];
    var plu = function (n) { return plural(n, 'produto', 'produtos'); };
    return Object.assign(base, {
      fotoFaixa: foto(fotos.colecao),
      titulo: q ? 'Busca' : (nomeCat || (tx.colecaoTitulo || 'Coleção')),
      subtitulo: q ? (plu(produtos.length) + ' para “' + q + '”.') : (plu(cont(catAtual)) + (tx.colecaoTexto ? ' ' + tx.colecaoTexto : ' para treinar e para o dia a dia.')),
      chips: [{ id: 'todos', nome: 'Todas as peças' }].concat(cat.cats).map(function (c) {
        return { nome: c.nome, qtd: String(cont(c.id)), on: c.id === catAtual, cls: c.id === catAtual ? 'chip on' : 'chip', pick: function () { self.setState({ cat: c.id }); } };
      }),
      faixas: FAIXAS.map(function (f) { return { nome: f[1], on: f[0] === faixa, cls: f[0] === faixa ? 'opc on' : 'opc', pick: function () { self.setState({ faixa: f[0] }); } }; }),
      cores: cat.cores.slice(0, 14).map(function (k) { var on = k.nome === corSel; return { nome: k.nome, hex: k.hex, on: on, cls: on ? 'amostra on' : 'amostra', pick: function () { self.setState({ corSel: on ? '' : k.nome }); } }; }),
      tams: TAMS.filter(function (t) { return cat.grupos.some(function (g) { return g.tams.indexOf(t[0]) >= 0; }); })
        .map(function (t) { var on = t[0] === tamSel; return { nome: t[1], on: on, cls: on ? 'tam on' : 'tam', pick: function () { self.setState({ tamSel: on ? '' : t[0] }); } }; }),
      temFiltro: temFiltro,
      limpar: function () { self.setState({ cat: 'todos', faixa: 'todas', corSel: '', tamSel: '', q: '', termo: '' }); },
      filtrosAbertos: !!st.filtros, filtrosCls: st.filtros ? 'lado on' : 'lado',
      abrirFiltros: function () { self.setState({ filtros: !st.filtros }); },
      total: plu(produtos.length),
      ordens: [['novos', 'Mais recentes'], ['menor', 'Menor preço'], ['maior', 'Maior preço']].map(function (o) { return { id: o[0], nome: o[1], on: o[0] === ordem }; }),
      ordenar: function (e) { self.setState({ ordem: e.target.value }); },
      gradeCls: 'grade g' + cols,
      c3: cols === 3 ? 'vis on' : 'vis', c4: cols === 4 ? 'vis on' : 'vis', eh3: cols === 3, eh4: cols === 4,
      por3: function () { self.setState({ cols: 3 }); }, por4: function () { self.setState({ cols: 4 }); },
      produtos: produtos, temProdutos: produtos.length > 0, vazioP: produtos.length === 0,
      vazioTxt: cat.vazio ? 'A loja está arrumando a vitrine. Volte daqui a pouco para ver as peças.' : 'Nenhuma peça com esses filtros. Tire um filtro ou escolha outra categoria.'
    });
  }

  /* ---------- produto ---------- */
  function telaProduto(comp, marca) {
    var p = comp.props || {}, st = comp.state || {}, self = comp;
    var base = topo(comp, 'produto', marca);
    var cat = catalogo(p.itens);
    var g = cat.porId[p.item] || cat.roupas[0] || cat.grupos[0];
    if (!g) return Object.assign(base, { semProduto: true, temProduto: false });
    var sac = sacola(p.chave), favs = favoritos(p.chave);
    var v = g.vars.filter(function (x) { return x.cor === st.cor; })[0] || g.vars[0];
    var vistas = [{ nome: 'Frente', src: v.img, orig: '50% 50%', z: 1 }];
    if (v.img2) vistas.push({ nome: 'Outra vista', src: v.img2, orig: '50% 50%', z: 1 });
    vistas.push({ nome: 'Detalhe de cima', src: v.img, orig: '50% 30%', z: 1.9 });
    if (!v.img2) vistas.push({ nome: 'Detalhe de baixo', src: v.img, orig: '50% 74%', z: 1.8 });
    var n = vistas.length, fotoI = Math.min(st.foto || 0, n - 1);
    var acessorio = g.cat === 'acessorios' || (v.tamanhos.length === 1 && v.tamanhos[0] === 'U');
    var TODOS = acessorio ? ['U'] : ['P', 'M', 'G', 'GG'];
    var tem = function (t) { return v.tamanhos.indexOf(t) >= 0; };
    var tam = st.tam && tem(st.tam) ? st.tam : (tem('M') ? 'M' : v.tamanhos[0]);
    var qtd = st.qtd || 1;
    var nomeTam = function (t) { return t === 'U' ? 'Único' : t; };
    var extrasOn = st.extras || {};
    var extras = cat.accs.filter(function (a) { return a.id !== g.id; }).slice(0, 4);
    var rel = (cat.porCat[g.cat] || []).filter(function (x) { return x.id !== g.id; });
    rel = rel.concat(cat.grupos.filter(function (x) { return x.id !== g.id && rel.indexOf(x) < 0 && x.cat !== 'acessorios'; })).slice(0, 4);
    var zap = linkWhats(p.demo ? '' : marca.whats, 'Olá! Tenho uma dúvida sobre ' + g.nome + ' (' + v.cor + ').');
    var aba = st.aba || 'desc';
    var ABAS = acessorio ? [['desc', 'Descrição'], ['trocas', 'Trocas']] : [['desc', 'Descrição'], ['medidas', 'Medidas'], ['trocas', 'Trocas']];
    var pontos = acessorio
      ? ['Combina com os conjuntos da loja', 'Disponível em ' + g.coresTxt, 'Pode ir na mesma sacola das roupas']
      : ['Tamanhos ' + v.tamanhos.map(nomeTam).join(', '), 'Disponível em ' + g.coresTxt, 'Troca de tamanho em até 7 dias', 'Ajuda com o tamanho pelo WhatsApp'];
    return Object.assign(base, {
      semProduto: false, temProduto: true, g: g,
      refTxt: g.vars.length > 1 ? g.vars.length + ' cores · ' + g.catNome : g.catNome + (v.cor !== 'Única' ? ' · ' + v.cor : ''),
      fotos: vistas.map(function (f, i) { return Object.assign({}, f, { on: i === fotoI, cls: i === fotoI ? 'mini-btn on' : 'mini-btn', pick: function () { self.setState({ foto: i }); } }); }),
      atual: vistas[fotoI], fotoNum: (fotoI + 1) + ' de ' + n,
      fotoAlt: g.nome + ' ' + minus(v.cor) + ', ' + vistas[fotoI].nome.toLowerCase(),
      antes: function () { self.setState({ foto: (fotoI + n - 1) % n }); },
      depois: function () { self.setState({ foto: (fotoI + 1) % n }); },
      preco: brl(v.preco), pix: brl(v.preco * (1 - PIX)),
      corNome: v.cor,
      cores: g.vars.map(function (x) { var on = x === v; return { nome: x.cor, hex: x.hex, on: on, cls: on ? 'cor-btn on' : 'cor-btn', pick: function () { self.setState({ cor: x.cor, foto: 0, adicionado: false }); } }; }),
      tamNome: nomeTam(tam), temMedidas: !acessorio,
      tams: TODOS.map(function (t) {
        var fora = !tem(t);
        return { nome: nomeTam(t), on: t === tam, fora: fora, dica: fora ? 'Esgotado' : 'Disponível', cls: 'tam' + (t === tam ? ' on' : '') + (fora ? ' fora' : ''), pick: function () { if (!fora) self.setState({ tam: t, adicionado: false }); } };
      }),
      estoque: acessorio ? 'Disponível' : 'Disponível no tamanho ' + nomeTam(tam),
      qtd: String(qtd),
      menos: function () { self.setState({ qtd: Math.max(1, qtd - 1) }); },
      maisUm: function () { self.setState({ qtd: Math.min(9, qtd + 1) }); },
      adicionar: function () { sac.por({ grupo: g.id, nome: g.nome, cor: v.cor, tam: tam, preco: v.preco, img: v.img, qtd: qtd }); self.setState({ adicionado: true }); },
      adicionado: !!st.adicionado,
      msgSacola: 'Na sacola: ' + g.nome + ', ' + minus(v.cor) + (acessorio ? '' : ', tamanho ' + tam) + (qtd > 1 ? ', ' + qtd + ' unidades' : ''),
      fav: favs.tem(g.id), favCls: favs.tem(g.id) ? 'fav-g on' : 'fav-g',
      favoritar: function () { favs.alternar(g.id); self.setState({ favT: Date.now() }); },
      temZapPeca: !!zap, zapPeca: zap,
      verMedidas: function () { self.setState({ aba: 'medidas' }); },
      abas: ABAS.map(function (a) { return { nome: a[1], on: a[0] === aba, cls: a[0] === aba ? 'aba on' : 'aba', pick: function () { self.setState({ aba: a[0] }); } }; }),
      abaDesc: aba === 'desc', abaMedidas: aba === 'medidas' && !acessorio, abaTrocas: aba === 'trocas',
      descricao: g.descricao || (g.nome + ' da ' + marca.nome + ', em ' + g.coresTxt + '. Escolha a cor e o tamanho e mande o pedido pela sacola.'),
      pontos: pontos,
      medidas: [['P', '82–88', '62–68', '90–96'], ['M', '88–94', '68–74', '96–102'], ['G', '94–100', '74–80', '102–108'], ['GG', '100–106', '80–86', '108–114']]
        .map(function (m) { return { t: m[0], b: m[1], c: m[2], q: m[3], cls: m[0] === tam ? 'on' : '' }; }),
      temExtras: extras.length > 0,
      extras: extras.map(function (a) {
        var on = !!extrasOn[a.id], av = a.vars[0];
        return { nome: a.nome, preco: brl(a.preco), img: a.img, on: on, cls: on ? 'mais-btn on' : 'mais-btn',
          rotulo: (on ? 'Já está na sacola: ' : 'Adicionar à sacola: ') + a.nome,
          icone: on ? 'M5 12.5l4.5 4.5L19 7.5' : 'M12 5v14M5 12h14',
          pick: function () {
            if (on) return;
            sac.por({ grupo: a.id, nome: a.nome, cor: av.cor, tam: av.tamanhos[0], preco: av.preco, img: av.img, qtd: 1 });
            var x = Object.assign({}, extrasOn); x[a.id] = true; self.setState({ extras: x, aviso: 'Na sacola: ' + a.nome });
          } };
      }),
      temRel: rel.length > 0,
      relacionados: rel.map(function (x) { return cardVivo(self, x); })
    });
  }

  /* ---------- sacola ---------- */
  function telaSacola(comp, marca) {
    var p = comp.props || {}, st = comp.state || {}, self = comp;
    var base = topo(comp, 'sacola', marca);
    var cat = catalogo(p.itens), sac = sacola(p.chave);
    var linhas = sac.linhas(), n = sac.contar(), total = sac.total();
    var pag = st.pag || 'pix';
    var numero = p.demo ? '' : numeroWhats(marca.whats);
    var naSacola = {}; linhas.forEach(function (l) { naSacola[l.grupo] = 1; });
    var sug = (linhas.length ? cat.accs : cat.grupos).filter(function (g) { return !naSacola[g.id]; }).slice(0, 4);
    var mexeu = function () { self.setState({ t: Date.now(), enviado: false }); };
    return Object.assign(base, {
      vazia: linhas.length === 0, cheia: linhas.length > 0,
      vaziaTxt: cat.vazio ? 'A loja está arrumando a vitrine. Volte daqui a pouco.' : 'Escolha suas peças na coleção. Elas ficam guardadas aqui, neste aparelho.',
      qtdTxt: plural(n, 'peça', 'peças'),
      linhas: linhas.map(function (l) {
        return {
          grupo: l.grupo, nome: l.nome, img: l.img, alt: l.nome + ' ' + minus(l.cor), qtd: String(l.qtd),
          detalhe: l.cor + (l.tam && l.tam !== 'U' ? ' · Tamanho ' + l.tam : ''),
          unit: brl(l.preco), total: brl(l.preco * l.qtd),
          menos: function () { sac.mudar(l.id, l.qtd - 1); mexeu(); },
          mais: function () { sac.mudar(l.id, l.qtd + 1); mexeu(); },
          tirar: function () { sac.tirar(l.id); mexeu(); }
        };
      }),
      subtotal: brl(total), totalPix: brl(total * (1 - PIX)),
      nome: st.nome || '', cep: st.cep || '',
      mudaNome: function (e) { self.setState({ nome: e.target.value }); },
      mudaCep: function (e) { var d = e.target.value.replace(/\D/g, '').slice(0, 8); self.setState({ cep: d.length > 5 ? d.slice(0, 5) + '-' + d.slice(5) : d }); },
      pags: [['pix', 'Pix'], ['cartao', 'Cartão'], ['combinar', 'Combinar']].map(function (x) { return { nome: x[1], on: x[0] === pag, cls: x[0] === pag ? 'pag on' : 'pag', pick: function () { self.setState({ pag: x[0] }); } }; }),
      semZap: !numero,
      notaEnvio: numero ? 'O pedido vai pronto para o WhatsApp da loja. A loja confirma o frete, o prazo e o pagamento por lá.' : 'Na loja publicada, este botão manda o pedido pronto para o WhatsApp da loja.',
      enviar: function () {
        if (!numero) return;
        var txt = textoPedido(marca.nome, sac.linhas(), { nome: (st.nome || '').trim(), cep: st.cep || '', pagamento: pag });
        window.open('https://wa.me/' + numero + '?text=' + encodeURIComponent(txt), '_blank', 'noopener');
        self.setState({ enviado: true });
      },
      enviado: !!st.enviado,
      esvaziar: function () { sac.limpar(); self.setState({ enviado: false, t: Date.now() }); },
      temSugestoes: sug.length > 0,
      sugTitulo: linhas.length ? 'Aproveite e leve' : 'Para começar',
      sugestoes: sug.map(function (g) { return cardVivo(self, g); })
    });
  }

  root.PrebuildKit = {
    CATS: CATS, NOME_CAT: NOME_CAT, PIX: PIX, ICONE: ICONE, TEXTOS: TEXTOS,
    brl: brl, slug: slug, minus: minus, plural: plural, vars: vars, catalogo: catalogo, foto: foto,
    sacola: sacola, favoritos: favoritos, numeroWhats: numeroWhats, linkWhats: linkWhats, fmtWhats: fmtWhats, textoPedido: textoPedido,
    topo: topo, cardVivo: cardVivo, rolar: rolar,
    telaInicio: telaInicio, girar: girar, telaColecao: telaColecao, telaProduto: telaProduto, telaSacola: telaSacola
  };
})(window);
