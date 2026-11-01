/*
 * calc.js — regras de dinheiro da plataforma (mesmo código no navegador e na Cloud Function).
 *
 * Adaptado do MEGA-PAINEL-MASTER: "escola" vira loja, "aluno" vira pedido.
 * Cada loja paga: mensalidade do plano + split (parte da plataforma em cada venda paga)
 * + domínio (rateado por mês). A implantação é cobrada uma vez.
 * O split é "previsto" até o gateway com split (Asaas, Pagar.me…) ser ligado.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.Calc = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var PADRAO = {
    planos: {
      // mensalDe / implantacaoDe: preço "de" mostrado riscado no site (0 = sem preço riscado).
      // implantacao: montagem pela equipe de marketing (montando sozinha no montador, é grátis).
      vitrine: { nome: 'Vitrine', mensal: 49.9, mensalDe: 59, implantacao: 189.9, implantacaoDe: 600 },
      loja: { nome: 'Loja', mensal: 69.9, mensalDe: 129, implantacao: 189.9, implantacaoDe: 1800 },
      completo: { nome: 'Completo', mensal: 79.9, mensalDe: 179, implantacao: 189.9, implantacaoDe: 3000 }
    },
    implantacaoParcelas: 5, // a montagem pela equipe pode ser dividida em até N vezes
    splitPct: 1.5,        // % de cada venda paga que fica com a plataforma
    splitFixo: 0,         // R$ por pedido pago (opcional)
    dominioAno: 40,       // repasse anual do domínio, rateado por mês
    venceDia: 10,         // dia de vencimento da mensalidade (1–28)
    trialDias: 0,
    iaPrecoEntradaMilhao: 0,
    iaPrecoSaidaMilhao: 0,
    iaTetoMes: 0,
    gatewayLigado: false
  };
  var FAIXAS = {
    splitPct: [0, 20], splitFixo: [0, 50], dominioAno: [0, 1000], venceDia: [1, 28], trialDias: [0, 90],
    iaPrecoEntradaMilhao: [0, 10000], iaPrecoSaidaMilhao: [0, 10000], iaTetoMes: [0, 1000000],
    mensal: [0, 10000], mensalDe: [0, 10000], implantacao: [0, 100000], implantacaoDe: [0, 100000], implantacaoParcelas: [1, 12]
  };

  function arred(v) { return Math.round((Number(v) || 0) * 100) / 100; }
  function noIntervalo(v, k) { var f = FAIXAS[k]; return typeof v === 'number' && isFinite(v) && v >= f[0] && v <= f[1]; }

  /** Lê os preços: cada campo dentro da faixa; fora dela, volta ao padrão. */
  function lerPrecos(p) {
    p = p || {};
    var out = JSON.parse(JSON.stringify(PADRAO));
    ['splitPct', 'splitFixo', 'dominioAno', 'trialDias', 'iaPrecoEntradaMilhao', 'iaPrecoSaidaMilhao', 'iaTetoMes'].forEach(function (k) {
      if (noIntervalo(p[k], k)) out[k] = p[k];
    });
    if (Number.isInteger(p.venceDia) && noIntervalo(p.venceDia, 'venceDia')) out.venceDia = p.venceDia;
    if (typeof p.gatewayLigado === 'boolean') out.gatewayLigado = p.gatewayLigado;
    if (Number.isInteger(p.implantacaoParcelas) && noIntervalo(p.implantacaoParcelas, 'implantacaoParcelas')) out.implantacaoParcelas = p.implantacaoParcelas;
    if (p.planos) {
      Object.keys(out.planos).forEach(function (id) {
        var src = p.planos[id];
        if (!src) return;
        if (noIntervalo(src.mensal, 'mensal')) out.planos[id].mensal = src.mensal;
        if (noIntervalo(src.mensalDe, 'mensalDe')) out.planos[id].mensalDe = src.mensalDe;
        if (noIntervalo(src.implantacao, 'implantacao')) out.planos[id].implantacao = src.implantacao;
        if (noIntervalo(src.implantacaoDe, 'implantacaoDe')) out.planos[id].implantacaoDe = src.implantacaoDe;
      });
    }
    return out;
  }

  /** Valida o formulário de preços; devolve lista de erros (vazia = ok). */
  function validarPrecos(p) {
    var erros = [];
    ['splitPct', 'splitFixo', 'dominioAno', 'iaPrecoEntradaMilhao', 'iaPrecoSaidaMilhao', 'iaTetoMes'].forEach(function (k) {
      if (!noIntervalo(p[k], k)) erros.push(k);
    });
    if (!Number.isInteger(p.venceDia) || !noIntervalo(p.venceDia, 'venceDia')) erros.push('venceDia');
    Object.keys(PADRAO.planos).forEach(function (id) {
      var src = (p.planos || {})[id] || {};
      if (!noIntervalo(src.mensal, 'mensal')) erros.push(id + '.mensal');
      if (!noIntervalo(src.implantacao, 'implantacao')) erros.push(id + '.implantacao');
      if (src.mensalDe != null && !noIntervalo(src.mensalDe, 'mensalDe')) erros.push(id + '.mensalDe');
      if (src.implantacaoDe != null && !noIntervalo(src.implantacaoDe, 'implantacaoDe')) erros.push(id + '.implantacaoDe');
    });
    return erros;
  }

  /* ---------- datas (sempre em 'AAAA-MM' e 'AAAA-MM-DD', fuso local) ---------- */
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function meiaNoite(d) { return new Date(d.getFullYear(), d.getMonth(), d.getDate()); }
  function dia(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function mes(d) { return typeof d === 'string' ? d.slice(0, 7) : d.getFullYear() + '-' + pad(d.getMonth() + 1); }
  function ano(m) { return +m.slice(0, 4); }
  function mesNum(m) { return +m.slice(5, 7); }
  function somarMes(m, n) {
    var y = ano(m), mm = mesNum(m) - 1 + n;
    y += Math.floor(mm / 12); mm = ((mm % 12) + 12) % 12;
    return y + '-' + pad(mm + 1);
  }
  function diasNoMes(m) { return new Date(ano(m), mesNum(m), 0).getDate(); }
  function deDia(s) { return new Date(+s.slice(0, 4), +s.slice(5, 7) - 1, +s.slice(8, 10)); }
  // 'AAAA-MM-DD' é data local (new Date() leria como meia-noite UTC e erraria um dia no Brasil)
  function paraData(v) { return typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) ? deDia(v) : new Date(v); }

  /** Situação da mensalidade de uma loja (mesma regra do MEGA-PAINEL, pré-pago). */
  function situacaoCobranca(e, p, agora) {
    agora = agora || new Date();
    if (e.status !== 'ativa') return { situacao: e.status, atrasoDias: 0, mesesEmAberto: 0 };
    var c = e.cobranca || {};
    if (c.isento) return { situacao: 'isenta', atrasoDias: 0, mesesEmAberto: 0 };
    var hoje = meiaNoite(agora);
    var trial = e.trialAte ? String(e.trialAte).slice(0, 10) : null;
    if (trial && trial >= dia(hoje)) return { situacao: 'teste', ate: trial, atrasoDias: 0, mesesEmAberto: 0 };
    var inicio, base = null;
    if (c.pagoAte) inicio = somarMes(c.pagoAte, 1);
    else if (trial) inicio = somarMes(mes(trial), 1);
    else if (e.ativadaEm) { base = meiaNoite(paraData(e.ativadaEm)); inicio = mes(base); }
    else inicio = mes(hoje);
    var venc = function (m) { return new Date(ano(m), mesNum(m) - 1, p.venceDia); };
    var primeiro = base && base > venc(inicio) ? base : venc(inicio);
    if (hoje <= primeiro) return { situacao: 'em-dia', proximoVencimento: dia(primeiro), atrasoDias: 0, mesesEmAberto: 0 };
    var atrasoDias = Math.round((hoje - primeiro) / 864e5);
    var n = 0, m = inicio;
    while (n < 120 && (n === 0 ? primeiro : venc(m)) < hoje) { n++; m = somarMes(m, 1); }
    return { situacao: atrasoDias >= 30 ? 'critica' : 'atrasada', atrasoDias: atrasoDias, mesesEmAberto: n, desde: inicio };
  }

  /** Quanto a loja rende para a plataforma no mês. */
  function rendimento(loja, vendasMes, p) {
    var plano = p.planos[loja.plano] || p.planos.loja;
    var isento = loja.cobranca && loja.cobranca.isento;
    var assinatura = isento ? 0 : arred(plano.mensal);
    var v = vendasMes || {};
    var split = arred((Number(v.gmvPago) || 0) * p.splitPct / 100 + (Number(v.pagos) || 0) * p.splitFixo);
    var site = loja.dominio ? arred(p.dominioAno / 12) : 0;
    return { assinatura: assinatura, split: split, site: site, total: arred(assinatura + split + site) };
  }

  function custoIA(entrada, saida, p) {
    if (!p.iaPrecoEntradaMilhao && !p.iaPrecoSaidaMilhao) return null;
    return arred(entrada / 1e6 * p.iaPrecoEntradaMilhao + saida / 1e6 * p.iaPrecoSaidaMilhao);
  }

  /**
   * Monta o resumo do mês (o que o painel mostra). Só números e nomes de lojas:
   * nenhum dado das clientes finais entra aqui.
   *   db: { precos, lojas:{id:loja}, vendas:{lojaId:{'AAAA-MM':{pedidos,pagos,gmvPago,emAberto}}}, iaDia:{'AAAA-MM-DD':{lojaId:{pedidos,entrada,saida}}} }
   */
  function calcularResumo(db, agora) {
    agora = agora || new Date();
    var p = lerPrecos(db.precos);
    var m = mes(agora);
    var lojas = [], tot = { assinaturas: 0, split: 0, sites: 0, total: 0, gmv: 0, pedidosPagos: 0, pedidos: 0, ativas: 0, fila: 0, pausadas: 0, rascunho: 0, emAbertoLojas: 0, lojasAtrasadas: 0, implantacaoAReceber: 0 };
    var ia = { pedidos: 0, entrada: 0, saida: 0, custo: null, porDia: {}, porLoja: {} };
    Object.keys(db.iaDia || {}).forEach(function (d) {
      if (d.slice(0, 7) !== m) return;
      var porLoja = db.iaDia[d], diaTot = 0;
      Object.keys(porLoja).forEach(function (id) {
        var x = porLoja[id];
        ia.pedidos += x.pedidos || 0; ia.entrada += x.entrada || 0; ia.saida += x.saida || 0;
        diaTot += (x.entrada || 0) + (x.saida || 0);
        var pl = ia.porLoja[id] || (ia.porLoja[id] = { pedidos: 0, entrada: 0, saida: 0 });
        pl.pedidos += x.pedidos || 0; pl.entrada += x.entrada || 0; pl.saida += x.saida || 0;
      });
      ia.porDia[d] = diaTot;
    });
    ia.custo = custoIA(ia.entrada, ia.saida, p);

    Object.keys(db.lojas || {}).forEach(function (id) {
      var e = db.lojas[id];
      if (e.status === 'fila') tot.fila++;
      if (e.status === 'rascunho') tot.rascunho++;
      if (e.status === 'pausada') tot.pausadas++;
      if (e.implantacao && !e.implantacao.pago && (e.status === 'ativa' || e.status === 'fila')) tot.implantacaoAReceber += Number(e.implantacao.valor) || 0;
      if (e.status !== 'ativa' && e.status !== 'pausada') return;
      if (e.status === 'ativa') tot.ativas++;
      var v = ((db.vendas || {})[id] || {})[m] || { pedidos: 0, pagos: 0, gmvPago: 0, emAberto: 0 };
      var r = e.status === 'ativa' ? rendimento(e, v, p) : { assinatura: 0, split: 0, site: 0, total: 0 };
      var cob = situacaoCobranca(e, p, agora);
      var plano = p.planos[e.plano] || p.planos.loja;
      var emAberto = (cob.mesesEmAberto || 0) * (e.cobranca && e.cobranca.isento ? 0 : plano.mensal);
      var iaL = ia.porLoja[id] || { pedidos: 0, entrada: 0, saida: 0 };
      lojas.push({
        id: id, nome: e.nome, cidade: e.cidade || '', status: e.status, plano: e.plano, vitrine: e.vitrine || '', dominio: e.dominio || '',
        vendas: { pedidos: v.pedidos || 0, pagos: v.pagos || 0, gmvPago: arred(v.gmvPago), emAberto: v.emAberto || 0 },
        assinatura: r.assinatura, split: r.split, site: r.site, total: r.total,
        ia: { pedidos: iaL.pedidos, entrada: iaL.entrada, saida: iaL.saida, custo: custoIA(iaL.entrada, iaL.saida, p) },
        cobranca: Object.assign({ emAbertoValor: arred(emAberto) }, cob)
      });
      tot.assinaturas += r.assinatura; tot.split += r.split; tot.sites += r.site; tot.total += r.total;
      tot.gmv += Number(v.gmvPago) || 0; tot.pedidosPagos += v.pagos || 0; tot.pedidos += v.pedidos || 0;
      if (cob.situacao === 'atrasada' || cob.situacao === 'critica') { tot.lojasAtrasadas++; tot.emAbertoLojas += emAberto; }
    });
    Object.keys(tot).forEach(function (k) { tot[k] = arred(tot[k]); });
    tot.ticketMedio = tot.pedidosPagos ? arred(tot.gmv / tot.pedidosPagos) : 0;
    tot.ganhoPorVenda = tot.pedidosPagos ? arred(tot.split / tot.pedidosPagos) : 0;
    tot.ganhoACada100 = arred(p.splitPct);
    lojas.sort(function (a, b) { return b.total - a.total; });
    return { calculadoEm: agora.toISOString(), mes: m, precos: p, lojas: lojas, totais: tot, ia: ia };
  }

  /** Linha do mês para o histórico (merge por 'AAAA-MM'). */
  function linhaHistorico(resumo) {
    var t = resumo.totais;
    return { assinaturas: t.assinaturas, split: t.split, sites: t.sites, total: t.total, gmv: t.gmv, ativas: t.ativas, iaTokens: resumo.ia.entrada + resumo.ia.saida };
  }

  /** Próximo vencimento depois de "Paguei" numa conta recorrente, mantendo o dia combinado. */
  function proximoVencimento(conta) {
    var atual = conta.vence;
    var diaFixo = conta.diaFixo || +atual.slice(8, 10);
    var m = mes(atual);
    var prox = conta.recorrencia === 'anual' ? somarMes(m, 12) : somarMes(m, 1);
    var d = Math.min(diaFixo, diasNoMes(prox));
    return prox + '-' + pad(d);
  }

  /** Situação de uma conta a pagar. */
  function situacaoConta(conta, agora) {
    agora = agora || new Date();
    if (conta.pagoEm && conta.recorrencia === 'unica') return { situacao: 'paga', dias: 0 };
    var hoje = meiaNoite(agora), v = deDia(conta.vence);
    var dias = Math.round((v - hoje) / 864e5);
    if (dias < 0) return { situacao: 'vencida', dias: -dias };
    if (dias === 0) return { situacao: 'hoje', dias: 0 };
    return { situacao: 'aberta', dias: dias };
  }

  /** Simulador da tela Planos & preços. */
  function simular(p, s) {
    p = lerPrecos(p);
    var plano = p.planos[s.plano] || p.planos.loja;
    var lojas = Math.max(0, s.lojas | 0);
    var emDia = Math.min(100, Math.max(0, s.pctEmDia)) / 100;
    var assin = arred(lojas * plano.mensal * emDia);
    var gmvLoja = (s.pedidosLoja || 0) * (s.ticket || 0);
    var split = arred(lojas * (gmvLoja * p.splitPct / 100 + (s.pedidosLoja || 0) * p.splitFixo));
    var site = s.comDominio ? arred(lojas * p.dominioAno / 12) : 0;
    return { assinatura: assin, split: split, site: site, total: arred(assin + split + site) };
  }

  /** CSV com ';', BOM e proteção contra fórmula. */
  function csv(linhas) {
    var esc = function (v) {
      var s = v == null ? '' : String(v);
      if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
      if (/[;"\n\r]/.test(s)) s = '"' + s.replace(/"/g, '""') + '"';
      return s;
    };
    return '﻿' + linhas.map(function (l) { return l.map(esc).join(';'); }).join('\r\n');
  }

  return {
    PADRAO: PADRAO, lerPrecos: lerPrecos, validarPrecos: validarPrecos, situacaoCobranca: situacaoCobranca,
    rendimento: rendimento, custoIA: custoIA, calcularResumo: calcularResumo, linhaHistorico: linhaHistorico,
    proximoVencimento: proximoVencimento, situacaoConta: situacaoConta, simular: simular, csv: csv,
    util: { arred: arred, dia: dia, mes: mes, somarMes: somarMes, diasNoMes: diasNoMes, deDia: deDia }
  };
});
