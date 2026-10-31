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
    if (base.rascunho) q.set('rascunho', '1');
    return 'vitrine.html?' + q.toString();
  }

  function rewriteLinks(src, base) {
    // "Produto.dc.html?item={{p.id}}" leva o id do produto junto (o {{...}} é preenchido na hora de desenhar)
    return src.replace(/href="([A-Za-z]+)\.dc\.html(?:\?item=(\{\{[a-zA-Z.]+\}\}))?"/g, function (all, f, item) {
      var page = FILE_TO_PAGE[f];
      return page ? 'href="' + htmlEsc(linkFor(base, page)) + (item ? '&amp;item=' + item : '') + '"' : all;
    });
  }

  // decodifica sem fetch(): o CSP do Hosting não libera data: em connect-src
  function dataUrlBlob(u) {
    var i = u.indexOf(','), tipo = u.slice(5, i).split(';')[0], bin = atob(u.slice(i + 1)), a = new Uint8Array(bin.length);
    for (var n = 0; n < bin.length; n++) a[n] = bin.charCodeAt(n);
    return new Blob([a], { type: tipo });
  }
  // fotos guardadas como data URL viram blob: (endereço curto), para a fonte da página não ficar gigante
  async function emBlob(itens) {
    return Promise.all((itens || []).map(async function (i) {
      var o = Object.assign({}, i);
      for (var k of ['img', 'img2']) {
        if (o[k] && /^data:image\//.test(o[k])) { try { o[k] = URL.createObjectURL(dataUrlBlob(o[k])); } catch (e) { o[k] = ''; } }
      }
      return o;
    }));
  }
  // catálogo de demonstração (fotos livres) usado pelas vitrines-modelo
  async function itensDemo(vitrine) {
    if (vitrine === 'ais') return null; // a vitrine da Ais usa as fotos dela
    try { var r = await fetch('vitrines/demo-catalogo.json', { cache: 'no-cache' }); return r.ok ? (await r.json()).itens : null; } catch (e) { return null; }
  }
  function testeValido(loja) {
    if (loja.status !== 'teste') return false;
    // o teste vale até o fim do dia (hora local) de trialAte; o Timestamp, quando existe, é a fonte certa
    var dia = /^\d{4}-\d{2}-\d{2}$/.test(String(loja.trialAte || '')) ? loja.trialAte + 'T23:59:59' : loja.trialAte;
    var ate = loja.trialAteTs && loja.trialAteTs.toMillis ? loja.trialAteTs.toMillis() : Date.parse(dia || 0);
    return ate > Date.now();
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
      var loja;
      try {
        loja = p.l ? await plat.lojaPorSlug(p.l) : await plat.lojaPorDominio(location.hostname);
      } catch (e) {
        var motivo = String((e && (e.message || e.code)) || e);
        // chave do navegador sem este domínio na lista de sites: o Google recusa pelo "referer"
        if (/referer|referrer|API_KEY|api key|blocked/i.test(motivo)) {
          console.warn('[vitrine] domínio não liberado na chave do navegador:', location.hostname, motivo);
          throw new Error(p.diag ? 'Este domínio (' + location.hostname + ') ainda não foi liberado na chave do navegador: Google Cloud › Credenciais › Restrições de aplicativo › Sites.' : 'Loja em configuração. Volte em alguns minutos.');
        }
        throw new Error(p.diag ? 'Erro ao ler a loja: ' + motivo : 'Não foi possível abrir a loja agora. Tente de novo em instantes.');
      }
      if (!loja) throw new Error('Loja não encontrada. Confira o link ou fale com o suporte.');
      if (loja.status !== 'ativa' && !testeValido(loja)) throw new Error(loja.status === 'teste' ? 'O teste grátis desta loja terminou. Fale com a loja pelo Instagram.' : 'Esta loja ainda não está no ar.');
      if (!SLUG.test(String(loja.vitrine || ''))) throw new Error('Esta loja ainda não tem vitrine.');
      var itens = loja.lojaId && plat.itensDaLoja ? await plat.itensDaLoja(loja.lojaId).catch(function () { return []; }) : [];
      return { vitrine: loja.vitrine, marca: loja.marca, base: { l: loja.slug }, loja: true, itens: await emBlob(itens) };
    }
    // 2) prévia do montador: rascunho guardado neste navegador
    if (p.rascunho && window.Rascunho) {
      var rz = await window.Rascunho.ler();
      if (rz && rz.loja) {
        var vit = SLUG.test(String(rz.vitrine || '')) ? rz.vitrine : (p.v || 'vinho-delicado');
        var itR = rz.itens && rz.itens.length ? await emBlob(rz.itens) : await itensDemo(vit);
        return { vitrine: vit, marca: plat.marcaDaLoja(rz.loja), base: { v: vit, rascunho: true }, itens: itR };
      }
    }
    // 3) demonstração de uma vitrine do catálogo
    var slug = p.v || 'ais';
    if (!SLUG.test(slug)) throw new Error('Endereço de vitrine inválido.');
    return { vitrine: slug, marca: null, base: { v: slug }, itens: await itensDemo(slug) };
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
      src = applyTokens(src, r.marca);
      if (r.itens && r.itens.length && window.Catalogo) src = window.Catalogo.aplicar(src, PAGES[page], r.itens, { item: p.item });
      src = rewriteLinks(src, r.base);
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
