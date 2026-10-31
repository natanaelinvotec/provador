/*
 * vitrine-loader.js — abre uma vitrine (demonstração) ou a loja de uma cliente.
 *
 *   vitrine.html?v=<vitrine>&p=<pagina>   demonstração de um modelo do catálogo
 *   vitrine.html?l=<loja>&p=<pagina>      loja de uma cliente (marca e vitrine vêm do cadastro)
 *   domínio próprio (ex.: aismodafitness.com.br) -> procura a loja pelo domínio
 *
 * As telas são os arquivos .dc.html da vitrine; as marcas @@...@@ viram os dados da loja.
 */
(function () {
  'use strict';
  var SLUG = /^[a-z0-9](?:[a-z0-9-]{0,38}[a-z0-9])?$/;
  var SO_DEMO = ['painel', 'vendas'];
  var PAGES = { inicio: 'Main', colecao: 'Colecao', produto: 'Produto', sacola: 'Sacola', painel: 'Painel', app: 'AppCliente', vendas: 'AppVendas' };
  var FILE_TO_PAGE = { Main: 'inicio', Colecao: 'colecao', Produto: 'produto', Sacola: 'sacola', Painel: 'painel', AppCliente: 'app', AppVendas: 'vendas' };
  var DEMO = { MARCA: 'Sua Marca', MARCA_SUB: 'MODA FITNESS', NOME: 'Sua Marca', IG: 'suamarca', CIDADE: 'Sua cidade, UF', CIDADE_CURTA: 'Sua cidade', WHATS: '(00) 00000-0000', INICIAIS: 'SM' };

  function htmlEsc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function jsEsc(s) { return String(s).replace(/[\\'"`<>\n\r\u2028\u2029$]/g, function (c) { return '\\u' + ('0000' + c.charCodeAt(0).toString(16)).slice(-4); }); }

  function applyTokens(src, marca) {
    var m = Object.assign({}, DEMO, marca || {});
    var re = /@@([A-Z_]+)@@/g;
    var sm = src.match(/(<script type="text\/x-dc"[^>]*>)([\s\S]*?)(<\/script>)/);
    function rep(esc) { return function (all, k) { return k in m ? esc(m[k]) : all; }; }
    if (!sm) return src.replace(re, rep(htmlEsc));
    var i = src.indexOf(sm[0]);
    var before = src.slice(0, i).replace(re, rep(htmlEsc));
    var code = sm[2].replace(re, rep(jsEsc));
    var after = src.slice(i + sm[0].length).replace(re, rep(htmlEsc));
    return before + sm[1] + code + sm[3] + after;
  }

  function params() {
    var q = new URLSearchParams(location.search), o = {};
    q.forEach(function (v, k) { o[k] = v; });
    return o;
  }

  function linkFor(base, page) {
    var q = new URLSearchParams();
    if (base.l) q.set('l', base.l); else if (base.v) q.set('v', base.v);
    q.set('p', page);
    if (base.tema) q.set('tema', base.tema);
    return 'vitrine.html?' + q.toString();
  }

  function rewriteLinks(src, base) {
    return src.replace(/href="([A-Za-z]+)\.dc\.html"/g, function (all, f) {
      var page = FILE_TO_PAGE[f];
      return page ? 'href="' + htmlEsc(linkFor(base, page)) + '"' : all;
    });
  }

  function showError(msg) {
    var el = document.getElementById('app');
    el.innerHTML = '';
    var box = document.createElement('div');
    box.className = 'vl-erro';
    var h = document.createElement('h1'); h.textContent = 'Não foi possível abrir esta vitrine';
    var p = document.createElement('p'); p.textContent = msg;
    var a = document.createElement('a'); a.href = 'index.html#vitrines'; a.textContent = 'Ver as vitrines disponíveis';
    box.appendChild(h); box.appendChild(p); box.appendChild(a);
    el.appendChild(box);
  }

  async function resolve(p) {
    // 1) loja de cliente pelo parâmetro ou pelo domínio
    var plat = window.Plataforma;
    if (p.l || (plat && !plat.ehHostDaPlataforma(location.hostname))) {
      if (p.l && !SLUG.test(p.l)) throw new Error('Endereço de loja inválido.');
      var loja = p.l ? await plat.lojaPorSlug(p.l) : await plat.lojaPorDominio(location.hostname);
      if (!loja) throw new Error('Loja não encontrada. Confira o link ou fale com o suporte.');
      if (loja.status !== 'ativa') throw new Error('Esta loja ainda não está no ar.');
      if (!SLUG.test(String(loja.vitrine || ''))) throw new Error('Esta loja ainda não tem vitrine.');
      return { vitrine: loja.vitrine, marca: loja.marca, base: { l: loja.slug }, loja: true };
    }
    // 2) demonstração de uma vitrine do catálogo
    var slug = p.v || 'ais';
    if (!SLUG.test(slug)) throw new Error('Endereço de vitrine inválido.');
    return { vitrine: slug, marca: null, base: { v: slug } };
  }

  async function start() {
    var p = params();
    var page = Object.prototype.hasOwnProperty.call(PAGES, p.p) ? p.p : 'inicio';
    try {
      var r = await resolve(p);
      // numa loja de verdade, as telas de gestão de demonstração não ficam abertas ao público
      if (r.loja && SO_DEMO.indexOf(page) >= 0) page = 'inicio';
      if (p.tema === 'escuro' || p.tema === 'claro') r.base.tema = p.tema;
      var res = await fetch('vitrines/' + r.vitrine + '/' + PAGES[page] + '.dc.html', { cache: 'no-cache' });
      if (!res.ok) throw new Error('Esta vitrine não tem a página pedida.');
      var src = await res.text();
      src = rewriteLinks(applyTokens(src, r.marca), r.base);
      var props = {};
      if (r.base.tema) props.temaInicial = r.base.tema;
      if (p.tela) props.telaInicial = p.tela;
      DCRuntime.mount(src, document.getElementById('app'), { props: props, key: 'vitrine' });
      document.documentElement.setAttribute('data-vitrine', r.vitrine);
    } catch (e) {
      showError(e.message || String(e));
    }
  }

  window.VitrineLoader = { applyTokens: applyTokens, rewriteLinks: rewriteLinks, linkFor: linkFor };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
