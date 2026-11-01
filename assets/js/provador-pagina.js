/*
 * provador-pagina.js — partes vivas do site de vendas que não são o provador (o provador fica no site.js).
 * - Topo: o nome PROVADOR fica parado e as capas dos modelos trocam com a rolagem.
 * - Além do site: o painel de exemplo troca de tela conforme o módulo (rolagem, clique ou toque).
 * - Gráficos do painel (SVG à mão) e a etiqueta com código de barras Code 128 de verdade.
 * - Celular da cliente, planos, perguntas e as entradas das seções.
 */
(function () {
  'use strict';
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var brl = function (n, dec) { return (Number(n) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: dec ? 2 : 0, maximumFractionDigits: dec ? 2 : 0 }); };
  var reduz = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var cfg = window.PROVADOR_CONFIG || {};

  /*
   * Situação de cada módulo no painel da lojista. 'pronto' some com o selo; 'chegando' mostra "Em breve".
   * Quando um módulo for lançado, troque aqui para 'pronto'.
   */
  var MODULOS = { caixa: 'chegando', estoque: 'chegando', relatorios: 'chegando', fluxos: 'chegando', apps: 'chegando' };
  var CLIENTE = { vip: 'chegando', compra: 'pronto', app: 'chegando', reposicao: 'chegando', favoritos: 'pronto', pedido: 'chegando' };

  /* ---------- topo: capas dos modelos sob o nome fixo ---------- */
  var HERO = [['bloco', 'pink-pulse'], ['trilha', 'laranja-energia'], ['impacto', 'grafite-lima'],
    ['aura', 'lavanda-suave'], ['nobre', 'rubi-dourado'], ['foco', 'ceu-pastel']];
  var capas = [], legendas = [], chaos = [], capaAtual = -1;

  function montarCapas(modelos) {
    var caixa = $('#pv-capas');
    if (!caixa) return;
    var html = '';
    HERO.forEach(function (h, i) {
      var m = modelos.filter(function (x) { return x.slug === h[0]; })[0];
      var c = m && m.cores && m.cores[h[1]];
      if (!m || !c || !m.fotos || !m.fotos.hero) return;
      var s = (m.textos && m.textos.hero && m.textos.hero[0]) || {};
      var foto = 'vitrines/_fotos/' + m.fotos.hero[0] + '.jpg';
      html += '<figure class="capa capa-' + esc(m.slug) + '" data-ui style="--c-bg:' + esc(c.bg) + ';--c-ac:' + esc(c.accent) + ';--c-on:' + esc(c.onAccent) + ';--c-ink:' + esc(c.ink) + '">' +
        '<img ' + (i < 2 ? 'src' : 'data-src') + '="' + esc(foto) + '" alt="" width="1200" height="1500" decoding="async">' +
        '<figcaption><small>' + esc(s.kicker || 'Coleção nova') + '</small><strong>' + esc(s.titulo || m.nome) + '</strong><span>' + esc(s.botao || 'Ver coleção') + '</span></figcaption></figure>';
      legendas.push(m.nome + ', na cor ' + c.nome);
      chaos.push(c.soft || c.surface || '#F3F5F8');
    });
    if (!html) return;
    caixa.innerHTML = html;
    capas = $$('.capa', caixa);
    var soltar = function () { $$('img[data-src]', caixa).forEach(function (im) { im.src = im.getAttribute('data-src'); im.removeAttribute('data-src'); }); };
    if (document.readyState === 'complete') setTimeout(soltar, 300); else window.addEventListener('load', function () { setTimeout(soltar, 300); });
    capaAtual = -1;
    rolarTopo();
  }
  function rolarTopo() {
    var sec = $('#topo');
    if (!sec || !capas.length) return;
    var r = sec.getBoundingClientRect(), curso = sec.offsetHeight - window.innerHeight;
    var p = curso > 0 ? Math.min(1, Math.max(0, -r.top / curso)) : 0;
    var i = Math.min(capas.length - 1, Math.floor(p * capas.length));
    if (i === capaAtual) return;
    capaAtual = i;
    capas.forEach(function (c, k) { c.classList.toggle('ativa', k === i); });
    var leg = $('#pv-capa-legenda');
    if (leg) leg.textContent = legendas[i];
    sec.style.setProperty('--chao', chaos[i]);
  }
  var pedido = false;
  window.addEventListener('scroll', function () {
    if (pedido) return;
    pedido = true;
    requestAnimationFrame(function () { pedido = false; rolarTopo(); });
  }, { passive: true });

  /* ---------- preço mínimo no topo ---------- */
  function precoMinimo() {
    var P = window.Plataforma;
    if (!P || !P.precosPublicos) return;
    P.precosPublicos().then(function (p) {
      var v = Object.keys(p.planos || {}).map(function (k) { return Number(p.planos[k].mensal) || 0; }).filter(Boolean);
      if (v.length) $$('[data-preco-min]').forEach(function (el) { el.textContent = brl(Math.min.apply(null, v)); });
    }).catch(function () {});
  }

  /* ---------- Code 128 (conjunto B): código de barras que os leitores reconhecem ---------- */
  var C128 = ('212222 222122 222221 121223 121322 131222 122213 122312 132212 221213 221312 231212 112232 122132 122231 113222 123122 123221 223211 221132 ' +
    '221231 213212 223112 312131 311222 321122 321221 312212 322112 322211 212123 212321 232121 111323 131123 131321 112313 132113 132311 211313 ' +
    '231113 231311 112133 112331 132131 113123 113321 133121 313121 211331 231131 213113 213311 213131 311123 311321 331121 312113 312311 332111 ' +
    '314111 221411 431111 111224 111422 121124 121421 141122 141221 112214 112412 122114 122411 142112 142211 241211 221114 413111 241112 134111 ' +
    '111242 121142 121241 114212 124112 124211 411212 421112 421211 212141 214121 412121 111143 111341 131141 114113 114311 411113 411311 113141 ' +
    '114131 311141 411131 211412 211214 211232 2331112').split(' ');
  function code128(texto) {
    var v = [104], soma = 104;
    for (var i = 0; i < texto.length; i++) {
      var c = texto.charCodeAt(i) - 32;
      if (c < 0 || c > 94) c = 0;
      v.push(c); soma += c * (i + 1);
    }
    v.push(soma % 103, 106);
    return v.map(function (k) { return C128[k]; }).join('');
  }
  function desenharBarras(svg, texto) {
    if (!svg) return;
    var larg = code128(texto), total = 0, x = 10, partes = [];
    for (var i = 0; i < larg.length; i++) total += +larg[i];
    var mod = 180 / total;
    for (var j = 0; j < larg.length; j++) {
      var w = +larg[j] * mod;
      if (j % 2 === 0) partes.push('<rect x="' + x.toFixed(2) + '" y="0" width="' + w.toFixed(2) + '" height="60"/>');
      x += w;
    }
    svg.innerHTML = '<g fill="#0A1630">' + partes.join('') + '</g>';
  }
  function etiqueta() {
    var sku = $('#pn-etq-sku');
    var codigo = sku ? sku.textContent.trim() : 'CJPIL-CHO-M';
    desenharBarras($('#pn-etq-barras'), codigo);
    desenharBarras($('#pn-cel-barras'), codigo);
    var inp = $('#pn-etq-input'), loja = $('#pn-etq-loja');
    if (inp && loja) inp.addEventListener('input', function () { loja.textContent = inp.value.trim() || 'Lua Fit Moda'; });
  }

  /* ---------- gráficos do painel (dados de exemplo) ---------- */
  var COR = { ent: '#0E9A82', sai: '#C2410C', s1: '#2563C9', s2: '#0E9A82', s3: '#B7791F' };
  function caixaSemanas(el) {
    if (!el) return;
    var sem = ['1 a 7', '8 a 14', '15 a 21', '22 a 28', '29 a 31'], ent = [3820, 4510, 3960, 4300, 1840], sai = [2100, 1450, 2480, 1290, 592];
    var W = 520, H = 210, base = 124, max = 4600, larg = 30, passo = (W - 40) / sem.length;
    var s = '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Entradas e saídas por semana de outubro">';
    s += '<rect x="20" y="' + base + '" width="' + (W - 40) + '" height="1.5" fill="#9AA6BA"/>';
    sem.forEach(function (n, i) {
      var cx = 20 + passo * i + passo / 2, he = ent[i] / max * (base - 12 - 12), hs = sai[i] / max * (base - 12 - 12) * .62;
      s += '<g data-tip="' + esc('Semana ' + n + ': entrou ' + brl(ent[i]) + ', saiu ' + brl(sai[i])) + '">' +
        '<rect x="' + (cx - passo / 2) + '" y="0" width="' + passo + '" height="' + H + '" fill="transparent"/>' +
        '<path d="' + barra(cx - larg / 2, base - 1, larg, he, true) + '" fill="' + COR.ent + '"/>' +
        '<path d="' + barra(cx - larg / 2, base + 2.5, larg, hs, false) + '" fill="' + COR.sai + '"/>' +
        '<text x="' + cx + '" y="' + (H - 4) + '" text-anchor="middle">' + n + '</text></g>';
      if (i === 1) s += '<text class="v" x="' + cx + '" y="' + (base - 1 - he - 8) + '" text-anchor="middle">' + brl(ent[i]) + '</text>';
    });
    el.innerHTML = s + '</svg>';
  }
  // barra com a ponta arredondada (4px) longe da linha de base
  function barra(x, y, w, h, sobe) {
    var r = Math.min(4, h / 2);
    if (sobe) return 'M' + x + ' ' + y + 'V' + (y - h + r) + 'Q' + x + ' ' + (y - h) + ' ' + (x + r) + ' ' + (y - h) + 'H' + (x + w - r) + 'Q' + (x + w) + ' ' + (y - h) + ' ' + (x + w) + ' ' + (y - h + r) + 'V' + y + 'Z';
    return 'M' + x + ' ' + y + 'V' + (y + h - r) + 'Q' + x + ' ' + (y + h) + ' ' + (x + r) + ' ' + (y + h) + 'H' + (x + w - r) + 'Q' + (x + w) + ' ' + (y + h) + ' ' + (x + w) + ' ' + (y + h - r) + 'V' + y + 'Z';
  }
  function pilha(el, partes, rotulo) {
    if (!el) return;
    var W = 300, x = 0, s = '<svg viewBox="0 0 ' + W + ' 74" role="img" aria-label="' + esc(rotulo) + '">';
    partes.forEach(function (p, i) {
      var w = p[1] / 100 * W - (i < partes.length - 1 ? 2 : 0);
      s += '<g data-tip="' + esc(p[0] + ': ' + p[1] + '%') + '"><rect x="' + x + '" y="0" width="' + Math.max(w, 1) + '" height="26" rx="' + (i === 0 || i === partes.length - 1 ? 4 : 0) + '" fill="' + p[2] + '"/></g>';
      x += w + 2;
    });
    x = 0;
    partes.forEach(function (p) {
      s += '<rect x="' + x + '" y="40" width="10" height="10" rx="2" fill="' + p[2] + '"/><text x="' + (x + 14) + '" y="49">' + esc(p[0]) + '</text><text class="v" x="' + (x + 14) + '" y="68">' + p[1] + '%</text>';
      x += W / partes.length;
    });
    el.innerHTML = s + '</svg>';
  }
  function maisVendidas(el) {
    if (!el) return;
    var d = [['Conjunto Essencial', 23], ['Legging Cós Alto', 19], ['Top Nadador', 14], ['Conjunto Pilates', 11], ['Macacão Atleta', 8]];
    var W = 300, rot = 132, max = 23, s = '<svg viewBox="0 0 ' + W + ' ' + (d.length * 30) + '" role="img" aria-label="Mais vendidas em 30 dias">';
    d.forEach(function (p, i) {
      var y = i * 30, w = p[1] / max * (W - rot - 36);
      s += '<g data-tip="' + esc(p[0] + ': ' + p[1] + ' peças') + '"><rect x="0" y="' + y + '" width="' + W + '" height="28" fill="transparent"/>' +
        '<text x="0" y="' + (y + 18) + '">' + esc(p[0]) + '</text>' +
        '<path d="M' + rot + ' ' + (y + 6) + 'H' + (rot + w - 4) + 'Q' + (rot + w) + ' ' + (y + 6) + ' ' + (rot + w) + ' ' + (y + 10) + 'V' + (y + 18) + 'Q' + (rot + w) + ' ' + (y + 22) + ' ' + (rot + w - 4) + ' ' + (y + 22) + 'H' + rot + 'Z" fill="' + COR.s1 + '"/>' +
        '<text class="v" x="' + (rot + w + 6) + '" y="' + (y + 18) + '">' + p[1] + '</text></g>';
    });
    el.innerHTML = s + '</svg>';
  }
  function dicas(painel) {
    if (!painel || painel.__dicas) return;
    painel.__dicas = true;
    var d = document.createElement('div');
    d.className = 'pn-dica'; d.setAttribute('role', 'status');
    painel.appendChild(d);
    painel.addEventListener('pointermove', function (e) {
      var g = e.target.closest && e.target.closest('[data-tip]');
      if (!g) { d.classList.remove('vis'); return; }
      var r = painel.getBoundingClientRect();
      d.textContent = g.getAttribute('data-tip');
      d.style.left = Math.min(r.width - 90, Math.max(90, e.clientX - r.left)) + 'px';
      d.style.top = (e.clientY - r.top) + 'px';
      d.classList.add('vis');
    });
    painel.addEventListener('pointerleave', function () { d.classList.remove('vis'); });
  }
  function graficos() {
    caixaSemanas($('#gr-caixa'));
    pilha($('#gr-pagto'), [['Pix', 61, COR.s1], ['Cartão', 31, COR.s2], ['Dinheiro', 8, COR.s3]], 'Como a cliente pagou');
    maisVendidas($('#gr-top'));
    pilha($('#gr-canal'), [['Instagram', 54, COR.s1], ['WhatsApp', 31, COR.s2], ['Balcão', 15, COR.s3]], 'De onde vêm as vendas');
    dicas($('#pv-painel'));
  }

  /* ---------- além do site: módulos ---------- */
  var selo = function (estado) { return estado === 'chegando' ? '<span class="pv-chega">Em breve</span>' : ''; };
  function ativarModulo(nome) {
    $$('#pv-modulos li').forEach(function (li) {
      var on = li.getAttribute('data-modulo') === nome;
      li.classList.toggle('ativo', on);
      var b = $('button', li); if (b) b.setAttribute('aria-pressed', String(on));
    });
    if (celularModulos) return;
    $$('#pv-painel .pn-tela').forEach(function (t) {
      var on = t.getAttribute('data-tela') === nome;
      t.hidden = !on; t.classList.toggle('ativa', on);
    });
  }
  var celularModulos = null;
  function arrumarModulos() {
    var cel = window.matchMedia('(max-width: 980px)').matches;
    if (cel === celularModulos) return;
    celularModulos = cel;
    var painel = $('#pv-painel'), barra = painel && $('.pn-barra', painel);
    if (!painel) return;
    $$('#pv-modulos li').forEach(function (li) {
      var nome = li.getAttribute('data-modulo'), tela = $('#tela-' + nome);
      if (!tela) return;
      if (cel) {
        var caixa = document.createElement('div');
        caixa.className = 'pv-painel pv-painel-cel';
        caixa.setAttribute('data-ui', '');
        caixa.setAttribute('role', 'region');
        caixa.setAttribute('aria-label', 'Exemplo do painel da loja, com dados de exemplo');
        caixa.appendChild(barra.cloneNode(true));
        caixa.appendChild(tela);
        tela.hidden = false;
        li.appendChild(caixa);
        dicas(caixa);
      } else {
        painel.appendChild(tela);
        var velho = $('.pv-painel-cel', li); if (velho) velho.remove();
      }
    });
    if (!cel) ativarModulo(($('#pv-modulos li.ativo') || {}).getAttribute ? $('#pv-modulos li.ativo').getAttribute('data-modulo') : 'caixa');
  }
  function modulos() {
    var lista = $('#pv-modulos');
    if (!lista) return;
    $$('li', lista).forEach(function (li) {
      var b = $('button', li), estado = MODULOS[li.getAttribute('data-modulo')];
      if (b && estado) b.insertAdjacentHTML('afterend', selo(estado));
    });
    lista.addEventListener('click', function (e) {
      var li = e.target.closest('li'); if (li) ativarModulo(li.getAttribute('data-modulo'));
    });
    arrumarModulos();
    window.addEventListener('resize', arrumarModulos);
    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (es) {
        if (celularModulos) return;
        es.forEach(function (x) { if (x.isIntersecting) ativarModulo(x.target.getAttribute('data-modulo')); });
      }, { rootMargin: '-42% 0px -52% 0px' });
      $$('li', lista).forEach(function (li) { io.observe(li); });
    }
  }

  /* ---------- o que a cliente ganha ---------- */
  function vantagens() {
    var lista = $('#pv-vantagens');
    if (!lista) return;
    $$('li', lista).forEach(function (li) {
      var estado = CLIENTE[li.getAttribute('data-cel')];
      if (estado === 'chegando') { var p = $('p', li); if (p) p.insertAdjacentHTML('beforeend', ' <span class="pv-chega pv-chega-claro">Em breve</span>'); }
    });
    var ativar = function (nome) {
      $$('li', lista).forEach(function (li) {
        var on = li.getAttribute('data-cel') === nome;
        li.classList.toggle('ativo', on);
        var b = $('button', li); if (b) b.setAttribute('aria-expanded', String(on));
      });
      $$('.cel-tela').forEach(function (t) { t.classList.toggle('ativa', t.getAttribute('data-cel') === nome); });
    };
    lista.addEventListener('click', function (e) { var li = e.target.closest('li'); if (li) ativar(li.getAttribute('data-cel')); });
    lista.addEventListener('focusin', function (e) { var li = e.target.closest('li'); if (li) ativar(li.getAttribute('data-cel')); });
    if (window.matchMedia('(hover: hover)').matches) lista.addEventListener('mouseover', function (e) { var li = e.target.closest('li'); if (li) ativar(li.getAttribute('data-cel')); });
    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (es) {
        es.forEach(function (x) { if (x.isIntersecting) ativar(x.target.getAttribute('data-cel')); });
      }, { rootMargin: '-48% 0px -48% 0px' });
      $$('li', lista).forEach(function (li) { io.observe(li); });
    }
  }

  /* ---------- planos ---------- */
  function planos() {
    var abas = $$('.pv-planos-nomes [role="tab"]');
    if (!abas.length) return;
    var escolher = function (k, foco) {
      abas.forEach(function (a) {
        var on = a.getAttribute('data-aba') === k;
        a.setAttribute('aria-selected', String(on)); a.tabIndex = on ? 0 : -1;
        if (on && foco) a.focus();
      });
      $$('.pv-plano').forEach(function (p) { p.hidden = p.getAttribute('data-plano') !== k; });
    };
    abas.forEach(function (a, i) {
      a.tabIndex = a.getAttribute('aria-selected') === 'true' ? 0 : -1;
      a.addEventListener('click', function () { escolher(a.getAttribute('data-aba')); });
      a.addEventListener('keydown', function (e) {
        var d = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0;
        if (!d) return;
        e.preventDefault();
        escolher(abas[(i + d + abas.length) % abas.length].getAttribute('data-aba'), true);
      });
    });
  }

  /* ---------- perguntas ---------- */
  function perguntas() {
    var lista = $('#pv-faq'), painel = $('#pv-faq-painel');
    if (!lista) return;
    var ativar = function (li) {
      $$('li', lista).forEach(function (x) {
        var on = x === li;
        x.classList.toggle('ativo', on);
        $('button', x).setAttribute('aria-expanded', String(on));
      });
      if (painel) painel.innerHTML = $('.pv-faq-r', li).innerHTML;
    };
    lista.addEventListener('click', function (e) { var li = e.target.closest('li'); if (li) ativar(li); });
    lista.addEventListener('focusin', function (e) { var li = e.target.closest('li'); if (li) ativar(li); });
    if (window.matchMedia('(hover: hover)').matches) lista.addEventListener('mouseover', function (e) { var li = e.target.closest('li'); if (li && !li.classList.contains('ativo')) ativar(li); });
    ativar($('li.ativo', lista) || $('li', lista));
  }

  /* ---------- entradas das seções ---------- */
  function entradas() {
    if (reduz || !('IntersectionObserver' in window)) return;
    var grupos = [
      ['#provador', '.pv-provador-texto > *, .pv-provador'],
      ['#vitrines', '.pv-cores-topo > *, .pv-item'],
      ['#alem', '.pv-alem-col > h2, .pv-alem-intro, .pv-modulos > li, .pv-alem-palco'],
      ['#clientes', '.pv-clientes-lista h2, .pv-vantagens > li, .pv-clientes-cel'],
      ['#como', 'h2, .pv-frases > li'],
      ['#planos', '.pv-planos-nomes button, .pv-planos, .pv-split'],
      ['#perguntas', 'h2, .pv-faq > li, .pv-faq-painel'],
      ['#pedido', '.pv-pedido-cartao > *'],
      ['.pv-pe', '.pv-pe-nome, .pv-pe-lugares a, .pv-pe-links']
    ];
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (x) { if (x.isIntersecting) { x.target.classList.add('visto'); io.unobserve(x.target); } });
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
    grupos.forEach(function (g) {
      var sec = $(g[0]);
      if (!sec) return;
      $$(g[1], sec).forEach(function (el, i) {
        if (el.closest('.pv-poster') || el.classList.contains('pv-entra')) return;
        el.classList.add('pv-entra');
        el.style.setProperty('--i', String(Math.min(i, 8)));
        io.observe(el);
      });
    });
  }

  /* ---------- rodapé: WhatsApp comercial, quando houver ---------- */
  function rodape() {
    var w = String(cfg.whatsappComercial || '').replace(/\D/g, ''), a = $('#pv-pe-whats');
    if (a && w.length >= 12) { a.href = 'https://wa.me/' + w; a.target = '_blank'; a.rel = 'noopener'; a.textContent = 'WhatsApp comercial'; }
  }

  function iniciar() {
    etiqueta(); graficos(); modulos(); vantagens(); planos(); perguntas(); entradas(); rodape(); precoMinimo();
    fetch('vitrines/_modelos/modelos.json').then(function (r) { return r.json(); })
      .then(function (d) { montarCapas(d.modelos || []); })
      .catch(function () { /* fica a capa da Trilha que já vem no HTML */ });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar); else iniciar();
})();
