// telas.js — fotografa as telas de verdade do Provador com a loja de exemplo "Lua Fit Moda" (modo demonstração).
// Saída em assets/img/painel/: <tela>.jpg (1440 × 900), <tela>-p.jpg (720 × 450), cel-*.jpg (780 × 1688) e modelos/m-*.jpg.
// Uso: servir a raiz do repositório (python3 -m http.server 8813) e rodar  node tools/portfolio/telas.js
// O workflow .github/workflows/portfolio.yml faz isso sozinho e grava o resultado na main.
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const RAIZ = path.resolve(__dirname, '..', '..');
const BASE = process.env.BASE || 'http://127.0.0.1:8813';
const OUT = path.join(RAIZ, 'assets/img/painel');
const FOTOS = path.join(RAIZ, 'vitrines/_fotos');
const VIT = 'bloco-pink-pulse';
const TOKEN = 'LuaPedido2088AcompanharX';
const log = (...a) => console.log(...a);
fs.mkdirSync(path.join(OUT, 'modelos'), { recursive: true });

// estoque por peça do catálogo de demonstração (alguns tamanhos zerados para os avisos aparecerem)
const EST = {
  c1: { P: 4, M: 6, G: 3, GG: 2 }, c2: { P: 2, M: 0, G: 1 }, c3: { P: 5, M: 7, G: 4, GG: 2 }, c4: { P: 3, M: 4, G: 0 },
  m1: { P: 3, M: 2, G: 0 }, m2: { P: 2, M: 3, G: 2, GG: 1 }, m3: { P: 4, M: 1, G: 2 }, q1: { P: 5, M: 6, G: 3 },
  q2: { P: 2, M: 4, G: 3, GG: 1 }, l1: { P: 7, M: 9, G: 5, GG: 3 }, l2: { P: 3, M: 2, G: 1 }, t1: { P: 1, M: 4, G: 3 },
  t2: { P: 6, M: 8, G: 5, GG: 2 }, a1: { U: 12 }, a3: { U: 20 }, a4: { U: 9 }, a5: { U: 15 }, a6: { U: 7 }, a7: { U: 5 }
};
// cada modelo numa cor, para o portfólio mostrar variedade
const CORES = { classico: 'vinho-delicado', arena: 'grafite-lima', pulso: 'laranja-energia', aura: 'lavanda-suave', impacto: 'preto-puro', cetim: 'rubi-dourado', trilha: 'verde-mata', vibe: 'pink-pulse', leve: 'areia-oliva', nobre: 'editorial-bronze', ritmo: 'azul-atleta', contraste: 'marinho-classico', studio: 'caramelo', bloco: 'pink-pulse', foco: 'ceu-pastel' };

