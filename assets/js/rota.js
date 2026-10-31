/* Se a raiz do site abrir num domínio de loja (ex.: aismodafitness.com.br), mostra a vitrine,
 * não o site de vendas. Precisa de config/plataforma.config.js carregado antes. */
(function () {
  var cfg = window.PROVADOR_CONFIG || {}, h = location.hostname.toLowerCase();
  var plataforma = !h || h === 'localhost' || /^\d+\.\d+\.\d+\.\d+$/.test(h) || (cfg.hostsDaPlataforma || []).indexOf(h) >= 0 || /\.web\.app$|\.firebaseapp\.com$|\.github\.io$/.test(h);
  if (!plataforma) location.replace('vitrine.html' + location.search + location.hash);
})();
