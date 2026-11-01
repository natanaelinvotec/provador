/*
 * gestao.js — camada de dados do painel da loja (vendas, caixa, contas, estoque, clientes).
 *
 * Mesma ideia do shared/plataforma.js: dois modos, mesma interface, tudo devolve Promise.
 *  - demonstração: dados em localStorage ('provador:gestao:demo:' + uid); as peças continuam no Plataforma.demo.
 *  - firebase: Firestore pelo Plataforma.fb(), seguindo firestore.rules:
 *      gestao/{lojaId}/vendas|caixa|contas|movimentos/{id}   só a dona (no máximo 24 campos por documento)
 *      vip/{lojaId}/contatos/{id}, avisos/{lojaId}/pedidos/{id}   a cliente cria; a dona lê (e marca "avisado")
 *      acompanhar/{token}                                         a dona grava; a cliente lê pelo token
 *      catalogos/{lojaId}/itens/{id}.estoque|vipAte               estoque por tamanho e lançamento VIP
 *      lojas/{id}.vipCodigo + lojasPublicas/{slug}.vipHash        link da lista VIP
 *
 * Toda gravação devolve as "mudanças" ({ venda, caixa: [], movimentos: [], contas: [], itens: [{ id, estoque }] ... })
 * para a tela juntar ao que já tem, sem reler tudo (o plano gratuito conta leituras).
 */
