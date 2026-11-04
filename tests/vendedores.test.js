// node --test tests/  — programa de vendedores (afiliados por convite) e QR code
const test = require('node:test');
const assert = require('node:assert');
const V = require('../shared/vendedores.js');
const QR = require('../shared/qr.js');

const BASE = 'https://natanaelinvotec.github.io/provador/';

test('código do vendedor: primeiro nome sem acento + 3 letras, sem repetir', () => {
  let n = 0; const seq = () => [0.0, 0.5, 0.99][n++ % 3];
  const c = V.codigoNovo('Ângela Maria', {}, seq);
  assert.match(c, /^angela-[a-z2-9]{3}$/);
  const usados = { [c]: 1 };
  n = 0; let k = 0; const seq2 = () => (k++ < 3 ? [0.0, 0.5, 0.99][k - 1] : 0.3);
  const c2 = V.codigoNovo('Ângela Maria', usados, seq2);
  assert.notStrictEqual(c2, c);
  assert.strictEqual(V.codigoNovo('', {}, () => 0).slice(0, 9), 'vendedor-');
  assert.ok(!/[01ilo]/.test(V.codigoNovo('x', {}, Math.random).split('-')[1]), 'sem letras que confundem');
});

test('normalizar código e ler da URL', () => {
  assert.strictEqual(V.normalizarCodigo(' Carol-M4X '), 'carol-m4x');
  assert.strictEqual(V.normalizarCodigo('a'), '');
  assert.strictEqual(V.normalizarCodigo('-abc'), '');
  assert.strictEqual(V.normalizarCodigo('abc def'), '');
  assert.strictEqual(V.normalizarCodigo('<script>'), '');
  assert.strictEqual(V.codigoDaUrl('?vendedor=carol-m4x&x=1'), 'carol-m4x');
  assert.strictEqual(V.codigoDaUrl('?outra=1'), '');
});

test('link guardado vale 60 dias e o futuro distante não vale', () => {
  const agora = new Date('2026-11-04T12:00:00Z');
  const r = V.registro('carol-m4x', agora);
  assert.strictEqual(V.codigoValido(r, agora), 'carol-m4x');
  assert.strictEqual(V.codigoValido(r, new Date(agora.getTime() + 59 * 864e5)), 'carol-m4x');
  assert.strictEqual(V.codigoValido(r, new Date(agora.getTime() + 61 * 864e5)), '');
  assert.strictEqual(V.codigoValido({ codigo: 'carol-m4x', em: agora.getTime() + 3 * 864e5 }, agora), '');
  assert.strictEqual(V.codigoValido(null, agora), '');
  assert.strictEqual(V.registro('x', agora), null);
});

test('validar vendedor do formulário', () => {
  const ok = V.validarVendedor({ nome: '  carolina   matos ', email: 'Carol@Exemplo.com', whatsapp: '(67) 99999-7001' });
  assert.deepStrictEqual(ok.erros, []);
  assert.strictEqual(ok.vendedor.email, 'carol@exemplo.com');
  assert.strictEqual(ok.vendedor.nomeCurto, 'Carolina');
  assert.strictEqual(ok.vendedor.whatsapp, '67999997001');
  assert.deepStrictEqual(V.validarVendedor({ nome: 'x', email: 'sem-arroba', whatsapp: '123' }).erros, ['nome', 'email', 'whatsapp']);
});

test('ciclo: cadastro → confirmada no 1º pagamento → paga; cancelar só antes de assinar', () => {
  const ind = { lojaId: 'L1', codigo: 'carol-m4x', vendedorUid: 'u1', status: 'cadastro' };
  const c = V.confirmar(ind, 50, '2026-11-04T10:00:00Z');
  assert.strictEqual(c.status, 'confirmada'); assert.strictEqual(c.valor, 50); assert.strictEqual(c.confirmadaEm, '2026-11-04T10:00:00Z');
  assert.strictEqual(V.confirmar(c, 80), null, 'o segundo pagamento não muda o valor');
  const p = V.pagar(c, '2026-11-10T10:00:00Z');
  assert.strictEqual(p.status, 'paga'); assert.strictEqual(p.valor, 50);
  assert.strictEqual(V.pagar(ind), null);
  assert.strictEqual(V.cancelar(c), null);
  assert.strictEqual(V.cancelar(ind).status, 'cancelada');
  assert.strictEqual(V.confirmar(ind, 'abc').valor, V.VALOR_PADRAO);
});

test('resumo do vendedor', () => {
  const r = V.resumo([{ status: 'cadastro' }, { status: 'confirmada', valor: 50 }, { status: 'confirmada', valor: 40 }, { status: 'paga', valor: 50 }, { status: 'cancelada' }]);
  assert.deepStrictEqual(r, { total: 5, emTeste: 1, confirmadas: 2, pagas: 1, canceladas: 1, aPagar: 90, pago: 50 });
  assert.strictEqual(V.lerValor({ valorPorLoja: 75 }), 75);
  assert.strictEqual(V.lerValor({ valorPorLoja: -1 }), V.VALOR_PADRAO);
  assert.strictEqual(V.brl(1234.5), 'R$ 1.234,50');
});

test('links e mensagens', () => {
  assert.strictEqual(V.linkIndicacao(BASE, 'carol-m4x'), BASE + '?vendedor=carol-m4x');
  assert.strictEqual(V.linkConvite(BASE.slice(0, -1), 'carol-m4x'), BASE + 'vendedor/?c=carol-m4x');
  const m = V.mensagemConvite({ nome: 'Carolina Matos', email: 'carol@exemplo.com', codigo: 'carol-m4x' }, BASE, 50);
  assert.match(m, /Carolina/); assert.match(m, /R\$ 50,00/); assert.match(m, /carol@exemplo\.com/); assert.match(m, /vendedor\/\?c=carol-m4x/);
  assert.match(V.mensagemDivulgacao('Carolina', 'https://x/?vendedor=a-b'), /15 dias grátis/);
});

// QR: as matrizes abaixo foram lidas de volta por um leitor de QR (OpenCV) e batem bit a bit com outro codificador
function hash(q) { let h = 5381; for (const c of q.m.map((r) => r.map((b) => (b ? 1 : 0)).join('')).join('')) h = ((h * 33) ^ c.charCodeAt(0)) >>> 0; return h; }
test('QR do WhatsApp comercial e do link do vendedor', () => {
  const a = QR.matriz('https://wa.me/5567992122801', 'M');
  assert.strictEqual(a.tamanho, 29); assert.strictEqual(a.versao, 3); assert.strictEqual(hash(a), 468156533);
  const b = QR.matriz(BASE + '?vendedor=carol-m4x', 'M');
  assert.strictEqual(b.tamanho, 33); assert.strictEqual(hash(b), 2262616468);
  // os três localizadores
  for (const [x, y] of [[0, 0], [a.tamanho - 7, 0], [0, a.tamanho - 7]]) {
    assert.ok(a.m[y][x] && a.m[y + 6][x + 6] && !a.m[y + 1][x + 1] && a.m[y + 3][x + 3]);
  }
  const svg = QR.svg('https://wa.me/5567992122801', { rotulo: 'QR do WhatsApp', cor: '#0A1630' });
  assert.match(svg, /^<svg[^>]+viewBox="0 0 37 37"/); assert.match(svg, /aria-label="QR do WhatsApp"/);
  assert.throws(() => QR.matriz('x'.repeat(4000), 'H'));
});
