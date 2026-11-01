// node --test tests/  — catálogo nos canais (Meta, Google, Bling e planilha dos hubs)
const test = require('node:test');
const assert = require('node:assert');
const C = require('../shared/canais.js');

const JPG = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQ==';
const loja = { slug: 'studio-ana', nome: 'Studio Ana Fit', marca: { NOME: 'Studio Ana Fit' } };
const itens = [
  { id: 'ilg1abcd', cat: 'leggings', nome: 'Legging Pulse', cor: 'Preto', preco: '89.9', tamanhos: ['G', 'P', 'M'], img: JPG, img2: JPG, estoque: { P: 2, M: 0, G: 1 }, ordem: 1 },
  { id: 'ilg2efgh', cat: 'leggings', nome: 'Legging Pulse', cor: 'Vinho', preco: 89.9, tamanhos: ['P', 'M'], img: JPG, ordem: 2, descricao: 'Cintura alta, tecido que não fica transparente no agachamento.' },
  { id: 'iac3ijkl', cat: 'acessorios', nome: 'Garrafa', cor: 'Rosa', preco: 39, tamanhos: ['U'], img: 'vitrines/_fotos/garrafa.jpg', ordem: 3 },
  { id: 'isem4pre', cat: 'tops', nome: 'Top Arena', cor: 'Azul', preco: '', tamanhos: ['P'], img: JPG, ordem: 4 },
  { id: 'ivip5mno', cat: 'tops', nome: 'Top Lançamento', cor: 'Lilás', preco: 79, tamanhos: ['M'], img: JPG, vipAte: '2099-01-01T10:00', ordem: 5 }
];
// leitor de CSV com aspas (só para o teste)
function lerCsv(txt, sep) {
  const rows = []; let row = [], cel = '', q = false;
  for (let i = 0; i < txt.length; i++) {
    const c = txt[i];
    if (q) { if (c === '"' && txt[i + 1] === '"') { cel += '"'; i++; } else if (c === '"') q = false; else cel += c; continue; }
    if (c === '"') q = true; else if (c === sep) { row.push(cel); cel = ''; } else if (c === '\n') { row.push(cel); rows.push(row); row = []; cel = ''; } else if (c !== '\r') cel += c;
  }
  return rows;
}
const o = { agora: '2026-11-01T12:00', cfg: { marca: '', pesoG: 250 } };

test('linhas: peça × tamanho, código da etiqueta, ordem de tamanhos, estoque e fora do VIP', () => {
  const ls = C.linhas(loja, itens, o);
  assert.deepStrictEqual(ls.map((l) => l.id), ['G1ABCD-P', 'G1ABCD-M', 'G1ABCD-G', 'G2EFGH-P', 'G2EFGH-M', 'C3IJKL-U']);
  const m = ls.find((l) => l.id === 'G1ABCD-M');
  assert.equal(m.disponivel, false);
  assert.equal(m.qtd, 0);
  assert.equal(ls.find((l) => l.id === 'G2EFGH-P').qtd, null, 'sem estoque controlado');
  assert.equal(m.grupo, 'leggings-legging-pulse');
  assert.equal(m.link, 'https://natanaelinvotec.github.io/provador/vitrine.html?l=studio-ana&p=produto&item=leggings-legging-pulse');
  assert.equal(m.imagem, 'https://natanaelinvotec.github.io/provador/canais/studio-ana/img/ilg1abcd-1.jpg');
  assert.deepStrictEqual(m.extras, ['https://natanaelinvotec.github.io/provador/canais/studio-ana/img/ilg1abcd-2.jpg']);
  assert.equal(ls.find((l) => l.id === 'C3IJKL-U').imagem, 'https://natanaelinvotec.github.io/provador/vitrines/_fotos/garrafa.jpg');
  assert.equal(m.titulo, 'Legging Pulse Preto');
  assert.ok(!ls.some((l) => l.itemId === 'ivip5mno'), 'lançamento VIP fica de fora até a data');
  assert.ok(!ls.some((l) => l.itemId === 'isem4pre'), 'sem preço fica de fora');
  assert.equal(m.pesoG, 250);
});

test('domínio próprio vira o link do produto', () => {
  const ls = C.linhas(Object.assign({}, loja, { dominio: 'loja.studioana.com.br' }), itens, o);
  assert.equal(ls[0].link, 'https://loja.studioana.com.br/?p=produto&item=leggings-legging-pulse');
  assert.equal(C.dominioValido('http://x.com/<a>'), '');
});

test('VIP vencido volta para os canais', () => {
  const ls = C.linhas(loja, itens, { agora: '2099-01-02T00:00' });
  assert.ok(ls.some((l) => l.itemId === 'ivip5mno'));
});

