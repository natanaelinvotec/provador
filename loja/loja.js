/*
 * loja.js — painel da loja (a dona e a equipe; instala como app).
 * Abas: Hoje · Vender (balcão com leitor) · Pedidos · Estoque (com etiquetas) · Caixa · Relatórios · Clientes.
 * Os dados passam pelo window.Gestao (shared/gestao.js); as peças e a loja vêm do window.Plataforma.
 */
(function () {
  'use strict';
  var P = window.Plataforma, G = window.Gestao, U = G.util, N = G.NOMES;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var brl = function (v) { return (Number(v) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }); };
  var brl0 = function (v) { return (Number(v) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }); };
  var num = function (v) { return (Number(v) || 0).toLocaleString('pt-BR'); };
  var diaBR = function (s) { return s ? s.slice(8, 10) + '/' + s.slice(5, 7) + '/' + s.slice(0, 4) : '—'; };
  var diaCurto = function (s) { return s ? s.slice(8, 10) + '/' + s.slice(5, 7) : '—'; };
  var hora = function (iso) { var d = new Date(iso); return isNaN(d) ? '' : d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }); };
  var quando = function (iso) { var d = new Date(iso); return isNaN(d) ? '—' : d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) + ' às ' + hora(iso); };
  var MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
  var nomeMes = function (m) { return MESES[+m.slice(5, 7) - 1] + ' de ' + m.slice(0, 4); };
  var mesCurto = function (m) { return MESES[+m.slice(5, 7) - 1].slice(0, 3) + '/' + m.slice(2, 4); };
  var plural = function (n, um, varios) { return num(n) + ' ' + (n === 1 ? um : varios); };
  var primeiroNome = function (n) { return String(n || '').trim().split(/\s+/)[0] || ''; };
  function fone(w) {
    var d = String(w || '').replace(/\D/g, '');
    if (d.length >= 12 && d.indexOf('55') === 0) d = d.slice(2);
    if (d.length === 11) return '(' + d.slice(0, 2) + ') ' + d.slice(2, 7) + '-' + d.slice(7);
    if (d.length === 10) return '(' + d.slice(0, 2) + ') ' + d.slice(2, 6) + '-' + d.slice(6);
    return d;
  }
  function semAcento(s) { return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase(); }
  function imgSrc(i) {
    if (!i || !i.img) return '';
    return /^(data:|https?:|blob:)/.test(i.img) ? i.img : '../' + String(i.img).replace(/^\.?\//, '');
  }
  function pref(k, v) {
    try {
      var o = JSON.parse(localStorage.getItem('provador:loja:prefs')) || {};
      if (arguments.length > 1) { o[k] = v; localStorage.setItem('provador:loja:prefs', JSON.stringify(o)); }
      return o[k];
    } catch (e) { return undefined; }
  }

  /* ---------- ícones (traço, 24x24) ---------- */
  var IC = {
    hoje: 'M12 3v2M12 19v2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M3 12h2M19 12h2M5.6 18.4L7 17M17 7l1.4-1.4M12 8a4 4 0 1 0 0 8a4 4 0 1 0 0-8z',
    vender: 'M5 8h14l-1 12H6zM9 8V6a3 3 0 0 1 6 0v2',
    pedidos: 'M3 7l9-4 9 4v10l-9 4-9-4zM3 7l9 4 9-4M12 11v10',
    estoque: 'M12 4a2 2 0 1 1 2 2c-1 0-2 .7-2 1.6V9l8.4 6.2c.8.6.4 1.8-.6 1.8H4.2c-1 0-1.4-1.2-.6-1.8L12 9',
    caixa: 'M3 7h18v12H3zM3 11h18M7 15h3M16 4H6',
    relatorios: 'M4 20V10M10 20V4M16 20v-7M22 20H2',
    clientes: 'M9 11a4 4 0 1 0 0-8a4 4 0 0 0 0 8zM2 21c0-4 3-6 7-6s7 2 7 6M16 3.5a4 4 0 0 1 0 7.5M18 15c2.5.6 4 2.6 4 6',
    camera: 'M4 8h3l2-3h6l2 3h3v11H4zM12 10a3.5 3.5 0 1 0 0 7a3.5 3.5 0 0 0 0-7z',
    whats: 'M4 20l1.4-4A8 8 0 1 1 8.2 19zM9 9.5c0 3 2.5 5.5 5.5 5.5l1.2-1.4-2-1-.9.8a4 4 0 0 1-2.2-2.2l.8-.9-1-2L9 9.5',
    copiar: 'M8 8h12v12H8zM4 16V4h12', impressora: 'M7 9V3h10v6M7 17H4v-7h16v7h-3M7 14h10v7H7z', mais: 'M12 5v14M5 12h14', menos: 'M5 12h14',
    lixo: 'M5 7h14M10 7V4h4v3M7 7l1 13h8l1-13', x: 'M6 6l12 12M18 6L6 18', check: 'M5 12.5l4.5 4.5L19 7.5', alerta: 'M12 3l10 18H2zM12 10v5M12 18v.5',
    estrela: 'M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z', link: 'M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7L12 6.3M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1',
    abrir: 'M14 4h6v6M20 4l-9 9M18 14v6H4V6h6', lapis: 'M4 20h4L19 9l-4-4L4 16zM14 6l4 4', sair: 'M15 4h4v16h-4M10 8l-4 4 4 4M6 12h10',
    entrada: 'M12 4v11M7 10l5 5 5-5M5 20h14', calendario: 'M4 6h16v14H4zM4 10h16M8 3v4M16 3v4', etiqueta: 'M3 12V4h8l10 10-8 8zM7.5 7.5h.01',
    caminhao: 'M3 6h11v10H3zM14 9h4l3 3v4h-7M7 19a2 2 0 1 0 0-4a2 2 0 0 0 0 4zM17 19a2 2 0 1 0 0-4a2 2 0 0 0 0 4z', voltar: 'M15 6l-6 6 6 6', avancar: 'M9 6l6 6-6 6',
    busca: 'M11 4a7 7 0 1 0 0 14a7 7 0 0 0 0-14zM20 20l-4-4', canais: 'M18 3a3 3 0 1 0 0 6a3 3 0 0 0 0-6zM6 9a3 3 0 1 0 0 6a3 3 0 0 0 0-6zM18 15a3 3 0 1 0 0 6a3 3 0 0 0 0-6zM8.6 13.5l6.8 3.9M15.4 6.6l-6.8 3.9',
    baixar: 'M12 4v11M7 10l5 5 5-5M5 20h14', presente: 'M4 10h16v10H4zM3 7h18v3H3zM12 7v13M12 7c-2-4-6-3-5 0M12 7c2-4 6-3 5 0'
  };
  var icone = function (k, cls) { return '<svg class="lj-ic' + (cls ? ' ' + cls : '') + '" viewBox="0 0 24 24" aria-hidden="true"><path d="' + IC[k] + '"/></svg>'; };
  var ABAS = [['hoje', 'Hoje'], ['vender', 'Vender'], ['pedidos', 'Pedidos'], ['estoque', 'Estoque'], ['caixa', 'Caixa'], ['relatorios', 'Relatórios'], ['clientes', 'Clientes']];
  // telas fora do menu de baixo (no celular entram pelo Menu do topo)
  var ROTAS = ABAS.concat([['canais', 'Canais de venda']]);
  var CORES_FORMA = { pix: 'var(--s1)', cartao: 'var(--s2)', dinheiro: 'var(--s3)', outro: 'var(--s4)' };
  var NOME_FORMA = { pix: 'Pix', cartao: 'Cartão (maquininha)', dinheiro: 'Dinheiro', outro: 'Outro' };
  var CATEGORIAS_CAIXA = [['venda', 'Venda'], ['fornecedor', 'Fornecedor'], ['aluguel', 'Aluguel'], ['embalagem', 'Embalagem'], ['frete', 'Frete'], ['marketing', 'Divulgação'], ['retirada', 'Retirada da dona'], ['conta', 'Conta'], ['outro', 'Outro']];
  var nomeCategoria = function (c) { var x = CATEGORIAS_CAIXA.filter(function (k) { return k[0] === c; })[0]; return x ? x[1] : c === 'estorno' ? 'Estorno' : (c || 'Outro'); };

  /* ---------- estado ---------- */
  function vendaNova() { return { forma: 'pix', canal: 'balcao', desconto: '', recebido: '', cliente: { nome: '', whats: '' }, endereco: '', obs: '' }; }
  var S = {
    conta: null, loja: null, itens: [], d: { vendas: [], caixa: [], contas: [], movimentos: [], vip: [], avisos: [], erros: {} },
    aba: 'hoje', carrinho: [], venda: vendaNova(), pedFiltro: 'pago', pedBusca: '', pedLimite: 40, destacar: '',
    estVista: 'pecas', estFiltro: 'todas', estBusca: '', grade: {}, etq: { formato: pref('etqFormato') || 'a4', sel: {} },
    caixaMes: U.dia().slice(0, 7), relDias: 30, cliBusca: '', cupom: pref('cupom') || 'VOLTEI10', stream: null, camT: 0,
    canais: { cfg: null, status: null, carregado: false, carregando: false, erro: '' }
  };
  var peca = function (id) { return S.itens.filter(function (i) { return i.id === id; })[0]; };
  var venda = function (id) { return S.d.vendas.filter(function (v) { return v.id === id; })[0]; };
  var validas = function () { return S.d.vendas.filter(function (v) { return v.status !== 'cancelado'; }); };

  /** Junta ao estado o que uma gravação devolveu (sem reler o banco). */
  function aplicar(m) {
    if (!m) return;
    var upsert = function (arr, doc, noComeco) { var i = arr.findIndex(function (x) { return x.id === doc.id; }); if (i >= 0) arr[i] = Object.assign({}, arr[i], doc); else if (noComeco) arr.unshift(doc); else arr.push(doc); };
    if (m.venda) upsert(S.d.vendas, m.venda, true);
    (m.caixa || []).forEach(function (c) { upsert(S.d.caixa, c, true); });
    (m.movimentos || []).slice().reverse().forEach(function (x) { upsert(S.d.movimentos, x, true); });
    (m.contas || []).forEach(function (c) { upsert(S.d.contas, c, true); });
    (m.avisos || []).forEach(function (c) { upsert(S.d.avisos, c, true); });
    (m.itens || []).forEach(function (x) {
      var it = peca(x.id);
      if (!it) return;
      if ('estoque' in x) { if (x.estoque) it.estoque = x.estoque; else delete it.estoque; }
      if ('vipAte' in x) { if (x.vipAte) it.vipAte = x.vipAte; else delete it.vipAte; }
    });
  }

  /* ---------- avisos, diálogo, cópia ---------- */
  function aviso(msg) {
    var t = $('#lj-toast');
    t.textContent = msg; t.classList.add('on');
    clearTimeout(aviso.t); aviso.t = setTimeout(function () { t.classList.remove('on'); }, 3400);
  }
  function falhou(e) { aviso(G.erroAmigavel(e)); }
  var dlg = function () { return $('#lj-dialogo'); };
  function abrir(titulo, corpo, rodape, classe) {
    var d = dlg();
    d.className = 'lj-dialogo' + (classe ? ' ' + classe : '');
    d.innerHTML = '<div class="lj-dlg"><div class="lj-dlg-topo"><h2 id="lj-dlg-titulo">' + esc(titulo) + '</h2>' +
      '<button type="button" class="lj-btn-ic" data-acao="fechar" aria-label="Fechar">' + icone('x') + '</button></div>' +
      '<div class="lj-dlg-corpo">' + corpo + '</div>' + (rodape ? '<div class="lj-dlg-rodape">' + rodape + '</div>' : '') + '</div>';
    if (!d.open) { try { d.showModal(); } catch (e) { d.setAttribute('open', ''); } }
    var f = $('[autofocus]', d) || $('.lj-dlg-corpo input, .lj-dlg-corpo select, .lj-dlg-corpo textarea', d) || $('.lj-dlg-rodape .lj-btn', d) || $('[data-acao="fechar"]', d);
    if (f) f.focus();
    return d;
  }
  function fechar() { var d = dlg(); if (d.open) d.close(); else d.removeAttribute('open'); }
  function confirmar(titulo, texto, sim, perigo) {
    return new Promise(function (ok) {
      var d = abrir(titulo, '<p>' + esc(texto) + '</p>', '<button type="button" class="lj-btn" data-acao="fechar">Voltar</button><button type="button" class="lj-btn ' + (perigo ? 'perigo-cheio' : 'pri') + '" id="lj-sim" autofocus>' + esc(sim) + '</button>');
      var resp = false;
      $('#lj-sim', d).addEventListener('click', function () { resp = true; fechar(); });
      d.addEventListener('close', function f() { d.removeEventListener('close', f); ok(resp); });
    });
  }
  function copiar(txt, ok) {
    var feito = function () { aviso(ok || 'Copiado'); };
    var reserva = function () {
      var t = document.createElement('textarea');
      t.value = txt; t.setAttribute('readonly', ''); t.style.position = 'fixed'; t.style.opacity = '0';
      (dlg().open ? dlg() : document.body).appendChild(t); t.select();
      var deu = false; try { deu = document.execCommand('copy'); } catch (e) { deu = false; }
      t.remove();
      if (deu) feito(); else window.prompt('Copie o texto:', txt);
    };
    if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(txt).then(feito, reserva); else reserva();
  }
  /** Botão ocupado enquanto grava; devolve a promessa. */
  function ocupar(botao, texto, p) {
    var antes = botao ? botao.innerHTML : '';
    if (botao) { botao.disabled = true; botao.textContent = texto; }
    return p.then(function (r) { if (botao && botao.isConnected) { botao.disabled = false; botao.innerHTML = antes; } return r; },
      function (e) { if (botao && botao.isConnected) { botao.disabled = false; botao.innerHTML = antes; } throw e; });
  }

  /* ---------- casca: menu lateral (computador) e inferior (celular) ---------- */
  function iniciais() { var m = P.marcaDaLoja(S.loja); return m.INICIAIS || 'LJ'; }
  function contagens() {
    var pend = pendencias(), abertos = S.d.vendas.filter(function (v) { return v.status === 'pago' || v.status === 'separado'; }).length;
    return { hoje: pend.total, pedidos: abertos };
  }
  function montarCasca() {
    document.body.classList.remove('sem-casca');
    var link = G.links.loja(S.loja), demo = G.modo === 'demo' ? '<span class="lj-demo-selo">Demonstração</span>' : '';
    var nav = ABAS.map(function (a) {
      return '<a class="lj-aba" href="#' + a[0] + '" data-aba="' + a[0] + '">' + icone(a[0]) + '<span class="nm">' + a[1] + '</span><span class="lj-bola" data-bola="' + a[0] + '" hidden></span></a>';
    }).join('');
    var lado = $('#lj-lado');
    lado.innerHTML = '<div class="lj-marca"><span class="lj-ini" aria-hidden="true">' + esc(iniciais()) + '</span><div><b>' + esc(S.loja.nome) + '</b><span>Painel da loja</span>' + demo + '</div></div>' +
      '<nav class="lj-nav" aria-label="Seções do painel">' + nav + '</nav>' +
      '<div class="lj-lado-pe"><a href="#canais" data-aba="canais">' + icone('canais') + 'Canais de venda</a><a href="../montar/">' + icone('lapis') + 'Editar vitrine e fotos</a>' +
      '<a href="' + esc(link) + '" target="_blank" rel="noopener">' + icone('abrir') + 'Ver minha loja</a>' +
      '<button type="button" data-acao="sair">' + icone('sair') + 'Sair</button></div>';
    lado.hidden = false;
    var topo = $('#lj-topo');
    topo.innerHTML = '<span class="lj-ini" aria-hidden="true">' + esc(iniciais()) + '</span><div class="lj-topo-nome"><b>' + esc(S.loja.nome) + '</b>' + demo + '</div>' +
      '<details class="lj-menu"><summary>Menu</summary><div class="lj-menu-caixa">' +
      '<a href="#canais" data-aba="canais">' + icone('canais') + 'Canais de venda</a><a href="../montar/">' + icone('lapis') + 'Editar vitrine e fotos</a><a href="' + esc(link) + '" target="_blank" rel="noopener">' + icone('abrir') + 'Ver minha loja</a>' +
      '<button type="button" data-acao="sair">' + icone('sair') + 'Sair</button></div></details>';
    topo.hidden = false;
  }
  function atualizarBolas() {
    var c = contagens();
    $$('[data-bola]').forEach(function (b) {
      var n = c[b.dataset.bola] || 0;
      b.hidden = !n; b.textContent = n > 99 ? '99+' : String(n);
      b.setAttribute('aria-label', n ? n + ' pendentes' : '');
    });
  }
  function irPara(aba) {
    if (!ROTAS.some(function (a) { return a[0] === aba; })) aba = 'hoje';
    var mudou = S.aba !== aba;
    S.aba = aba;
    $$('[data-aba]').forEach(function (a) { if (a.dataset.aba === aba) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
    $$('.lj-menu').forEach(function (m) { m.open = false; });
    desenhar();
    if (mudou) window.scrollTo(0, 0);
    if (aba === 'vender') focoCodigo();
    else if (mudou) { var h = $('#lj-main h1'); if (h) { h.setAttribute('tabindex', '-1'); h.focus({ preventScroll: true }); } }
  }
  var TELAS = {};
  function desenhar() {
    var main = $('#lj-main'), foco = document.activeElement && document.activeElement.id;
    main.innerHTML = barraErros() + TELAS[S.aba]();
    if (DEPOIS[S.aba]) DEPOIS[S.aba]();
    filtroAVista();
    atualizarBolas();
    var el = foco && foco !== 'lj-main' && document.getElementById(foco);
    if (el && main.contains(el)) {
      el.focus({ preventScroll: true });
      if (/^(text|search)$/.test(el.type)) { try { el.setSelectionRange(el.value.length, el.value.length); } catch (e) { /* nada */ } }
    }
  }
  var DEPOIS = {};
  function filtroAVista() {
    $$('.lj-filtros').forEach(function (c) {
      var f = $('[aria-pressed="true"]', c);
      if (f && c.scrollWidth > c.clientWidth && (f.offsetLeft + f.offsetWidth > c.scrollLeft + c.clientWidth || f.offsetLeft < c.scrollLeft)) c.scrollLeft = f.offsetLeft - 16;
    });
  }
  function barraErros() {
    var e = S.d.erros || {}, k = Object.keys(e);
    if (!k.length) return '';
    var nomes = { vendas: 'vendas', caixa: 'caixa', contas: 'contas a pagar', movimentos: 'movimentos de estoque', vip: 'lista VIP', avisos: 'avisos de reposição' };
    return '<div class="lj-alerta" role="alert">' + icone('alerta') + '<div><b>Parte dos dados não abriu: ' + esc(k.map(function (x) { return nomes[x] || x; }).join(', ')) + '.</b><span>' + esc(e[k[0]]) + '</span></div>' +
      '<button type="button" class="lj-btn" data-acao="recarregar">Tentar de novo</button></div>';
  }
  function cab(titulo, sub, acoes) {
    return '<div class="lj-cab"><div><h1>' + esc(titulo) + '</h1>' + (sub ? '<p>' + sub + '</p>' : '') + '</div>' + (acoes ? '<div class="lj-botoes">' + acoes + '</div>' : '') + '</div>';
  }
  function vazio(titulo, texto, acao) { return '<div class="lj-vazio"><b>' + esc(titulo) + '</b><p>' + esc(texto) + '</p>' + (acao || '') + '</div>'; }
  function kpi(rot, val, sub, tom) { return '<div class="lj-kpi' + (tom ? ' ' + tom : '') + '"><span>' + esc(rot) + '</span><b>' + val + '</b>' + (sub ? '<small>' + sub + '</small>' : '') + '</div>'; }
  function chipStatus(s) {
    var ic = { pago: 'check', separado: 'pedidos', enviado: 'caminhao', entregue: 'check', cancelado: 'x' }[s];
    return '<span class="lj-chip st-' + s + '">' + icone(ic) + esc(N.status[s] || s) + '</span>';
  }
  function miniatura(i, tam) {
    var src = imgSrc(i);
    return src ? '<img class="lj-mini" src="' + esc(src) + '" alt="" loading="lazy" width="' + (tam || 52) + '" height="' + (tam || 52) + '">'
      : '<span class="lj-mini sem" style="width:' + (tam || 52) + 'px;height:' + (tam || 52) + 'px;background:' + esc((i && i.hex) || '#C9D6D3') + '" aria-hidden="true"></span>';
  }

  /* ---------- HOJE ---------- */
  function pendencias() {
    var hoje = U.dia(), agora = new Date(), g = { pedidos: [], avisos: [], contas: [], clientes: [], vip: [], estoque: [] };
    S.d.vendas.forEach(function (v) { if (v.status === 'pago' || v.status === 'separado') g.pedidos.push(v); });
    g.pedidos.sort(function (a, b) { return String(a.criadaEm).localeCompare(String(b.criadaEm)); });
    S.d.avisos.forEach(function (a) { var i = peca(a.itemId); if (!a.avisado && i && i.estoque && Number(i.estoque[a.tam]) > 0) g.avisos.push(a); });
    S.d.contas.forEach(function (c) { var s = G.calc.situacaoConta(c); if (!c.paga && s.dias <= 3) g.contas.push(c); });
    g.contas.sort(function (a, b) { return String(a.vence).localeCompare(String(b.vence)); });
    g.clientes = G.calc.compradoras(S.d.vendas).filter(function (c) { return c.whats && c.diasSemComprar >= 60; }).sort(function (a, b) { return b.total - a.total; });
    g.vip = S.itens.filter(function (i) { return i.vipAte && new Date(i.vipAte) > agora; });
    var zerados = 0;
    S.itens.forEach(function (i) { Object.keys(i.estoque || {}).forEach(function (t) { if (i.estoque[t] === 0) zerados++; }); });
    if (zerados) g.estoque.push(zerados);
    g.total = g.pedidos.length + g.avisos.length + g.contas.length + Math.min(g.clientes.length, 5) + (g.vip.length ? 1 : 0);
    g.hoje = hoje;
    return g;
  }
  function msgStatus(v) {
    var frase = { pago: 'foi recebido e já está na fila para separar', separado: 'já está separado', enviado: 'saiu para entrega', entregue: 'foi entregue. Obrigada pela compra!' }[v.status] || 'foi atualizado';
    var link = G.links.acompanhar(S.loja, v.acompanhar);
    return 'Oi' + (primeiroNome(v.cliente && v.cliente.nome) ? ', ' + primeiroNome(v.cliente.nome) : '') + '! Seu pedido #' + v.numero + ' da ' + S.loja.nome + ' ' + frase + (link && v.status !== 'entregue' ? '\nAcompanhe por aqui: ' + link : '');
  }
  function msgAviso(a) {
    return 'Oi, ' + primeiroNome(a.nome) + '! Aqui é da ' + S.loja.nome + '. O ' + a.peca + ' no tamanho ' + (a.tam === 'U' ? 'único' : a.tam) + ' que você pediu voltou ao estoque. Quer que eu separe para você?\n' + G.links.loja(S.loja);
  }
  function msgSumida(c) {
    return 'Oi, ' + primeiroNome(c.nome) + '! Sentimos sua falta aqui na ' + S.loja.nome + '. Separei um presente: use o cupom ' + (S.cupom || 'VOLTEI10') + ' na sua próxima compra. Veja as novidades: ' + G.links.loja(S.loja);
  }
  function msgVip(itens) {
    var ate = itens.map(function (i) { return i.vipAte; }).sort()[0], d = new Date(ate);
    return 'Lançamento VIP da ' + S.loja.nome + ': ' + itens.map(function (i) { return G.nomeComCor(i); }).join(', ') + '. Você vê antes de todo mundo até ' +
      d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) + ' às ' + hora(ate) + '. Entre pelo seu link: ' + G.links.vip(S.loja);
  }
  function pend(tom, ic, titulo, detalhe, botoes) {
    return '<li class="lj-pend ' + tom + '"><span class="lj-pend-ic">' + icone(ic) + '</span><div class="tx"><b>' + titulo + '</b><span>' + detalhe + '</span></div><div class="lj-botoes">' + botoes + '</div></li>';
  }
  function resumoItens(v) { return (v.itens || []).map(function (i) { return i.qtd + '× ' + i.nome + ' (' + (i.tam === 'U' ? 'único' : i.tam) + ')'; }).join(', '); }
  function botaoWa(numero, msg, rotulo, extra) {
    return '<a class="lj-btn wa" href="' + esc(G.wa(numero, msg)) + '" target="_blank" rel="noopener"' + (extra || '') + '>' + icone('whats') + esc(rotulo) + '</a>';
  }
  TELAS.hoje = function () {
    var g = pendencias(), hoje = g.hoje, vh = validas().filter(function (v) { return v.data === hoje; });
    var mes = G.calc.caixaMes(S.d.caixa, hoje.slice(0, 7)), pagos = g.pedidos.filter(function (v) { return v.status === 'pago'; }).length;
    var enviados = S.d.vendas.filter(function (v) { return v.status === 'enviado'; }).length;
    var zer = 0, baixo = 0, controla = 0;
    S.itens.forEach(function (i) { Object.keys(i.estoque || {}).forEach(function (t) { controla++; if (i.estoque[t] === 0) zer++; else if (i.estoque[t] === 1) baixo++; }); });
    var dataLonga = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
    var h = '<p class="lj-sobre">' + esc(dataLonga.charAt(0).toUpperCase() + dataLonga.slice(1)) + '</p>' +
      cab('Hoje', '', '<a class="lj-btn pri grande" href="#vender">' + icone('vender') + 'Nova venda</a>') + bannerDemo() +
      '<div class="lj-kpis">' +
      kpi('Vendido hoje', brl(vh.reduce(function (s, v) { return s + v.total; }, 0)), plural(vh.length, 'venda', 'vendas')) +
      kpi('Saldo do mês', brl(mes.saldo), 'Entrou ' + brl0(mes.entradas) + ' · saiu ' + brl0(mes.saidas), mes.saldo < 0 ? 'neg' : '') +
      kpi('Pedidos abertos', num(g.pedidos.length + enviados), pagos + ' para separar · ' + (g.pedidos.length - pagos) + ' para enviar') +
      (controla ? kpi('Estoque', zer ? num(zer) + (zer === 1 ? ' zerado' : ' zerados') : 'Em dia', (zer ? 'tamanhos sem peça' : 'nenhum tamanho zerado') + (baixo ? ' · ' + plural(baixo, 'com só 1', 'com só 1') : ''), zer ? 'at' : '')
        : kpi('Estoque', 'Sem controle', '<a href="#estoque">Lance as quantidades</a>')) +
      '</div>';
    var grupos = '';
    if (g.pedidos.length) grupos += '<h3 class="lj-grupo">Pedidos</h3><ul class="lj-pends">' + g.pedidos.slice(0, 12).map(function (v) {
      var sep = v.status === 'pago', cli = (v.cliente && v.cliente.nome) || 'Sem nome';
      return pend(sep ? 'azul' : 'verde', sep ? 'pedidos' : 'caminhao', (sep ? 'Separar' : 'Enviar') + ' o pedido #' + esc(v.numero),
        esc(cli) + ' · ' + esc(plural(v.itens.reduce(function (s, i) { return s + i.qtd; }, 0), 'peça', 'peças')) + ' · ' + esc(N.canal[v.canal]) + ' · ' + esc(quando(v.criadaEm)),
        '<button type="button" class="lj-btn pri" data-acao="status" data-id="' + esc(v.id) + '" data-status="' + (sep ? 'separado' : 'enviado') + '">' + (sep ? 'Marcar como separado' : 'Marcar como enviado') + '</button>' +
        (sep ? '' : '<button type="button" class="lj-btn" data-acao="etiqueta-envio" data-id="' + esc(v.id) + '">' + icone('impressora') + 'Etiqueta</button>'));
    }).join('') + '</ul>';
    if (g.avisos.length) grupos += '<h3 class="lj-grupo">Voltou ao estoque</h3><ul class="lj-pends">' + g.avisos.map(function (a) {
      var i = peca(a.itemId);
      return pend('verde', 'presente', esc(primeiroNome(a.nome)) + ' quer o ' + esc(a.peca) + ' ' + esc(a.tam === 'U' ? '' : a.tam), 'Agora tem ' + esc(plural(Number(i.estoque[a.tam]), 'peça', 'peças')) + ' · pediu em ' + esc(diaCurto(String(a.criadoEm).slice(0, 10))),
        botaoWa(a.whats, msgAviso(a), 'Avisar no WhatsApp', ' data-acao="avisar" data-id="' + esc(a.id) + '"'));
    }).join('') + '</ul>';
    if (g.contas.length) grupos += '<h3 class="lj-grupo">Contas</h3><ul class="lj-pends">' + g.contas.map(function (c) {
      var s = G.calc.situacaoConta(c), txt = s.sit === 'vencida' ? 'Venceu há ' + plural(-s.dias, 'dia', 'dias') : s.sit === 'hoje' ? 'Vence hoje' : 'Vence em ' + plural(s.dias, 'dia', 'dias');
      return pend(s.sit === 'vencida' ? 'vermelho' : 'amarelo', 'calendario', esc(c.descricao) + ' · ' + esc(brl(c.valor)), esc(txt) + ' (' + esc(diaBR(c.vence)) + ')',
        '<button type="button" class="lj-btn pri" data-acao="pagar-conta" data-id="' + esc(c.id) + '">Marcar como paga</button>');
    }).join('') + '</ul>';
    if (g.clientes.length) grupos += '<h3 class="lj-grupo">Clientes para chamar de volta</h3>' +
      '<label class="lj-campo lj-cupom">Cupom para a mensagem<input id="lj-cupom" data-campo="cupom" value="' + esc(S.cupom) + '" maxlength="30" autocomplete="off"></label>' +
      '<ul class="lj-pends">' + g.clientes.slice(0, 5).map(function (c) {
        return pend('roxo', 'clientes', esc(c.nome || fone(c.whats)), 'Última compra há ' + esc(plural(c.diasSemComprar, 'dia', 'dias')) + ' · ' + esc(plural(c.pedidos, 'pedido', 'pedidos')) + ' · ' + esc(brl(c.total)),
          botaoWa(c.whats, msgSumida(c), 'Mandar cupom', ' data-wa-sumida="' + esc(c.whats) + '"'));
      }).join('') + '</ul>' + (g.clientes.length > 5 ? '<p class="lj-nota">Mais ' + plural(g.clientes.length - 5, 'cliente', 'clientes') + ' em <a href="#clientes">Clientes</a>.</p>' : '');
    if (g.vip.length) {
      var temLink = !!S.loja.vipCodigo, n = S.d.vip.length;
      grupos += '<h3 class="lj-grupo">Lançamento VIP</h3><ul class="lj-pends">' + pend('amarelo', 'estrela', plural(g.vip.length, 'peça só para a lista VIP', 'peças só para a lista VIP'),
        esc(g.vip.map(function (i) { return G.nomeComCor(i); }).join(', ')) + ' · ' + plural(n, 'contato', 'contatos') + ' na lista',
        temLink ? '<button type="button" class="lj-btn pri" data-acao="copiar-vip-msg">' + icone('copiar') + 'Copiar mensagem</button><button type="button" class="lj-btn" data-acao="copiar-vip-nums"' + (n ? '' : ' disabled') + '>' + icone('copiar') + 'Copiar números (' + n + ')</button>'
          : '<button type="button" class="lj-btn pri" data-acao="gerar-vip">Gerar link VIP</button>') + '</ul>';
    }
    if (g.estoque.length) grupos += '<h3 class="lj-grupo">Estoque</h3><ul class="lj-pends">' + pend('amarelo', 'alerta', plural(g.estoque[0], 'tamanho zerado', 'tamanhos zerados'), 'Some da vitrine até chegar mercadoria.', '<button type="button" class="lj-btn" data-acao="ver-zerados">Ver no estoque</button>') + '</ul>';
    h += '<section class="lj-card" aria-labelledby="lj-t-fazer"><div class="lj-card-topo"><h2 id="lj-t-fazer">Para fazer agora</h2></div>' +
      (grupos || vazio('Tudo em dia', 'Nenhum pedido para separar, conta vencendo ou aviso de reposição agora.', '<a class="lj-btn pri" href="#vender">Registrar uma venda</a>')) + '</section>';
    var ultimas = S.d.vendas.slice(0, 6);
    h += '<section class="lj-card" aria-labelledby="lj-t-ult"><div class="lj-card-topo"><h2 id="lj-t-ult">Últimas vendas</h2>' + (ultimas.length ? '<a class="lj-link" href="#pedidos" data-acao="ped-todos">Ver todas</a>' : '') + '</div>' +
      (ultimas.length ? '<ul class="lj-linhas">' + ultimas.map(linhaVenda).join('') + '</ul>' : vazio('Nenhuma venda ainda', 'A primeira venda que você registrar aparece aqui.', '')) + '</section>';
    return h;
  };
  function linhaVenda(v) {
    return '<li><div class="tx"><b>#' + esc(v.numero) + ' · ' + esc((v.cliente && v.cliente.nome) || N.canal[v.canal]) + '</b><span>' + esc(quando(v.criadaEm)) + ' · ' + esc(N.forma[v.forma]) + '</span></div>' + chipStatus(v.status) + '<b class="v">' + esc(brl(v.total)) + '</b></li>';
  }
  function bannerDemo() {
    if (G.modo !== 'demo') return '';
    return '<div class="lj-banner"><div><b>Modo demonstração</b><span>Tudo fica só neste navegador. Com o banco ligado, as vendas ficam guardadas na nuvem.</span></div><div class="lj-botoes">' +
      (S.d.vendas.length ? '<button type="button" class="lj-btn" data-acao="limpar-demo">Apagar dados da demonstração</button>' : '<button type="button" class="lj-btn pri" data-acao="exemplos">Preencher com exemplos</button>') + '</div></div>';
  }

  /* ---------- VENDER (balcão) ---------- */
  TELAS.vender = function () {
    return cab('Vender', 'Passe o leitor na etiqueta ou busque a peça pelo nome.') +
      '<div class="lj-vender"><section class="lj-card lj-leitor" aria-label="Adicionar peça">' +
      '<form data-form="codigo" class="lj-codigo" autocomplete="off" novalidate><label for="lj-codigo">Código da etiqueta</label>' +
      '<div class="lj-codigo-linha"><input id="lj-codigo" name="codigo" type="text" enterkeyhint="enter" autocapitalize="characters" autocorrect="off" spellcheck="false" placeholder="Ex.: ' + esc(S.itens[0] ? G.codigo(S.itens[0], (S.itens[0].tamanhos || ['M'])[0] || 'M') : 'K7Q2ZA-M') + ' ou o nome" aria-describedby="lj-codigo-dica">' +
      '<button type="submit" class="lj-btn pri">Adicionar</button></div>' +
      '<small id="lj-codigo-dica">O leitor USB ou Bluetooth digita o código e dá Enter sozinho.</small></form>' +
      '<button type="button" class="lj-btn largo" data-acao="camera">' + icone('camera') + 'Ler com a câmera</button>' +
      '<div id="lj-resultados" class="lj-resultados" aria-live="polite"></div></section>' +
      '<section class="lj-card lj-carrinho" id="lj-carrinho" aria-label="Venda">' + carrinhoHTML() + '</section>' + vendasDeHoje() + '</div>';
  };
  function vendasDeHoje() {
    var hoje = U.dia(), vs = S.d.vendas.filter(function (v) { return v.data === hoje; });
    return '<section class="lj-card lj-vhoje" aria-labelledby="lj-t-vhoje"><div class="lj-card-topo"><h2 id="lj-t-vhoje">Vendas de hoje</h2><span class="lj-sub">' +
      esc(brl(vs.filter(function (v) { return v.status !== 'cancelado'; }).reduce(function (s, v) { return s + v.total; }, 0))) + '</span></div>' +
      (vs.length ? '<ul class="lj-linhas">' + vs.slice(0, 8).map(function (v) {
        return '<li><div class="tx"><b>#' + esc(v.numero) + ' · ' + esc((v.cliente && v.cliente.nome) || N.canal[v.canal]) + '</b><span>' + esc(hora(v.criadaEm)) + ' · ' + esc(N.forma[v.forma]) + (v.status === 'cancelado' ? ' · cancelada' : '') + '</span></div><b class="v">' + esc(brl(v.total)) + '</b>' +
          '<button type="button" class="lj-btn" data-acao="ver-recibo" data-id="' + esc(v.id) + '">Recibo</button></li>';
      }).join('') + '</ul>' : '<p class="lj-res-nada">Nenhuma venda hoje ainda.</p>') + '</section>';
  }
  function subtotal() { return U.centavos(S.carrinho.reduce(function (s, l) { return s + l.preco * l.qtd; }, 0)); }
  function totalVenda() { return Math.max(0, U.centavos(subtotal() - Math.min(subtotal(), U.centavos(S.venda.desconto)))); }
  function carrinhoHTML() {
    var v = S.venda, n = S.carrinho.reduce(function (s, l) { return s + l.qtd; }, 0);
    var pedido = v.canal !== 'balcao';
    if (!S.carrinho.length) {
      return '<h2>Venda</h2>' + vazio('Nenhuma peça ainda', 'Passe o leitor na etiqueta, digite o código ou busque pelo nome.', '') + (pedido ? '<p class="lj-nota">Lançando pedido de ' + esc(N.canal[v.canal]) + '. <button type="button" class="lj-link" data-acao="canal-balcao">Voltar para balcão</button></p>' : '');
    }
    var linhas = S.carrinho.map(function (l, k) {
      var i = peca(l.id) || {}, est = i.estoque && (l.tam in i.estoque) ? i.estoque[l.tam] : null;
      var tams = (i.tamanhos && i.tamanhos.length ? i.tamanhos : [l.tam]).map(function (t) { return '<option' + (t === l.tam ? ' selected' : '') + ' value="' + t + '">' + (t === 'U' ? 'Único' : t) + '</option>'; }).join('');
      return '<li class="lj-item">' + miniatura(i, 48) + '<div class="tx"><b>' + esc(l.nome) + '</b><span>' + esc(brl(l.preco)) + (est !== null ? ' · ' + (est - l.qtd < 0 ? '<em class="falta">estoque: ' + est + '</em>' : 'estoque: ' + est) : '') + '</span></div>' +
        '<div class="lj-item-ctl"><label class="lj-tam-sel"><span class="lj-sr">Tamanho de ' + esc(l.nome) + '</span><select id="lj-tam-' + k + '" data-campo="tam-linha" data-i="' + k + '">' + tams + '</select></label>' +
        '<div class="lj-qtd" role="group" aria-label="Quantidade de ' + esc(l.nome) + '"><button type="button" class="lj-btn-ic" data-acao="qtd" data-i="' + k + '" data-d="-1" aria-label="Uma a menos">' + icone('menos') + '</button><output aria-live="polite">' + l.qtd + '</output><button type="button" class="lj-btn-ic" data-acao="qtd" data-i="' + k + '" data-d="1" aria-label="Uma a mais">' + icone('mais') + '</button></div>' +
        '<b class="v">' + esc(brl(l.preco * l.qtd)) + '</b></div><button type="button" class="lj-btn-ic tira" data-acao="remover" data-i="' + k + '" aria-label="Tirar ' + esc(l.nome) + ' da venda">' + icone('lixo') + '</button></li>';
    }).join('');
    var formas = G.FORMAS.map(function (f) { return '<button type="button" class="lj-seg-b" data-acao="forma" data-forma="' + f + '" aria-pressed="' + (v.forma === f) + '">' + esc(NOME_FORMA[f]) + '</button>'; }).join('');
    var canais = G.CANAIS.map(function (c) { return '<option value="' + c + '"' + (v.canal === c ? ' selected' : '') + '>' + esc(N.canal[c]) + '</option>'; }).join('');
    return '<div class="lj-card-topo"><h2>Venda</h2><span class="lj-chip">' + plural(n, 'peça', 'peças') + '</span></div><ul class="lj-itens">' + linhas + '</ul>' +
      '<div class="lj-totais"><div><span>Subtotal</span><b id="lj-subtotal">' + esc(brl(subtotal())) + '</b></div>' +
      '<label class="lj-campo lj-desc">Desconto em R$<input id="lj-desconto" data-venda="desconto" type="text" inputmode="decimal" value="' + esc(v.desconto) + '" placeholder="0,00" autocomplete="off"></label>' +
      '<div class="lj-total"><span>Total</span><b id="lj-total">' + esc(brl(totalVenda())) + '</b></div></div>' +
      '<fieldset class="lj-fs"><legend>Pagamento</legend><div class="lj-seg" role="group" aria-label="Forma de pagamento">' + formas + '</div></fieldset>' +
      (v.forma === 'dinheiro' ? '<div class="lj-troco"><label class="lj-campo">Valor recebido<input id="lj-recebido" data-venda="recebido" type="text" inputmode="decimal" value="' + esc(v.recebido) + '" placeholder="0,00" autocomplete="off"></label><p id="lj-troco" aria-live="polite">' + trocoTexto() + '</p></div>' : '') +
      '<div class="lj-form2"><label class="lj-campo">Canal<select id="lj-canal" data-venda="canal">' + canais + '</select></label>' +
      '<label class="lj-campo"><span>Nome da cliente' + (pedido ? '' : ' <small>(opcional)</small>') + '</span><input id="lj-cli-nome" data-venda="cliente.nome" value="' + esc(v.cliente.nome) + '" maxlength="60" autocomplete="off" list="lj-compradoras"></label>' +
      '<label class="lj-campo"><span>WhatsApp da cliente' + (pedido ? '' : ' <small>(opcional)</small>') + '</span><input id="lj-cli-whats" data-venda="cliente.whats" type="tel" inputmode="tel" value="' + esc(v.cliente.whats) + '" maxlength="20" placeholder="(67) 99999-0000" autocomplete="off"></label>' +
      (pedido ? '<label class="lj-campo larga">Endereço de entrega<textarea id="lj-endereco" data-venda="endereco" rows="2" maxlength="400" placeholder="Rua, número, bairro, cidade, CEP. Vazio = retira na loja.">' + esc(v.endereco) + '</textarea></label>' : '') +
      '</div><datalist id="lj-compradoras">' + G.calc.compradoras(S.d.vendas).slice(0, 80).map(function (c) { return c.nome ? '<option value="' + esc(c.nome) + '">' : ''; }).join('') + '</datalist>' +
      '<button type="button" class="lj-btn pri largo grande" data-acao="registrar" id="lj-registrar">' + (pedido ? 'Lançar pedido · ' : 'Registrar venda · ') + esc(brl(totalVenda())) + '</button>' +
      (pedido ? '<p class="lj-nota">O pedido entra como pago e vai para Pedidos, com link de acompanhamento para a cliente.</p>' : '');
  }
  function trocoTexto() {
    var r = U.centavos(S.venda.recebido), t = totalVenda();
    if (!r) return 'Digite quanto a cliente entregou para ver o troco.';
    return r < t ? 'Faltam ' + brl(t - r) + '.' : 'Troco: <b>' + esc(brl(r - t)) + '</b>';
  }
  function atualizarTotais() {
    var t = $('#lj-total'); if (t) t.textContent = brl(totalVenda());
    var r = $('#lj-registrar'); if (r) r.textContent = (S.venda.canal !== 'balcao' ? 'Lançar pedido · ' : 'Registrar venda · ') + brl(totalVenda());
    var tr = $('#lj-troco'); if (tr) tr.innerHTML = trocoTexto();
  }
  function desenharCarrinho() {
    var c = $('#lj-carrinho'); if (!c) return;
    var foco = document.activeElement && document.activeElement.id;
    c.innerHTML = carrinhoHTML();
    if (foco && document.getElementById(foco) && c.contains(document.getElementById(foco))) document.getElementById(foco).focus({ preventScroll: true });
    atualizarBolas();
  }
  function focoCodigo() {
    var c = $('#lj-codigo');
    if (c && !dlg().open) c.focus({ preventScroll: true });
  }
  function buscar(q) {
    var t = semAcento(q).trim();
    if (t.length < 2) return [];
    var partes = t.split(/\s+/);
    return S.itens.filter(function (i) {
      var alvo = semAcento([i.nome, i.cor, G.sku(i), i.cat].join(' '));
      return partes.every(function (p) { return alvo.indexOf(p) >= 0; });
    }).slice(0, 8);
  }
  function resultadosHTML(achados, titulo) {
    return (titulo ? '<p class="lj-res-tit">' + esc(titulo) + '</p>' : '') + '<ul class="lj-achados">' + achados.map(function (i) {
      var tams = (i.tamanhos && i.tamanhos.length ? i.tamanhos : ['U']).map(function (t) {
        var e = i.estoque && (t in i.estoque) ? i.estoque[t] : null;
        return '<button type="button" class="lj-tam-b' + (e === 0 ? ' zero' : '') + '" data-acao="add" data-id="' + esc(i.id) + '" data-tam="' + t + '" aria-label="Adicionar ' + esc(G.nomeComCor(i)) + ' tamanho ' + (t === 'U' ? 'único' : t) + (e !== null ? ', ' + e + ' no estoque' : '') + '">' + (t === 'U' ? 'Único' : t) + (e !== null ? '<small>' + e + '</small>' : '') + '</button>';
      }).join('');
      return '<li>' + miniatura(i, 44) + '<div class="tx"><b>' + esc(G.nomeComCor(i)) + '</b><span>' + esc(brl(i.preco)) + ' · ' + esc(G.sku(i)) + '</span></div><div class="lj-tams">' + tams + '</div></li>';
    }).join('') + '</ul>';
  }
  function mostrarResultados(q) {
    var box = $('#lj-resultados'); if (!box) return;
    var a = buscar(q);
    box.innerHTML = !q || q.trim().length < 2 ? '' : a.length ? resultadosHTML(a) : '<p class="lj-res-nada">Nenhuma peça com “' + esc(q.trim()) + '”. Confira o código embaixo das barras ou busque pelo nome.</p>';
  }
  function adicionar(item, tam) {
    var tams = item.tamanhos && item.tamanhos.length ? item.tamanhos : ['U'];
    if (!tam || tams.indexOf(tam) < 0) {
      if (tams.length === 1) tam = tams[0];
      else { $('#lj-resultados').innerHTML = resultadosHTML([item], 'Qual tamanho?'); var b = $('#lj-resultados .lj-tam-b'); if (b) b.focus(); return; }
    }
    var l = S.carrinho.filter(function (x) { return x.id === item.id && x.tam === tam; })[0];
    if (l) l.qtd++; else S.carrinho.push(l = { id: item.id, nome: G.nomeComCor(item), tam: tam, preco: Number(item.preco) || 0, qtd: 1 });
    var est = item.estoque && (tam in item.estoque) ? item.estoque[tam] : null;
    if (navigator.vibrate) { try { navigator.vibrate(25); } catch (e) { /* nada */ } }
    aviso(est !== null && l.qtd > est ? 'Adicionado. Atenção: o estoque do ' + tam + ' mostra ' + est + '.' : 'Adicionado: ' + l.nome + ' (' + (tam === 'U' ? 'único' : tam) + ')');
    var c = $('#lj-codigo'); if (c) c.value = '';
    $('#lj-resultados').innerHTML = '';
    desenharCarrinho(); focoCodigo();
  }
  function processarCodigo(txt) {
    clearTimeout(mostrarResultados.t);
    txt = String(txt || '').trim();
    if (!txt) return;
    var r = G.lerCodigo(txt, S.itens);
    if (r) return adicionar(r.item, r.tam);
    var a = buscar(txt);
    if (a.length === 1 && (a[0].tamanhos || []).length <= 1) return adicionar(a[0], null);
    if (a.length) { $('#lj-resultados').innerHTML = resultadosHTML(a, a.length === 1 ? 'Qual tamanho?' : 'Escolha a peça e o tamanho'); return; }
    $('#lj-resultados').innerHTML = '<p class="lj-res-nada">Código “' + esc(txt) + '” não encontrado. Confira a etiqueta ou busque pelo nome.</p>';
    aviso('Código não encontrado');
  }
  function registrar(botao) {
    if (!S.carrinho.length) return aviso('Adicione pelo menos uma peça.');
    var v = S.venda, pedido = v.canal !== 'balcao', whats = U.digitos(v.cliente.whats);
    if (whats && whats.length < 10) { aviso('Confira o WhatsApp da cliente: com DDD, 10 ou 11 números.'); var w = $('#lj-cli-whats'); if (w) w.focus(); return; }
    if (pedido && !v.cliente.nome.trim()) { aviso('Pedido precisa do nome da cliente.'); var n = $('#lj-cli-nome'); if (n) n.focus(); return; }
    var dados = { itens: S.carrinho, desconto: v.desconto, forma: v.forma, canal: v.canal, cliente: v.cliente, endereco: pedido ? v.endereco : '', obs: v.obs };
    ocupar(botao, pedido ? 'Lançando…' : 'Registrando…', G.registrarVenda(S.conta, S.loja, dados)).then(function (m) {
      aplicar(m);
      S.carrinho = []; S.venda = vendaNova();
      desenhar();
      recibo(m.venda, true);
    }).catch(falhou);
  }
  function textoRecibo(v) {
    var l = ['Recibo · ' + S.loja.nome, 'Pedido #' + v.numero + ' · ' + diaBR(v.data) + ' ' + hora(v.criadaEm), ''];
    v.itens.forEach(function (i) { l.push(i.qtd + '× ' + i.nome + ' (' + (i.tam === 'U' ? 'único' : i.tam) + ') — ' + brl(i.preco * i.qtd)); });
    if (v.desconto) l.push('Desconto: −' + brl(v.desconto));
    l.push('Total: ' + brl(v.total) + ' · ' + NOME_FORMA[v.forma]);
    var link = G.links.acompanhar(S.loja, v.acompanhar);
    if (link) l.push('', 'Acompanhe o pedido: ' + link);
    l.push('', 'Obrigada pela compra!');
    return l.join('\n');
  }
  function recibo(v, nova) {
    var temWa = v.cliente && v.cliente.whats;
    abrir(nova ? (v.canal === 'balcao' ? 'Venda registrada' : 'Pedido lançado') : 'Recibo #' + v.numero,
      '<div class="lj-recibo"><p class="lj-recibo-n">Pedido <b>#' + esc(v.numero) + '</b> · ' + esc(quando(v.criadaEm)) + '</p><ul>' +
      v.itens.map(function (i) { return '<li><span>' + i.qtd + '× ' + esc(i.nome) + ' (' + esc(i.tam === 'U' ? 'único' : i.tam) + ')</span><b>' + esc(brl(i.preco * i.qtd)) + '</b></li>'; }).join('') +
      (v.desconto ? '<li class="desc"><span>Desconto</span><b>−' + esc(brl(v.desconto)) + '</b></li>' : '') +
      '<li class="tot"><span>Total · ' + esc(NOME_FORMA[v.forma]) + '</span><b>' + esc(brl(v.total)) + '</b></li></ul>' +
      (v.cliente && v.cliente.nome ? '<p class="lj-nota">Cliente: ' + esc(v.cliente.nome) + (temWa ? ' · ' + esc(fone(v.cliente.whats)) : '') + '</p>' : '') + '</div>',
      (temWa ? botaoWa(v.cliente.whats, textoRecibo(v), 'Mandar recibo no WhatsApp') : '') +
      '<button type="button" class="lj-btn" data-acao="copiar-recibo" data-id="' + esc(v.id) + '">' + icone('copiar') + 'Copiar recibo</button>' +
      (nova ? '<button type="button" class="lj-btn pri" data-acao="fechar">Nova venda</button>' : ''));
  }

  /* câmera: BarcodeDetector (Chrome no Android, computador). No iPhone não existe: a leitura é pelo campo. */
  function camera() {
    if (!('BarcodeDetector' in window) || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) return explicarCamera();
    window.BarcodeDetector.getSupportedFormats().then(function (f) { if (f.indexOf('code_128') < 0) explicarCamera(); else abrirCamera(); }).catch(explicarCamera);
  }
  function explicarCamera() {
    abrir('A câmera não lê código neste aparelho',
      '<p>Este navegador não tem leitura de código de barras pela câmera. No iPhone é assim em todos os navegadores.</p>' +
      '<ul class="lj-passos"><li>Digite no campo <b>Código da etiqueta</b> o código impresso embaixo das barras e toque em Adicionar.</li>' +
      '<li>Ou conecte um leitor USB ou Bluetooth: ele funciona como teclado e adiciona sozinho.</li><li>No Android, abra o painel no Chrome para usar a câmera.</li></ul>',
      '<button type="button" class="lj-btn pri" data-acao="fechar">Entendi</button>');
  }
  function abrirCamera() {
    var d = abrir('Ler com a câmera', '<div class="lj-video"><video id="lj-video" playsinline muted autoplay></video><i class="lj-mira" aria-hidden="true"></i></div><p id="lj-cam-status" class="lj-nota" role="status">Abrindo a câmera…</p>',
      '<button type="button" class="lj-btn" data-acao="fechar">Fechar</button>');
    var st = $('#lj-cam-status', d), video = $('#lj-video', d);
    navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false }).then(function (stream) {
      if (!dlg().open) { stream.getTracks().forEach(function (t) { t.stop(); }); return; }
      S.stream = stream; video.srcObject = stream;
      var p = video.play(); if (p && p.catch) p.catch(function () {});
      st.textContent = 'Aponte para o código de barras da etiqueta, com boa luz.';
      var det = new window.BarcodeDetector({ formats: ['code_128'] });
      var passo = function () {
        if (!S.stream) return;
        det.detect(video).then(function (r) {
          if (r && r.length && r[0].rawValue) { var t = r[0].rawValue; fechar(); processarCodigo(t); }
          else S.camT = setTimeout(passo, 180);
        }).catch(function () { S.camT = setTimeout(passo, 400); });
      };
      passo();
    }).catch(function (e) {
      st.textContent = e && e.name === 'NotAllowedError' ? 'A câmera foi bloqueada. Libere a câmera para este site nas configurações do navegador e tente de novo.'
        : e && e.name === 'NotFoundError' ? 'Não achamos câmera neste aparelho. Use o campo do código.' : 'Não deu para abrir a câmera. Use o campo do código.';
    });
  }
  function pararCamera() {
    clearTimeout(S.camT);
    if (S.stream) { S.stream.getTracks().forEach(function (t) { t.stop(); }); S.stream = null; }
  }

  /* ---------- PEDIDOS ---------- */
  var FILTROS_PED = [['pago', 'Para separar'], ['separado', 'Para enviar'], ['enviado', 'Enviados'], ['entregue', 'Entregues'], ['cancelado', 'Cancelados'], ['todos', 'Todos']];
  TELAS.pedidos = function () {
    var cont = {}; S.d.vendas.forEach(function (v) { cont[v.status] = (cont[v.status] || 0) + 1; }); cont.todos = S.d.vendas.length;
    var q = semAcento(S.pedBusca).trim();
    var ls = S.d.vendas.filter(function (v) { return S.pedFiltro === 'todos' || v.status === S.pedFiltro; })
      .filter(function (v) { return !q || semAcento('#' + v.numero + ' ' + v.numero + ' ' + ((v.cliente && v.cliente.nome) || '') + ' ' + ((v.cliente && v.cliente.whats) || '')).indexOf(q) >= 0; });
    var h = cab('Pedidos', 'Troque a situação e avise a cliente com o link de acompanhamento.', '<button type="button" class="lj-btn pri" data-acao="pedido-whats">' + icone('whats') + 'Lançar pedido do WhatsApp</button>') +
      '<div class="lj-filtros" role="group" aria-label="Situação dos pedidos">' + FILTROS_PED.map(function (f) {
        return '<button type="button" class="lj-filtro" data-acao="filtro-ped" data-f="' + f[0] + '" aria-pressed="' + (S.pedFiltro === f[0]) + '">' + esc(f[1]) + '<span>' + (cont[f[0]] || 0) + '</span></button>';
      }).join('') + '</div>' +
      '<label class="lj-busca">' + icone('busca') + '<span class="lj-sr">Buscar pedido</span><input id="lj-ped-busca" type="search" data-campo="ped-busca" value="' + esc(S.pedBusca) + '" placeholder="Buscar por nome, WhatsApp ou número" autocomplete="off"></label>';
    if (!ls.length) {
      var txt = { pago: ['Nenhum pedido para separar', 'Pedidos pagos que chegam pelo WhatsApp, Instagram ou site aparecem aqui.'], separado: ['Nada para enviar', 'Os pedidos separados ficam aqui até você marcar como enviado.'] }[S.pedFiltro] || ['Nenhum pedido aqui', q ? 'Nada com essa busca. Tente outro nome ou número.' : 'Quando houver pedidos nesta situação, eles aparecem aqui.'];
      return h + '<section class="lj-card">' + vazio(txt[0], txt[1], '<button type="button" class="lj-btn pri" data-acao="pedido-whats">Lançar pedido do WhatsApp</button>') + '</section>';
    }
    return h + '<ul class="lj-pedidos">' + ls.slice(0, S.pedLimite).map(cartaoPedido).join('') + '</ul>' +
      (ls.length > S.pedLimite ? '<button type="button" class="lj-btn largo" data-acao="mais-pedidos">Mostrar mais ' + Math.min(40, ls.length - S.pedLimite) + '</button>' : '');
  };
  function cartaoPedido(v) {
    var c = v.cliente || {}, prox = { pago: ['separado', 'Marcar como separado'], separado: ['enviado', 'Marcar como enviado'], enviado: ['entregue', 'Marcar como entregue'] }[v.status];
    var b = '', sec = '';
    if (prox) b += '<button type="button" class="lj-btn pri" data-acao="status" data-id="' + esc(v.id) + '" data-status="' + prox[0] + '">' + esc(prox[1]) + '</button>';
    if (v.status === 'separado') b += '<button type="button" class="lj-btn" data-acao="status" data-id="' + esc(v.id) + '" data-status="entregue">Retirou na loja</button>';
    if (c.whats && v.status !== 'cancelado' && (v.acompanhar || v.canal !== 'balcao')) b += botaoWa(c.whats, msgStatus(v), 'Avisar a cliente', S.destacar === v.id ? ' data-destaque="1"' : '');
    if (v.status !== 'cancelado' && v.canal !== 'balcao') sec += '<button type="button" class="lj-btn" data-acao="etiqueta-envio" data-id="' + esc(v.id) + '">' + icone('impressora') + 'Etiqueta de envio</button>';
    if (v.acompanhar) sec += '<button type="button" class="lj-btn" data-acao="copiar-acomp" data-id="' + esc(v.id) + '">' + icone('link') + 'Copiar link</button>';
    sec += '<button type="button" class="lj-btn" data-acao="ver-recibo" data-id="' + esc(v.id) + '">Recibo</button>';
    if (v.status !== 'cancelado') sec += '<button type="button" class="lj-btn perigo" data-acao="cancelar" data-id="' + esc(v.id) + '">Cancelar</button>';
    return '<li class="lj-card lj-pedido' + (S.destacar === v.id ? ' destaque' : '') + '" id="ped-' + esc(v.id) + '"><div class="lj-ped-topo"><div><b class="lj-ped-n">#' + esc(v.numero) + '</b><span>' + esc(quando(v.criadaEm)) + ' · ' + esc(N.canal[v.canal]) + '</span></div>' + chipStatus(v.status) + '</div>' +
      '<div class="lj-ped-corpo"><div><b>' + esc(c.nome || 'Cliente sem nome') + '</b>' + (c.whats ? '<span>' + esc(fone(c.whats)) + '</span>' : '') + '</div>' +
      '<p>' + esc(resumoItens(v)) + '</p>' + (v.endereco ? '<p class="lj-end">' + icone('caminhao') + esc(v.endereco) + '</p>' : '') +
      '<p class="lj-ped-valor"><b>' + esc(brl(v.total)) + '</b> · ' + esc(N.forma[v.forma]) + (v.desconto ? ' · desconto de ' + esc(brl(v.desconto)) : '') + '</p></div>' +
      (b ? '<div class="lj-botoes">' + b + '</div>' : '') + '<div class="lj-botoes sec">' + sec + '</div></li>';
  }
  function mudarStatus(id, status, botao) {
    var v = venda(id); if (!v) return;
    var p = status === 'cancelado' ? G.cancelarVenda(S.conta, S.loja, v) : G.mudarStatusPedido(S.conta, S.loja, v, status);
    ocupar(botao, 'Salvando…', p).then(function (m) {
      aplicar(m); S.destacar = id;
      var nova = venda(id);
      desenhar();
      if (status !== 'cancelado' && nova && nova.cliente && nova.cliente.whats) {
        abrir('Pedido #' + nova.numero + ' ' + (N.status[status] || status).toLowerCase(),
          '<p>Quer avisar a ' + esc(primeiroNome(nova.cliente.nome) || 'cliente') + '? A mensagem já vai com o link para ela acompanhar o pedido.</p><p class="lj-msg">' + esc(msgStatus(nova)) + '</p>',
          '<button type="button" class="lj-btn" data-acao="fechar">Agora não</button>' + botaoWa(nova.cliente.whats, msgStatus(nova), 'Avisar a cliente', ' data-acao="fechar-depois" autofocus'));
      } else aviso('Pedido #' + v.numero + ': ' + (N.status[status] || status).toLowerCase() + (status === 'cancelado' ? '. Estoque devolvido e estorno no caixa.' : ''));
    }).catch(falhou);
  }

  /* etiqueta de envio (A4 ou 10x15 cm) */
  function etiquetaEnvio(id) {
    var v = venda(id); if (!v) return;
    var fmt = pref('envioFormato') || 'e10x15';
    abrir('Etiqueta de envio · #' + v.numero,
      '<form data-form="envio" data-id="' + esc(v.id) + '" novalidate><label class="lj-campo">Endereço de entrega<textarea name="endereco" rows="3" maxlength="400" placeholder="Rua, número, bairro, cidade, CEP">' + esc(v.endereco) + '</textarea></label>' +
      '<fieldset class="lj-fs"><legend>Tamanho do papel</legend><div class="lj-seg" role="radiogroup">' +
      '<label class="lj-radio"><input type="radio" name="formato" value="e10x15"' + (fmt === 'e10x15' ? ' checked' : '') + '><span>10 × 15 cm (etiqueta)</span></label>' +
      '<label class="lj-radio"><input type="radio" name="formato" value="a4"' + (fmt === 'a4' ? ' checked' : '') + '><span>Folha A4</span></label></div></fieldset></form>',
      '<button type="button" class="lj-btn" data-acao="fechar">Voltar</button><button type="button" class="lj-btn pri" data-acao="imprimir-envio">' + icone('impressora') + 'Imprimir etiqueta</button>');
  }
  function envioHTML(v, fmt) {
    var l = S.loja, c = v.cliente || {}, m = P.marcaDaLoja(l);
    return '<div class="envio ' + fmt + '"><div class="envio-para"><small>Destinatária</small><b class="nome">' + esc(c.nome || 'Cliente') + '</b><p class="end">' + esc(v.endereco || 'Retirada na loja') + '</p>' +
      (c.whats ? '<p>WhatsApp ' + esc(fone(c.whats)) + '</p>' : '') + '</div>' +
      '<div class="envio-ped"><b>Pedido #' + esc(v.numero) + '</b><span>' + esc(diaBR(v.data)) + '</span><ul>' + v.itens.map(function (i) { return '<li>' + i.qtd + '× ' + esc(i.nome) + ' (' + esc(i.tam === 'U' ? 'único' : i.tam) + ')</li>'; }).join('') + '</ul>' +
      window.Code128.svg('PED-' + v.numero, { classe: 'envio-barras' }) + '</div>' +
      '<div class="envio-de"><small>Remetente</small><b>' + esc(l.nome) + '</b><span>' + esc([l.cidade, m.WHATS ? 'WhatsApp ' + fone(m.WHATS) : '', l.instagram ? '@' + l.instagram : ''].filter(Boolean).join(' · ')) + '</span></div></div>';
  }
  function imprimir(html, pagina) {
    $('#lj-impressao').innerHTML = html;
    $('#lj-pagina').textContent = '@page{' + pagina + '}';
    fechar();
    setTimeout(function () { window.print(); }, 60);
  }

  /* ---------- ESTOQUE ---------- */
  function situacaoPeca(i) {
    var e = i.estoque || {}, z = [], b = [];
    Object.keys(e).forEach(function (t) { if (e[t] === 0) z.push(t); else if (e[t] === 1) b.push(t); });
    return { zerados: z, baixos: b, controla: Object.keys(e).length > 0 };
  }
  TELAS.estoque = function () {
    var vistas = [['pecas', 'Peças'], ['etiquetas', 'Etiquetas'], ['movimentos', 'Movimentos']];
    var h = cab('Estoque', 'Quantas peças tem de cada tamanho. Tamanho zerado some da vitrine e dos canais de venda.', '<a class="lj-btn" href="#canais">' + icone('canais') + 'Canais de venda</a><button type="button" class="lj-btn pri" data-acao="entrada">' + icone('entrada') + 'Entrada de mercadoria</button>') +
      '<div class="lj-seg lj-vistas" role="group" aria-label="O que ver">' + vistas.map(function (v) { return '<button type="button" class="lj-seg-b" data-acao="est-vista" data-v="' + v[0] + '" aria-pressed="' + (S.estVista === v[0]) + '">' + v[1] + '</button>'; }).join('') + '</div>';
    if (!S.itens.length) return h + '<section class="lj-card">' + vazio('A loja ainda não tem peças', 'Suba as fotos das peças no montador. Depois o estoque e as etiquetas aparecem aqui.', '<a class="lj-btn pri" href="../montar/">Subir fotos das peças</a>') + '</section>';
    if (S.estVista === 'etiquetas') return h + telaEtiquetas();
    if (S.estVista === 'movimentos') return h + telaMovimentos();
    var cont = { todas: S.itens.length, baixo: 0, zerado: 0, sem: 0, vip: 0 }, agora = new Date();
    S.itens.forEach(function (i) { var s = situacaoPeca(i); if (s.baixos.length) cont.baixo++; if (s.zerados.length) cont.zerado++; if (!s.controla) cont.sem++; if (i.vipAte && new Date(i.vipAte) > agora) cont.vip++; });
    var filtros = [['todas', 'Todas'], ['zerado', 'Zerado'], ['baixo', 'Só 1 peça'], ['sem', 'Sem controle'], ['vip', 'VIP']];
    var q = semAcento(S.estBusca).trim();
    var ls = S.itens.filter(function (i) {
      var s = situacaoPeca(i);
      if (S.estFiltro === 'zerado' && !s.zerados.length) return false;
      if (S.estFiltro === 'baixo' && !s.baixos.length) return false;
      if (S.estFiltro === 'sem' && s.controla) return false;
      if (S.estFiltro === 'vip' && !(i.vipAte && new Date(i.vipAte) > agora)) return false;
      return !q || semAcento([i.nome, i.cor, G.sku(i)].join(' ')).indexOf(q) >= 0;
    });
    return h + '<div class="lj-filtros" role="group" aria-label="Filtrar peças">' + filtros.map(function (f) {
      return '<button type="button" class="lj-filtro' + (f[0] === 'zerado' && cont.zerado ? ' alerta' : '') + '" data-acao="est-filtro" data-f="' + f[0] + '" aria-pressed="' + (S.estFiltro === f[0]) + '">' + f[1] + '<span>' + cont[f[0]] + '</span></button>';
    }).join('') + '</div>' +
      '<label class="lj-busca">' + icone('busca') + '<span class="lj-sr">Buscar peça</span><input id="lj-est-busca" type="search" data-campo="est-busca" value="' + esc(S.estBusca) + '" placeholder="Buscar por nome, cor ou código" autocomplete="off"></label>' +
      '<p class="lj-nota">Campo vazio = não controla aquele tamanho (a peça vende sem limite).</p>' +
      (ls.length ? '<ul class="lj-pecas">' + ls.map(linhaPeca).join('') + '</ul>' : '<section class="lj-card">' + vazio('Nenhuma peça neste filtro', 'Troque o filtro ou a busca.', '<button type="button" class="lj-btn" data-acao="est-filtro" data-f="todas">Ver todas</button>') + '</section>');
  };
  function linhaPeca(i) {
    var s = situacaoPeca(i), e = S.grade[i.id] || null, vip = i.vipAte && new Date(i.vipAte) > new Date();
    var tams = (i.tamanhos && i.tamanhos.length ? i.tamanhos : []).map(function (t) {
      var val = e ? e[t] : (i.estoque && (t in i.estoque) ? i.estoque[t] : '');
      var cls = val === '' ? '' : Number(val) === 0 ? ' zero' : Number(val) === 1 ? ' baixo' : '';
      return '<label class="lj-tam' + cls + '"><span>' + (t === 'U' ? 'Único' : t) + '</span><input type="number" inputmode="numeric" min="0" max="9999" step="1" data-grade="' + esc(i.id) + '" data-tam="' + t + '" value="' + esc(val) + '" placeholder="–" aria-label="Estoque de ' + esc(G.nomeComCor(i)) + ', tamanho ' + (t === 'U' ? 'único' : t) + '"></label>';
    }).join('');
    var chips = (s.zerados.length ? '<span class="lj-chip cr">' + icone('alerta') + 'Zerado: ' + esc(s.zerados.join(', ')) + '</span>' : '') +
      (s.baixos.length ? '<span class="lj-chip at">Só 1: ' + esc(s.baixos.join(', ')) + '</span>' : '') +
      (!s.controla ? '<span class="lj-chip">Sem controle</span>' : '') +
      (vip ? '<span class="lj-chip vip">' + icone('estrela') + 'VIP até ' + esc(quando(i.vipAte)) + '</span>' : '');
    return '<li class="lj-card lj-peca" data-id="' + esc(i.id) + '">' + miniatura(i, 64) +
      '<div class="lj-peca-info"><b>' + esc(G.nomeComCor(i)) + '</b><span>' + esc(brl(i.preco)) + ' · código ' + esc(G.sku(i)) + '</span><div class="lj-chips">' + chips + '</div></div>' +
      '<div class="lj-grade" role="group" aria-label="Estoque por tamanho">' + tams + '</div>' +
      '<div class="lj-botoes"><button type="button" class="lj-btn pri" data-acao="salvar-grade" data-id="' + esc(i.id) + '"' + (e ? '' : ' hidden') + '>Salvar estoque</button>' +
      '<button type="button" class="lj-btn" data-acao="entrada" data-id="' + esc(i.id) + '">' + icone('entrada') + 'Entrada</button>' +
      '<button type="button" class="lj-btn" data-acao="vip" data-id="' + esc(i.id) + '">' + icone('estrela') + (vip ? 'Editar VIP' : 'Lançar VIP') + '</button></div></li>';
  }
  function entrada(id) {
    var i = id ? peca(id) : null;
    var opcoes = S.itens.map(function (x) { return '<option value="' + esc(x.id) + '"' + (i && x.id === i.id ? ' selected' : '') + '>' + esc(G.nomeComCor(x)) + '</option>'; }).join('');
    var corpo = function (it) {
      return '<label class="lj-campo">Peça<select name="peca" data-campo="entrada-peca">' + (it ? '' : '<option value="">Escolha a peça</option>') + opcoes + '</select></label>' +
        (it ? '<p class="lj-nota">Quantas peças chegaram de cada tamanho? Soma ao estoque atual.</p><div class="lj-grade grande">' + (it.tamanhos || []).map(function (t) {
          var a = it.estoque && (t in it.estoque) ? it.estoque[t] : null;
          return '<label class="lj-tam"><span>' + (t === 'U' ? 'Único' : t) + '</span><input type="number" inputmode="numeric" min="0" max="9999" name="q-' + t + '" placeholder="0" aria-label="Chegaram no tamanho ' + (t === 'U' ? 'único' : t) + '"><small>tem ' + (a === null ? '–' : a) + '</small></label>';
        }).join('') + '</div>' : '');
    };
    abrir('Entrada de mercadoria', '<form data-form="entrada" id="lj-f-entrada" novalidate>' + corpo(i) + '</form>',
      '<button type="button" class="lj-btn" data-acao="fechar">Voltar</button><button type="submit" form="lj-f-entrada" class="lj-btn pri">Somar ao estoque</button>');
    entrada.corpo = corpo;
  }
  function vipPeca(id) {
    var i = peca(id); if (!i) return;
    var padrao = i.vipAte || (U.somarDias(U.dia(), 3) + 'T10:00');
    abrir('Lançamento VIP', '<form data-form="vip" id="lj-f-vip" data-id="' + esc(i.id) + '" novalidate><p><b>' + esc(G.nomeComCor(i)) + '</b></p>' +
      '<p class="lj-nota">Até a data e hora abaixo, a peça só aparece para quem abre a loja pelo link VIP. Depois abre para todo mundo.</p>' +
      '<label class="lj-campo">Só para a lista VIP até<input type="datetime-local" name="vipAte" value="' + esc(padrao) + '" min="' + esc(U.dia() + 'T00:00') + '" required></label>' +
      (S.loja.vipCodigo ? '' : '<p class="lj-nota">Você ainda não tem link VIP. Gere em Clientes para mandar à lista.</p>') + '</form>',
      (i.vipAte ? '<button type="button" class="lj-btn perigo" data-acao="tirar-vip" data-id="' + esc(i.id) + '">Abrir para todo mundo</button>' : '<button type="button" class="lj-btn" data-acao="fechar">Voltar</button>') +
      '<button type="submit" form="lj-f-vip" class="lj-btn pri">Salvar lançamento</button>');
  }

  /* etiquetas para imprimir */
  function qtdPadrao(i, t) { return i.estoque && (t in i.estoque) ? i.estoque[t] : 1; }
  function selEtq(i) { return S.etq.sel[i.id]; }
  function totalEtq() {
    var n = 0;
    Object.keys(S.etq.sel).forEach(function (id) { var s = S.etq.sel[id]; Object.keys(s).forEach(function (t) { n += Math.max(0, Number(s[t]) || 0); }); });
    return n;
  }
  function telaEtiquetas() {
    var n = totalEtq(), folhas = S.etq.formato === 'a4' ? Math.ceil(n / 24) : n;
    var linhas = S.itens.map(function (i) {
      var s = selEtq(i), on = !!s;
      return '<li class="lj-etq-linha' + (on ? ' on' : '') + '"><label class="lj-check"><input type="checkbox" data-acao="etq-peca" data-id="' + esc(i.id) + '"' + (on ? ' checked' : '') + '><span>' + miniatura(i, 40) + '<b>' + esc(G.nomeComCor(i)) + '</b><small>' + esc(brl(i.preco)) + '</small></span></label>' +
        '<div class="lj-grade">' + (i.tamanhos || []).map(function (t) {
          return '<label class="lj-tam"><span>' + (t === 'U' ? 'Único' : t) + '</span><input type="number" inputmode="numeric" min="0" max="999" data-etq="' + esc(i.id) + '" data-tam="' + t + '" value="' + (on ? esc(s[t] || 0) : '') + '" placeholder="' + qtdPadrao(i, t) + '"' + (on ? '' : ' disabled') + ' aria-label="Etiquetas de ' + esc(G.nomeComCor(i)) + ', tamanho ' + (t === 'U' ? 'único' : t) + '"></label>';
        }).join('') + '</div></li>';
    }).join('');
    return '<div class="lj-etq">' +
      '<section class="lj-card"><div class="lj-card-topo"><div><h2>Etiquetas com código de barras</h2><p class="lj-sub">Marque as peças. A quantidade já vem pelo estoque.</p></div>' +
      '<div class="lj-botoes"><button type="button" class="lj-btn" data-acao="etq-todas">Marcar todas</button><button type="button" class="lj-btn" data-acao="etq-limpar"' + (n ? '' : ' disabled') + '>Desmarcar</button></div></div>' +
      '<fieldset class="lj-fs"><legend>Papel</legend><div class="lj-seg" role="group" aria-label="Papel">' +
      '<button type="button" class="lj-seg-b" data-acao="etq-formato" data-f="a4" aria-pressed="' + (S.etq.formato === 'a4') + '">A4 · 3 × 8 (70 × 37 mm)</button>' +
      '<button type="button" class="lj-seg-b" data-acao="etq-formato" data-f="termica" aria-pressed="' + (S.etq.formato === 'termica') + '">Térmica 50 × 30 mm</button></div></fieldset>' +
      '<ul class="lj-etq-lista">' + linhas + '</ul></section>' +
      '<section class="lj-card lj-etq-lado"><div class="lj-card-topo"><h2>Prévia</h2><span class="lj-chip" id="lj-etq-conta">' + plural(n, 'etiqueta', 'etiquetas') + (n && S.etq.formato === 'a4' ? ' · ' + plural(folhas, 'folha', 'folhas') : '') + '</span></div>' +
      '<div class="lj-previa-etq" id="lj-previa-etq"></div>' +
      '<button type="button" class="lj-btn pri largo grande" data-acao="imprimir-etq"' + (n ? '' : ' disabled') + '>' + icone('impressora') + 'Imprimir etiquetas</button>' +
      '<p class="lj-nota">Na janela de impressão, escolha escala 100% (tamanho real) e sem margens.</p></section></div>';
  }
  function etiquetaHTML(i, t) {
    var cod = G.codigo(i, t), m = P.marcaDaLoja(S.loja);
    return '<div class="etq"><div class="etq-marca">' + esc(S.loja.nome.length <= 24 ? S.loja.nome : m.MARCA) + '</div><div class="etq-peca">' + esc(i.nome) + '</div>' +
      '<div class="etq-linha"><span>' + esc((i.cor ? i.cor + ' · ' : '') + (t === 'U' ? 'Tam. único' : 'Tam. ' + t)) + '</span><b>' + esc(brl(i.preco)) + '</b></div>' +
      window.Code128.svg(cod, { classe: 'etq-barras' }) + '<div class="etq-cod">' + esc(cod) + '</div></div>';
  }
  function folhasEtq(limite) {
    var todas = [];
    S.itens.forEach(function (i) { var s = selEtq(i); if (!s) return; (i.tamanhos || []).forEach(function (t) { for (var k = 0; k < Math.min(999, Number(s[t]) || 0); k++) todas.push(etiquetaHTML(i, t)); }); });
    if (limite) todas = todas.slice(0, limite);
    if (S.etq.formato === 'termica') return todas.map(function (e) { return '<div class="etq-folha termica">' + e + '</div>'; }).join('');
    var out = '';
    for (var k = 0; k < todas.length; k += 24) out += '<div class="etq-folha a4">' + todas.slice(k, k + 24).join('') + '</div>';
    return out;
  }
  function previaEtq() {
    var box = $('#lj-previa-etq'); if (!box) return;
    var n = totalEtq();
    if (!n) { box.innerHTML = '<p class="lj-res-nada">Marque as peças ao lado para ver as etiquetas aqui.</p>'; return; }
    var a4 = S.etq.formato === 'a4';
    box.innerHTML = '<div class="lj-escala ' + (a4 ? 'a4' : 'termica') + '">' + folhasEtq(a4 ? 24 : 4) + '</div>' + (a4 && n > 24 ? '<p class="lj-nota">Mostrando a primeira folha de ' + Math.ceil(n / 24) + '.</p>' : !a4 && n > 4 ? '<p class="lj-nota">Mostrando 4 de ' + n + '.</p>' : '');
    escalarPrevia();
  }
  function escalarPrevia() {
    var box = $('#lj-previa-etq'), esc2 = box && $('.lj-escala', box);
    if (!esc2) return;
    esc2.style.transform = 'none'; esc2.style.height = '';
    var w = esc2.scrollWidth, h = esc2.scrollHeight, s = Math.min(1, (box.clientWidth - 2) / w);
    esc2.style.transform = 'scale(' + s + ')'; box.style.height = Math.ceil(h * s) + 'px';
  }
  function atualizarContaEtq() {
    var n = totalEtq(), c = $('#lj-etq-conta'), b = $('[data-acao="imprimir-etq"]'), l = $('[data-acao="etq-limpar"]');
    var folhas = S.etq.formato === 'a4' ? Math.ceil(n / 24) : n;
    if (c) c.textContent = plural(n, 'etiqueta', 'etiquetas') + (n && S.etq.formato === 'a4' ? ' · ' + plural(folhas, 'folha', 'folhas') : '');
    if (b) b.disabled = !n; if (l) l.disabled = !n;
    clearTimeout(atualizarContaEtq.t); atualizarContaEtq.t = setTimeout(previaEtq, 200);
  }
  function telaMovimentos() {
    var ms = S.d.movimentos.slice(0, 120);
    if (!ms.length) return '<section class="lj-card">' + vazio('Nenhum movimento ainda', 'Vendas, entradas de mercadoria e ajustes de estoque ficam registrados aqui.', '<button type="button" class="lj-btn pri" data-acao="entrada">Lançar entrada de mercadoria</button>') + '</section>';
    return '<section class="lj-card"><div class="lj-card-topo"><h2>Movimentos de estoque</h2><span class="lj-sub">Últimos ' + ms.length + '</span></div><ul class="lj-linhas lj-movs">' + ms.map(function (m) {
      return '<li><div class="tx"><b>' + esc(m.peca) + ' · ' + esc(m.tam === 'U' ? 'único' : m.tam) + '</b><span>' + esc(quando(m.criadoEm)) + (m.vendaId && venda(m.vendaId) ? ' · pedido #' + esc(venda(m.vendaId).numero) : '') + '</span></div>' +
        '<span class="lj-chip mv-' + esc(m.motivo) + '">' + esc(N.motivo[m.motivo] || m.motivo) + '</span><b class="v ' + (m.qtd > 0 ? 'pos' : 'neg') + '">' + (m.qtd > 0 ? '+' : '−') + Math.abs(m.qtd) + '</b></li>';
    }).join('') + '</ul></section>';
  }
  DEPOIS.estoque = function () { if (S.estVista === 'etiquetas') previaEtq(); };

  /* ---------- CAIXA ---------- */
  TELAS.caixa = function () {
    var cx = G.calc.caixaMes(S.d.caixa, S.caixaMes), atual = U.dia().slice(0, 7);
    var h = cab('Caixa', 'Tudo o que entrou e saiu no mês, e as contas a pagar.', '') +
      '<div class="lj-mes"><button type="button" class="lj-btn-ic" data-acao="mes" data-d="-1" aria-label="Mês anterior">' + icone('voltar') + '</button><b aria-live="polite">' + esc(nomeMes(S.caixaMes)) + '</b>' +
      '<button type="button" class="lj-btn-ic" data-acao="mes" data-d="1" aria-label="Próximo mês"' + (S.caixaMes >= atual ? ' disabled' : '') + '>' + icone('avancar') + '</button></div>' +
      '<div class="lj-kpis tres">' + kpi('Entradas', brl(cx.entradas), plural(cx.lancamentos.filter(function (l) { return l.tipo === 'entrada'; }).length, 'lançamento', 'lançamentos'), 'ent') +
      kpi('Saídas', brl(cx.saidas), plural(cx.lancamentos.filter(function (l) { return l.tipo === 'saida'; }).length, 'lançamento', 'lançamentos'), 'sai') +
      kpi('Saldo', brl(cx.saldo), cx.saldo >= 0 ? 'Sobrou no mês' : 'Saiu mais do que entrou', cx.saldo < 0 ? 'neg' : '') + '</div>';
    var formas = cx.porForma.filter(function (f) { return f.entrada || f.saida; });
    h += '<div class="lj-grade2"><section class="lj-card"><div class="lj-card-topo"><h2>Por forma de pagamento</h2></div>' +
      (formas.length ? legenda([['Entradas', 'var(--ent)'], ['Saídas', 'var(--sai)']]) + barrasH(formas.map(function (f) { return { nome: NOME_FORMA[f.forma], partes: [f.entrada, f.saida], rotulo: brl(f.entrada - f.saida) }; }), [['Entradas', 'var(--ent)'], ['Saídas', 'var(--sai)']], brl)
        : vazio('Nada neste mês', 'As vendas registradas e os lançamentos aparecem aqui.', '')) + '</section>' +
      '<section class="lj-card"><div class="lj-card-topo"><h2>Lançar entrada ou saída</h2></div>' + formCaixa() + '</section></div>';
    h += '<div class="lj-grade2"><section class="lj-card" aria-labelledby="lj-t-lanc"><div class="lj-card-topo"><h2 id="lj-t-lanc">Lançamentos de ' + esc(MESES[+S.caixaMes.slice(5, 7) - 1]) + '</h2><span class="lj-sub">' + cx.lancamentos.length + '</span></div>' +
      (cx.lancamentos.length ? '<ul class="lj-linhas">' + cx.lancamentos.slice(0, 80).map(function (l) {
        return '<li><div class="tx"><b>' + esc(l.descricao) + '</b><span>' + esc(diaCurto(l.data)) + ' · ' + esc(nomeCategoria(l.categoria)) + ' · ' + esc(N.forma[l.forma] || l.forma) + '</span></div>' +
          '<b class="v ' + (l.tipo === 'entrada' ? 'pos' : 'neg') + '">' + (l.tipo === 'entrada' ? '+' : '−') + esc(brl(l.valor)) + '</b>' +
          (l.vendaId ? '<span class="lj-btn-ic vazio" aria-hidden="true"></span>' : '<button type="button" class="lj-btn-ic" data-acao="apagar-caixa" data-id="' + esc(l.id) + '" aria-label="Apagar lançamento ' + esc(l.descricao) + '">' + icone('lixo') + '</button>') + '</li>';
      }).join('') + '</ul>' + (cx.lancamentos.length > 80 ? '<p class="lj-nota">Mostrando 80 de ' + cx.lancamentos.length + '.</p>' : '') : vazio('Nenhum lançamento neste mês', 'Registre uma venda ou lance uma entrada ou saída ao lado.', '')) + '</section>' +
      '<section class="lj-card" aria-labelledby="lj-t-contas">' + telaContas() + '</section></div>';
    return h;
  };
  function formCaixa() {
    var cats = CATEGORIAS_CAIXA.map(function (c) { return '<option value="' + c[0] + '">' + esc(c[1]) + '</option>'; }).join('');
    var formas = G.FORMAS.map(function (f) { return '<option value="' + f + '">' + esc(NOME_FORMA[f]) + '</option>'; }).join('');
    return '<form data-form="caixa" class="lj-form" novalidate><fieldset class="lj-fs larga"><legend>Tipo</legend><div class="lj-seg" role="radiogroup">' +
      '<label class="lj-radio"><input type="radio" name="tipo" value="entrada" checked><span>Entrada</span></label><label class="lj-radio"><input type="radio" name="tipo" value="saida"><span>Saída</span></label></div></fieldset>' +
      '<label class="lj-campo">Valor em R$<input name="valor" type="text" inputmode="decimal" placeholder="0,00" required autocomplete="off"></label>' +
      '<label class="lj-campo">Data<input name="data" type="date" value="' + U.dia() + '" required></label>' +
      '<label class="lj-campo larga">Descrição<input name="descricao" maxlength="80" placeholder="Ex.: Compra de sacolas" autocomplete="off"></label>' +
      '<label class="lj-campo">Categoria<select name="categoria">' + cats + '</select></label>' +
      '<label class="lj-campo">Forma<select name="forma">' + formas + '</select></label>' +
      '<p class="lj-erro larga" role="alert"></p><button type="submit" class="lj-btn pri larga">Lançar</button></form>';
  }
  function telaContas() {
    var cs = S.d.contas.slice().sort(function (a, b) { return (a.paga - b.paga) || (a.paga ? String(b.vence).localeCompare(String(a.vence)) : String(a.vence).localeCompare(String(b.vence))); });
    var abertas = cs.filter(function (c) { return !c.paga; }), total = abertas.reduce(function (s, c) { return s + c.valor; }, 0);
    var lin = cs.slice(0, 30).map(function (c) {
      var s = G.calc.situacaoConta(c), chip = c.paga ? '<span class="lj-chip ok">' + icone('check') + 'Paga ' + esc(diaCurto(c.pagaEm)) + '</span>'
        : s.sit === 'vencida' ? '<span class="lj-chip cr">' + icone('alerta') + 'Vencida</span>' : s.sit === 'hoje' ? '<span class="lj-chip at">Vence hoje</span>'
          : s.sit === 'breve' ? '<span class="lj-chip at">Em ' + plural(s.dias, 'dia', 'dias') + '</span>' : '<span class="lj-chip">Em ' + plural(s.dias, 'dia', 'dias') + '</span>';
      return '<li class="lj-conta' + (c.paga ? ' paga' : '') + '"><span class="lj-data"><b>' + esc(c.vence.slice(8, 10)) + '</b>' + esc(MESES[+c.vence.slice(5, 7) - 1].slice(0, 3)) + '</span>' +
        '<div class="tx"><b>' + esc(c.descricao) + '</b><span>' + esc(brl(c.valor)) + (c.recorrente === 'mensal' ? ' · todo mês' : '') + '</span>' + chip + '</div>' +
        '<div class="lj-botoes">' + (c.paga ? '' : '<button type="button" class="lj-btn pri" data-acao="pagar-conta" data-id="' + esc(c.id) + '">Marcar paga</button>') +
        '<button type="button" class="lj-btn-ic" data-acao="apagar-conta" data-id="' + esc(c.id) + '" aria-label="Apagar conta ' + esc(c.descricao) + '">' + icone('lixo') + '</button></div></li>';
    }).join('');
    return '<div class="lj-card-topo"><div><h2 id="lj-t-contas">Contas a pagar</h2><p class="lj-sub">' + (abertas.length ? plural(abertas.length, 'em aberto', 'em aberto') + ' · ' + esc(brl(total)) : 'Nada em aberto') + '</p></div></div>' +
      '<details class="lj-nova"' + (cs.length ? '' : ' open') + '><summary class="lj-btn">' + icone('mais') + 'Nova conta</summary><form data-form="conta" class="lj-form" novalidate>' +
      '<label class="lj-campo larga">Descrição<input name="descricao" maxlength="80" placeholder="Ex.: Aluguel da loja" required autocomplete="off"></label>' +
      '<label class="lj-campo">Valor em R$<input name="valor" type="text" inputmode="decimal" placeholder="0,00" required autocomplete="off"></label>' +
      '<label class="lj-campo">Vence em<input name="vence" type="date" value="' + U.dia() + '" required></label>' +
      '<label class="lj-check larga"><input type="checkbox" name="mensal"><span>Repete todo mês (ao pagar, já cria a do mês seguinte)</span></label>' +
      '<p class="lj-erro larga" role="alert"></p><button type="submit" class="lj-btn pri larga">Salvar conta</button></form></details>' +
      (cs.length ? '<ul class="lj-contas">' + lin + '</ul>' : vazio('Nenhuma conta cadastrada', 'Cadastre aluguel, fornecedor e boletos para o painel avisar antes de vencer.', ''));
  }
  function pagarConta(id) {
    var c = S.d.contas.filter(function (x) { return x.id === id; })[0]; if (!c) return;
    abrir('Marcar como paga', '<form data-form="pagar" id="lj-f-pagar" data-id="' + esc(c.id) + '" novalidate><p><b>' + esc(c.descricao) + '</b> · ' + esc(brl(c.valor)) + '</p>' +
      '<p class="lj-nota">Vira uma saída no caixa de hoje.' + (c.recorrente === 'mensal' ? ' A conta do mês seguinte (' + esc(diaBR(U.mesSeguinte(c.vence))) + ') já fica criada.' : '') + '</p>' +
      '<fieldset class="lj-fs"><legend>Pagou com</legend><div class="lj-seg" role="radiogroup">' + G.FORMAS.map(function (f, k) { return '<label class="lj-radio"><input type="radio" name="forma" value="' + f + '"' + (k ? '' : ' checked') + '><span>' + esc(N.forma[f]) + '</span></label>'; }).join('') + '</div></fieldset></form>',
      '<button type="button" class="lj-btn" data-acao="fechar">Voltar</button><button type="submit" form="lj-f-pagar" class="lj-btn pri">Confirmar pagamento</button>');
  }

  /* ---------- gráficos (SVG e barras feitos à mão) ---------- */
  function legenda(series) { return '<div class="lj-legenda">' + series.map(function (s) { return '<span><i style="background:' + s[1] + '"></i>' + esc(s[0]) + '</span>'; }).join('') + '</div>'; }
  function atrDica(html) { return ' data-dica="' + esc(html) + '"'; }
  /** Barras horizontais empilhadas: [{ nome, partes: [...], rotulo }]. */
  function barrasH(itens, series, fmt) {
    var max = Math.max.apply(null, itens.map(function (it) { return it.partes.reduce(function (a, b) { return a + b; }, 0); }).concat([0])) || 1;
    return '<div class="lj-hbars">' + itens.map(function (it) {
      var dica = '<b>' + esc(it.nome) + '</b><br>' + series.map(function (s, k) { return esc(s[0]) + ': ' + esc(fmt(it.partes[k] || 0)); }).join('<br>');
      return '<div class="lj-hbar" tabindex="0"' + atrDica(dica) + '><span class="nm">' + esc(it.nome) + '</span><span class="trilho">' +
        it.partes.map(function (v, k) { return v > 0 ? '<i style="width:' + (v / max * 100).toFixed(2) + '%;background:' + ((it.cores && it.cores[k]) || series[k][1]) + '"></i>' : ''; }).join('') +
        '</span><span class="v">' + esc(it.rotulo) + '</span></div>';
    }).join('') + '</div>';
  }
  function passoLimpo(max) {
    if (max <= 0) return 1;
    var bruto = max / 4, mag = Math.pow(10, Math.floor(Math.log10(bruto))), n = bruto / mag;
    return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * mag;
  }
  function compacto(v) { return v >= 1000 ? (v / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 }) + ' mil' : num(Math.round(v)); }
  /** Colunas: [{ rotulo, v, dica }]. Largura do desenho = largura do cartão (o texto fica do tamanho certo no celular). */
  function colunas(dados, cor, titulo, largura) {
    var W = Math.max(300, Math.min(720, largura || 600)), H = 220, esq = 46, dir = 8, topo = 22, base = 26;
    var max = Math.max.apply(null, dados.map(function (d) { return d.v; }).concat([0]));
    var passo = passoLimpo(max), teto = Math.ceil(max / passo) * passo || passo, h = H - topo - base, larg = (W - esq - dir) / dados.length, bw = Math.min(42, larg * 0.56);
    var y = function (v) { return topo + h - (v / teto) * h; };
    var s = '<svg viewBox="0 0 ' + W + ' ' + H + '" width="' + W + '" height="' + H + '" role="img" aria-label="' + esc(titulo) + '">';
    for (var t = 0; t <= teto + 1e-9; t += passo) {
      s += '<line x1="' + esq + '" x2="' + (W - dir) + '" y1="' + y(t).toFixed(1) + '" y2="' + y(t).toFixed(1) + '" stroke="var(--grade)"/>';
      s += '<text x="' + (esq - 8) + '" y="' + (y(t) + 4).toFixed(1) + '" text-anchor="end">' + esc(compacto(t)) + '</text>';
    }
    dados.forEach(function (d, i) {
      var cx = esq + larg * i + larg / 2, x = cx - bw / 2, yy = y(d.v), alt = Math.max(0, y(0) - yy), r = Math.min(5, alt);
      if (d.v > 0) s += '<path d="M' + x.toFixed(1) + ' ' + (yy + alt).toFixed(1) + 'V' + (yy + r).toFixed(1) + 'Q' + x.toFixed(1) + ' ' + yy.toFixed(1) + ' ' + (x + r).toFixed(1) + ' ' + yy.toFixed(1) + 'H' + (x + bw - r).toFixed(1) + 'Q' + (x + bw).toFixed(1) + ' ' + yy.toFixed(1) + ' ' + (x + bw).toFixed(1) + ' ' + (yy + r).toFixed(1) + 'V' + (yy + alt).toFixed(1) + 'Z" fill="' + cor + '"' + (i === dados.length - 1 ? '' : ' opacity=".78"') + '/>';
      s += '<text x="' + cx.toFixed(1) + '" y="' + (H - 8) + '" text-anchor="middle">' + esc(d.rotulo) + '</text>';
      if (d.v > 0 && W / dados.length > 54) s += '<text class="val" x="' + cx.toFixed(1) + '" y="' + (yy - 7).toFixed(1) + '" text-anchor="middle">' + esc(compacto(d.v)) + '</text>';
      s += '<rect x="' + (cx - larg / 2).toFixed(1) + '" y="' + topo + '" width="' + larg.toFixed(1) + '" height="' + h + '" fill="transparent"' + atrDica(d.dica) + '/>';
    });
    return '<div class="lj-graf">' + s + '</svg></div>';
  }
  function tabela(cab, linhas) {
    return '<details class="lj-tabela-graf"><summary>Ver em tabela</summary><table class="lj-tabela"><thead><tr>' + cab.map(function (c, i) { return '<th' + (i ? ' class="n"' : '') + '>' + esc(c) + '</th>'; }).join('') + '</tr></thead><tbody>' +
      linhas.map(function (l) { return '<tr>' + l.map(function (c, i) { return '<td' + (i ? ' class="n"' : '') + '>' + esc(c) + '</td>'; }).join('') + '</tr>'; }).join('') + '</tbody></table></details>';
  }
  function larguraCartao() { var m = $('#lj-main'); var w = m ? m.clientWidth : 600; return window.innerWidth >= 1100 ? (w - 64) / 2 - 44 : w - 40 - 32; }

  /* ---------- RELATÓRIOS ---------- */
  TELAS.relatorios = function () {
    var r = G.calc.relatorio(S.d.vendas, S.itens, S.relDias), ms = G.calc.meses(S.d.vendas, 6);
    var h = cab('Relatórios', 'De ' + diaBR(r.inicio) + ' a ' + diaBR(r.fim) + '. Vendas canceladas ficam de fora.', '<div class="lj-seg" role="group" aria-label="Período">' + [30, 90].map(function (d) {
      return '<button type="button" class="lj-seg-b" data-acao="rel-dias" data-d="' + d + '" aria-pressed="' + (S.relDias === d) + '">' + d + ' dias</button>';
    }).join('') + '</div>');
    if (!validas().length) return h + '<section class="lj-card">' + vazio('Ainda sem vendas para mostrar', 'Os números aparecem assim que você registrar as primeiras vendas.', '<a class="lj-btn pri" href="#vender">Registrar uma venda</a>') + '</section>';
    h += '<div class="lj-kpis">' + kpi('Faturamento', brl(r.faturamento), 'nos últimos ' + r.dias + ' dias') + kpi('Pedidos', num(r.pedidos), plural(r.pecas, 'peça vendida', 'peças vendidas')) +
      kpi('Ticket médio', brl(r.ticket), 'por pedido') + kpi('Paradas', num(r.paradas.length), 'peças com estoque e sem venda há 60 dias', r.paradas.length ? 'at' : '') + '</div>';
    var W = larguraCartao();
    h += '<div class="lj-grade2"><section class="lj-card"><div class="lj-card-topo"><div><h2>Faturamento por mês</h2><p class="lj-sub">Últimos 6 meses</p></div></div>' + legenda([['Faturamento', 'var(--s1)']]) +
      colunas(ms.map(function (m) { return { rotulo: mesCurto(m.mes), v: m.total, dica: '<b>' + esc(nomeMes(m.mes)) + '</b><br>Faturamento: ' + esc(brl(m.total)) + '<br>' + esc(plural(m.pedidos, 'pedido', 'pedidos')) }; }), 'var(--s1)', 'Faturamento por mês', W) +
      tabela(['Mês', 'Faturamento', 'Pedidos'], ms.map(function (m) { return [nomeMes(m.mes), brl(m.total), num(m.pedidos)]; })) + '</section>' +
      '<section class="lj-card"><div class="lj-card-topo"><div><h2>Mais vendidas</h2><p class="lj-sub">Peças vendidas em ' + r.dias + ' dias</p></div></div>' +
      (r.maisVendidas.length ? legenda([['Peças vendidas', 'var(--s2)']]) + barrasH(r.maisVendidas.map(function (x) { return { nome: x.nome, partes: [x.qtd], rotulo: plural(x.qtd, 'peça', 'peças') }; }), [['Peças vendidas', 'var(--s2)']], function (v) { return plural(v, 'peça', 'peças'); }) +
        tabela(['Peça', 'Peças', 'Valor'], r.maisVendidas.map(function (x) { return [x.nome, num(x.qtd), brl(x.valor)]; })) : vazio('Nada vendido no período', 'Troque para 90 dias para ver mais.', '')) + '</section></div>';
    var series = G.FORMAS.map(function (f) { return [N.forma[f], CORES_FORMA[f]]; });
    h += '<div class="lj-grade2"><section class="lj-card"><div class="lj-card-topo"><div><h2>Vendas por canal</h2><p class="lj-sub">Em reais, separado pela forma de pagamento</p></div></div>' +
      (r.porCanal.length ? legenda(series) + barrasH(r.porCanal.map(function (c) { return { nome: N.canal[c.canal], partes: c.formas, rotulo: brl0(c.formas.reduce(function (a, b) { return a + b; }, 0)) }; }), series, brl) : vazio('Sem vendas no período', '', '')) + '</section>' +
      '<section class="lj-card"><div class="lj-card-topo"><div><h2>Por forma de pagamento</h2><p class="lj-sub">Quanto entrou em cada forma</p></div></div>' +
      barrasH(r.porForma.filter(function (f) { return f.valor > 0; }).map(function (f) { return { nome: NOME_FORMA[f.forma], partes: [f.valor], cores: [CORES_FORMA[f.forma]], rotulo: brl0(f.valor) + ' · ' + Math.round(f.valor / (r.faturamento || 1) * 100) + '%' }; }), [['Faturamento', 'var(--s1)']], brl) + '</section></div>';
    h += '<section class="lj-card"><div class="lj-card-topo"><div><h2>Peças paradas</h2><p class="lj-sub">Com estoque e sem venda há 60 dias ou mais. Bom momento para promoção ou lista VIP.</p></div></div>' +
      (r.paradas.length ? '<ul class="lj-linhas">' + r.paradas.slice(0, 20).map(function (p) {
        return '<li>' + miniatura(p.item, 40) + '<div class="tx"><b>' + esc(G.nomeComCor(p.item)) + '</b><span>' + (p.dias == null ? 'Nenhuma venda registrada' : 'Última venda há ' + esc(plural(p.dias, 'dia', 'dias'))) + '</span></div><b class="v">' + esc(plural(p.estoque, 'peça', 'peças')) + '</b></li>';
      }).join('') + '</ul>' : vazio('Nenhuma peça parada', 'Tudo o que tem estoque vendeu nos últimos 60 dias.', '')) + '</section>';
    return h;
  };

  /* ---------- CLIENTES ---------- */
  TELAS.clientes = function () {
    var cs = G.calc.compradoras(S.d.vendas), q = semAcento(S.cliBusca).trim();
    var ls = cs.filter(function (c) { return !q || semAcento(c.nome + ' ' + c.whats).indexOf(q) >= 0; });
    var vip = S.d.vip, link = G.links.vip(S.loja);
    var h = cab('Clientes', 'Quem compra, quem está na lista VIP e quem espera reposição.', '');
    var compr = '<section class="lj-card" aria-labelledby="lj-t-comp"><div class="lj-card-topo"><div><h2 id="lj-t-comp">Compradoras</h2><p class="lj-sub">' + plural(cs.length, 'cliente', 'clientes') + ' com nome nas vendas</p></div></div>' +
      (cs.length ? '<label class="lj-busca">' + icone('busca') + '<span class="lj-sr">Buscar cliente</span><input id="lj-cli-busca" type="search" data-campo="cli-busca" value="' + esc(S.cliBusca) + '" placeholder="Buscar por nome ou WhatsApp" autocomplete="off"></label>' +
        '<ul class="lj-linhas lj-clientes">' + ls.slice(0, 60).map(function (c) {
          return '<li><span class="lj-ini peq" aria-hidden="true">' + esc(semAcento(c.nome || '?').slice(0, 1).toUpperCase()) + '</span><div class="tx"><b>' + esc(c.nome || fone(c.whats)) + '</b><span>' + esc(plural(c.pedidos, 'pedido', 'pedidos')) + ' · ' + esc(brl(c.total)) + ' · última ' + esc(diaBR(c.ultima)) + (c.diasSemComprar >= 60 ? ' · <em>sumida</em>' : '') + '</span></div>' +
            (c.whats ? '<a class="lj-btn-ic wa" href="' + esc(G.wa(c.whats, 'Oi, ' + primeiroNome(c.nome) + '! Aqui é da ' + S.loja.nome + '.')) + '" target="_blank" rel="noopener" aria-label="WhatsApp de ' + esc(c.nome) + '">' + icone('whats') + '</a>' : '') + '</li>';
        }).join('') + '</ul>' + (ls.length > 60 ? '<p class="lj-nota">Mostrando 60 de ' + ls.length + '. Use a busca.</p>' : '') + (!ls.length ? '<p class="lj-res-nada">Ninguém com essa busca.</p>' : '')
        : vazio('Ainda sem compradoras', 'Ao registrar uma venda com o nome da cliente, ela aparece aqui.', '<a class="lj-btn pri" href="#vender">Registrar uma venda</a>')) + '</section>';
    var vipH = '<section class="lj-card" aria-labelledby="lj-t-vip"><div class="lj-card-topo"><div><h2 id="lj-t-vip">Lista VIP</h2><p class="lj-sub">' + plural(vip.length, 'contato', 'contatos') + ' · recebem os lançamentos antes</p></div></div>' +
      (link ? '<label class="lj-campo">Link VIP<span class="lj-link-vip"><input id="lj-link-vip" value="' + esc(link) + '" readonly><button type="button" class="lj-btn" data-acao="copiar-link-vip">' + icone('copiar') + 'Copiar</button></span></label>' +
        '<div class="lj-botoes"><button type="button" class="lj-btn" data-acao="copiar-vip-nums"' + (vip.length ? '' : ' disabled') + '>' + icone('copiar') + 'Copiar números</button><button type="button" class="lj-btn" data-acao="gerar-vip">Gerar novo link VIP</button></div>'
        : '<p class="lj-nota">Com o link VIP, quem está na lista vê as peças de lançamento antes de abrir para todo mundo.</p><button type="button" class="lj-btn pri" data-acao="gerar-vip">Gerar link VIP</button>') +
      (vip.length ? '<ul class="lj-linhas">' + vip.slice(0, 50).map(function (c) {
        return '<li><div class="tx"><b>' + esc(c.nome) + '</b><span>' + esc(fone(c.whats)) + ' · entrou em ' + esc(diaBR(String(c.criadoEm).slice(0, 10))) + '</span></div><a class="lj-btn-ic wa" href="' + esc(G.wa(c.whats, link ? 'Oi, ' + primeiroNome(c.nome) + '! Seu acesso VIP da ' + S.loja.nome + ': ' + link : '')) + '" target="_blank" rel="noopener" aria-label="WhatsApp de ' + esc(c.nome) + '">' + icone('whats') + '</a></li>';
      }).join('') + '</ul>' : vazio('Ninguém na lista ainda', 'As clientes entram pelo botão “Lista VIP” da vitrine.', '')) + '</section>';
    var avs = S.d.avisos.slice().sort(function (a, b) { return (a.avisado - b.avisado) || String(b.criadoEm).localeCompare(String(a.criadoEm)); });
    var avH = '<section class="lj-card" aria-labelledby="lj-t-av"><div class="lj-card-topo"><div><h2 id="lj-t-av">Avisos de reposição</h2><p class="lj-sub">Pedidos de “avise-me quando chegar” da vitrine</p></div></div>' +
      (avs.length ? '<ul class="lj-linhas">' + avs.slice(0, 50).map(function (a) {
        var i = peca(a.itemId), tem = i && i.estoque && Number(i.estoque[a.tam]) > 0;
        var chip = a.avisado ? '<span class="lj-chip ok">' + icone('check') + 'Avisada</span>' : tem ? '<span class="lj-chip info">Voltou</span>' : '<span class="lj-chip">Aguardando</span>';
        return '<li><div class="tx"><b>' + esc(a.nome) + '</b><span>' + esc(a.peca) + ' · ' + esc(a.tam === 'U' ? 'único' : a.tam) + ' · ' + esc(diaBR(String(a.criadoEm).slice(0, 10))) + '</span></div>' + chip +
          (!a.avisado && tem ? '<a class="lj-btn-ic wa" href="' + esc(G.wa(a.whats, msgAviso(a))) + '" target="_blank" rel="noopener" data-acao="avisar" data-id="' + esc(a.id) + '" aria-label="Avisar ' + esc(a.nome) + ' no WhatsApp">' + icone('whats') + '</a>' : '<span class="lj-btn-ic vazio" aria-hidden="true"></span>') + '</li>';
      }).join('') + '</ul>' : vazio('Nenhum pedido de aviso', 'Quando um tamanho zerar, a cliente pode pedir aviso na página da peça.', '')) + '</section>';
    return h + '<div class="lj-grade2">' + compr + '<div class="lj-coluna">' + vipH + avH + '</div></div>';
  };

  /* ---------- canais de venda: Meta, Google, Shopee e Shein ---------- */
  var CN = window.Canais;
  var TIPOS = { meta: 'text/csv', google: 'text/tab-separated-values', bling: 'text/csv', planilha: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' };
  var CANAIS_VENDA = [
    { id: 'meta', titulo: 'Instagram, WhatsApp e anúncios', onde: 'Catálogo da Meta', link: 'meta', rotLink: 'Link para colar na Meta', baixar: ['meta'],
      custo: 'O catálogo não tem custo. Anúncios de catálogo são pagos à parte, no Gerenciador de Anúncios.',
      passos: [
        'Entre em <b>business.facebook.com/commerce</b> com a conta que administra o Instagram e o WhatsApp da loja.',
        'Crie um catálogo do tipo <b>E-commerce</b> (produtos vendidos on-line).',
        'Em <b>Catálogo › Fontes de dados › Adicionar itens</b>, escolha <b>Feed de dados</b>, depois <b>Programado</b>, e cole o link acima. Repetição: diária. Moeda: real.',
        'Espere a primeira leitura e confira a aba <b>Problemas</b>. Peça recusada aparece lá com o motivo.',
        'WhatsApp Business: <b>Ferramentas comerciais › Catálogo</b> e ligue ao catálogo que você criou.',
        'Instagram: <b>Configurações › Empresa › Compras no Instagram</b>. A Meta analisa a conta antes de liberar as marcações nos posts e pode pedir domínio próprio verificado.'
      ] },
    { id: 'google', titulo: 'Google Shopping', onde: 'Google Merchant Center', link: 'google', rotLink: 'Link para colar no Merchant Center', baixar: ['google'],
      custo: 'Aparecer nas listagens gratuitas do Google não tem custo. Anúncios do Shopping são pagos à parte, no Google Ads.',
      passos: [
        'Entre em <b>merchants.google.com</b> com a conta Google da loja e cadastre a empresa.',
        'Informe o site da loja. Com domínio próprio fica mais simples: o Google pede que o site seja de quem vende.',
        'Cadastre o frete e a política de troca. Sem isso o Google não mostra os produtos.',
        'Em <b>Produtos › Adicionar produtos › Adicionar de um arquivo</b>, escolha <b>Buscar o arquivo de um URL</b>, cole o link acima e marque busca diária.',
        'Ligue as <b>listagens gratuitas</b>. Os anúncios do Shopping são opcionais.'
      ] },
    { id: 'shopee', titulo: 'Shopee', onde: 'pelo Bling ou pelo UpSeller', baixar: ['bling', 'planilha'],
      custo: 'A Shopee cobra comissão e taxa por item vendido. Confira a tabela atual no Seller Centre antes de definir o preço.',
      passos: [
        'Abra a loja no <b>Seller Centre da Shopee</b>.',
        'Bling: <b>Configurações › Importação de dados › Importar e atualizar produtos</b>, operação <b>Cadastrar novos</b>, escolha a planilha do Bling, ligue <b>Atualizar estoque</b> se quiser levar o estoque, clique em <b>Validar</b> e depois em <b>Importar</b>.',
        'Ainda no Bling, ligue a integração com a Shopee e publique os anúncios escolhendo a categoria da Shopee.',
        'Sem Bling? No <b>UpSeller</b> (gratuito): <b>Armazém › Importar & Exportar › Migração de Produtos</b>, envie a planilha .xlsx e ligue cada coluna ao campo dele.'
      ] },
    { id: 'shein', titulo: 'Shein', onde: 'pelo Bling ou pelo UpSeller', baixar: ['bling', 'planilha'],
      custo: 'A Shein cobra comissão por venda e pede CNPJ. Vendedor novo costuma ter um período sem comissão: confira no portal.',
      passos: [
        'Faça o cadastro de vendedor na <b>Shein Brasil</b>. A Shein analisa a loja antes de liberar.',
        'O Bling é parceiro oficial da Shein: importe a planilha do Bling (mesmo passo da Shopee) e ligue a integração com a Shein.',
        'No UpSeller o caminho é o mesmo: importe a planilha .xlsx e publique na Shein.',
        'TikTok Shop, AliExpress e Magalu entram pelos mesmos hubs, com a mesma planilha.'
      ] }
  ];
  var NOME_ARQ = { meta: 'Planilha da Meta (.csv)', google: 'Arquivo do Google (.tsv)', bling: 'Planilha do Bling (.csv)', planilha: 'Planilha para hubs (.xlsx)' };
  function opcoesCanais() {
    var c = (P.cfg && P.cfg.canais) || {};
    return { site: c.site, canaisBase: c.base, cfg: S.canais.cfg || {} };
  }
  function carregarCanais() {
    var c = S.canais;
    if (c.carregando) return;
    c.carregando = true; c.erro = '';
    Promise.all([
      G.lerCanais(S.conta, S.loja).catch(function (e) { c.erro = G.erroAmigavel(e); return null; }),
      lerStatusCanais()
    ]).then(function (r) {
      c.cfg = r[0]; c.status = r[1]; c.carregado = true; c.carregando = false;
      if (S.aba === 'canais') desenhar();
    });
  }
  // status.json: o workflow grava a cada publicação (hora, quantas peças e fotos foram)
  function lerStatusCanais() {
    if (G.modo === 'demo' || !S.loja.slug || !window.fetch) return Promise.resolve(null);
    return fetch(CN.enderecos(S.loja.slug, opcoesCanais()).status + '?t=' + Date.now(), { cache: 'no-store' })
      .then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; });
  }
  function haQuanto(iso) {
    var d = new Date(iso), min = Math.round((Date.now() - d) / 60000);
    if (isNaN(d)) return '—';
    if (min < 2) return 'agora há pouco';
    if (min < 60) return 'há ' + min + ' min';
    if (min < 48 * 60) return 'há ' + Math.round(min / 60) + ' h';
    return 'em ' + quando(iso);
  }
  function baixarArquivo(nome, conteudo, tipo) {
    var blob = new Blob([conteudo], { type: tipo + (typeof conteudo === 'string' ? ';charset=utf-8' : '') });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = nome; a.rel = 'noopener';
    document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
  }
  function seloCanal(ativo, st) {
    if (G.modo === 'demo') return '<span class="lj-chip">Demonstração</span>';
    if (!ativo) return '<span class="lj-chip">Desligado</span>';
    if (st && st.atualizadoEm) return '<span class="lj-chip ok">' + icone('check') + 'Link no ar</span>';
    return '<span class="lj-chip at">Aguardando a 1ª publicação</span>';
  }
  function cardCanal(k, ativo, end, st) {
    var link = k.link ? '<label class="lj-campo">' + esc(k.rotLink) +
        '<span class="lj-link-vip"><input id="lj-link-' + k.id + '" value="' + esc(end[k.link]) + '" readonly' + (ativo ? '' : ' disabled') + '>' +
        '<button type="button" class="lj-btn" data-acao="copiar-canal" data-k="' + k.link + '"' + (ativo ? '' : ' disabled') + '>' + icone('copiar') + 'Copiar</button></span></label>' : '';
    var baixar = '<div class="lj-botoes">' + k.baixar.map(function (a) {
      return '<button type="button" class="lj-btn" data-acao="baixar-canal" data-k="' + a + '">' + icone('baixar') + esc(NOME_ARQ[a]) + '</button>';
    }).join('') + '</div>';
    return '<section class="lj-card lj-canal" aria-labelledby="lj-t-' + k.id + '"><div class="lj-card-topo"><div><h2 id="lj-t-' + k.id + '">' + esc(k.titulo) + '</h2><p class="lj-sub">' + esc(k.onde) + '</p></div>' +
      (k.link ? seloCanal(ativo, st) : '') + '</div>' + link + baixar +
      '<details class="lj-passos"><summary>Como ligar, passo a passo</summary><ol>' + k.passos.map(function (p) { return '<li>' + p + '</li>'; }).join('') + '</ol></details>' +
      '<p class="lj-nota">' + esc(k.custo) + '</p></section>';
  }
  function opcoes(lista, atual) { return lista.map(function (x) { return '<option value="' + x[0] + '"' + (x[0] === atual ? ' selected' : '') + '>' + esc(x[1]) + '</option>'; }).join(''); }
  function formCanais(cfg, ativo) {
    var marca = cfg.marca || P.marcaDaLoja(S.loja).NOME;
    var num = function (nome, rot, v, min, max, dica) {
      return '<label class="lj-campo">' + rot + '<input name="' + nome + '" type="number" inputmode="numeric" min="' + min + '" max="' + max + '" step="1" value="' + esc(v) + '" required>' + (dica ? '<small>' + dica + '</small>' : '') + '</label>';
    };
    return '<form class="lj-card" data-form="canais" aria-labelledby="lj-t-cfg" novalidate><div class="lj-card-topo"><div><h2 id="lj-t-cfg">Dados que os canais pedem</h2>' +
      '<p class="lj-sub">Valem para todas as peças. A Shopee e a Shein usam o peso e a embalagem para calcular o frete.</p></div></div>' +
      '<div class="lj-form">' +
      '<label class="lj-campo larga">Marca que aparece nos anúncios<input name="marca" maxlength="80" value="' + esc(marca) + '" required></label>' +
      '<label class="lj-campo">Público<select name="genero">' + opcoes(CN.GENEROS, cfg.genero) + '</select></label>' +
      '<label class="lj-campo">Faixa de idade<select name="idade">' + opcoes(CN.IDADES, cfg.idade) + '</select></label>' +
      '<label class="lj-campo">Categoria das roupas<select name="catRoupas">' + opcoes(CN.CATEGORIAS, cfg.catRoupas) + '</select></label>' +
      '<label class="lj-campo">Categoria dos acessórios<select name="catAcess">' + opcoes(CN.CATEGORIAS, cfg.catAcess) + '</select></label>' +
      num('pesoG', 'Peso de uma peça embalada (g)', cfg.pesoG, 10, 30000, 'Uma legging embalada pesa perto de 250 g.') +
      '<label class="lj-campo">NCM (para nota fiscal)<input name="ncm" inputmode="numeric" maxlength="10" value="' + esc(cfg.ncm ? cfg.ncm.slice(0, 4) + '.' + cfg.ncm.slice(4, 6) + '.' + cfg.ncm.slice(6) : '') + '" placeholder="0000.00.00"><small>Opcional. Seu contador confirma o código.</small></label>' +
      '<fieldset class="lj-fs larga"><legend>Embalagem (cm)</legend><div class="lj-form3">' +
      num('comprimentoCm', 'Comprimento', cfg.comprimentoCm, 1, 200) + num('larguraCm', 'Largura', cfg.larguraCm, 1, 200) + num('alturaCm', 'Altura', cfg.alturaCm, 1, 200) +
      '</div></fieldset></div>' +
      '<p class="lj-erro" role="alert"></p>' +
      '<div class="lj-botoes lj-cfg-botoes"><button type="submit" class="lj-btn pri">' + (ativo ? 'Salvar dados' : 'Ligar os canais de venda') + '</button>' +
      (ativo ? '<button type="button" class="lj-btn perigo" data-acao="canais-desligar">Desligar os canais</button>' : '') + '</div></form>';
  }
  function conferenciaCanais(conf) {
    var bl = conf.bloqueadas, dc = conf.dicas;
    var lista = function (arr, tom) {
      return '<ul class="lj-linhas">' + arr.slice(0, 40).map(function (x) {
        var i = peca(x.id);
        return '<li>' + miniatura(i, 44) + '<div class="tx"><b>' + esc(x.nome) + '</b><span>' + esc(x.motivos.join('; ')) + '</span></div>' + (tom ? '<span class="lj-chip ' + tom + '">Fora</span>' : '') + '</li>';
      }).join('') + '</ul>' + (arr.length > 40 ? '<p class="lj-nota">Mostrando 40 de ' + arr.length + '.</p>' : '');
    };
    return '<section class="lj-card" aria-labelledby="lj-t-conf"><div class="lj-card-topo"><div><h2 id="lj-t-conf">Conferência das peças</h2>' +
      '<p class="lj-sub">' + (bl.length ? plural(bl.length, 'peça ficou', 'peças ficaram') + ' de fora até ser corrigida' : 'Toda peça com foto e preço entra nos canais') + '</p></div>' +
      (bl.length ? '<a class="lj-btn" href="../montar/">' + icone('lapis') + 'Corrigir no montador</a>' : '') + '</div>' +
      (bl.length ? lista(bl, 'cr') : '') +
      (dc.length ? '<details class="lj-passos"><summary>' + plural(dc.length, 'dica', 'dicas') + ' para vender mais</summary>' + lista(dc, '') + '</details>' : '') +
      (conf.vip ? '<p class="lj-nota">' + plural(conf.vip, 'lançamento VIP entra', 'lançamentos VIP entram') + ' nos canais quando abrir para todo mundo.</p>' : '') +
      '</section>';
  }
  TELAS.canais = function () {
    var c = S.canais;
    var h = cab('Canais de venda', 'Suas peças no Instagram, no WhatsApp, no Google, na Shopee e na Shein, com o mesmo código da etiqueta.', '');
    if (!c.carregado) { carregarCanais(); return h + '<section class="lj-card"><p class="lj-carregando" role="status"><span class="lj-giro" aria-hidden="true"></span>Lendo os canais da loja…</p></section>'; }
    var o = opcoesCanais(), cfg = CN.limparCfg(c.cfg || {}), ativo = !!(c.cfg && c.cfg.ativo), st = c.status;
    var conf = CN.conferir(S.loja, S.itens, o), end = CN.enderecos(S.loja.slug, o);
    var topo = '';
    if (c.erro) topo = '<div class="lj-alerta" role="alert">' + icone('alerta') + '<div><b>Não deu para ler a configuração dos canais</b><span>' + esc(c.erro) + '</span></div><button type="button" class="lj-btn" data-acao="canais-reler">Tentar de novo</button></div>';
    else if (G.modo === 'demo') topo = '<div class="lj-banner"><div><b>Demonstração</b><span>Os arquivos baixam com as peças daqui, mas nada é publicado. Na loja de verdade os links ficam no ar sozinhos.</span></div></div>';
    else if (!ativo) topo = '<div class="lj-banner"><div><b>Canais desligados</b><span>Ao ligar, a cada 3 horas o Provador publica os arquivos e as fotos das suas peças num endereço público, e a Meta, o Google e os hubs leem dali sozinhos.</span></div></div>';
    var publicado = G.modo === 'demo' ? 'Só na loja real' : st && st.atualizadoEm ? haQuanto(st.atualizadoEm) : (ativo ? 'Aguardando' : 'Desligado');
    var kpis = '<div class="lj-kpis">' +
      kpi('Peças nos canais', num(conf.prontas), 'de ' + plural(conf.pecas - conf.vip, 'peça', 'peças') + ' da loja') +
      kpi('Variações', num(conf.variacoes), 'cor e tamanho, cada uma com o código da etiqueta') +
      kpi('Ficaram de fora', num(conf.bloqueadas.length), conf.bloqueadas.length ? 'veja a conferência abaixo' : 'nenhuma pendência', conf.bloqueadas.length ? 'at' : '') +
      kpi('Última publicação', esc(publicado), st && st.variacoes != null ? plural(st.variacoes, 'variação publicada', 'variações publicadas') : 'a cada 3 horas, quando ligado') + '</div>';
    var canais = '<div class="lj-canais">' + CANAIS_VENDA.map(function (k) { return cardCanal(k, ativo, end, st); }).join('') + '</div>';
    var vendeu = '<section class="lj-card lj-canal-nota"><h2>Vendeu pela Shopee ou pela Shein?</h2><p>Lance em <a href="#vender">Vender</a> com o canal Shopee ou Shein. O estoque baixa aqui e a vitrine, a Meta e o Google atualizam na próxima publicação. ' +
      'Para levar o estoque daqui para o Bling, importe a planilha do Bling de novo com a operação <b>Atualizar</b>.</p></section>';
    return h + topo + kpis + '<div class="lj-grade2">' + '<div class="lj-coluna">' + formCanais(cfg, ativo) + conferenciaCanais(conf) + '</div>' + '<div class="lj-coluna">' + canais + vendeu + '</div></div>';
  };

  /* ---------- telas sem casca ---------- */
  function telaSemConta() {
    document.body.classList.add('sem-casca');
    $('#lj-main').innerHTML = '<div class="lj-entrada"><div class="lj-card"><span class="lj-ini grande" aria-hidden="true">' + icone('vender') + '</span><h1>Entrar na minha loja</h1>' +
      '<p>Vendas, pedidos, estoque e caixa da sua loja num lugar só. Use o mesmo acesso com que você publicou a loja.</p>' +
      '<a class="lj-btn pri largo grande" href="../montar/?entrar=1&amp;volta=loja">Entrar na minha loja</a>' +
      '<p class="lj-nota">Ainda não tem loja? <a href="../montar/">Monte a sua em minutos</a>, com 15 dias grátis.</p></div></div>';
  }
  function telaSemLoja() {
    document.body.classList.add('sem-casca');
    $('#lj-main').innerHTML = '<div class="lj-entrada"><div class="lj-card"><h1>Este acesso ainda não tem loja</h1>' +
      '<p>Você entrou como ' + esc(S.conta.email || 'você') + '. Monte a loja (nome, vitrine e fotos) e publique: o painel abre em seguida.</p>' +
      '<a class="lj-btn pri largo grande" href="../montar/">Montar minha loja</a>' +
      '<button type="button" class="lj-btn largo" data-acao="sair">Entrar com outro acesso</button></div></div>';
  }
  function telaErro(e) {
    document.body.classList.add('sem-casca');
    $('#lj-main').innerHTML = '<div class="lj-entrada"><div class="lj-card" role="alert"><h1>Não deu para abrir a loja</h1><p>' + esc(G.erroAmigavel(e)) + '</p>' +
      '<button type="button" class="lj-btn pri largo grande" data-acao="recarregar">Tentar de novo</button></div></div>';
  }

  /* ---------- eventos ---------- */
  function rotaHash() { return (location.hash || '#hoje').slice(1); }
  window.addEventListener('hashchange', function () { if (S.loja) irPara(rotaHash()); });
  var acoes = {
    fechar: fechar,
    'fechar-depois': function () { setTimeout(fechar, 50); return true; },
    recarregar: function () { location.reload(); },
    sair: function () { P.sairLojista().then(function () { location.href = '../montar/?entrar=1&volta=loja'; }).catch(falhou); },
    exemplos: function (b) {
      ocupar(b, 'Preenchendo…', G.exemplos(S.conta, S.loja).then(function () { return Promise.all([P.minhaLoja(S.conta), G.carregar(S.conta)]); })).then(function (r) {
        S.itens = (r[0] && r[0].itens) || S.itens; S.d = r[1]; desenhar(); aviso('Exemplos prontos: vendas, caixa, contas e clientes.');
      }).catch(falhou);
    },
    'limpar-demo': function () {
      confirmar('Apagar dados da demonstração?', 'Some tudo de vendas, caixa, contas e clientes deste navegador. As peças continuam.', 'Apagar', true).then(function (ok) {
        if (!ok) return;
        G.limparDemo(S.conta).then(function () { return G.carregar(S.conta); }).then(function (d) { S.d = d; desenhar(); aviso('Dados apagados'); });
      });
    },
    status: function (b) { mudarStatus(b.dataset.id, b.dataset.status, b); },
    cancelar: function (b) {
      var v = venda(b.dataset.id); if (!v) return;
      confirmar('Cancelar o pedido #' + v.numero + '?', 'As peças voltam para o estoque e o valor de ' + brl(v.total) + ' sai do caixa como estorno.', 'Cancelar pedido', true).then(function (ok) { if (ok) mudarStatus(v.id, 'cancelado', null); });
    },
    avisar: function (b) {
      var a = S.d.avisos.filter(function (x) { return x.id === b.dataset.id; })[0]; if (!a) return;
      G.marcarAvisado(S.conta, a, true).then(function (m) { aplicar(m); setTimeout(desenhar, 300); }).catch(falhou);
      return true; // deixa o link abrir o WhatsApp
    },
    'pagar-conta': function (b) { pagarConta(b.dataset.id); },
    'apagar-conta': function (b) {
      var c = S.d.contas.filter(function (x) { return x.id === b.dataset.id; })[0]; if (!c) return;
      confirmar('Apagar a conta?', c.descricao + ' · ' + brl(c.valor) + '. O que já saiu do caixa continua lá.', 'Apagar', true).then(function (ok) {
        if (ok) G.apagarConta(S.conta, c.id).then(function () { S.d.contas = S.d.contas.filter(function (x) { return x.id !== c.id; }); desenhar(); aviso('Conta apagada'); }).catch(falhou);
      });
    },
    'apagar-caixa': function (b) {
      var l = S.d.caixa.filter(function (x) { return x.id === b.dataset.id; })[0]; if (!l) return;
      confirmar('Apagar o lançamento?', l.descricao + ' · ' + brl(l.valor), 'Apagar', true).then(function (ok) {
        if (ok) G.apagarCaixa(S.conta, l.id).then(function () { S.d.caixa = S.d.caixa.filter(function (x) { return x.id !== l.id; }); desenhar(); aviso('Lançamento apagado'); }).catch(falhou);
      });
    },
    'copiar-vip-msg': function () { var it = S.itens.filter(function (i) { return i.vipAte && new Date(i.vipAte) > new Date(); }); copiar(msgVip(it), 'Mensagem VIP copiada. Cole na lista de transmissão.'); },
    'copiar-vip-nums': function () { copiar(S.d.vip.map(function (c) { return '+55' + String(c.whats).replace(/^55(?=\d{10,11}$)/, ''); }).join('\n'), plural(S.d.vip.length, 'número copiado', 'números copiados')); },
    'copiar-link-vip': function () { copiar(G.links.vip(S.loja), 'Link VIP copiado'); },
    'gerar-vip': function (b) {
      var gerar = function () {
        ocupar(b, 'Gerando…', G.gerarLinkVip(S.conta, S.loja)).then(function (r) { S.loja.vipCodigo = r.codigo; desenhar(); copiar(r.link, 'Link VIP novo copiado'); }).catch(falhou);
      };
      if (!S.loja.vipCodigo) return gerar();
      confirmar('Gerar um link VIP novo?', 'O link antigo para de abrir as peças VIP. Mande o novo para a lista.', 'Gerar novo link').then(function (ok) { if (ok) gerar(); });
    },
    'ver-zerados': function () { S.estVista = 'pecas'; S.estFiltro = 'zerado'; location.hash = '#estoque'; },
    'ped-todos': function () { S.pedFiltro = 'todos'; return true; },
    camera: camera,
    add: function (b) { var i = peca(b.dataset.id); if (i) adicionar(i, b.dataset.tam); },
    qtd: function (b) {
      var l = S.carrinho[+b.dataset.i]; if (!l) return;
      l.qtd = Math.max(1, Math.min(999, l.qtd + Number(b.dataset.d)));
      var id = b.dataset.d === '1' ? 'mais' : 'menos', k = b.dataset.i;
      desenharCarrinho();
      var nb = $('[data-acao="qtd"][data-i="' + k + '"][data-d="' + (id === 'mais' ? '1' : '-1') + '"]'); if (nb) nb.focus();
    },
    remover: function (b) { S.carrinho.splice(+b.dataset.i, 1); desenharCarrinho(); focoCodigo(); },
    forma: function (b) { S.venda.forma = b.dataset.forma; desenharCarrinho(); var nb = $('[data-forma="' + b.dataset.forma + '"]'); if (nb) nb.focus(); },
    'canal-balcao': function () { S.venda.canal = 'balcao'; desenharCarrinho(); focoCodigo(); },
    registrar: registrar,
    'copiar-recibo': function (b) { var v = venda(b.dataset.id); if (v) copiar(textoRecibo(v), 'Recibo copiado'); },
    'ver-recibo': function (b) { var v = venda(b.dataset.id); if (v) recibo(v, false); },
    'pedido-whats': function () { S.venda.canal = 'whatsapp'; if (S.aba === 'vender') { desenharCarrinho(); focoCodigo(); } else location.hash = '#vender'; aviso('Lançando pedido do WhatsApp: adicione as peças.'); },
    'etiqueta-envio': function (b) { etiquetaEnvio(b.dataset.id); },
    'imprimir-envio': function () {
      var f = $('[data-form="envio"]'), v = f && venda(f.dataset.id); if (!v) return;
      var fmt = (f.querySelector('input[name="formato"]:checked') || {}).value || 'e10x15', end = f.endereco.value.trim();
      pref('envioFormato', fmt);
      var seguir = function () { imprimir(envioHTML(venda(v.id), fmt), fmt === 'a4' ? 'size:A4 portrait;margin:12mm' : 'size:100mm 150mm;margin:0'); };
      if (end !== (v.endereco || '')) G.salvarVenda(S.conta, v, { endereco: end }).then(function (m) { aplicar(m); seguir(); }).catch(falhou); else seguir();
    },
    'copiar-acomp': function (b) { var v = venda(b.dataset.id); if (v) copiar(G.links.acompanhar(S.loja, v.acompanhar), 'Link de acompanhamento copiado'); },
    'filtro-ped': function (b) { S.pedFiltro = b.dataset.f; S.pedLimite = 40; desenhar(); },
    'mais-pedidos': function () { S.pedLimite += 40; desenhar(); },
    'est-vista': function (b) { S.estVista = b.dataset.v; desenhar(); },
    'est-filtro': function (b) { S.estFiltro = b.dataset.f; S.estVista = 'pecas'; desenhar(); },
    'salvar-grade': function (b) {
      var i = peca(b.dataset.id), e = S.grade[b.dataset.id]; if (!i || !e) return;
      ocupar(b, 'Salvando…', G.salvarEstoque(S.conta, i, e)).then(function (m) { aplicar(m); delete S.grade[i.id]; desenhar(); aviso('Estoque de ' + G.nomeComCor(i) + ' salvo'); }).catch(falhou);
    },
    entrada: function (b) { entrada(b.dataset.id || ''); },
    vip: function (b) { vipPeca(b.dataset.id); },
    'tirar-vip': function (b) {
      var i = peca(b.dataset.id); if (!i) return;
      ocupar(b, 'Salvando…', G.marcarVip(S.conta, i, '')).then(function (m) { aplicar(m); fechar(); desenhar(); aviso(G.nomeComCor(i) + ' aberta para todo mundo'); }).catch(falhou);
    },
    'etq-formato': function (b) { S.etq.formato = b.dataset.f; pref('etqFormato', b.dataset.f); desenhar(); },
    'etq-todas': function () { S.itens.forEach(function (i) { var s = {}; (i.tamanhos || []).forEach(function (t) { s[t] = qtdPadrao(i, t); }); S.etq.sel[i.id] = s; }); desenhar(); },
    'etq-limpar': function () { S.etq.sel = {}; desenhar(); },
    'etq-peca': function (b) {
      var i = peca(b.dataset.id); if (!i) return true;
      if (b.checked) { var s = {}; (i.tamanhos || []).forEach(function (t) { s[t] = qtdPadrao(i, t); }); S.etq.sel[i.id] = s; } else delete S.etq.sel[i.id];
      var li = b.closest('.lj-etq-linha');
      li.classList.toggle('on', b.checked);
      $$('input[data-etq]', li).forEach(function (inp) { inp.disabled = !b.checked; inp.value = b.checked ? S.etq.sel[i.id][inp.dataset.tam] : ''; });
      atualizarContaEtq();
      return true;
    },
    'imprimir-etq': function () {
      if (!totalEtq()) return aviso('Marque pelo menos uma peça.');
      imprimir(folhasEtq(0), S.etq.formato === 'a4' ? 'size:A4 portrait;margin:0' : 'size:50mm 30mm;margin:0');
    },
    'copiar-canal': function (b) { copiar(CN.enderecos(S.loja.slug, opcoesCanais())[b.dataset.k], 'Link copiado. Cole no ' + (b.dataset.k === 'meta' ? 'Commerce Manager' : 'Merchant Center') + '.'); },
    'baixar-canal': function (b) {
      var k = b.dataset.k, a = CN.arquivos(S.loja, S.itens, opcoesCanais());
      if (!a.linhas.length) return aviso('Nenhuma peça com foto e preço para mandar ainda.');
      baixarArquivo((S.loja.slug || 'loja') + '-' + CN.ARQUIVOS[k], a[k], TIPOS[k]);
      aviso(NOME_ARQ[k].replace(/ \(.*\)$/, '') + ' baixada com ' + plural(a.linhas.length, 'variação', 'variações'));
    },
    'canais-reler': function () { S.canais.carregado = false; desenhar(); },
    'canais-desligar': function (b) {
      confirmar('Desligar os canais de venda?', 'Os links param de ser atualizados na próxima publicação. O que já está na Meta, no Google e nos hubs continua lá até você tirar.', 'Desligar', true).then(function (ok) {
        if (!ok) return;
        ocupar(b, 'Desligando…', G.salvarCanais(S.conta, S.loja, Object.assign({}, S.canais.cfg, { ativo: false }))).then(function (d) {
          S.canais.cfg = d; desenhar(); aviso('Canais desligados');
        }).catch(falhou);
      });
    },
    mes: function (b) { S.caixaMes = U.somarMes(S.caixaMes, Number(b.dataset.d)); desenhar(); },
    'rel-dias': function (b) { S.relDias = Number(b.dataset.d); desenhar(); }
  };
  document.addEventListener('click', function (e) {
    var b = e.target.closest('[data-acao]');
    if (!b || b.disabled) return;
    var f = acoes[b.dataset.acao];
    if (!f) return;
    var deixa = f(b, e);
    if (deixa !== true && b.tagName === 'A' && b.getAttribute('href') && b.getAttribute('href').charAt(0) === '#') return; // âncora interna segue normal
    if (deixa !== true && b.tagName !== 'A' && b.type !== 'checkbox') e.preventDefault();
  });
  dlg().addEventListener('close', function () { pararCamera(); dlg().innerHTML = ''; if (S.aba === 'vender') focoCodigo(); });
  dlg().addEventListener('click', function (e) { if (e.target === dlg()) fechar(); });

  document.addEventListener('input', function (e) {
    var t = e.target;
    if (t.id === 'lj-codigo') { clearTimeout(mostrarResultados.t); mostrarResultados.t = setTimeout(function () { var c = $('#lj-codigo'); if (c) mostrarResultados(c.value); }, 160); return; }
    if (t.dataset.venda) {
      var k = t.dataset.venda;
      if (k === 'cliente.nome') {
        S.venda.cliente.nome = t.value;
        var c = G.calc.compradoras(S.d.vendas).filter(function (x) { return x.nome && x.nome === t.value; })[0], w = $('#lj-cli-whats');
        if (c && c.whats && w && !w.value) { w.value = fone(c.whats); S.venda.cliente.whats = c.whats; }
      } else if (k === 'cliente.whats') S.venda.cliente.whats = t.value;
      else if (k !== 'canal') S.venda[k] = t.value;
      atualizarTotais(); return;
    }
    if (t.dataset.grade) {
      var id = t.dataset.grade, i = peca(id), g = S.grade[id];
      if (!g) { g = S.grade[id] = {}; (i.tamanhos || []).forEach(function (x) { g[x] = i.estoque && (x in i.estoque) ? i.estoque[x] : ''; }); }
      g[t.dataset.tam] = t.value === '' ? '' : Math.max(0, Math.min(9999, Math.round(Number(t.value) || 0)));
      var lab = t.closest('.lj-tam'); lab.classList.toggle('zero', t.value !== '' && Number(t.value) === 0); lab.classList.toggle('baixo', Number(t.value) === 1);
      var li = t.closest('.lj-peca'), b = $('[data-acao="salvar-grade"]', li); if (b) b.hidden = false;
      return;
    }
    if (t.dataset.etq) { var s = S.etq.sel[t.dataset.etq]; if (s) { s[t.dataset.tam] = Math.max(0, Math.min(999, Math.round(Number(t.value) || 0))); atualizarContaEtq(); } return; }
    var campo = t.dataset.campo;
    if (campo === 'cupom') { S.cupom = t.value.trim() || 'VOLTEI10'; pref('cupom', S.cupom); $$('[data-wa-sumida]').forEach(function (a) { var c = G.calc.compradoras(S.d.vendas).filter(function (x) { return x.whats === a.dataset.waSumida; })[0]; if (c) a.href = G.wa(c.whats, msgSumida(c)); }); return; }
    var busca = { 'ped-busca': 'pedBusca', 'est-busca': 'estBusca', 'cli-busca': 'cliBusca' }[campo];
    if (busca) { S[busca] = t.value; clearTimeout(desenhar.t); desenhar.t = setTimeout(desenhar, 180); }
  });
  document.addEventListener('change', function (e) {
    var t = e.target;
    if (t.dataset.venda === 'canal') { S.venda.canal = t.value; desenharCarrinho(); return; }
    if (t.dataset.campo === 'tam-linha') {
      var l = S.carrinho[+t.dataset.i]; if (!l) return;
      var outra = S.carrinho.filter(function (x, k) { return k !== +t.dataset.i && x.id === l.id && x.tam === t.value; })[0];
      if (outra) { outra.qtd += l.qtd; S.carrinho.splice(+t.dataset.i, 1); } else l.tam = t.value;
      desenharCarrinho(); return;
    }
    if (t.dataset.campo === 'entrada-peca') {
      var it = peca(t.value), f = t.closest('form');
      f.innerHTML = entrada.corpo(it); var sel = $('select', f); if (sel) { sel.value = it ? it.id : ''; sel.focus(); }
    }
  });
  document.addEventListener('submit', function (e) {
    var f = e.target, tipo = f.dataset.form;
    if (!tipo) return;
    e.preventDefault();
    var botao = f.querySelector('button[type="submit"]') || (f.id && $('button[form="' + f.id + '"]'));
    var erro = function (msg) { var p = $('.lj-erro', f); if (p) p.textContent = msg; else aviso(msg); };
    if (tipo === 'codigo') { processarCodigo(f.codigo.value); return; }
    if (tipo === 'canais') {
      var dados = {}, ligar = !(S.canais.cfg && S.canais.cfg.ativo);
      ['marca', 'genero', 'idade', 'catRoupas', 'catAcess', 'ncm'].forEach(function (k) { dados[k] = f[k].value; });
      ['pesoG', 'comprimentoCm', 'larguraCm', 'alturaCm'].forEach(function (k) { dados[k] = Math.round(Number(f[k].value)); });
      if (!dados.marca.trim()) { erro('Escreva a marca que aparece nos anúncios.'); f.marca.focus(); return; }
      var ruim = ['pesoG', 'comprimentoCm', 'larguraCm', 'alturaCm'].filter(function (k) { return !(dados[k] >= Number(f[k].min) && dados[k] <= Number(f[k].max)); })[0];
      if (ruim) { erro(ruim === 'pesoG' ? 'Peso entre 10 g e 30 kg.' : 'Medidas da embalagem entre 1 e 200 cm.'); f[ruim].focus(); return; }
      var ncm = String(dados.ncm).replace(/\D/g, '');
      if (ncm && ncm.length !== 8) { erro('O NCM tem 8 números. Ex.: 6104.63.00'); f.ncm.focus(); return; }
      dados.ncm = ncm; dados.ativo = true;
      ocupar(botao, ligar ? 'Ligando…' : 'Salvando…', G.salvarCanais(S.conta, S.loja, dados)).then(function (d) {
        S.canais.cfg = d; desenhar();
        aviso(ligar ? (G.modo === 'demo' ? 'Canais ligados na demonstração' : 'Canais ligados. Os links entram no ar na próxima publicação, em até 3 horas.') : 'Dados salvos');
      }).catch(function (x) { erro(G.erroAmigavel(x)); });
      return;
    }
    if (tipo === 'caixa') {
      var tp = (f.querySelector('input[name="tipo"]:checked') || {}).value;
      if (!(U.centavos(f.valor.value) > 0)) { erro('Digite o valor. Ex.: 120,50'); f.valor.focus(); return; }
      ocupar(botao, 'Lançando…', G.lancarCaixa(S.conta, { tipo: tp, valor: f.valor.value, data: f.data.value, descricao: f.descricao.value, categoria: f.categoria.value, forma: f.forma.value })).then(function (m) {
        aplicar(m); S.caixaMes = m.caixa[0].data.slice(0, 7); desenhar(); aviso((tp === 'saida' ? 'Saída' : 'Entrada') + ' de ' + brl(m.caixa[0].valor) + ' lançada');
      }).catch(function (x) { erro(G.erroAmigavel(x)); });
      return;
    }
    if (tipo === 'conta') {
      if (!f.descricao.value.trim()) { erro('Escreva o que é a conta. Ex.: Aluguel'); f.descricao.focus(); return; }
      if (!(U.centavos(f.valor.value) > 0)) { erro('Digite o valor da conta.'); f.valor.focus(); return; }
      ocupar(botao, 'Salvando…', G.salvarConta(S.conta, { descricao: f.descricao.value, valor: f.valor.value, vence: f.vence.value, recorrente: f.mensal.checked ? 'mensal' : 'nao' })).then(function (m) {
        aplicar(m); desenhar(); aviso('Conta salva. O painel avisa 3 dias antes de vencer.');
      }).catch(function (x) { erro(G.erroAmigavel(x)); });
      return;
    }
    if (tipo === 'pagar') {
      var c = S.d.contas.filter(function (x) { return x.id === f.dataset.id; })[0], forma = (f.querySelector('input[name="forma"]:checked') || {}).value;
      ocupar(botao, 'Salvando…', G.pagarConta(S.conta, c, forma)).then(function (m) {
        aplicar(m); fechar(); desenhar(); aviso('Paga e lançada no caixa' + (m.contas.length > 1 ? '. A do mês que vem já está criada.' : '.'));
      }).catch(falhou);
      return;
    }
    if (tipo === 'entrada') {
      var it = peca(f.peca.value);
      if (!it) { aviso('Escolha a peça.'); f.peca.focus(); return; }
      var q = {}; (it.tamanhos || []).forEach(function (t) { var inp = f['q-' + t]; if (inp) q[t] = inp.value; });
      ocupar(botao, 'Somando…', G.entradaEstoque(S.conta, it, q, 'entrada')).then(function (m) {
        aplicar(m); delete S.grade[it.id]; fechar(); desenhar();
        aviso('Entrada de ' + plural(m.movimentos.reduce(function (s, x) { return s + x.qtd; }, 0), 'peça', 'peças') + ' em ' + G.nomeComCor(it));
      }).catch(falhou);
      return;
    }
    if (tipo === 'vip') {
      var p = peca(f.dataset.id), ate = f.vipAte.value;
      if (!ate) { aviso('Escolha a data e a hora.'); return; }
      if (new Date(ate) <= new Date()) { aviso('Escolha uma data no futuro.'); f.vipAte.focus(); return; }
      ocupar(botao, 'Salvando…', G.marcarVip(S.conta, p, ate.slice(0, 16))).then(function (m) {
        aplicar(m); fechar(); desenhar(); aviso('Lançamento VIP até ' + quando(ate) + (S.loja.vipCodigo ? '' : '. Gere o link VIP em Clientes.'));
      }).catch(falhou);
    }
  });
  // leitor de código: se a vendedora tirou o foco do campo, o próximo caractere volta para ele
  document.addEventListener('keydown', function (e) {
    if (S.aba !== 'vender' || dlg().open || e.ctrlKey || e.metaKey || e.altKey || e.key.length !== 1 || e.key === ' ') return;
    var a = document.activeElement, campo = a && /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName);
    if (!campo) { var c = $('#lj-codigo'); if (c) c.focus({ preventScroll: true }); }
  });
  // dica dos gráficos: segue o mouse; no toque ou no teclado, aparece no foco
  (function () {
    var el = $('#lj-dica');
    var mostrar = function (alvo, x, y) {
      el.innerHTML = alvo.getAttribute('data-dica');
      el.classList.add('on');
      var px = Math.min(x + 14, window.innerWidth - el.offsetWidth - 10), py = y + 16 + el.offsetHeight > window.innerHeight ? y - el.offsetHeight - 12 : y + 16;
      el.style.left = Math.max(8, px) + 'px'; el.style.top = py + 'px';
    };
    document.addEventListener('mousemove', function (e) { var a = e.target.closest && e.target.closest('[data-dica]'); if (!a) { el.classList.remove('on'); return; } mostrar(a, e.clientX, e.clientY); });
    document.addEventListener('focusin', function (e) { var a = e.target.closest && e.target.closest('[data-dica]'); if (!a) { el.classList.remove('on'); return; } var r = a.getBoundingClientRect(); mostrar(a, r.left + 20, r.top + r.height / 2); });
    document.addEventListener('touchstart', function (e) { var a = e.target.closest && e.target.closest('[data-dica]'); if (!a) { el.classList.remove('on'); return; } var t = e.touches[0]; mostrar(a, t.clientX, t.clientY); }, { passive: true });
    document.addEventListener('scroll', function () { el.classList.remove('on'); }, { passive: true });
  })();
  var tRes;
  window.addEventListener('resize', function () {
    clearTimeout(tRes);
    tRes = setTimeout(function () { if (S.aba === 'relatorios') desenhar(); if (S.aba === 'estoque' && S.estVista === 'etiquetas') escalarPrevia(); }, 200);
  });
  window.addEventListener('afterprint', function () { $('#lj-impressao').innerHTML = ''; });

  /* ---------- início ---------- */
  function iniciar() {
    if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('../sw.js').catch(function () {});
    P.contaLojista().catch(function () { return null; }).then(function (c) {
      if (!c) return telaSemConta();
      S.conta = c;
      return P.minhaLoja(c).then(function (m) {
        if (!m) return telaSemLoja();
        S.loja = m.loja; S.itens = m.itens || [];
        return G.carregar(c).then(function (d) {
          S.d = d; montarCasca();
          S.aba = '';
          irPara(rotaHash());
        });
      });
    }).catch(telaErro);
  }
  iniciar();
})();
