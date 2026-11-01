/*
 * plataforma.js — camada de dados da plataforma (site de vendas, painel master e lojas).
 *
 * Dois modos, mesma interface (tudo devolve Promise):
 *  - demonstração: sem config do Firebase; dados em localStorage, com exemplos marcados.
 *  - firebase: Auth + Firestore (SDK modular v10 via gstatic). O resumo financeiro é
 *    calculado no servidor (functions/) e o painel só lê.
 *
 * Coleções no Firestore:
 *   usuarios/{uid}            papeis: ['plataforma']           (dono da plataforma)
 *   lojas/{id}                cadastro completo + cobranca       (plataforma; a dona lê a dela e muda só CAMPOS_LOJISTA)
 *   lojasPublicas/{slug}      vitrine, marca, status, dominio, lojaId, trialAte(Ts)  (leitura pública: a loja abre por aqui)
 *   catalogos/{lojaId}/itens/{id}  peças da loja, foto comprimida em data URL (leitura pública; escreve a dona ou a plataforma)
 *   dominios/{host}           { slug }                           (leitura pública)
 *   leads/{id}                pedidos de loja do site de vendas  (qualquer um cria; só plataforma lê)
 *   contasPagar/{id}, financeiroPlataforma/{precos|resumo|historico}, comandos/{id}, auditoria/{id}
 *   site/planos               tabela de preços do site de vendas (leitura pública)
 */
