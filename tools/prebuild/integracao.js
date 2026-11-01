#!/usr/bin/env node
/*
 * integracao.js — confere se um modelo novo aparece certo no site de vendas, no montador e no painel.
 * Complementa o conferir.js (que olha as telas da vitrine). Roda com o modo demonstração, sem Firebase.
 *
 *   python3 -m http.server 8800            (na raiz do repositório, em outro terminal)
 *   node tools/prebuild/integracao.js http://127.0.0.1:8800 arena
 *
 * Confere:
 *   1. Site de vendas: botão do modelo, troca do provador (iframe com <prefixo><cor>), 15 amostras na galeria
 *      e o modelo no formulário de pedido. No celular, ?vitrine=<prefixo><cor> abre o modelo.
 *   2. Montador: cartão do modelo, as bolinhas de cor na barra da prévia e a troca de cor dentro do iframe (1440 e 390).
 *   3. Loja de verdade (rascunho com peças, WhatsApp e Instagram): o pedido sai pelo WhatsApp com a peça certa.
 *   4. Painel (modo demonstração): o modelo aparece agrupado na tela Vitrines.
 * Sai com código 1 se achar problema.
 */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const base = (process.argv[2] || 'http://127.0.0.1:8800').replace(/\/$/, '');
const alvo = process.argv[3] || 'arena';

