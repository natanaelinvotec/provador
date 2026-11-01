/*
 * publico.js — o que a cliente da loja grava ou lê sem conta (window.Publico).
 *
 *   entrarListaVip(lojaId, { nome, whats })                       -> vip/{lojaId}/contatos
 *   avisarReposicao(lojaId, { nome, whats, itemId, peca, tam })   -> avisos/{lojaId}/pedidos
 *   lerAcompanhamento(token)                                      <- acompanhar/{token}
 *
 * Campos iguais aos que o firestore.rules confere (criadoEm = hora do servidor).
 * Em modo demonstração (sem apiKey) nada é gravado: as promessas resolvem com { demo: true }.
 * Erros de validação rejeitam com { campos: ['nome' | 'whats' | ...] }.
 */
(function (root) {
  'use strict';
  var TAMS = ['P', 'M', 'G', 'GG', 'U'];
  var TOKEN = /^[A-Za-z0-9]{20,40}$/;
  var ID = /^[A-Za-z0-9_-]{1,40}$/;

  function plat() { return root.Plataforma || null; }
  function emDemo() { var p = plat(); return !p || p.modo !== 'firebase'; }
  function texto(v, max) { return String(v == null ? '' : v).replace(/\s+/g, ' ').trim().slice(0, max); }

  /** WhatsApp com DDD, só dígitos (sem o 55 do país): 10 ou 11 dígitos. */
  function whats(v) {
    var d = String(v || '').replace(/\D/g, '');
    if (d.length >= 12 && d.indexOf('55') === 0) d = d.slice(2);
    if (d.charAt(0) === '0') d = d.replace(/^0+/, '');
    return d;
  }
  function contato(dados) {
    var c = { nome: texto(dados && dados.nome, 60), whats: whats(dados && dados.whats) }, erros = [];
    if (c.nome.length < 2) erros.push('nome');
    if (!/^[0-9]{10,11}$/.test(c.whats)) erros.push('whats');
    return { c: c, erros: erros };
  }
  function lojaOk(lojaId) { return typeof lojaId === 'string' && ID.test(lojaId); }

  // grava um documento novo na subcoleção pública da loja
  function criar(colecao, lojaId, sub, dados) {
    return plat().fb().then(function (f) {
      var F = f.F;
      return F.addDoc(F.collection(f.db, colecao, lojaId, sub), Object.assign({}, dados, { criadoEm: F.serverTimestamp() }));
    }).then(function (ref) { return { ok: true, id: ref.id }; });
  }

  var Publico = {
    TAMS: TAMS,
    normalizarWhats: whats,

    entrarListaVip: function (lojaId, dados) {
      var v = contato(dados);
      if (v.erros.length) return Promise.reject({ campos: v.erros });
      if (emDemo()) return Promise.resolve({ demo: true });
      if (!lojaOk(lojaId)) return Promise.reject(new Error('Loja sem identificação.'));
      return criar('vip', lojaId, 'contatos', { nome: v.c.nome, whats: v.c.whats });
    },

    avisarReposicao: function (lojaId, dados) {
      var v = contato(dados);
      dados = dados || {};
      var o = { nome: v.c.nome, whats: v.c.whats, itemId: String(dados.itemId || ''), peca: texto(dados.peca, 80), tam: String(dados.tam || ''), avisado: false };
      if (TAMS.indexOf(o.tam) < 0) v.erros.push('tam');
      if (!ID.test(o.itemId) || !o.peca) v.erros.push('peca');
      if (v.erros.length) return Promise.reject({ campos: v.erros });
      if (emDemo()) return Promise.resolve({ demo: true });
      if (!lojaOk(lojaId)) return Promise.reject(new Error('Loja sem identificação.'));
      return criar('avisos', lojaId, 'pedidos', o);
    },

    /** Devolve os dados do pedido, null se o link não existe, ou { demo: true } em demonstração. */
    lerAcompanhamento: function (token) {
      token = String(token || '');
      if (!TOKEN.test(token)) return Promise.resolve(null);
      if (emDemo()) {
        // demonstração: se o painel da loja (modo demo) guardou o pedido neste navegador, mostra ele
        var achado = null;
        try { var d = plat() && plat().demo && plat().demo.ler(); achado = d && d.acompanhar && d.acompanhar[token]; } catch (e) { achado = null; }
        // o painel da loja (shared/gestao.js) guarda a gestão de demonstração em 'provador:gestao:demo:<uid>'
        try {
          for (var n = 0; !achado && n < localStorage.length; n++) {
            var k = localStorage.key(n);
            if (k && k.indexOf('provador:gestao:demo:') === 0) { var g = JSON.parse(localStorage.getItem(k)); achado = g && g.acompanhar && g.acompanhar[token]; }
          }
        } catch (e3) { /* navegador sem armazenamento */ }
        if (!achado && root.Gestao && typeof root.Gestao.acompanhamentoDemo === 'function') {
          try { achado = root.Gestao.acompanhamentoDemo(token); } catch (e2) { achado = null; }
        }
        return Promise.resolve(achado).catch(function () { return null; }).then(function (a) {
          return a && typeof a === 'object' ? Object.assign({ demo: true }, a) : { demo: true };
        });
      }
      return plat().fb().then(function (f) { return f.F.getDoc(f.F.doc(f.db, 'acompanhar', token)); })
        .then(function (s) { return s.exists() ? s.data() : null; });
    }
  };

  root.Publico = Publico;
})(typeof self !== 'undefined' ? self : this);
