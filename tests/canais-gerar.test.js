// node --test tests/  — workflow dos canais contra um Firestore REST de mentira
const test = require('node:test');
const assert = require('node:assert');
const http = require('http');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFile, execFileSync } = require('child_process');
const { promisify } = require('util');
const execFileP = promisify(execFile);

const JPG = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQ==';
const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUg==';
const amanha = new Date(Date.now() + 864e5).toISOString();
const ontem = new Date(Date.now() - 864e5).toISOString();

// valores no formato da API REST do Firestore
function v(x) {
  if (x === null) return { nullValue: null };
  if (Array.isArray(x)) return { arrayValue: { values: x.map(v) } };
  if (typeof x === 'boolean') return { booleanValue: x };
  if (typeof x === 'number') return Number.isInteger(x) ? { integerValue: String(x) } : { doubleValue: x };
  if (typeof x === 'object') return { mapValue: { fields: f(x) } };
  return { stringValue: String(x) };
}
function f(o) { const r = {}; Object.keys(o).forEach((k) => { r[k] = v(o[k]); }); return r; }
const doc = (caminho, o) => ({ name: 'projects/p/databases/(default)/documents/' + caminho, fields: f(o), updateTime: '2026-11-01T10:00:00.000000Z' });
// a API devolve só os campos pedidos em mask.fieldPaths
function mascarar(d, u) {
  const m = u.searchParams.getAll('mask.fieldPaths');
  if (!m.length) return d;
  const fields = {}; m.forEach((k) => { if (d.fields[k]) fields[k] = d.fields[k]; });
  return Object.assign({}, d, { fields });
}
let leiturasDeFoto = 0;
const cfg = (slug, lojaId, ativo) => doc('canaisAtivos/' + slug, { lojaId, slug, ativo, marca: '', genero: 'female', idade: 'adult', catRoupas: '5322', catAcess: '167', pesoG: 250, comprimentoCm: 28, larguraCm: 20, alturaCm: 4, ncm: '61046300', atualizadoEm: ontem });

const BANCO = {
  canaisAtivos: [cfg('studio-ana', 'uidAna', true), cfg('loja-off', 'uidOff', false), cfg('loja-vencida', 'uidVen', true), cfg('loja-trocada', 'uidX', true)],
  'lojasPublicas/studio-ana': doc('lojasPublicas/studio-ana', { slug: 'studio-ana', lojaId: 'uidAna', status: 'teste', trialAteTs: amanha, vitrine: 'vinho-delicado', dominio: '', marca: { NOME: 'Studio Ana Fit', MARCA: 'Studio Ana' } }),
  'lojasPublicas/loja-vencida': doc('lojasPublicas/loja-vencida', { slug: 'loja-vencida', lojaId: 'uidVen', status: 'teste', trialAteTs: ontem }),
  'lojasPublicas/loja-trocada': doc('lojasPublicas/loja-trocada', { slug: 'loja-trocada', lojaId: 'outraDona', status: 'ativa' }),
  itensAna: [
    doc('catalogos/uidAna/itens/ilg1abcd', { nome: 'Legging Pulse', cat: 'leggings', cor: 'Preto', preco: 89.9, tamanhos: ['P', 'M'], img: JPG, img2: PNG, estoque: { P: 1, M: 0 }, ordem: 1 }),
    doc('catalogos/uidAna/itens/itp2efgh', { nome: 'Top Arena', cat: 'tops', cor: 'Vinho', preco: 59, tamanhos: ['P'], img: JPG, ordem: 2 }),
    doc('catalogos/uidAna/itens/isem3pre', { nome: 'Sem preço', cat: 'tops', cor: 'Azul', preco: '', tamanhos: ['P'], img: JPG, ordem: 3 })
  ]
};

