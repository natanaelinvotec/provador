/*
 * vendedores.js — regras do programa de vendedores (afiliados por convite) do Provador.
 *
 * Como funciona:
 *  1. O dono da plataforma cadastra o vendedor no painel master (nome, e-mail do Google, WhatsApp) e manda o convite.
 *  2. O vendedor entra em /vendedor/ com aquele e-mail e recebe o link dele: .../provador/?vendedor=CODIGO
 *  3. Quem abre o link e monta a loja fica marcado como indicação do vendedor ("cadastro", nos 15 dias grátis).
 *  4. Quando a loja paga a primeira mensalidade, a indicação é confirmada com o valor fixo por loja do momento.
 *  5. O dono paga o vendedor por fora e marca a comissão como paga.
 *
 * Funções puras (sem Firebase, sem DOM), usadas no navegador (window.Vendedores) e nos testes (require).
 */
(function (raiz, fabrica) {
  if (typeof module === 'object' && module.exports) module.exports = fabrica();
  else raiz.Vendedores = fabrica();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var PARAM = 'vendedor';           // ?vendedor=CODIGO no link
  var CHAVE = 'provador:vendedor';  // localStorage: { codigo, em }
  var DIAS_VALIDADE = 60;           // o link vale por 60 dias depois do clique; o último link aberto vale
  var VALOR_PADRAO = 50;            // R$ por loja que assinar (o dono muda no painel master)
  var LETRAS = 'abcdefghjkmnpqrstuvwxyz23456789'; // sem 0/o, 1/l/i para ninguém digitar errado

  var STATUS = {
    cadastro: { nome: 'Nos 15 dias grátis', curto: 'Dias grátis' },
    confirmada: { nome: 'Assinou: comissão a pagar', curto: 'A pagar' },
    paga: { nome: 'Comissão paga', curto: 'Paga' },
    cancelada: { nome: 'Não assinou', curto: 'Não assinou' }
  };

  function semAcento(s) { return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, ''); }
  function texto(v, max) { return String(v == null ? '' : v).trim().replace(/\s+/g, ' ').slice(0, max || 80); }

  function normalizarCodigo(c) {
    var s = String(c || '').trim().toLowerCase();
    return /^[a-z0-9]([a-z0-9-]{1,28}[a-z0-9])$/.test(s) ? s : '';
  }
  function nomeCurto(nome) {
    var p = texto(nome, 80).split(' ')[0] || '';
    return p ? (p.charAt(0).toUpperCase() + p.slice(1)).slice(0, 40) : '';
  }
  /** "Ana Paula Souza" → "ana-k3x" (primeiro nome + 3 letras), sem repetir os que já existem. */
  function codigoNovo(nome, existentes, aleatorio) {
    var rnd = aleatorio || Math.random, usados = existentes || {};
    var base = semAcento(nomeCurto(nome)).toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 12) || 'vendedor';
    for (var tent = 0; tent < 200; tent++) {
      var suf = '';
      for (var i = 0; i < 3; i++) suf += LETRAS.charAt(Math.floor(rnd() * LETRAS.length) % LETRAS.length);
      var c = base + '-' + suf;
      if (!Object.prototype.hasOwnProperty.call(usados, c)) return c;
    }
    throw new Error('Não foi possível gerar um código livre.');
  }

  function soDigitos(v) { return String(v || '').replace(/\D/g, ''); }
  function emailOk(e) { return /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(e); }

  /** Dados do formulário do painel master → vendedor pronto para gravar (ou a lista de campos com erro). */
  function validarVendedor(d) {
    var v = {
      nome: texto(d.nome, 80),
      email: texto(d.email, 120).toLowerCase(),
      whatsapp: soDigitos(d.whatsapp).slice(0, 13)
    };
    v.nomeCurto = nomeCurto(v.nome);
    var erros = [];
    if (v.nome.length < 2) erros.push('nome');
    if (!emailOk(v.email)) erros.push('email');
    if (v.whatsapp.length < 10) erros.push('whatsapp');
    return { vendedor: v, erros: erros };
  }

  /* ---------- o link guardado no navegador de quem vai montar a loja ---------- */
  function registro(codigo, agora) {
    var c = normalizarCodigo(codigo);
    return c ? { codigo: c, em: (agora || new Date()).getTime() } : null;
  }
  function codigoValido(reg, agora) {
    if (!reg || typeof reg !== 'object') return '';
    var c = normalizarCodigo(reg.codigo), em = Number(reg.em) || 0, t = (agora || new Date()).getTime();
    if (!c || !em || em > t + 864e5) return '';
    return t - em <= DIAS_VALIDADE * 864e5 ? c : '';
  }
  function codigoDaUrl(busca) {
    try { return normalizarCodigo(new URLSearchParams(busca || '').get(PARAM)); } catch (e) { return ''; }
  }

  /* ---------- links e mensagens ---------- */
  function linkIndicacao(base, codigo) { return String(base).replace(/\/?$/, '/') + '?' + PARAM + '=' + encodeURIComponent(codigo); }
  function linkConvite(base, codigo) { return String(base).replace(/\/?$/, '/') + 'vendedor/?c=' + encodeURIComponent(codigo); }
  function mensagemConvite(v, base, valor) {
    return 'Oi, ' + (v.nomeCurto || nomeCurto(v.nome)) + '! Você foi convidado(a) para vender o Provador, a loja virtual pronta para quem vende roupa.\n\n' +
      'Para cada loja que assinar pelo seu link, você ganha ' + brl(valor) + '.\n\n' +
      'Entre com a conta Google do e-mail ' + v.email + ' para pegar o seu link:\n' + linkConvite(base, v.codigo);
  }
  function mensagemDivulgacao(nome, link) {
    return 'Oi! Conhece o Provador? É a loja virtual pronta para quem vende roupa: você escolhe um dos 15 modelos, sobe as fotos pelo celular ' +
      'e o painel cuida de pedidos, estoque com etiqueta, caixa e clientes. São 15 dias grátis, sem cartão.\n\n' +
      'Monte a sua pelo meu link: ' + link + (nome ? '\n\n' + nome : '');
  }

  /* ---------- ciclo da indicação ---------- */
  function confirmar(ind, valor, agoraIso) {
    if (!ind || ind.status !== 'cadastro') return null;
    var v = Number(valor); if (!(v >= 0)) v = VALOR_PADRAO;
    return Object.assign({}, ind, { status: 'confirmada', valor: Math.round(v * 100) / 100, confirmadaEm: agoraIso || new Date().toISOString() });
  }
  function pagar(ind, agoraIso) {
    if (!ind || ind.status !== 'confirmada') return null;
    return Object.assign({}, ind, { status: 'paga', pagaEm: agoraIso || new Date().toISOString() });
  }
  function cancelar(ind) {
    if (!ind || ind.status !== 'cadastro') return null;
    return Object.assign({}, ind, { status: 'cancelada' });
  }
  /** Números de um vendedor (ou de todos): quantas lojas, quantas assinaram, quanto falta pagar. */
  function resumo(indicacoes) {
    var r = { total: 0, emTeste: 0, confirmadas: 0, pagas: 0, canceladas: 0, aPagar: 0, pago: 0 };
    (indicacoes || []).forEach(function (i) {
      r.total++;
      if (i.status === 'cadastro') r.emTeste++;
      else if (i.status === 'confirmada') { r.confirmadas++; r.aPagar += Number(i.valor) || 0; }
      else if (i.status === 'paga') { r.pagas++; r.pago += Number(i.valor) || 0; }
      else if (i.status === 'cancelada') r.canceladas++;
    });
    r.aPagar = Math.round(r.aPagar * 100) / 100; r.pago = Math.round(r.pago * 100) / 100;
    return r;
  }
  function lerValor(regras) { var v = regras && Number(regras.valorPorLoja); return v >= 0 && v <= 10000 ? v : VALOR_PADRAO; }
  function brl(v) { return 'R$ ' + Number(v || 0).toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.'); }

  return {
    PARAM: PARAM, CHAVE: CHAVE, DIAS_VALIDADE: DIAS_VALIDADE, VALOR_PADRAO: VALOR_PADRAO, STATUS: STATUS,
    normalizarCodigo: normalizarCodigo, nomeCurto: nomeCurto, codigoNovo: codigoNovo, validarVendedor: validarVendedor,
    registro: registro, codigoValido: codigoValido, codigoDaUrl: codigoDaUrl,
    linkIndicacao: linkIndicacao, linkConvite: linkConvite, mensagemConvite: mensagemConvite, mensagemDivulgacao: mensagemDivulgacao,
    confirmar: confirmar, pagar: pagar, cancelar: cancelar, resumo: resumo, lerValor: lerValor, brl: brl
  };
});