(function () {
  'use strict';
  var CFG = window.PROVADOR_CONFIG || {};
  var C = window.Calc;
  var KEY = 'provador:demo:v1';
  var SESSAO = 'provador:sessao';
  var FB_VER = '10.12.2';
  // sem Firebase, ou com a apiKey ainda por colar, roda em modo demonstração
  var modo = CFG.firebase && CFG.firebase.apiKey && !/^COLE/.test(CFG.firebase.apiKey) ? 'firebase' : 'demo';

  /* ---------- utilidades ---------- */
  function slugify(s) {
    return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
      .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40);
  }
  function id() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 8); }
  function texto(v, max) { return String(v == null ? '' : v).trim().slice(0, max || 120); }
  function soDigitos(v) { return String(v || '').replace(/\D/g, '').slice(0, 13); }
  function hostValido(h) { return /^(?=.{3,253}$)([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/.test(h); }

  function ehHostDaPlataforma(host) {
    host = String(host || '').toLowerCase();
    if (!host || host === 'localhost' || /^\d+\.\d+\.\d+\.\d+$/.test(host)) return true;
    return (CFG.hostsDaPlataforma || []).indexOf(host) >= 0 || /\.web\.app$|\.firebaseapp\.com$|\.github\.io$/.test(host);
  }

  /** Dados que viram as marcas @@...@@ da vitrine. */
  function marcaDaLoja(l) {
    var nome = l.nome || 'Sua Marca';
    var curta = l.marcaCurta || nome.split(' ')[0];
    var cidade = l.cidade || '';
    var ini = (curta.replace(/[^A-Za-zÀ-ú]/g, '').slice(0, 2) || 'LJ').toUpperCase();
    return {
      NOME: nome, MARCA: curta, MARCA_SUB: (l.marcaSub || 'MODA FITNESS').toUpperCase(),
      IG: l.instagram || '', CIDADE: cidade, CIDADE_CURTA: cidade.split(',')[0], WHATS: l.whatsappLoja || '', INICIAIS: ini
    };
  }

  /**
   * Regra de cada ação do painel sobre uma loja (igual no modo demo e no Firebase).
   * Devolve { loja, oque } — loja null quando a ação é excluir.
   */
  var ACOES = ['ativar', 'pausar', 'reativar', 'pagamento', 'isentar', 'cobrar', 'implantacaoPaga', 'gerarSite', 'dominioPasso', 'excluir'];
  function aplicarAcao(loja, acao, extra, p, agora) {
    if (ACOES.indexOf(acao) < 0) throw new Error('Ação desconhecida');
    agora = agora || new Date();
    var l = JSON.parse(JSON.stringify(loja)), hoje = C.util.dia(agora), oque;
    if (acao === 'ativar') {
      if (!l.vitrine) throw new Error('Escolha a vitrine antes de ativar.');
      l.status = 'ativa'; l.ativadaEm = l.ativadaEm || hoje; oque = 'Ativou a loja';
    } else if (acao === 'pausar') { l.status = 'pausada'; oque = 'Pausou a loja'; }
    else if (acao === 'reativar') { l.status = 'ativa'; oque = 'Reativou a loja'; }
    else if (acao === 'pagamento') {
      var meses = Math.min(120, Math.max(1, parseInt(extra && extra.meses, 10) || 1));
      var s = C.situacaoCobranca(l, p, agora);
      var base = l.cobranca && l.cobranca.pagoAte ? l.cobranca.pagoAte : (s.desde ? C.util.somarMes(s.desde, -1) : C.util.somarMes(C.util.mes(agora), -1));
      l.cobranca = Object.assign({}, l.cobranca, { pagoAte: C.util.somarMes(base, meses), registradoEm: agora.toISOString() });
      oque = 'Registrou pagamento de ' + meses + (meses === 1 ? ' mês' : ' meses') + ' (pago até ' + l.cobranca.pagoAte + ')';
    } else if (acao === 'isentar') { l.cobranca = Object.assign({}, l.cobranca, { isento: true }); oque = 'Isentou a mensalidade'; }
    else if (acao === 'cobrar') { l.cobranca = Object.assign({}, l.cobranca, { isento: false, pagoAte: C.util.mes(agora) }); oque = 'Voltou a cobrar a mensalidade'; }
    else if (acao === 'implantacaoPaga') { l.implantacao = Object.assign({}, l.implantacao, { pago: true, pagoEm: hoje }); oque = 'Registrou a implantação paga'; }
    else if (acao === 'gerarSite') {
      var v = slugify(extra && extra.vitrine);
      if (!v) throw new Error('Escolha uma vitrine.');
      l.vitrine = v; l.siteGeradoEm = agora.toISOString();
      l.checklist = Object.assign({}, l.checklist, { logo: true });
      oque = 'Gerou o site com a vitrine ' + v;
    } else if (acao === 'dominioPasso') {
      var passo = extra && extra.passo;
      if (['chave', 'hosting'].indexOf(passo) < 0) throw new Error('Passo desconhecido');
      if (!l.dominio) throw new Error('Cadastre o domínio da loja primeiro.');
      var ps = Object.assign({}, l.dominioPassos);
      if (extra.feito) ps[passo] = hoje; else delete ps[passo];
      l.dominioPassos = ps;
      oque = (extra.feito ? 'Marcou' : 'Desmarcou') + ' "' + (passo === 'chave' ? 'liberado na chave' : 'adicionado no Hosting') + '" para ' + l.dominio;
    } else if (acao === 'excluir') { return { loja: null, oque: 'Excluiu a loja definitivamente' }; }
    return { loja: l, oque: oque };
  }

  function validarLead(d) {
    var l = {
      nome: texto(d.nome, 80), loja: texto(d.loja, 80), instagram: texto(d.instagram, 40).replace(/^@/, ''),
      whatsapp: soDigitos(d.whatsapp), vitrine: slugify(d.vitrine), plano: ['vitrine', 'loja', 'completo'].indexOf(d.plano) >= 0 ? d.plano : 'loja',
      mensagem: texto(d.mensagem, 500)
    };
    var erros = [];
    if (l.nome.length < 2) erros.push('nome');
    if (l.loja.length < 2) erros.push('loja');
    if (l.whatsapp.length < 10) erros.push('whatsapp');
    return { lead: l, erros: erros };
  }

  /* ---------- modo demonstração ---------- */
  var demo = {
    ler: function () {
      var d = null;
      try { d = JSON.parse(localStorage.getItem(KEY)); } catch (e) { d = null; }
      if (!d || d.versao !== 1) { d = window.Seed.criar(); demo.gravar(d); }
      return d;
    },
    gravar: function (d) { try { localStorage.setItem(KEY, JSON.stringify(d)); } catch (e) { /* armazenamento cheio ou bloqueado */ } },
    mudar: function (fn) { var d = demo.ler(); var r = fn(d); demo.gravar(d); return r; }
  };
  function lojaPublica(l) {
    if (!l) return null;
    var o = { slug: l.slug, vitrine: l.vitrine, status: l.status, dominio: l.dominio || '', marca: marcaDaLoja(l), lojaId: l.id };
    if (l.status === 'teste') { o.trialAte = l.trialAte || ''; if (l.trialAteTs) o.trialAteTs = l.trialAteTs; }
    return o;
  }
  // campos que a própria lojista pode mudar na loja dela (o resto, como cobrança e status, é da plataforma)
  var CAMPOS_LOJISTA = ['nome', 'marcaCurta', 'marcaSub', 'cidade', 'instagram', 'whatsappLoja', 'vitrine', 'dominioPedido'];
  var CAMPOS_ITEM = ['nome', 'cat', 'cor', 'hex', 'preco', 'tamanhos', 'img', 'img2', 'novo', 'ordem', 'descricao'];
  function limparItem(i) {
    var o = {}; CAMPOS_ITEM.forEach(function (k) { if (i[k] !== undefined && i[k] !== null && i[k] !== '') o[k] = i[k]; });
    o.nome = texto(o.nome, 80) || 'Peça'; o.cor = texto(o.cor, 30); o.descricao = texto(o.descricao, 600);
    if (['conjuntos', 'leggings', 'tops', 'macacoes', 'macaquinhos', 'acessorios'].indexOf(o.cat) < 0) o.cat = 'conjuntos';
    if (o.hex && !/^#[0-9A-Fa-f]{6}$/.test(o.hex)) delete o.hex;
    o.preco = Math.max(0, Math.min(100000, Math.round((Number(o.preco) || 0) * 100) / 100));
    o.tamanhos = (o.tamanhos || []).filter(function (t) { return ['P', 'M', 'G', 'GG', 'U'].indexOf(t) >= 0; });
    o.ordem = Number(o.ordem) || 0; o.novo = !!o.novo;
    return o;
  }
  function dadosLojaNova(rz, uid, email) {
    var l = rz.loja || {}, agora = new Date(), ate = new Date(agora.getTime() + 15 * 864e5);
    return {
      id: uid, nome: texto(l.nome, 80), marcaCurta: texto(l.marcaCurta, 24), marcaSub: texto(l.marcaSub, 30), cidade: texto(l.cidade, 60),
      instagram: texto(l.instagram, 40).replace(/^@/, ''), whatsappLoja: soDigitos(l.whatsappLoja), vitrine: slugify(rz.vitrine) || 'vinho-delicado',
      plano: ['vitrine', 'loja', 'completo'].indexOf(l.plano) >= 0 ? l.plano : 'loja', status: 'teste', origem: 'montador',
      trialAte: C.util.dia(ate), trialAteMs: ate.getTime(), criadaEm: C.util.dia(agora),
      dono: { uid: uid, nome: texto(l.donoNome || l.nome, 80), email: texto(email, 120), celular: soDigitos(l.whatsappLoja) },
      checklist: { logo: true, fotos: !!(rz.itens && rz.itens.length), produtos: !!(rz.itens && rz.itens.length), pagamento: false, dominio: false }
    };
  }
  function auditar(d, oque, colecao, alvo) {
    d.auditoria = d.auditoria || [];
    d.auditoria.unshift({ quando: new Date().toISOString(), quem: 'dono', oque: oque, colecao: colecao, alvo: alvo });
    d.auditoria = d.auditoria.slice(0, 200);
  }

  var API_DEMO = {
    lojaPorSlug: function (slug) {
      var d = demo.ler(), achada = null;
      Object.keys(d.lojas).forEach(function (k) { if (d.lojas[k].slug === slug) achada = d.lojas[k]; });
      return Promise.resolve(lojaPublica(achada));
    },
    lojaPorDominio: function (host) {
      var d = demo.ler(), achada = null;
      host = String(host).replace(/^www\./, '');
      Object.keys(d.lojas).forEach(function (k) { if ((d.lojas[k].dominio || '').replace(/^www\./, '') === host) achada = d.lojas[k]; });
      return Promise.resolve(lojaPublica(achada));
    },
    precosPublicos: function () { return Promise.resolve(C.lerPrecos(demo.ler().precos)); },
    criarLead: function (dados) {
      var v = validarLead(dados);
      if (v.erros.length) return Promise.reject({ campos: v.erros });
      return Promise.resolve(demo.mudar(function (d) {
        var k = id();
        d.leads[k] = Object.assign({ id: k, criadoEm: new Date().toISOString(), status: 'novo' }, v.lead);
        return k;
      }));
    },
    sessao: function () {
      try { return Promise.resolve(JSON.parse(sessionStorage.getItem(SESSAO))); } catch (e) { return Promise.resolve(null); }
    },
    entrar: function (email) {
      var s = { email: texto(email, 120) || 'dono@demo', papeis: ['plataforma'], demo: true };
      try { sessionStorage.setItem(SESSAO, JSON.stringify(s)); } catch (e) { /* sem sessão persistente */ }
      return Promise.resolve(s);
    },
    entrarGoogle: function () { return API_DEMO.entrar('dono@demo'); },
    sair: function () { try { sessionStorage.removeItem(SESSAO); } catch (e) { /* nada */ } return Promise.resolve(); },
    carregarPainel: function () {
      var d = demo.ler();
      var resumo = C.calcularResumo(d);
      var hist = Object.assign({}, d.historico);
      hist[resumo.mes] = C.linhaHistorico(resumo);
      return Promise.resolve({
        exemplo: !!d.exemplo, lojas: d.lojas, contasPagar: d.contasPagar, leads: d.leads, precos: C.lerPrecos(d.precos),
        resumo: resumo, historico: hist, auditoria: d.auditoria || [], config: d.config, vendas: d.vendas
      });
    },
    recalcular: function () { return API_DEMO.carregarPainel(); },
    salvarLoja: function (loja) {
      return Promise.resolve(demo.mudar(function (d) {
        var k = loja.id || id();
        var antes = d.lojas[k];
        var l = Object.assign({}, antes || {}, loja, { id: k });
        l.slug = slugify(l.slug || l.instagram || l.nome) || k;
        Object.keys(d.lojas).forEach(function (o) { if (o !== k && d.lojas[o].slug === l.slug) l.slug = l.slug + '-' + k.slice(-4); });
        l.dominio = String(l.dominio || '').toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '');
        if (l.dominio && !hostValido(l.dominio)) l.dominio = '';
        l.criadaEm = l.criadaEm || C.util.dia(new Date());
        d.lojas[k] = l;
        auditar(d, antes ? 'Editou a loja' : 'Cadastrou a loja', 'lojas', l.nome);
        return l;
      }));
    },
    acaoLoja: function (k, acao, extra) {
      return Promise.resolve(demo.mudar(function (d) {
        var l = d.lojas[k];
        if (!l) throw new Error('Loja não encontrada');
        var r = aplicarAcao(l, acao, extra, C.lerPrecos(d.precos));
        auditar(d, r.oque, 'lojas', l.nome);
        if (!r.loja) { delete d.lojas[k]; delete d.vendas[k]; return null; }
        d.lojas[k] = r.loja;
        return r.loja;
      }));
    },
    salvarConta: function (c) {
      return Promise.resolve(demo.mudar(function (d) {
        var k = c.id || id();
        d.contasPagar[k] = Object.assign({}, d.contasPagar[k] || {}, c, { id: k, atualizadoEm: new Date().toISOString() });
        if (!d.contasPagar[k].criadoEm) d.contasPagar[k].criadoEm = new Date().toISOString();
        auditar(d, (c.id ? 'Editou' : 'Criou') + ' a conta a pagar', 'contasPagar', c.nome);
        return d.contasPagar[k];
      }));
    },
    pagarConta: function (k) {
      return Promise.resolve(demo.mudar(function (d) {
        var c = d.contasPagar[k];
        if (!c) return null;
        c.pagoEm = C.util.dia(new Date());
        if (c.recorrencia !== 'unica') { c.vence = C.proximoVencimento(c); c.ultimoPagamento = c.pagoEm; delete c.pagoEm; }
        auditar(d, 'Marcou como paga', 'contasPagar', c.nome);
        return c;
      }));
    },
    apagarConta: function (k) {
      return Promise.resolve(demo.mudar(function (d) { var c = d.contasPagar[k]; delete d.contasPagar[k]; if (c) auditar(d, 'Apagou a conta', 'contasPagar', c.nome); }));
    },
    salvarPrecos: function (p) {
      var erros = C.validarPrecos(p);
      if (erros.length) return Promise.reject({ campos: erros });
      return Promise.resolve(demo.mudar(function (d) { d.precos = p; auditar(d, 'Mudou planos e preços', 'financeiroPlataforma', 'Plataforma'); return p; }));
    },
    salvarLead: function (lead) {
      return Promise.resolve(demo.mudar(function (d) { d.leads[lead.id] = Object.assign({}, d.leads[lead.id], lead); return d.leads[lead.id]; }));
    },
    apagarLead: function (k) {
      return Promise.resolve(demo.mudar(function (d) { var l = d.leads[k]; delete d.leads[k]; if (l) auditar(d, 'Apagou o pedido de loja', 'leads', l.loja); }));
    },
    salvarConfig: function (cfg) { return Promise.resolve(demo.mudar(function (d) { d.config = Object.assign({}, d.config, cfg); return d.config; })); },
    limparExemplos: function () {
      return Promise.resolve(demo.mudar(function (d) {
        ['lojas', 'contasPagar', 'leads'].forEach(function (col) {
          Object.keys(d[col]).forEach(function (k) { if (d[col][k].exemplo) { delete d[col][k]; if (col === 'lojas') delete d.vendas[k]; } });
        });
        d.iaDia = {}; d.historico = {}; d.auditoria = []; d.exemplo = false;
      }));
    },
    restaurarExemplos: function () { demo.gravar(window.Seed.criar()); return Promise.resolve(); },
    // ----- lojista (montador e "minha loja") -----
    itensDaLoja: function (lojaId) { var d = demo.ler(); return Promise.resolve(((d.catalogos || {})[lojaId] || []).slice()); },
    contaLojista: function () { try { return Promise.resolve(JSON.parse(sessionStorage.getItem('provador:lojista'))); } catch (e) { return Promise.resolve(null); } },
    criarContaLojista: function (email) {
      var c = { uid: 'demo-' + slugify(email).slice(0, 20), email: texto(email, 120) };
      try { sessionStorage.setItem('provador:lojista', JSON.stringify(c)); } catch (e) { /* sem sessão */ }
      return Promise.resolve(c);
    },
    entrarLojista: function (email) { return API_DEMO.criarContaLojista(email); },
    entrarGoogleLojista: function () { return API_DEMO.criarContaLojista('voce@demo.com'); },
    sairLojista: function () { try { sessionStorage.removeItem('provador:lojista'); } catch (e) { /* nada */ } return Promise.resolve(); },
    publicarLojaSozinha: function (rz, conta) {
      return Promise.resolve(demo.mudar(function (d) {
        var l = d.lojas[conta.uid] || dadosLojaNova(rz, conta.uid, conta.email);
        var base = slugify(l.marcaCurta || l.instagram || l.nome) || conta.uid.slice(-6);
        l.slug = l.slug || base;
        Object.keys(d.lojas).forEach(function (k) { if (k !== conta.uid && d.lojas[k].slug === l.slug) l.slug = (base + '-' + conta.uid.slice(-4)).slice(0, 40); });
        d.lojas[conta.uid] = l;
        d.catalogos = d.catalogos || {};
        d.catalogos[conta.uid] = (rz.itens || []).map(function (i, n) { return Object.assign({ id: i.id || id() }, limparItem(Object.assign({}, i, { ordem: n }))); });
        auditar(d, 'Loja criada pelo montador (15 dias grátis)', 'lojas', l.nome);
        return l;
      }));
    },
    minhaLoja: function (conta) { var d = demo.ler(); var l = d.lojas[conta.uid]; return Promise.resolve(l ? { loja: l, itens: ((d.catalogos || {})[conta.uid] || []).slice() } : null); },
    salvarMinhaLoja: function (conta, campos) {
      return Promise.resolve(demo.mudar(function (d) { var l = d.lojas[conta.uid]; CAMPOS_LOJISTA.forEach(function (k) { if (k in campos) l[k] = k === 'instagram' ? texto(campos[k], 40).replace(/^@/, '') : texto(campos[k], 80); }); return l; }));
    },
    salvarItemLoja: function (conta, item) {
      return Promise.resolve(demo.mudar(function (d) {
        var lista = (d.catalogos = d.catalogos || {})[conta.uid] = d.catalogos[conta.uid] || [];
        var k = item.id || id(), o = Object.assign({ id: k }, limparItem(item)), i = lista.findIndex(function (x) { return x.id === k; });
        if (i >= 0) lista[i] = o; else lista.push(o);
        return o;
      }));
    },
    apagarItemLoja: function (conta, k) { return Promise.resolve(demo.mudar(function (d) { d.catalogos[conta.uid] = (d.catalogos[conta.uid] || []).filter(function (x) { return x.id !== k; }); })); }
  };

  /* ---------- modo Firebase ---------- */
  var fb = null;
  function firebase() {
    if (fb) return fb;
    var base = 'https://www.gstatic.com/firebasejs/' + FB_VER + '/';
    fb = Promise.all([import(base + 'firebase-app.js'), import(base + 'firebase-auth.js'), import(base + 'firebase-firestore.js')])
      .then(function (m) {
        var app = m[0].initializeApp(CFG.firebase);
        return { app: app, A: m[1], F: m[2], auth: m[1].getAuth(app), db: m[2].getFirestore(app) };
      });
    return fb;
  }
  function docs(snap) { var o = {}; snap.forEach(function (d) { o[d.id] = Object.assign({ id: d.id }, d.data()); }); return o; }

  var API_FB = {
    lojaPorSlug: function (slug) {
      return firebase().then(function (f) { return f.F.getDoc(f.F.doc(f.db, 'lojasPublicas', slug)); })
        .then(function (s) { return s.exists() ? s.data() : null; });
    },
    lojaPorDominio: function (host) {
      host = String(host).replace(/^www\./, '');
      return firebase().then(function (f) { return f.F.getDoc(f.F.doc(f.db, 'dominios', host)); })
        .then(function (s) { return s.exists() ? API_FB.lojaPorSlug(s.data().slug) : null; });
    },
    precosPublicos: function () {
      return firebase().then(function (f) { return f.F.getDoc(f.F.doc(f.db, 'site', 'planos')); })
        .then(function (s) { return C.lerPrecos(s.exists() ? s.data() : {}); });
    },
    criarLead: function (dados) {
      var v = validarLead(dados);
      if (v.erros.length) return Promise.reject({ campos: v.erros });
      return firebase().then(function (f) {
        return f.F.addDoc(f.F.collection(f.db, 'leads'), Object.assign({}, v.lead, { status: 'novo', criadoEm: f.F.serverTimestamp() }));
      }).then(function (r) { return r.id; });
    },
    sessao: function () {
      return firebase().then(function (f) {
        return new Promise(function (ok) {
          var off = f.A.onAuthStateChanged(f.auth, function (u) {
            off();
            if (!u) return ok(null);
            // papel pelo UID ou pelo e-mail verificado (as regras aceitam os dois)
            var ler = function (k) { return f.F.getDoc(f.F.doc(f.db, 'usuarios', k)).then(function (d) { return d.exists() ? (d.data().papeis || []) : []; }).catch(function () { return []; }); };
            Promise.all([ler(u.uid), u.email && u.emailVerified ? ler(u.email) : Promise.resolve([])]).then(function (r) {
              ok({ email: u.email, uid: u.uid, papeis: r[0].concat(r[1]) });
            });
          });
        });
      });
    },
    entrar: function (email, senha) {
      return firebase().then(function (f) { return f.A.signInWithEmailAndPassword(f.auth, email, senha); }).then(API_FB.sessao);
    },
    entrarGoogle: function () {
      return firebase().then(function (f) { return f.A.signInWithPopup(f.auth, new f.A.GoogleAuthProvider()); }).then(API_FB.sessao);
    },
    sair: function () { return firebase().then(function (f) { return f.A.signOut(f.auth); }); },
    carregarPainel: function () {
      return firebase().then(function (f) {
        var F = f.F, db = f.db;
        return Promise.all([
          F.getDocs(F.collection(db, 'lojas')), F.getDocs(F.collection(db, 'contasPagar')),
          F.getDocs(F.query(F.collection(db, 'leads'), F.orderBy('criadoEm', 'desc'), F.limit(200))),
          F.getDoc(F.doc(db, 'financeiroPlataforma', 'precos')), F.getDoc(F.doc(db, 'financeiroPlataforma', 'resumo')),
          F.getDoc(F.doc(db, 'financeiroPlataforma', 'historico')),
          F.getDocs(F.query(F.collection(db, 'auditoria'), F.where('colecao', 'in', ['lojas', 'leads', 'pedidosIA', 'contasPagar', 'financeiroPlataforma']), F.orderBy('quando', 'desc'), F.limit(50))),
          F.getDocs(F.query(F.collection(db, 'vendasMes'), F.where('mes', '==', C.util.mes(new Date())))),
          F.getDocs(F.query(F.collection(db, 'usoIA'), F.where('mes', '==', C.util.mes(new Date()))))
        ]).then(function (r) {
          var aud = []; r[6].forEach(function (d) { aud.push(d.data()); });
          var leads = docs(r[2]);
          Object.keys(leads).forEach(function (k) { var c = leads[k].criadoEm; if (c && c.toDate) leads[k].criadoEm = c.toDate().toISOString(); });
          var lojas = docs(r[0]), precos = C.lerPrecos(r[3].exists() ? r[3].data() : {});
          var historico = r[5].exists() ? (r[5].data().meses || {}) : {};
          var resumo = r[4].exists() ? r[4].data() : null;
          // sem Cloud Functions (plano gratuito), o resumo é calculado aqui mesmo, com os mesmos dados que o servidor usaria
          if (CFG.funcoes === false || !resumo) {
            var vendas = {}, iaDia = {};
            r[7].forEach(function (d) { var v = d.data(); if (v.lojaId) (vendas[v.lojaId] = vendas[v.lojaId] || {})[v.mes] = v; });
            r[8].forEach(function (d) { var v = d.data(); if (v.dia) iaDia[v.dia] = v.lojas || {}; });
            resumo = C.calcularResumo({ precos: precos, lojas: lojas, vendas: vendas, iaDia: iaDia });
            historico = Object.assign({}, historico);
            historico[resumo.mes] = C.linhaHistorico(resumo);
          }
          return {
            exemplo: false, lojas: lojas, contasPagar: docs(r[1]), leads: leads,
            precos: precos, resumo: resumo, historico: historico, auditoria: aud, config: {}
          };
        });
      });
    },
    recalcular: function () {
      if (CFG.funcoes === false) return API_FB.carregarPainel();
      return firebase().then(function (f) {
        var F = f.F;
        return F.addDoc(F.collection(f.db, 'comandos'), { tipo: 'resumoPlataforma', porUid: f.auth.currentUser.uid, status: 'pendente', criadoEm: F.serverTimestamp() })
          .then(function (ref) {
            return new Promise(function (ok, erro) {
              var off = F.onSnapshot(ref, function (s) {
                var st = s.exists() && s.data().status;
                if (st === 'ok') { off(); ok(API_FB.carregarPainel()); }
                else if (st === 'erro' || st === 'negado') { off(); erro(new Error('O servidor não conseguiu calcular (' + st + ').')); }
              });
              setTimeout(function () { off(); erro(new Error('O cálculo demorou demais. Tente de novo em instantes.')); }, 60000);
            });
          });
      });
    },
    salvarLoja: function (loja, oque) {
      return firebase().then(function (f) {
        var F = f.F, db = f.db, k = loja.id || F.doc(F.collection(db, 'lojas')).id;
        return F.getDoc(F.doc(db, 'lojas', k)).then(function (snap) {
          var antes = snap.exists() ? snap.data() : null;
          var l = Object.assign({}, antes || {}, loja, { id: k });
          l.slug = slugify(l.slug || l.instagram || l.nome) || k;
          l.dominio = String(l.dominio || '').toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '');
          if (l.dominio && !hostValido(l.dominio)) l.dominio = '';
          l.criadaEm = l.criadaEm || C.util.dia(new Date());
          // slug e domínio não podem pertencer a outra loja
          return Promise.all([
            F.getDocs(F.query(F.collection(db, 'lojas'), F.where('slug', '==', l.slug), F.limit(2))),
            l.dominio ? F.getDocs(F.query(F.collection(db, 'lojas'), F.where('dominio', '==', l.dominio), F.limit(2))) : null
          ]).then(function (r) {
            var outra = function (q) { var x = false; if (q) q.forEach(function (d) { if (d.id !== k) x = true; }); return x; };
            if (outra(r[0])) l.slug = (l.slug + '-' + k.slice(-4)).slice(0, 40);
            if (outra(r[1])) return Promise.reject(new Error('Este domínio já está em outra loja.'));
            var lote = F.writeBatch(db);
            lote.set(F.doc(db, 'lojas', k), l);
            lote.set(F.doc(db, 'lojasPublicas', l.slug), lojaPublica(l));
            if (l.dominio) lote.set(F.doc(db, 'dominios', l.dominio.replace(/^www\./, '')), { slug: l.slug });
            // ponteiros públicos antigos saem junto, senão o endereço velho continua abrindo a loja
            if (antes && antes.slug && antes.slug !== l.slug) lote.delete(F.doc(db, 'lojasPublicas', antes.slug));
            if (antes && antes.dominio && antes.dominio.replace(/^www\./, '') !== l.dominio.replace(/^www\./, '')) lote.delete(F.doc(db, 'dominios', antes.dominio.replace(/^www\./, '')));
            lote.set(F.doc(F.collection(db, 'auditoria')), { quando: new Date().toISOString(), quem: f.auth.currentUser.email, oque: oque || (antes ? 'Editou a loja' : 'Cadastrou a loja'), colecao: 'lojas', alvo: l.nome });
            return lote.commit().then(function () { return l; });
          });
        });
      });
    },
    acaoLoja: function (k, acao, extra) {
      return firebase().then(function (f) {
        var F = f.F, db = f.db;
        return Promise.all([F.getDoc(F.doc(db, 'lojas', k)), F.getDoc(F.doc(db, 'financeiroPlataforma', 'precos'))]).then(function (r) {
          if (!r[0].exists()) throw new Error('Loja não encontrada');
          var atual = Object.assign({ id: k }, r[0].data());
          var res = aplicarAcao(atual, acao, extra, C.lerPrecos(r[1].exists() ? r[1].data() : {}));
          if (res.loja) return API_FB.salvarLoja(res.loja, res.oque);
          // excluir: some a loja e todos os endereços públicos dela
          var lote = F.writeBatch(db);
          lote.delete(F.doc(db, 'lojas', k));
          if (atual.slug) lote.delete(F.doc(db, 'lojasPublicas', atual.slug));
          if (atual.dominio) lote.delete(F.doc(db, 'dominios', atual.dominio.replace(/^www\./, '')));
          lote.set(F.doc(F.collection(db, 'auditoria')), { quando: new Date().toISOString(), quem: f.auth.currentUser.email, oque: res.oque, colecao: 'lojas', alvo: atual.nome || k });
          return lote.commit().then(function () { return null; });
        });
      });
    },
    salvarConta: function (c) {
      return firebase().then(function (f) {
        var F = f.F, k = c.id || F.doc(F.collection(f.db, 'contasPagar')).id;
        var dados = { nome: c.nome, detalhe: c.detalhe || '', valor: c.valor, vence: c.vence, diaFixo: c.diaFixo, recorrencia: c.recorrencia, categoria: c.categoria, pagoEm: c.pagoEm || null, ultimoPagamento: c.ultimoPagamento || null, atualizadoEm: new Date().toISOString(), porUid: f.auth.currentUser.uid };
        if (!c.id) dados.criadoEm = new Date().toISOString();
        return F.setDoc(F.doc(f.db, 'contasPagar', k), dados, { merge: true }).then(function () { return Object.assign({ id: k }, c, dados); });
      });
    },
    pagarConta: function (k) {
      return firebase().then(function (f) { return f.F.getDoc(f.F.doc(f.db, 'contasPagar', k)); }).then(function (s) {
        var c = Object.assign({ id: k }, s.data());
        var hoje = C.util.dia(new Date());
        if (c.recorrencia === 'unica') c.pagoEm = hoje; else { c.vence = C.proximoVencimento(c); c.ultimoPagamento = hoje; }
        return API_FB.salvarConta(c);
      });
    },
    apagarConta: function (k) { return firebase().then(function (f) { return f.F.deleteDoc(f.F.doc(f.db, 'contasPagar', k)); }); },
    salvarPrecos: function (p) {
      var erros = C.validarPrecos(p);
      if (erros.length) return Promise.reject({ campos: erros });
      return firebase().then(function (f) {
        var F = f.F, lote = F.writeBatch(f.db);
        lote.set(F.doc(f.db, 'financeiroPlataforma', 'precos'), Object.assign({}, p, { atualizadoEm: new Date().toISOString(), porUid: f.auth.currentUser.uid }));
        lote.set(F.doc(f.db, 'site', 'planos'), { planos: p.planos, splitPct: p.splitPct, splitFixo: p.splitFixo, dominioAno: p.dominioAno });
        return lote.commit().then(function () { return p; });
      });
    },
    salvarLead: function (lead) {
      return firebase().then(function (f) { return f.F.updateDoc(f.F.doc(f.db, 'leads', lead.id), { status: lead.status, nota: lead.nota || '' }); }).then(function () { return lead; });
    },
    apagarLead: function (k) {
      return firebase().then(function (f) {
        var F = f.F, lote = F.writeBatch(f.db);
        lote.delete(F.doc(f.db, 'leads', k));
        lote.set(F.doc(F.collection(f.db, 'auditoria')), { quando: new Date().toISOString(), quem: f.auth.currentUser.email, oque: 'Apagou o pedido de loja', colecao: 'leads', alvo: k });
        return lote.commit();
      });
    },
    salvarConfig: function (cfg) { return Promise.resolve(cfg); },
    limparExemplos: function () { return Promise.resolve(); },
    restaurarExemplos: function () { return Promise.resolve(); },
    // ----- lojista (montador e "minha loja") -----
    itensDaLoja: function (lojaId) {
      return firebase().then(function (f) { return f.F.getDocs(f.F.collection(f.db, 'catalogos', lojaId, 'itens')); })
        .then(function (q) { var a = []; q.forEach(function (d) { a.push(Object.assign({ id: d.id }, d.data())); }); return a; });
    },
    contaLojista: function () {
      return firebase().then(function (f) {
        return new Promise(function (ok) { var off = f.A.onAuthStateChanged(f.auth, function (u) { off(); ok(u ? { uid: u.uid, email: u.email } : null); }); });
      });
    },
    criarContaLojista: function (email, senha) {
      return firebase().then(function (f) { return f.A.createUserWithEmailAndPassword(f.auth, email, senha); }).then(function (c) { return { uid: c.user.uid, email: c.user.email }; });
    },
    entrarLojista: function (email, senha) {
      return firebase().then(function (f) { return f.A.signInWithEmailAndPassword(f.auth, email, senha); }).then(function (c) { return { uid: c.user.uid, email: c.user.email }; });
    },
    entrarGoogleLojista: function () {
      return firebase().then(function (f) { return f.A.signInWithPopup(f.auth, new f.A.GoogleAuthProvider()); }).then(function (c) { return { uid: c.user.uid, email: c.user.email }; });
    },
    sairLojista: function () { return firebase().then(function (f) { return f.A.signOut(f.auth); }); },
    publicarLojaSozinha: function (rz, conta) {
      return firebase().then(function (f) {
        var F = f.F, db = f.db, ref = F.doc(db, 'lojas', conta.uid);
        return F.getDoc(ref).then(function (atual) {
          if (atual.exists()) return Object.assign({ id: conta.uid }, atual.data()); // já publicou antes: só atualiza o catálogo
          var l = dadosLojaNova(rz, conta.uid, conta.email);
          var base = slugify(l.marcaCurta || l.instagram || l.nome) || conta.uid.slice(-6);
          return F.getDoc(F.doc(db, 'lojasPublicas', base)).then(function (s) {
            l.slug = s.exists() ? (base + '-' + conta.uid.slice(-4).toLowerCase()).slice(0, 40) : base;
            l.trialAteTs = F.Timestamp.fromMillis(l.trialAteMs); delete l.trialAteMs;
            var lote = F.writeBatch(db);
            lote.set(ref, l);
            lote.set(F.doc(db, 'lojasPublicas', l.slug), { slug: l.slug, vitrine: l.vitrine, status: 'teste', dominio: '', marca: marcaDaLoja(l), lojaId: conta.uid, trialAte: l.trialAte, trialAteTs: l.trialAteTs });
            return lote.commit().then(function () { return l; });
          });
        }).then(function (l) {
          // fotos em lotes pequenos (cada documento leva uma foto já comprimida)
          var itens = (rz.itens || []).filter(function (i) { return i && i.img; }).map(function (i, n) { return Object.assign({ id: i.id }, limparItem(Object.assign({}, i, { ordem: n }))); });
          var lotes = []; for (var n = 0; n < itens.length; n += 6) lotes.push(itens.slice(n, n + 6));
          return lotes.reduce(function (p, grupo) {
            return p.then(function () {
              var b = F.writeBatch(db);
              grupo.forEach(function (i) { var k = i.id || F.doc(F.collection(db, 'catalogos', conta.uid, 'itens')).id; var o = Object.assign({}, i); delete o.id; b.set(F.doc(db, 'catalogos', conta.uid, 'itens', k), o); });
              return b.commit();
            });
          }, Promise.resolve()).then(function () { return l; });
        });
      });
    },
    minhaLoja: function (conta) {
      return firebase().then(function (f) { return f.F.getDoc(f.F.doc(f.db, 'lojas', conta.uid)); }).then(function (s) {
        if (!s.exists()) return null;
        var l = Object.assign({ id: s.id }, s.data());
        if (l.trialAteTs && l.trialAteTs.toMillis) l.trialAteMs = l.trialAteTs.toMillis();
        return API_FB.itensDaLoja(conta.uid).then(function (itens) { return { loja: l, itens: itens.sort(function (a, b) { return (a.ordem || 0) - (b.ordem || 0); }) }; });
      });
    },
    salvarMinhaLoja: function (conta, campos) {
      return firebase().then(function (f) {
        var F = f.F, db = f.db, o = {};
        CAMPOS_LOJISTA.forEach(function (k) { if (k in campos) o[k] = k === 'instagram' ? texto(campos[k], 40).replace(/^@/, '') : k === 'whatsappLoja' ? soDigitos(campos[k]) : k === 'vitrine' ? slugify(campos[k]) : texto(campos[k], 80); });
        return F.getDoc(F.doc(db, 'lojas', conta.uid)).then(function (s) {
          var l = Object.assign({}, s.data(), o), lote = F.writeBatch(db);
          lote.update(F.doc(db, 'lojas', conta.uid), o);
          lote.update(F.doc(db, 'lojasPublicas', l.slug), { vitrine: l.vitrine, marca: marcaDaLoja(l) });
          return lote.commit().then(function () { return l; });
        });
      });
    },
    salvarItemLoja: function (conta, item) {
      return firebase().then(function (f) {
        var F = f.F, col = F.collection(f.db, 'catalogos', conta.uid, 'itens'), k = item.id || F.doc(col).id, o = limparItem(item);
        return F.setDoc(F.doc(col, k), o).then(function () { return Object.assign({ id: k }, o); });
      });
    },
    apagarItemLoja: function (conta, k) { return firebase().then(function (f) { return f.F.deleteDoc(f.F.doc(f.db, 'catalogos', conta.uid, 'itens', k)); }); }
  };

  var api = modo === 'firebase' ? API_FB : API_DEMO;
  window.Plataforma = Object.assign({
    modo: modo, cfg: CFG, slugify: slugify, ehHostDaPlataforma: ehHostDaPlataforma, marcaDaLoja: marcaDaLoja, hostValido: hostValido,
    aplicarAcao: aplicarAcao,
    catalogo: function (base) {
      return fetch((base || '') + 'vitrines/catalogo.json', { cache: 'no-cache' }).then(function (r) { return r.json(); });
    },
    /** Pré-builds (modelos de site). A vitrine da loja é prefixo do modelo + cor: "arena-pink-pulse"; sem prefixo, modelo 1. */
    modelos: function (base) {
      return fetch((base || '') + 'vitrines/_modelos/modelos.json', { cache: 'no-cache' }).then(function (r) { return r.json(); }).then(function (d) { return d.modelos || []; });
    },
    separarVitrine: function (slug, modelos) {
      slug = String(slug || '');
      var m = (modelos || []).filter(function (x) { return x.prefixo && slug.indexOf(x.prefixo) === 0 && slug.length > x.prefixo.length; })
        .sort(function (a, b) { return b.prefixo.length - a.prefixo.length; })[0];
      var m1 = (modelos || []).filter(function (x) { return !x.prefixo; })[0] || { slug: 'classico', nome: 'Clássico', numero: 1, prefixo: '' };
      return m ? { modelo: m, cor: slug.slice(m.prefixo.length) } : { modelo: m1, cor: slug };
    },
    /** "Arena · Pink Pulse" (modelo 1 mostra só a cor, como sempre foi). */
    nomeVitrine: function (slug, catalogo, modelos) {
      var s = window.Plataforma.separarVitrine(slug, modelos), c = (catalogo || []).filter(function (v) { return v.slug === s.cor; })[0];
      var cor = c ? c.nome : (s.modelo.cores && s.modelo.cores[s.cor] ? s.modelo.cores[s.cor].nome : s.cor);
      return s.modelo.prefixo ? s.modelo.nome + ' · ' + cor : cor;
    }
  }, api);
})();
