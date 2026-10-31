/*
 * seed.js — dados de EXEMPLO do modo demonstração (marcados como exemplo; dá para apagar em Configurações).
 * As datas são relativas a hoje, para o painel sempre parecer vivo.
 */
(function (root) {
  'use strict';
  var C = root.Calc;

  function criar(agora) {
    agora = agora || new Date();
    var U = C.util, hoje = U.dia(agora), m = U.mes(agora);
    var mAnt = function (n) { return U.somarMes(m, -n); };
    var diaDoMes = function (mm, d) { return mm + '-' + (d < 10 ? '0' : '') + d; };
    var lojas = {
      ex1: { nome: 'Studio Vértice', marcaCurta: 'Vértice', marcaSub: 'FITNESS', cidade: 'Campo Grande, MS', instagram: 'studiovertice', plano: 'completo', vitrine: 'grafite-lima', dominio: 'studiovertice.com.br', status: 'ativa', ativadaEm: diaDoMes(mAnt(9), 3), cobranca: { pagoAte: m }, dono: { nome: 'Carla M.', celular: '67999990001', email: 'carla@exemplo.com' }, implantacao: { valor: 3000, pago: true } },
      ex2: { nome: 'Lua Praia & Fit', marcaCurta: 'Lua', marcaSub: 'PRAIA & FIT', cidade: 'Dourados, MS', instagram: 'luapraiafit', plano: 'loja', vitrine: 'verde-mata', dominio: 'luapraiafit.com.br', status: 'ativa', ativadaEm: diaDoMes(mAnt(7), 12), cobranca: { pagoAte: m }, dono: { nome: 'Bianca R.', celular: '67999990002', email: 'bianca@exemplo.com' }, implantacao: { valor: 1800, pago: true } },
      ex3: { nome: 'Curvas Plus', marcaCurta: 'Curvas', marcaSub: 'PLUS SIZE', cidade: 'Cuiabá, MT', instagram: 'curvasplus', plano: 'loja', vitrine: 'ameixa-coral', dominio: '', status: 'ativa', ativadaEm: diaDoMes(mAnt(5), 8), cobranca: { pagoAte: mAnt(1) }, dono: { nome: 'Paula S.', celular: '65999990003', email: 'paula@exemplo.com' }, implantacao: { valor: 1800, pago: true } },
      ex4: { nome: 'Pulse Wear', marcaCurta: 'Pulse', marcaSub: 'WEAR', cidade: 'Campo Grande, MS', instagram: 'pulsewear', plano: 'vitrine', vitrine: 'pink-pulse', dominio: '', status: 'ativa', ativadaEm: diaDoMes(mAnt(6), 20), cobranca: { pagoAte: mAnt(2) }, dono: { nome: 'Juliana T.', celular: '67999990004', email: 'ju@exemplo.com' }, implantacao: { valor: 600, pago: true } },
      ex5: { nome: 'Atleta Run', marcaCurta: 'Atleta', marcaSub: 'RUN', cidade: 'Três Lagoas, MS', instagram: 'atletarun', plano: 'completo', vitrine: 'azul-atleta', dominio: 'atletarun.com.br', status: 'ativa', ativadaEm: diaDoMes(mAnt(3), 2), cobranca: { pagoAte: m }, dono: { nome: 'Rafael P.', celular: '67999990005', email: 'rafa@exemplo.com' }, implantacao: { valor: 3000, pago: false } },
      ex6: { nome: 'Ateliê Lavanda', marcaCurta: 'Lavanda', marcaSub: 'ATELIÊ', cidade: 'Corumbá, MS', instagram: 'atelielavanda', plano: 'loja', vitrine: 'lavanda-suave', dominio: '', status: 'ativa', ativadaEm: diaDoMes(mAnt(4), 15), cobranca: { isento: true }, dono: { nome: 'Lívia A.', celular: '67999990006', email: 'livia@exemplo.com' }, implantacao: { valor: 0, pago: true } },
      ex7: { nome: 'Forte Cross', marcaCurta: 'Forte', marcaSub: 'CROSS', cidade: 'Campo Grande, MS', instagram: 'fortecross', plano: 'loja', vitrine: 'laranja-energia', dominio: '', status: 'pausada', ativadaEm: diaDoMes(mAnt(8), 10), cobranca: { pagoAte: mAnt(3) }, dono: { nome: 'Diego F.', celular: '67999990007', email: 'diego@exemplo.com' }, implantacao: { valor: 1800, pago: true } },
      ex8: { nome: 'Bem Básico', marcaCurta: 'Bem', marcaSub: 'BÁSICO', cidade: 'Ponta Porã, MS', instagram: 'bembasico', plano: 'vitrine', vitrine: 'caramelo', dominio: '', status: 'fila', criadaEm: diaDoMes(m, 1), cobranca: {}, dono: { nome: 'Marina L.', celular: '67999990008', email: 'marina@exemplo.com' }, implantacao: { valor: 600, pago: false } },
      ex9: { nome: 'Cápsula Store', marcaCurta: 'Cápsula', marcaSub: 'STORE', cidade: 'Campo Grande, MS', instagram: 'capsulastore', plano: 'completo', vitrine: 'editorial-bronze', dominio: '', status: 'rascunho', criadaEm: hoje, cobranca: {}, dono: { nome: 'Helena V.', celular: '67999990009', email: '' }, implantacao: { valor: 3000, pago: false } }
    };
    Object.keys(lojas).forEach(function (id) {
      var l = lojas[id];
      l.id = id; l.exemplo = true;
      l.slug = l.slug || l.instagram;
      l.criadaEm = l.criadaEm || l.ativadaEm;
      l.checklist = { logo: l.status !== 'rascunho', fotos: l.status === 'ativa' || l.status === 'pausada', produtos: l.status === 'ativa' || l.status === 'pausada', pagamento: l.status === 'ativa', dominio: !!l.dominio };
    });

    // vendas por mês (só números agregados: nada de dados das compradoras)
    var perfil = { ex1: [210, 168], ex2: [95, 142], ex3: [130, 155], ex4: [40, 98], ex5: [160, 185], ex6: [55, 120], ex7: [0, 0] };
    var vendas = {};
    Object.keys(perfil).forEach(function (id) {
      vendas[id] = {};
      for (var n = 5; n >= 0; n--) {
        var mm = mAnt(n), base = perfil[id][0], fator = 0.75 + (5 - n) * 0.06;
        if (lojas[id].ativadaEm && mm < lojas[id].ativadaEm.slice(0, 7)) continue;
        var pagos = Math.round(base * fator * (n === 0 ? Math.min(1, agora.getDate() / 30 + 0.15) : 1));
        vendas[id][mm] = { pedidos: Math.round(pagos * 1.12), pagos: pagos, gmvPago: C.util.arred(pagos * perfil[id][1]), emAberto: Math.round(pagos * 0.08) };
      }
    });

    // uso de IA por dia no mês (textos de produto, legendas): só contagem de tokens
    var iaDia = {};
    for (var d = 1; d <= agora.getDate(); d++) {
      var dd = diaDoMes(m, d), dia = {};
      ['ex1', 'ex2', 'ex3', 'ex5'].forEach(function (id, i) {
        var pedidos = (d * 7 + i * 3) % 9 + (i === 0 ? 4 : 1);
        dia[id] = { pedidos: pedidos, entrada: pedidos * 1800, saida: pedidos * 650 };
      });
      iaDia[dd] = dia;
    }

    var venceDia = function (n, mm) { return diaDoMes(mm || m, n); };
    var contasPagar = {
      c1: { nome: 'Firebase (Blaze)', detalhe: 'Hospedagem, banco e funções', valor: 85, vence: venceDia(15), diaFixo: 15, recorrencia: 'mensal', categoria: 'infra' },
      c2: { nome: 'API de IA', detalhe: 'Textos de produto e legendas', valor: 120, vence: venceDia(Math.min(agora.getDate() + 3, 28)), diaFixo: Math.min(agora.getDate() + 3, 28), recorrencia: 'mensal', categoria: 'ia' },
      c3: { nome: 'Simples Nacional (DAS)', detalhe: 'Imposto do mês anterior', valor: 410, vence: venceDia(20), diaFixo: 20, recorrencia: 'mensal', categoria: 'imposto' },
      c4: { nome: 'Contador', detalhe: 'Honorários mensais', valor: 350, vence: venceDia(Math.max(agora.getDate() - 2, 1)), diaFixo: Math.max(agora.getDate() - 2, 1), recorrencia: 'mensal', categoria: 'servico' },
      c5: { nome: 'Registro.br', detalhe: 'Domínio provador.com.br', valor: 40, vence: venceDia(5, U.somarMes(m, 2)), diaFixo: 5, recorrencia: 'anual', categoria: 'dominio' }
    };
    Object.keys(contasPagar).forEach(function (id) { contasPagar[id].id = id; contasPagar[id].exemplo = true; contasPagar[id].criadoEm = hoje; });

    var leads = {
      l1: { id: 'l1', nome: 'Renata Souza', loja: 'Re Fit Moda', instagram: 'refitmoda', whatsapp: '67999998801', vitrine: 'rubi-dourado', plano: 'loja', mensagem: 'Vendo pelo Instagram e quero um site com Pix.', criadoEm: new Date(agora - 2 * 864e5).toISOString(), status: 'novo', exemplo: true },
      l2: { id: 'l2', nome: 'Talita Gomes', loja: 'Tali Basics', instagram: 'talibasics', whatsapp: '67999998802', vitrine: 'preto-puro', plano: 'vitrine', mensagem: '', criadoEm: new Date(agora - 5 * 864e5).toISOString(), status: 'contatado', exemplo: true }
    };

    // histórico dos 6 meses anteriores (o mês atual entra pelo cálculo)
    var historico = {};
    var dbTmp = { precos: C.PADRAO, lojas: lojas, vendas: vendas, iaDia: {} };
    for (var k = 6; k >= 1; k--) {
      var mm = mAnt(k), fim = new Date(+mm.slice(0, 4), +mm.slice(5, 7), 0, 23, 59, 59);
      var r = C.calcularResumo(dbTmp, fim);
      historico[mm] = C.linhaHistorico(r);
      historico[mm].iaTokens = 900000 + k * 120000;
    }

    var auditoria = [
      { quando: new Date(agora - 864e5).toISOString(), quem: 'dono', oque: 'Registrou pagamento da mensalidade', colecao: 'lojas', alvo: 'Studio Vértice' },
      { quando: new Date(agora - 3 * 864e5).toISOString(), quem: 'dono', oque: 'Pausou a loja', colecao: 'lojas', alvo: 'Forte Cross' },
      { quando: new Date(agora - 4 * 864e5).toISOString(), quem: 'servidor', oque: 'Teto de IA em 60%', colecao: 'pedidosIA', alvo: 'Plataforma' }
    ];

    return {
      versao: 1, exemplo: true, criadoEm: agora.toISOString(),
      precos: JSON.parse(JSON.stringify(C.PADRAO)),
      lojas: lojas, vendas: vendas, iaDia: iaDia, contasPagar: contasPagar, leads: leads,
      historico: historico, auditoria: auditoria,
      config: { emailServico: { configurado: false }, avisos: { contasDias: 5, iaPct: 80 } }
    };
  }

  function vazio(agora) {
    var d = criar(agora);
    return { versao: 1, exemplo: false, criadoEm: d.criadoEm, precos: d.precos, lojas: {}, vendas: {}, iaDia: {}, contasPagar: {}, leads: {}, historico: {}, auditoria: [], config: d.config };
  }

  root.Seed = { criar: criar, vazio: vazio };
})(typeof self !== 'undefined' ? self : this);