function servidor() {
  return new Promise((ok) => {
    const s = http.createServer((req, res) => {
      const u = new URL(req.url, 'http://x'), c = decodeURIComponent(u.pathname).replace('/v1/projects/p/databases/(default)/documents/', '');
      const json = (code, o) => { res.writeHead(code, { 'content-type': 'application/json' }); res.end(JSON.stringify(o)); };
      if (c === 'canaisAtivos') return json(200, { documents: BANCO.canaisAtivos });
      if (c === 'catalogos/uidAna/itens') {
        // duas páginas, para conferir o pageToken
        const pg = u.searchParams.get('pageToken') ? BANCO.itensAna.slice(2) : BANCO.itensAna.slice(0, 2);
        return json(200, Object.assign({ documents: pg.map((d) => mascarar(d, u)) }, u.searchParams.get('pageToken') ? {} : { nextPageToken: 'pg2' }));
      }
      const peca = BANCO.itensAna.find((d) => d.name.endsWith('/' + c));
      if (peca) { leiturasDeFoto++; return json(200, mascarar(peca, u)); }
      if (BANCO[c]) return json(200, BANCO[c]);
      return json(404, { error: { code: 404 } });
    });
    s.listen(0, '127.0.0.1', () => ok(s));
  });
}
// assíncrono: o servidor de mentira roda neste mesmo processo
async function rodar(porta, saida) {
  const r = await execFileP(process.execPath, [path.join(__dirname, '..', 'tools', 'canais', 'gerar.js')], {
    env: Object.assign({}, process.env, { FIRESTORE_API: 'http://127.0.0.1:' + porta + '/v1', FIREBASE_PROJETO: 'p', CANAIS_SAIDA: saida }), encoding: 'utf8', timeout: 30000
  });
  return r.stdout;
}

