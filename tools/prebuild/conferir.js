#!/usr/bin/env node
/*
 * conferir.js — confere um pré-build (modelo de site) no navegador antes de publicar.
 *
 *   python3 -m http.server 8800            (na raiz do repositório, em outro terminal)
 *   node tools/prebuild/conferir.js http://127.0.0.1:8800 arena-grafite-lima
 *   node tools/prebuild/conferir.js http://127.0.0.1:8800 arena --todas-as-cores --saida /tmp/fotos
 *
 * Para cada tela (inicio, colecao, produto, sacola) e largura (1440 e 390) abre vitrine.html?v=<slug>&p=<tela>
 * e aponta: erro de JavaScript, arquivo que não carregou, foto quebrada e rolagem para o lado.
 * Também faz a compra de ponta a ponta: escolhe tamanho, põe na sacola e confere a sacola.
 * Precisa do Playwright (require('playwright')). Sai com código 1 se achar problema.
 */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
const base = (args[0] || 'http://127.0.0.1:8800').replace(/\/$/, '');
let alvo = args[1] || 'arena-grafite-lima';
const opc = (k) => { const i = args.indexOf(k); return i >= 0 ? (args[i + 1] || true) : null; };
const larguras = String(opc('--larguras') || '1440,390').split(',').map(Number);
const paginas = String(opc('--paginas') || 'inicio,colecao,produto,sacola').split(',');
const saida = opc('--saida');
if (saida) fs.mkdirSync(saida, { recursive: true });

(async () => {
  const raiz = path.resolve(__dirname, '..', '..');
  const modelos = JSON.parse(fs.readFileSync(path.join(raiz, 'vitrines/_modelos/modelos.json'), 'utf8')).modelos;
  let slugs = [alvo];
  if (opc('--todas-as-cores')) {
    const m = modelos.find((x) => x.slug === alvo || x.prefixo === alvo + '-');
    if (!m || !m.cores) throw new Error('Modelo sem tabela de cores: ' + alvo);
    slugs = Object.keys(m.cores).map((c) => m.prefixo + c);
  }
  const b = await chromium.launch();
  const problemas = [];
  for (const slug of slugs) {
    for (const w of larguras) {
      const ctx = await b.newContext({ viewport: { width: w, height: 900 } });
      const pg = await ctx.newPage();
      const erros = [];
      pg.on('pageerror', (e) => erros.push('js: ' + e.message));
      // "Failed to load resource" já aparece pelos eventos de rede abaixo (só os do próprio site contam)
      pg.on('console', (m) => { if (m.type() === 'error' && !/^Failed to load resource/.test(m.text())) erros.push('console: ' + m.text()); });
      pg.on('requestfailed', (r) => { if (r.url().startsWith(base)) erros.push('falhou: ' + r.url().slice(base.length)); });
      pg.on('response', (r) => { if (r.status() >= 400 && r.url().startsWith(base)) erros.push(r.status() + ': ' + r.url().slice(base.length)); });
      for (const p of paginas) {
        erros.length = 0;
        await pg.goto(`${base}/vitrine.html?v=${slug}&p=${p}`, { waitUntil: 'networkidle' });
        await pg.waitForTimeout(400);
        await pg.evaluate(async () => { for (let y = 0; y < document.documentElement.scrollHeight; y += 700) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 60)); } window.scrollTo(0, 0); });
        await pg.waitForLoadState('networkidle');
        await pg.evaluate(() => document.fonts.ready);
        const info = await pg.evaluate(() => ({
          h: document.documentElement.scrollHeight,
          sw: document.documentElement.scrollWidth,
          erroTela: (document.querySelector('.vl-erro') || {}).textContent || '',
          quebradas: Array.from(document.images).filter((i) => i.complete && i.naturalWidth === 0).map((i) => i.getAttribute('src')),
          fontes: Array.from(document.fonts).filter((f) => f.status === 'error').map((f) => f.family)
        }));
        const linha = { slug, w, p, h: info.h };
        const ruim = [];
        if (info.erroTela) ruim.push('tela de erro: ' + info.erroTela.trim().slice(0, 120));
        if (info.sw > w) ruim.push('rola para o lado (' + info.sw + 'px)');
        if (info.quebradas.length) ruim.push('fotos quebradas: ' + info.quebradas.slice(0, 3).join(', '));
        if (info.fontes.length) ruim.push('fontes sem carregar: ' + info.fontes.join(', '));
        ruim.push(...erros);
        if (ruim.length) { linha.problemas = ruim; problemas.push(linha); }
        console.log(JSON.stringify(linha));
        if (saida) await pg.screenshot({ path: path.join(saida, `${slug}_${p}_${w}.png`), fullPage: true });
      }
      // compra de ponta a ponta (só na primeira cor, para não demorar)
      if (slug === slugs[0] && paginas.includes('produto') && paginas.includes('sacola')) {
        await pg.evaluate(() => localStorage.clear());
        await pg.goto(`${base}/vitrine.html?v=${slug}&p=produto`, { waitUntil: 'networkidle' });
        if (!(await pg.$('.compra .btn'))) { console.log(JSON.stringify({ fluxo: slug, w, pulado: 'esta tela de produto não tem o botão .compra .btn (modelo antigo)' })); await ctx.close(); continue; }
        const tam = await pg.$('.tams .tam:not(.fora)');
        if (tam) await tam.click();
        await pg.click('.compra .btn');
        await pg.waitForTimeout(200);
        const ok = await pg.$eval('.ok', (e) => e.textContent).catch(() => '');
        const conta = await pg.$eval('.top .count', (e) => e.textContent).catch(() => '');
        await pg.goto(`${base}/vitrine.html?v=${slug}&p=sacola`, { waitUntil: 'networkidle' });
        const linhas = await pg.$$eval('.linha', (l) => l.length);
        const r = { fluxo: slug, w, aviso: ok.trim().slice(0, 80), contador: conta, linhasNaSacola: linhas };
        if (!ok || conta !== '1' || linhas !== 1) { r.problemas = ['a compra não chegou na sacola']; problemas.push(r); }
        console.log(JSON.stringify(r));
      }
      await ctx.close();
    }
  }
  await b.close();
  console.log(problemas.length ? `\n${problemas.length} problema(s).` : '\nTudo certo.');
  process.exit(problemas.length ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