(function () {
  'use strict';
  var P = window.Plataforma;
  var modo = P && P.modo === 'firebase' ? 'firebase' : 'demo';
  var CHAVE = 'provador:gestao:demo:';

  var TAMS = ['P', 'M', 'G', 'GG', 'U'];
  var CANAIS = ['balcao', 'whatsapp', 'instagram', 'site', 'shopee', 'shein', 'marketplace', 'outro'];
  var FORMAS = ['pix', 'cartao', 'dinheiro', 'outro'];
  var STATUS = ['pago', 'separado', 'enviado', 'entregue', 'cancelado'];
  var NOMES = {
    canal: { balcao: 'Balcão', whatsapp: 'WhatsApp', instagram: 'Instagram', site: 'Site', shopee: 'Shopee', shein: 'Shein', marketplace: 'Outro marketplace', outro: 'Outro' },
    forma: { pix: 'Pix', cartao: 'Cartão', dinheiro: 'Dinheiro', outro: 'Outro' },
    status: { pago: 'Pago', separado: 'Separado', enviado: 'Enviado', entregue: 'Entregue', cancelado: 'Cancelado' },
    motivo: { entrada: 'Entrada', venda: 'Venda', ajuste: 'Ajuste', troca: 'Devolução' }
  };

  /* ---------- utilidades ---------- */
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function dia(d) { d = d || new Date(); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function deDia(s) { var p = String(s).split('-'); return new Date(+p[0], +p[1] - 1, +p[2] || 1); }
  function somarDias(s, n) { var d = deDia(s); d.setDate(d.getDate() + n); return dia(d); }
  function diasEntre(a, b) { return Math.round((deDia(b) - deDia(a)) / 864e5); }
  function mesDe(s) { return String(s).slice(0, 7); }
  function somarMes(m, n) { var d = new Date(+m.slice(0, 4), +m.slice(5, 7) - 1 + n, 1); return d.getFullYear() + '-' + pad(d.getMonth() + 1); }
  // mesmo dia no mês seguinte (31/01 vira 28 ou 29/02)
  function mesSeguinte(s) {
    var p = String(s).split('-'), prox = new Date(+p[0], +p[1], 1);
    var ultimo = new Date(prox.getFullYear(), prox.getMonth() + 1, 0).getDate();
    return prox.getFullYear() + '-' + pad(prox.getMonth() + 1) + '-' + pad(Math.min(+p[2], ultimo));
  }
  function diaValido(s) { return /^\d{4}-\d{2}-\d{2}$/.test(String(s || '')); }
  function centavos(v) { return Math.round((Number(String(v).replace(',', '.')) || 0) * 100) / 100; }
  function inteiro(v, max) { return Math.max(0, Math.min(max || 9999, Math.round(Number(v) || 0))); }
  function texto(v, max) { return String(v == null ? '' : v).trim().slice(0, max || 120); }
  function digitos(v) { return String(v || '').replace(/\D/g, '').slice(0, 13); }
  function idCurto() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 8); }
  function copia(o) { return JSON.parse(JSON.stringify(o)); }
  function lista(o) { return Object.keys(o || {}).map(function (k) { return o[k]; }); }

  /** Código aleatório [A-Za-z0-9] com crypto.getRandomValues (sem viés: descarta bytes acima de 247). */
  function token(n) {
    var A = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789', s = '';
    n = n || 24;
    while (s.length < n) {
      var b = new Uint8Array(n * 2);
      crypto.getRandomValues(b);
      for (var i = 0; i < b.length && s.length < n; i++) if (b[i] < 248) s += A[b[i] % 62];
    }
    return s;
  }
  /** SHA-256 em hexadecimal (crypto.subtle: só em https ou localhost). */
  function sha256(txt) {
    if (!(window.crypto && crypto.subtle)) return Promise.reject(new Error('Abra o painel pelo endereço https da loja para gerar o link VIP.'));
    return crypto.subtle.digest('SHA-256', new TextEncoder().encode(String(txt))).then(function (buf) {
      return Array.prototype.map.call(new Uint8Array(buf), function (x) { return (x < 16 ? '0' : '') + x.toString(16); }).join('');
    });
  }
  /** Link de WhatsApp com a mensagem pronta (sem número: a pessoa escolhe o contato). */
  function wa(numero, msg) {
    var n = digitos(numero);
    if (n && n.length <= 11) n = '55' + n;
    return 'https://wa.me/' + n + (msg ? '?text=' + encodeURIComponent(msg) : '');
  }
  function abs(rel) { try { return new URL(rel, location.href).href; } catch (e) { return rel; } }
  var links = {
    loja: function (loja) { return abs('../vitrine.html?l=' + encodeURIComponent((loja && loja.slug) || '')); },
    vip: function (loja, codigo) { codigo = codigo || (loja && loja.vipCodigo); return codigo ? abs('../vitrine.html?l=' + encodeURIComponent(loja.slug || '') + '&vip=' + encodeURIComponent(codigo)) : ''; },
    acompanhar: function (loja, tok) { return tok ? abs('../vitrine.html?l=' + encodeURIComponent((loja && loja.slug) || '') + '&acompanhar=' + encodeURIComponent(tok)) : ''; }
  };

  /* ---------- etiqueta: SKU e leitura do código ---------- */
  function sku(item) { return item.sku || String(item.id || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(-6) || 'PECA'; }
  function codigo(item, tam) { return sku(item) + '-' + tam; }
  /** "K7Q2ZA-M" -> { item, tam }. Só o SKU -> { item, tam: null }. Nada -> null. */
  function lerCodigo(txt, itens) {
    var t = String(txt || '').trim().toUpperCase().replace(/\s+/g, '');
    if (!t) return null;
    var m = t.match(/^(.+)-(P|M|G|GG|U)$/), achou;
    if (m) {
      achou = (itens || []).filter(function (i) { return sku(i) === m[1]; })[0];
      if (achou) return { item: achou, tam: m[2] };
    }
    achou = (itens || []).filter(function (i) { return sku(i) === t; })[0];
    return achou ? { item: achou, tam: null } : null;
  }
  function estoqueTotal(item) {
    if (!item || !item.estoque) return null;
    var k = Object.keys(item.estoque);
    return k.length ? k.reduce(function (s, t) { return s + (Number(item.estoque[t]) || 0); }, 0) : null;
  }
  function nomeComCor(item) {
    var n = item.nome || 'Peça', c = item.cor || '';
    return c && n.toLowerCase().indexOf(c.toLowerCase()) < 0 ? n + ' · ' + c : n;
  }

  /* ---------- limpeza do que vai para o banco ---------- */
  function limparVenda(v) {
    var itens = (v.itens || []).slice(0, 30).map(function (i) {
      return { id: texto(i.id, 40), nome: texto(i.nome, 80) || 'Peça', tam: TAMS.indexOf(i.tam) >= 0 ? i.tam : 'U', preco: centavos(i.preco), qtd: Math.max(1, inteiro(i.qtd, 999)) };
    }).filter(function (i) { return /^[A-Za-z0-9_-]{1,40}$/.test(i.id); });
    var bruto = centavos(itens.reduce(function (s, i) { return s + i.preco * i.qtd; }, 0));
    var desconto = Math.min(bruto, Math.max(0, centavos(v.desconto)));
    return {
      canal: CANAIS.indexOf(v.canal) >= 0 ? v.canal : 'balcao', forma: FORMAS.indexOf(v.forma) >= 0 ? v.forma : 'pix',
      itens: itens, desconto: desconto, total: centavos(bruto - desconto),
      cliente: { nome: texto(v.cliente && v.cliente.nome, 60), whats: digitos(v.cliente && v.cliente.whats) },
      endereco: texto(v.endereco, 400), obs: texto(v.obs, 300)
    };
  }
  function docAcompanhar(uid, loja, v) {
    return {
      lojaId: uid, slug: texto(loja.slug, 40), loja: texto(loja.nome, 80), numero: texto(v.numero, 12), status: v.status,
      itens: (v.itens || []).slice(0, 30).map(function (i) { return { nome: texto(i.nome, 80), tam: i.tam, qtd: i.qtd }; }),
      atualizadoEm: new Date().toISOString()
    };
  }
  function lancamento(l) {
    return {
      data: diaValido(l.data) ? l.data : dia(), tipo: l.tipo === 'saida' ? 'saida' : 'entrada', valor: centavos(l.valor),
      forma: FORMAS.indexOf(l.forma) >= 0 ? l.forma : 'pix', descricao: texto(l.descricao, 80) || (l.tipo === 'saida' ? 'Saída' : 'Entrada'),
      categoria: texto(l.categoria, 30) || 'outro', criadoEm: new Date().toISOString()
    };
  }
  function limparConta(c) {
    return {
      descricao: texto(c.descricao, 80) || 'Conta', valor: centavos(c.valor), vence: diaValido(c.vence) ? c.vence : dia(),
      paga: !!c.paga, pagaEm: diaValido(c.pagaEm) ? c.pagaEm : '', recorrente: c.recorrente === 'mensal' ? 'mensal' : 'nao'
    };
  }
  function movimento(item, tam, qtd, motivo, vendaId, agora) {
    agora = agora || new Date();
    var m = { data: dia(agora), criadoEm: agora.toISOString(), itemId: item.id, peca: texto(item.nome, 80), tam: tam, qtd: qtd, motivo: motivo };
    if (vendaId) m.vendaId = vendaId;
    return m;
  }
  // soma as quantidades por peça e tamanho: { itemId: { M: -2, G: -1 } }
  function deltas(itensVenda, sinal) {
    var d = {};
    itensVenda.forEach(function (i) { var x = d[i.id] = d[i.id] || {}; x[i.tam] = (x[i.tam] || 0) + sinal * i.qtd; });
    return d;
  }
  // só mexe nos tamanhos que já têm número (sem número = estoque não controlado naquele tamanho)
  function aplicarDeltas(estoque, d) {
    var e = Object.assign({}, estoque);
    Object.keys(d).forEach(function (t) { if (t in e) e[t] = Math.max(0, Math.min(9999, (Number(e[t]) || 0) + d[t])); });
    return e;
  }
  function proximoNumero(vendas) {
    var max = 1000;
    vendas.forEach(function (v) { var n = parseInt(v.numero, 10); if (n > max) max = n; });
    return String(max + 1);
  }
  function erroAmigavel(e) {
    var c = (e && e.code) || '';
    if (/permission-denied/.test(c)) return 'Sem permissão no banco. Confira se as regras novas do Firestore já foram publicadas.';
    if (/unavailable|network/.test(c)) return 'Sem internet agora. Tente de novo quando a conexão voltar.';
    if (/failed-precondition/.test(c)) return 'O banco pediu um índice que ainda não existe.';
    return (e && e.message) || 'Algo deu errado. Tente de novo.';
  }
  function rejeitar(msg) { return Promise.reject(new Error(msg)); }

  /* ---------- modo demonstração ---------- */
  function vazio() { return { versao: 1, vendas: {}, caixa: {}, contas: {}, movimentos: {}, vip: {}, avisos: {}, acompanhar: {} }; }
  function lerDemo(uid) {
    var d = null;
    try { d = JSON.parse(localStorage.getItem(CHAVE + uid)); } catch (e) { d = null; }
    return d && d.versao === 1 ? d : vazio();
  }
  function gravarDemo(uid, d) {
    try { localStorage.setItem(CHAVE + uid, JSON.stringify(d)); } catch (e) { throw new Error('O navegador não deixou guardar (armazenamento cheio ou bloqueado).'); }
  }
  function mudarDemo(uid, fn) { var d = lerDemo(uid), r = fn(d); gravarDemo(uid, d); return r; }
  // peças da loja no Plataforma.demo (mesma lista que o montador grava)
  function mudarPecasDemo(uid, fn) {
    return P.demo.mudar(function (d) { d.catalogos = d.catalogos || {}; return fn(d.catalogos[uid] = d.catalogos[uid] || [], d); });
  }
  function ordenar(arr, campo) { return arr.sort(function (a, b) { return String(b[campo] || '').localeCompare(String(a[campo] || '')); }); }

  var DEMO = {
    listar: function (conta, col) {
      var d = lerDemo(conta.uid), campo = { vendas: 'criadaEm', caixa: 'data', contas: 'vence', movimentos: 'criadoEm', vip: 'criadoEm', avisos: 'criadoEm' }[col];
      return Promise.resolve(ordenar(copia(lista(d[col])), campo));
    },
    registrarVenda: function (conta, loja, v) {
      return Promise.resolve().then(function () {
        var agora = new Date(), d = deltas(v.itens, -1), mudouPecas = [];
        mudarPecasDemo(conta.uid, function (pecas) {
          pecas.forEach(function (p) { if (d[p.id] && p.estoque) { p.estoque = aplicarDeltas(p.estoque, d[p.id]); mudouPecas.push({ id: p.id, estoque: copia(p.estoque) }); } });
        });
        return mudarDemo(conta.uid, function (g) {
          var id = idCurto(), venda = Object.assign({ id: id, numero: proximoNumero(lista(g.vendas)) }, v);
          g.vendas[id] = venda;
          var caixa = [];
          if (venda.total > 0) { var cx = Object.assign({ id: idCurto() }, lancamento({ data: venda.data, tipo: 'entrada', valor: venda.total, forma: venda.forma, descricao: 'Venda ' + venda.numero, categoria: 'venda' }), { vendaId: id }); g.caixa[cx.id] = cx; caixa.push(cx); }
          var movs = venda.itens.map(function (i) { var m = Object.assign({ id: idCurto() }, movimento(i, i.tam, -i.qtd, 'venda', id, agora)); g.movimentos[m.id] = m; return m; });
          if (venda.acompanhar) g.acompanhar[venda.acompanhar] = docAcompanhar(conta.uid, loja, venda);
          return { venda: copia(venda), caixa: caixa, movimentos: movs, itens: mudouPecas };
        });
      });
    },
    cancelarVenda: function (conta, loja, venda, motivo) {
      return Promise.resolve().then(function () {
        var d = deltas(venda.itens, +1), mudouPecas = [], agora = new Date();
        mudarPecasDemo(conta.uid, function (pecas) {
          pecas.forEach(function (p) { if (d[p.id] && p.estoque) { p.estoque = aplicarDeltas(p.estoque, d[p.id]); mudouPecas.push({ id: p.id, estoque: copia(p.estoque) }); } });
        });
        return mudarDemo(conta.uid, function (g) {
          var v = g.vendas[venda.id];
          if (!v) throw new Error('Venda não encontrada.');
          v.status = 'cancelado';
          var caixa = [];
          if (v.total > 0) { var cx = Object.assign({ id: idCurto() }, lancamento({ tipo: 'saida', valor: v.total, forma: v.forma, descricao: 'Estorno da venda ' + v.numero, categoria: 'estorno' }), { vendaId: v.id }); g.caixa[cx.id] = cx; caixa.push(cx); }
          var movs = v.itens.map(function (i) { var m = Object.assign({ id: idCurto() }, movimento(i, i.tam, i.qtd, motivo, v.id, agora)); g.movimentos[m.id] = m; return m; });
          if (v.acompanhar) g.acompanhar[v.acompanhar] = docAcompanhar(conta.uid, loja, v);
          return { venda: copia(v), caixa: caixa, movimentos: movs, itens: mudouPecas };
        });
      });
    },
    mudarStatus: function (conta, loja, venda, status, tok) {
      return Promise.resolve(mudarDemo(conta.uid, function (g) {
        var v = g.vendas[venda.id];
        if (!v) throw new Error('Venda não encontrada.');
        v.status = status; v.acompanhar = tok;
        g.acompanhar[tok] = docAcompanhar(conta.uid, loja, v);
        return { venda: copia(v) };
      }));
    },
    salvarVenda: function (conta, venda, campos) {
      return Promise.resolve(mudarDemo(conta.uid, function (g) { var v = g.vendas[venda.id]; if (!v) throw new Error('Venda não encontrada.'); Object.assign(v, campos); return { venda: copia(v) }; }));
    },
    estoque: function (conta, item, fn, motivo) {
      // fn(estoqueAtual) -> { estoque, movs: [[tam, qtd]] }
      return Promise.resolve().then(function () {
        var r = null, agora = new Date();
        mudarPecasDemo(conta.uid, function (pecas) {
          var p = pecas.filter(function (x) { return x.id === item.id; })[0];
          if (!p) throw new Error('Peça não encontrada. Ela foi apagada no montador?');
          r = fn(p.estoque || {}, p);
          if (Object.keys(r.estoque).length) p.estoque = r.estoque; else delete p.estoque;
        });
        var movs = mudarDemo(conta.uid, function (g) {
          return r.movs.map(function (x) { var m = Object.assign({ id: idCurto() }, movimento(item, x[0], x[1], motivo, '', agora)); g.movimentos[m.id] = m; return m; });
        });
        return { itens: [{ id: item.id, estoque: Object.keys(r.estoque).length ? r.estoque : null }], movimentos: movs };
      });
    },
    marcarVip: function (conta, item, vipAte) {
      return Promise.resolve(mudarPecasDemo(conta.uid, function (pecas) {
        var p = pecas.filter(function (x) { return x.id === item.id; })[0];
        if (!p) throw new Error('Peça não encontrada.');
        if (vipAte) p.vipAte = vipAte; else delete p.vipAte;
        return { itens: [{ id: p.id, vipAte: vipAte || '' }] };
      }));
    },
    gravar: function (conta, col, id, doc) {
      return Promise.resolve(mudarDemo(conta.uid, function (g) { id = id || idCurto(); g[col][id] = Object.assign({ id: id }, doc); return copia(g[col][id]); }));
    },
    atualizar: function (conta, col, id, campos) {
      return Promise.resolve(mudarDemo(conta.uid, function (g) { if (!g[col][id]) throw new Error('Não encontrado.'); Object.assign(g[col][id], campos); return copia(g[col][id]); }));
    },
    apagar: function (conta, col, id) { return Promise.resolve(mudarDemo(conta.uid, function (g) { delete g[col][id]; })); },
    pagarConta: function (conta, c, saida, proxima) {
      return Promise.resolve(mudarDemo(conta.uid, function (g) {
        var atual = g.contas[c.id];
        if (!atual) throw new Error('Conta não encontrada.');
        atual.paga = true; atual.pagaEm = saida.data;
        var cx = Object.assign({ id: idCurto() }, saida); g.caixa[cx.id] = cx;
        var r = { contas: [copia(atual)], caixa: [cx] };
        if (proxima) { var n = Object.assign({ id: idCurto() }, proxima); g.contas[n.id] = n; r.contas.push(copia(n)); }
        return r;
      }));
    },
    gravarVip: function (conta, loja, codigo, hash) {
      return Promise.resolve(P.demo.mudar(function (d) { var l = d.lojas[conta.uid]; if (l) { l.vipCodigo = codigo; l.vipHash = hash; } }));
    },
    lerCanais: function (conta) { var d = lerDemo(conta.uid); return Promise.resolve(d.canais ? copia(d.canais) : null); },
    salvarCanais: function (conta, loja, doc) { return Promise.resolve(mudarDemo(conta.uid, function (d) { d.canais = copia(doc); return copia(doc); })); }
  };

  /* ---------- modo Firebase ---------- */
  function semTimestamp(o) {
    Object.keys(o).forEach(function (k) { var v = o[k]; if (v && typeof v.toDate === 'function') o[k] = v.toDate().toISOString(); });
    return o;
  }
  function docsDe(q) { var a = []; q.forEach(function (d) { a.push(semTimestamp(Object.assign({ id: d.id }, d.data()))); }); return a; }
  function col(f, uid, nome) {
    if (nome === 'vip') return f.F.collection(f.db, 'vip', uid, 'contatos');
    if (nome === 'avisos') return f.F.collection(f.db, 'avisos', uid, 'pedidos');
    return f.F.collection(f.db, 'gestao', uid, nome);
  }
  // lê as peças na hora (o estoque pode ter mudado em outro aparelho)
  function lerPecas(f, uid, ids) {
    return Promise.all(ids.map(function (id) { return f.F.getDoc(f.F.doc(f.db, 'catalogos', uid, 'itens', id)); }));
  }

  var FB = {
    listar: function (conta, nome) {
      return P.fb().then(function (f) {
        var F = f.F, c = col(f, conta.uid, nome), q = c;
        if (nome === 'vendas') q = F.query(c, F.orderBy('criadaEm', 'desc'), F.limit(2000));
        else if (nome === 'caixa') q = F.query(c, F.orderBy('data', 'desc'), F.limit(3000));
        else if (nome === 'movimentos') q = F.query(c, F.orderBy('criadoEm', 'desc'), F.limit(300));
        return F.getDocs(q).then(docsDe);
      }).then(function (a) {
        if (nome === 'contas') a.sort(function (x, y) { return String(y.vence).localeCompare(String(x.vence)); });
        if (nome === 'vip' || nome === 'avisos') a.sort(function (x, y) { return String(y.criadoEm || '').localeCompare(String(x.criadoEm || '')); });
        return a;
      });
    },
    registrarVenda: function (conta, loja, v) {
      return P.fb().then(function (f) {
        var F = f.F, db = f.db, uid = conta.uid, d = deltas(v.itens, -1), ids = Object.keys(d);
        return Promise.all([F.getDocs(F.query(col(f, uid, 'vendas'), F.orderBy('criadaEm', 'desc'), F.limit(1))), lerPecas(f, uid, ids)]).then(function (r) {
          var ult = r[0].empty ? [] : [r[0].docs[0].data()];
          var refV = F.doc(col(f, uid, 'vendas')), venda = Object.assign({}, v, { numero: proximoNumero(ult) });
          var lote = F.writeBatch(db), agora = new Date(), caixa = [], movs = [], pecas = [];
          lote.set(refV, venda);
          if (venda.total > 0) {
            var refC = F.doc(col(f, uid, 'caixa')), cx = Object.assign(lancamento({ data: venda.data, tipo: 'entrada', valor: venda.total, forma: venda.forma, descricao: 'Venda ' + venda.numero, categoria: 'venda' }), { vendaId: refV.id });
            lote.set(refC, cx); caixa.push(Object.assign({ id: refC.id }, cx));
          }
          venda.itens.forEach(function (i) {
            var refM = F.doc(col(f, uid, 'movimentos')), m = movimento(i, i.tam, -i.qtd, 'venda', refV.id, agora);
            lote.set(refM, m); movs.push(Object.assign({ id: refM.id }, m));
          });
          r[1].forEach(function (s) {
            if (!s.exists() || !s.data().estoque) return;
            var e = aplicarDeltas(s.data().estoque, d[s.id]);
            lote.update(s.ref, { estoque: e }); pecas.push({ id: s.id, estoque: e });
          });
          if (venda.acompanhar) lote.set(F.doc(db, 'acompanhar', venda.acompanhar), docAcompanhar(uid, loja, venda));
          return lote.commit().then(function () { return { venda: Object.assign({ id: refV.id }, venda), caixa: caixa, movimentos: movs, itens: pecas }; });
        });
      });
    },
    cancelarVenda: function (conta, loja, venda, motivo) {
      return P.fb().then(function (f) {
        var F = f.F, db = f.db, uid = conta.uid, d = deltas(venda.itens, +1);
        return Promise.all([F.getDoc(F.doc(col(f, uid, 'vendas'), venda.id)), lerPecas(f, uid, Object.keys(d))]).then(function (r) {
          if (!r[0].exists()) throw new Error('Venda não encontrada.');
          var v = Object.assign({ id: venda.id }, r[0].data(), { status: 'cancelado' });
          if (r[0].data().status === 'cancelado') throw new Error('Esta venda já estava cancelada.');
          var lote = F.writeBatch(db), agora = new Date(), caixa = [], movs = [], pecas = [];
          lote.update(r[0].ref, { status: 'cancelado' });
          if (v.total > 0) {
            var refC = F.doc(col(f, uid, 'caixa')), cx = Object.assign(lancamento({ tipo: 'saida', valor: v.total, forma: v.forma, descricao: 'Estorno da venda ' + v.numero, categoria: 'estorno' }), { vendaId: v.id });
            lote.set(refC, cx); caixa.push(Object.assign({ id: refC.id }, cx));
          }
          v.itens.forEach(function (i) {
            var refM = F.doc(col(f, uid, 'movimentos')), m = movimento(i, i.tam, i.qtd, motivo, v.id, agora);
            lote.set(refM, m); movs.push(Object.assign({ id: refM.id }, m));
          });
          r[1].forEach(function (s) {
            if (!s.exists() || !s.data().estoque) return;
            var e = aplicarDeltas(s.data().estoque, d[s.id]);
            lote.update(s.ref, { estoque: e }); pecas.push({ id: s.id, estoque: e });
          });
          if (v.acompanhar) lote.set(F.doc(db, 'acompanhar', v.acompanhar), docAcompanhar(uid, loja, v));
          return lote.commit().then(function () { return { venda: v, caixa: caixa, movimentos: movs, itens: pecas }; });
        });
      });
    },
    mudarStatus: function (conta, loja, venda, status, tok) {
      return P.fb().then(function (f) {
        var F = f.F, lote = F.writeBatch(f.db), v = Object.assign({}, venda, { status: status, acompanhar: tok });
        lote.update(F.doc(col(f, conta.uid, 'vendas'), venda.id), { status: status, acompanhar: tok });
        lote.set(F.doc(f.db, 'acompanhar', tok), docAcompanhar(conta.uid, loja, v));
        return lote.commit().then(function () { return { venda: v }; });
      });
    },
    salvarVenda: function (conta, venda, campos) {
      return P.fb().then(function (f) { return f.F.updateDoc(f.F.doc(col(f, conta.uid, 'vendas'), venda.id), campos); })
        .then(function () { return { venda: Object.assign({}, venda, campos) }; });
    },
    estoque: function (conta, item, fn, motivo) {
      return P.fb().then(function (f) {
        var F = f.F, ref = F.doc(f.db, 'catalogos', conta.uid, 'itens', item.id);
        return F.getDoc(ref).then(function (s) {
          if (!s.exists()) throw new Error('Peça não encontrada. Ela foi apagada no montador?');
          var atual = Object.assign({ id: s.id }, s.data()), r = fn(atual.estoque || {}, atual), agora = new Date(), lote = F.writeBatch(f.db), movs = [];
          var tem = Object.keys(r.estoque).length;
          lote.update(ref, { estoque: tem ? r.estoque : F.deleteField() });
          r.movs.forEach(function (x) { var refM = F.doc(col(f, conta.uid, 'movimentos')), m = movimento(atual, x[0], x[1], motivo, '', agora); lote.set(refM, m); movs.push(Object.assign({ id: refM.id }, m)); });
          return lote.commit().then(function () { return { itens: [{ id: item.id, estoque: tem ? r.estoque : null }], movimentos: movs }; });
        });
      });
    },
    marcarVip: function (conta, item, vipAte) {
      return P.fb().then(function (f) {
        var F = f.F;
        return F.updateDoc(F.doc(f.db, 'catalogos', conta.uid, 'itens', item.id), { vipAte: vipAte || F.deleteField() });
      }).then(function () { return { itens: [{ id: item.id, vipAte: vipAte || '' }] }; });
    },
    gravar: function (conta, nome, id, doc) {
      return P.fb().then(function (f) {
        var ref = id ? f.F.doc(col(f, conta.uid, nome), id) : f.F.doc(col(f, conta.uid, nome));
        return f.F.setDoc(ref, doc).then(function () { return Object.assign({ id: ref.id }, doc); });
      });
    },
    atualizar: function (conta, nome, id, campos) {
      return P.fb().then(function (f) { return f.F.updateDoc(f.F.doc(col(f, conta.uid, nome), id), campos); }).then(function () { return Object.assign({ id: id }, campos); });
    },
    apagar: function (conta, nome, id) { return P.fb().then(function (f) { return f.F.deleteDoc(f.F.doc(col(f, conta.uid, nome), id)); }); },
    pagarConta: function (conta, c, saida, proxima) {
      return P.fb().then(function (f) {
        var F = f.F, lote = F.writeBatch(f.db), refC = F.doc(col(f, conta.uid, 'caixa'));
        lote.update(F.doc(col(f, conta.uid, 'contas'), c.id), { paga: true, pagaEm: saida.data });
        lote.set(refC, saida);
        var r = { contas: [Object.assign({}, c, { paga: true, pagaEm: saida.data })], caixa: [Object.assign({ id: refC.id }, saida)] };
        if (proxima) { var refN = F.doc(col(f, conta.uid, 'contas')); lote.set(refN, proxima); r.contas.push(Object.assign({ id: refN.id }, proxima)); }
        return lote.commit().then(function () { return r; });
      });
    },
    gravarVip: function (conta, loja, codigo, hash) {
      return P.fb().then(function (f) {
        var F = f.F, lote = F.writeBatch(f.db);
        lote.update(F.doc(f.db, 'lojas', conta.uid), { vipCodigo: codigo });
        lote.update(F.doc(f.db, 'lojasPublicas', loja.slug), { vipHash: hash });
        return lote.commit();
      });
    },
    // canaisAtivos/{slug}: público (o workflow que publica os arquivos dos canais lê daqui); só a dona grava
    lerCanais: function (conta, loja) {
      return P.fb().then(function (f) { return f.F.getDoc(f.F.doc(f.db, 'canaisAtivos', loja.slug)); })
        .then(function (s) { return s.exists() ? s.data() : null; });
    },
    salvarCanais: function (conta, loja, doc) {
      return P.fb().then(function (f) { return f.F.setDoc(f.F.doc(f.db, 'canaisAtivos', loja.slug), doc); }).then(function () { return doc; });
    }
  };

  var B = modo === 'firebase' ? FB : DEMO;
  var COLECOES = ['vendas', 'caixa', 'contas', 'movimentos', 'vip', 'avisos'];

  /* ---------- interface pública ---------- */
  function listar(nome) { return function (conta) { return B.listar(conta, nome); }; }

  /** Tudo de uma vez; uma coleção que falhar não derruba as outras (vem em erros[nome]). */
  function carregar(conta) {
    var erros = {};
    return Promise.all(COLECOES.map(function (n) {
      return B.listar(conta, n).catch(function (e) { erros[n] = erroAmigavel(e); return []; });
    })).then(function (r) {
      var o = { erros: erros };
      COLECOES.forEach(function (n, i) { o[n] = r[i]; });
      return o;
    });
  }

  /** Venda nova: venda + entrada no caixa + um movimento por item + estoque baixado (um lote só). */
  function registrarVenda(conta, loja, entrada) {
    var v = limparVenda(entrada || {});
    if (!v.itens.length) return rejeitar('Adicione pelo menos uma peça.');
    var agora = new Date();
    v.criadaEm = agora.toISOString(); v.data = dia(agora);
    v.status = ['pago', 'separado', 'enviado', 'entregue'].indexOf(entrada.status) >= 0 ? entrada.status : (v.canal === 'balcao' ? 'entregue' : 'pago');
    // pedido para entregar já nasce com o link de acompanhamento
    v.acompanhar = v.status === 'entregue' ? '' : token(24);
    return B.registrarVenda(conta, loja, v);
  }
  /** Cancela: devolve o estoque (movimento positivo) e lança a saída de estorno no caixa. */
  function cancelarVenda(conta, loja, venda) {
    if (!venda || venda.status === 'cancelado') return rejeitar('Esta venda já estava cancelada.');
    return B.cancelarVenda(conta, loja, venda, venda.status === 'entregue' ? 'troca' : 'ajuste');
  }
  /** pago -> separado -> enviado -> entregue. Cria/atualiza acompanhar/{token} junto. */
  function mudarStatusPedido(conta, loja, venda, status) {
    if (STATUS.indexOf(status) < 0) return rejeitar('Situação desconhecida.');
    if (status === 'cancelado') return cancelarVenda(conta, loja, venda);
    if (venda.status === 'cancelado') return rejeitar('Pedido cancelado não muda de situação.');
    return B.mudarStatus(conta, loja, venda, status, venda.acompanhar || token(24));
  }
  function salvarVenda(conta, venda, campos) {
    var o = {};
    if ('endereco' in campos) o.endereco = texto(campos.endereco, 400);
    if ('obs' in campos) o.obs = texto(campos.obs, 300);
    if ('cliente' in campos) o.cliente = { nome: texto(campos.cliente.nome, 60), whats: digitos(campos.cliente.whats) };
    return B.salvarVenda(conta, venda, o);
  }
  /** Entrada de mercadoria: soma ao estoque ({ M: 3, G: 2 }) e grava um movimento por tamanho. */
  function entradaEstoque(conta, item, qtds, motivo) {
    var tem = Object.keys(qtds || {}).some(function (t) { return inteiro(qtds[t]) > 0; });
    if (!tem) return rejeitar('Digite quantas peças chegaram em pelo menos um tamanho.');
    return B.estoque(conta, item, function (atual, peca) {
      var e = Object.assign({}, atual), movs = [];
      (peca.tamanhos || []).forEach(function (t) { var q = inteiro(qtds[t]); if (q > 0) { e[t] = Math.min(9999, (Number(e[t]) || 0) + q); movs.push([t, q]); } });
      return { estoque: e, movs: movs };
    }, ['entrada', 'troca', 'ajuste'].indexOf(motivo) >= 0 ? motivo : 'entrada');
  }
  /** Grade editada: { P: 3, M: '' } (vazio = não controla aquele tamanho). Diferenças viram movimento "ajuste". */
  function salvarEstoque(conta, item, novo) {
    return B.estoque(conta, item, function (atual, peca) {
      var e = {}, movs = [];
      (peca.tamanhos || []).forEach(function (t) {
        var v = novo ? novo[t] : '';
        if (v === '' || v == null) return;
        e[t] = inteiro(v);
        var antes = Number(atual[t]) || 0;
        if (e[t] !== antes || !(t in atual)) { if (e[t] - antes) movs.push([t, e[t] - antes]); }
      });
      return { estoque: e, movs: movs };
    }, 'ajuste');
  }
  /** Lançamento VIP: até 'AAAA-MM-DDTHH:MM' só quem tem o link VIP vê a peça. Vazio tira. */
  function marcarVip(conta, item, vipAte) {
    if (vipAte && !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(vipAte)) return rejeitar('Escolha a data e a hora do lançamento.');
    return B.marcarVip(conta, item, vipAte || '');
  }
  function lancarCaixa(conta, l) {
    var doc = lancamento(l || {});
    if (!(doc.valor > 0)) return rejeitar('Digite o valor.');
    return B.gravar(conta, 'caixa', '', doc).then(function (d) { return { caixa: [d] }; });
  }
  function apagarCaixa(conta, id) { return B.apagar(conta, 'caixa', id); }
  function salvarConta(conta, c) {
    var doc = limparConta(c || {});
    if (!(doc.valor > 0)) return rejeitar('Digite o valor da conta.');
    return B.gravar(conta, 'contas', c.id || '', doc).then(function (d) { return { contas: [d] }; });
  }
  /** Marca paga: vira saída no caixa; recorrente mensal já cria a do mês seguinte. */
  function pagarConta(conta, c, forma) {
    if (c.paga) return rejeitar('Esta conta já está paga.');
    var saida = lancamento({ data: dia(), tipo: 'saida', valor: c.valor, forma: forma, descricao: c.descricao, categoria: 'conta' });
    var proxima = c.recorrente === 'mensal' ? limparConta({ descricao: c.descricao, valor: c.valor, vence: mesSeguinte(c.vence), recorrente: 'mensal' }) : null;
    return B.pagarConta(conta, c, saida, proxima);
  }
  function apagarConta(conta, id) { return B.apagar(conta, 'contas', id); }
  function marcarAvisado(conta, aviso, valor) {
    return B.atualizar(conta, 'avisos', aviso.id, { avisado: valor !== false }).then(function () { return { avisos: [Object.assign({}, aviso, { avisado: valor !== false })] }; });
  }
  /** Link VIP novo: código de 24 letras/números na loja (privado) e só o hash na parte pública. O link antigo para de valer. */
  function gerarLinkVip(conta, loja) {
    if (!loja || !loja.slug) return rejeitar('A loja ainda não tem endereço. Publique pelo montador primeiro.');
    var c = token(24);
    return sha256(c).then(function (h) {
      return B.gravarVip(conta, loja, c, h).then(function () { return { codigo: c, hash: h, link: links.vip(loja, c) }; });
    });
  }

  /* ---------- cálculos (no navegador) ---------- */
  function soma(a, f) { return a.reduce(function (s, x) { return s + (f ? f(x) : x); }, 0); }
  function validas(vendas) { return (vendas || []).filter(function (v) { return v.status !== 'cancelado'; }); }

  /** Relatório dos últimos `dias` dias. */
  function relatorio(vendas, itens, dias, agora) {
    var hoje = dia(agora || new Date()), ini = somarDias(hoje, -(dias - 1));
    var todas = validas(vendas), vs = todas.filter(function (v) { return v.data >= ini && v.data <= hoje; });
    var fat = centavos(soma(vs, function (v) { return v.total || 0; }));
    var porPeca = {}, porCanal = {}, porForma = {};
    vs.forEach(function (v) {
      (v.itens || []).forEach(function (i) { var x = porPeca[i.id] = porPeca[i.id] || { id: i.id, nome: i.nome, qtd: 0, valor: 0 }; x.qtd += i.qtd; x.valor += i.preco * i.qtd; });
      var c = porCanal[v.canal] = porCanal[v.canal] || {}; c[v.forma] = (c[v.forma] || 0) + (v.total || 0);
      porForma[v.forma] = (porForma[v.forma] || 0) + (v.total || 0);
    });
    var ultima = {};
    todas.forEach(function (v) { (v.itens || []).forEach(function (i) { if (!ultima[i.id] || v.data > ultima[i.id]) ultima[i.id] = v.data; }); });
    var paradas = (itens || []).filter(function (i) { var t = estoqueTotal(i); return t && t > 0 && (!ultima[i.id] || diasEntre(ultima[i.id], hoje) >= 60); })
      .map(function (i) { return { item: i, ultima: ultima[i.id] || '', dias: ultima[i.id] ? diasEntre(ultima[i.id], hoje) : null, estoque: estoqueTotal(i) }; })
      .sort(function (a, b) { return (b.dias == null ? 1e9 : b.dias) - (a.dias == null ? 1e9 : a.dias) || b.estoque - a.estoque; });
    return {
      inicio: ini, fim: hoje, dias: dias, faturamento: fat, pedidos: vs.length, ticket: vs.length ? centavos(fat / vs.length) : 0,
      pecas: soma(vs, function (v) { return soma(v.itens || [], function (i) { return i.qtd; }); }),
      maisVendidas: lista(porPeca).sort(function (a, b) { return b.qtd - a.qtd || b.valor - a.valor; }).slice(0, 8),
      porCanal: CANAIS.filter(function (c) { return porCanal[c]; }).map(function (c) { return { canal: c, formas: FORMAS.map(function (f) { return centavos(porCanal[c][f] || 0); }) }; }),
      porForma: FORMAS.map(function (f) { return { forma: f, valor: centavos(porForma[f] || 0) }; }),
      paradas: paradas
    };
  }
  /** Faturamento dos últimos n meses (o atual por último). */
  function meses(vendas, n, agora) {
    var atual = dia(agora || new Date()).slice(0, 7), out = [];
    for (var k = n - 1; k >= 0; k--) out.push({ mes: somarMes(atual, -k), total: 0, pedidos: 0 });
    validas(vendas).forEach(function (v) { var m = out.filter(function (x) { return x.mes === mesDe(v.data); })[0]; if (m) { m.total += v.total || 0; m.pedidos++; } });
    out.forEach(function (m) { m.total = centavos(m.total); });
    return out;
  }
  /** Caixa do mês 'AAAA-MM'. */
  function caixaMes(caixa, mes) {
    var ls = (caixa || []).filter(function (c) { return mesDe(c.data) === mes; });
    var porForma = FORMAS.map(function (f) {
      return { forma: f, entrada: centavos(soma(ls.filter(function (c) { return c.forma === f && c.tipo === 'entrada'; }), function (c) { return c.valor; })), saida: centavos(soma(ls.filter(function (c) { return c.forma === f && c.tipo === 'saida'; }), function (c) { return c.valor; })) };
    });
    var ent = centavos(soma(ls.filter(function (c) { return c.tipo === 'entrada'; }), function (c) { return c.valor; }));
    var sai = centavos(soma(ls.filter(function (c) { return c.tipo === 'saida'; }), function (c) { return c.valor; }));
    return { mes: mes, entradas: ent, saidas: sai, saldo: centavos(ent - sai), porForma: porForma, lancamentos: ls.slice().sort(function (a, b) { return String(b.data + b.criadoEm).localeCompare(String(a.data + a.criadoEm)); }) };
  }
  /** Compradoras a partir das vendas (agrupa pelo WhatsApp; sem WhatsApp, pelo nome). */
  function compradoras(vendas, agora) {
    var hoje = dia(agora || new Date()), g = {};
    validas(vendas).forEach(function (v) {
      var c = v.cliente || {}, k = c.whats ? 'w' + c.whats : (c.nome ? 'n' + c.nome.toLowerCase() : '');
      if (!k) return;
      var x = g[k] = g[k] || { nome: c.nome || '', whats: c.whats || '', pedidos: 0, total: 0, ultima: '', primeira: v.data };
      if (c.nome && (!x.nome || v.data >= x.ultima)) x.nome = c.nome;
      x.pedidos++; x.total = centavos(x.total + (v.total || 0));
      if (v.data > x.ultima) x.ultima = v.data;
      if (v.data < x.primeira) x.primeira = v.data;
    });
    return lista(g).map(function (x) { x.diasSemComprar = diasEntre(x.ultima, hoje); return x; })
      .sort(function (a, b) { return String(b.ultima).localeCompare(String(a.ultima)); });
  }
  /** Situação de uma conta a pagar. */
  function situacaoConta(c, agora) {
    if (c.paga) return { sit: 'paga', dias: 0 };
    var d = diasEntre(dia(agora || new Date()), c.vence);
    return { sit: d < 0 ? 'vencida' : d === 0 ? 'hoje' : d <= 3 ? 'breve' : 'aberta', dias: d };
  }

  /* ---------- exemplos (só na demonstração) ---------- */
  function exemplos(conta, loja) {
    if (modo !== 'demo') return rejeitar('Exemplos só existem no modo demonstração.');
    var s = 7, rnd = function () { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
    var esc = function (a) { return a[Math.floor(rnd() * a.length)]; };
    var hoje = dia(), pecas = [];
    mudarPecasDemo(conta.uid, function (ls) {
      ls.forEach(function (p, n) {
        var e = {};
        (p.tamanhos || []).forEach(function (t, k) { e[t] = (n + k) % 7 === 3 ? 0 : (n + k) % 5 === 1 ? 1 : 2 + Math.floor(rnd() * 6); });
        if ((p.tamanhos || []).length) p.estoque = e;
        if (n === 2) p.vipAte = somarDias(hoje, 3) + 'T10:00';
      });
      pecas = copia(ls);
    });
    if (!pecas.length) return rejeitar('A loja ainda não tem peças. Suba as fotos no montador.');
    var clientes = [['Ana Paula Souza', '67999112233'], ['Bruna Lima', '67998223344'], ['Carla Menezes', '67997334455'], ['Daniela Rocha', '67996445566'],
      ['Elaine Prado', '67995556677'], ['Fernanda Alves', '67994667788'], ['Gabriela Nunes', '67993778899'], ['Helena Costa', '67992889900'], ['Isabela Moura', '67991990011']];
    return Promise.resolve(mudarDemo(conta.uid, function (g) {
      var num = Math.max(1000, parseInt(proximoNumero(lista(g.vendas)), 10) - 1), agora = new Date();
      for (var k = 0; k < 64; k++) {
        var atras = k === 60 ? 95 : Math.floor(Math.pow(rnd(), 1.6) * 178), data = somarDias(hoje, -atras), qtdItens = 1 + Math.floor(rnd() * 2.4), itens = [];
        for (var j = 0; j < qtdItens; j++) {
          var p = pecas[Math.floor(Math.pow(rnd(), 1.3) * pecas.length)], t = esc(p.tamanhos && p.tamanhos.length ? p.tamanhos : ['U']);
          itens.push({ id: p.id, nome: nomeComCor(p), tam: t, preco: p.preco || 0, qtd: rnd() < 0.15 ? 2 : 1 });
        }
        var canal = esc(['balcao', 'balcao', 'balcao', 'whatsapp', 'whatsapp', 'instagram', 'site']), cli = rnd() < 0.75 ? esc(clientes) : null;
        // Isabela só comprou há mais de 60 dias (aparece em "clientes sem comprar")
        if (k === 60) cli = clientes[8]; else if (atras < 80 && cli === clientes[8]) cli = clientes[0];
        var bruto = soma(itens, function (i) { return i.preco * i.qtd; }), desc = rnd() < 0.2 ? Math.round(bruto * 0.1) : 0;
        var status = canal === 'balcao' || atras > 6 ? 'entregue' : atras > 3 ? 'enviado' : atras > 1 ? 'separado' : 'pago';
        var id = idCurto() + k, hora = new Date(deDia(data).getTime() + (9 + Math.floor(rnd() * 9)) * 36e5 + Math.floor(rnd() * 59) * 6e4);
        var v = {
          id: id, numero: String(++num), criadaEm: hora.toISOString(), data: data, canal: canal, forma: esc(['pix', 'pix', 'cartao', 'cartao', 'dinheiro']),
          itens: itens, desconto: desc, total: centavos(bruto - desc), cliente: cli ? { nome: cli[0], whats: cli[1] } : { nome: '', whats: '' },
          status: k === 5 ? 'cancelado' : status, endereco: canal === 'balcao' ? '' : 'Rua das Acácias, ' + (100 + k) + ', Jardim dos Estados, Campo Grande - MS, 79020-' + (100 + k), acompanhar: canal === 'balcao' ? '' : token(24), obs: ''
        };
        g.vendas[id] = v;
        var cx = Object.assign({ id: idCurto() + 'c' + k }, lancamento({ data: data, tipo: 'entrada', valor: v.total, forma: v.forma, descricao: 'Venda ' + v.numero, categoria: 'venda' }), { vendaId: id });
        g.caixa[cx.id] = cx;
        if (v.status === 'cancelado') { var es = Object.assign({ id: idCurto() + 'e' }, lancamento({ data: data, tipo: 'saida', valor: v.total, forma: v.forma, descricao: 'Estorno da venda ' + v.numero, categoria: 'estorno' }), { vendaId: id }); g.caixa[es.id] = es; }
        if (v.acompanhar) g.acompanhar[v.acompanhar] = docAcompanhar(conta.uid, loja, v);
        if (atras < 30) v.itens.forEach(function (i, n) { var m = Object.assign({ id: idCurto() + 'm' + k + n }, movimento(i, i.tam, -i.qtd, 'venda', id, hora)); g.movimentos[m.id] = m; });
      }
      // saídas do semestre e entrada de mercadoria
      for (var mm = 5; mm >= 0; mm--) {
        var m0 = somarMes(hoje.slice(0, 7), -mm);
        [['Aluguel da loja', 1200, '05', 'aluguel', 'pix'], ['Fornecedor', 900 + Math.round(rnd() * 900), '12', 'fornecedor', 'pix'], ['Embalagens', 120 + Math.round(rnd() * 60), '18', 'embalagem', 'cartao'], ['Internet', 99.9, '20', 'conta', 'cartao']].forEach(function (x) {
          var d0 = m0 + '-' + x[2];
          if (d0 > hoje) return;
          var c = Object.assign({ id: idCurto() + x[3] + mm }, lancamento({ data: d0, tipo: 'saida', valor: x[1], forma: x[4], descricao: x[0], categoria: x[3] }));
          g.caixa[c.id] = c;
        });
      }
      pecas.slice(0, 6).forEach(function (p, n) {
        (p.tamanhos || []).slice(0, 2).forEach(function (t) { var m = Object.assign({ id: idCurto() + 'en' + n + t }, movimento(p, t, 4, 'entrada', '', new Date(agora.getTime() - (9 + n) * 864e5))); g.movimentos[m.id] = m; });
      });
      [['Aluguel da loja', 1200, somarDias(hoje, 2), 'mensal'], ['Internet', 99.9, somarDias(hoje, 12), 'mensal'], ['Boleto do fornecedor', 1480, somarDias(hoje, -1), 'nao']].forEach(function (x, n) {
        var c = Object.assign({ id: idCurto() + 'ct' + n }, limparConta({ descricao: x[0], valor: x[1], vence: x[2], recorrente: x[3] }));
        g.contas[c.id] = c;
      });
      clientes.slice(0, 7).forEach(function (c, n) {
        var id = idCurto() + 'v' + n;
        g.vip[id] = { id: id, nome: c[0], whats: c[1], criadoEm: new Date(agora.getTime() - (n * 3 + 1) * 864e5).toISOString() };
      });
      // avisos: um tamanho que voltou, um ainda zerado e um já avisado
      var volta = null, zerado = null;
      pecas.forEach(function (p) { Object.keys(p.estoque || {}).forEach(function (t) { if (!volta && p.estoque[t] > 1) volta = [p, t]; if (!zerado && p.estoque[t] === 0) zerado = [p, t]; }); });
      [[volta, clientes[3], false], [zerado, clientes[4], false], [volta, clientes[5], true]].forEach(function (x, n) {
        if (!x[0]) return;
        var id = idCurto() + 'a' + n;
        g.avisos[id] = { id: id, nome: x[1][0], whats: x[1][1], itemId: x[0][0].id, peca: x[0][0].nome, tam: x[0][1], criadoEm: new Date(agora.getTime() - (n + 2) * 864e5).toISOString(), avisado: x[2] };
      });
      return true;
    }));
  }
  /** Canais de venda (Meta, Google, Shopee e Shein pelos hubs): configuração pública da loja. */
  function lerCanais(conta, loja) {
    if (!loja || !loja.slug) return rejeitar('A loja ainda não tem endereço público.');
    return B.lerCanais(conta, loja);
  }
  function salvarCanais(conta, loja, cfg) {
    if (!loja || !loja.slug) return rejeitar('A loja ainda não tem endereço público.');
    if (!window.Canais) return rejeitar('Falta carregar shared/canais.js.');
    var doc = Object.assign({ lojaId: conta.uid, slug: loja.slug }, window.Canais.limparCfg(cfg), { atualizadoEm: new Date().toISOString() });
    return B.salvarCanais(conta, loja, doc);
  }
  function limparDemo(conta) {
    if (modo !== 'demo') return rejeitar('Só no modo demonstração.');
    try { localStorage.removeItem(CHAVE + conta.uid); } catch (e) { /* nada */ }
    return Promise.resolve();
  }

  window.Gestao = {
    modo: modo, TAMS: TAMS, CANAIS: CANAIS, FORMAS: FORMAS, STATUS: STATUS, NOMES: NOMES,
    carregar: carregar,
    listarVendas: listar('vendas'), listarCaixa: listar('caixa'), listarContas: listar('contas'), listarMovimentos: listar('movimentos'),
    listarVip: listar('vip'), listarAvisos: listar('avisos'),
    registrarVenda: registrarVenda, cancelarVenda: cancelarVenda, mudarStatusPedido: mudarStatusPedido, salvarVenda: salvarVenda,
    entradaEstoque: entradaEstoque, salvarEstoque: salvarEstoque, marcarVip: marcarVip,
    lancarCaixa: lancarCaixa, apagarCaixa: apagarCaixa, salvarConta: salvarConta, pagarConta: pagarConta, apagarConta: apagarConta,
    marcarAvisado: marcarAvisado, gerarLinkVip: gerarLinkVip, lerCanais: lerCanais, salvarCanais: salvarCanais,
    exemplos: exemplos, limparDemo: limparDemo,
    sku: sku, codigo: codigo, lerCodigo: lerCodigo, estoqueTotal: estoqueTotal, nomeComCor: nomeComCor,
    token: token, sha256: sha256, wa: wa, links: links, erroAmigavel: erroAmigavel,
    calc: { relatorio: relatorio, meses: meses, caixaMes: caixaMes, compradoras: compradoras, situacaoConta: situacaoConta },
    util: { dia: dia, somarDias: somarDias, diasEntre: diasEntre, somarMes: somarMes, mesSeguinte: mesSeguinte, centavos: centavos, digitos: digitos }
  };
})();