test('workflow: publica só a loja ligada e no ar, com fotos, e não mexe quando nada muda', async () => {
  const s = await servidor(), porta = s.address().port;
  const saida = fs.mkdtempSync(path.join(os.tmpdir(), 'canais-'));
  fs.mkdirSync(path.join(saida, 'loja-off', 'img'), { recursive: true });
  fs.writeFileSync(path.join(saida, 'loja-off', 'meta.csv'), 'velho');
  try {
    const log1 = await rodar(porta, saida);
    assert.match(log1, /studio-ana: 2 peças, 3 variações, 3 fotos/);
    assert.deepStrictEqual(fs.readdirSync(saida).sort(), ['LEIAME.md', 'studio-ana']);
    const d = path.join(saida, 'studio-ana');
    assert.deepStrictEqual(fs.readdirSync(path.join(d, 'img')).sort(), ['ilg1abcd-1.jpg', 'ilg1abcd-2.png', 'itp2efgh-1.jpg']);
    assert.equal(fs.readFileSync(path.join(d, 'img', 'ilg1abcd-1.jpg'))[0], 0xFF);
    const meta = fs.readFileSync(path.join(d, 'meta.csv'), 'utf8');
    assert.match(meta, /^id,title/);
    assert.match(meta, /G1ABCD-M,Legging Pulse Preto,.*,out of stock,new,89\.90 BRL,.*canais\/studio-ana\/img\/ilg1abcd-1\.jpg,.*ilg1abcd-2\.png,Studio Ana Fit,/);
    assert.ok(!/isem3pre|SEM3PRE/.test(meta), 'peça sem preço fica de fora');
    assert.match(fs.readFileSync(path.join(d, 'bling.csv'), 'utf8'), /6104\.63\.00/);
    const st1 = JSON.parse(fs.readFileSync(path.join(d, 'status.json'), 'utf8'));
    assert.equal(st1.variacoes, 3);
    // segunda rodada: nada muda, nem a hora
    const antes = fs.statSync(path.join(d, 'planilha.xlsx')).mtimeMs;
    const log2 = await rodar(porta, saida);
    assert.match(log2, /studio-ana: .* 0 peça\(s\) lida\(s\) com foto, sem mudança/);
    assert.equal(fs.statSync(path.join(d, 'planilha.xlsx')).mtimeMs, antes);
    assert.equal(JSON.parse(fs.readFileSync(path.join(d, 'status.json'), 'utf8')).atualizadoEm, st1.atualizadoEm);
    // foto apagada à mão: a peça é lida de novo e a foto volta
    fs.unlinkSync(path.join(d, 'img', 'itp2efgh-1.jpg'));
    const log3 = await rodar(porta, saida);
    assert.match(log3, /1 peça\(s\) lida\(s\) com foto/);
    assert.ok(fs.existsSync(path.join(d, 'img', 'itp2efgh-1.jpg')));
    // lançamento VIP que abre sem a peça mudar no banco: fica fora até a foto estar no ar, e entra na rodada seguinte
    const vip = doc('catalogos/uidAna/itens/ivip9xyz', { nome: 'Top VIP', cat: 'tops', cor: 'Lilás', preco: 79, tamanhos: ['M'], img: JPG, vipAte: '2000-01-01T00:00', ordem: 9 });
    BANCO.itensAna.push(vip);
    const st = JSON.parse(fs.readFileSync(path.join(d, 'status.json'), 'utf8'));
    st.cache.ivip9xyz = { t: vip.updateTime, img: 'data:image/jpeg;base64,', img2: '', pub: false };
    fs.writeFileSync(path.join(d, 'status.json'), JSON.stringify(st));
    await rodar(porta, saida);
    assert.ok(!/ivip9xyz/.test(fs.readFileSync(path.join(d, 'meta.csv'), 'utf8')), 'sem foto no ar, a peça espera');
    await rodar(porta, saida);
    assert.ok(/ivip9xyz-1\.jpg/.test(fs.readFileSync(path.join(d, 'meta.csv'), 'utf8')), 'na rodada seguinte entra com a foto');
    assert.ok(fs.existsSync(path.join(d, 'img', 'ivip9xyz-1.jpg')));
    BANCO.itensAna.pop();
    // a peça saiu da loja: a foto dela sai junto
    BANCO.itensAna.splice(1, 1);
    await rodar(porta, saida);
    assert.deepStrictEqual(fs.readdirSync(path.join(d, 'img')).sort(), ['ilg1abcd-1.jpg', 'ilg1abcd-2.png']);
  } finally {
    s.close(); fs.rmSync(saida, { recursive: true, force: true });
  }
});

test('workflow: sem conseguir ler a lista, não apaga nada', async () => {
  const saida = fs.mkdtempSync(path.join(os.tmpdir(), 'canais-'));
  fs.mkdirSync(path.join(saida, 'studio-ana'));
  try {
    assert.throws(() => execFileSync(process.execPath, [path.join(__dirname, '..', 'tools', 'canais', 'gerar.js')], {
      env: Object.assign({}, process.env, { FIRESTORE_API: 'http://127.0.0.1:9/v1', FIREBASE_PROJETO: 'p', CANAIS_SAIDA: saida }), stdio: 'pipe', timeout: 30000
    }));
    assert.ok(fs.existsSync(path.join(saida, 'studio-ana')));
  } finally { fs.rmSync(saida, { recursive: true, force: true }); }
});

test('workflow: regras novas ainda não publicadas (403) não é falha e não apaga nada', async () => {
  const s = await new Promise((ok) => { const x = http.createServer((q, r) => { r.writeHead(403, { 'content-type': 'application/json' }); r.end('{"error":{"code":403}}'); }); x.listen(0, '127.0.0.1', () => ok(x)); });
  const saida = fs.mkdtempSync(path.join(os.tmpdir(), 'canais-'));
  fs.mkdirSync(path.join(saida, 'studio-ana'));
  try {
    const log = await rodar(s.address().port, saida);
    assert.match(log, /publique o firestore\.rules novo/);
    assert.ok(fs.existsSync(path.join(saida, 'studio-ana')));
  } finally { s.close(); fs.rmSync(saida, { recursive: true, force: true }); }
});
