/*
 * site.js — site de vendas do Provador.
 * Monta a arara de cabides, a galeria e o formulário a partir de vitrines/catalogo.json (as 15 cores)
 * e vitrines/_modelos/modelos.json (os modelos de site, ou pré-builds). Vitrine = prefixo do modelo + cor.
 * Lê os preços de Plataforma.precosPublicos() (o que você muda no painel aparece aqui).
 */
(function () {
  'use strict';
  var P = window.Plataforma, cfg = window.PROVADOR_CONFIG || {};
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var brl = function (n) {
    var v = Number(n) || 0, inteiro = Math.abs(v - Math.round(v)) < 0.005;
    return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: inteiro ? 0 : 2, maximumFractionDigits: 2 });
  };
  var pct = function (n) { return (Number(n) || 0).toLocaleString('pt-BR', { maximumFractionDigits: 2 }) + '%'; };
  var reduzMovimento = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  var VITRINES = [], MODELOS = [], modelo = { slug: 'classico', nome: 'Clássico', prefixo: '' }, atual = null, iframe = null;
  // cores que o modelo atual tem (o modelo 1 tem todas as do catálogo)
  function coresDoModelo() { return VITRINES.filter(function (v) { return !modelo.prefixo || (modelo.cores && modelo.cores[v.slug]); }); }
  function paleta(v) { var t = modelo.prefixo && modelo.cores ? modelo.cores[v.slug] : null; return t ? [t.bg, t.accent, t.accent2, t.bg] : (v.cores || []); }
  function nomeCor(v) { return modelo.prefixo ? modelo.nome + ' · ' + v.nome : v.nome; }
  var GANCHO = '<svg class="gancho" viewBox="0 0 44 30" aria-hidden="true"><path d="M18.6 6.2a3.6 3.6 0 1 1 5.2 3.2L22 10.6 4.5 26.5h35L22 10.6"/></svg>';

  /* ---------- provador ---------- */
  function usarIframe() {
    var conn = navigator.connection || {};
    if (modelo.prefixo) return !conn.saveData; // modelos novos não têm foto pronta: mostra ao vivo
    return window.innerWidth >= 760 && !conn.saveData;
  }
  function escalar() {
    if (!iframe) return;
    var vidro = $('#pv-vidro');
    iframe.style.transform = 'scale(' + (vidro.clientWidth / 1280) + ')';
  }
  function experimentar(cor, foco) {
    var v = coresDoModelo().filter(function (x) { return x.slug === cor; })[0];
    var slug = modelo.prefixo + cor;
    if (!v || (atual && atual.slug === slug)) return;
    atual = { slug: slug, cor: cor };
    Array.prototype.forEach.call(document.querySelectorAll('.pv-cabide'), function (b) { b.setAttribute('aria-pressed', String(b.dataset.slug === cor)); });
    $('#pv-nome').textContent = nomeCor(v);
    $('#pv-desc').textContent = modelo.prefixo ? modelo.descricao : v.descricao;
    $('#pv-endereco').textContent = 'sualoja.com.br';
    $('#pv-abrir').href = 'vitrine.html?v=' + encodeURIComponent(slug);
    $('#pv-quero').href = 'montar/?vitrine=' + encodeURIComponent(slug);
    var foto = $('#pv-foto');
    foto.src = modelo.prefixo ? modelo.foto : 'assets/img/vitrines/' + cor + '.jpg';
    foto.alt = 'Vitrine ' + nomeCor(v);
    if (usarIframe()) {
      if (!iframe) {
        iframe = document.createElement('iframe');
        iframe.title = 'Vitrine ao vivo';
        iframe.setAttribute('loading', 'eager');
        iframe.addEventListener('load', function () { escalar(); iframe.classList.add('pronta'); });
        $('#pv-vidro').insertBefore(iframe, $('.pv-cortina'));
        if ('ResizeObserver' in window) new ResizeObserver(escalar).observe($('#pv-vidro'));
        else window.addEventListener('resize', escalar);
      }
      iframe.classList.remove('pronta');
      iframe.src = 'vitrine.html?v=' + encodeURIComponent(slug);
      iframe.title = 'Vitrine ' + nomeCor(v) + ' ao vivo';
      escalar();
    }
    if (foco) {
      var cab = $('.pv-cabide[data-slug="' + cor + '"]');
      if (cab && cab.scrollIntoView) cab.scrollIntoView({ block: 'nearest', inline: 'center', behavior: reduzMovimento ? 'auto' : 'smooth' });
    }
  }
  function montarArara() {
    $('#pv-cabides').innerHTML = coresDoModelo().map(function (v) {
      var c = paleta(v);
      return '<button class="pv-cabide" type="button" data-slug="' + esc(v.slug) + '" aria-pressed="false" aria-label="' + esc(v.nome + ', estilo ' + v.estilo.toLowerCase()) + '">' + GANCHO +
        '<span class="peca" style="background:' + esc(c[1]) + '"><b style="background:' + esc(c[2]) + '"></b><i style="background:' + esc(c[3]) + '"></i></span>' +
        '<span class="nome" aria-hidden="true">' + esc(v.nome) + '</span></button>';
    }).join('');
  }
  // botões de modelo (pré-build): no provador e na galeria
  function montarModelos() {
    var html = MODELOS.map(function (m) {
      return '<button class="pv-filtro" type="button" data-modelo="' + esc(m.slug) + '" aria-pressed="' + (m.slug === modelo.slug) + '">' + esc(m.numero + ' · ' + m.nome) + '</button>';
    }).join('');
    Array.prototype.forEach.call(document.querySelectorAll('[data-modelos]'), function (el) { el.innerHTML = MODELOS.length > 1 ? html : ''; });
  }
  function trocarModelo(slug) {
    var m = MODELOS.filter(function (x) { return x.slug === slug; })[0];
    if (!m || m.slug === modelo.slug) return;
    var cor = atual ? atual.cor : 'grafite-lima';
    modelo = m; atual = null;
    montarModelos(); montarArara(); montarGaleria();
    var c = coresDoModelo();
    experimentar(c.some(function (v) { return v.slug === cor; }) ? cor : c[0].slug);
  }

  /* ---------- galeria ---------- */
  function montarGaleria() {
    var lista = coresDoModelo();
    var estiloDe = function (v) { var t = modelo.prefixo && modelo.cores[v.slug]; return t ? (t.modo === 'claro' ? 'Fundo claro' : 'Fundo escuro') : v.estilo; };
    $('#pv-galeria').innerHTML = lista.map(function (v) {
      var slug = modelo.prefixo + v.slug, t = modelo.prefixo ? modelo.cores[v.slug] : null;
      var cores = paleta(v).slice(0, t ? 3 : 4).map(function (c) { return '<i style="background:' + esc(c) + '"></i>'; }).join('');
      var ao = 'vitrine.html?v=' + encodeURIComponent(slug);
      var foto = t
        ? '<span class="pv-amostra" style="background:' + esc(t.bg) + ';color:' + esc(t.modo === 'claro' ? '#14161A' : '#F3F4F1') + '"><img src="' + esc(modelo.foto) + '" alt="" loading="lazy" decoding="async"><i style="background:' + esc(t.accent) + '"></i><b>' + esc(modelo.nome) + '</b><em style="background:' + esc(t.accent) + ';color:' + esc(t.onAccent) + '">Ver coleção</em></span>'
        : '<img src="assets/img/vitrines/' + esc(v.slug) + '.jpg" alt="" width="640" height="400" loading="lazy" decoding="async">' +
          '<span class="pv-item-cel"><img src="assets/img/vitrines/' + esc(v.slug) + '-cel.jpg" alt="" width="390" height="780" loading="lazy" decoding="async"></span>';
      return '<li class="pv-item" data-estilo="' + esc(estiloDe(v)) + '">' +
        '<a class="pv-item-foto" href="' + ao + '" target="_blank" rel="noopener" aria-label="Abrir a vitrine ' + esc(nomeCor(v)) + ' ao vivo">' + foto + '</a>' +
        '<div class="pv-item-cab"><h3>' + esc(v.nome) + '</h3><span class="pv-item-estilo">' + esc(estiloDe(v)) + '</span></div>' +
        '<p>' + esc(t ? modelo.nome + ' na cor ' + v.nome + '. ' + (t.modo === 'claro' ? 'Fundo claro.' : 'Fundo escuro.') : v.descricao) + '</p>' +
        '<div class="pv-item-pe"><span class="pv-cores" aria-hidden="true">' + cores + '</span>' +
        '<a class="pv-link" href="#topo" data-experimentar="' + esc(v.slug) + '">Experimentar no provador</a>' +
        '<a class="pv-btn pv-btn-linha pv-mini" href="montar/?vitrine=' + encodeURIComponent(slug) + '">Quero esta</a></div></li>';
    }).join('');
    var estilos = ['Todas'];
    lista.forEach(function (v) { if (estilos.indexOf(estiloDe(v)) < 0) estilos.push(estiloDe(v)); });
    $('#pv-filtros').innerHTML = estilos.map(function (e, i) { return '<button class="pv-filtro" type="button" aria-pressed="' + (i === 0) + '" data-estilo="' + esc(e) + '">' + esc(e) + '</button>'; }).join('');
  }

  /* ---------- escolher vitrine/plano para o pedido ---------- */
  function escolherVitrine(slug) {
    var s = P.separarVitrine(slug, MODELOS), v = VITRINES.filter(function (x) { return x.slug === s.cor; })[0];
    var ok = v && (!s.modelo.prefixo || (s.modelo.cores && s.modelo.cores[s.cor]));
    $('#pv-sel-vitrine').value = ok ? slug : '';
    var box = $('#pv-escolhida');
    if (!ok) { box.hidden = true; return; }
    $('#pv-escolhida-img').src = s.modelo.prefixo ? s.modelo.foto : 'assets/img/vitrines/' + v.slug + '.jpg';
    $('#pv-escolhida-img').alt = 'Vitrine ' + P.nomeVitrine(slug, VITRINES, MODELOS);
    $('#pv-escolhida-nome').textContent = P.nomeVitrine(slug, VITRINES, MODELOS);
    box.hidden = false;
  }
  document.addEventListener('click', function (e) {
    var mb = e.target.closest('[data-modelo]');
    if (mb) { trocarModelo(mb.dataset.modelo); return; }
    var cab = e.target.closest('.pv-cabide');
    if (cab) { experimentar(cab.dataset.slug); return; }
    var fb = e.target.closest('#pv-filtros .pv-filtro');
    if (fb) {
      Array.prototype.forEach.call(fb.parentNode.children, function (x) { x.setAttribute('aria-pressed', String(x === fb)); });
      Array.prototype.forEach.call(document.querySelectorAll('.pv-item'), function (li) { li.hidden = !(fb.dataset.estilo === 'Todas' || li.dataset.estilo === fb.dataset.estilo); });
      return;
    }
    var a = e.target.closest('[data-vitrine]');
    if (a) escolherVitrine(a.dataset.vitrine);
    var pl = e.target.closest('[data-plano-escolha]');
    if (pl) { var s = document.querySelector('#pv-form [name="plano"]'); if (s) s.value = pl.dataset.planoEscolha; }
    var ex = e.target.closest('[data-experimentar]');
    if (ex) experimentar(ex.dataset.experimentar, true);
  });

  /* ---------- preços ---------- */
  function preencherPrecos(p) {
    Object.keys(p.planos || {}).forEach(function (k) {
      var col = document.querySelector('.pv-plano[data-plano="' + k + '"]');
      if (!col) return;
      col.querySelector('[data-mensal]').textContent = brl(p.planos[k].mensal);
      col.querySelector('[data-impl]').textContent = brl(p.planos[k].implantacao);
    });
    var taxa = pct(p.splitPct) + (p.splitFixo ? ' + ' + brl(p.splitFixo) : '');
    $('#pv-split').innerHTML = 'Nos planos com venda pelo site entra também <b>' + esc(taxa) + ' de cada venda paga</b>. O resto vai direto para a sua conta.' +
      (p.dominioAno ? ' Domínio .com.br, se você ainda não tiver: <b>' + esc(brl(p.dominioAno)) + ' por ano</b>.' : '');
  }

  /* ---------- formulário ---------- */
  var ROTULO = { nome: 'seu nome', loja: 'o nome da loja', whatsapp: 'o WhatsApp com DDD' };
  function enviar(e) {
    e.preventDefault();
    var f = e.target, botao = f.querySelector('button[type="submit"]'), erro = $('#pv-form-erro');
    Array.prototype.forEach.call(f.querySelectorAll('[aria-invalid]'), function (x) { x.removeAttribute('aria-invalid'); });
    if (f.elements.site.value) { mostrarOk(f.elements.loja.value); return; } // robô preencheu o campo escondido
    var dados = {};
    ['nome', 'loja', 'instagram', 'whatsapp', 'vitrine', 'plano', 'mensagem'].forEach(function (k) { dados[k] = f.elements[k].value; });
    botao.disabled = true; botao.textContent = 'Enviando...';
    P.criarLead(dados).then(function () { mostrarOk(dados.loja); })
      .catch(function (err) {
        var campos = (err && err.campos) || [];
        campos.forEach(function (k) { if (f.elements[k]) f.elements[k].setAttribute('aria-invalid', 'true'); });
        erro.textContent = campos.length ? 'Falta ' + campos.map(function (k) { return ROTULO[k] || k; }).join(', ') + '.' : 'Não deu para enviar agora. Confira a internet e tente de novo.';
        if (campos.length && f.elements[campos[0]]) f.elements[campos[0]].focus();
      })
      .then(function () { botao.disabled = false; botao.textContent = 'Enviar pedido'; });
  }
  function mostrarOk(loja) {
    $('#pv-form').hidden = true;
    $('#pv-ok-loja').textContent = String(loja || 'sua loja').trim();
    var w = String(cfg.whatsappComercial || '').replace(/\D/g, '');
    if (w.length >= 12) {
      var b = $('#pv-ok-whats');
      b.href = 'https://wa.me/' + w + '?text=' + encodeURIComponent('Oi! Acabei de pedir uma loja no site (' + String(loja || '').trim() + ').');
      b.hidden = false;
    }
    var ok = $('#pv-ok'); ok.hidden = false; ok.focus();
  }

  /* ---------- início ---------- */
  function iniciar() {
    window.addEventListener('scroll', function () { $('.pv-cabeca').classList.toggle('rolou', window.scrollY > 8); }, { passive: true });
    $('#pv-form').addEventListener('submit', enviar);
    P.precosPublicos().then(preencherPrecos).catch(function () { /* fica o preço escrito no HTML */ });
    Promise.all([P.catalogo(''), P.modelos ? P.modelos('').catch(function () { return []; }) : []]).then(function (r) {
      var cat = r[0];
      VITRINES = cat.filter(function (v) { return v.publica; });
      MODELOS = (r[1] || []).slice().sort(function (a, b) { return a.numero - b.numero; });
      var pedida = (location.search.match(/[?&]vitrine=([a-z0-9-]+)/) || [])[1];
      var sp = pedida && P.separarVitrine ? P.separarVitrine(pedida, MODELOS) : { modelo: null, cor: pedida };
      if (sp.modelo && sp.modelo.prefixo) modelo = sp.modelo;
      else modelo = MODELOS.filter(function (m) { return !m.prefixo; })[0] || modelo;
      montarModelos(); montarArara(); montarGaleria();
      $('#pv-sel-vitrine').insertAdjacentHTML('beforeend', (MODELOS.length ? MODELOS : [modelo]).map(function (m) {
        var ops = VITRINES.filter(function (v) { return !m.prefixo || (m.cores && m.cores[v.slug]); }).map(function (v) { return '<option value="' + esc(m.prefixo + v.slug) + '">' + esc((m.prefixo ? m.nome + ' · ' : '') + v.nome) + '</option>'; }).join('');
        return MODELOS.length > 1 ? '<optgroup label="' + esc('Modelo ' + m.numero + ': ' + m.nome) + '">' + ops + '</optgroup>' : ops;
      }).join(''));
      var cores = coresDoModelo();
      var inicial = cores.filter(function (v) { return v.slug === sp.cor; })[0] || cores.filter(function (v) { return v.slug === 'grafite-lima'; })[0] || cores[0];
      atual = null; experimentar(inicial.slug);
      if (pedida) escolherVitrine(pedida);
      var abrir = function () { requestAnimationFrame(function () { $('.pv-provador').classList.add('pv-aberta'); }); };
      var foto = $('#pv-foto');
      if (foto.complete) abrir(); else { foto.addEventListener('load', abrir); setTimeout(abrir, 1500); }
    }).catch(function () {
      $('.pv-provador').classList.add('pv-aberta');
      $('#pv-galeria').innerHTML = '<li><p>Não deu para carregar as vitrines agora. Recarregue a página.</p></li>';
    });
  }
  if ('serviceWorker' in navigator && location.protocol === 'https:') window.addEventListener('load', function () { navigator.serviceWorker.register('sw.js').catch(function () {}); });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar); else iniciar();
})();
