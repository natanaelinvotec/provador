/*
 * telas.js — as telas do mega painel. Uma tela por pergunta do dono:
 * quanto ganho? quem me deve? o que vence? quanto gasto com IA? quem quer uma loja?
 */
(function () {
  'use strict';
  var P = window.Plataforma, C = window.Calc, PN = window.Painel;
  var u = PN.u, g = PN.g, esc = u.esc, brl = u.brl, brl0 = u.brl0, num = u.num, pct = u.pct, ic = u.icone;
  var T = PN.telas, A = PN.acoes, F = PN.forms, D = PN.depois;

  /* ---------- pedaços ---------- */
  function kpi(rotulo, valor, detalhe) {
    return '<div class="mg-card mg-kpi"><span>' + esc(rotulo) + '</span><b>' + valor + '</b>' + (detalhe ? '<small>' + detalhe + '</small>' : '') + '</div>';
  }
  function card(titulo, sub, corpo, acoes) {
    return '<section class="mg-card"><div class="mg-card-topo"><div><h2>' + esc(titulo) + '</h2>' + (sub ? '<p class="mg-sub">' + sub + '</p>' : '') + '</div>' + (acoes || '') + '</div>' + corpo + '</section>';
  }
  function vazio(titulo, texto, botao) { return '<div class="mg-vazio"><b>' + esc(titulo) + '</b>' + esc(texto) + (botao ? '<div style="margin-top:12px">' + botao + '</div>' : '') + '</div>'; }
  function lista(obj) { return Object.keys(obj || {}).map(function (k) { return obj[k]; }); }
  function linkLoja(l) { return new URL('../vitrine.html?l=' + encodeURIComponent(l.slug), location.href).href; }
  function linhaResumo(d, id) { var r = null; (d.resumo ? d.resumo.lojas : []).forEach(function (x) { if (x.id === id) r = x; }); return r; }
  function nomePlano(d, id) { return (d.precos.planos[id] || {}).nome || id; }
  function contasDoMes(d, mes) {
    return lista(d.contasPagar).filter(function (c) { return c.vence.slice(0, 7) === mes || (c.ultimoPagamento || c.pagoEm || '').slice(0, 7) === mes; });
  }
  function catalogo(st) {
    if (st.catalogo) return Promise.resolve(st.catalogo);
    return P.catalogo('../').then(function (c) { st.catalogo = c; return c; });
  }
  function nomeVitrine(st, slug) { var v = (st.catalogo || []).filter(function (x) { return x.slug === slug; })[0]; return v ? v.nome : (slug || '—'); }
  function erroCampos(form, campos) {
    Array.prototype.forEach.call(form.querySelectorAll('.mg-campo'), function (c) { c.classList.remove('erro'); });
    Array.prototype.forEach.call(form.querySelectorAll('[aria-invalid]'), function (el) { el.removeAttribute('aria-invalid'); });
    (campos || []).forEach(function (k) { var el = form.querySelector('[name="' + k + '"]'); if (el) { el.setAttribute('aria-invalid', 'true'); el.closest('.mg-campo').classList.add('erro'); } });
    var primeiro = form.querySelector('.mg-campo.erro input,.mg-campo.erro select');
    if (primeiro) primeiro.focus();
  }

  /* =================== Visão geral =================== */
  T.inicio = function (d, st) {
    var r = d.resumo, t = r.totais, mes = r.mes;
    var contas = contasDoMes(d, mes);
    var temIA = contas.some(function (c) { return c.categoria === 'ia'; });
    var saidas = contas.map(function (c) { return { nome: c.nome, v: Number(c.valor) || 0 }; });
    if (!temIA && r.ia.custo) saidas.push({ nome: 'IA (estimado pelos tokens)', v: r.ia.custo });
    var totSaidas = saidas.reduce(function (a, b) { return a + b.v; }, 0);
    var sobra = C.util.arred(t.total - totSaidas);
    var margem = t.total ? sobra / t.total * 100 : 0;

    var k = '<div class="mg-grade mg-g4">' +
      kpi('Receita prevista no mês', brl(t.total), 'mensalidades, split e domínios') +
      kpi('Sobra depois das contas', brl(sobra), '<span class="' + (sobra >= 0 ? 'pos' : 'neg') + '">' + pct(margem) + '</span> de margem') +
      kpi('Lojas ativas', num(t.ativas), num(t.fila) + ' na fila, ' + num(t.pausadas) + ' pausada' + (t.pausadas === 1 ? '' : 's')) +
      kpi('Vendas das lojas no mês', brl0(t.gmv), num(t.pedidosPagos) + ' pedidos pagos; você ganha ' + brl(t.ganhoPorVenda) + ' por venda') + '</div>';

    // caixa do mês
    var max = Math.max(t.total, totSaidas, 1), acum = 0, linhas = '';
    var entra = [['Mensalidades', t.assinaturas, 'var(--s1)'], ['Split previsto', t.split, 'var(--s2)'], ['Domínios', t.sites, 'var(--s3)']];
    entra.forEach(function (e) {
      linhas += '<div class="lin"><span>+ ' + esc(e[0]) + '</span><span class="barra"><i style="left:' + (acum / max * 100).toFixed(2) + '%;width:' + (e[1] / max * 100).toFixed(2) + '%;background:' + e[2] + '"></i></span><span class="v">' + brl(e[1]) + '</span></div>';
      acum += e[1];
    });
    saidas.forEach(function (s) {
      linhas += '<div class="lin"><span>− ' + esc(s.nome) + '</span><span class="barra"><i style="left:' + (Math.max(0, acum - s.v) / max * 100).toFixed(2) + '%;width:' + (Math.min(s.v, acum) / max * 100).toFixed(2) + '%;background:#9FB0B3"></i></span><span class="v">− ' + brl(s.v) + '</span></div>';
      acum -= s.v;
    });
    linhas += '<div class="lin tot"><b>= Sobra para você</b><span class="barra"><i style="left:0;width:' + (Math.max(0, sobra) / max * 100).toFixed(2) + '%;background:var(--navy)"></i></span><span class="v">' + brl(sobra) + '</span></div>';
    var caixa = card('Caixa do mês', 'O que entra das lojas menos as contas do mês' + (r.precos.gatewayLigado ? '' : '. O split ainda é previsto.'), '<div class="mg-cascata">' + linhas + '</div>');

    // precisa de você
    var itens = [];
    (r.lojas || []).forEach(function (l) {
      if (l.cobranca.situacao === 'critica' || l.cobranca.situacao === 'atrasada')
        itens.push({ p: l.cobranca.situacao === 'critica' ? 0 : 1, ic: 'alerta', t: l.nome + ' está com a mensalidade atrasada', s: l.cobranca.atrasoDias + ' dias, desde ' + u.nomeMes(l.cobranca.desde), b: '<a class="mg-btn mini" href="#inad">Ver</a>' });
    });
    lista(d.contasPagar).forEach(function (c) {
      var s = C.situacaoConta(c), lim = (d.config && d.config.avisos && d.config.avisos.contasDias) || 5;
      if (s.situacao === 'vencida') itens.push({ p: 0, ic: 'calendario', t: c.nome + ' venceu há ' + s.dias + ' dia' + (s.dias === 1 ? '' : 's'), s: brl(c.valor), b: '<a class="mg-btn mini" href="#contas">Pagar</a>' });
      else if (s.situacao === 'hoje') itens.push({ p: 1, ic: 'calendario', t: c.nome + ' vence hoje', s: brl(c.valor), b: '<a class="mg-btn mini" href="#contas">Pagar</a>' });
      else if (s.situacao === 'aberta' && s.dias <= lim) itens.push({ p: 2, ic: 'calendario', t: c.nome + ' vence em ' + s.dias + ' dia' + (s.dias === 1 ? '' : 's'), s: brl(c.valor), b: '<a class="mg-btn mini" href="#contas">Ver</a>' });
    });
    if (r.totais.fila) itens.push({ p: 2, ic: 'loja', t: r.totais.fila + ' loja' + (r.totais.fila === 1 ? '' : 's') + ' esperando ativação', s: 'Confira o cadastro e gere o site', b: '<a class="mg-btn mini" href="#lojas/fila">Ativar</a>' });
    var leadsNovos = lista(d.leads).filter(function (l) { return l.status === 'novo'; }).length;
    if (leadsNovos) itens.push({ p: 2, ic: 'funil', t: leadsNovos + ' pedido' + (leadsNovos === 1 ? '' : 's') + ' de loja pelo site', s: 'Responda enquanto a cliente está quente', b: '<a class="mg-btn mini" href="#leads">Responder</a>' });
    if (r.precos.iaTetoMes && r.ia.custo != null) {
      var usoIA = r.ia.custo / r.precos.iaTetoMes * 100, lim2 = (d.config && d.config.avisos && d.config.avisos.iaPct) || 80;
      if (usoIA >= lim2) itens.push({ p: 1, ic: 'chip', t: 'IA em ' + pct(usoIA) + ' do teto do mês', s: brl(r.ia.custo) + ' de ' + brl(r.precos.iaTetoMes), b: '<a class="mg-btn mini" href="#ia">Ver</a>' });
    }
    if (r.totais.implantacaoAReceber) itens.push({ p: 3, ic: 'moedas', t: 'Implantações a receber', s: brl(r.totais.implantacaoAReceber), b: '<a class="mg-btn mini" href="#lojas/ativas">Ver</a>' });
    itens.sort(function (a, b) { return a.p - b.p; });
    var precisa = card('Precisa de você', 'Mais urgente primeiro', itens.length ?
      '<ul class="mg-lista">' + itens.map(function (i) { return '<li><span class="mg-chip ' + (i.p === 0 ? 'cr' : i.p === 1 ? 'at' : 'info') + '">' + ic(i.ic) + (i.p === 0 ? 'Urgente' : i.p === 1 ? 'Atenção' : 'Aviso') + '</span><span class="tx"><b>' + esc(i.t) + '</b><span>' + esc(i.s) + '</span></span>' + i.b + '</li>'; }).join('') + '</ul>' :
      vazio('Nada pendente agora.', 'Quando uma conta vencer ou uma loja atrasar, aparece aqui.'));

    // receita por mês
    var meses = Object.keys(d.historico || {}).sort().slice(-6);
    var dadosMes = meses.map(function (m) { var h = d.historico[m]; return { rotulo: u.nomeMes(m), valores: [h.assinaturas || 0, h.split || 0, h.sites || 0] }; });
    var receita = card('Receita por mês', 'Últimos 6 meses. O mês atual ainda está correndo.', dadosMes.length ? g.colunasEmpilhadas(dadosMes, g.SERIES, 'Receita por mês') : vazio('Sem histórico ainda', 'O primeiro mês aparece quando os números forem calculados.'));

    // quanto cada loja rende
    var rende = (r.lojas || []).filter(function (l) { return l.total > 0; }).map(function (l) { return { nome: l.nome, partes: [l.assinatura, l.split, l.site] }; });
    var porLoja = card('Quanto cada loja rende', 'No mês, somando mensalidade, split e domínio.', rende.length ? g.barrasH(rende, g.SERIES) : vazio('Nenhuma loja rendendo ainda', 'Ative a primeira loja para ver aqui.', '<a class="mg-btn mini" href="#lojas">Abrir lojas</a>'));

    return k + '<div class="mg-grade mg-g21" style="margin-top:18px">' + caixa + precisa + '</div>' +
      '<div class="mg-grade mg-g2" style="margin-top:18px">' + receita + porLoja + '</div>';
  };

  /* =================== Lojas =================== */
  var ABAS = [['fila', 'Na fila'], ['ativas', 'Ativas'], ['pausadas', 'Pausadas'], ['incompleto', 'Cadastro incompleto'], ['todas', 'Todas']];
  function abaDe(l) { return l.status === 'fila' ? 'fila' : l.status === 'ativa' ? 'ativas' : l.status === 'pausada' ? 'pausadas' : l.status === 'rascunho' ? 'incompleto' : 'outras'; }
  T.lojas = function (d, st) {
    var sub = (location.hash.split('/')[1] || st.lojasAba || 'ativas');
    if (!ABAS.some(function (a) { return a[0] === sub; })) sub = 'ativas';
    st.lojasAba = sub;
    var busca = (st.busca || '').toLowerCase();
    var todas = lista(d.lojas);
    var cont = { todas: todas.length };
    todas.forEach(function (l) { var a = abaDe(l); cont[a] = (cont[a] || 0) + 1; });
    var filtradas = todas.filter(function (l) { return (sub === 'todas' || abaDe(l) === sub) && (!busca || [l.nome, l.cidade, l.dono && l.dono.nome, l.instagram].join(' ').toLowerCase().indexOf(busca) >= 0); })
      .sort(function (a, b) { return (a.nome || '').localeCompare(b.nome || ''); });
    var abas = '<div class="mg-abas" role="tablist">' + ABAS.map(function (a) {
      return '<a class="mg-aba" role="tab" href="#lojas/' + a[0] + '" aria-selected="' + (a[0] === sub) + '">' + esc(a[1]) + '<span class="c">' + (cont[a[0]] || 0) + '</span></a>';
    }).join('') + '</div>';
    var barra = '<div class="mg-card-topo" style="margin-bottom:16px">' + abas + '<div class="mg-botoes"><input class="mg-busca" type="search" id="mg-busca" placeholder="Buscar por nome, cidade ou dono" value="' + esc(st.busca || '') + '" aria-label="Buscar loja">' +
      '<button class="mg-btn pri" type="button" data-acao="loja-nova">' + ic('mais') + 'Nova loja</button></div></div>';
    var corpo;
    if (!filtradas.length) {
      if (busca) corpo = '<div class="mg-card">' + vazio('Nenhuma loja com "' + st.busca + '".', 'Confira a grafia ou busque pela cidade.', '<button class="mg-btn mini" type="button" data-acao="limpar-busca">Limpar busca</button>') + '</div>';
      else if (sub === 'fila') corpo = '<div class="mg-card">' + vazio('Ninguém esperando ativação.', 'Lojas novas aparecem aqui sozinhas quando alguém pede pelo site, ou quando você cadastra.', '<button class="mg-btn mini" type="button" data-acao="loja-nova">Cadastrar loja</button>') + '</div>';
      else corpo = '<div class="mg-card">' + vazio('Nada nesta aba.', 'Troque de aba ou cadastre uma loja nova.') + '</div>';
    } else corpo = '<div class="mg-grade" style="gap:14px">' + filtradas.map(function (l) { return cartaoLoja(d, st, l); }).join('') + '</div>';
    return barra + corpo;
  };
  function cartaoLoja(d, st, l) {
    var r = linhaResumo(d, l.id), ck = l.checklist || {};
    var checks = [['logo', 'Logo'], ['fotos', 'Fotos'], ['produtos', 'Produtos'], ['pagamento', 'Pagamento'], ['dominio', 'Domínio']].map(function (c) {
      return '<span class="mg-chip ' + (ck[c[0]] ? 'ok' : '') + '">' + ic(ck[c[0]] ? 'check' : 'relogio') + esc(c[1]) + '</span>';
    }).join('');
    var dinheiro = '';
    if (l.status === 'ativa' || l.status === 'pausada') {
      var cob = r ? r.cobranca : C.situacaoCobranca(l, d.precos);
      var extraChip = cob.situacao === 'atrasada' || cob.situacao === 'critica' ? cob.atrasoDias + ' dias' : '';
      dinheiro = '<div class="mg-dinheiro">' +
        '<div>Mensalidade' + u.chipSituacao(cob.situacao, extraChip) + '</div>' +
        '<div>Pago até<b>' + esc(l.cobranca && l.cobranca.pagoAte ? u.nomeMes(l.cobranca.pagoAte) : (l.cobranca && l.cobranca.isento ? 'isenta' : '—')) + '</b></div>' +
        '<div>Vendas no mês<b>' + (r ? brl0(r.vendas.gmvPago) : '—') + '</b></div>' +
        '<div>Pedidos pagos<b>' + (r ? num(r.vendas.pagos) : '—') + '</b></div>' +
        '<div>Mensalidade<b>' + (r ? brl(r.assinatura) : '—') + '</b></div>' +
        '<div>Split previsto<b>' + (r ? brl(r.split) : '—') + '</b></div>' +
        '<div>Rende no mês<b>' + (r ? brl(r.total) : '—') + '</b></div>' +
        '<div>Implantação<b>' + (l.implantacao && l.implantacao.valor ? brl0(l.implantacao.valor) + (l.implantacao.pago ? ' paga' : ' a receber') : '—') + '</b></div></div>';
    }
    var b = [];
    if (l.status === 'fila' || l.status === 'rascunho') b.push('<button class="mg-btn mini pri" type="button" data-acao="loja-ativar" data-id="' + esc(l.id) + '">' + ic('play') + 'Ativar</button>');
    b.push('<button class="mg-btn mini" type="button" data-acao="loja-gerar" data-id="' + esc(l.id) + '">' + ic('vitrine') + (l.siteGeradoEm || l.status === 'ativa' ? 'Trocar vitrine' : 'Gerar site') + '</button>');
    if (l.status === 'ativa') {
      b.push('<a class="mg-btn mini" href="' + esc(linkLoja(l)) + '" target="_blank" rel="noopener">' + ic('abrir') + 'Abrir loja</a>');
      b.push('<button class="mg-btn mini" type="button" data-acao="loja-copiar" data-id="' + esc(l.id) + '">' + ic('copiar') + 'Copiar link</button>');
      b.push('<button class="mg-btn mini" type="button" data-acao="loja-pagamento" data-id="' + esc(l.id) + '">' + ic('check') + 'Registrar pagamento</button>');
      b.push('<button class="mg-btn mini" type="button" data-acao="' + (l.cobranca && l.cobranca.isento ? 'loja-cobrar' : 'loja-isentar') + '" data-id="' + esc(l.id) + '">' + (l.cobranca && l.cobranca.isento ? 'Voltar a cobrar' : 'Isentar') + '</button>');
      if (l.implantacao && l.implantacao.valor && !l.implantacao.pago) b.push('<button class="mg-btn mini" type="button" data-acao="loja-implantacao" data-id="' + esc(l.id) + '">Implantação paga</button>');
      b.push('<button class="mg-btn mini" type="button" data-acao="loja-pausar" data-id="' + esc(l.id) + '">' + ic('pausa') + 'Pausar</button>');
    }
    if (l.status === 'pausada') b.push('<button class="mg-btn mini" type="button" data-acao="loja-reativar" data-id="' + esc(l.id) + '">' + ic('play') + 'Reativar</button>');
    b.push('<button class="mg-btn mini" type="button" data-acao="loja-editar" data-id="' + esc(l.id) + '">' + ic('lapis') + 'Editar dados</button>');
    if (l.dono && l.dono.celular) b.push('<a class="mg-btn mini" href="' + esc(u.waLink(l.dono.celular)) + '" target="_blank" rel="noopener">' + ic('conversa') + 'WhatsApp</a>');
    b.push('<button class="mg-btn mini perigo" type="button" data-acao="loja-excluir" data-id="' + esc(l.id) + '">' + ic('lixo') + 'Excluir</button>');
    return '<article class="mg-card mg-loja"><div class="mg-loja-topo"><div><h3>' + esc(l.nome) + (l.exemplo ? ' <span class="mg-chip">Exemplo</span>' : '') + '</h3>' +
      '<div class="meta">' + esc([l.cidade, 'plano ' + nomePlano(d, l.plano), 'vitrine ' + nomeVitrine(st, l.vitrine), l.dominio || 'sem domínio próprio'].filter(Boolean).join(', ')) + '</div>' +
      '<div class="meta">Dono: ' + esc((l.dono && l.dono.nome) || '—') + (l.instagram ? ', Instagram @' + esc(l.instagram) : '') + '</div></div>' +
      '<div>' + u.chipSituacao(l.status) + '</div></div><div class="mg-checks">' + checks + '</div>' + dinheiro + '<div class="mg-botoes">' + b.join('') + '</div></article>';
  }
  D.lojas = function (main, st) {
    catalogo(st).then(function () { if (!st.catalogoDesenhado) { st.catalogoDesenhado = true; PN.render(); } });
    var bus = main.querySelector('#mg-busca');
    if (bus) bus.addEventListener('input', function () {
      st.busca = bus.value;
      clearTimeout(st.buscaT);
      st.buscaT = setTimeout(function () { var pos = bus.selectionStart; PN.render(); var nb = document.getElementById('mg-busca'); if (nb) { nb.focus(); nb.setSelectionRange(pos, pos); } }, 180);
    });
  };
  A['limpar-busca'] = function (el, st) { st.busca = ''; PN.render(); };

  function formLoja(d, st, l, extra) {
    l = l || { plano: 'loja', status: 'fila', dono: {}, implantacao: {} };
    var planos = Object.keys(d.precos.planos).map(function (k) { return '<option value="' + k + '"' + (l.plano === k ? ' selected' : '') + '>' + esc(d.precos.planos[k].nome) + ' (' + brl0(d.precos.planos[k].mensal) + '/mês)</option>'; }).join('');
    var vits = '<option value="">Escolher depois</option>' + (st.catalogo || []).map(function (v) { return '<option value="' + esc(v.slug) + '"' + (l.vitrine === v.slug ? ' selected' : '') + '>' + esc(v.nome) + '</option>'; }).join('');
    var campo = function (rot, nome, val, tipo, extraAttr, dica) {
      return '<label class="mg-campo">' + esc(rot) + '<input name="' + nome + '" type="' + (tipo || 'text') + '" value="' + esc(val == null ? '' : val) + '"' + (extraAttr || '') + '>' + (dica ? '<small>' + esc(dica) + '</small>' : '') + '</label>';
    };
    return '<h2>' + (l.id ? 'Editar ' + esc(l.nome) : 'Nova loja') + '</h2><p class="mg-sub">Os campos com * são obrigatórios. O resto dá para completar depois.</p>' +
      '<form data-form="loja" novalidate style="margin-top:16px"><input type="hidden" name="id" value="' + esc(l.id || '') + '">' + (extra && extra.lead ? '<input type="hidden" name="lead" value="' + esc(extra.lead) + '">' : '') +
      '<div class="mg-form">' +
      campo('Nome da loja *', 'nome', l.nome, 'text', ' maxlength="80" required') +
      campo('Nome curto no logo', 'marcaCurta', l.marcaCurta, 'text', ' maxlength="24"', 'Ex.: Ais') +
      campo('Linha embaixo do logo', 'marcaSub', l.marcaSub, 'text', ' maxlength="30"', 'Ex.: MODA FITNESS') +
      campo('Cidade', 'cidade', l.cidade, 'text', ' maxlength="60"', 'Ex.: Campo Grande, MS') +
      campo('Instagram da loja', 'instagram', l.instagram, 'text', ' maxlength="40"', 'Sem o @. Vira o endereço da loja.') +
      campo('WhatsApp da loja', 'whatsappLoja', l.whatsappLoja, 'tel', ' maxlength="20"') +
      campo('Nome do dono *', 'donoNome', (l.dono || {}).nome, 'text', ' maxlength="80" required') +
      campo('Celular do dono *', 'donoCelular', (l.dono || {}).celular, 'tel', ' maxlength="20" required') +
      campo('E-mail do dono', 'donoEmail', (l.dono || {}).email, 'email', ' maxlength="120"') +
      '<label class="mg-campo">Plano<select name="plano">' + planos + '</select></label>' +
      '<label class="mg-campo">Vitrine<select name="vitrine">' + vits + '</select></label>' +
      campo('Implantação (R$)', 'implantacao', (l.implantacao || {}).valor != null ? l.implantacao.valor : d.precos.planos[l.plano || 'loja'].implantacao, 'number', ' min="0" step="0.01"') +
      campo('Domínio próprio', 'dominio', l.dominio, 'text', ' maxlength="120" placeholder="aismodafitness.com.br"', 'Sem https e sem barra.') +
      campo('Teste grátis até', 'trialAte', l.trialAte ? String(l.trialAte).slice(0, 10) : '', 'date') +
      '</div><div class="rodape"><button class="mg-btn" type="button" data-acao="fechar-modal">Cancelar</button><button class="mg-btn pri" type="submit">' + (l.id ? 'Salvar dados' : 'Cadastrar loja') + '</button></div></form>';
  }
  A['loja-nova'] = function (el, st) { catalogo(st).then(function () { PN.abrirModal(formLoja(st.dados, st, null)); }); };
  A['loja-editar'] = function (el, st) { var l = st.dados.lojas[el.dataset.id]; catalogo(st).then(function () { PN.abrirModal(formLoja(st.dados, st, l)); }); };
  F.loja = function (f, st) {
    var v = function (n) { return f.elements[n] ? f.elements[n].value.trim() : ''; };
    var erros = [];
    if (v('nome').length < 2) erros.push('nome');
    if (v('donoNome').length < 2) erros.push('donoNome');
    if (v('donoCelular').replace(/\D/g, '').length < 10) erros.push('donoCelular');
    var dom = v('dominio').toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '');
    if (dom && !P.hostValido(dom)) erros.push('dominio');
    var impl = v('implantacao') === '' ? 0 : Number(v('implantacao'));
    if (!(impl >= 0 && impl <= 100000)) erros.push('implantacao');
    if (erros.length) { erroCampos(f, erros); PN.aviso('Confira os campos marcados.'); return; }
    var antes = v('id') ? st.dados.lojas[v('id')] : null;
    var loja = {
      id: v('id') || undefined, nome: v('nome'), marcaCurta: v('marcaCurta'), marcaSub: v('marcaSub'), cidade: v('cidade'),
      instagram: v('instagram').replace(/^@/, ''), whatsappLoja: v('whatsappLoja'), plano: v('plano'), vitrine: v('vitrine'), dominio: dom,
      trialAte: v('trialAte') || null,
      dono: { nome: v('donoNome'), celular: v('donoCelular').replace(/\D/g, ''), email: v('donoEmail') },
      implantacao: { valor: impl, pago: antes && antes.implantacao ? !!antes.implantacao.pago : false }
    };
    // domínio novo recomeça a lista de passos (chave e Hosting precisam ser feitos para ele)
    loja.dominioPassos = antes && antes.dominio && dom && antes.dominio.replace(/^www\./, '') === dom.replace(/^www\./, '') ? (antes.dominioPassos || {}) : {};
    if (!antes) { loja.status = 'fila'; loja.cobranca = {}; loja.checklist = { logo: false, fotos: false, produtos: false, pagamento: false, dominio: !!dom }; }
    else loja.checklist = Object.assign({}, antes.checklist, { dominio: !!dom });
    P.salvarLoja(loja).then(function (l) {
      var lead = v('lead');
      var fim = lead ? P.salvarLead({ id: lead, status: 'convertido' }) : Promise.resolve();
      return fim.then(function () { PN.fecharModal(); PN.aviso(antes ? 'Dados salvos' : 'Loja cadastrada na fila'); if (!antes) location.hash = 'lojas/fila'; return PN.recarregar(); });
    }).catch(function () { PN.aviso('Não foi possível salvar. Tente de novo.'); });
  };
  function acaoLoja(acao, msg, extra) {
    return function (el, st) {
      el.disabled = true;
      P.acaoLoja(el.dataset.id, acao, extra).then(function () { PN.aviso(msg); return PN.recarregar(); })
        .catch(function (e) { el.disabled = false; PN.aviso((e && e.message) || 'Não foi possível concluir.'); });
    };
  }
  A['loja-ativar'] = function (el, st) {
    var l = st.dados.lojas[el.dataset.id];
    if (!l.vitrine) { PN.aviso('Escolha a vitrine antes de ativar.'); return A['loja-gerar'](el, st); }
    acaoLoja('ativar', 'Loja ativada')(el, st);
  };
  A['loja-pausar'] = acaoLoja('pausar', 'Loja pausada');
  A['loja-reativar'] = acaoLoja('reativar', 'Loja reativada');
  // pagamento: pergunta quantos meses entraram (padrão = o que está em aberto)
  A['loja-pagamento'] = function (el, st) {
    var l = st.dados.lojas[el.dataset.id], p = st.dados.precos;
    var sit = C.situacaoCobranca(l, C.lerPrecos(p));
    var devidos = Math.max(1, sit.mesesEmAberto || 0), mensal = (p.planos[l.plano] || p.planos.loja).mensal;
    var ops = '';
    for (var n = 1; n <= Math.max(12, devidos); n++) ops += '<option value="' + n + '"' + (n === devidos ? ' selected' : '') + '>' + n + (n === 1 ? ' mês' : ' meses') + ' (' + brl(n * mensal) + ')</option>';
    PN.abrirModal('<h2>Pagamento da ' + esc(l.nome) + '</h2><p class="mg-sub">' + (sit.mesesEmAberto ? 'Em aberto: ' + sit.mesesEmAberto + (sit.mesesEmAberto === 1 ? ' mês' : ' meses') + ', desde ' + u.nomeMes(sit.desde) + '.' : 'Em dia. O pagamento adianta os próximos meses.') + '</p>' +
      '<form data-form="pagamento" novalidate style="margin-top:16px"><input type="hidden" name="id" value="' + esc(l.id) + '">' +
      '<label class="mg-campo">Quantos meses ela pagou<select name="meses">' + ops + '</select></label>' +
      '<div class="rodape"><button class="mg-btn" type="button" data-acao="fechar-modal">Cancelar</button><button class="mg-btn pri" type="submit">Registrar pagamento</button></div></form>');
  };
  F.pagamento = function (f, st) {
    var meses = Math.min(120, Math.max(1, parseInt(f.elements.meses.value, 10) || 1));
    P.acaoLoja(f.elements.id.value, 'pagamento', { meses: meses }).then(function (l) {
      PN.fecharModal(); PN.aviso('Pagamento registrado. Pago até ' + u.nomeMes(l.cobranca.pagoAte)); return PN.recarregar();
    }).catch(function (e) { PN.aviso((e && e.message) || 'Não foi possível registrar.'); });
  };
  A['loja-isentar'] = acaoLoja('isentar', 'Mensalidade isenta');
  A['loja-cobrar'] = acaoLoja('cobrar', 'Cobrança retomada a partir deste mês');
  A['loja-implantacao'] = acaoLoja('implantacaoPaga', 'Implantação registrada como paga');
  A['loja-copiar'] = function (el, st) {
    var l = st.dados.lojas[el.dataset.id], link = linkLoja(l);
    (navigator.clipboard ? navigator.clipboard.writeText(link) : Promise.reject()).then(function () { PN.aviso('Link copiado'); })
      .catch(function () { window.prompt('Copie o link da loja:', link); });
  };
  A['loja-excluir'] = function (el, st) {
    var l = st.dados.lojas[el.dataset.id];
    PN.abrirModal('<h2>Excluir ' + esc(l.nome) + ' definitivamente?</h2><p class="mg-sub">Some do painel, da vitrine e do domínio. Não dá para desfazer. Para confirmar, digite o nome da loja.</p>' +
      '<form data-form="excluir" novalidate style="margin-top:16px"><input type="hidden" name="id" value="' + esc(l.id) + '"><label class="mg-campo">Nome da loja<input name="confirma" autocomplete="off"></label>' +
      '<div class="rodape"><button class="mg-btn" type="button" data-acao="fechar-modal">Cancelar</button><button class="mg-btn perigo" type="submit">Excluir definitivamente</button></div></form>');
  };
  F.excluir = function (f, st) {
    var l = st.dados.lojas[f.elements.id.value];
    if (!l || f.elements.confirma.value.trim() !== l.nome) { erroCampos(f, ['confirma']); PN.aviso('O nome não confere.'); return; }
    P.acaoLoja(l.id, 'excluir').then(function () { PN.fecharModal(); PN.aviso('Loja excluída'); return PN.recarregar(); });
  };

  // gerar site: escolher a vitrine e receber o link
  A['loja-gerar'] = function (el, st) {
    var l = st.dados.lojas[el.dataset.id];
    catalogo(st).then(function (cat) {
      var cards = cat.map(function (v) {
        return '<button type="button" class="mg-vit" data-acao="escolher-vitrine" data-slug="' + esc(v.slug) + '" aria-pressed="' + (l.vitrine === v.slug) + '">' +
          '<img src="../assets/img/vitrines/' + esc(v.slug) + '.jpg" alt="" loading="lazy"><b>' + esc(v.nome) + '</b><span>' + esc(v.estilo) + (v.publica ? '' : ', exclusiva') + '</span></button>';
      }).join('');
      PN.abrirModal('<h2>Site da ' + esc(l.nome) + '</h2><p class="mg-sub">Escolha a vitrine. A loja abre com o nome, o Instagram e a cidade do cadastro.</p>' +
        '<form data-form="gerar" novalidate style="margin-top:16px"><input type="hidden" name="id" value="' + esc(l.id) + '"><input type="hidden" name="vitrine" value="' + esc(l.vitrine || '') + '">' +
        '<div class="mg-vitrines">' + cards + '</div>' +
        '<div class="rodape"><a class="mg-btn" id="mg-ver-vitrine" href="../vitrine.html?v=' + esc(l.vitrine || 'vinho-delicado') + '" target="_blank" rel="noopener">' + ic('abrir') + 'Ver a vitrine</a>' +
        '<button class="mg-btn" type="button" data-acao="fechar-modal">Cancelar</button><button class="mg-btn pri" type="submit">Gerar site</button></div></form>');
    });
  };
  A['escolher-vitrine'] = function (el) {
    var f = el.closest('form');
    Array.prototype.forEach.call(f.querySelectorAll('.mg-vit'), function (b) { b.setAttribute('aria-pressed', 'false'); });
    el.setAttribute('aria-pressed', 'true');
    f.elements.vitrine.value = el.dataset.slug;
    var ver = document.getElementById('mg-ver-vitrine');
    if (ver) ver.href = '../vitrine.html?v=' + encodeURIComponent(el.dataset.slug);
  };
  F.gerar = function (f, st) {
    var id = f.elements.id.value, vit = f.elements.vitrine.value;
    if (!vit) { PN.aviso('Escolha uma vitrine.'); return; }
    P.acaoLoja(id, 'gerarSite', { vitrine: vit }).then(function (l) {
      var link = linkLoja(l);
      PN.abrirModal('<h2>Site gerado</h2><p class="mg-sub">' + (l.status === 'ativa' ? 'A loja já está no ar neste link:' : 'Ative a loja para ela abrir neste link:') + '</p>' +
        '<p style="margin:14px 0;word-break:break-all"><a href="' + esc(link) + '" target="_blank" rel="noopener">' + esc(link) + '</a></p>' +
        '<p class="mg-sub">Para usar o domínio próprio, cadastre o domínio em Editar dados e siga o passo a passo em Mais › Domínios.</p>' +
        '<div class="rodape"><a class="mg-btn" href="#dominios" data-acao="fechar-modal">Domínios</a><a class="mg-btn pri" href="' + esc(link) + '" target="_blank" rel="noopener">Abrir a loja</a></div>');
      PN.recarregar();
    });
  };

  /* =================== Receita & split =================== */
  T.receita = function (d) {
    var r = d.resumo, t = r.totais, p = r.precos;
    var aviso = p.gatewayLigado ? '' : '<div class="mg-aviso-ex" style="background:#E3ECFA;color:var(--navy)"><span><b>Split previsto.</b> Até o gateway com split (Asaas, Pagar.me, InfinitePay) ser ligado, o valor é calculado pelas vendas pagas, mas não cai sozinho na sua conta.</span></div>';
    var regraSplit = pct(p.splitPct) + ' de cada venda paga' + (p.splitFixo ? ' + ' + brl(p.splitFixo) + ' por pedido' : '');
    var k = '<div class="mg-grade mg-g4">' +
      kpi('Mensalidades', brl(t.assinaturas), 'plano de cada loja ativa') +
      kpi('Split ' + (p.gatewayLigado ? 'recebido' : 'previsto'), brl(t.split), esc(regraSplit)) +
      kpi('Domínios', brl(t.sites), brl0(p.dominioAno) + ' por ano, rateado por mês') +
      kpi('Você ganha por venda', brl(t.ganhoPorVenda), 'média; a cada R$ 100 vendidos, ' + brl(t.ganhoACada100 + (t.ticketMedio ? p.splitFixo * 100 / t.ticketMedio : 0))) + '</div>';
    var linhas = (r.lojas || []).slice().sort(function (a, b) { return b.split - a.split; });
    var tabela = linhas.length ? '<div class="mg-tabela-wrap"><table class="mg-tabela"><thead><tr><th>Loja</th><th class="n">Pedidos pagos</th><th class="n">Vendas</th><th class="n">Split</th><th class="n">Mensalidade</th><th class="n">Domínio</th><th class="n">Total</th></tr></thead><tbody>' +
      linhas.map(function (l) { return '<tr><td><b>' + esc(l.nome) + '</b><br><span class="mg-sub">' + esc(l.cidade) + '</span></td><td class="n">' + num(l.vendas.pagos) + ' de ' + num(l.vendas.pedidos) + '</td><td class="n">' + brl(l.vendas.gmvPago) + '</td><td class="n">' + brl(l.split) + '</td><td class="n">' + brl(l.assinatura) + '</td><td class="n">' + brl(l.site) + '</td><td class="n"><b>' + brl(l.total) + '</b></td></tr>'; }).join('') +
      '</tbody><tfoot><tr><td>Total</td><td class="n">' + num(t.pedidosPagos) + '</td><td class="n">' + brl(t.gmv) + '</td><td class="n">' + brl(t.split) + '</td><td class="n">' + brl(t.assinaturas) + '</td><td class="n">' + brl(t.sites) + '</td><td class="n">' + brl(t.total) + '</td></tr></tfoot></table></div>' :
      vazio('Ninguém usando o split ainda', 'Quando a primeira loja vender pelo site, aparece aqui.');
    var quem = card('Quem usa o seu split', 'Mês de ' + u.nomeMes(r.mes) + '. Só números e nomes das lojas: nenhum dado das compradoras.', tabela,
      '<button class="mg-btn mini" type="button" data-acao="exportar-csv">' + ic('baixar') + 'Exportar CSV</button>');
    var como = card('Como o split é calculado', '', '<ul class="mg-lista">' +
      '<li><span class="tx"><b>Sua parte</b><span>' + esc(regraSplit) + ', sobre o valor pago pela compradora (sem frete).</span></span></li>' +
      '<li><span class="tx"><b>O que conta</b><span>Só pedidos pagos no mês, feitos pelo site ou pelo app da loja. Venda no balcão registrada pela vendedora não entra.</span></span></li>' +
      '<li><span class="tx"><b>Estorno</b><span>Pedido estornado sai da conta do mês em que foi estornado.</span></span></li>' +
      '<li><span class="tx"><b>Quando vira dinheiro</b><span>' + (p.gatewayLigado ? 'O gateway separa sua parte na hora do pagamento.' : 'Quando o gateway com split for ligado, sua parte é separada na hora do pagamento. Até lá, o valor é cobrado junto com a mensalidade.') + '</span></span></li></ul>',
      '<a class="mg-btn mini" href="#planos">Planos & preços</a>');
    return aviso + k + '<div style="margin-top:18px">' + quem + '</div><div style="margin-top:18px">' + como + '</div>';
  };
  A['exportar-csv'] = function (el, st) {
    var r = st.dados.resumo;
    var linhas = [['Loja', 'Cidade', 'Plano', 'Pedidos', 'Pedidos pagos', 'Vendas (R$)', 'Split (R$)', 'Mensalidade (R$)', 'Dominio (R$)', 'Total (R$)']].concat(
      r.lojas.map(function (l) { return [l.nome, l.cidade, l.plano, l.vendas.pedidos, l.vendas.pagos, l.vendas.gmvPago.toFixed(2).replace('.', ','), l.split.toFixed(2).replace('.', ','), l.assinatura.toFixed(2).replace('.', ','), l.site.toFixed(2).replace('.', ','), l.total.toFixed(2).replace('.', ',')]; }));
    var blob = new Blob([C.csv(linhas)], { type: 'text/csv;charset=utf-8' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = 'split-' + r.mes + '.csv';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 2000);
  };

  /* =================== Contas a pagar =================== */
  var CAT = { infra: 'Infraestrutura', ia: 'IA', dominio: 'Domínio', imposto: 'Imposto', servico: 'Serviço', outro: 'Outro' };
  var REP = { unica: 'Uma vez', mensal: 'Todo mês', anual: 'Todo ano' };
  var SUGESTOES = [
    { nome: 'Firebase (Blaze)', detalhe: 'Hospedagem, banco e funções', categoria: 'infra', recorrencia: 'mensal' },
    { nome: 'API de IA', detalhe: 'Textos de produto e legendas', categoria: 'ia', recorrencia: 'mensal' },
    { nome: 'Simples Nacional (DAS)', detalhe: 'Imposto do mês anterior', categoria: 'imposto', recorrencia: 'mensal' },
    { nome: 'Contador', detalhe: 'Honorários', categoria: 'servico', recorrencia: 'mensal' },
    { nome: 'Domínio', detalhe: 'Registro.br', categoria: 'dominio', recorrencia: 'anual' }
  ];
  T.contas = function (d, st) {
    var hoje = C.util.dia(new Date()), mes = hoje.slice(0, 7);
    var contas = lista(d.contasPagar).sort(function (a, b) { return a.vence < b.vence ? -1 : 1; });
    var abertas = contas.filter(function (c) { return !(c.recorrencia === 'unica' && c.pagoEm); });
    var lim = C.util.dia(new Date(Date.now() + 30 * 864e5));
    var aPagar = abertas.filter(function (c) { return c.vence <= lim; }).reduce(function (a, c) { return a + Number(c.valor); }, 0);
    var prox = abertas.filter(function (c) { return c.vence >= hoje; })[0];
    var pagas = contas.filter(function (c) { return (c.pagoEm || c.ultimoPagamento || '').slice(0, 7) === mes; }).reduce(function (a, c) { return a + Number(c.valor); }, 0);
    var k = '<div class="mg-grade mg-g3">' + kpi('A pagar nos próximos 30 dias', brl(aPagar), 'inclui as vencidas') +
      kpi('Próxima', prox ? esc(u.diaBR(prox.vence).slice(0, 5)) : '—', prox ? esc(prox.nome) + ', ' + brl(prox.valor) : 'nada em aberto') +
      kpi('Pagas no mês', brl(pagas), '') + '</div>';
    var tempo = contas.length ? '<ul class="mg-tempo">' + contas.map(function (c) {
      var s = C.situacaoConta(c);
      var chip = c.recorrencia === 'unica' && c.pagoEm ? u.chipSituacao('em-dia').replace('Em dia', 'Paga') :
        s.situacao === 'vencida' ? '<span class="mg-chip cr">' + ic('alerta') + 'Vencida há ' + s.dias + ' dia' + (s.dias === 1 ? '' : 's') + '</span>' :
        s.situacao === 'hoje' ? '<span class="mg-chip at">' + ic('relogio') + 'Vence hoje</span>' :
        '<span class="mg-chip ' + (s.dias <= 5 ? 'at' : '') + '">' + ic('calendario') + 'Em ' + s.dias + ' dia' + (s.dias === 1 ? '' : 's') + '</span>';
      var mm = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'][+c.vence.slice(5, 7) - 1];
      return '<li><span class="data"><b>' + esc(c.vence.slice(8, 10)) + '</b><span>' + mm + '</span></span><span class="tx"><b>' + esc(c.nome) + (c.exemplo ? ' <span class="mg-chip">Exemplo</span>' : '') + '</b><span>' + esc([c.detalhe, REP[c.recorrencia], CAT[c.categoria]].filter(Boolean).join(', ')) + '</span><div style="margin-top:6px">' + chip + '</div></span>' +
        '<span class="valor">' + brl(c.valor) + '</span><span class="mg-botoes">' +
        (!(c.recorrencia === 'unica' && c.pagoEm) ? '<button class="mg-btn mini pri" type="button" data-acao="conta-paguei" data-id="' + esc(c.id) + '">' + ic('check') + 'Paguei</button>' : '') +
        '<button class="mg-btn mini" type="button" data-acao="conta-editar" data-id="' + esc(c.id) + '" aria-label="Editar ' + esc(c.nome) + '">' + ic('lapis') + '</button>' +
        '<button class="mg-btn mini perigo" type="button" data-acao="conta-apagar" data-id="' + esc(c.id) + '" aria-label="Apagar ' + esc(c.nome) + '">' + ic('lixo') + '</button></span></li>';
    }).join('') + '</ul>' : vazio('Nenhuma conta cadastrada', 'Comece pelas que se repetem todo mês. Os botões ao lado preenchem o formulário; o valor é você quem digita.');
    var c = st.contaEditando ? d.contasPagar[st.contaEditando] : null;
    var form = card(c ? 'Editar conta' : 'Nova conta', '', formConta(c) + (contas.length ? '' : '<div class="mg-botoes" style="margin-top:14px">' + SUGESTOES.map(function (s, i) { return '<button class="mg-btn mini" type="button" data-acao="conta-sugestao" data-i="' + i + '">' + esc(s.nome) + '</button>'; }).join('') + '</div>'));
    return k + '<div class="mg-grade mg-g21" style="margin-top:18px">' + card('Linha do tempo', 'Por vencimento', tempo) + form + '</div>';
  };
  function formConta(c) {
    c = c || { recorrencia: 'mensal', categoria: 'infra' };
    var sel = function (nome, mapa, atual) { return '<select name="' + nome + '">' + Object.keys(mapa).map(function (k) { return '<option value="' + k + '"' + (atual === k ? ' selected' : '') + '>' + esc(mapa[k]) + '</option>'; }).join('') + '</select>'; };
    return '<form data-form="conta" novalidate><input type="hidden" name="id" value="' + esc(c.id || '') + '"><div class="mg-form" style="grid-template-columns:1fr 1fr">' +
      '<label class="mg-campo larga">Nome<input name="nome" maxlength="80" value="' + esc(c.nome || '') + '" required></label>' +
      '<label class="mg-campo larga">Detalhe<input name="detalhe" maxlength="140" value="' + esc(c.detalhe || '') + '"></label>' +
      '<label class="mg-campo">Valor (R$)<input name="valor" type="number" min="0" step="0.01" value="' + esc(c.valor != null ? c.valor : '') + '" required></label>' +
      '<label class="mg-campo">Vence em<input name="vence" type="date" value="' + esc(c.vence || '') + '" required></label>' +
      '<label class="mg-campo">Repete' + sel('recorrencia', REP, c.recorrencia) + '</label>' +
      '<label class="mg-campo">Tipo' + sel('categoria', CAT, c.categoria) + '</label></div>' +
      '<div class="rodape" style="display:flex;justify-content:flex-end;gap:10px;margin-top:14px">' + (c.id ? '<button class="mg-btn" type="button" data-acao="conta-cancelar">Cancelar</button>' : '') + '<button class="mg-btn pri" type="submit">' + (c.id ? 'Salvar conta' : 'Adicionar conta') + '</button></div></form>';
  }
  A['conta-sugestao'] = function (el) {
    var s = SUGESTOES[+el.dataset.i], f = document.querySelector('form[data-form="conta"]');
    f.elements.nome.value = s.nome; f.elements.detalhe.value = s.detalhe; f.elements.categoria.value = s.categoria; f.elements.recorrencia.value = s.recorrencia;
    f.elements.valor.focus();
  };
  A['conta-editar'] = function (el, st) { st.contaEditando = el.dataset.id; PN.render(); var f = document.querySelector('form[data-form="conta"] input[name="nome"]'); if (f) f.focus(); };
  A['conta-cancelar'] = function (el, st) { st.contaEditando = null; PN.render(); };
  A['conta-paguei'] = function (el) { el.disabled = true; P.pagarConta(el.dataset.id).then(function (c) { PN.aviso(c && c.recorrencia !== 'unica' ? 'Paga. Próximo vencimento: ' + u.diaBR(c.vence) : 'Conta paga'); return PN.recarregar(); }); };
  A['conta-apagar'] = function (el, st) {
    var c = st.dados.contasPagar[el.dataset.id];
    if (!window.confirm('Apagar a conta "' + c.nome + '"?')) return;
    P.apagarConta(c.id).then(function () { PN.aviso('Conta apagada'); return PN.recarregar(); });
  };
  F.conta = function (f, st) {
    var v = function (n) { return f.elements[n].value.trim(); };
    var erros = [], valor = Number(v('valor'));
    if (!v('nome')) erros.push('nome');
    if (v('valor') === '' || !(valor >= 0 && valor <= 1000000)) erros.push('valor');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(v('vence'))) erros.push('vence');
    if (erros.length) { erroCampos(f, erros); PN.aviso('Confira os campos marcados.'); return; }
    var c = { id: v('id') || undefined, nome: v('nome').slice(0, 80), detalhe: v('detalhe').slice(0, 140), valor: Math.round(valor * 100) / 100, vence: v('vence'), diaFixo: +v('vence').slice(8, 10), recorrencia: v('recorrencia'), categoria: v('categoria') };
    P.salvarConta(c).then(function () { st.contaEditando = null; PN.aviso(c.id ? 'Conta salva' : 'Conta adicionada'); return PN.recarregar(); });
  };

  /* =================== Inadimplência =================== */
  T.inad = function (d) {
    var r = d.resumo, t = r.totais, p = r.precos;
    var atras = r.lojas.filter(function (l) { return l.cobranca.situacao === 'atrasada' || l.cobranca.situacao === 'critica'; }).sort(function (a, b) { return b.cobranca.atrasoDias - a.cobranca.atrasoDias; });
    var ped = r.lojas.reduce(function (a, l) { return a + l.vendas.pedidos; }, 0), aberto = r.lojas.reduce(function (a, l) { return a + l.vendas.emAberto; }, 0);
    var k = '<div class="mg-grade mg-g3">' +
      kpi('Lojas atrasadas', num(atras.length), brl(t.emAbertoLojas) + ' em aberto') +
      kpi('Pedidos em aberto nas lojas', ped ? pct(aberto / ped * 100) : '—', num(aberto) + ' de ' + num(ped) + ' pedidos do mês') +
      kpi('Split que ainda não entrou', p.gatewayLigado ? brl(0) : brl(t.split), p.gatewayLigado ? 'tudo separado pelo gateway' : 'previsto: entra com o gateway ou junto da mensalidade') + '</div>';
    var tab = atras.length ? '<div class="mg-tabela-wrap"><table class="mg-tabela"><thead><tr><th>Loja</th><th>Atraso</th><th class="n">Meses</th><th class="n">Em aberto</th><th>Desde</th><th></th></tr></thead><tbody>' +
      atras.map(function (l) {
        var loja = d.lojas[l.id] || {}, dono = loja.dono || {};
        var msg = 'Olá, ' + (dono.nome || '') + '! Aqui é da ' + (P.cfg.nome || 'plataforma') + '. A mensalidade da loja ' + l.nome + ' está em aberto desde ' + u.nomeMes(l.cobranca.desde) + '. Posso te mandar o Pix?';
        return '<tr><td><b>' + esc(l.nome) + '</b><br><span class="mg-sub">' + esc(dono.nome || '') + (dono.celular ? ', ' + esc(dono.celular) : '') + '</span></td><td>' + u.chipSituacao(l.cobranca.situacao, l.cobranca.atrasoDias + ' dias') + '</td>' +
          '<td class="n">' + l.cobranca.mesesEmAberto + '</td><td class="n">' + brl(l.cobranca.emAbertoValor) + '</td><td>' + esc(u.nomeMes(l.cobranca.desde)) + '</td><td><div class="mg-botoes">' +
          '<button class="mg-btn mini pri" type="button" data-acao="loja-pagamento" data-id="' + esc(l.id) + '">Registrar pagamento</button>' +
          (dono.celular ? '<a class="mg-btn mini" href="' + esc(u.waLink(dono.celular, msg)) + '" target="_blank" rel="noopener">' + ic('conversa') + 'Lembrar</a>' : '') +
          '<button class="mg-btn mini" type="button" data-acao="loja-pausar" data-id="' + esc(l.id) + '">Pausar</button></div></td></tr>';
      }).join('') + '</tbody></table></div>' : vazio('Ninguém atrasado.', 'Todas as mensalidades estão em dia.');
    var regua = card('Régua de cobrança sugerida', 'Automática quando o gateway entrar. Por enquanto, use os botões da tabela.', '<ul class="mg-lista">' +
      ['Dia 1: e-mail com o boleto ou o Pix', 'Dia 7: aviso no painel da loja', 'Dia 15: mensagem no WhatsApp do dono', 'Dia 30: a loja é pausada (o site mostra "em manutenção")'].map(function (x) { return '<li><span class="tx"><b>' + esc(x.split(':')[0]) + '</b><span>' + esc(x.split(':')[1]) + '</span></span></li>'; }).join('') + '</ul>');
    var barras = r.lojas.filter(function (l) { return l.vendas.pedidos; }).map(function (l) {
      var v = l.vendas.emAberto / l.vendas.pedidos * 100;
      var cls = v <= 10 ? ['ok', 'check', 'ok'] : v <= 18 ? ['at', 'relogio', 'atenção'] : ['cr', 'alerta', 'alto'];
      return '<div class="mg-hbar"><span class="nm">' + esc(l.nome) + '</span><span class="trilho"><i style="width:' + Math.min(100, v * 3).toFixed(1) + '%;background:var(--' + cls[0] + ')"></i></span><span class="v">' + pct(v) + ' <span class="mg-chip ' + cls[0] + '" style="padding:1px 6px">' + ic(cls[1]) + cls[2] + '</span></span></div>';
    }).join('');
    return k + '<div style="margin-top:18px">' + card('Lojas atrasadas com a mensalidade', '', tab) + '</div>' +
      '<div class="mg-grade mg-g2" style="margin-top:18px">' + regua + card('Pedidos em aberto por loja', 'Pedidos criados e ainda não pagos no mês. Até 10% é normal; acima de 18% vale olhar o checkout.', barras || vazio('Sem pedidos no mês', '')) + '</div>';
  };

  /* =================== Custos de IA =================== */
  T.ia = function (d) {
    var r = d.resumo, ia = r.ia, p = r.precos;
    var tokens = ia.entrada + ia.saida;
    var semPreco = ia.custo == null;
    var k = '<div class="mg-grade mg-g4">' +
      kpi('Gasto no mês', semPreco ? '—' : brl(ia.custo), semPreco ? 'informe o preço por milhão de tokens abaixo' : 'estimado pelos tokens') +
      kpi('Teto do mês', p.iaTetoMes ? (semPreco ? '—' : pct(ia.custo / p.iaTetoMes * 100)) : '—', p.iaTetoMes ? 'de ' + brl(p.iaTetoMes) : 'sem teto definido') +
      kpi('Textos gerados', num(ia.pedidos), 'descrições de produto e legendas') +
      kpi('Tokens no mês', u.compacto(tokens), ia.pedidos ? num(Math.round(tokens / ia.pedidos)) + ' por pedido' : '') + '</div>';
    var dias = Object.keys(ia.porDia || {}).sort().map(function (dd) { return { rotulo: dd.slice(8, 10) + '/' + dd.slice(5, 7), v: ia.porDia[dd] }; });
    var porLoja = Object.keys(ia.porLoja || {}).map(function (id) { var x = ia.porLoja[id]; return { nome: (d.lojas[id] || {}).nome || id, partes: [x.entrada + x.saida] }; }).sort(function (a, b) { return b.partes[0] - a.partes[0]; });
    var form = '<form data-form="ia" novalidate><div class="mg-form">' +
      '<label class="mg-campo">Entrada (R$ por milhão de tokens)<input name="iaPrecoEntradaMilhao" type="number" min="0" step="0.01" value="' + esc(p.iaPrecoEntradaMilhao || '') + '"></label>' +
      '<label class="mg-campo">Saída (R$ por milhão de tokens)<input name="iaPrecoSaidaMilhao" type="number" min="0" step="0.01" value="' + esc(p.iaPrecoSaidaMilhao || '') + '"></label>' +
      '<label class="mg-campo">Teto do mês (R$)<input name="iaTetoMes" type="number" min="0" step="1" value="' + esc(p.iaTetoMes || '') + '"></label></div>' +
      '<div style="display:flex;justify-content:flex-end;margin-top:14px"><button class="mg-btn pri" type="submit">Salvar preços de IA</button></div></form>';
    return k + '<div class="mg-grade mg-g21" style="margin-top:18px">' + card('Tokens por dia', 'Entrada mais saída, todas as lojas.', g.linha(dias, 'Tokens', u.compacto)) +
      card('Por loja', 'Tokens no mês', porLoja.length ? g.barrasH(porLoja, [{ nome: 'Tokens', cor: 'var(--s1)' }], u.compacto) : vazio('Nenhuma loja usou IA', '')) + '</div>' +
      '<div style="margin-top:18px">' + card('Preço da IA', 'Copie do painel do seu fornecedor de IA. Sem preço, o gasto aparece como "—".', form) + '</div>';
  };
  F.ia = function (f, st) {
    var p = JSON.parse(JSON.stringify(st.dados.precos));
    var erros = [];
    ['iaPrecoEntradaMilhao', 'iaPrecoSaidaMilhao', 'iaTetoMes'].forEach(function (k) {
      var raw = f.elements[k].value, n = raw === '' ? 0 : Number(raw);
      if (!(n >= 0) || (k === 'iaTetoMes' ? n > 1000000 : n > 10000)) erros.push(k); else p[k] = n;
    });
    if (erros.length) { erroCampos(f, erros); PN.aviso('Valor fora da faixa.'); return; }
    P.salvarPrecos(p).then(function () { PN.aviso('Preços de IA salvos'); return PN.recarregar(); }).catch(function (e) { erroCampos(f, e.campos); PN.aviso('Valor fora da faixa.'); });
  };

  /* =================== Mais =================== */
  var FERRAMENTAS = [
    ['Dinheiro', [
      ['planos', 'moedas', 'Planos & preços', 'Mensalidades, implantação, split e simulador'],
      [null, 'repasse', 'Repasses do split', 'Quanto o gateway já separou e quando cai'],
      [null, 'nota', 'Notas fiscais', 'Emitir NFS-e das mensalidades e implantações'],
      [null, 'imposto', 'Impostos', 'Estimativa do DAS pelo faturamento do mês'],
      [null, 'alvo', 'Metas', 'Receita e número de lojas que você quer atingir']]],
    ['Lojas', [
      ['leads', 'funil', 'Pedidos de loja', 'Quem pediu uma loja pelo site de vendas'],
      ['vitrines', 'vitrine', 'Vitrines', 'Os modelos disponíveis e quantas lojas usam cada um'],
      ['dominios', 'globo', 'Domínios & chaves', 'Domínio de cada loja, chave do navegador e DNS conferido'],
      [null, 'contrato', 'Contratos', 'Contrato de prestação de serviço assinado online'],
      [null, 'suporte', 'Suporte', 'Chamados das lojas com prazo de resposta'],
      [null, 'megafone', 'Comunicados', 'Avisos para o painel de todas as lojas'],
      [null, 'cupom', 'Cupons e indicação', 'Desconto para loja que indicar outra']]],
    ['Sistema', [
      ['saude', 'pulso', 'Saúde do sistema', 'Versão no ar, último cálculo e domínios'],
      ['auditoria', 'lista', 'Auditoria', 'Quem fez o quê nas lojas e nos preços'],
      ['config', 'ajustes', 'Configurações', 'Modo, avisos e dados de exemplo'],
      [null, 'cartao', 'Gateway de pagamento', 'Ligar Asaas, Pagar.me ou InfinitePay com split'],
      [null, 'escudo', 'Acessos', 'Sócios e funcionários com acesso ao painel'],
      [null, 'nuvem', 'Backups', 'Cópia diária do banco de dados']]]
  ];
  T.mais = function () {
    return FERRAMENTAS.map(function (gr) {
      return '<section class="mg-grupo" style="margin-bottom:22px"><h2>' + esc(gr[0]) + '</h2><div class="mg-lancador">' + gr[1].map(function (f) {
        var dentro = '<span class="ic">' + ic(f[1]) + '</span><span><b>' + esc(f[2]) + (f[0] ? '' : ' <span class="mg-chip breve">em breve</span>') + '</b><span>' + esc(f[3]) + '</span></span>';
        return f[0] ? '<a class="mg-atalho" href="#' + f[0] + '">' + dentro + '</a>' : '<div class="mg-atalho" aria-disabled="true">' + dentro + '</div>';
      }).join('') + '</div></section>';
    }).join('');
  };

  /* =================== Planos & preços =================== */
  T.planos = function (d) {
    var p = d.precos;
    var planos = Object.keys(p.planos).map(function (k) {
      return '<fieldset class="mg-card" style="border:0;box-shadow:none;background:var(--card2);padding:14px"><legend class="mg-sub" style="font-weight:800;color:var(--tinta)">' + esc(p.planos[k].nome) + '</legend><div class="mg-form" style="grid-template-columns:1fr 1fr">' +
        '<label class="mg-campo">Mensalidade (R$)<input name="' + k + '.mensal" type="number" min="0" step="0.01" value="' + esc(p.planos[k].mensal) + '"></label>' +
        '<label class="mg-campo">Implantação (R$)<input name="' + k + '.implantacao" type="number" min="0" step="0.01" value="' + esc(p.planos[k].implantacao) + '"></label></div></fieldset>';
    }).join('');
    var form = '<form data-form="precos" novalidate><div class="mg-grade mg-g3">' + planos + '</div><div class="mg-form" style="margin-top:14px">' +
      '<label class="mg-campo">Split: % de cada venda paga<input name="splitPct" type="number" min="0" max="20" step="0.1" value="' + esc(p.splitPct) + '"><small>De 0 a 20%.</small></label>' +
      '<label class="mg-campo">Split: R$ fixo por pedido pago<input name="splitFixo" type="number" min="0" max="50" step="0.01" value="' + esc(p.splitFixo) + '"><small>Opcional, soma ao percentual.</small></label>' +
      '<label class="mg-campo">Domínio por ano (R$)<input name="dominioAno" type="number" min="0" step="0.01" value="' + esc(p.dominioAno) + '"></label>' +
      '<label class="mg-campo">Dia de vencimento<input name="venceDia" type="number" min="1" max="28" step="1" value="' + esc(p.venceDia) + '"><small>De 1 a 28, igual para todo mês.</small></label>' +
      '<label class="mg-campo">Gateway com split ligado?<select name="gatewayLigado"><option value="nao"' + (p.gatewayLigado ? '' : ' selected') + '>Ainda não (split previsto)</option><option value="sim"' + (p.gatewayLigado ? ' selected' : '') + '>Sim</option></select></label></div>' +
      '<div style="display:flex;justify-content:flex-end;margin-top:14px"><button class="mg-btn pri" type="submit">Salvar planos e preços</button></div></form>';
    var sim = '<form id="mg-sim" class="mg-form">' +
      '<label class="mg-campo">Lojas ativas <output name="o_lojas">20</output><input name="lojas" type="range" min="1" max="200" value="20"></label>' +
      '<label class="mg-campo">Pedidos pagos por loja no mês <output name="o_ped">120</output><input name="pedidos" type="range" min="10" max="800" step="10" value="120"></label>' +
      '<label class="mg-campo">Ticket médio (R$) <output name="o_ticket">150</output><input name="ticket" type="range" min="40" max="400" step="5" value="150"></label>' +
      '<label class="mg-campo">% que pagam a mensalidade em dia <output name="o_dia">90</output><input name="dia" type="range" min="50" max="100" value="90"></label>' +
      '<label class="mg-campo">Plano<select name="plano">' + Object.keys(p.planos).map(function (k) { return '<option value="' + k + '"' + (k === 'loja' ? ' selected' : '') + '>' + esc(p.planos[k].nome) + '</option>'; }).join('') + '</select></label>' +
      '<label class="mg-campo">Com domínio próprio<select name="dominio"><option value="sim">Sim</option><option value="nao">Não</option></select></label></form>' +
      '<div class="mg-dinheiro" id="mg-sim-res" style="margin-top:16px"></div>';
    return card('Planos e preços', 'O site de vendas mostra estes valores. Valor fora da faixa é recusado.', form) +
      '<div style="margin-top:18px">' + card('Simulador', 'Quanto você ganha por mês com estes preços.', sim) + '</div>';
  };
  D.planos = function (main, st) {
    var f = main.querySelector('#mg-sim'), out = main.querySelector('#mg-sim-res');
    if (!f) return;
    f.addEventListener('submit', function (e) { e.preventDefault(); });
    var calc = function () {
      var form = main.querySelector('form[data-form="precos"]');
      var p = lerFormPrecos(form, st.dados.precos);
      var s = { lojas: +f.lojas.value, pedidosLoja: +f.pedidos.value, ticket: +f.ticket.value, pctEmDia: +f.dia.value, plano: f.plano.value, comDominio: f.dominio.value === 'sim' };
      f.o_lojas.value = s.lojas; f.o_ped.value = s.pedidosLoja; f.o_ticket.value = s.ticket; f.o_dia.value = s.pctEmDia;
      var r = C.simular(p, s);
      out.innerHTML = '<div>Mensalidades<b>' + brl(r.assinatura) + '</b></div><div>Split<b>' + brl(r.split) + '</b></div><div>Domínios<b>' + brl(r.site) + '</b></div><div>Você ganha por mês<b style="font-size:22px;color:var(--navy)">' + brl(r.total) + '</b></div>';
    };
    main.addEventListener('input', function (e) { if (e.target.form === f || (e.target.form && e.target.form.getAttribute('data-form') === 'precos')) calc(); });
    calc();
  };
  function lerFormPrecos(form, atual) {
    var p = JSON.parse(JSON.stringify(atual));
    Object.keys(p.planos).forEach(function (k) {
      p.planos[k].mensal = Number(form.elements[k + '.mensal'].value);
      p.planos[k].implantacao = Number(form.elements[k + '.implantacao'].value);
    });
    p.splitPct = Number(form.elements.splitPct.value);
    p.splitFixo = Number(form.elements.splitFixo.value || 0);
    p.dominioAno = Number(form.elements.dominioAno.value);
    p.venceDia = Number(form.elements.venceDia.value);
    p.gatewayLigado = form.elements.gatewayLigado.value === 'sim';
    return p;
  }
  F.precos = function (f, st) {
    var p = lerFormPrecos(f, st.dados.precos);
    var erros = C.validarPrecos(p);
    if (erros.length) { erroCampos(f, erros); PN.aviso('Valor fora da faixa: confira os campos marcados.'); return; }
    P.salvarPrecos(p).then(function () { PN.aviso('Planos e preços salvos'); return PN.recarregar(); }).catch(function (e) { erroCampos(f, (e && e.campos) || []); });
  };

  /* =================== Pedidos de loja (leads) =================== */
  var ST_LEAD = { novo: 'Novo', contatado: 'Contatado', convertido: 'Virou loja', descartado: 'Descartado' };
  T.leads = function (d, st) {
    var leads = lista(d.leads).sort(function (a, b) { return (b.criadoEm || '') < (a.criadoEm || '') ? -1 : 1; });
    if (!leads.length) return card('Pedidos de loja', '', vazio('Nenhum pedido ainda.', 'Quem preencher "Quero minha loja" no site de vendas aparece aqui.', '<a class="mg-btn mini" href="../index.html#pedido" target="_blank" rel="noopener">Abrir o site de vendas</a>'));
    var linhas = leads.map(function (l) {
      var msg = 'Olá, ' + l.nome + '! Recebi seu pedido de loja na ' + (P.cfg.nome || 'plataforma') + ' (vitrine ' + nomeVitrine(st, l.vitrine) + '). Posso te explicar os próximos passos?';
      return '<tr><td><b>' + esc(l.nome) + (l.exemplo ? ' <span class="mg-chip">Exemplo</span>' : '') + '</b><br><span class="mg-sub">' + esc(l.loja) + (l.instagram ? ', @' + esc(l.instagram) : '') + '</span>' + (l.mensagem ? '<br><span class="mg-sub">“' + esc(l.mensagem) + '”</span>' : '') + '</td>' +
        '<td><a href="../vitrine.html?v=' + esc(l.vitrine) + '" target="_blank" rel="noopener">' + esc(nomeVitrine(st, l.vitrine)) + '</a><br><span class="mg-sub">plano ' + esc(nomePlano(d, l.plano)) + '</span></td>' +
        '<td>' + esc(u.dataCurta(l.criadoEm)) + '</td>' +
        '<td><select data-lead="' + esc(l.id) + '" aria-label="Situação do pedido de ' + esc(l.nome) + '" class="mg-busca" style="min-width:150px">' + Object.keys(ST_LEAD).map(function (k) { return '<option value="' + k + '"' + (l.status === k ? ' selected' : '') + '>' + ST_LEAD[k] + '</option>'; }).join('') + '</select></td>' +
        '<td><div class="mg-botoes"><a class="mg-btn mini" href="' + esc(u.waLink(l.whatsapp, msg)) + '" target="_blank" rel="noopener">' + ic('conversa') + 'Responder</a>' +
        (l.status !== 'convertido' ? '<button class="mg-btn mini pri" type="button" data-acao="lead-loja" data-id="' + esc(l.id) + '">Criar loja</button>' : '') + '<button class="mg-btn mini perigo" type="button" data-acao="lead-apagar" data-id="' + esc(l.id) + '" aria-label="Apagar o pedido de ' + esc(l.nome) + '">' + ic('lixo') + '</button></div></td></tr>';
    }).join('');
    return card('Pedidos de loja', 'Vindos do formulário do site de vendas.', '<div class="mg-tabela-wrap"><table class="mg-tabela"><thead><tr><th>Quem</th><th>Escolha</th><th>Quando</th><th>Situação</th><th></th></tr></thead><tbody>' + linhas + '</tbody></table></div>');
  };
  D.leads = function (main, st) {
    catalogo(st).then(function () { if (!st.catLeads) { st.catLeads = true; PN.render(); } });
    Array.prototype.forEach.call(main.querySelectorAll('select[data-lead]'), function (s) {
      s.addEventListener('change', function () { P.salvarLead({ id: s.dataset.lead, status: s.value }).then(function () { PN.aviso('Situação atualizada'); return PN.recarregar(); }); });
    });
  };
  A['lead-apagar'] = function (el, st) {
    var l = st.dados.leads[el.dataset.id];
    PN.abrirModal('<h2>Apagar o pedido de ' + esc(l.nome) + '?</h2><p class="mg-sub">Nome, WhatsApp e mensagem somem do painel. Use quando a pessoa pedir para ser removida ou quando o pedido não for virar loja.</p>' +
      '<div class="rodape"><button class="mg-btn" type="button" data-acao="fechar-modal">Cancelar</button><button class="mg-btn perigo" type="button" data-acao="lead-apagar-sim" data-id="' + esc(l.id) + '">Apagar pedido</button></div>');
  };
  A['lead-apagar-sim'] = function (el) {
    el.disabled = true;
    P.apagarLead(el.dataset.id).then(function () { PN.fecharModal(); PN.aviso('Pedido apagado'); return PN.recarregar(); });
  };
  A['lead-loja'] = function (el, st) {
    var l = st.dados.leads[el.dataset.id];
    catalogo(st).then(function () {
      PN.abrirModal(formLoja(st.dados, st, { nome: l.loja, instagram: l.instagram, plano: l.plano, vitrine: l.vitrine, status: 'fila', dono: { nome: l.nome, celular: l.whatsapp }, implantacao: { valor: st.dados.precos.planos[l.plano].implantacao } }, { lead: l.id }));
    });
  };

  /* =================== Vitrines =================== */
  T.vitrines = function (d, st) {
    if (!st.catalogo) return card('Vitrines', '', vazio('Carregando as vitrines…', ''));
    var uso = {};
    lista(d.lojas).forEach(function (l) { if (l.vitrine) uso[l.vitrine] = (uso[l.vitrine] || 0) + 1; });
    return card('Vitrines', st.catalogo.filter(function (v) { return v.publica; }).length + ' modelos no site de vendas, mais as exclusivas de clientes.', '<div class="mg-vitrines">' + st.catalogo.map(function (v) {
      return '<a class="mg-vit" href="../vitrine.html?v=' + esc(v.slug) + '" target="_blank" rel="noopener"><img src="../assets/img/vitrines/' + esc(v.slug) + '.jpg" alt="" loading="lazy"><b>' + esc(v.nome) + '</b>' +
        '<span>' + esc(v.estilo) + (v.publica ? '' : ', exclusiva') + '. ' + (uso[v.slug] ? uso[v.slug] + ' loja' + (uso[v.slug] === 1 ? '' : 's') : 'nenhuma loja ainda') + '</span>' +
        '<span style="display:flex;gap:4px;margin-top:6px">' + (v.cores || []).map(function (c) { return '<i class="mg-cor" style="background:' + esc(c) + '"></i>'; }).join('') + '</span></a>';
    }).join('') + '</div>');
  };
  D.vitrines = function (main, st) { if (!st.catalogo) catalogo(st).then(function () { PN.render(); }); };

  /* =================== Domínios =================== */
  /* =================== Domínios & chaves =================== */
  // Cada loja com domínio próprio precisa de 3 coisas fora do painel: o endereço liberado na chave do
  // navegador (Google Cloud), o domínio adicionado no Hosting e o DNS apontando. Esta tela junta os atalhos,
  // a lista pronta para colar na chave e confere sozinha o DNS e se o domínio já responde com HTTPS.
  var PASSOS_DOM = [['chave', 'Liberado na chave'], ['hosting', 'Adicionado no Hosting']];
  function semWww(h) { return String(h || '').toLowerCase().replace(/^www\./, ''); }
  function enderecosChave(d) {
    var itens = [], fb = P.cfg.firebase || {};
    var add = function (h, origem) { h = String(h || '').toLowerCase(); if (h && !itens.some(function (x) { return x.h === h; })) itens.push({ h: h, origem: origem }); };
    (P.cfg.hostsDaPlataforma || []).forEach(function (h) { if (h !== 'localhost' && !/^\d+\.\d+\.\d+\.\d+$/.test(h)) add(h, 'Plataforma'); });
    if (fb.authDomain) add(fb.authDomain, 'Janela de login do Google');
    lista(d.lojas).filter(function (l) { return l.dominio; }).sort(function (a, b) { return a.nome < b.nome ? -1 : 1; }).forEach(function (l) {
      add(semWww(l.dominio), l.nome); add('www.' + semWww(l.dominio), l.nome);
    });
    return itens;
  }
  function linksCloud() {
    var fb = P.cfg.firebase || {}, pid = fb.projectId, chave = P.cfg.chaveNavegadorId, site = P.cfg.siteLojas;
    if (!pid) return null;
    var fbc = 'https://console.firebase.google.com/project/' + encodeURIComponent(pid);
    return [
      ['chave', 'Chave do navegador', 'Restrições: sites e APIs', chave ? 'https://console.cloud.google.com/apis/credentials/key/' + encodeURIComponent(chave) + '?project=' + encodeURIComponent(pid) : 'https://console.cloud.google.com/apis/credentials?project=' + encodeURIComponent(pid)],
      ['globo', 'Hosting das lojas', 'Adicionar domínio personalizado', fbc + '/hosting/sites' + (site ? '/' + encodeURIComponent(site) : '')],
      ['cadeado', 'Domínios do login', 'Só se a loja tiver login de cliente', fbc + '/authentication/settings'],
      ['banco', 'Registros de domínio', 'Coleção dominios no Firestore', fbc + '/firestore/databases/-default-/data/~2Fdominios'],
      ['abrir', 'Registro.br', 'DNS do domínio da cliente', 'https://registro.br/painel/']
    ];
  }
  function lojasComDominio(d) { return lista(d.lojas).filter(function (l) { return l.dominio; }).sort(function (a, b) { return a.nome < b.nome ? -1 : 1; }); }
  function passosFeitos(l) { var p = l.dominioPassos || {}; return PASSOS_DOM.filter(function (x) { return p[x[0]]; }).length; }
  T.dominios = function (d, st) {
    var links = linksCloud(), ends = enderecosChave(d), com = lojasComDominio(d);
    var atalhos = links ? '<div class="mg-dom-atalhos">' + links.map(function (k) {
      return '<a class="mg-dom-atalho" href="' + esc(k[3]) + '" target="_blank" rel="noopener">' + ic(k[0]) + '<span><b>' + esc(k[1]) + '</b><small>' + esc(k[2]) + '</small></span></a>';
    }).join('') + '</div>' : vazio('Firebase ainda não configurado', 'Os atalhos aparecem quando o config tiver o projeto do Firebase.');
    var listaTxt = ends.map(function (x) { return 'https://' + x.h + '/*'; }).join('\n');
    var chaveCard = '<p class="mg-sub" style="margin:0 0 10px">No Google Cloud, abra a chave e em <b>Restrições de aplicativo › Sites</b> adicione cada linha abaixo como um item. Depois clique em Salvar no Google (leva até 5 minutos para valer).</p>' +
      '<textarea class="mg-dom-lista" id="mg-dom-lista" readonly rows="' + Math.min(12, Math.max(4, ends.length)) + '" aria-label="Endereços para liberar na chave">' + esc(listaTxt) + '</textarea>' +
      '<div class="mg-botoes" style="margin-top:12px"><button class="mg-btn pri" type="button" data-acao="dom-copiar-lista">' + ic('copiar') + 'Copiar os ' + ends.length + ' endereços</button>' +
      (links ? '<a class="mg-btn" href="' + esc(links[0][3]) + '" target="_blank" rel="noopener">' + ic('abrir') + 'Abrir a chave</a>' : '') + '</div>' +
      '<p class="mg-sub" style="margin:12px 0 0">Em <b>Restrições de API</b>, deixe só Identity Toolkit API, Token Service API e Cloud Firestore API.</p>';
    var linhas = com.map(function (l) {
      var p = l.dominioPassos || {}, h = semWww(l.dominio), feitos = passosFeitos(l);
      var botoesPasso = PASSOS_DOM.map(function (x) {
        var ok = !!p[x[0]];
        return '<button class="mg-dom-passo' + (ok ? ' ok' : '') + '" type="button" data-acao="dom-passo" data-id="' + esc(l.id) + '" data-passo="' + x[0] + '" aria-pressed="' + ok + '" title="' + (ok ? 'Feito em ' + esc(u.diaBR(p[x[0]])) + '. Clique para desmarcar.' : 'Marcar como feito') + '">' + ic(ok ? 'check' : 'relogio') + esc(x[1]) + '</button>';
      }).join('');
      return '<tr data-dom="' + esc(h) + '"><td><b>' + esc(l.nome) + '</b><br>' + (l.status === 'ativa' ? '' : u.chipSituacao(l.status)) + '</td>' +
        '<td><a href="https://' + esc(h) + '/?diag=1" target="_blank" rel="noopener">' + esc(h) + '</a></td>' +
        '<td><div class="mg-dom-passos">' + botoesPasso + '</div></td>' +
        '<td class="mg-dom-auto" data-check="dns"><span class="mg-sub">conferindo…</span></td>' +
        '<td class="mg-dom-auto" data-check="https"><span class="mg-sub">conferindo…</span></td>' +
        '<td><div class="mg-botoes"><button class="mg-btn mini" type="button" data-acao="dom-copiar" data-id="' + esc(l.id) + '" title="Copiar os 2 endereços desta loja">' + ic('copiar') + '</button>' +
        '<button class="mg-btn mini" type="button" data-acao="dom-verificar" data-dom="' + esc(h) + '">Verificar</button>' +
        '<button class="mg-btn mini" type="button" data-acao="loja-editar" data-id="' + esc(l.id) + '" aria-label="Editar ' + esc(l.nome) + '">' + ic('lapis') + '</button></div>' +
        '<span class="mg-sub">' + feitos + ' de ' + PASSOS_DOM.length + ' marcados</span></td></tr>';
    }).join('');
    var tabela = com.length ? '<div class="mg-tabela-wrap"><table class="mg-tabela mg-dom-tab"><thead><tr><th>Loja</th><th>Domínio</th><th>Feito por você</th><th>DNS</th><th>Site no ar</th><th></th></tr></thead><tbody>' + linhas + '</tbody></table></div>' +
      '<div class="mg-botoes" style="margin-top:12px"><button class="mg-btn" type="button" data-acao="dom-verificar">Verificar todas de novo</button></div>'
      : vazio('Nenhuma loja com domínio ainda', 'Cadastre o domínio em Lojas › Editar dados. Ela aparece aqui com o passo a passo.');
    var sem = lista(d.lojas).filter(function (l) { return !l.dominio && (l.status === 'ativa' || l.status === 'fila'); });
    var semCard = sem.length ? '<div style="margin-top:18px">' + card('Lojas sem domínio', 'Abrem pelo link da plataforma até o domínio ser cadastrado.', '<ul class="mg-lista">' + sem.map(function (l) {
      return '<li><span class="tx"><b>' + esc(l.nome) + '</b><span>' + esc(linkLoja(l)) + '</span></span><button class="mg-btn mini" type="button" data-acao="loja-editar" data-id="' + esc(l.id) + '">Cadastrar domínio</button></li>';
    }).join('') + '</ul>') + '</div>' : '';
    var passos = '<ol class="mg-dom-ol">' +
      '<li><b>Cadastro.</b> Em Lojas › Editar dados, preencha o domínio (ex.: aismodafitness.com.br), sem https e sem barra.</li>' +
      '<li><b>Chave do navegador.</b> Copie a lista acima e acrescente os 2 endereços novos na chave (Sites). Marque "Liberado na chave".</li>' +
      '<li><b>Hosting.</b> No Hosting das lojas, clique em Adicionar domínio personalizado, digite o domínio e depois a versão com www (redirecionando para o principal). Marque "Adicionado no Hosting".</li>' +
      '<li><b>DNS.</b> No Registro.br da cliente, em DNS › Editar zona, crie os registros que o Firebase mostrar (TXT de verificação e A). Apague registros A antigos do mesmo nome.</li>' +
      '<li><b>Conferir.</b> Volte aqui e clique em Verificar. Quando DNS e "Site no ar" ficarem verdes, abra o domínio: o link já vem com ?diag=1, que mostra o motivo se algo faltar.</li></ol>';
    return '<div class="mg-grade mg-g2">' + card('Atalhos do Google Cloud e Firebase', 'Abrem no projeto certo, em outra aba.', atalhos) +
      card('Endereços para a chave do navegador', ends.length + ' endereços: plataforma, login e ' + com.length + (com.length === 1 ? ' loja' : ' lojas') + '.', chaveCard) + '</div>' +
      '<div style="margin-top:18px">' + card('Domínios das lojas', 'DNS e "Site no ar" são conferidos sozinhos. Os outros dois você marca quando fizer.', tabela) + '</div>' + semCard +
      '<div style="margin-top:18px">' + card('Para cada cliente nova', 'Uns 10 minutos por loja, mais o tempo do DNS propagar.', passos) + '</div>';
  };

  // conferências automáticas: DNS pelo dns.google e HTTPS por uma imagem do próprio site
  var CACHE_DOM = {};
  function conferirDns(h) {
    return fetch('https://dns.google/resolve?name=' + encodeURIComponent(h) + '&type=A', { cache: 'no-store' })
      .then(function (r) { return r.json(); })
      .then(function (j) {
        var ips = (j.Answer || []).filter(function (a) { return a.type === 1; }).map(function (a) { return a.data; });
        var esperados = P.cfg.ipsHosting || [];
        if (!ips.length) return { ok: false, txt: j.Status === 3 ? 'domínio não existe' : 'sem registro A' };
        var bate = esperados.length ? ips.some(function (ip) { return esperados.indexOf(ip) >= 0; }) : ips.some(function (ip) { return /^199\.36\.15[89]\./.test(ip); });
        return { ok: bate, txt: (bate ? 'aponta para o Firebase' : 'aponta para outro servidor') + ' (' + ips.join(', ') + ')' };
      }).catch(function () { return { ok: null, txt: 'não deu para consultar agora' }; });
  }
  function conferirHttps(h) {
    return new Promise(function (ok) {
      var img = new Image(), fim = false, t = setTimeout(function () { if (!fim) { fim = true; ok({ ok: false, txt: 'ainda não responde' }); } }, 9000);
      img.onload = function () { if (!fim) { fim = true; clearTimeout(t); ok({ ok: true, txt: 'no ar com HTTPS' }); } };
      img.onerror = function () { if (!fim) { fim = true; clearTimeout(t); ok({ ok: false, txt: 'ainda não responde' }); } };
      img.src = 'https://' + h + '/assets/img/icone-192.png?v=' + Date.now();
    });
  }
  function pintar(main, h, tipo, r) {
    Array.prototype.forEach.call(main.querySelectorAll('tr[data-dom="' + h + '"] [data-check="' + tipo + '"]'), function (td) {
      var cls = r.ok === true ? 'ok' : r.ok === false ? 'at' : '';
      td.innerHTML = '<span class="mg-chip ' + cls + '">' + ic(r.ok === true ? 'check' : r.ok === false ? 'relogio' : 'alerta') + esc(r.ok === true ? 'Ok' : r.ok === false ? 'Pendente' : '?') + '</span><br><span class="mg-sub">' + esc(r.txt) + '</span>';
    });
  }
  function verificar(main, hosts, forcar) {
    hosts.forEach(function (h) {
      var c = CACHE_DOM[h];
      if (c && !forcar && Date.now() - c.quando < 5 * 60 * 1000) { pintar(main, h, 'dns', c.dns); pintar(main, h, 'https', c.https); return; }
      Promise.all([conferirDns(h), conferirHttps(h)]).then(function (r) {
        CACHE_DOM[h] = { quando: Date.now(), dns: r[0], https: r[1] };
        pintar(main, h, 'dns', r[0]); pintar(main, h, 'https', r[1]);
      });
    });
  }
  D.dominios = function (main, st) {
    verificar(main, lojasComDominio(st.dados).map(function (l) { return semWww(l.dominio); }), false);
  };
  A['dom-verificar'] = function (el, st) {
    var main = document.getElementById('mg-main');
    var hosts = el.dataset.dom ? [el.dataset.dom] : lojasComDominio(st.dados).map(function (l) { return semWww(l.dominio); });
    hosts.forEach(function (h) { pintar(main, h, 'dns', { ok: null, txt: 'conferindo…' }); pintar(main, h, 'https', { ok: null, txt: 'conferindo…' }); });
    verificar(main, hosts, true);
  };
  function copiar(texto, msg) {
    (navigator.clipboard ? navigator.clipboard.writeText(texto) : Promise.reject()).then(function () { PN.aviso(msg); })
      .catch(function () { window.prompt('Copie:', texto); });
  }
  A['dom-copiar-lista'] = function () { var t = document.getElementById('mg-dom-lista'); copiar(t ? t.value : '', 'Endereços copiados. Cole na chave, um por item.'); };
  A['dom-copiar'] = function (el, st) {
    var l = st.dados.lojas[el.dataset.id], h = semWww(l.dominio);
    copiar('https://' + h + '/*\nhttps://www.' + h + '/*', 'Endereços de ' + l.nome + ' copiados');
  };
  A['dom-passo'] = function (el, st) {
    var l = st.dados.lojas[el.dataset.id], feito = el.getAttribute('aria-pressed') !== 'true';
    el.disabled = true;
    P.acaoLoja(l.id, 'dominioPasso', { passo: el.dataset.passo, feito: feito })
      .then(function () { PN.aviso(feito ? 'Marcado como feito' : 'Desmarcado'); return PN.recarregar(); })
      .then(function () {
        // devolve o foco ao mesmo botão depois de redesenhar (quem usa teclado não perde o lugar)
        var b = document.querySelector('[data-acao="dom-passo"][data-id="' + CSS.escape(l.id) + '"][data-passo="' + CSS.escape(el.dataset.passo) + '"]');
        if (b) b.focus();
      })
      .catch(function (e) { el.disabled = false; PN.aviso((e && e.message) || 'Não foi possível salvar.'); });
  };

  /* =================== Saúde do sistema =================== */
  T.saude = function (d, st) {
    var lojas = lista(d.lojas), ativas = lojas.filter(function (l) { return l.status === 'ativa'; });
    var semVitrine = ativas.filter(function (l) { return !l.vitrine; });
    var semDom = ativas.filter(function (l) { return !l.dominio; });
    return '<div class="mg-grade mg-g4">' +
      kpi('Modo', P.modo === 'firebase' ? 'Firebase' : 'Demonstração', P.modo === 'firebase' ? 'dados no Firestore' : 'dados só neste navegador') +
      kpi('Versão do app no ar', '<span id="mg-versao">…</span>', 'lida do sw.js publicado') +
      kpi('Último cálculo', d.resumo ? esc(u.dataHora(d.resumo.calculadoEm)) : '—', P.modo === 'firebase' ? 'agendado às 4h30 e no botão Atualizar' : 'calculado neste navegador') +
      kpi('Lojas ativas sem vitrine', num(semVitrine.length), semVitrine.length ? esc(semVitrine.map(function (l) { return l.nome; }).join(', ')) : 'todas com site') + '</div>' +
      '<div style="margin-top:18px">' + card('Lojas ativas sem domínio próprio', 'Abrem pelo link da plataforma.', semDom.length ? '<ul class="mg-lista">' + semDom.map(function (l) { return '<li><span class="tx"><b>' + esc(l.nome) + '</b><span>' + esc(linkLoja(l)) + '</span></span><a class="mg-btn mini" href="' + esc(linkLoja(l)) + '" target="_blank" rel="noopener">Abrir</a></li>'; }).join('') + '</ul>' : vazio('Todas com domínio', '')) + '</div>';
  };
  D.saude = function (main) {
    fetch('../sw.js', { cache: 'no-cache' }).then(function (r) { return r.text(); }).then(function (t) {
      var m = t.match(/VERSAO\s*=\s*'([^']+)'/); var el = main.querySelector('#mg-versao'); if (el) el.textContent = m ? m[1] : '—';
    }).catch(function () { var el = main.querySelector('#mg-versao'); if (el) el.textContent = '—'; });
  };

  /* =================== Auditoria =================== */
  T.auditoria = function (d) {
    var reg = (d.auditoria || []).slice(0, 50);
    return card('Últimos registros', 'Ações sobre lojas, preços e contas. Registros das compradoras nem chegam aqui.', reg.length ? '<div class="mg-tabela-wrap"><table class="mg-tabela"><thead><tr><th>Quando</th><th>Quem</th><th>O quê</th><th>Sobre</th></tr></thead><tbody>' +
      reg.map(function (r) { return '<tr><td>' + esc(u.dataHora(r.quando)) + '</td><td>' + esc(r.quem) + '</td><td>' + esc(r.oque) + '</td><td>' + esc(r.alvo) + '</td></tr>'; }).join('') + '</tbody></table></div>' : vazio('Nada registrado ainda', ''));
  };

  /* =================== Configurações =================== */
  T.config = function (d) {
    var av = (d.config && d.config.avisos) || {};
    var modo = P.modo === 'firebase' ?
      card('Modo Firebase', 'Dados no Firestore, login pelo Firebase Auth, números calculados pela Cloud Function.', '<p class="mg-sub">A chave do serviço de e-mail fica guardada no servidor e nunca é lida de volta pelo painel.</p>') :
      card('Modo demonstração', 'Sem as chaves do Firebase, tudo fica salvo só neste navegador.', '<p class="mg-sub">Para usar de verdade, cole a configuração do Firebase em config/plataforma.config.js e publique (passo a passo no README).</p>' +
        '<div class="mg-botoes" style="margin-top:14px">' + (d.exemplo ? '<button class="mg-btn perigo" type="button" data-acao="limpar-exemplos">' + ic('lixo') + 'Apagar dados de exemplo</button>' : '') +
        '<button class="mg-btn" type="button" data-acao="restaurar-exemplos">Restaurar exemplos</button></div>');
    var avisos = card('Avisos para o dono', 'Quando algo entra em "Precisa de você".', '<form data-form="config" novalidate><div class="mg-form">' +
      '<label class="mg-campo">Avisar contas que vencem em até (dias)<input name="contasDias" type="number" min="1" max="30" value="' + esc(av.contasDias || 5) + '"></label>' +
      '<label class="mg-campo">Avisar quando a IA passar de (% do teto)<input name="iaPct" type="number" min="10" max="100" value="' + esc(av.iaPct || 80) + '"></label></div>' +
      '<div style="display:flex;justify-content:flex-end;margin-top:14px"><button class="mg-btn pri" type="submit">Salvar avisos</button></div></form>');
    return '<div class="mg-grade mg-g2">' + modo + avisos + '</div>';
  };
  F.config = function (f) {
    var a = { contasDias: Math.min(30, Math.max(1, +f.elements.contasDias.value || 5)), iaPct: Math.min(100, Math.max(10, +f.elements.iaPct.value || 80)) };
    P.salvarConfig({ avisos: a }).then(function () { PN.aviso('Avisos salvos'); return PN.recarregar(); });
  };
  A['limpar-exemplos'] = function () {
    if (!window.confirm('Apagar todas as lojas, contas e pedidos de exemplo? Os seus cadastros ficam.')) return;
    P.limparExemplos().then(function () { PN.aviso('Exemplos apagados. Painel pronto para a primeira loja.'); location.hash = 'lojas/fila'; return PN.recarregar(); });
  };
  A['restaurar-exemplos'] = function () {
    if (!window.confirm('Voltar aos dados de exemplo? Tudo o que foi cadastrado neste navegador some.')) return;
    P.restaurarExemplos().then(function () { PN.aviso('Exemplos restaurados'); return PN.recarregar(); });
  };
})();
