// Gera as miniaturas das vitrines (assets/img/vitrines/<slug>.png) a partir do servidor local.
// Uso: node tools/miniaturas.js http://127.0.0.1:8790
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const base = process.argv[2] || 'http://127.0.0.1:8790';
const raiz = path.join(__dirname, '..');
const cat = JSON.parse(fs.readFileSync(path.join(raiz, 'vitrines/catalogo.json'), 'utf8'));
(async () => {
  const b = await chromium.launch();
  const pg = await b.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 });
  const erros = [];
  pg.on('pageerror', e => erros.push(e.message));
  for (const v of cat) {
    await pg.goto(base + '/vitrine.html?v=' + v.slug, { waitUntil: 'networkidle' });
    await pg.waitForTimeout(700);
    await pg.screenshot({ path: path.join(raiz, 'assets/img/vitrines', v.slug + '.png') });
    // celular, para o hero do site de vendas
    await pg.setViewportSize({ width: 390, height: 780 });
    await pg.waitForTimeout(400);
    await pg.screenshot({ path: path.join(raiz, 'assets/img/vitrines', v.slug + '-cel.png') });
    await pg.setViewportSize({ width: 1280, height: 800 });
    console.log('ok', v.slug);
  }
  console.log('erros:', erros.length ? erros : 'nenhum');
  await b.close();
})();
