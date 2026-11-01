// node --test tests/  — regras de dinheiro da plataforma
const test = require('node:test');
const assert = require('node:assert');
const C = require('../shared/calc.js');

const P = C.lerPrecos({});
const D = (s) => new Date(+s.slice(0, 4), +s.slice(5, 7) - 1, +s.slice(8, 10), 12);

test('preços: padrão e valor fora da faixa volta ao padrão', () => {
  const p = C.lerPrecos({ splitPct: 50, venceDia: 31, planos: { loja: { mensal: -5, implantacao: 2000 } } });
  assert.equal(p.splitPct, 1.5);
  assert.equal(p.venceDia, 10);
  assert.equal(p.planos.loja.mensal, 69.9);
  assert.equal(p.planos.loja.mensalDe, 129);
  assert.equal(p.planos.loja.implantacao, 2000);
});

test('validarPrecos recusa vencimento 31 e campo negativo', () => {
  const p = JSON.parse(JSON.stringify(C.PADRAO));
  p.venceDia = 31; p.splitPct = -1;
  const e = C.validarPrecos(p);
  assert.ok(e.includes('venceDia') && e.includes('splitPct'));
  assert.deepEqual(C.validarPrecos(C.PADRAO), []);
});

test('rendimento: mensalidade + split + domínio', () => {
  const r = C.rendimento({ plano: 'loja', dominio: 'x.com.br' }, { gmvPago: 10000, pagos: 200 }, P);
  assert.equal(r.assinatura, 69.9);
  assert.equal(r.split, 150);
  assert.equal(r.site, 3.33);
  assert.equal(r.total, 223.23);
  assert.equal(C.rendimento({ plano: 'loja', cobranca: { isento: true } }, {}, P).assinatura, 0);
});

test('situação: em dia, atrasada, crítica, isenta, teste, pausada', () => {
  const base = { status: 'ativa', ativadaEm: '2026-01-05' };
  assert.equal(C.situacaoCobranca({ ...base, cobranca: { pagoAte: '2026-10' } }, P, D('2026-10-30')).situacao, 'em-dia');
  const a = C.situacaoCobranca({ ...base, cobranca: { pagoAte: '2026-09' } }, P, D('2026-10-30'));
  assert.equal(a.situacao, 'atrasada'); assert.equal(a.atrasoDias, 20); assert.equal(a.mesesEmAberto, 1);
  const c = C.situacaoCobranca({ ...base, cobranca: { pagoAte: '2026-08' } }, P, D('2026-10-30'));
  assert.equal(c.situacao, 'critica'); assert.equal(c.mesesEmAberto, 2);
  assert.equal(C.situacaoCobranca({ ...base, cobranca: { isento: true } }, P, D('2026-10-30')).situacao, 'isenta');
  assert.equal(C.situacaoCobranca({ ...base, trialAte: '2026-11-15' }, P, D('2026-10-30')).situacao, 'teste');
  assert.equal(C.situacaoCobranca({ status: 'pausada' }, P, D('2026-10-30')).situacao, 'pausada');
});

test('situação: ativação depois do dia de vencimento vence no dia da ativação', () => {
  const s = C.situacaoCobranca({ status: 'ativa', ativadaEm: '2026-10-20' }, P, D('2026-10-25'));
  assert.equal(s.situacao, 'atrasada'); assert.equal(s.atrasoDias, 5);
});

test('virada de ano no pagamento adiantado', () => {
  const s = C.situacaoCobranca({ status: 'ativa', cobranca: { pagoAte: '2027-01' } }, P, D('2026-12-20'));
  assert.equal(s.situacao, 'em-dia'); assert.equal(s.proximoVencimento, '2027-02-10');
});

test('Paguei numa conta mensal mantém o dia e cai no último dia em mês curto', () => {
  assert.equal(C.proximoVencimento({ vence: '2027-01-31', diaFixo: 31, recorrencia: 'mensal' }), '2027-02-28');
  assert.equal(C.proximoVencimento({ vence: '2027-02-28', diaFixo: 31, recorrencia: 'mensal' }), '2027-03-31');
  assert.equal(C.proximoVencimento({ vence: '2026-11-10', diaFixo: 10, recorrencia: 'anual' }), '2027-11-10');
});

test('resumo: só ativas/pausadas entram, IA só do mês, sem dados de clientes finais', () => {
  const db = {
    precos: { iaPrecoEntradaMilhao: 10, iaPrecoSaidaMilhao: 40 },
    lojas: {
      a: { nome: 'A', status: 'ativa', plano: 'loja', ativadaEm: '2026-01-01', cobranca: { pagoAte: '2026-10' } },
      b: { nome: 'B', status: 'fila', plano: 'vitrine', implantacao: { valor: 600, pago: false } },
      c: { nome: 'C', status: 'pausada', plano: 'completo' }
    },
    vendas: { a: { '2026-10': { pedidos: 120, pagos: 100, gmvPago: 8000, emAberto: 3 } } },
    iaDia: { '2026-10-02': { a: { pedidos: 2, entrada: 1e6, saida: 5e5 } }, '2026-11-01': { a: { pedidos: 9, entrada: 9e6, saida: 9e6 } } }
  };
  const r = C.calcularResumo(db, D('2026-10-30'));
  assert.equal(r.lojas.length, 2);
  assert.equal(r.totais.fila, 1);
  assert.equal(r.totais.split, 120);
  assert.equal(r.totais.ganhoPorVenda, 1.2);
  assert.equal(r.ia.pedidos, 2);
  assert.equal(r.ia.custo, 30);
  assert.equal(r.totais.implantacaoAReceber, 600);
  assert.ok(!/cliente|email|cpf/i.test(JSON.stringify(r.lojas)));
});

test('CSV protege contra fórmula e usa ponto e vírgula', () => {
  const s = C.csv([['nome', 'valor'], ['=SOMA(A1)', '1;2']]);
  assert.ok(s.startsWith('﻿'));
  assert.ok(s.includes("'=SOMA(A1)"));
  assert.ok(s.includes('"1;2"'));
});
