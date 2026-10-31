/**
 * Cloud Functions do Provador.
 *
 *  resumoDiario      todo dia 04:30 (Campo Grande) recalcula financeiroPlataforma/resumo
 *  fechamentoMensal  dia 1 às 05:10 fecha o mês anterior em financeiroPlataforma/historico
 *  comandoPainel     o botão "Atualizar números" cria comandos/{id}; a função confere o papel e recalcula
 *
 * Fontes dos números (só agregados, nada de dados das compradoras):
 *  vendasMes/{lojaId_AAAA-MM}  { lojaId, mes, pedidos, pagos, gmvPago, emAberto }  ← escrito pelo webhook do gateway
 *  usoIA/{AAAA-MM-DD}          { mes, dia, lojas: { lojaId: { pedidos, entrada, saida } } } ← escrito por quem chama a IA
 * calc.js é o mesmo arquivo do painel (shared/calc.js), copiado aqui no predeploy.
 */
'use strict';
const { onSchedule } = require('firebase-functions/v2/scheduler');
const { onDocumentCreated } = require('firebase-functions/v2/firestore');
const { setGlobalOptions, logger } = require('firebase-functions/v2');
const admin = require('firebase-admin');
const Calc = require('./calc.js');

admin.initializeApp();
const db = admin.firestore();
const FUSO = 'America/Campo_Grande';
setGlobalOptions({ region: 'southamerica-east1', maxInstances: 2, memory: '256MiB' });

/** "Agora" no relógio de Campo Grande (o Calc usa getDate/getMonth locais). */
function agoraLocal(base) {
  return new Date((base || new Date()).toLocaleString('en-US', { timeZone: FUSO }));
}

async function lerBase(mes) {
  const [lojasSnap, precosSnap, vendasSnap, iaSnap] = await Promise.all([
    db.collection('lojas').get(),
    db.doc('financeiroPlataforma/precos').get(),
    db.collection('vendasMes').where('mes', '==', mes).get(),
    db.collection('usoIA').where('mes', '==', mes).get()
  ]);
  const lojas = {};
  lojasSnap.forEach((d) => { lojas[d.id] = Object.assign({ id: d.id }, d.data()); });
  const vendas = {};
  vendasSnap.forEach((d) => {
    const v = d.data();
    if (!v.lojaId) return;
    (vendas[v.lojaId] = vendas[v.lojaId] || {})[v.mes] = {
      pedidos: Number(v.pedidos) || 0, pagos: Number(v.pagos) || 0, gmvPago: Number(v.gmvPago) || 0, emAberto: Number(v.emAberto) || 0
    };
  });
  const iaDia = {};
  iaSnap.forEach((d) => { const v = d.data(); if (v.dia) iaDia[v.dia] = v.lojas || {}; });
  return { precos: precosSnap.exists ? precosSnap.data() : {}, lojas, vendas, iaDia };
}

async function gravarResumo(agora, origem) {
  const mes = Calc.util.mes(agora);
  const base = await lerBase(mes);
  const resumo = Calc.calcularResumo(base, agora);
  resumo.calculadoEm = new Date().toISOString();
  resumo.origem = origem;
  await db.doc('financeiroPlataforma/resumo').set(resumo);
  // o mês corrente também entra no histórico (é sobrescrito até o fechamento)
  await db.doc('financeiroPlataforma/historico').set({ meses: { [mes]: Calc.linhaHistorico(resumo) } }, { merge: true });
  return resumo;
}

exports.resumoDiario = onSchedule({ schedule: '30 4 * * *', timeZone: FUSO }, async () => {
  const r = await gravarResumo(agoraLocal(), 'agenda');
  logger.info('resumo diário', { mes: r.mes, total: r.totais.total });
});

exports.fechamentoMensal = onSchedule({ schedule: '10 5 1 * *', timeZone: FUSO }, async () => {
  const hoje = agoraLocal();
  // último instante do mês anterior
  const fim = new Date(hoje.getFullYear(), hoje.getMonth(), 0, 23, 59, 59);
  const r = await gravarResumo(fim, 'fechamento');
  await db.collection('auditoria').add({ quando: new Date().toISOString(), quem: 'servidor', oque: 'Fechou o mês ' + r.mes, colecao: 'financeiroPlataforma', alvo: 'Plataforma' });
  await gravarResumo(hoje, 'agenda');
});

exports.comandoPainel = onDocumentCreated('comandos/{id}', async (event) => {
  const ref = event.data && event.data.ref;
  const cmd = event.data && event.data.data();
  if (!ref || !cmd) return;
  try {
    const u = await db.doc('usuarios/' + cmd.porUid).get();
    const papeis = (u.exists && u.data().papeis) || [];
    if (papeis.indexOf('plataforma') < 0 || cmd.tipo !== 'resumoPlataforma') {
      await ref.update({ status: 'negado', fimEm: new Date().toISOString() });
      return;
    }
    // no máximo um recálculo por minuto, para o botão não virar custo
    const ult = await db.doc('financeiroPlataforma/resumo').get();
    const desde = ult.exists ? Date.now() - Date.parse(ult.data().calculadoEm || 0) : Infinity;
    if (desde > 60 * 1000) await gravarResumo(agoraLocal(), 'painel');
    await ref.update({ status: 'ok', fimEm: new Date().toISOString() });
  } catch (e) {
    logger.error('comandoPainel', e);
    await ref.update({ status: 'erro', fimEm: new Date().toISOString() });
  }
});
