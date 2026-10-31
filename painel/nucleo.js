/*
 * nucleo.js — casca do mega painel: utilidades, ícones, gráficos SVG, trilho, rotas, login,
 * modal e aviso. As telas ficam em telas.js e se registram em Painel.telas.
 */
(function () {
  'use strict';
  var P = window.Plataforma, C = window.Calc;

  /* ---------- utilidades ---------- */
  var esc = function (v) {
    return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; });
  };
  // a dica é lida com innerHTML: monta o HTML já escapado e escapa de novo no atributo
  var atrDica = function (html) { return 'data-dica="' + esc(html) + '"'; };
  var brl = function (v) { return v == null || isNaN(v) ? '—' : Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }); };
  var brl0 = function (v) { return v == null || isNaN(v) ? '—' : Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }); };
  var num = function (v) { return Number(v || 0).toLocaleString('pt-BR'); };
  var pct = function (v) { return Number(v || 0).toLocaleString('pt-BR', { maximumFractionDigits: 1 }) + '%'; };
  var compacto = function (v) {
    v = Number(v || 0);
    if (Math.abs(v) >= 1e6) return (v / 1e6).toLocaleString('pt-BR', { maximumFractionDigits: 1 }) + ' mi';
    if (Math.abs(v) >= 1e4) return (v / 1e3).toLocaleString('pt-BR', { maximumFractionDigits: 0 }) + ' mil';
    return num(v);
  };
  var MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
  var nomeMes = function (m) { return MESES[+m.slice(5, 7) - 1] + '/' + m.slice(2, 4); };
  var dataCurta = function (iso) { if (!iso) return '—'; var d = new Date(iso); return isNaN(d) ? '—' : d.toLocaleDateString('pt-BR'); };
  var dataHora = function (iso) { var d = new Date(iso); return isNaN(d) ? '—' : d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) + ' às ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }); };
  var diaBR = function (s) { return s ? s.slice(8, 10) + '/' + s.slice(5, 7) + '/' + s.slice(0, 4) : '—'; };
  var waLink = function (num, msg) { var n = String(num || '').replace(/\D/g, ''); if (n.length <= 11) n = '55' + n; return 'https://wa.me/' + n + (msg ? '?text=' + encodeURIComponent(msg) : ''); };

  /* ---------- ícones (traço, 24x24) ---------- */
  var IC = {
    casa: 'M4 11l8-7 8 7v9H4zM9 20v-6h6v6', loja: 'M4 9l1.5-5h13L20 9M4 9v11h16V9M4 9h16M9 20v-6h6v6',
    moedas: 'M9 4a5 5 0 1 0 0 10a5 5 0 1 0 0-10zM15 10a5 5 0 1 1 0 10a5 5 0 0 1-5-5', calendario: 'M4 6h16v14H4zM4 10h16M8 3v4M16 3v4',
    alerta: 'M12 3l10 18H2zM12 10v5M12 18v.5', chip: 'M7 7h10v10H7zM10 10h4v4h-4zM9 3v4M15 3v4M9 17v4M15 17v4M3 9h4M3 15h4M17 9h4M17 15h4',
    grade: 'M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z', ajustes: 'M4 6h9M17 6h3M4 12h3M11 12h9M4 18h11M19 18h1M15 4v4M9 10v4M17 16v4',
    sair: 'M15 4h4v16h-4M10 8l-4 4 4 4M6 12h10', mais: 'M12 5v14M5 12h14', link: 'M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7L12 6.3M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1',
    copiar: 'M8 8h12v12H8zM4 16V4h12', abrir: 'M14 4h6v6M20 4l-9 9M18 14v6H4V6h6', check: 'M5 12.5l4.5 4.5L19 7.5', relogio: 'M12 7v5l3 2M12 21a9 9 0 1 1 0-18 9 9 0 0 1 0 18z',
    x: 'M6 6l12 12M18 6L6 18', baixar: 'M12 4v11M7 10l5 5 5-5M5 20h14', conversa: 'M4 20l1.5-4A8 8 0 1 1 8 19z', lapis: 'M4 20h4L19 9l-4-4L4 16zM14 6l4 4',
    lixo: 'M5 7h14M10 7V4h4v3M7 7l1 13h8l1-13', funil: 'M4 5h16l-6 8v6l-4 2v-8z', vitrine: 'M3 5h18v14H3zM3 9h18M8 9v10',
    globo: 'M12 3a9 9 0 1 0 0 18a9 9 0 1 0 0-18zM3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18', pulso: 'M3 12h4l2-5 4 10 2-5h6',
    lista: 'M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01', nota: 'M6 3h9l3 3v15H6zM9 9h6M9 13h6M9 17h4', repasse: 'M4 8h13l-3-3M20 16H7l3 3',
    imposto: 'M6 18L18 6M7 6.5a1.5 1.5 0 1 0 .01 0M17 16a1.5 1.5 0 1 0 .01 0', alvo: 'M12 3a9 9 0 1 0 0 18a9 9 0 1 0 0-18zM12 8a4 4 0 1 0 0 8a4 4 0 1 0 0-8z',
    contrato: 'M7 3h7l4 4v14H7zM10 12h6M10 16h6M10 8h2', suporte: 'M4 13v-1a8 8 0 0 1 16 0v1M4 13h3v5H4zM17 13h3v5h-3z',
    megafone: 'M4 10v4h3l7 4V6L7 10zM18 9a3 3 0 0 1 0 6', cupom: 'M4 7h16v3a2 2 0 0 0 0 4v3H4v-3a2 2 0 0 0 0-4zM10 7v10',
    cartao: 'M3 6h18v12H3zM3 10h18M7 15h3', escudo: 'M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z', nuvem: 'M7 18a4 4 0 0 1-.5-8A6 6 0 0 1 18 9a4.5 4.5 0 0 1-.5 9z',
    atualizar: 'M20 11a8 8 0 1 0-2.3 5.7M20 5v6h-6', pausa: 'M9 6v12M15 6v12', play: 'M8 5l11 7-11 7z', pix: 'M12 3l9 9-9 9-9-9zM8 12h8'
  };
  var icone = function (k) { return '<svg class="mg-ic" viewBox="0 0 24 24" aria-hidden="true"><path d="' + IC[k] + '"></path></svg>'; };

  /* ---------- situação com ícone + texto (cor nunca sozinha) ---------- */
  var CHIP_COB = {
    'em-dia': ['ok', 'check', 'Em dia'], teste: ['info', 'relogio', 'Em teste'], isenta: ['info', 'check', 'Isenta'],
    atrasada: ['at', 'relogio', 'Atrasada'], critica: ['cr', 'alerta', 'Crítica'], pausada: ['', 'pausa', 'Pausada'],
    fila: ['info', 'relogio', 'Na fila'], rascunho: ['', 'lapis', 'Cadastro incompleto'], cancelada: ['', 'x', 'Cancelada'], ativa: ['ok', 'check', 'Ativa']
  };
  var chipSituacao = function (s, extra) {
    var c = CHIP_COB[s] || ['', 'relogio', s];
    return '<span class="mg-chip ' + c[0] + '">' + icone(c[1]) + esc(c[2] + (extra ? ' ' + extra : '')) + '</span>';
  };

  /* ---------- gráficos (SVG feito à mão) ---------- */
  var SERIES = [{ nome: 'Assinaturas', cor: 'var(--s1)' }, { nome: 'Split', cor: 'var(--s2)' }, { nome: 'Domínios', cor: 'var(--s3)' }];
  function legenda(series) {
    return '<div class="mg-legenda">' + series.map(function (s) { return '<span><i style="background:' + s.cor + '"></i>' + esc(s.nome) + '</span>'; }).join('') + '</div>';
  }
  function passoLimpo(max) {
    if (max <= 0) return 1;
    var bruto = max / 4, mag = Math.pow(10, Math.floor(Math.log10(bruto)));
    var n = bruto / mag;
    return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * mag;
  }
  function tabelaDetalhe(cab, linhas) {
    return '<details class="mg-tabela-graf"><summary>Ver em tabela</summary><div class="mg-tabela-wrap"><table class="mg-tabela"><thead><tr>' +
      cab.map(function (c, i) { return '<th' + (i ? ' class="n"' : '') + '>' + esc(c) + '</th>'; }).join('') + '</tr></thead><tbody>' +
      linhas.map(function (l) { return '<tr>' + l.map(function (c, i) { return '<td' + (i ? ' class="n"' : '') + '>' + esc(c) + '</td>'; }).join('') + '</tr>'; }).join('') +
      '</tbody></table></div></details>';
  }

  /** Colunas empilhadas: [{rotulo, valores:[...]}], séries na ordem fixa. */
  function colunasEmpilhadas(dados, series, titulo) {
    var W = 640, H = 230, esq = 48, dir = 8, topo = 18, base = 26;
    var max = Math.max.apply(null, dados.map(function (d) { return d.valores.reduce(function (a, b) { return a + b; }, 0); }).concat([0]));
    var passo = passoLimpo(max), teto = Math.ceil(max / passo) * passo || passo;
    var h = H - topo - base, larg = (W - esq - dir) / dados.length, bw = Math.min(24, larg * 0.5);
    var y = function (v) { return topo + h - (v / teto) * h; };
    var s = '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + esc(titulo) + '">';
    for (var t = 0; t <= teto + 1e-9; t += passo) {
      s += '<line x1="' + esq + '" x2="' + (W - dir) + '" y1="' + y(t).toFixed(1) + '" y2="' + y(t).toFixed(1) + '" stroke="var(--grade)" stroke-width="1"/>';
      s += '<text x="' + (esq - 8) + '" y="' + (y(t) + 4).toFixed(1) + '" text-anchor="end">' + esc(compacto(t)) + '</text>';
    }
    dados.forEach(function (d, i) {
      var cx = esq + larg * i + larg / 2, x = cx - bw / 2, acum = 0, total = d.valores.reduce(function (a, b) { return a + b; }, 0);
      var topoIdx = -1;
      d.valores.forEach(function (v, k) { if (v > 0) topoIdx = k; });
      d.valores.forEach(function (v, k) {
        if (v <= 0) return;
        var y1 = y(acum + v), y0 = y(acum), alt = Math.max(0, y0 - y1 - (acum > 0 ? 2 : 0));
        var yy = y1;
        if (k === topoIdx) {
          var r = Math.min(4, alt);
          s += '<path d="M' + x + ' ' + (yy + alt) + 'V' + (yy + r) + 'Q' + x + ' ' + yy + ' ' + (x + r) + ' ' + yy + 'H' + (x + bw - r) + 'Q' + (x + bw) + ' ' + yy + ' ' + (x + bw) + ' ' + (yy + r) + 'V' + (yy + alt) + 'Z" fill="' + series[k].cor + '"/>';
        } else s += '<rect x="' + x + '" y="' + yy.toFixed(1) + '" width="' + bw + '" height="' + alt.toFixed(1) + '" fill="' + series[k].cor + '"/>';
        acum += v;
      });
      s += '<text x="' + cx + '" y="' + (H - 8) + '" text-anchor="middle">' + esc(d.rotulo) + '</text>';
      if (i === dados.length - 1 && total > 0) s += '<text x="' + cx + '" y="' + (y(total) - 7).toFixed(1) + '" text-anchor="middle" style="fill:var(--tinta);font-weight:800">' + esc(brl0(total)) + '</text>';
      var dica = '<b>' + esc(d.rotulo) + '</b><br>' + series.map(function (sr, k) { return esc(sr.nome) + ': ' + esc(brl(d.valores[k])); }).join('<br>') + '<br><b>Total: ' + esc(brl(total)) + '</b>';
      s += '<rect x="' + (cx - larg / 2) + '" y="' + topo + '" width="' + larg + '" height="' + h + '" fill="transparent" ' + atrDica(dica) + '/>';
    });
    s += '</svg>';
    var linhas = dados.map(function (d) { return [d.rotulo].concat(d.valores.map(brl)).concat([brl(d.valores.reduce(function (a, b) { return a + b; }, 0))]); });
    return legenda(series) + '<div class="mg-graf">' + s + '</div>' + tabelaDetalhe(['Mês'].concat(series.map(function (x) { return x.nome; })).concat(['Total']), linhas);
  }

  /** Barras horizontais empilhadas (CSS): [{nome, partes:[...], rotuloValor}] */
  function barrasH(itens, series, fmt) {
    fmt = fmt || brl;
    var max = Math.max.apply(null, itens.map(function (it) { return it.partes.reduce(function (a, b) { return a + b; }, 0); }).concat([0])) || 1;
    if (!itens.length) return '';
    return (series.length > 1 ? legenda(series) : '') + itens.map(function (it) {
      var tot = it.partes.reduce(function (a, b) { return a + b; }, 0);
      var dica = '<b>' + esc(it.nome) + '</b><br>' + series.map(function (sr, k) { return esc(sr.nome) + ': ' + esc(fmt(it.partes[k])); }).join('<br>');
      return '<div class="mg-hbar" ' + atrDica(dica) + '><span class="nm">' + esc(it.nome) + '</span><span class="trilho">' +
        it.partes.map(function (v, k) { return v > 0 ? '<i style="width:' + (v / max * 100).toFixed(2) + '%;background:' + series[k].cor + '"></i>' : ''; }).join('') +
        '</span><span class="v">' + esc(it.rotuloValor || fmt(tot)) + '</span></div>';
    }).join('');
  }

  /** Linha com área clara e ponto no pico: [{rotulo, v}] */
  function linha(pontos, nomeSerie, fmt) {
    fmt = fmt || num;
    var W = 640, H = 200, esq = 48, dir = 14, topo = 22, base = 24;
    if (!pontos.length) return '<div class="mg-vazio"><b>Sem uso neste mês</b>Os pedidos de IA aparecem aqui quando as lojas usarem.</div>';
    var max = Math.max.apply(null, pontos.map(function (p) { return p.v; })) || 1;
    var passo = passoLimpo(max), teto = Math.ceil(max / passo) * passo;
    var h = H - topo - base, n = pontos.length, larg = (W - esq - dir) / Math.max(1, n - 1);
    var x = function (i) { return esq + (n === 1 ? (W - esq - dir) / 2 : larg * i); };
    var y = function (v) { return topo + h - (v / teto) * h; };
    var s = '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + esc(nomeSerie) + '">';
    for (var t = 0; t <= teto + 1e-9; t += passo) {
      s += '<line x1="' + esq + '" x2="' + (W - dir) + '" y1="' + y(t).toFixed(1) + '" y2="' + y(t).toFixed(1) + '" stroke="var(--grade)"/>';
      s += '<text x="' + (esq - 8) + '" y="' + (y(t) + 4).toFixed(1) + '" text-anchor="end">' + esc(compacto(t)) + '</text>';
    }
    var d = pontos.map(function (p, i) { return (i ? 'L' : 'M') + x(i).toFixed(1) + ' ' + y(p.v).toFixed(1); }).join('');
    s += '<path d="' + d + 'L' + x(n - 1).toFixed(1) + ' ' + y(0) + 'L' + x(0).toFixed(1) + ' ' + y(0) + 'Z" fill="var(--s1)" opacity=".12"/>';
    s += '<path d="' + d + '" fill="none" stroke="var(--s1)" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>';
    var pico = 0;
    pontos.forEach(function (p, i) { if (p.v > pontos[pico].v) pico = i; });
    s += '<circle cx="' + x(pico).toFixed(1) + '" cy="' + y(pontos[pico].v).toFixed(1) + '" r="4.5" fill="var(--s1)" stroke="#fff" stroke-width="2"/>';
    s += '<text x="' + x(pico).toFixed(1) + '" y="' + (y(pontos[pico].v) - 10).toFixed(1) + '" text-anchor="middle" style="fill:var(--tinta);font-weight:800">' + esc(fmt(pontos[pico].v)) + '</text>';
    var marca = Math.max(1, Math.round(n / 6));
    pontos.forEach(function (p, i) {
      if (i % marca === 0 || i === n - 1) s += '<text x="' + x(i).toFixed(1) + '" y="' + (H - 6) + '" text-anchor="middle">' + esc(p.rotulo) + '</text>';
      s += '<rect x="' + (x(i) - larg / 2).toFixed(1) + '" y="' + topo + '" width="' + Math.max(larg, 6).toFixed(1) + '" height="' + h + '" fill="transparent" ' + atrDica('<b>' + esc(p.rotulo) + '</b><br>' + esc(nomeSerie) + ': ' + esc(fmt(p.v))) + '/>';
    });
    return '<div class="mg-graf">' + s + '</svg></div>' + tabelaDetalhe(['Dia', nomeSerie], pontos.map(function (p) { return [p.rotulo, fmt(p.v)]; }));
  }

  /* dica única que segue o mouse */
  var dicaEl;
  function ligarDicas() {
    dicaEl = document.createElement('div');
    dicaEl.className = 'mg-dica'; dicaEl.setAttribute('role', 'tooltip');
    document.body.appendChild(dicaEl);
    document.addEventListener('mousemove', function (e) {
      var alvo = e.target.closest && e.target.closest('[data-dica]');
      if (!alvo) { dicaEl.classList.remove('on'); return; }
      dicaEl.innerHTML = alvo.getAttribute('data-dica');
      var x = Math.min(e.clientX + 14, window.innerWidth - dicaEl.offsetWidth - 10);
      var y = e.clientY + 16 + dicaEl.offsetHeight > window.innerHeight ? e.clientY - dicaEl.offsetHeight - 12 : e.clientY + 16;
      dicaEl.style.left = x + 'px'; dicaEl.style.top = y + 'px';
      dicaEl.classList.add('on');
    });
  }

  /* ---------- aviso e modal ---------- */
  var toastT;
  function aviso(msg) {
    var t = document.getElementById('mg-toast');
    t.textContent = msg; t.classList.add('on');
    clearTimeout(toastT); toastT = setTimeout(function () { t.classList.remove('on'); }, 3200);
  }
  var modalAntes = null;
  function abrirModal(html, aoAbrir) {
    var m = document.getElementById('mg-modal');
    modalAntes = document.activeElement;
    m.querySelector('.caixa').innerHTML = html;
    m.hidden = false;
    var foco = m.querySelector('input,select,textarea,button');
    if (foco) foco.focus();
    if (aoAbrir) aoAbrir(m);
  }
  function fecharModal() {
    var m = document.getElementById('mg-modal');
    m.hidden = true; m.querySelector('.caixa').innerHTML = '';
    if (modalAntes && modalAntes.focus) modalAntes.focus();
  }

  /* ---------- estado, rotas e trilho ---------- */
  var ESTADO = { dados: null, sessao: null, rota: 'inicio', formSujo: false, calculando: false };
  var TITULOS = {
    inicio: 'Visão geral', lojas: 'Lojas', receita: 'Receita & split', contas: 'Contas a pagar', inad: 'Inadimplência', ia: 'Custos de IA',
    mais: 'Mais ferramentas', config: 'Configurações', planos: 'Planos & preços', saude: 'Saúde do sistema', auditoria: 'Auditoria',
    leads: 'Pedidos de loja', vitrines: 'Vitrines', dominios: 'Domínios'
  };
  var DO_MAIS = { planos: 1, saude: 1, auditoria: 1, leads: 1, vitrines: 1, dominios: 1, config: 0 };
  var TRILHO = [
    { r: 'inicio', ic: 'casa' }, { r: 'lojas', ic: 'loja' }, { r: 'receita', ic: 'moedas' },
    { r: 'contas', ic: 'calendario', pc: true }, { r: 'inad', ic: 'alerta', pc: true }, { r: 'ia', ic: 'chip', pc: true }, { r: 'mais', ic: 'grade' }
  ];

  function rotaAtual() {
    var h = location.hash.replace(/^#/, '');
    try { h = decodeURIComponent(h); } catch (e) { h = ''; }
    var r = h.split('/')[0];
    return Object.prototype.hasOwnProperty.call(TITULOS, r) ? r : 'inicio';
  }
  function contadores() {
    var d = ESTADO.dados, c = {};
    if (!d) return c;
    var fila = 0; Object.keys(d.lojas).forEach(function (k) { if (d.lojas[k].status === 'fila') fila++; });
    var leadsNovos = 0; Object.keys(d.leads).forEach(function (k) { if (d.leads[k].status === 'novo') leadsNovos++; });
    if (fila) c.lojas = { n: fila, urg: false };
    var vencendo = 0;
    Object.keys(d.contasPagar).forEach(function (k) { var s = C.situacaoConta(d.contasPagar[k]); if (s.situacao === 'vencida' || s.situacao === 'hoje' || (s.situacao === 'aberta' && s.dias <= ((d.config && d.config.avisos && d.config.avisos.contasDias) || 5))) vencendo++; });
    if (vencendo) c.contas = { n: vencendo, urg: true };
    var atras = d.resumo ? d.resumo.totais.lojasAtrasadas : 0;
    if (atras) c.inad = { n: atras, urg: true };
    if (leadsNovos) c.mais = { n: leadsNovos, urg: false };
    return c;
  }
  function desenharTrilho() {
    var r = ESTADO.rota, ativo = Object.prototype.hasOwnProperty.call(DO_MAIS, r) && r !== 'config' ? 'mais' : r;
    var cont = contadores();
    var item = function (t) {
      var b = cont[t.r];
      return '<a class="mg-it' + (t.pc ? ' mg-so-pc' : '') + '" href="#' + t.r + '"' + (ativo === t.r ? ' aria-current="page"' : '') + ' aria-label="' + esc(TITULOS[t.r]) + '">' +
        icone(t.ic) + (b ? '<span class="mg-bola' + (b.urg ? ' urg' : '') + '">' + b.n + '</span>' : '') + '<span class="mg-pilula">' + esc(TITULOS[t.r]) + '</span></a>';
    };
    document.getElementById('mg-trilho').innerHTML =
      '<a class="mg-marca" href="../index.html" aria-label="Abrir o site de vendas">' + esc((P.cfg.nome || 'P').slice(0, 1)) + '</a>' +
      '<nav aria-label="Telas do painel">' + TRILHO.map(item).join('') + '</nav>' +
      '<div class="mg-pe">' + item({ r: 'config', ic: 'ajustes', pc: true }) +
      '<button class="mg-it" type="button" data-acao="sair" aria-label="Sair">' + icone('sair') + '<span class="mg-pilula">Sair</span></button></div>';
  }
  function mostrarPilula() {
    var a = document.querySelector('.mg-it[aria-current="page"]');
    if (!a) return;
    a.classList.add('mostra');
    setTimeout(function () { a.classList.remove('mostra'); }, 1400);
  }

  function topo() {
    var d = ESTADO.dados, r = ESTADO.rota;
    var titulo = DO_MAIS[r] ? '<span class="mg-mais-trilha">Mais › </span>' + esc(TITULOS[r]) : esc(TITULOS[r]);
    var calc = d && d.resumo ? 'Números de ' + dataHora(d.resumo.calculadoEm) : 'Números ainda não calculados';
    return '<header class="mg-topo"><div><div class="mg-quem">Painel master · ' + esc(ESTADO.sessao.email) + '</div><h1>' + titulo + '</h1></div>' +
      '<div class="mg-acoes-topo"><span class="mg-selo">' + icone('relogio') + esc(calc) + '</span>' +
      '<button class="mg-btn" type="button" data-acao="recalcular"' + (ESTADO.calculando ? ' disabled' : '') + '>' + icone('atualizar') + (ESTADO.calculando ? 'Calculando…' : 'Atualizar números') + '</button></div></header>' +
      (d && d.exemplo ? '<div class="mg-aviso-ex"><span><b>Dados de exemplo.</b> Lojas, contas e números abaixo são fictícios para você ver o painel funcionando.</span><a class="mg-btn mini" href="#config">Apagar exemplos e começar</a></div>' : '');
  }

  function render() {
    var r = ESTADO.rota, tela = Painel.telas[r];
    var main = document.getElementById('mg-main');
    var html = topo() + '<div class="mg-tela">' + (tela ? tela(ESTADO.dados, ESTADO) : '') + '</div>';
    main.innerHTML = html;
    var blocos = main.querySelectorAll('.mg-tela > *');
    Array.prototype.forEach.call(blocos, function (b, i) { b.classList.add('mg-entra'); b.style.setProperty('--i', Math.min(i, 8)); });
    desenharTrilho();
    if (Painel.depois[r]) Painel.depois[r](main, ESTADO);
    ESTADO.formSujo = false;
  }

  function irPara() {
    var nova = rotaAtual();
    var mudou = nova !== ESTADO.rota;
    ESTADO.rota = nova;
    document.title = TITULOS[nova] + ' · Painel master';
    render();
    if (mudou) { window.scrollTo(0, 0); var h = document.querySelector('.mg-topo h1'); if (h) { h.setAttribute('tabindex', '-1'); h.focus({ preventScroll: true }); } }
    mostrarPilula();
  }

  function recarregar(recalcular) {
    ESTADO.calculando = !!recalcular;
    if (recalcular) render();
    return (recalcular ? P.recalcular() : P.carregarPainel()).then(function (d) {
      ESTADO.dados = d; ESTADO.calculando = false;
      if (!ESTADO.formSujo) render(); else desenharTrilho();
      if (recalcular) aviso('Números atualizados');
    }).catch(function (e) {
      ESTADO.calculando = false; render();
      aviso((e && e.message) || 'Não foi possível carregar os números.');
    });
  }

  /* ---------- login ---------- */
  function telaLogin(msg) {
    document.body.classList.add('sem-trilho');
    document.getElementById('mg-trilho').innerHTML = '';
    var demo = P.modo === 'demo';
    document.getElementById('mg-main').innerHTML =
      '<div class="mg-login"><form class="mg-card mg-entra" id="mg-form-login" novalidate>' +
      '<span class="mg-marca" style="margin:0">' + esc((P.cfg.nome || 'P').slice(0, 1)) + '</span>' +
      '<h1>Painel master</h1><p class="mg-sub">Entrada só para o dono da plataforma.</p>' +
      (msg ? '<p class="mg-chip cr" role="alert" style="margin:12px 0 0;display:block;white-space:normal;line-height:1.45;padding:8px 12px;border-radius:12px;word-break:break-all">' + esc(msg) + '</p>' : '') +
      '<div class="mg-form" style="grid-template-columns:1fr;margin-top:18px">' +
      '<label class="mg-campo">E-mail<input type="email" name="email" autocomplete="username" required></label>' +
      '<label class="mg-campo">Senha<input type="password" name="senha" autocomplete="current-password"' + (demo ? '' : ' required') + '></label></div>' +
      (demo ? '<p class="mg-sub" style="margin-top:12px">Modo demonstração: qualquer e-mail entra. Com o Firebase ligado, só quem tem o papel "plataforma".</p>' : '') +
      '<div class="rodape" style="display:flex;justify-content:flex-end;gap:10px;flex-wrap:wrap;margin-top:18px">' + (demo ? '' : '<button class="mg-btn" type="button" id="mg-google">Entrar com Google</button>') + '<button class="mg-btn pri" type="submit">Entrar</button></div></form></div>';
    document.getElementById('mg-form-login').addEventListener('submit', function (e) {
      e.preventDefault();
      var f = e.target, email = f.email.value.trim(), senha = f.senha.value;
      if (!demo && (!email || !senha)) return telaLogin('Informe e-mail e senha.');
      P.entrar(email, senha).then(conferirPapel).catch(function () { telaLogin('E-mail ou senha incorretos.'); });
    });
    var g = document.getElementById('mg-google');
    if (g) g.addEventListener('click', function () {
      P.entrarGoogle().then(conferirPapel).catch(function () { telaLogin('O login com Google não terminou. Tente de novo.'); });
    });
  }
  function conferirPapel(s) {
    if (s && (s.papeis || []).indexOf('plataforma') >= 0) return iniciar(s);
    var uid = s && s.uid;
    P.sair();
    telaLogin(uid ? 'Esta conta entrou, mas ainda não tem o papel "plataforma". Crie no Firestore o documento usuarios/' + uid + ' com papeis = ["plataforma"].' : 'Esta conta não tem acesso ao painel.');
  }

  function iniciar(sessao) {
    ESTADO.sessao = sessao;
    document.body.classList.remove('sem-trilho');
    ESTADO.rota = rotaAtual();
    P.carregarPainel().then(function (d) {
      ESTADO.dados = d;
      irPara();
      // números de mais de 20h (ou nunca calculados) pedem recálculo sozinhos
      var r = d.resumo;
      if (P.modo === 'firebase' && (!r || Date.now() - new Date(r.calculadoEm) > 20 * 3600e3)) recarregar(true);
    }).catch(function (e) { telaLogin((e && e.message) || 'Sem acesso.'); });
  }

  /* ---------- eventos globais ---------- */
  function ligar() {
    window.addEventListener('hashchange', function () { if (ESTADO.sessao) irPara(); });
    document.addEventListener('input', function (e) { if (e.target.closest && e.target.closest('#mg-main form')) ESTADO.formSujo = true; });
    document.addEventListener('click', function (e) {
      var el = e.target.closest && e.target.closest('[data-acao]');
      if (!el) {
        if (e.target.id === 'mg-modal') fecharModal();
        return;
      }
      var acao = el.getAttribute('data-acao');
      if (acao === 'sair') { P.sair().then(function () { ESTADO.sessao = null; telaLogin(); }); return; }
      if (acao === 'recalcular') { recarregar(true); return; }
      if (acao === 'fechar-modal') { fecharModal(); return; }
      if (Painel.acoes[acao]) { e.preventDefault(); Painel.acoes[acao](el, ESTADO, e); }
    });
    document.addEventListener('submit', function (e) {
      var f = e.target, nome = f.getAttribute('data-form');
      if (nome && Painel.forms[nome]) { e.preventDefault(); Painel.forms[nome](f, ESTADO, e); }
    });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !document.getElementById('mg-modal').hidden) fecharModal(); });
    ligarDicas();
  }

  window.Painel = {
    telas: {}, depois: {}, acoes: {}, forms: {},
    u: { esc: esc, atrDica: atrDica, brl: brl, brl0: brl0, num: num, pct: pct, compacto: compacto, nomeMes: nomeMes, dataCurta: dataCurta, dataHora: dataHora, diaBR: diaBR, waLink: waLink, icone: icone, chipSituacao: chipSituacao },
    g: { SERIES: SERIES, colunasEmpilhadas: colunasEmpilhadas, barrasH: barrasH, linha: linha, legenda: legenda },
    aviso: aviso, abrirModal: abrirModal, fecharModal: fecharModal, recarregar: recarregar, render: render, estado: ESTADO,
    iniciar: function () {
      ligar();
      P.sessao().then(function (s) { if (s && (s.papeis || []).indexOf('plataforma') >= 0) iniciar(s); else telaLogin(); });
    }
  };
})();
