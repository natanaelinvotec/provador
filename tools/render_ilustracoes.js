// Renderiza tools/ilustracoes.json em PNG transparente (vitrines/_ilustracoes/).
const fs = require('fs'); const path = require('path'); const { chromium } = require('playwright');
(async () => {
  const pages = JSON.parse(fs.readFileSync(path.join(__dirname, 'ilustracoes.json'), 'utf8'));
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 720, height: 900 } });
  for (const [n, svg] of Object.entries(pages)) {
    await p.setContent(`<html><body style="margin:0;background:transparent">${svg}</body></html>`);
    await p.screenshot({ path: path.join(__dirname, '..', 'vitrines', '_ilustracoes', n + '.png'), omitBackground: true });
  }
  await b.close(); console.log('ok', Object.keys(pages).length);
})();