(async () => {
  const raiz = path.resolve(__dirname, '..', '..');
  const modelos = JSON.parse(fs.readFileSync(path.join(raiz, 'vitrines/_modelos/modelos.json'), 'utf8')).modelos;
  const m = modelos.find((x) => x.slug === alvo);
  if (!m || !m.prefixo) throw new Error('Modelo não encontrado (ou é o modelo 1): ' + alvo);
  const cores = Object.keys(m.cores || {});
  const c1 = m.prefixo + cores[0], c2 = m.prefixo + (cores[2] || cores[0]);
  const b = await chromium.launch();
  const problemas = [];
  const falha = (onde, msg) => problemas.push(onde + ': ' + msg);
  const nova = async (w, onde) => {
    const ctx = await b.newContext({ viewport: { width: w, height: 900 } });
    // modo demonstração: a apiKey servida vira o marcador "COLE_AQUI" (nada é impresso)
    await ctx.route('**/config/plataforma.config.js', async (r) => {
      const res = await r.fetch();
      const corpo = (await res.text()).replace(/apiKey:\s*'[^']*'/, "apiKey: 'COLE_AQUI_A_API_KEY'");
      await r.fulfill({ response: res, body: corpo });
    });
    const pg = await ctx.newPage();
    pg.on('pageerror', (e) => falha(onde, 'erro de JavaScript: ' + e.message));
    pg.on('response', (r) => { if (r.status() >= 400 && r.url().startsWith(base)) falha(onde, r.status() + ' ' + r.url().slice(base.length)); });
    return pg;
  };
  const espera = (pg, ms) => pg.waitForTimeout(ms);

  // 1. site de vendas
  let pg = await nova(1440, 'site');
  await pg.goto(base + '/index.html', { waitUntil: 'networkidle' }); await espera(pg, 600);
  const botao = await pg.$('.pv-modelos [data-modelo="' + m.slug + '"]');
  if (!botao) falha('site', 'sem botão do modelo no provador');
  else {
    await botao.click(); await espera(pg, 1500);
    const s = await pg.evaluate(() => ({
      iframe: (document.querySelector('#pv-vidro iframe') || {}).src || '',
      amostras: document.querySelectorAll('.pv-amostra').length,
      opcoes: Array.from(document.querySelectorAll('#pv-sel-vitrine option')).map((o) => o.value),
    }));
    if (!s.iframe.includes('v=' + m.prefixo)) falha('site', 'provador não abriu o modelo (' + s.iframe + ')');
    if (s.amostras < cores.length) falha('site', 'galeria com ' + s.amostras + ' amostras (esperava ' + cores.length + ')');
    if (!s.opcoes.includes(c1)) falha('site', 'formulário sem a opção ' + c1);
    console.log('site', JSON.stringify({ iframe: s.iframe.split('?')[1], amostras: s.amostras, opcoes: s.opcoes.length }));
  }
  pg = await nova(390, 'site celular');
  await pg.goto(base + '/index.html?vitrine=' + c2, { waitUntil: 'networkidle' }); await espera(pg, 1500);
  const cel = await pg.evaluate(() => ({ nome: (document.querySelector('#pv-nome') || {}).textContent, sw: document.documentElement.scrollWidth, sel: (document.querySelector('#pv-sel-vitrine') || {}).value }));
  if (cel.sw > 392) falha('site celular', 'rolagem para o lado (' + cel.sw + 'px)');
  if (cel.sel !== c2) falha('site celular', '?vitrine= não escolheu ' + c2 + ' (ficou ' + cel.sel + ')');
  console.log('site celular', JSON.stringify(cel));

  // 2. montador
  for (const w of [1440, 390]) {
    pg = await nova(w, 'montador ' + w);
    await pg.goto(base + '/montar/?vitrine=' + c1, { waitUntil: 'networkidle' }); await espera(pg, 1200);
    if (w < 900) { const v = await pg.$('#mt-ver-previa'); if (v) { await v.click(); await espera(pg, 500); } }
    const n = await pg.$$eval('#mt-previa-cores .mt-cor', (l) => l.length);
    if (n !== cores.length) falha('montador ' + w, n + ' bolinhas de cor (esperava ' + cores.length + ')');
    await pg.click('#mt-previa-cores .mt-cor[data-vitrine="' + c2 + '"]'); await espera(pg, 2500);
    const src = await pg.$eval('#mt-iframe', (f) => f.src);
    if (!src.includes('v=' + c2)) falha('montador ' + w, 'a prévia não trocou para ' + c2);
    const fr = pg.frame({ url: /vitrine\.html/ });
    // a raiz de cada modelo tem a classe com o slug do modelo (ex.: .arena) e as cores em variáveis CSS
    const acc = fr ? await fr.evaluate((cls) => { const el = document.querySelector('.' + cls) || document.body; return getComputedStyle(el).getPropertyValue('--accent').trim(); }, m.slug) : '';
    const esperado = (m.cores[c2.slice(m.prefixo.length)] || {}).accent || '';
    if (esperado && acc.toLowerCase() !== esperado.toLowerCase()) falha('montador ' + w, 'cor de destaque no iframe ' + acc + ' (esperava ' + esperado + ')');
    const sw = await pg.evaluate(() => document.documentElement.scrollWidth);
    if (sw > w + 2) falha('montador ' + w, 'rolagem para o lado (' + sw + 'px)');
    console.log('montador ' + w, JSON.stringify({ bolinhas: n, accent: acc }));
  }

  // 3. loja de verdade (rascunho) até o pedido no WhatsApp
  pg = await nova(1440, 'loja');
  await pg.goto(base + '/montar/', { waitUntil: 'networkidle' });
  await pg.evaluate(async (v) => {
    const d = await (await fetch('../vitrines/demo-catalogo.json')).json();
    const itens = d.itens.slice(0, 16);
    await window.Rascunho.gravar({ loja: { nome: 'Lua Fit Moda', marcaCurta: 'Lua Fit', marcaSub: 'MODA FITNESS', cidade: 'Campo Grande, MS', instagram: 'luafit', whatsappLoja: '67999998888', plano: 'loja' }, vitrine: v, itens, atualizado: Date.now() });
  }, c1);
  await pg.goto(base + '/vitrine.html?rascunho=1&v=' + c1 + '&p=produto', { waitUntil: 'networkidle' }); await espera(pg, 800);
  const peca = await pg.evaluate(() => (document.querySelector('h1') || {}).textContent || '');
  const comprar = await pg.$('.compra .btn');
  if (!comprar) falha('loja', 'tela de produto sem botão de compra (.compra .btn)');
  else {
    await comprar.click(); await espera(pg, 300);
    await pg.goto(base + '/vitrine.html?rascunho=1&v=' + c1 + '&p=sacola', { waitUntil: 'networkidle' }); await espera(pg, 600);
    let aberto = null;
    await pg.exposeFunction('__abriu', (u) => { aberto = u; });
    await pg.evaluate(() => { window.open = (u) => { window.__abriu(u); return null; }; });
    const nome = await pg.$('input[autocomplete="name"]'); if (nome) await nome.fill('Ana');
    const cep = await pg.$('input[autocomplete="postal-code"]'); if (cep) await cep.fill('79002000');
    // o botão de envio é o do formulário que tem o nome de quem compra (o topo também tem um form de busca)
    const enviar = (await pg.evaluateHandle(() => { const i = document.querySelector('input[autocomplete="name"]'); const f = i && i.closest('form'); return f && f.querySelector('button[type="submit"]'); })).asElement();
    if (enviar) { await enviar.click(); await espera(pg, 500); } else falha('loja', 'sacola sem formulário de pedido');
    const txt = aberto ? decodeURIComponent(aberto) : '';
    if (!txt.includes('wa.me/5567999998888')) falha('loja', 'pedido não abriu o WhatsApp da loja');
    if (peca && !txt.includes(peca.trim().slice(0, 12))) falha('loja', 'a mensagem do pedido não tem a peça "' + peca.trim() + '"');
    console.log('loja', JSON.stringify({ peca: peca.trim(), whatsapp: txt.slice(0, 90) }));
  }

  // 4. painel (modo demonstração: qualquer e-mail entra)
  pg = await nova(1440, 'painel');
  await pg.goto(base + '/painel/', { waitUntil: 'networkidle' }); await espera(pg, 600);
  const email = await pg.$('input[type="email"]');
  if (email) { await email.fill('dono@exemplo.test'); await pg.click('button[type="submit"]'); await espera(pg, 1200); }
  await pg.goto(base + '/painel/#vitrines', { waitUntil: 'networkidle' }); await espera(pg, 1200);
  const pn = await pg.evaluate(() => ({ grupos: Array.from(document.querySelectorAll('.mg-vitrines h3')).map((x) => x.textContent) }));
  if (!pn.grupos.some((g) => g.includes(m.nome))) falha('painel', 'sem grupo "' + m.nome + '" na tela Vitrines');
  console.log('painel', JSON.stringify(pn));

  await b.close();
  if (problemas.length) { console.log('\nPROBLEMAS (' + problemas.length + '):\n- ' + problemas.join('\n- ')); process.exit(1); }
  console.log('\nTudo certo: ' + m.nome + ' no site de vendas, no montador, na loja e no painel.');
})().catch((e) => { console.error(e); process.exit(1); });
