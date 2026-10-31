/*
 * montar.js — "Quero minha loja": a lojista monta a loja sozinha, com a prévia ao lado (como na vitrine da AtletaPay).
 *  Passo 1 Sua loja · 2 Vitrine · 3 Fotos (o provador) · 4 Publicar (conta + 15 dias grátis).
 * Depois de publicada, a mesma tela vira o painel dela ("Minha loja"): edita tudo e salva direto na loja.
 */
(function () {
  'use strict';
  var P = window.Plataforma, CAT = window.Catalogo, F = window.Fotos;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var brl = function (v) { return (Number(v) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }); };
  var uid = function () { return 'i' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); };

  var GUIAS = {
    conjuntos: 'Top e legging juntos. Modelo de frente, corpo inteiro, ou a peça esticada numa superfície lisa. Uma foto por cor.',
    leggings: 'A legging inteira, de frente. Mostre o cós e o comprimento.',
    tops: 'O top de frente, sobre fundo liso. Se as costas forem diferentes, mande uma foto das costas também.',
    macacoes: 'Corpo inteiro, de frente. Se tiver detalhe nas costas, mande outra foto.',
    macaquinhos: 'Corpo inteiro, de frente, com a bermuda aparecendo inteira.',
    acessorios: 'O produto sozinho, sobre fundo claro, bem iluminado.'
  };
  var DICAS = ['Luz de janela, sem flash', 'Fundo liso (parede ou lençol)', 'Celular em pé', 'Sem filtro e sem moldura'];

  var S = {
    passo: 0, rz: null, conta: null, painel: false, lojaReal: null, vitrines: [], catAtiva: 'conjuntos', pagPrevia: 'inicio',
    removidos: [], salvando: false, entrando: false
  };
  var PASSOS_NOVO = ['Sua loja', 'Vitrine', 'Fotos', 'Publicar'], PASSOS_PAINEL = ['Loja', 'Vitrine', 'Fotos', 'Plano'];

  function novoRascunho() {
    return { loja: { nome: '', marcaCurta: '', marcaSub: 'MODA FITNESS', cidade: '', instagram: '', whatsappLoja: '', donoNome: '', plano: 'loja' }, vitrine: 'vinho-delicado', itens: [], atualizado: Date.now() };
  }

  /* ---------- gravação do rascunho e prévia ---------- */
  var tGravar, tPrevia;
  function mudou(previa) {
    S.rz.atualizado = Date.now();
    clearTimeout(tGravar);
    tGravar = setTimeout(function () { window.Rascunho.gravar(S.rz).catch(function () { aviso('O navegador não deixou guardar o rascunho.'); }); }, 350);
    if (previa !== false) { clearTimeout(tPrevia); tPrevia = setTimeout(atualizarPrevia, 900); }
  }
  function atualizarPrevia() {
    var q = new URLSearchParams({ rascunho: '1', v: S.rz.vitrine, p: S.pagPrevia, t: String(Date.now()) });
    $('#mt-iframe').src = '../vitrine.html?' + q.toString();
    var marca = (S.rz.loja.marcaCurta || S.rz.loja.nome || 'sualoja').toLowerCase().replace(/[^a-z0-9]+/g, '');
    $('#mt-previa-end').textContent = S.lojaReal ? S.lojaReal.slug + ' · no ar' : (marca || 'sualoja') + '.com.br (prévia)';
  }
  function aviso(t) { var el = $('#mt-toast'); el.textContent = t; el.classList.add('on'); clearTimeout(aviso.t); aviso.t = setTimeout(function () { el.classList.remove('on'); }, 3200); }

  /* ---------- passos ---------- */
  function passos() { return S.painel ? PASSOS_PAINEL : PASSOS_NOVO; }
  function desenharPassos() {
    $('#mt-passos').innerHTML = passos().map(function (t, i) {
      var feito = i < S.passo || (S.painel);
      return '<li><button type="button" role="tab" data-passo="' + i + '" aria-selected="' + (i === S.passo) + '" class="' + (feito && i !== S.passo ? 'feito' : '') + '"><span>' + (i + 1) + '</span>' + esc(t) + '</button></li>';
    }).join('');
  }
  function ir(n) {
    S.passo = Math.max(0, Math.min(3, n));
    desenharPassos(); desenhar();
    var h = $('#mt-corpo h1'); if (h) { h.setAttribute('tabindex', '-1'); h.focus({ preventScroll: true }); }
    $('#mt-corpo').scrollTop = 0;
  }
  function desenhar() {
    var corpo = $('#mt-corpo');
    $('#mt-entrar').hidden = S.painel || S.entrando;
    if (S.entrando) {
      corpo.innerHTML = telaEntrar();
      $('#mt-nav').innerHTML = '<button class="pv-btn pv-btn-linha pv-btn-largo" type="button" data-acao="montar-nova">Montar uma loja nova</button>';
      return;
    }
    corpo.innerHTML = [telaLoja, telaVitrine, telaFotos, S.painel ? telaPlano : telaPublicar][S.passo]();
    var nav = '';
    if (S.painel) nav = '<button class="pv-btn pv-btn-pri pv-btn-largo" type="button" data-acao="salvar"' + (S.salvando ? ' disabled' : '') + '>' + (S.salvando ? 'Salvando…' : 'Salvar alterações na loja') + '</button>';
    else if (S.passo < 3) nav = (S.passo ? '<button class="pv-btn pv-btn-linha" type="button" data-acao="voltar">Voltar</button>' : '') + '<button class="pv-btn pv-btn-pri" type="button" data-acao="continuar">Continuar</button>';
    else nav = '<button class="pv-btn pv-btn-linha" type="button" data-acao="voltar">Voltar</button>';
    $('#mt-nav').innerHTML = nav;
    if (S.passo === 2) ligarFotos();
  }

  function campo(rot, nome, val, extra, dica) {
    return '<label class="mt-campo">' + esc(rot) + '<input name="' + nome + '" value="' + esc(val || '') + '"' + (extra || '') + '>' + (dica ? '<small>' + esc(dica) + '</small>' : '') + '</label>';
  }
  function telaLoja() {
    var l = S.rz.loja;
    return '<h1>' + (S.painel ? 'Dados da loja' : 'Como sua loja se chama?') + '</h1><p class="mt-sub">Tudo aparece na prévia enquanto você digita.</p>' +
      '<form class="mt-form" data-form="loja" novalidate>' +
      campo('Nome da loja', 'nome', l.nome, ' maxlength="80" required autocomplete="organization"') +
      campo('Nome no logo', 'marcaCurta', l.marcaCurta, ' maxlength="24"', 'Curto, como aparece no topo do site. Ex.: Ais') +
      campo('Linha embaixo do logo', 'marcaSub', l.marcaSub, ' maxlength="30"', 'Ex.: MODA FITNESS') +
      campo('Cidade', 'cidade', l.cidade, ' maxlength="60" autocomplete="address-level2"', 'Ex.: Campo Grande, MS') +
      campo('Instagram da loja', 'instagram', l.instagram, ' maxlength="40" autocapitalize="off"', 'Sem o @') +
      campo('WhatsApp da loja', 'whatsappLoja', l.whatsappLoja, ' type="tel" inputmode="tel" maxlength="20" autocomplete="tel"', 'Onde as clientes falam com você. Com DDD.') +
      (S.painel ? '' : campo('Seu nome', 'donoNome', l.donoNome, ' maxlength="80" autocomplete="name"')) + '</form>';
  }
  function telaVitrine() {
    var lista = S.vitrines.filter(function (v) { return v.publica; });
    return '<h1>Escolha a vitrine</h1><p class="mt-sub">Todas funcionam igual. Muda a cara da loja. Pode trocar quando quiser.</p>' +
      '<div class="mt-vits">' + lista.map(function (v) {
        return '<button type="button" class="mt-vit" data-vitrine="' + esc(v.slug) + '" aria-pressed="' + (S.rz.vitrine === v.slug) + '"><img src="../assets/img/vitrines/' + esc(v.slug) + '.jpg" alt="" loading="lazy"><b>' + esc(v.nome) + '</b><span>' + esc(v.estilo) + '</span></button>';
      }).join('') + '</div>';
  }

  /* ---------- passo 3: o provador de fotos ---------- */
  function telaFotos() {
    var itens = S.rz.itens, porCat = {};
    itens.forEach(function (i) { porCat[i.cat] = (porCat[i.cat] || 0) + 1; });
    var abas = CAT.CATEGORIAS.map(function (c) {
      return '<button type="button" class="mt-aba" data-cat="' + c[0] + '" aria-pressed="' + (S.catAtiva === c[0]) + '">' + esc(c[1]) + (porCat[c[0]] ? ' <span>' + porCat[c[0]] + '</span>' : '') + '</button>';
    }).join('');
    var daCat = itens.filter(function (i) { return i.cat === S.catAtiva; });
    var nomes = {}; itens.filter(function (i) { return i.cat === S.catAtiva; }).forEach(function (i) { if (i.nome) nomes[i.nome] = 1; });
    var catNome = CAT.CATEGORIAS.filter(function (c) { return c[0] === S.catAtiva; })[0];
    return '<h1>' + (S.painel ? 'Suas peças' : 'Suba as fotos das suas peças') + '</h1>' +
      '<p class="mt-sub">Escolha a categoria e mande as fotos. A gente endireita, recorta, acerta a luz e descobre a cor. Você só confere o nome e o preço.</p>' +
      '<div class="mt-abas" role="group" aria-label="Categoria">' + abas + '</div>' +
      '<div class="mt-guia"><b>' + esc(catNome[1]) + '</b><p>' + esc(GUIAS[S.catAtiva]) + '</p><ul>' + DICAS.map(function (d) { return '<li>' + esc(d) + '</li>'; }).join('') + '</ul></div>' +
      '<label class="mt-soltar" id="mt-soltar"><input type="file" accept="image/*" multiple id="mt-arquivos"><b>Escolher fotos de ' + esc(catNome[1].toLowerCase()) + '</b><span>ou arraste aqui. Pode mandar várias de uma vez.</span></label>' +
      '<div class="mt-processando" id="mt-proc" hidden></div>' +
      (daCat.length ? '<div class="mt-preco-lote"><label>Mesmo preço para todas de ' + esc(catNome[1].toLowerCase()) + ' <input type="number" min="0" step="0.01" inputmode="decimal" id="mt-preco-lote" placeholder="0,00"></label><button class="pv-btn pv-btn-linha pv-mini" type="button" data-acao="preco-lote">Aplicar</button></div>' : '') +
      '<datalist id="mt-nomes">' + Object.keys(nomes).map(function (n) { return '<option value="' + esc(n) + '">'; }).join('') + '</datalist>' +
      '<ul class="mt-pecas">' + daCat.map(cartaoPeca).join('') + '</ul>' +
      (itens.length ? '' : '<p class="mt-vazio">Sem fotos ainda, a prévia mostra fotos de exemplo. Assim que você mandar a primeira, ela entra no lugar.</p>');
  }
  function cartaoPeca(i) {
    var cores = F.CORES.map(function (c) { return '<option value="' + esc(c[0]) + '"' + (c[0] === i.cor ? ' selected' : '') + '>' + esc(c[0]) + '</option>'; }).join('');
    var tam = i.cat === 'acessorios' ? ['U'] : CAT.TAMANHOS;
    var cats = CAT.CATEGORIAS.map(function (c) { return '<option value="' + c[0] + '"' + (c[0] === i.cat ? ' selected' : '') + '>' + esc(c[1]) + '</option>'; }).join('');
    return '<li class="mt-peca" data-id="' + esc(i.id) + '">' +
      '<button type="button" class="mt-peca-foto" data-acao="ajustar" data-id="' + esc(i.id) + '" aria-label="Ajustar enquadramento"><img src="' + esc(i.img) + '" alt=""><span>Ajustar</span></button>' +
      '<div class="mt-peca-campos">' +
      '<label class="mt-campo">Nome da peça<input data-campo="nome" value="' + esc(i.nome) + '" maxlength="80" list="mt-nomes"></label>' +
      '<div class="mt-linha"><label class="mt-campo">Cor<span class="mt-cor"><i style="background:' + esc(i.hex || '#999') + '"></i><select data-campo="cor">' + cores + '</select></span></label>' +
      '<label class="mt-campo">Preço<input data-campo="preco" type="number" min="0" step="0.01" inputmode="decimal" value="' + esc(i.preco || '') + '" placeholder="0,00"></label></div>' +
      '<div class="mt-tams" role="group" aria-label="Tamanhos">' + tam.map(function (t) { var on = (i.tamanhos || []).indexOf(t) >= 0; return '<button type="button" data-tam="' + t + '" aria-pressed="' + on + '">' + (t === 'U' ? 'Tamanho único' : t) + '</button>'; }).join('') + '</div>' +
      '<div class="mt-linha"><label class="mt-campo">Categoria<select data-campo="cat">' + cats + '</select></label>' +
      '<button class="pv-btn pv-btn-linha pv-mini mt-remover" type="button" data-acao="remover" data-id="' + esc(i.id) + '">Remover</button></div>' +
      (i.avisos && i.avisos.length ? '<ul class="mt-avisos">' + i.avisos.map(function (a) { return '<li>' + esc(a) + '</li>'; }).join('') + '</ul>' : '') +
      '</div></li>';
  }
  function ligarFotos() {
    var inp = $('#mt-arquivos'), zona = $('#mt-soltar');
    inp.addEventListener('change', function () { receber(inp.files); inp.value = ''; });
    ['dragenter', 'dragover'].forEach(function (ev) { zona.addEventListener(ev, function (e) { e.preventDefault(); zona.classList.add('on'); }); });
    ['dragleave', 'drop'].forEach(function (ev) { zona.addEventListener(ev, function (e) { e.preventDefault(); zona.classList.remove('on'); }); });
    zona.addEventListener('drop', function (e) { receber(e.dataTransfer.files); });
  }
  function receber(lista) {
    var arquivos = Array.prototype.filter.call(lista || [], function (f) { return /^image\//.test(f.type) || /\.(jpe?g|png|webp|heic)$/i.test(f.name); }).slice(0, 30);
    if (!arquivos.length) return;
    var proc = $('#mt-proc'), feitos = 0, cat = S.catAtiva, singular = (CAT.CATEGORIAS.filter(function (c) { return c[0] === cat; })[0] || [])[2] || 'Peça';
    proc.hidden = false; proc.textContent = 'Ajustando 0 de ' + arquivos.length + ' fotos…';
    arquivos.reduce(function (p, arq) {
      return p.then(function () {
        return F.processar(arq).then(function (r) {
          var ultimo = S.rz.itens.filter(function (i) { return i.cat === cat; }).slice(-1)[0];
          S.rz.itens.push({ id: uid(), cat: cat, nome: singular + ' ' + r.cor.toLowerCase(), cor: r.cor, hex: r.hex, preco: ultimo ? ultimo.preco : '', tamanhos: cat === 'acessorios' ? ['U'] : CAT.TAMANHOS.slice(), img: r.img, orig: r.orig, avisos: r.avisos, novo: true, sujo: true });
        }).catch(function () { aviso('Não deu para abrir ' + arq.name + '. Tente JPG ou PNG.'); })
          .then(function () { feitos++; proc.textContent = 'Ajustando ' + feitos + ' de ' + arquivos.length + ' fotos…'; });
      });
    }, Promise.resolve()).then(function () {
      proc.hidden = true; mudou(); desenhar();
      aviso(arquivos.length === 1 ? 'Foto ajustada e na prévia' : arquivos.length + ' fotos ajustadas e na prévia');
    });
  }

  /* ---------- passo 4: publicar (novo) ou plano e domínio (painel) ---------- */
  function resumo() {
    var m = CAT.modelo(S.rz.itens), cores = m.grupos.reduce(function (s, g) { return s + g.itens.length; }, 0);
    var plural = function (n, um, varios) { return n + ' ' + (n === 1 ? um : varios); };
    return plural(m.grupos.length, 'roupa', 'roupas') + ' (' + plural(cores, 'cor', 'cores') + ')' + (m.accs.length ? ' e ' + plural(m.accs.length, 'acessório', 'acessórios') : '');
  }
  function telaPublicar() {
    var l = S.rz.loja, m = CAT.modelo(S.rz.itens), falta = [];
    if (!l.nome) falta.push('o nome da loja'); if (String(l.whatsappLoja || '').replace(/\D/g, '').length < 10) falta.push('o WhatsApp da loja');
    if (!m.grupos.length) falta.push('pelo menos uma foto de roupa');
    var semPreco = S.rz.itens.filter(function (i) { return !(Number(i.preco) > 0); }).length;
    if (S.conta) {
      return '<h1>Publicar a ' + esc(l.nome || 'sua loja') + '</h1><p class="mt-sub">Entrou como ' + esc(S.conta.email || 'você') + '.</p>' + listaFalta(falta, semPreco) +
        '<button class="pv-btn pv-btn-pri pv-btn-largo" type="button" data-acao="publicar"' + (falta.length ? ' disabled' : '') + '>Publicar com 15 dias grátis</button>';
    }
    return '<h1>Falta só criar seu acesso</h1><p class="mt-sub">Sua loja fica no ar na hora, com 15 dias grátis e sem cartão. É com este acesso que você entra no seu painel.</p>' +
      listaFalta(falta, semPreco) +
      '<button class="pv-btn pv-btn-escuro pv-btn-largo" type="button" data-acao="google"' + (falta.length ? ' disabled' : '') + '>Continuar com Google</button>' +
      '<p class="mt-ou">ou com e-mail</p>' +
      '<form class="mt-form" data-form="conta" novalidate>' +
      campo('E-mail', 'email', '', ' type="email" autocomplete="email" required') +
      '<label class="mt-campo">Senha<input name="senha" type="password" minlength="6" autocomplete="new-password" required><small>Pelo menos 6 caracteres.</small></label>' +
      '<p class="mt-erro" id="mt-erro" role="alert"></p>' +
      '<button class="pv-btn pv-btn-pri pv-btn-largo" type="submit"' + (falta.length ? ' disabled' : '') + '>Criar acesso e publicar</button>' +
      '<button class="mt-link" type="button" data-acao="ja-tenho">Já tenho acesso</button></form>' +
      '<p class="mt-nota">Depois dos 15 dias você escolhe um plano para continuar. Suas fotos e dados ficam só na sua loja.</p>';
  }
  function listaFalta(falta, semPreco) {
    var ok = '<div class="mt-resumo"><b>' + esc(resumo()) + '</b><span>Vitrine ' + esc(nomeVitrine(S.rz.vitrine)) + '</span></div>';
    if (falta.length) ok += '<p class="mt-falta">Antes de publicar, falta ' + esc(falta.join(', ')) + '.</p>';
    else if (semPreco) ok += '<p class="mt-falta leve">' + semPreco + (semPreco === 1 ? ' foto está' : ' fotos estão') + ' sem preço. Pode publicar e completar depois no painel.</p>';
    return ok;
  }
  function nomeVitrine(slug) { var v = S.vitrines.filter(function (x) { return x.slug === slug; })[0]; return v ? v.nome : slug; }
  function diasTeste() { var l = S.lojaReal; if (!l) return 0; var ate = l.trialAteMs || Date.parse(l.trialAte); return Math.max(0, Math.ceil((ate - Date.now()) / 864e5)); }
  function linkLoja() { return S.lojaReal ? new URL('../vitrine.html?l=' + encodeURIComponent(S.lojaReal.slug), location.href).href : ''; }
  function telaPlano() {
    var l = S.lojaReal || {}, dias = diasTeste(), w = String((P.cfg.whatsappComercial || '')).replace(/\D/g, '');
    var msg = encodeURIComponent('Oi! Quero assinar o plano da minha loja ' + (l.nome || '') + ' (' + linkLoja() + ').');
    return '<h1>Plano e domínio</h1>' +
      '<div class="mt-cartao">' + (l.status === 'teste' ? '<b>' + (dias ? 'Faltam ' + dias + (dias === 1 ? ' dia' : ' dias') + ' de teste grátis' : 'Seu teste grátis terminou') + '</b><span>Plano escolhido: ' + esc(l.plano || 'loja') + '. Para continuar depois do teste, fale com a gente.</span>' : '<b>Loja ativa</b><span>Plano ' + esc(l.plano || '') + '.</span>') +
      (w.length >= 12 ? '<a class="pv-btn pv-btn-pri" href="https://wa.me/' + w + '?text=' + msg + '" target="_blank" rel="noopener">Quero assinar</a>' : '') + '</div>' +
      '<div class="mt-cartao"><b>Link da sua loja</b><a href="' + esc(linkLoja()) + '" target="_blank" rel="noopener" class="mt-quebra">' + esc(linkLoja()) + '</a>' +
      '<button class="pv-btn pv-btn-linha pv-mini" type="button" data-acao="copiar-link">Copiar link</button></div>' +
      '<form class="mt-form mt-cartao" data-form="dominio" novalidate><b>Domínio próprio</b><span>Ex.: sualoja.com.br. A gente configura e avisa quando estiver no ar.</span>' +
      campo('Domínio que você quer usar', 'dominioPedido', l.dominioPedido, ' maxlength="120" autocapitalize="off" placeholder="sualoja.com.br"') +
      '<button class="pv-btn pv-btn-linha pv-mini" type="submit">Pedir este domínio</button></form>';
  }

  function telaEntrar() {
    return '<h1>Entrar na minha loja</h1><p class="mt-sub">Use o mesmo acesso com que você publicou a loja.</p>' +
      '<button class="pv-btn pv-btn-escuro pv-btn-largo" type="button" data-acao="google-entrar">Entrar com Google</button>' +
      '<p class="mt-ou">ou com e-mail</p>' +
      '<form class="mt-form" data-form="entrar" novalidate>' +
      campo('E-mail', 'email', '', ' type="email" autocomplete="email" required') +
      '<label class="mt-campo">Senha<input name="senha" type="password" autocomplete="current-password" required></label>' +
      '<p class="mt-erro" id="mt-erro" role="alert"></p>' +
      '<button class="pv-btn pv-btn-pri pv-btn-largo" type="submit">Entrar</button></form>';
  }
  /** Depois de entrar: abre o painel se ela já tem loja; se não, volta para montar com o acesso guardado. */
  function aposEntrar(c) {
    S.conta = c;
    return P.minhaLoja(c).then(function (r) {
      S.entrando = false;
      if (r) { entrarNoPainel(r); aviso('Bem-vinda de volta!'); return ir(2); }
      aviso('Este acesso ainda não tem loja. Monte a sua e publique no passo 4.'); ir(0);
    });
  }

  /* ---------- conta e publicação ---------- */
  function publicar(conta) {
    S.conta = conta;
    var botao = $('[data-acao="publicar"]') || $('[data-form="conta"] button[type="submit"]');
    if (botao) { botao.disabled = true; botao.textContent = 'Publicando sua loja…'; }
    var rz = JSON.parse(JSON.stringify(S.rz));
    rz.itens = rz.itens.map(function (i) { delete i.orig; delete i.avisos; delete i.sujo; return i; });
    return P.publicarLojaSozinha(rz, conta).then(function (l) {
      return P.minhaLoja(conta).then(function (r) { entrarNoPainel(r || { loja: l, itens: rz.itens }); aviso('Sua loja está no ar!'); ir(3); });
    }).catch(function (e) {
      aviso('Não deu para publicar: ' + ((e && (e.code || e.message)) || 'tente de novo'));
      desenhar();
    });
  }
  function erroConta(e) {
    var c = (e && e.code) || '', el = $('#mt-erro');
    var m = /email-already-in-use/.test(c) ? 'Este e-mail já tem acesso. Toque em "Já tenho acesso".' : /invalid-email/.test(c) ? 'Confira o e-mail.' : /weak-password/.test(c) ? 'A senha precisa de pelo menos 6 caracteres.' : /wrong-password|invalid-credential|user-not-found/.test(c) ? 'E-mail ou senha não conferem.' : /popup/.test(c) ? 'A janela do Google foi fechada antes de terminar.' : 'Não deu para entrar agora. Tente de novo.';
    if (el) el.textContent = m; else aviso(m);
  }
  function entrarNoPainel(r) {
    S.painel = true; S.lojaReal = r.loja;
    var l = r.loja;
    S.rz = { loja: { nome: l.nome, marcaCurta: l.marcaCurta, marcaSub: l.marcaSub, cidade: l.cidade, instagram: l.instagram, whatsappLoja: l.whatsappLoja, plano: l.plano }, vitrine: l.vitrine, itens: (r.itens || []).map(function (i) { return Object.assign({}, i); }), atualizado: Date.now(), lojaId: l.id };
    window.Rascunho.gravar(S.rz).catch(function () {});
    $('#mt-sair').hidden = false;
    var st = $('#mt-status'), dias = diasTeste();
    st.hidden = false;
    st.innerHTML = (l.status === 'teste' ? '<span class="mt-selo">' + (dias ? dias + (dias === 1 ? ' dia grátis' : ' dias grátis') : 'teste encerrado') + '</span>' : '<span class="mt-selo ok">loja ativa</span>') +
      '<a href="' + esc(linkLoja()) + '" target="_blank" rel="noopener">Ver minha loja</a>';
    desenharPassos(); atualizarPrevia();
  }
  function salvarPainel() {
    S.salvando = true; desenhar();
    var l = S.rz.loja, conta = S.conta;
    var tarefas = [P.salvarMinhaLoja(conta, { nome: l.nome, marcaCurta: l.marcaCurta, marcaSub: l.marcaSub, cidade: l.cidade, instagram: l.instagram, whatsappLoja: l.whatsappLoja, vitrine: S.rz.vitrine })];
    S.rz.itens.forEach(function (i, n) {
      if (i.sujo || i.ordem !== n) { var o = Object.assign({}, i, { ordem: n }); delete o.orig; delete o.avisos; delete o.sujo; tarefas.push(P.salvarItemLoja(conta, o).then(function () { i.sujo = false; i.ordem = n; })); }
    });
    S.removidos.forEach(function (k) { tarefas.push(P.apagarItemLoja(conta, k)); });
    return Promise.all(tarefas).then(function (r) {
      S.removidos = []; S.lojaReal = Object.assign({}, S.lojaReal, r[0]); aviso('Salvo. Sua loja já mostra as mudanças.');
    }).catch(function (e) { aviso('Não deu para salvar: ' + ((e && (e.code || e.message)) || 'tente de novo')); })
      .then(function () { S.salvando = false; desenhar(); mudou(false); });
  }

  /* ---------- ajuste de enquadramento ---------- */
  function abrirAjuste(id) {
    var i = S.rz.itens.filter(function (x) { return x.id === id; })[0];
    if (!i) return;
    if (!i.orig) { aviso('O ajuste fica disponível para fotos enviadas neste aparelho.'); return; }
    var d = document.createElement('div');
    d.className = 'mt-modal'; d.setAttribute('role', 'dialog'); d.setAttribute('aria-modal', 'true'); d.setAttribute('aria-label', 'Ajustar enquadramento');
    d.innerHTML = '<div class="mt-modal-caixa"><b>Toque no centro da peça</b><p class="mt-sub">A foto é recortada em volta do ponto que você tocar.</p><img src="' + esc(i.orig) + '" alt="Foto original" id="mt-orig"><div class="mt-linha"><button class="pv-btn pv-btn-linha pv-mini" type="button" data-fechar>Fechar</button></div></div>';
    document.body.appendChild(d);
    var fechar = function () { d.remove(); };
    d.addEventListener('click', function (e) { if (e.target === d || e.target.hasAttribute('data-fechar')) fechar(); });
    d.addEventListener('keydown', function (e) { if (e.key === 'Escape') fechar(); });
    $('[data-fechar]', d).focus();
    $('#mt-orig', d).addEventListener('click', function (e) {
      var r = e.target.getBoundingClientRect();
      F.reenquadrar(i.orig, { x: (e.clientX - r.left) / r.width, y: (e.clientY - r.top) / r.height }).then(function (img) {
        i.img = img; i.sujo = true; fechar(); mudou(); desenhar(); aviso('Enquadramento ajustado');
      });
    });
  }

  /* ---------- eventos ---------- */
  document.addEventListener('input', function (e) {
    var f = e.target.closest('[data-form="loja"]');
    if (f && e.target.name) { S.rz.loja[e.target.name] = e.target.value; mudou(); return; }
    var c = e.target.closest('.mt-peca');
    if (c && e.target.dataset.campo && e.target.tagName === 'INPUT') {
      var i = S.rz.itens.filter(function (x) { return x.id === c.dataset.id; })[0];
      i[e.target.dataset.campo] = e.target.dataset.campo === 'preco' ? Number(e.target.value) || '' : e.target.value; i.sujo = true; mudou();
    }
  });
  document.addEventListener('change', function (e) {
    var c = e.target.closest('.mt-peca');
    if (!c || e.target.tagName !== 'SELECT') return;
    var i = S.rz.itens.filter(function (x) { return x.id === c.dataset.id; })[0], k = e.target.dataset.campo;
    if (k === 'cor') { i.cor = e.target.value; i.hex = (F.CORES.filter(function (x) { return x[0] === i.cor; })[0] || [])[1] || i.hex; }
    if (k === 'cat') { i.cat = e.target.value; if (i.cat === 'acessorios') i.tamanhos = ['U']; else if (i.tamanhos.indexOf('U') >= 0) i.tamanhos = CAT.TAMANHOS.slice(); }
    i.sujo = true; mudou(); desenhar();
  });
  document.addEventListener('click', function (e) {
    var b = e.target.closest('button, [data-acao]');
    if (!b) return;
    if (b.dataset.passo) return ir(Number(b.dataset.passo));
    if (b.dataset.vitrine) { S.rz.vitrine = b.dataset.vitrine; mudou(); desenhar(); atualizarPrevia(); return; }
    if (b.dataset.cat) { S.catAtiva = b.dataset.cat; desenhar(); return; }
    if (b.dataset.pag) { S.pagPrevia = b.dataset.pag; Array.prototype.forEach.call(document.querySelectorAll('[data-pag]'), function (x) { x.setAttribute('aria-pressed', String(x === b)); }); atualizarPrevia(); return; }
    if (b.dataset.tam) {
      var card = b.closest('.mt-peca'), it = S.rz.itens.filter(function (x) { return x.id === card.dataset.id; })[0], t = b.dataset.tam, tem = it.tamanhos.indexOf(t);
      if (tem >= 0) it.tamanhos.splice(tem, 1); else it.tamanhos.push(t);
      b.setAttribute('aria-pressed', String(tem < 0)); it.sujo = true; mudou(); return;
    }
    var a = b.dataset.acao;
    if (a === 'continuar') {
      if (S.passo === 0 && !S.rz.loja.nome) { aviso('Escreva o nome da loja para continuar.'); var n = $('[name="nome"]'); if (n) n.focus(); return; }
      return ir(S.passo + 1);
    }
    if (a === 'voltar') return ir(S.passo - 1);
    if (a === 'remover') { S.rz.itens = S.rz.itens.filter(function (x) { if (x.id === b.dataset.id && S.painel) S.removidos.push(x.id); return x.id !== b.dataset.id; }); mudou(); desenhar(); return; }
    if (a === 'ajustar') return abrirAjuste(b.dataset.id);
    if (a === 'preco-lote') {
      var v = Number(($('#mt-preco-lote') || {}).value);
      if (!(v > 0)) { aviso('Digite o preço.'); return; }
      S.rz.itens.forEach(function (x) { if (x.cat === S.catAtiva) { x.preco = v; x.sujo = true; } }); mudou(); desenhar(); aviso('Preço aplicado'); return;
    }
    if (a === 'google') { P.entrarGoogleLojista().then(function (c) { return P.minhaLoja(c).then(function (r) { if (r) { S.conta = c; entrarNoPainel(r); aviso('Você já tem uma loja: abrimos o seu painel.'); return ir(2); } return publicar(c); }); }).catch(erroConta); return; }
    if (a === 'ja-tenho') { var f = $('[data-form="conta"]'); f.dataset.entrar = '1'; $('button[type="submit"]', f).textContent = 'Entrar e publicar'; $('[name="senha"]', f).setAttribute('autocomplete', 'current-password'); return; }
    if (a === 'google-entrar') { P.entrarGoogleLojista().then(aposEntrar).catch(erroConta); return; }
    if (a === 'montar-nova') { S.entrando = false; return ir(0); }
    if (a === 'publicar') return publicar(S.conta);
    if (a === 'salvar') return salvarPainel();
    if (a === 'copiar-link') { (navigator.clipboard ? navigator.clipboard.writeText(linkLoja()) : Promise.reject()).then(function () { aviso('Link copiado'); }).catch(function () { window.prompt('Copie o link:', linkLoja()); }); }
  });
  document.addEventListener('submit', function (e) {
    var f = e.target; e.preventDefault();
    if (f.dataset.form === 'conta') {
      var email = f.email.value.trim(), senha = f.senha.value;
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || senha.length < 6) { $('#mt-erro').textContent = 'Informe um e-mail válido e uma senha de 6 ou mais caracteres.'; return; }
      (f.dataset.entrar ? P.entrarLojista(email, senha) : P.criarContaLojista(email, senha))
        .then(function (c) { return P.minhaLoja(c).then(function (r) { if (r) { S.conta = c; entrarNoPainel(r); aviso('Você já tem uma loja: abrimos o seu painel.'); return ir(2); } return publicar(c); }); })
        .catch(erroConta);
    }
    if (f.dataset.form === 'entrar') {
      if (!f.email.value.trim() || !f.senha.value) { $('#mt-erro').textContent = 'Informe e-mail e senha.'; return; }
      P.entrarLojista(f.email.value.trim(), f.senha.value).then(aposEntrar).catch(erroConta);
      return;
    }
    if (f.dataset.form === 'dominio') {
      var dom = f.dominioPedido.value.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '');
      if (dom && !P.hostValido(dom)) { aviso('Confira o domínio. Ex.: sualoja.com.br'); return; }
      P.salvarMinhaLoja(S.conta, { dominioPedido: dom }).then(function () { S.lojaReal.dominioPedido = dom; aviso('Pedido de domínio enviado'); }).catch(function () { aviso('Não deu para salvar agora.'); });
    }
  });
  $('#mt-sair').addEventListener('click', function () { P.sairLojista().then(function () { window.Rascunho.apagar().catch(function () {}); location.href = './'; }); });
  $('#mt-entrar').addEventListener('click', function () { S.entrando = true; desenhar(); var h = $('#mt-corpo h1'); if (h) { h.setAttribute('tabindex', '-1'); h.focus(); } });
  $('#mt-ver-previa').addEventListener('click', function () { document.body.classList.add('previa-aberta'); });
  $('#mt-fechar-previa').addEventListener('click', function () { document.body.classList.remove('previa-aberta'); });

  /* ---------- início ---------- */
  function iniciar() {
    var q = new URLSearchParams(location.search);
    Promise.all([window.Rascunho.ler(), P.catalogo('../'), P.contaLojista().catch(function () { return null; })]).then(function (r) {
      S.rz = r[0] && r[0].loja ? r[0] : novoRascunho();
      S.vitrines = r[1] || [];
      if (q.get('vitrine') && S.vitrines.some(function (v) { return v.slug === q.get('vitrine') && v.publica; })) S.rz.vitrine = q.get('vitrine');
      if (['vitrine', 'loja', 'completo'].indexOf(q.get('plano')) >= 0) S.rz.loja.plano = q.get('plano');
      S.conta = r[2];
      if (q.get('entrar') === '1' && !S.conta) S.entrando = true;
      var depois = function () { desenharPassos(); desenhar(); atualizarPrevia(); };
      if (!S.conta) return depois();
      return P.minhaLoja(S.conta).then(function (m) { if (m) entrarNoPainel(m); depois(); }).catch(depois);
    });
  }
  iniciar();
})();