async function contexto(b, w, h, extra) {
  const ctx = await b.newContext(Object.assign({ viewport: { width: w, height: h }, deviceScaleFactor: w < 500 ? 2 : 1, locale: 'pt-BR', timezoneId: 'America/Campo_Grande' }, extra || {}));
  // sem chave do Firebase: tudo roda no modo demonstração, dentro do navegador do robô
  await ctx.route('**/config/plataforma.config.js', async (r) => {
    const res = await r.fetch();
    await r.fulfill({ response: res, body: (await res.text()).replace(/apiKey:\s*'[^']*'/, "apiKey: 'COLE_AQUI_A_API_KEY'") });
  });
  await ctx.route('https://fonts.googleapis.com/**', (r) => r.fulfill({ status: 200, contentType: 'text/css', body: '' }));
  await ctx.route('https://fonts.gstatic.com/**', (r) => r.abort());
  await ctx.route('https://wa.me/**', (r) => r.fulfill({ status: 200, contentType: 'text/html', body: '<p>wa</p>' }));
  await ctx.route('https://www.gstatic.com/**', (r) => r.abort());
  return ctx;
}

(async () => {
  const b = await chromium.launch();
  // versão pequena (720 px) de cada tela, para o celular e para o PDF
  const red = await (await b.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 0.5 })).newPage();
  async function foto(pg, nome, opts) {
    const arq = path.join(OUT, nome + '.jpg');
    await pg.screenshot(Object.assign({ path: arq, type: 'jpeg', quality: 80 }, opts || {}));
    if (!/^cel-/.test(nome) && !(opts && opts.fullPage)) {
      await red.setContent('<body style="margin:0"><img src="data:image/jpeg;base64,' + fs.readFileSync(arq).toString('base64') + '" style="display:block;width:1440px;height:900px">');
      await red.screenshot({ path: path.join(OUT, nome + '-p.jpg'), type: 'jpeg', quality: 78 });
    }
    log('  ' + nome);
  }
  const erros = [];

  // ---------- 1. montador: modelo e provador de fotos ----------
  const ctx = await contexto(b, 1440, 900);
  const pg = await ctx.newPage();
  pg.on('pageerror', (e) => erros.push(e.message));
  await pg.goto(BASE + '/montar/', { waitUntil: 'networkidle' }); await pg.waitForTimeout(800);
  const vals = { nome: 'Lua Fit Moda', marcaCurta: 'Lua Fit', marcaSub: 'MODA FITNESS', cidade: 'Campo Grande, MS', instagram: 'luafitmoda', whatsappLoja: '(67) 99999-0000', donoNome: 'Luana' };
  for (const k of Object.keys(vals)) { const el = await pg.$('[name="' + k + '"]'); if (el) await el.fill(vals[k]); }
  await pg.waitForTimeout(500);
  await pg.click('[data-acao="continuar"]'); await pg.waitForTimeout(900);
  const vin = (await pg.$('[data-vitrine="' + VIT + '"]')) || (await pg.$('[data-vitrine="pink-pulse"]')); if (vin) await vin.click();
  await pg.waitForTimeout(1500);
  await foto(pg, 'montar-modelo');
  await pg.click('[data-acao="continuar"]'); await pg.waitForTimeout(900);
  await pg.setInputFiles('#mt-arquivos', ['c3.jpg', 'c4.jpg', 'c1.jpg'].map((f) => path.join(FOTOS, f)));
  await pg.waitForFunction(() => document.querySelectorAll('.mt-peca').length >= 3, null, { timeout: 60000 });
  await pg.waitForTimeout(800);
  const NM = ['Conjunto Leve', 'Conjunto Leve', 'Conjunto Essencial'];
  const nomes = await pg.$$('.mt-peca [data-campo="nome"]');
  for (let k = 0; k < nomes.length; k++) { await nomes[k].fill(NM[k] || 'Conjunto Leve'); await nomes[k].dispatchEvent('change'); }
  for (const p of await pg.$$('.mt-peca [data-campo="preco"]')) { await p.fill('179.90'); await p.dispatchEvent('change'); }
  await pg.waitForTimeout(2500);
  await pg.addStyleTag({ content: '#mt-toast{display:none!important}' });
  await pg.evaluate(() => { const c = document.querySelector('.mt-corpo'), l = document.querySelector('.mt-pecas'); if (c && l) c.scrollTop = l.offsetTop - 90; });
  await pg.waitForTimeout(500);
  await foto(pg, 'montar-pecas');

  // ---------- 2. loja Lua Fit Moda publicada (demonstração) ----------
  await pg.goto(BASE + '/montar/', { waitUntil: 'networkidle' });
  const DEMO = JSON.parse(fs.readFileSync(path.join(RAIZ, 'vitrines/demo-catalogo.json'), 'utf8')).itens;
  const slug = await pg.evaluate(async ({ DEMO, EST, VIT }) => {
    localStorage.clear(); sessionStorage.clear();
    const conta = await window.Plataforma.criarContaLojista('contato@luafitmoda.com.br');
    const itens = DEMO.map((x, k) => Object.assign({}, x, { ordem: k }));
    await window.Plataforma.publicarLojaSozinha({ loja: { nome: 'Lua Fit Moda', marcaCurta: 'Lua Fit', marcaSub: 'MODA FITNESS', cidade: 'Campo Grande, MS', instagram: 'luafitmoda', whatsappLoja: '67999990000', donoNome: 'Luana', plano: 'completo' }, vitrine: VIT, itens }, conta);
    const d = JSON.parse(localStorage.getItem('provador:demo:v1'));
    const lista = d.catalogos[conta.uid];
    const p = (n) => String(n).padStart(2, '0'), fut = new Date(Date.now() + 2 * 864e5);
    lista.forEach((i) => { if (EST[i.id]) i.estoque = EST[i.id]; if (i.id === 'm1') i.vipAte = fut.getFullYear() + '-' + p(fut.getMonth() + 1) + '-' + p(fut.getDate()) + 'T10:00'; });
    localStorage.setItem('provador:demo:v1', JSON.stringify(d));
    return d.lojas[conta.uid].slug;
  }, { DEMO, EST, VIT });
  log('loja', slug);

  // ---------- 3. painel da loja ----------
  await pg.goto(BASE + '/loja/#hoje', { waitUntil: 'networkidle' }); await pg.waitForTimeout(900);
  await pg.addStyleTag({ content: '#lj-toast{display:none!important}' });
  const ex = await pg.$('[data-acao="exemplos"]'); if (ex) { await ex.click(); await pg.waitForTimeout(1500); }
  const ir = async (a) => { await pg.evaluate((x) => { location.hash = '#' + x; }, a); await pg.waitForTimeout(700); await pg.evaluate(() => window.scrollTo(0, 0)); };
  await ir('hoje'); await foto(pg, 'hoje');
  await ir('vender');
  const codigos = await pg.evaluate(() => (window.Gestao ? [window.Gestao.codigo({ id: 'c3' }, 'M'), window.Gestao.codigo({ id: 'l1' }, 'G'), window.Gestao.codigo({ id: 'a1' }, 'U')] : []));
  for (const c of codigos) { await pg.fill('#lj-codigo', c); await pg.press('#lj-codigo', 'Enter'); await pg.waitForTimeout(500); }
  await pg.evaluate(() => { const n = document.querySelector('[data-venda="cliente.nome"]'); if (n) { n.value = 'Carla Mendes'; n.dispatchEvent(new Event('input', { bubbles: true })); } });
  await pg.waitForTimeout(300); await foto(pg, 'vender');
  await ir('pedidos'); await foto(pg, 'pedidos');
  await ir('estoque'); await foto(pg, 'estoque');
  await pg.click('[data-acao="est-vista"][data-v="etiquetas"]'); await pg.waitForTimeout(500);
  for (const m of (await pg.$$('input[data-acao="etq-peca"]')).slice(0, 3)) { await m.check(); await pg.waitForTimeout(200); }
  await pg.waitForTimeout(600); await foto(pg, 'etiquetas');
  await ir('caixa'); await foto(pg, 'caixa');
  await ir('relatorios'); await pg.waitForTimeout(500); await foto(pg, 'relatorios');
  await ir('clientes'); await foto(pg, 'clientes');
  await ir('canais'); await pg.waitForTimeout(900);
  const lig = await pg.$('button:has-text("Ligar os canais de venda")'); if (lig) { await lig.click(); await pg.waitForTimeout(900); }
  await pg.evaluate(() => window.scrollTo(0, 0)); await pg.waitForTimeout(300);
  await foto(pg, 'canais');

  // ---------- 4. a loja no celular da cliente ----------
  const estado = await pg.evaluate(() => localStorage.getItem('provador:demo:v1'));
  const mob = await contexto(b, 390, 844, { isMobile: true, hasTouch: true, userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Mobile Safari/537.36' });
  const m = await mob.newPage();
  m.on('pageerror', (e) => erros.push('cel: ' + e.message));
  await m.goto(BASE + '/vitrine.html?v=' + VIT, { waitUntil: 'domcontentloaded' });
  await m.evaluate(({ estado, TOKEN, slug }) => {
    const d = JSON.parse(estado);
    const uid = Object.keys(d.lojas).filter((k) => d.lojas[k].slug === slug)[0];
    d.acompanhar = d.acompanhar || {};
    d.acompanhar[TOKEN] = { lojaId: uid, slug: slug, loja: 'Lua Fit Moda', numero: '2088', status: 'enviado', itens: [{ nome: 'Conjunto Leve azul', tam: 'M', qtd: 1 }, { nome: 'Garrafa térmica 750 ml', tam: 'U', qtd: 1 }], atualizadoEm: new Date().toISOString() };
    localStorage.setItem('provador:demo:v1', JSON.stringify(d));
  }, { estado, TOKEN, slug });
  await m.goto(BASE + '/vitrine.html?l=' + slug, { waitUntil: 'networkidle' }); await m.waitForTimeout(1800);
  await foto(m, 'cel-inicio');
  const vipBtn = await m.$('#vx-barra .vx-vip');
  if (vipBtn) { await vipBtn.click(); await m.waitForTimeout(400); await m.fill('#vx-nome', 'Juliana Prado').catch(() => {}); await m.fill('#vx-whats', '67988887777').catch(() => {}); await m.waitForTimeout(200); await foto(m, 'cel-vip'); await m.click('[role="dialog"] .vx-fechar').catch(() => {}); }
  await m.goto(BASE + '/vitrine.html?l=' + slug + '&p=produto&item=conjuntos-conjunto-pilates', { waitUntil: 'networkidle' }); await m.waitForTimeout(1800);
  const av = await m.$('#app .vx-avise-link, #app .vx-avise button, #app .vx-esgotado button');
  if (av) { await av.scrollIntoViewIfNeeded(); await m.waitForTimeout(300); await foto(m, 'cel-produto'); await av.click(); await m.waitForTimeout(400); await m.fill('#vx-nome', 'Bianca Lima').catch(() => {}); await foto(m, 'cel-avise'); await m.click('[role="dialog"] .vx-fechar').catch(() => {}); }
  else await foto(m, 'cel-produto');
  await m.goto(BASE + '/vitrine.html?l=' + slug + '&acompanhar=' + TOKEN, { waitUntil: 'networkidle' }); await m.waitForTimeout(1500);
  await foto(m, 'cel-acompanhar');
  await m.goto(BASE + '/vitrine.html?l=' + slug, { waitUntil: 'networkidle' }); await m.waitForTimeout(1500);
  const inst = await m.$('.vx-instalar, [data-vx="instalar"], button:has-text("Instalar")');
  if (inst) { await inst.click(); await m.waitForTimeout(500); await foto(m, 'cel-instalar'); }

  // ---------- 5. a loja no computador e nos 15 modelos ----------
  const dk = await contexto(b, 1440, 900);
  const dp = await dk.newPage();
  dp.on('pageerror', (e) => erros.push('pc: ' + e.message));
  await dp.goto(BASE + '/vitrine.html?v=' + VIT, { waitUntil: 'domcontentloaded' });
  await dp.evaluate((e) => localStorage.setItem('provador:demo:v1', e), estado);
  await dp.goto(BASE + '/vitrine.html?l=' + slug, { waitUntil: 'networkidle' }); await dp.waitForTimeout(2200);
  await foto(dp, 'vitrine');
  const modelos = JSON.parse(fs.readFileSync(path.join(RAIZ, 'vitrines/_modelos/modelos.json'), 'utf8')).modelos;
  const peq = await (await contexto(b, 1440, 900, { deviceScaleFactor: 0.5 })).newPage();
  await peq.goto(BASE + '/vitrine.html?v=' + VIT, { waitUntil: 'domcontentloaded' });
  for (const mo of modelos) {
    const cor = CORES[mo.slug] || 'pink-pulse', v = (mo.prefixo || '') + cor;
    await peq.evaluate(({ estado, slug, v }) => {
      const d = JSON.parse(estado);
      Object.keys(d.lojas).forEach((k) => { if (d.lojas[k].slug === slug) d.lojas[k].vitrine = v; });
      localStorage.setItem('provador:demo:v1', JSON.stringify(d));
    }, { estado, slug, v });
    await peq.goto(BASE + '/vitrine.html?l=' + slug, { waitUntil: 'networkidle' }); await peq.waitForTimeout(2000);
    await peq.addStyleTag({ content: '#vx-barra{display:none!important}' });
    await peq.screenshot({ path: path.join(OUT, 'modelos', 'm-' + mo.slug + '.jpg'), type: 'jpeg', quality: 78 });
    log('  modelo ' + mo.numero + ' ' + mo.slug + ' (' + v + ')');
  }
  fs.writeFileSync(path.join(OUT, 'modelos', 'modelos.json'), JSON.stringify(modelos.map((mo) => ({ numero: mo.numero, slug: mo.slug, nome: mo.nome, cor: CORES[mo.slug] })), null, 1));
  console.log('erros nas páginas:', erros.length ? erros.slice(0, 8) : 'nenhum');
  await b.close();
  if (erros.length) process.exitCode = 1;
})();
