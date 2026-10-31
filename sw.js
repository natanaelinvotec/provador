/* Service worker do Provador: guarda só arquivos que quase nunca mudam (fontes e imagens).
 * Páginas, scripts e dados vão sempre à rede, para nenhum deploy ficar preso no cache.
 * Mude VERSAO a cada deploy que trocar fontes ou imagens. */
const VERSAO = '2026.10.30-1';
const CACHE = 'provador-' + VERSAO;
const GUARDAR = /\/(assets\/fonts|assets\/img|vitrines\/_ilustracoes|vitrines\/ais\/img)\//;

self.addEventListener('install', (e) => { self.skipWaiting(); });
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k.startsWith('provador-') && k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin || !GUARDAR.test(u.pathname)) return;
  e.respondWith(caches.open(CACHE).then((c) => c.match(e.request).then((achou) => achou || fetch(e.request).then((r) => {
    if (r.ok) c.put(e.request, r.clone());
    return r;
  }))));
});