test('Meta: cabeçalho, preço com moeda, disponibilidade e CSV com aspas', () => {
  const csv = C.meta(C.linhas(loja, itens, o));
  const linhas = csv.trim().split('\r\n');
  assert.equal(linhas[0], 'id,title,description,availability,condition,price,link,image_link,additional_image_link,brand,google_product_category,product_type,item_group_id,color,size,gender,age_group,quantity_to_sell_on_facebook,status');
  assert.match(linhas[2], /^G1ABCD-M,Legging Pulse Preto,"Legging Pulse na cor preto, da loja Studio Ana Fit\. Tamanhos: P, M, G\. Moda fitness com envio para todo o Brasil\.",out of stock,new,89\.90 BRL,/);
  assert.match(linhas[2], /,5322,Moda fitness > Leggings,leggings-legging-pulse,Preto,M,female,adult,0,active$/);
  assert.equal(linhas.length, 7);
});

test('Google: TSV sem tabulação no texto, in_stock, size_system e identifier_exists', () => {
  const ls = C.linhas(loja, itens, o);
  ls[0].descricao = 'linha\tcom\ttab\ne quebra';
  const tsv = C.google(ls).trim().split('\n');
  const cab = tsv[0].split('\t');
  const l1 = tsv[1].split('\t');
  assert.equal(l1.length, cab.length);
  assert.equal(l1[cab.indexOf('description')], 'linha com tab e quebra');
  assert.equal(l1[cab.indexOf('availability')], 'in_stock');
  assert.equal(l1[cab.indexOf('title')], 'Legging Pulse Preto - Tamanho P');
  assert.equal(l1[cab.indexOf('size_system')], 'BR');
  assert.equal(l1[cab.indexOf('identifier_exists')], 'no');
});

test('Bling: colunas nos lugares da planilha (B Código, AJ Código Pai, AR URL Imagens Externas) e variações', () => {
  const csv = C.bling(C.linhas(loja, itens, o));
  const rows = lerCsv(csv, ';');
  const cab = rows[0];
  assert.equal(cab.length, 59);
  assert.equal(cab[1], 'Código');
  assert.equal(cab[35], 'Código Pai');   // AJ
  assert.equal(cab[43], 'URL Imagens Externas'); // AR
  const pai = rows[1];
  assert.equal(pai[1], 'LEGGINGS-LEGGING-PULSE');
  assert.equal(pai[2], 'Legging Pulse');
  assert.equal(pai[6], '89,90');
  assert.equal(pai[35], '');
  const v = rows[2];
  assert.equal(v[1], 'G1ABCD-P');
  assert.equal(v[2], 'Cor:Preto;Tamanho:P');
  assert.equal(v[35], 'LEGGINGS-LEGGING-PULSE');
  assert.equal(v[10], '2');
  assert.equal(v[17], '0,250');
  assert.match(v[43], /ilg1abcd-1\.jpg\|https:.*ilg1abcd-2\.jpg$/);
  // 2 pais (legging + garrafa) + 5 variações da legging + 1 da garrafa
  assert.equal(rows.length - 1, 2 + 5 + 1);
});

test('Bling: a descrição da variação tem ; dentro e vai entre aspas', () => {
  const csv = C.bling(C.linhas(loja, itens, o));
  assert.ok(csv.includes('"Cor:Preto;Tamanho:P"'));
});

test('conferir: bloqueios e dicas', () => {
  const r = C.conferir(loja, itens.concat([{ id: 'zg1abcd', cat: 'tops', nome: 'Top', cor: 'Preto', preco: 50, img: JPG, ordem: 9 }]), o);
  assert.equal(r.vip, 1);
  assert.ok(r.bloqueadas.some((b) => b.id === 'isem4pre' && b.motivos.includes('sem preço')));
  assert.ok(r.bloqueadas.some((b) => b.id === 'zg1abcd' && /já usado/.test(b.motivos[0])), 'código repetido');
  assert.ok(r.dicas.some((d) => d.id === 'ilg2efgh' && /só uma foto/.test(d.motivos.join())));
  assert.equal(r.prontas, 3);
});

test('xlsx: zip válido com crc certo', () => {
  assert.equal(C._crc32(new TextEncoder().encode('123456789')), 0xCBF43926);
  const b = C.planilha(C.linhas(loja, itens, o));
  assert.equal(b[0], 0x50); assert.equal(b[1], 0x4b);
  const fim = Buffer.from(b.slice(-22));
  assert.equal(fim.readUInt32LE(0), 0x06054b50);
  assert.equal(fim.readUInt16LE(10), 6, 'seis partes no pacote');
});

test('fotosParaPublicar e config conferida', () => {
  const f = C.fotosParaPublicar(itens);
  assert.ok(f.some((x) => x.arquivo === 'ilg1abcd-2.jpg'));
  assert.ok(!f.some((x) => /garrafa/.test(x.arquivo)));
  const c = C.limparCfg({ genero: 'x', pesoG: -3, ncm: '6104.63.00', catRoupas: '999', marca: '  A\tB  ' });
  assert.equal(c.genero, 'female'); assert.equal(c.pesoG, 300); assert.equal(c.ncm, '61046300'); assert.equal(c.catRoupas, '5322'); assert.equal(c.marca, 'A B');
  assert.equal(C.agoraLocal('America/Campo_Grande', new Date('2026-11-01T16:30:00Z')), '2026-11-01T12:30');
});
