/*
 * site.js — site de vendas do Provador.
 * Monta a arara de cabides, a galeria e o formulário a partir de vitrines/catalogo.json
 * e lê os preços de Plataforma.precosPublicos() (o que você muda no painel aparece aqui).
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

  var VITRINES = [], atual = null, iframe = null;
  var GANCHO = '<svg class="gancho" viewBox="0 0 44 30" aria-hidden="true"><path d="M18.6 6.2a3.6 3.6 0 1 1 5.2 3.2L22 10.6 4.5 26.5h35L22 10.6"/></svg>';

  /* ---------- provador ---------- */
  function usarIframe() {
    var conn = navigator.connection || {};
    return window.innerWidth >= 760 && !conn.saveData;
  }
  function escalar() {
    if (!iframe) return;
    var vidro = $('#pv-vidro');
    iframe.style.transform = 'scale(' + (vidro.clientWidth / 1280) + ')';
  }
  function experimentar(slug, foco) {
    var v = VITRINES.filter(function (x) { return x.slug === slug; })[0];
    if (!v || (atual && atual.slug === slug)) return;
    atual = v;
    Array.prototype.forEach.call(document.querySelectorAll('.pv-cabide'), function (b) { b.setAttribute('aria-pressed', String(b.dataset.slug === slug)); });
    $('#pv-nome').textContent = v.nome;
    $('#pv-desc').textContent = v.descricao;
    $('#pv-endereco').textContent = 'sualoja.com.br';
    $('#pv-abrir').href = 'vitrine.html?v=' + encodeURIComponent(slug);
    $('#pv-quero').href = 'montar/?vitrine=' + encodeURIComponent(slug);
    var foto = $('#pv-foto');
    foto.src = 'assets/img/vitrines/' + slug + '.jpg';
    foto.alt = 'Vitrine ' + v.nome;
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
      iframe.title = 'Vitrine ' + v.nome + ' ao vivo';
      escalar();
    }
    if (foco) {
      var cab = $('.pv-cabide[data-slug="' + slug + '"]');
      if (cab && cab.scrollIntoView) cab.scrollIntoView({ block: 'nearest', inline: 'center', behavior: reduzMovimento ? 'auto' : 'smooth' });
    }
  }
  function montarArara() {
    $('#pv-cabides').innerHTML = VITRINES.map(function (v) {
      var c = v.cores || [];
      return '<button class="pv-cabide" type="button" data-slug="' + esc(v.slug) + '" aria-pressed="false" aria-label="' + esc(v.nome + ', estilo ' + v.estilo.toLowerCase()) + '">' + GANCHO +
        '<span class="peca" style="background:' + esc(c[1]) + '"><b style="background:' + esc(c[2]) + '"></b><i style="background:' + esc(c[3]) + '"></i></span>' +
        '<span class="nome" aria-hidden="true">' + esc(v.nome) + '</span></button>';
    }).join('');
    $('#pv-cabides').addEventListener('click', function (e) {
      var b = e.target.closest('.pv-cabide');
      if (b) experimentar(b.dataset.slug);
    });
  }

  /* ---------- galeria ---------- */
  function montarGaleria() {
    $('#pv-galeria').innerHTML = VITRINES.map(function (v) {
      var cores = (v.cores || []).map(function (c) { return '<i style="background:' + esc(c) + '"></i>'; }).join('');
      var ao = 'vitrine.html?v=' + encodeURIComponent(v.slug);
      return '<li class="pv-item" data-estilo="' + esc(v.estilo) + '">' +
        '<a class="pv-item-foto" href="' + ao + '" target="_blank" rel="noopener" aria-label="Abrir a vitrine ' + esc(v.nome) + ' ao vivo">' +
        '<img src="assets/img/vitrines/' + esc(v.slug) + '.jpg" alt="" width="640" height="400" loading="lazy" decoding="async">' +
        '<span class="pv-item-cel"><img src="assets/img/vitrines/' + esc(v.slug) + '-cel.jpg" alt="" width="390" height="780" loading="lazy" decoding="async"></span></a>' +
        '<div class="pv-item-cab"><h3>' + esc(v.nome) + '</h3><span class="pv-item-estilo">' + esc(v.estilo) + '</span></div>' +
        '<p>' + esc(v.descricao) + '</p>' +
        '<div class="pv-item-pe"><span class="pv-cores" aria-hidden="true">' + cores + '</span>' +
        '<a class="pv-link" href="#topo" data-experimentar="' + esc(v.slug) + '">Experimentar no provador</a>' +
        '<a class="pv-btn pv-btn-linha pv-mini" href="montar/?vitrine=' + encodeURIComponent(v.slug) + '">Quero esta</a></div></li>';
    }).join('');
    var estilos = ['Todas'];
    VITRINES.forEach(function (v) { if (estilos.indexOf(v.estilo) < 0) estilos.push(v.estilo); });
    $('#pv-filtros').innerHTML = estilos.map(function (e, i) { return '<button class="pv-filtro" type="button" aria-pressed="' + (i === 0) + '" data-estilo="' + esc(e) + '">' + esc(e) + '</button>'; }).join('');
    $('#pv-filtros').addEventListener('click', function (e) {
      var b = e.target.closest('.pv-filtro');
      if (!b) return;
      Array.prototype.forEach.call(this.children, function (x) { x.setAttribute('aria-pressed', String(x === b)); });
      Array.prototype.forEach.call(document.querySelectorAll('.pv-item'), function (li) {
        li.hidden = !(b.dataset.estilo === 'Todas' || li.dataset.estilo === b.dataset.estilo);
      });
    });
  }

  /* ---------- escolher vitrine/plano para o pedido ---------- */
  function escolherVitrine(slug) {
    var v = VITRINES.filter(function (x) { return x.slug === slug; })[0];
    $('#pv-sel-vitrine').value = v ? v.slug : '';
    var box = $('#pv-escolhida');
    if (!v) { box.hidden = true; return; }
    $('#pv-escolhida-img').src = 'assets/img/vitrines/' + v.slug + '.jpg';
    $('#pv-escolhida-img').alt = 'Vitrine ' + v.nome;
    $('#pv-escolhida-nome').textContent = v.nome;
    box.hidden = false;
  }
  document.addEventListener('click', function (e) {
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
    P.catalogo('').then(function (cat) {
      VITRINES = cat.filter(function (v) { return v.publica; });
      montarArara(); montarGaleria();
      $('#pv-sel-vitrine').insertAdjacentHTML('beforeend', VITRINES.map(function (v) { return '<option value="' + esc(v.slug) + '">' + esc(v.nome) + '</option>'; }).join(''));
      var pedida = (location.search.match(/[?&]vitrine=([a-z0-9-]+)/) || [])[1];
      var inicial = VITRINES.filter(function (v) { return v.slug === pedida; })[0] || VITRINES.filter(function (v) { return v.slug === 'grafite-lima'; })[0] || VITRINES[0];
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
