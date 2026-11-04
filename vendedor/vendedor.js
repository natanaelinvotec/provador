/*
 * vendedor.js — área do vendedor convidado: entra com a conta Google do convite, pega o link próprio,
 * a mensagem pronta e o QR code, e acompanha as lojas que vieram pelo link (sem ver contato de ninguém).
 */
(function () {
  'use strict';
  var P = window.Plataforma, V = window.Vendedores, QR = window.QR;
  var main = document.getElementById('vd-main');
  var BASE = new URL('../', location.href).href;
  var PDF = new URL('../assets/portfolio/Provador-Portfolio.pdf', location.href).href;
  var S = { conta: null, dados: null };

  var esc = function (v) { return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var num = function (v) { return Number(v || 0).toLocaleString('pt-BR'); };
  var dia = function (s) { return s ? String(s).slice(8, 10) + '/' + String(s).slice(5, 7) + '/' + String(s).slice(0, 4) : '—'; };
  var IC = {
    copiar: 'M8 8h12v12H8zM4 16V4h12', conversa: 'M4 20l1.5-4A8 8 0 1 1 8 19z', baixar: 'M12 4v11M7 10l5 5 5-5M5 20h14',
    sair: 'M15 4h4v16h-4M10 8l-4 4 4 4M6 12h10', check: 'M5 12.5l4.5 4.5L19 7.5', relogio: 'M12 7v5l3 2M12 21a9 9 0 1 1 0-18 9 9 0 0 1 0 18z',
    moedas: 'M9 4a5 5 0 1 0 0 10a5 5 0 1 0 0-10zM15 10a5 5 0 1 1 0 10a5 5 0 0 1-5-5', x: 'M6 6l12 12M18 6L6 18'
  };
  var ic = function (k) { return '<svg class="mg-ic" viewBox="0 0 24 24" aria-hidden="true"><path d="' + IC[k] + '"></path></svg>'; };
  var ETIQUETA = '<svg viewBox="-4 -2 48 60" aria-hidden="true"><path fill-rule="evenodd" d="M0 56V12L12 0h16l12 12v17L29 40H14v16zM30.5 17a6 6 0 1 1-12 0 6 6 0 0 1 12 0z"/></svg>';
  var marca = '<a class="vd-marca" href="../">' + ETIQUETA + 'Provador</a>';
  var toastT;
  function aviso(msg) {
    var t = document.getElementById('mg-toast'); t.textContent = msg; t.classList.add('on');
    clearTimeout(toastT); toastT = setTimeout(function () { t.classList.remove('on'); }, 3200);
  }
  function copiar(txt, ok) {
    (navigator.clipboard ? navigator.clipboard.writeText(txt) : Promise.reject()).then(function () { aviso(ok); })
      .catch(function () { window.prompt('Copie:', txt); });
  }
  function wa(msg) { return 'https://wa.me/?text=' + encodeURIComponent(msg); }

  /* ---------- entrar ---------- */
  function telaEntrar(msg) {
    var demo = P.modo === 'demo';
    main.innerHTML = '<div class="mg-login vd-login"><div class="mg-card">' + marca +
      '<h1>Área do vendedor</h1><p class="mg-sub">Entre com a conta Google do e-mail em que você recebeu o convite. Aqui fica o seu link, a mensagem pronta e as lojas que vieram por você.</p>' +
      (msg ? '<p class="mg-chip cr" role="alert" style="margin:14px 0 0;display:block;white-space:normal;line-height:1.45;padding:9px 12px;border-radius:12px">' + esc(msg) + '</p>' : '') +
      (demo
        ? '<form id="vd-form" novalidate style="margin-top:18px"><div class="mg-form" style="grid-template-columns:1fr"><label class="mg-campo">E-mail do convite<input type="email" name="email" autocomplete="email" required></label></div>' +
          '<p class="mg-sub" style="margin-top:10px">Modo demonstração: experimente com carol@exemplo.com.</p>' +
          '<div style="display:flex;justify-content:flex-end;margin-top:16px"><button class="mg-btn pri" type="submit">Entrar</button></div></form>'
        : '<div style="display:flex;justify-content:flex-end;margin-top:20px"><button class="mg-btn pri" type="button" id="vd-google">Entrar com Google</button></div>') +
      '</div></div>';
    var f = document.getElementById('vd-form');
    if (f) f.addEventListener('submit', function (e) { e.preventDefault(); var em = f.email.value.trim(); if (!/@/.test(em)) return telaEntrar('Digite o e-mail do convite.'); P.vendedorEntrar(em).then(abrir); });
    var g = document.getElementById('vd-google');
    if (g) g.addEventListener('click', function () {
      g.disabled = true;
      P.vendedorEntrarGoogle().then(abrir).catch(function (e) { telaEntrar(/popup/.test((e && e.code) || '') ? 'A janela do Google foi fechada antes de terminar.' : 'O login com Google não terminou. Tente de novo.'); });
    });
  }
  function aviso404(titulo, texto) {
    main.innerHTML = '<div class="mg-login vd-login"><div class="mg-card">' + marca + '<h1>' + esc(titulo) + '</h1><p class="mg-sub">' + esc(texto) + '</p>' +
      '<div style="display:flex;justify-content:flex-end;margin-top:20px"><button class="mg-btn" type="button" data-acao="sair">' + ic('sair') + 'Entrar com outra conta</button></div></div></div>';
  }
  function abrir(conta) {
    S.conta = conta;
    if (!conta) return telaEntrar();
    if (P.modo === 'firebase' && conta.verificado === false) { P.vendedorSair(); return telaEntrar('Esta conta ainda não confirmou o e-mail. Entre com a conta Google do convite.'); }
    main.innerHTML = '<p class="mg-sub" style="padding:40px 20px">Abrindo o seu painel…</p>';
    return P.meuPainelVendedor(conta).then(function (r) {
      if (r.semConvite) return aviso404('Sem convite para este e-mail', 'Não achamos convite de vendedor para ' + conta.email + '. Peça o convite para quem administra o Provador, ou entre com a conta certa.');
      if (r.inativo) return aviso404('Acesso pausado', 'Seu acesso de vendedor está pausado. O link deixou de contar lojas novas. Fale com quem administra o Provador.');
      if (r.outraConta) return aviso404('Convite já aceito', 'Este convite já foi aceito com outra conta Google. Entre com ela, ou peça um convite novo.');
      S.dados = r; desenhar();
    }).catch(function (e) {
      if (/permission/.test((e && e.code) || '')) return aviso404('Acesso ainda não liberado', 'Esta conta (' + conta.email + ') não tem convite de vendedor liberado. Peça o convite para quem administra o Provador, ou entre com a conta Google do convite.');
      aviso404('Não deu para abrir agora', 'O painel não respondeu (' + ((e && (e.code || e.message)) || 'erro') + '). Tente de novo em instantes.');
    });
  }

  /* ---------- painel do vendedor ---------- */
  // do lado do vendedor, a comissão é "a receber" e "recebida"
  var ROTULO = { cadastro: 'Dias grátis', confirmada: 'A receber', paga: 'Recebida', cancelada: 'Não assinou' };
  var PLANO = { vitrine: 'Vitrine', loja: 'Loja', completo: 'Completo' };
  function chip(st) {
    var m = { cadastro: ['info', 'relogio'], confirmada: ['at', 'moedas'], paga: ['ok', 'check'], cancelada: ['', 'x'] }[st] || ['', 'relogio'];
    return '<span class="mg-chip ' + m[0] + '">' + ic(m[1]) + esc(ROTULO[st] || st) + '</span>';
  }
  function kpi(rot, val, det) { return '<div class="mg-card mg-kpi"><span>' + esc(rot) + '</span><b>' + val + '</b>' + (det ? '<small>' + det + '</small>' : '') + '</div>'; }
  function desenhar() {
    var d = S.dados, v = d.vendedor, valor = V.lerValor(d.regras), r = V.resumo(d.indicacoes);
    var link = V.linkIndicacao(BASE, v.codigo), msg = V.mensagemDivulgacao(v.nomeCurto, link);
    var lojas = d.indicacoes.slice().sort(function (a, b) { return (b.criadaEm || '') < (a.criadaEm || '') ? -1 : 1; });
    var linhas = lojas.map(function (i) {
      return '<tr><td><b>' + esc(i.nome) + '</b></td><td>' + esc(dia(i.criadaEm)) + '</td><td>' + esc(PLANO[i.plano] || i.plano) + '</td><td>' + chip(i.status) + '</td><td class="n">' + (i.valor != null ? V.brl(i.valor) : '—') + '</td></tr>';
    }).join('');
    main.innerHTML =
      '<header class="vd-topo"><div>' + marca + '<h1>Olá, ' + esc(v.nomeCurto) + '</h1></div>' +
      '<button class="mg-btn" type="button" data-acao="sair">' + ic('sair') + 'Sair</button></header>' +
      '<div class="mg-grade mg-g4">' +
      kpi('Lojas pelo seu link', num(r.total), 'todas as que montaram') +
      kpi('Nos 15 dias grátis', num(r.emTeste), 'ainda decidindo') +
      kpi('Assinaram', num(r.confirmadas + r.pagas), 'com o 1º pagamento feito') +
      kpi('A receber', V.brl(r.aPagar), V.brl(r.pago) + ' já recebidos') + '</div>' +
      '<div class="mg-grade" style="margin-top:18px">' +
      '<section class="mg-card"><div class="mg-card-topo"><div><h2>Seu link</h2><p class="mg-sub">Quem abrir e montar a loja nos próximos 60 dias conta para você.</p></div></div>' +
      '<div class="vd-link"><div><span class="vd-link-url" id="vd-url">' + esc(link) + '</span>' +
      '<div class="mg-botoes"><button class="mg-btn pri" type="button" data-acao="copiar-link">' + ic('copiar') + 'Copiar link</button>' +
      '<a class="mg-btn" href="' + esc(wa(msg)) + '" target="_blank" rel="noopener">' + ic('conversa') + 'Mandar no WhatsApp</a>' +
      '<a class="mg-btn" href="' + esc(PDF) + '" download="Provador-Portfolio.pdf">' + ic('baixar') + 'Portfólio em PDF</a></div>' +
      '<div class="vd-ganho">' + ic('moedas') + '<span>Você ganha <b>' + esc(V.brl(valor)) + '</b> por loja que assinar pelo seu link.</span></div></div>' +
      '<div class="vd-qr">' + (QR ? QR.svg(link, { cor: '#0A1630', rotulo: 'QR code do seu link de vendedor' }) : '') + '<span>Mostre na tela do celular: a lojista aponta a câmera e abre o seu link.</span></div></div></section>' +
      '<section class="mg-card"><div class="mg-card-topo"><div><h2>Mensagem pronta</h2><p class="mg-sub">Copie e mande para quem vende roupa. Pode mudar o texto à vontade, o link é o que conta.</p></div>' +
      '<button class="mg-btn" type="button" data-acao="copiar-msg">' + ic('copiar') + 'Copiar mensagem</button></div>' +
      '<label class="mg-sr" for="vd-msg">Mensagem para mandar</label><textarea class="vd-msg" id="vd-msg" rows="6">' + esc(msg) + '</textarea></section>' +
      '<section class="mg-card"><div class="mg-card-topo"><div><h2>Suas lojas</h2><p class="mg-sub">Você vê o nome da loja e a situação. O contato da lojista fica só com ela.</p></div></div>' +
      (lojas.length ? '<div class="mg-tabela-wrap"><table class="mg-tabela"><thead><tr><th>Loja</th><th>Montou em</th><th>Plano</th><th>Situação</th><th class="n">Comissão</th></tr></thead><tbody>' + linhas + '</tbody></table></div>'
        : '<div class="mg-vazio"><b>Nenhuma loja ainda.</b>Mande o seu link para quem vende roupa. Quando alguém montar a loja por ele, aparece aqui.</div>') + '</section>' +
      '<section class="mg-card"><div class="mg-card-topo"><div><h2>Como funciona</h2></div></div><ol class="vd-passos">' +
      '<li><span><b>Mande o seu link</b><span>Pelo WhatsApp, no Instagram ou mostrando o QR code. O portfólio em PDF ajuda a explicar.</span></span></li>' +
      '<li><span><b>A lojista monta a loja</b><span>Ela escolhe o modelo, sobe as fotos pelo celular e publica com 15 dias grátis. Aparece aqui como "Dias grátis".</span></span></li>' +
      '<li><span><b>Ela assina</b><span>Quando a primeira mensalidade é paga, a loja vira "A receber" com o valor da sua comissão.</span></span></li>' +
      '<li><span><b>Você recebe</b><span>O Provador acerta com você e marca como "Recebida".</span></span></li></ol></section></div>';
  }

  document.addEventListener('click', function (e) {
    var el = e.target.closest && e.target.closest('[data-acao]');
    if (!el) return;
    var a = el.getAttribute('data-acao');
    if (a === 'sair') P.vendedorSair().then(function () { S.conta = null; telaEntrar(); });
    if (a === 'copiar-link') copiar(V.linkIndicacao(BASE, S.dados.vendedor.codigo), 'Link copiado');
    if (a === 'copiar-msg') copiar(document.getElementById('vd-msg').value, 'Mensagem copiada');
  });

  P.vendedorSessao().then(function (c) { if (c) abrir(c); else telaEntrar(); }).catch(function () { telaEntrar(); });
})();
