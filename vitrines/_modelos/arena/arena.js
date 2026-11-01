/*
 * arena.js — kit do pré-build 2 (Arena). As quatro telas (Main, Colecao, Produto, Sacola) usam este kit.
 *
 * O carregador (assets/js/vitrine-loader.js) entrega a cada tela, em this.props:
 *   cor    { slug, nome, modo, bg, surface, line, accent, onAccent, accent2 }  (modelos.json)
 *   itens  peças da loja, ou as de demonstração: { id, nome, cat, cor, hex, preco, tamanhos, img, img2?, novo?, descricao? }
 *   demo   true quando as peças são de demonstração
 *   item, cat, busca   vindos do endereço (?item=, ?cat=, ?q=)
 *   chave  onde a sacola e os favoritos desta loja ficam guardados no navegador
 *   links  { inicio, colecao, produto, sacola } já com a loja no endereço
 * Os dados da marca chegam como @@MARCA@@, @@WHATS@@ etc. no próprio arquivo.
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

  /** Variáveis de cor do tema, para o style da raiz da tela. */
  function vars(cor) {
    var c = cor || {}, claro = c.modo === 'claro';
    return '--bg:' + (c.bg || '#0B0D10') + ';--surface:' + (c.surface || '#15181D') + ';--line:' + (c.line || '#262A31') +
      ';--accent:' + (c.accent || '#D4FF2A') + ';--on-accent:' + (c.onAccent || '#0B0D10') + ';--accent2:' + (c.accent2 || '#8AA0B8') +
      ';--ink:' + (claro ? '#14161A' : '#F3F4F1') + ';--muted:' + (claro ? '#555B63' : '#A9ADB3');
  }

  /**
   * Organiza as peças: cada nome vira um produto (grupo) e cada cor uma variação.
   * O id do grupo é o mesmo do modelo 1 (categoria-nome), então os links ?item= servem nos dois.
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
      g.hexes = g.vars.map(function (v) { return v.hex; });
      g.coresTxt = g.vars.map(function (v) { return minus(v.cor); }).join(', ');
      g.alt = g.nome + (g.vars.length === 1 && g.vars[0].cor !== 'Única' ? ' ' + minus(g.vars[0].cor) : '');
    });
    var porCat = {};
    grupos.forEach(function (g) { (porCat[g.cat] = porCat[g.cat] || []).push(g); });
    var cats = CATS.filter(function (c) { return porCat[c[0]]; }).map(function (c) {
      var n = porCat[c[0]].reduce(function (s, g) { return s + g.vars.length; }, 0);
      return { id: c[0], nome: c[1], qtd: plural(n, 'peça', 'peças'), n: n, img: porCat[c[0]][0].img };
    });
    return {
      grupos: grupos, porId: porId, porCat: porCat, cats: cats, vazio: !grupos.length,
      roupas: grupos.filter(function (g) { return g.cat !== 'acessorios'; }),
      accs: grupos.filter(function (g) { return g.cat === 'acessorios'; })
    };
  }

  /** Card de produto pronto para a tela. */
  function card(g, extra) {
    return Object.assign({ id: g.id, nome: g.nome, cat: g.catNome, img: g.img, alt: g.alt, novo: g.novo, preco: brl(g.preco), pix: brl(g.preco * (1 - PIX)), cores: g.hexes, coresTxt: plural(g.vars.length, 'cor', 'cores') }, extra || {});
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

  function fmtWhats(txt) {
    var d = String(txt || '').replace(/\D/g, '');
    if (d.length === 13 && d.indexOf('55') === 0) d = d.slice(2);
    if (d.length === 11) return '(' + d.slice(0, 2) + ') ' + d.slice(2, 7) + '-' + d.slice(7);
    if (d.length === 10) return '(' + d.slice(0, 2) + ') ' + d.slice(2, 6) + '-' + d.slice(6);
    return String(txt || '');
  }

  /* ---------- partes comuns das telas ---------- */
  /**
   * Topo, menu do celular, busca e contatos do rodapé: o que todas as telas precisam.
   * marca: { nome, whats, ig, cidade } vindos das marcas @@...@@ da tela.
   */
  function topo(comp, ativo, marca) {
    var st = comp.state || {}, p = comp.props || {};
    marca = marca || {};
    var ig = p.demo ? '' : String(marca.ig || '').replace(/^@/, '').replace(/[^A-Za-z0-9._]/g, '');
    var zap = p.demo ? '' : linkWhats(marca.whats, 'Olá! Vim pelo site da ' + (marca.nome || 'loja') + '.');
    var sac = sacola(p.chave);
    var n = sac.contar();
    var links = p.links || {};
    return {
      vars: vars(p.cor),
      claro: p.cor && p.cor.modo === 'claro',
      sacolaN: String(n),
      temSacola: n > 0,
      sacolaRotulo: n ? 'Sacola, ' + plural(n, 'peça', 'peças') : 'Sacola vazia',
      menuAberto: !!st.menu,
      menuCls: st.menu ? 'menu on' : 'menu',
      abrirMenu: function () { comp.setState({ menu: !st.menu, buscaAberta: false }); },
      fecharMenu: function () { comp.setState({ menu: false }); },
      buscaAberta: !!st.buscaAberta,
      buscaCls: st.buscaAberta ? 'busca-cel on' : 'busca-cel',
      abrirBusca: function () { comp.setState({ buscaAberta: !st.buscaAberta, menu: false }); },
      termo: st.termo !== undefined ? st.termo : (p.busca || ''),
      digitar: function (e) { comp.setState({ termo: e.target.value }); },
      buscar: function (e) {
        var q = String((comp.state && comp.state.termo) || '').trim();
        if (ativo === 'colecao') { comp.setState({ q: q, cat: 'todos', buscaAberta: false }); return; } // a busca olha todas as categorias
        if (links.colecao) location.href = links.colecao + (q ? '&q=' + encodeURIComponent(q) : '');
      },
      on: { inicio: ativo === 'inicio' ? 'on' : '', colecao: ativo === 'colecao' ? 'on' : '' },
      zap: zap, temZap: !!zap, whatsTxt: fmtWhats(marca.whats),
      igLink: ig ? 'https://www.instagram.com/' + ig + '/' : '', temIg: !!ig, igTxt: '@' + String(marca.ig || '').replace(/^@/, ''),
      ano: String(new Date().getFullYear()),
      aviso: st.aviso || '', temAviso: !!st.aviso,
      fecharAviso: function () { comp.setState({ aviso: '' }); }
    };
  }

  /** Fotos de ambiente do modelo (livres, em vitrines/_fotos). */
  var AMBIENTE = {
    hero: ['arena-hero-1', 'arena-hero-2', 'arena-hero-3'], sobre: 'arena-sobre', banner: 'arena-banner', colecao: 'arena-colecao',
    looks: ['arena-look-1', 'arena-look-2', 'arena-look-3'], ig: ['arena-ig-1', 'arena-ig-2', 'arena-ig-3', 'arena-ig-4', 'arena-ig-5', 'arena-ig-6']
  };
  function foto(nome) { return FOTOS + nome + '.jpg'; }

  /** Card com favorito e compra rápida (peça de um tamanho só vai direto para a sacola). */
  function cardVivo(comp, g, img) {
    var p = comp.props || {}, sac = sacola(p.chave), favs = favoritos(p.chave);
    var v = g.vars[0], rapido = g.vars.length === 1 && v.tamanhos.length === 1, fav = favs.tem(g.id);
    return card(g, {
      img: img || g.img, rapido: rapido, escolher: !rapido, fav: fav, favCls: fav ? 'fav on' : 'fav',
      favRotulo: (fav ? 'Tirar dos favoritos: ' : 'Favoritar ') + g.nome,
      favoritar: function () { favs.alternar(g.id); comp.setState({ fav: Date.now() }); },
      adicionar: function () {
        sac.por({ grupo: g.id, nome: g.nome, cor: v.cor, tam: v.tamanhos[0], preco: v.preco, img: v.img, qtd: 1 });
        comp.setState({ aviso: 'Na sacola: ' + g.nome });
      }
    });
  }

  root.ArenaKit = {
    CATS: CATS, NOME_CAT: NOME_CAT, PIX: PIX, AMBIENTE: AMBIENTE,
    brl: brl, slug: slug, cardVivo: cardVivo, minus: minus, plural: plural, vars: vars, catalogo: catalogo, card: card, foto: foto,
    sacola: sacola, favoritos: favoritos, numeroWhats: numeroWhats, linkWhats: linkWhats, fmtWhats: fmtWhats, textoPedido: textoPedido, topo: topo
  };
})(window);
