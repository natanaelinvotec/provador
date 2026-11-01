/*
 * vitrine-extras.js — extras que valem para todas as lojas e os 15 modelos (window.VitrineExtras).
 *
 * O carregador (assets/js/vitrine-loader.js) usa duas funções:
 *   filtrarItens(itens, loja, params)  antes de entregar as peças ao modelo (só na loja de verdade):
 *     - tira de `tamanhos` os tamanhos com estoque 0 (guarda quais em `esgotados`);
 *     - peça sem nenhum tamanho vira `esgotado: true` e só fica na página dela (some das listas);
 *     - peça com `vipAte` no futuro some, a não ser que sha256(params.vip) == loja.vipHash (aí vem com novo: true).
 *   montar(ctx)  depois que o modelo desenhou. ctx: { loja, lojaId, slug, params, pagina, demo, rascunho, item, itens, marca, links, porProps }
 *     - Avise-me na página do produto (tamanhos esgotados) -> avisos/{lojaId}/pedidos
 *     - botão "Lista VIP" fixo no canto inferior esquerdo -> vip/{lojaId}/contatos
 *     - "Instalar a loja": manifest da loja (Blob), ícone feito em canvas, apple-touch-icon
 *     - página "Acompanhar pedido" (?acompanhar=token) por cima do modelo <- acompanhar/{token}
 *
 * Nada aqui mexe nos .dc.html nem nos kits: os elementos entram por cima, com as cores lidas da raiz
 * do modelo (--accent, --on-accent, --bg, --ink...; no modelo 1, --wine). Em demonstração, rascunho
 * ou prévia (ctx.demo) os formulários aparecem mas não gravam.
 */
(function () {
  'use strict';

  var TAMS = ['P', 'M', 'G', 'GG', 'U'];
  var PADRAO = ['P', 'M', 'G', 'GG'];
  var CATS = { conjuntos: 1, leggings: 1, tops: 1, macacoes: 1, macaquinhos: 1, acessorios: 1 };
  // padrão escuro/rosa, para quando a raiz do modelo não tem as variáveis de cor
  var CORES_PADRAO = { bg: '#120B12', surface: '#1E141E', line: '#3A2A38', ink: '#F8EEF4', muted: '#C4AFBC', accent: '#FF4F9A', onAccent: '#140A12' };
  var MSG_PREVIA = 'Na sua loja de verdade isso chega no seu painel.';
  var ICONES = {
    estrela: 'M12 3.8l2.5 5.1 5.6.8-4 3.9.9 5.6-5-2.6-5 2.6.9-5.6-4-3.9 5.6-.8z',
    baixar: 'M12 4v11M7 10.5l5 5 5-5M5 19.5h14',
    fechar: 'M6 6l12 12M18 6L6 18',
    sino: 'M6.5 16.5V11a5.5 5.5 0 0 1 11 0v5.5l1.5 1.5H5zM10 20.5a2 2 0 0 0 4 0',
    check: 'M5 12.5l4.5 4.5L19 7.5',
    compartilhar: 'M12 3.5v11M8 7.5l4-4 4 4M7 10.5H5.5v10h13v-10H17',
    mais: 'M12 5v14M5 12h14',
    zap: 'M4.5 19.5l1.2-3.9A8 8 0 1 1 8.6 18.4zM9.2 9.3c.3 2.3 2.2 4.3 4.6 4.8l1.2-1.1 1.8.9-.4 1.6c-3.6.2-7-3.1-7-6.8l1.6-.4.8 1.8z',
    voltar: 'M15 5l-7 7 7 7',
    pontos: 'M12 5.5h.01M12 12h.01M12 18.5h.01'
  };
  // compra, WhatsApp e formulários do modelo: os botões fixos saem da frente quando encostam neles
  var PROTEGIDOS = '.compra, .actions, .tams, .sizes, .cores-g, .sws, .qtd, .qty, .zap, .zap-flut, .wa, a[href*="wa.me"], .add, .card-btn, ' +
    'form button, form input, form select, form textarea, .toast, footer a, footer button, .vx-avise';
  var ETAPAS = [
    ['pago', 'Pagamento confirmado', 'A loja recebeu o seu pedido.'],
    ['separado', 'Pedido separado', 'Suas peças já estão separadas.'],
    ['enviado', 'Enviado', 'O pedido saiu para entrega.'],
    ['entregue', 'Entregue', 'O pedido chegou. Aproveite!']
  ];

  var S = { ctx: null, app: null, montado: false, vipAtivo: false, adiado: null, instalada: false, coresTxt: '', escuro: true, icone: '' };

  /* ---------- utilidades ---------- */
  function slug(s) { return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40); }
  function grupoId(i) { return slug(i.cat + '-' + i.nome) || String(i.id || ''); }
  function nomeTam(t) { return t === 'U' ? 'Único' : t; }
  function ordenarTams(l) { return l.slice().sort(function (a, b) { return TAMS.indexOf(a) - TAMS.indexOf(b); }); }
  function lerLocal(k, sessao) { try { return (sessao ? sessionStorage : localStorage).getItem(k); } catch (e) { return null; } }
  function gravarLocal(k, v, sessao) { try { var s = sessao ? sessionStorage : localStorage; if (v == null) s.removeItem(k); else s.setItem(k, v); } catch (e) { /* navegador sem armazenamento */ } }

  /** Cria um elemento: h('button', { class: 'x', texto: 'Oi', onclick: fn }, [filhos]). Texto sempre por textContent. */
  function h(tag, at, filhos) {
    var e = document.createElement(tag);
    Object.keys(at || {}).forEach(function (k) {
      var v = at[k];
      if (v == null || v === false) return;
      if (k === 'texto') e.textContent = v;
      else if (/^on[a-z]+$/.test(k) && typeof v === 'function') e.addEventListener(k.slice(2), v);
      else e.setAttribute(k, v === true ? '' : String(v));
    });
    (filhos || []).forEach(function (f) { if (f != null && f !== false) e.appendChild(typeof f === 'string' ? document.createTextNode(f) : f); });
    return e;
  }
  function icone(nome, cls) {
    var NS = 'http://www.w3.org/2000/svg', s = document.createElementNS(NS, 'svg'), p = document.createElementNS(NS, 'path');
    s.setAttribute('viewBox', '0 0 24 24'); s.setAttribute('aria-hidden', 'true'); s.setAttribute('focusable', 'false');
    s.setAttribute('class', 'vx-ic' + (cls ? ' ' + cls : ''));
    p.setAttribute('d', ICONES[nome] || ''); s.appendChild(p);
    return s;
  }
  function numeroWhats(txt) {
    var d = String(txt || '').replace(/\D/g, '');
    if (!d || /^0+$/.test(d) || d.length < 10) return '';
    return d.length <= 11 ? '55' + d : d;
  }
  function fmtWhats(d) {
    d = String(d || '').replace(/\D/g, '').slice(0, 11);
    if (d.length <= 2) return d.length ? '(' + d : '';
    if (d.length <= 6) return '(' + d.slice(0, 2) + ') ' + d.slice(2);
    if (d.length <= 10) return '(' + d.slice(0, 2) + ') ' + d.slice(2, 6) + '-' + d.slice(6);
    return '(' + d.slice(0, 2) + ') ' + d.slice(2, 7) + '-' + d.slice(7);
  }
  function soWhats(v) {
    var d = String(v || '').replace(/\D/g, '');
    if (d.length >= 12 && d.indexOf('55') === 0) d = d.slice(2);
    return d.replace(/^0+/, '');
  }

  /* ---------- filtro das peças (estoque e lançamento VIP) ---------- */
  function vipAteMs(s) {
    var m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(String(s || ''));
    return m ? new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]).getTime() : 0; // hora local
  }
  async function sha256(txt) {
    if (!window.crypto || !crypto.subtle || !window.TextEncoder) return '';
    var buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(String(txt)));
    return Array.prototype.map.call(new Uint8Array(buf), function (b) { return ('0' + b.toString(16)).slice(-2); }).join('');
  }
  // o código do link VIP fica guardado neste aparelho, para a cliente seguir vendo os lançamentos nas outras páginas
  async function vipValido(loja, params) {
    var hash = String((loja && loja.vipHash) || '').toLowerCase();
    if (!/^[0-9a-f]{64}$/.test(hash)) return false;
    var chave = 'provador:vip:' + ((loja && (loja.slug || loja.lojaId)) || 'loja');
    var doLink = String((params && params.vip) || '').trim(), guardado = lerLocal(chave) || '';
    var tentativas = [doLink, guardado].filter(function (c, n, l) { return /^[A-Za-z0-9]{1,40}$/.test(c) && l.indexOf(c) === n; });
    for (var n = 0; n < tentativas.length; n++) {
      if (await sha256(tentativas[n]) === hash) { if (tentativas[n] !== guardado) gravarLocal(chave, tentativas[n]); return true; }
    }
    if (guardado) gravarLocal(chave, null); // o link VIP mudou: o código antigo não vale mais
    return false;
  }
  function semEstoque(q) { return (typeof q === 'number' && q <= 0) || (typeof q === 'string' && q.trim() === '0'); }

  /**
   * Regras da vitrine para as peças da loja (não muda a lista recebida).
   * Peça esgotada fica com tamanhos [] e esgotado: true, e só é mantida quando params.p é 'produto'
   * e params.item é ela (id do grupo categoria-nome, igual em todos os modelos, ou o id da peça).
   */
  async function filtrarItens(itens, loja, params) {
    params = params || {};
    var lista = Array.isArray(itens) ? itens : [], agora = Date.now();
    var vip = false;
    if (lista.some(function (i) { return i && vipAteMs(i.vipAte) > agora; })) {
      try { vip = await vipValido(loja, params); } catch (e) { vip = false; }
    }
    S.vipAtivo = vip;
    var pagina = params.p === 'produto' ? String(params.item || '') : null;
    var saida = [];
    lista.forEach(function (orig) {
      if (!orig || typeof orig !== 'object') return;
      var i = Object.assign({}, orig);
      if (vipAteMs(i.vipAte) > agora) {
        if (!vip) return; // lançamento ainda fechado para quem não tem o link VIP
        i.novo = true; i.vip = true;
      }
      var tams = Array.isArray(i.tamanhos) ? i.tamanhos.filter(function (t) { return TAMS.indexOf(t) >= 0; }) : [];
      var est = i.estoque && typeof i.estoque === 'object' ? i.estoque : null;
      if (est && tams.length) {
        var fora = tams.filter(function (t) { return Object.prototype.hasOwnProperty.call(est, t) && semEstoque(est[t]); });
        i.esgotados = fora;
        i.tamanhos = tams.filter(function (t) { return fora.indexOf(t) < 0; });
        if (!i.tamanhos.length) {
          i.esgotado = true;
          if (pagina === null || (pagina !== grupoId(i) && pagina !== String(i.id || ''))) return; // some das listas
          i.ordem = 1e6 + (Number(i.ordem) || 0); // na página da peça, as cores com estoque aparecem primeiro
        }
      }
      saida.push(i);
    });
    return saida;
  }

  /* ---------- cores e fonte do modelo ---------- */
  function raizModelo() { return S.app && S.app.firstElementChild; }
  function rgb(cor) {
    var t = h('span', { style: 'display:none;color:' + cor }); document.body.appendChild(t);
    var m = getComputedStyle(t).color.match(/[\d.]+/g) || [0, 0, 0]; t.remove();
    return m.slice(0, 3).map(Number);
  }
  function luz(cor) {
    var c = rgb(cor).map(function (v) { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); });
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  }
  function px(v) { var n = parseFloat(v); return isNaN(n) ? null : n; }
  function aplicarCores() {
    var raiz = raizModelo(), c = Object.assign({}, CORES_PADRAO), fonte = '', fonteTit = '', pesoTit = '700', rBtn = null, rCampo = null;
    if (raiz) {
      var cs = getComputedStyle(raiz);
      var v = function () { for (var n = 0; n < arguments.length; n++) { var x = cs.getPropertyValue(arguments[n]).trim(); if (x) return x; } return ''; };
      var m = { bg: v('--bg'), surface: v('--surface'), line: v('--line'), ink: v('--ink'), muted: v('--muted'), accent: v('--accent', '--wine'), onAccent: v('--on-accent', '--on-wine') };
      // fonte do texto: a da raiz; se a raiz não tem (fica a padrão do navegador), a de um parágrafo do modelo
      fonte = cs.fontFamily;
      if (fonte === getComputedStyle(document.body).fontFamily) {
        var par = raiz.querySelector('main p') || raiz.querySelector('p, li');
        if (par) fonte = getComputedStyle(par).fontFamily;
      }
      var tit = raiz.querySelector('h1, h2'), ct = tit ? getComputedStyle(tit) : null;
      // o modelo redesenha a cada clique: só recalcula quando as cores ou as fontes mudaram
      var chave = JSON.stringify(m) + fonte + (ct ? ct.fontFamily + ct.fontWeight : '') + cs.backgroundColor + cs.color;
      if (chave === S.coresChave && S.coresTxt) return;
      S.coresChave = chave;
      if (!m.bg && cs.backgroundColor && !/^(transparent|rgba\(0, 0, 0, 0\))$/.test(cs.backgroundColor)) m.bg = cs.backgroundColor;
      if (m.bg) {
        // com o fundo do modelo, o texto também é o do modelo; o que faltar sai da mistura dos dois
        c.bg = m.bg; c.ink = m.ink || cs.color || c.ink;
        c.surface = m.surface || 'color-mix(in srgb, ' + c.ink + ' 6%, ' + c.bg + ')';
        c.line = m.line || 'color-mix(in srgb, ' + c.ink + ' 16%, ' + c.bg + ')';
        c.muted = m.muted || 'color-mix(in srgb, ' + c.ink + ' 70%, ' + c.bg + ')';
      }
      if (m.accent) { c.accent = m.accent; c.onAccent = m.onAccent || (luz(m.accent) > 0.4 ? '#111111' : '#FFFFFF'); }
      if (ct) { fonteTit = ct.fontFamily; pesoTit = ct.fontWeight || '700'; }
      rBtn = px(v('--r-btn'));
      if (rBtn === null) { var b = raiz.querySelector('.btn'); if (b) rBtn = px(getComputedStyle(b).borderTopLeftRadius); }
      rCampo = px(v('--r-campo'));
    }
    if (rBtn === null) rBtn = 999;
    var redondo = rBtn >= 20;
    var escuro = luz(c.bg) < 0.25;
    var txt = ':root{--vx-bg:' + c.bg + ';--vx-surface:' + c.surface + ';--vx-line:' + c.line + ';--vx-ink:' + c.ink + ';--vx-muted:' + c.muted +
      ';--vx-accent:' + c.accent + ';--vx-on-accent:' + c.onAccent + ';--vx-erro:' + (escuro ? '#FF9B8F' : '#B42318') +
      ';--vx-line-forte:color-mix(in srgb, ' + c.ink + ' 34%, ' + c.bg + ')' +
      ';--vx-font:' + (fonte ? fonte + ', system-ui, sans-serif' : 'system-ui, -apple-system, "Segoe UI", sans-serif') + ';--vx-font-tit:' + (fonteTit && fonteTit !== getComputedStyle(document.body).fontFamily ? fonteTit + ', var(--vx-font)' : 'var(--vx-font)') + ';--vx-peso-tit:' + pesoTit +
      ';--vx-r-pilula:' + (redondo ? '999px' : rBtn + 'px') + ';--vx-r-caixa:' + (redondo ? '18px' : Math.min(rBtn, 12) + 'px') +
      ';--vx-r-campo:' + (rCampo !== null ? rCampo : (redondo ? 12 : Math.min(rBtn, 8))) + 'px}';
    if (txt === S.coresTxt) return;
    S.coresTxt = txt; S.escuro = escuro; S.cores = c;
    var st = document.getElementById('vx-cores');
    if (!st) { st = h('style', { id: 'vx-cores' }); document.head.appendChild(st); }
    st.textContent = txt;
  }

  /* ---------- estilos ---------- */
  var CSS = [
    '.vx,.vx *,.vx *::before,.vx *::after,#app .vx-avise,#app .vx-avise *{box-sizing:border-box}',
    '.vx{font-family:var(--vx-font);color:var(--vx-ink);line-height:1.45;-webkit-text-size-adjust:100%}',
    '.vx-ic{width:20px;height:20px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round;flex:none}',
    '.vx button,#app .vx-avise button{font-family:var(--vx-font)}',
    '.vx :focus-visible,#app .vx-avise :focus-visible{outline:2px solid var(--vx-ink);outline-offset:2px;box-shadow:0 0 0 5px color-mix(in srgb,var(--vx-accent) 45%,transparent)}',
    '.vx [hidden]{display:none!important}',
    '.vx [tabindex="-1"]:focus{outline:none;box-shadow:none}',
    '.vx-sr{position:absolute;width:1px;height:1px;margin:-1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0}',
    /* botões fixos */
    '.vx-barra{position:fixed;left:max(16px,env(safe-area-inset-left,0px));bottom:max(16px,env(safe-area-inset-bottom,0px));z-index:35;display:flex;gap:8px;max-width:calc(100vw - 96px);transition:opacity .2s ease,transform .2s ease,visibility 0s linear 0s}',
    '.vx-barra.vx-recuado{opacity:0;visibility:hidden;transform:translateY(12px);pointer-events:none;transition:opacity .2s ease,transform .2s ease,visibility 0s linear .2s}',
    '.vx-pilula{display:inline-flex;align-items:center;gap:8px;min-height:44px;padding:0 16px 0 13px;border:1px solid var(--vx-line-forte);border-radius:var(--vx-r-pilula);background:var(--vx-surface);color:var(--vx-ink);font:600 14px/1 var(--vx-font);letter-spacing:.01em;white-space:nowrap;cursor:pointer;box-shadow:0 8px 24px rgba(0,0,0,.2);-webkit-tap-highlight-color:transparent}',
    '.vx-pilula:hover{border-color:var(--vx-ink)}',
    '.vx-pilula .vx-ic{width:18px;height:18px;color:var(--vx-accent)}',
    '@media (max-width:359px){.vx-pilula.vx-inst span{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)}.vx-pilula.vx-inst{padding:0 12px}}',
    /* aviso curto (acesso VIP) */
    '.vx-nota{position:fixed;left:50%;bottom:max(76px,calc(env(safe-area-inset-bottom,0px) + 76px));z-index:36;width:max-content;max-width:calc(100vw - 32px);padding:12px 16px;border-radius:var(--vx-r-caixa);background:var(--vx-ink);color:var(--vx-bg);font:600 14px/1.4 var(--vx-font);box-shadow:0 12px 32px rgba(0,0,0,.3);transform:translateX(-50%)}',
    /* janela (modal) */
    '.vx-fundo{position:fixed;inset:0;z-index:1000;display:flex;align-items:center;justify-content:center;padding:16px;background:rgba(0,0,0,.58);animation:vx-entra .18s ease-out}',
    '.vx-modal{position:relative;width:100%;max-width:440px;max-height:calc(100vh - 32px);max-height:calc(100dvh - 32px);overflow:auto;overscroll-behavior:contain;padding:24px 22px 22px;border:1px solid var(--vx-line);border-radius:var(--vx-r-caixa);background:var(--vx-bg);color:var(--vx-ink);box-shadow:0 24px 64px rgba(0,0,0,.45)}',
    '@media (max-width:600px){.vx-fundo{align-items:flex-end;padding:0}.vx-modal{max-width:none;max-height:92vh;max-height:92dvh;border-radius:var(--vx-r-caixa) var(--vx-r-caixa) 0 0;padding:22px 16px max(20px,env(safe-area-inset-bottom,0px));animation:vx-sobe .22s ease-out}}',
    '@keyframes vx-entra{from{opacity:0}}@keyframes vx-sobe{from{transform:translateY(24px)}}',
    '@media (prefers-reduced-motion:reduce){.vx-fundo,.vx-modal{animation:none}.vx-barra{transition:none}}',
    '.vx-modal h2{margin:0 48px 8px 0;font-family:var(--vx-font-tit);font-weight:var(--vx-peso-tit);font-size:24px;line-height:1.15;letter-spacing:0;text-transform:none}',
    '.vx-modal p{margin:0}',
    '.vx-modal .vx-intro{color:var(--vx-muted);font-size:15px}',
    '.vx-fechar{position:absolute;top:10px;right:10px;display:grid;place-items:center;width:44px;height:44px;padding:0;border:0;border-radius:50%;background:transparent;color:var(--vx-ink);cursor:pointer}',
    '.vx-fechar:hover{background:var(--vx-surface)}',
    '.vx-previa{margin-top:12px!important;padding:10px 12px;border-radius:var(--vx-r-campo);background:var(--vx-surface);color:var(--vx-muted);font-size:13.5px}',
    '.vx-form{margin-top:4px}',
    '.vx-campo{display:grid;gap:6px;margin-top:16px}',
    '.vx-campo label,.vx-legenda{font-size:14px;font-weight:600;color:var(--vx-ink)}',
    '.vx-campo input{width:100%;min-height:48px;margin:0;padding:0 14px;border:1px solid var(--vx-line-forte);border-radius:var(--vx-r-campo);background:var(--vx-surface);color:var(--vx-ink);font:16px/1.2 var(--vx-font);-webkit-appearance:none;appearance:none}',
    '.vx-campo input::placeholder{color:var(--vx-muted);opacity:.8}',
    '.vx-campo input:focus{border-color:var(--vx-ink)}',
    '.vx [aria-invalid="true"]{border-color:var(--vx-erro)!important}',
    '.vx-erro{margin:0;color:var(--vx-erro);font-size:13.5px;font-weight:600}',
    '.vx-erro:empty{display:none}',
    '.vx-tams{display:flex;flex-wrap:wrap;gap:8px;min-width:0;margin:16px 0 0;padding:0;border:0}',
    '.vx-tams legend{float:left;width:100%;margin:0 0 8px;padding:0}',
    '.vx-tams .vx-erro{flex-basis:100%}',
    '.vx-tam{position:relative;display:inline-flex}',
    '.vx-tam input{position:absolute;inset:0;width:100%;height:100%;margin:0;opacity:0;cursor:pointer}',
    '.vx-tam span{display:inline-flex;align-items:center;justify-content:center;min-width:52px;min-height:44px;padding:0 14px;border:1px solid var(--vx-line-forte);border-radius:var(--vx-r-campo);font-size:15px;font-weight:600}',
    '.vx-tam input:checked+span{background:var(--vx-ink);border-color:var(--vx-ink);color:var(--vx-bg)}',
    '.vx-tam input:focus-visible+span{outline:2px solid var(--vx-ink);outline-offset:2px;box-shadow:0 0 0 5px color-mix(in srgb,var(--vx-accent) 45%,transparent)}',
    '.vx-btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;width:100%;min-height:50px;margin-top:20px;padding:0 20px;border:1px solid var(--vx-accent);border-radius:var(--vx-r-pilula);background:var(--vx-accent);color:var(--vx-on-accent);font:700 15px/1.15 var(--vx-font);letter-spacing:.02em;text-decoration:none;text-align:center;cursor:pointer}',
    '.vx-btn:hover{filter:brightness(1.07)}',
    '.vx-btn[disabled]{opacity:.65;cursor:progress}',
    '.vx-btn-ln{border-color:var(--vx-line-forte);background:transparent;color:var(--vx-ink)}',
    '.vx-btn-ln:hover{border-color:var(--vx-ink);filter:none}',
    '.vx-letra{margin-top:12px!important;color:var(--vx-muted);font-size:12.5px;text-align:center}',
    '.vx-feito{display:grid;justify-items:start;gap:10px;padding-top:6px}',
    '.vx-feito:focus{outline:none}',
    '.vx-feito .vx-selo{display:grid;place-items:center;width:48px;height:48px;border-radius:50%;background:var(--vx-accent);color:var(--vx-on-accent)}',
    '.vx-feito .vx-selo .vx-ic{width:24px;height:24px;stroke-width:2.2}',
    '.vx-feito h3{margin:4px 0 0;font-family:var(--vx-font-tit);font-weight:var(--vx-peso-tit);font-size:21px;line-height:1.2}',
    '.vx-feito p{color:var(--vx-muted)}',
    /* instalar */
    '.vx-app{display:flex;align-items:center;gap:14px;margin:18px 0 6px}',
    '.vx-app img{width:60px;height:60px;border-radius:14px;box-shadow:0 4px 14px rgba(0,0,0,.25)}',
    '.vx-app b{display:block;font-size:16px}',
    '.vx-app span{color:var(--vx-muted);font-size:13.5px}',
    '.vx-passos{display:grid;gap:12px;margin:16px 0 0;padding:0;list-style:none;counter-reset:vx}',
    '.vx-passos li{display:grid;grid-template-columns:32px 1fr;align-items:center;gap:12px;counter-increment:vx;font-size:15px}',
    '.vx-passos li::before{content:counter(vx);display:grid;place-items:center;width:32px;height:32px;border-radius:50%;background:var(--vx-surface);border:1px solid var(--vx-line);font-weight:700;font-size:14px}',
    '.vx-passos .vx-ic{display:inline-block;width:18px;height:18px;margin:0 2px;vertical-align:-3px;color:var(--vx-accent)}',
    '.vx-passos b{font-weight:700}',
    /* avise-me na página do produto (dentro do modelo) */
    '#app .vx-avise{margin:12px 0 0;font-family:inherit;color:var(--vx-ink);text-align:left}',
    '#app .vx-avise-link{display:inline-flex;flex-wrap:wrap;align-items:center;gap:2px 6px;min-height:44px;margin:0;padding:6px 0;border:0;background:none;color:var(--vx-ink);font-size:14.5px;font-weight:400;line-height:1.35;letter-spacing:0;text-transform:none;text-align:left;cursor:pointer}',
    '#app .vx-avise-link .vx-ic{width:18px;height:18px;color:var(--vx-accent)}',
    '#app .vx-avise-link strong{font-weight:700;text-decoration:underline;text-decoration-color:var(--vx-accent);text-decoration-thickness:2px;text-underline-offset:4px}',
    '#app .vx-esgotado{display:grid;gap:6px;padding:16px;border:1px solid var(--vx-line-forte);border-radius:var(--vx-r-caixa);background:var(--vx-surface)}',
    '#app .vx-esgotado .vx-esg-tit{display:flex;align-items:center;gap:8px;margin:0;font-size:16px;font-weight:700;letter-spacing:0;text-transform:none;color:var(--vx-ink)}',
    '#app .vx-esgotado .vx-esg-tit i{width:9px;height:9px;border-radius:50%;background:var(--vx-erro)}',
    '#app .vx-esgotado p{margin:0;color:var(--vx-muted);font-size:14.5px;line-height:1.45}',
    '#app .vx-esgotado .vx-btn{margin-top:8px}',
    // peça esgotada (na cor escolhida): a compra sai da frente e os tamanhos ficam riscados
    'html[data-vx-esgotado] #app .compra .btn,html[data-vx-esgotado] #app .compra .qtd,html[data-vx-esgotado] #app .actions>button.btn:not(.ghost),html[data-vx-esgotado] #app .actions>.qty,' +
      'html[data-vx-esgotado] #app .estoque,html[data-vx-esgotado] #app .compra~.ok,html[data-vx-esgotado] #app .compra+p.ok{display:none!important}',
    'html[data-vx-esgotado] #app [role="group"][aria-label="Tamanho"]>button,html[data-vx-esgotado] #app [role="group"][aria-label="Escolher tamanho"]>button{opacity:.42;text-decoration:line-through;pointer-events:none}',
    /* página "Acompanhar pedido" */
    'html.vx-acompanhar #app{display:none!important}',
    'html.vx-acompanhar,html.vx-acompanhar body{background:var(--vx-bg)}',
    '.vx-pagina{position:relative;min-height:100vh;background:var(--vx-bg);color:var(--vx-ink);font-family:var(--vx-font)}',
    '.vx-wrap{width:100%;max-width:640px;margin:0 auto;padding:0 16px}',
    '.vx-pag-topo{position:sticky;top:0;z-index:1;border-bottom:1px solid var(--vx-line);background:var(--vx-bg)}',
    '.vx-pag-topo .vx-wrap{display:flex;align-items:center;justify-content:space-between;gap:12px;min-height:64px}',
    '.vx-marca{min-width:0;overflow:hidden;font-family:var(--vx-font-tit);font-weight:var(--vx-peso-tit);font-size:20px;line-height:1.1;text-overflow:ellipsis;white-space:nowrap}',
    '.vx-ver-loja{display:inline-flex;align-items:center;gap:6px;min-height:44px;padding:0 4px;color:var(--vx-ink);font-size:14.5px;font-weight:600;text-decoration:underline;text-decoration-color:var(--vx-accent);text-underline-offset:4px;white-space:nowrap}',
    '.vx-pag-corpo{padding-top:28px;padding-bottom:56px}',
    '.vx-kicker{margin:0;color:var(--vx-muted);font-size:13px;font-weight:600;letter-spacing:.08em;text-transform:uppercase}',
    '.vx-pagina h1{margin:6px 0 12px;font-family:var(--vx-font-tit);font-weight:var(--vx-peso-tit);font-size:clamp(30px,7vw,44px);line-height:1.05;letter-spacing:0;text-transform:none}',
    '.vx-pagina h1:focus{outline:none}',
    '.vx-pagina h2{margin:32px 0 10px;font-size:15px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--vx-muted)}',
    '.vx-situacao{display:inline-flex;align-items:center;gap:8px;min-height:34px;padding:0 14px;border-radius:var(--vx-r-pilula);background:var(--vx-accent);color:var(--vx-on-accent);font-weight:700;font-size:14.5px}',
    '.vx-situacao.vx-cancelado{background:var(--vx-surface);color:var(--vx-ink);border:1px solid var(--vx-line-forte)}',
    '.vx-quando{margin:10px 0 0;color:var(--vx-muted);font-size:14px}',
    '.vx-linha{margin:26px 0 0;padding:0;list-style:none}',
    '.vx-linha li{position:relative;display:grid;grid-template-columns:34px 1fr;gap:14px;padding-bottom:24px}',
    '.vx-linha li:last-child{padding-bottom:0}',
    '.vx-linha li::before{content:"";position:absolute;left:16px;top:36px;bottom:2px;width:2px;background:var(--vx-line)}',
    '.vx-linha li:last-child::before{display:none}',
    '.vx-linha li.vx-passou::before{background:var(--vx-accent)}',
    '.vx-marco{display:grid;place-items:center;width:34px;height:34px;border:2px solid var(--vx-line-forte);border-radius:50%;background:var(--vx-bg);color:var(--vx-on-accent)}',
    '.vx-linha .vx-feita .vx-marco,.vx-linha .vx-passou .vx-marco{border-color:var(--vx-accent);background:var(--vx-accent)}',
    '.vx-linha .vx-atual .vx-marco{box-shadow:0 0 0 6px color-mix(in srgb,var(--vx-accent) 24%,transparent)}',
    '.vx-marco .vx-ic{width:18px;height:18px;stroke-width:2.4}',
    '.vx-linha b{display:block;padding-top:5px;font-size:16.5px;line-height:1.3}',
    '.vx-linha .vx-desc{display:block;color:var(--vx-muted);font-size:14.5px}',
    '.vx-linha .vx-falta b{color:var(--vx-muted);font-weight:600}',
    '.vx-agora{display:inline-block;margin-left:8px;padding:2px 8px;border-radius:999px;background:var(--vx-surface);border:1px solid var(--vx-line);color:var(--vx-ink);font-size:12px;font-weight:700;vertical-align:2px}',
    '.vx-itens{margin:0;padding:0;list-style:none;border-top:1px solid var(--vx-line)}',
    '.vx-itens li{display:flex;align-items:baseline;justify-content:space-between;gap:12px;padding:14px 0;border-bottom:1px solid var(--vx-line);font-size:15.5px}',
    '.vx-itens li span{color:var(--vx-muted);font-size:14px;white-space:nowrap}',
    '.vx-acoes{display:grid;gap:10px;margin-top:30px}',
    '.vx-acoes .vx-btn{margin-top:0}',
    '.vx-caixa{margin-top:24px;padding:18px;border:1px solid var(--vx-line);border-radius:var(--vx-r-caixa);background:var(--vx-surface)}',
    '.vx-caixa p{margin:0;color:var(--vx-muted)}',
    '.vx-caixa p+p{margin-top:6px}',
    '.vx-carregando{display:grid;gap:12px;margin-top:8px}',
    '.vx-carregando i{display:block;height:18px;border-radius:6px;background:var(--vx-surface);animation:vx-pisca 1.2s ease-in-out infinite}',
    '@keyframes vx-pisca{50%{opacity:.45}}',
    'html.vx-travado,html.vx-travado body{overflow:hidden}'
  ].join('\n');
  function injetarCss() {
    if (document.getElementById('vx-estilo')) return;
    document.head.appendChild(h('style', { id: 'vx-estilo', texto: CSS }));
  }

  /* ---------- janela acessível ---------- */
  var M = null; // janela aberta: { fundo, quem }
  function travarFundo(sim) {
    [S.app, document.getElementById('vx-barra')].forEach(function (x) {
      if (!x) return;
      if (sim) { x.setAttribute('inert', ''); x.setAttribute('aria-hidden', 'true'); } else { x.removeAttribute('inert'); x.removeAttribute('aria-hidden'); }
    });
    document.documentElement.classList.toggle('vx-travado', !!sim);
  }
  function focaveis(raiz) {
    return Array.prototype.filter.call(raiz.querySelectorAll('a[href],button:not([disabled]),input:not([disabled]),select,textarea,[tabindex]:not([tabindex="-1"])'), function (e) { return e.offsetParent !== null || e === document.activeElement; });
  }
  function fecharJanela() {
    if (!M) return;
    var j = M; M = null;
    document.removeEventListener('keydown', j.tecla, true);
    j.fundo.remove();
    travarFundo(false);
    if (j.quem && j.quem.isConnected) { try { j.quem.focus({ preventScroll: true }); } catch (e) { j.quem.focus(); } }
    agendarSobreposicao();
  }
  /** Abre uma janela (role=dialog). corpo: elementos já montados. */
  function abrirJanela(titulo, intro, corpo, quem) {
    fecharJanela();
    var idT = 'vx-j-tit', idI = 'vx-j-txt';
    var caixa = h('div', { class: 'vx-modal', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': idT, 'aria-describedby': intro ? idI : null }, [
      h('h2', { id: idT, texto: titulo }),
      intro ? h('p', { id: idI, class: 'vx-intro', texto: intro }) : null
    ].concat(corpo).concat([
      h('button', { class: 'vx-fechar', type: 'button', 'aria-label': 'Fechar', onclick: fecharJanela }, [icone('fechar')])
    ]));
    var fundo = h('div', { class: 'vx vx-fundo' }, [caixa]);
    fundo.addEventListener('mousedown', function (e) { if (e.target === fundo) fecharJanela(); });
    var tecla = function (e) {
      if (!M) return;
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); fecharJanela(); return; }
      if (e.key !== 'Tab') return;
      var f = focaveis(caixa);
      if (!f.length) { e.preventDefault(); return; }
      var a = document.activeElement, i = f.indexOf(a);
      if (e.shiftKey && (i <= 0)) { e.preventDefault(); f[f.length - 1].focus(); }
      else if (!e.shiftKey && (i === f.length - 1 || i < 0)) { e.preventDefault(); f[0].focus(); }
    };
    document.addEventListener('keydown', tecla, true);
    M = { fundo: fundo, quem: quem || document.activeElement, tecla: tecla };
    document.body.appendChild(fundo);
    travarFundo(true);
    var primeiro = caixa.querySelector('input:not([type="radio"]),input:checked') || caixa.querySelector('.vx-fechar');
    // no celular, abrir o teclado de cara cobre a janela: lá o foco vai para o título da janela
    if (window.matchMedia && matchMedia('(pointer: coarse)').matches) { caixa.querySelector('h2').setAttribute('tabindex', '-1'); primeiro = caixa.querySelector('h2'); }
    setTimeout(function () { try { primeiro.focus({ preventScroll: true }); } catch (e) { primeiro.focus(); } }, 30);
    return caixa;
  }

  /* ---------- formulário de contato (lista VIP e avise-me) ---------- */
  function lembrado() { try { return JSON.parse(lerLocal('provador:cliente', true)) || {}; } catch (e) { return {}; } }
  function campo(id, rotulo, at) {
    var erro = h('p', { class: 'vx-erro', id: id + '-erro', 'aria-live': 'polite' });
    var inp = h('input', Object.assign({ id: id, name: id, 'aria-describedby': id + '-erro' }, at));
    return { el: h('div', { class: 'vx-campo' }, [h('label', { for: id, texto: rotulo }), inp, erro]), input: inp, erro: erro };
  }
  function marcarErro(c, msg) { c.erro.textContent = msg || ''; if (msg) c.input.setAttribute('aria-invalid', 'true'); else c.input.removeAttribute('aria-invalid'); }

  /**
   * opts: { botao, enviar(dados) -> Promise, feito: { titulo, texto }, extra?: { el, valor() , erro(msg) } }
   * Em prévia (S.ctx.demo) valida e mostra a mensagem da prévia, sem gravar.
   */
  function formContato(opts) {
    var memo = lembrado();
    var nome = campo('vx-nome', 'Seu nome', { type: 'text', autocomplete: 'name', maxlength: '60', required: true, value: memo.nome || '' });
    var zap = campo('vx-whats', 'WhatsApp com DDD', { type: 'tel', inputmode: 'tel', autocomplete: 'tel-national', maxlength: '16', placeholder: '(67) 99999-9999', required: true, value: memo.whats ? fmtWhats(memo.whats) : '' });
    zap.input.addEventListener('input', function () {
      var d = soWhats(zap.input.value);
      var f = fmtWhats(d);
      if (zap.input.value !== f && d.length <= 11) zap.input.value = f;
    });
    var geral = h('p', { class: 'vx-erro', role: 'alert' });
    var botao = h('button', { class: 'vx-btn', type: 'submit', texto: opts.botao });
    var form = h('form', { class: 'vx-form', novalidate: true }, [
      opts.extra ? opts.extra.el : null, nome.el, zap.el, geral, botao,
      h('p', { class: 'vx-letra', texto: 'Seu número fica só com a loja.' })
    ]);
    function pronto(titulo, texto) {
      var ok = h('div', { class: 'vx-feito', tabindex: '-1', role: 'status' }, [
        h('span', { class: 'vx-selo' }, [icone('check')]),
        h('h3', { texto: titulo }), h('p', { texto: texto }),
        h('button', { class: 'vx-btn vx-btn-ln', type: 'button', texto: 'Fechar', onclick: fecharJanela })
      ]);
      // a explicação do formulário sai junto: fica só o título da janela e a resposta
      if (form.parentNode) Array.prototype.forEach.call(form.parentNode.querySelectorAll('.vx-intro, .vx-previa'), function (x) { x.remove(); });
      form.replaceWith(ok);
      setTimeout(function () { ok.focus(); }, 20);
    }
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      geral.textContent = '';
      var d = { nome: nome.input.value.replace(/\s+/g, ' ').trim(), whats: soWhats(zap.input.value) };
      var errExtra = opts.extra ? opts.extra.validar() : '';
      var eNome = d.nome.length < 2 ? 'Escreva o seu nome.' : '';
      var eZap = !/^[0-9]{10,11}$/.test(d.whats) ? 'Confira o WhatsApp com DDD.' : '';
      marcarErro(nome, eNome); marcarErro(zap, eZap);
      if (opts.extra) opts.extra.erro(errExtra);
      if (errExtra || eNome || eZap) {
        var alvo = errExtra ? opts.extra.foco() : (eNome ? nome.input : zap.input);
        if (alvo) alvo.focus();
        return;
      }
      if (opts.extra) d = Object.assign(d, opts.extra.valor());
      gravarLocal('provador:cliente', JSON.stringify({ nome: d.nome, whats: d.whats }), true);
      if (S.ctx.demo) { pronto('Prévia da loja', MSG_PREVIA); return; }
      botao.disabled = true; botao.textContent = 'Enviando…';
      Promise.resolve().then(function () { return opts.enviar(d); }).then(function (r) {
        if (r && r.demo) pronto('Prévia da loja', MSG_PREVIA);
        else pronto(opts.feito.titulo, opts.feito.texto);
      }).catch(function (err) {
        botao.disabled = false; botao.textContent = opts.botao;
        var campos = (err && err.campos) || [];
        if (campos.indexOf('nome') >= 0) marcarErro(nome, 'Escreva o seu nome.');
        if (campos.indexOf('whats') >= 0) marcarErro(zap, 'Confira o WhatsApp com DDD.');
        if (!campos.length) geral.textContent = 'Não deu para enviar agora. Confira a internet e tente de novo.';
        if (window.console) console.warn('[vitrine] envio:', err && (err.code || err.message || err));
      });
    });
    return form;
  }
  function notaPrevia() { return S.ctx.demo ? h('p', { class: 'vx-previa', texto: 'Prévia da loja: nada é enviado daqui.' }) : null; }

  /* ---------- lista VIP ---------- */
  function abrirVip(e) {
    var quem = e && e.currentTarget;
    var nomeLoja = S.ctx.marca.NOME || 'loja';
    abrirJanela('Lista VIP', 'Receba as novidades antes de abrir para todo mundo.', [
      notaPrevia(),
      formContato({
        botao: 'Entrar na lista VIP',
        enviar: function (d) { return window.Publico.entrarListaVip(S.ctx.lojaId, d); },
        feito: { titulo: 'Você está na lista VIP', texto: 'A ' + nomeLoja + ' vai mandar os lançamentos no seu WhatsApp antes de todo mundo.' }
      })
    ].filter(Boolean), quem);
  }

  /* ---------- avise-me (página do produto) ---------- */
  // a peça que o modelo está mostrando: mesmo critério dos kits (?item= ou a primeira roupa)
  function pecaAtual() {
    var ok = (S.ctx.itens || []).filter(function (i) { return i && i.nome && i.img && CATS[i.cat]; })
      .sort(function (a, b) { return (a.ordem || 0) - (b.ordem || 0); });
    var grupos = {}, ordem = [];
    ok.forEach(function (i) { var k = grupoId(i); if (!grupos[k]) { grupos[k] = []; ordem.push(k); } grupos[k].push(i); });
    var alvo = String(S.ctx.item || ''), porItem = ok.filter(function (i) { return String(i.id) === alvo; })[0];
    var k = grupos[alvo] ? alvo : (porItem ? grupoId(porItem) : '');
    // o modelo 1 não tem página de acessório: cai na primeira roupa, como os outros
    if (k && !S.ctx.porProps && grupos[k][0].cat === 'acessorios') k = '';
    if (!k) k = ordem.filter(function (x) { return grupos[x][0].cat !== 'acessorios'; })[0] || (S.ctx.porProps ? ordem[0] : '');
    return k ? { id: k, nome: String(grupos[k][0].nome).trim(), itens: grupos[k] } : null;
  }
  function corEscolhida() {
    var g = S.app.querySelector('[role="group"][aria-label="Cor"], [role="group"][aria-label="Escolher cor"]');
    var b = g && g.querySelector('[aria-pressed="true"]');
    return b ? String(b.getAttribute('aria-label') || b.textContent || '').trim().toLowerCase() : '';
  }
  function grupoTamanhos() {
    return S.app.querySelector('[role="group"][aria-label="Tamanho"], [role="group"][aria-label="Escolher tamanho"], .tams, .sizes');
  }
  function corDe(i) { return String(i.cor || 'Única').trim(); }
  // tamanhos que a cliente pode pedir para avisar: os de estoque 0; na prévia, os que o modelo mostra como esgotados
  function opcoesAviso(peca, sel) {
    var op = [], varias = peca.itens.length > 1;
    var add = function (i, t) { op.push({ itemId: String(i.id || ''), cor: corDe(i), tam: t, rotulo: (varias ? corDe(i) + ' · ' : '') + nomeTam(t) }); };
    var lista = [sel].concat(peca.itens.filter(function (i) { return i !== sel; }));
    lista.forEach(function (i) {
      // na loja, filtrarItens já separou; na prévia do montador, lê o estoque do rascunho
      var est = i.estoque && typeof i.estoque === 'object' ? i.estoque : {};
      var e = Array.isArray(i.esgotados) ? i.esgotados : (Array.isArray(i.tamanhos) ? i.tamanhos : []).filter(function (t) { return Object.prototype.hasOwnProperty.call(est, t) && semEstoque(est[t]); });
      ordenarTams(e).forEach(function (t) { add(i, t); });
    });
    if (!op.length && S.ctx.demo && sel) {
      var tem = Array.isArray(sel.tamanhos) ? sel.tamanhos : [];
      var fora = sel.cat === 'acessorios' ? [] : PADRAO.filter(function (t) { return tem.length && tem.indexOf(t) < 0; });
      (fora.length ? fora : (tem.length ? ordenarTams(tem) : (sel.cat === 'acessorios' ? ['U'] : PADRAO))).forEach(function (t) { add(sel, t); });
    }
    return op.filter(function (o) { return /^[A-Za-z0-9_-]{1,40}$/.test(o.itemId); });
  }
  function abrirAvise(peca, opcoes, e) {
    var quem = e && e.currentTarget;
    var nomeGrupo = 'vx-tam';
    var erro = h('p', { class: 'vx-erro', id: 'vx-tam-erro', 'aria-live': 'polite' });
    var radios = opcoes.map(function (o, n) {
      return h('label', { class: 'vx-tam' }, [
        h('input', { type: 'radio', name: nomeGrupo, value: String(n), checked: n === 0 && opcoes.length === 1 ? true : null, 'aria-describedby': 'vx-tam-erro' }),
        h('span', { texto: o.rotulo })
      ]);
    });
    var conjunto = h('fieldset', { class: 'vx-tams' }, [h('legend', { class: 'vx-legenda', texto: opcoes.length > 1 ? 'Qual tamanho você quer?' : 'Tamanho' })].concat(radios).concat([erro]));
    var escolhido = function () { var r = conjunto.querySelector('input:checked'); return r ? opcoes[+r.value] : null; };
    var nomeLoja = S.ctx.marca.NOME || 'A loja';
    abrirJanela('Avise-me quando chegar', peca.nome + '. A loja manda uma mensagem no seu WhatsApp quando o tamanho voltar.', [
      notaPrevia(),
      formContato({
        botao: 'Me avise',
        extra: {
          el: conjunto,
          validar: function () { return escolhido() ? '' : 'Escolha o tamanho.'; },
          erro: function (msg) { erro.textContent = msg || ''; },
          foco: function () { return conjunto.querySelector('input'); },
          valor: function () { var o = escolhido(); return { itemId: o.itemId, tam: o.tam, peca: (peca.nome + (o.cor !== 'Única' ? ' ' + o.cor : '')).slice(0, 80) }; }
        },
        enviar: function (d) { return window.Publico.avisarReposicao(S.ctx.lojaId, d); },
        feito: { titulo: 'Pronto, você será avisada', texto: nomeLoja + ' manda uma mensagem no seu WhatsApp quando o tamanho chegar.' }
      })
    ].filter(Boolean), quem);
  }
  function atualizarAvise() {
    var bloco = S.avise;
    var peca = S.ctx.pagina === 'produto' ? pecaAtual() : null;
    var grupo = peca && grupoTamanhos();
    if (!peca || !grupo || !grupo.parentElement) { if (bloco) bloco.remove(); document.documentElement.removeAttribute('data-vx-esgotado'); return; }
    var cor = corEscolhida();
    var sel = peca.itens.filter(function (i) { return corDe(i).toLowerCase() === cor; })[0] || peca.itens[0];
    var todas = peca.itens.every(function (i) { return i.esgotado; });
    var esgotado = !!(sel && sel.esgotado) || todas;
    var opcoes = opcoesAviso(peca, sel);
    var chave = peca.id + '|' + (sel && sel.id) + '|' + esgotado + '|' + opcoes.map(function (o) { return o.itemId + o.tam; }).join(',');
    if (esgotado) document.documentElement.setAttribute('data-vx-esgotado', ''); else document.documentElement.removeAttribute('data-vx-esgotado');
    if (!opcoes.length && !esgotado) { if (bloco) bloco.remove(); S.aviseChave = ''; return; }
    if (!bloco) bloco = S.avise = h('div', { class: 'vx-avise', 'data-vx': '' });
    if (S.aviseChave !== chave) {
      S.aviseChave = chave;
      bloco.textContent = '';
      var abrir = function (e) { abrirAvise(peca, opcoes, e); };
      if (esgotado) {
        var umaCor = peca.itens.length === 1 || todas;
        bloco.appendChild(h('div', { class: 'vx-esgotado', role: 'status' }, [
          h('p', { class: 'vx-esg-tit' }, [h('i', { 'aria-hidden': 'true' }), umaCor ? 'Esgotado' : 'Esgotado nesta cor']),
          h('p', { texto: umaCor ? 'Esta peça acabou. Deixe seu WhatsApp e a loja avisa quando chegar.' : 'Esta cor acabou. Escolha outra cor ou peça para ser avisada quando chegar.' }),
          opcoes.length ? h('button', { class: 'vx-btn', type: 'button', onclick: abrir }, [icone('sino'), 'Avise-me quando chegar']) : null
        ]));
      } else {
        bloco.appendChild(h('button', { class: 'vx-avise-link', type: 'button', onclick: abrir }, [
          icone('sino'), h('span', { texto: 'Não achou o seu tamanho?' }), h('strong', { texto: 'Avise-me quando chegar' })
        ]));
      }
    }
    // o bloco fica no fim do grupo dos tamanhos; se o modelo redesenhar e tirar, ele volta
    var pai = grupo.parentElement;
    if (bloco.parentNode !== pai || bloco !== pai.lastElementChild) pai.appendChild(bloco);
  }
  // segurança extra: com a peça esgotada, "Adicionar à sacola" abre o avise-me em vez de pôr na sacola
  function guardaCompra(e) {
    if (!document.documentElement.hasAttribute('data-vx-esgotado')) return;
    var b = e.target && e.target.closest && e.target.closest('#app .compra .btn, #app .actions > button.btn:not(.ghost)');
    if (!b) return;
    e.preventDefault(); e.stopPropagation();
    var a = S.avise && S.avise.querySelector('button');
    if (a) a.click();
  }

  /* ---------- instalar a loja ---------- */
  function ehIos() { return /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1); }
  function ehAndroid() { return /Android/i.test(navigator.userAgent); }
  function instalada() { return S.instalada || (window.matchMedia && matchMedia('(display-mode: standalone)').matches) || navigator.standalone === true; }
  function noIframe() { try { return window.self !== window.top; } catch (e) { return true; } }
  function iniciais() {
    var m = S.ctx.marca || {}, i = String(m.INICIAIS || '').replace(/[^A-Za-zÀ-ú0-9]/g, '').slice(0, 2);
    if (!i) i = String(m.MARCA || m.NOME || 'Loja').split(/\s+/).map(function (p) { return p.charAt(0); }).join('').slice(0, 2);
    return (i || 'LJ').toUpperCase();
  }
  function desenharIcone(tam, margem) {
    var c = document.createElement('canvas'); c.width = c.height = tam;
    var g = c.getContext('2d'); if (!g) return '';
    var cores = S.cores || CORES_PADRAO;
    g.fillStyle = cores.accent; g.fillRect(0, 0, tam, tam);
    var txt = iniciais(), corpo = Math.round(tam * (txt.length > 1 ? 0.36 : 0.46) * (margem ? 0.82 : 1));
    var fam = String(getComputedStyle(document.documentElement).getPropertyValue('--vx-font-tit') || 'system-ui').trim();
    if (!fam || /^var\(/.test(fam)) fam = String(getComputedStyle(document.documentElement).getPropertyValue('--vx-font') || 'system-ui').trim();
    g.fillStyle = cores.onAccent; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = '700 ' + corpo + 'px ' + fam;
    g.fillText(txt, tam / 2, tam / 2 + corpo * 0.04, tam * 0.8);
    try { return c.toDataURL('image/png'); } catch (e) { return ''; }
  }
  function linkHead(rel, href, extra) {
    var l = document.head.querySelector('link[rel="' + rel + '"]');
    if (!l) { l = h('link', { rel: rel }); document.head.appendChild(l); }
    Object.keys(extra || {}).forEach(function (k) { l.setAttribute(k, extra[k]); });
    l.href = href;
  }
  function metaHead(nome, valor) {
    var m = document.head.querySelector('meta[name="' + nome + '"]');
    if (!m) { m = h('meta', { name: nome }); document.head.appendChild(m); }
    m.setAttribute('content', valor);
  }
  // manifest da própria loja (nome, ícone e endereço com ?l=), para instalar como app da loja e não da plataforma
  function prepararManifest() {
    var ctx = S.ctx, m = ctx.marca || {};
    var i192 = desenharIcone(192), i512 = desenharIcone(512), mask = desenharIcone(512, true), i180 = desenharIcone(180);
    S.icone = i192;
    if (!ctx.loja || ctx.demo || !ctx.slug) return; // na demonstração fica o manifest da plataforma
    var inicio = new URL('vitrine.html?l=' + encodeURIComponent(ctx.slug), location.href).href;
    var cores = S.cores || CORES_PADRAO;
    var man = {
      id: inicio, name: String(m.NOME || 'Loja').slice(0, 60), short_name: String(m.MARCA || m.NOME || 'Loja').slice(0, 12), lang: 'pt-BR',
      description: 'Loja ' + String(m.NOME || ''), start_url: inicio, scope: new URL('./', location.href).href, display: 'standalone',
      background_color: rgbTxt(cores.bg), theme_color: rgbTxt(cores.bg),
      icons: [{ src: i192, sizes: '192x192', type: 'image/png', purpose: 'any' }, { src: i512, sizes: '512x512', type: 'image/png', purpose: 'any' }, { src: mask, sizes: '512x512', type: 'image/png', purpose: 'maskable' }]
    };
    try {
      linkHead('manifest', URL.createObjectURL(new Blob([JSON.stringify(man)], { type: 'application/manifest+json' })));
    } catch (e) { /* sem Blob: fica o manifest da plataforma */ }
    if (i180) linkHead('apple-touch-icon', i180, { sizes: '180x180' });
    metaHead('apple-mobile-web-app-title', String(m.MARCA || m.NOME || 'Loja').slice(0, 30));
    metaHead('mobile-web-app-capable', 'yes');
    metaHead('apple-mobile-web-app-capable', 'yes');
    metaHead('theme-color', rgbTxt(cores.bg));
    // o Chrome mais antigo só oferece instalar com service worker (o sw.js só guarda fontes e imagens)
    if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(function () { /* segue sem */ });
  }
  function rgbTxt(cor) { var c = rgb(cor); return '#' + c.map(function (v) { return ('0' + Math.round(v).toString(16)).slice(-2); }).join(''); }
  function podeInstalar() {
    if (instalada() || noIframe()) return false;
    if (S.adiado && !S.ctx.demo) return true;
    return ehIos() || ehAndroid();
  }
  function instalar(e) {
    var quem = e && e.currentTarget;
    if (S.adiado && !S.ctx.demo) {
      var ev = S.adiado; S.adiado = null;
      ev.prompt();
      Promise.resolve(ev.userChoice).then(function (r) { if (r && r.outcome === 'accepted') S.instalada = true; atualizarBarra(); }).catch(function () { atualizarBarra(); });
      return;
    }
    var m = S.ctx.marca || {};
    var corpo = [
      h('div', { class: 'vx-app' }, [S.icone ? h('img', { src: S.icone, alt: '', width: '60', height: '60' }) : null, h('div', {}, [h('b', { texto: m.NOME || 'Loja' }), h('span', { texto: 'Abre direto na loja, como um app.' })])])
    ];
    var passos;
    if (ehIos() || !ehAndroid()) {
      passos = h('ol', { class: 'vx-passos', 'aria-label': 'No iPhone' }, [
        h('li', {}, [h('span', {}, ['Toque em ', h('b', { texto: 'Compartilhar' }), ' ', icone('compartilhar'), ' na barra do Safari.'])]),
        h('li', {}, [h('span', {}, ['Escolha ', h('b', { texto: 'Adicionar à Tela de Início' }), '.'])]),
        h('li', {}, [h('span', {}, ['Toque em ', h('b', { texto: 'Adicionar' }), '. O ícone da loja aparece na sua tela.'])])
      ]);
    } else {
      passos = h('ol', { class: 'vx-passos', 'aria-label': 'No Android' }, [
        h('li', {}, [h('span', {}, ['Toque no menu ', icone('pontos'), ' do navegador.'])]),
        h('li', {}, [h('span', {}, ['Escolha ', h('b', { texto: 'Instalar app' }), ' ou ', h('b', { texto: 'Adicionar à tela inicial' }), '.'])]),
        h('li', {}, [h('span', {}, ['Confirme. O ícone da loja aparece na sua tela.'])])
      ]);
    }
    corpo.push(passos);
    if (S.ctx.demo) corpo.push(h('p', { class: 'vx-previa', texto: 'Prévia: na sua loja de verdade, o ícone abre direto na sua loja.' }));
    corpo.push(h('button', { class: 'vx-btn vx-btn-ln', type: 'button', texto: 'Entendi', onclick: fecharJanela }));
    abrirJanela('Instalar a loja', 'Tenha a loja na tela do celular.', corpo, quem);
  }
  window.addEventListener('beforeinstallprompt', function (e) { e.preventDefault(); S.adiado = e; if (S.montado) atualizarBarra(); });
  window.addEventListener('appinstalled', function () { S.instalada = true; S.adiado = null; if (S.montado) atualizarBarra(); });

  /* ---------- botões fixos (Lista VIP e Instalar) ---------- */
  function montarBarra() {
    var vip = h('button', { class: 'vx-pilula vx-vip', type: 'button', 'aria-haspopup': 'dialog', onclick: abrirVip }, [icone('estrela'), h('span', { texto: 'Lista VIP' })]);
    var inst = h('button', { class: 'vx-pilula vx-inst', type: 'button', 'aria-haspopup': 'dialog', hidden: true, onclick: instalar }, [icone('baixar'), h('span', { texto: 'Instalar a loja' })]);
    S.barra = h('div', { class: 'vx vx-barra', id: 'vx-barra' }, [vip, inst]);
    S.btnInst = inst;
    document.body.appendChild(S.barra);
    atualizarBarra();
  }
  function atualizarBarra() {
    if (!S.btnInst) return;
    S.btnInst.hidden = !podeInstalar();
    agendarSobreposicao();
  }
  function cruza(a, b, folga) { return a.left < b.right + folga && a.right > b.left - folga && a.top < b.bottom + folga && a.bottom > b.top - folga; }
  var pedidoSob = 0;
  function agendarSobreposicao() { if (!pedidoSob) pedidoSob = requestAnimationFrame(sobreposicao); }
  // o botão fixo nunca fica na frente da compra, do WhatsApp nem de formulários: sai enquanto encosta neles
  function sobreposicao() {
    pedidoSob = 0;
    var b = S.barra; if (!b || !S.app) return;
    // com o foco num dos botões (teclado), ele fica à vista
    var esconder = false;
    if (!b.contains(document.activeElement)) {
      var rb = b.getBoundingClientRect();
      if (!rb.width) { b.classList.add('vx-recuado'); rb = b.getBoundingClientRect(); b.classList.remove('vx-recuado'); }
      var alvos = S.app.querySelectorAll(PROTEGIDOS);
      for (var n = 0; n < alvos.length && !esconder; n++) {
        var r = alvos[n].getBoundingClientRect();
        if (r.width && r.height && r.bottom > 0 && r.top < innerHeight && cruza(rb, r, 6)) esconder = true;
      }
    }
    b.classList.toggle('vx-recuado', esconder);
  }

  /* ---------- acompanhar pedido ---------- */
  function exemploPedido() {
    var ex = (S.ctx.itens || []).filter(function (i) { return i && i.nome; }).slice(0, 2).map(function (i) { return { nome: i.nome + (i.cor ? ' ' + String(i.cor).toLowerCase() : ''), tam: (i.tamanhos || [])[1] || (i.tamanhos || [])[0] || 'M', qtd: 1 }; });
    if (!ex.length) ex = [{ nome: 'Conjunto Essencial preto', tam: 'M', qtd: 1 }, { nome: 'Top Nadador', tam: 'P', qtd: 2 }];
    return { numero: '1042', status: 'enviado', itens: ex, loja: S.ctx.marca.NOME, atualizadoEm: new Date().toISOString(), exemplo: true };
  }
  function quando(iso) {
    var d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    return 'Atualizado em ' + d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) + ' às ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  }
  function abrirAcompanhar() {
    var ctx = S.ctx, m = ctx.marca || {}, token = String(ctx.params.acompanhar || '');
    var corpo = h('div', { class: 'vx-wrap vx-pag-corpo' });
    var pag = h('div', { class: 'vx vx-pagina', role: 'main', 'aria-labelledby': 'vx-pag-tit' }, [
      h('header', { class: 'vx-pag-topo' }, [h('div', { class: 'vx-wrap' }, [
        h('span', { class: 'vx-marca', texto: m.NOME || 'Loja' }),
        h('a', { class: 'vx-ver-loja', href: ctx.links.inicio || 'vitrine.html' }, [icone('voltar'), 'Ver a loja'])
      ])]),
      corpo
    ]);
    S.pagina = pag;
    document.body.appendChild(pag);
    // a página do pedido fica no lugar da vitrine (o modelo continua carregado, escondido)
    if (S.app) { S.app.setAttribute('inert', ''); S.app.setAttribute('aria-hidden', 'true'); }
    document.documentElement.classList.add('vx-acompanhar');
    window.scrollTo(0, 0);
    var titulo = h('h1', { id: 'vx-pag-tit', tabindex: '-1', texto: 'Seu pedido' });
    corpo.appendChild(h('p', { class: 'vx-kicker', texto: 'Acompanhar pedido' }));
    corpo.appendChild(titulo);
    corpo.appendChild(h('div', { class: 'vx-carregando', 'aria-label': 'Carregando o pedido' }, [h('i', { style: 'width:46%' }), h('i', { style: 'width:78%' }), h('i', { style: 'width:62%' })]));
    document.title = 'Acompanhar pedido · ' + (m.NOME || 'Loja');
    setTimeout(function () { titulo.focus({ preventScroll: true }); }, 30);

    var ler;
    if (!/^[A-Za-z0-9]{20,40}$/.test(token)) ler = Promise.resolve(null);
    else if (ctx.demo && !(window.Plataforma && window.Plataforma.modo === 'demo')) ler = Promise.resolve({ demo: true });
    else ler = window.Publico ? window.Publico.lerAcompanhamento(token) : Promise.resolve({ demo: true });
    ler.then(function (d) {
      if (d && d.demo && !d.status) d = exemploPedido();
      else if (d && !ctx.demo && ctx.slug && d.slug && d.slug !== ctx.slug) d = null; // o link é de outra loja
      desenharPedido(corpo, titulo, d);
    }).catch(function (err) {
      if (window.console) console.warn('[vitrine] acompanhar:', err && (err.code || err.message || err));
      desenharPedido(corpo, titulo, undefined);
    });
  }
  function desenharPedido(corpo, titulo, d) {
    var ctx = S.ctx, m = ctx.marca || {};
    Array.prototype.slice.call(corpo.querySelectorAll('.vx-carregando')).forEach(function (x) { x.remove(); });
    var zapN = ctx.demo ? '' : numeroWhats(m.WHATS);
    if (!d) {
      titulo.textContent = d === null ? 'Pedido não encontrado' : 'Não deu para abrir o pedido';
      corpo.appendChild(h('div', { class: 'vx-caixa' }, [
        h('p', { texto: d === null ? 'Confira se o link está completo, do jeito que a loja mandou.' : 'Confira a internet e tente de novo em instantes.' })
      ]));
      var acoes0 = h('div', { class: 'vx-acoes' });
      if (d !== null) acoes0.appendChild(h('button', { class: 'vx-btn', type: 'button', texto: 'Tentar de novo', onclick: function () { location.reload(); } }));
      if (zapN) acoes0.appendChild(h('a', { class: 'vx-btn' + (d !== null ? ' vx-btn-ln' : ''), href: 'https://wa.me/' + zapN + '?text=' + encodeURIComponent('Olá! Quero saber do meu pedido.'), target: '_blank', rel: 'noopener' }, [icone('zap'), 'Falar com a loja no WhatsApp']));
      if (acoes0.childNodes.length) corpo.appendChild(acoes0);
      return;
    }
    var numero = String(d.numero || '').slice(0, 12);
    titulo.textContent = numero ? 'Pedido nº ' + numero : 'Seu pedido';
    document.title = titulo.textContent + ' · ' + (m.NOME || d.loja || 'Loja');
    var st = String(d.status || 'pago'), idx = ETAPAS.map(function (e) { return e[0]; }).indexOf(st);
    if (st === 'cancelado') {
      corpo.appendChild(h('p', {}, [h('span', { class: 'vx-situacao vx-cancelado', texto: 'Pedido cancelado' })]));
      corpo.appendChild(h('div', { class: 'vx-caixa' }, [h('p', { texto: 'Este pedido foi cancelado. Se tiver dúvida, fale com a loja.' })]));
    } else {
      if (idx < 0) idx = 0;
      corpo.appendChild(h('p', {}, [h('span', { class: 'vx-situacao', texto: ETAPAS[idx][1] })]));
      var q = quando(d.atualizadoEm); if (q) corpo.appendChild(h('p', { class: 'vx-quando', texto: q }));
      corpo.appendChild(h('ol', { class: 'vx-linha', 'aria-label': 'Andamento do pedido' }, ETAPAS.map(function (e, n) {
        var cls = n < idx ? 'vx-passou' : (n === idx ? 'vx-feita vx-atual' : 'vx-falta');
        return h('li', { class: cls, 'aria-current': n === idx ? 'step' : null }, [
          h('span', { class: 'vx-marco', 'aria-hidden': 'true' }, n <= idx ? [icone('check')] : []),
          h('div', {}, [
            h('b', {}, [e[1], n === idx ? h('span', { class: 'vx-agora', texto: 'Agora' }) : null]),
            h('span', { class: 'vx-desc', texto: n <= idx ? e[2] : 'Ainda não.' }),
            n > idx ? h('span', { class: 'vx-sr', texto: '(próxima etapa)' }) : null
          ])
        ]);
      })));
      var itens = Array.isArray(d.itens) ? d.itens.slice(0, 30) : [];
      if (itens.length) {
        corpo.appendChild(h('h2', { texto: 'Itens' }));
        corpo.appendChild(h('ul', { class: 'vx-itens' }, itens.map(function (i) {
          var qtd = Math.max(1, parseInt(i && i.qtd, 10) || 1), t = String((i && i.tam) || '');
          return h('li', {}, [h('b', { texto: qtd + '× ' + String((i && i.nome) || 'Peça').slice(0, 80) }), t ? h('span', { texto: t === 'U' ? 'Tamanho único' : 'Tamanho ' + t.slice(0, 4) }) : null]);
        })));
      }
    }
    if (d.exemplo) corpo.appendChild(h('div', { class: 'vx-caixa' }, [h('p', { texto: 'Exemplo de pedido. Na sua loja de verdade, a cliente vê aqui o pedido dela, pelo link que você manda.' })]));
    var acoes = h('div', { class: 'vx-acoes' });
    if (zapN) acoes.appendChild(h('a', { class: 'vx-btn', href: 'https://wa.me/' + zapN + '?text=' + encodeURIComponent('Olá! Quero saber do meu pedido' + (numero ? ' nº ' + numero : '') + '.'), target: '_blank', rel: 'noopener' }, [icone('zap'), 'Falar com a loja no WhatsApp']));
    acoes.appendChild(h('a', { class: 'vx-btn' + (zapN ? ' vx-btn-ln' : ''), href: ctx.links.inicio || 'vitrine.html', texto: 'Ver a loja' }));
    corpo.appendChild(acoes);
  }

  /* ---------- montagem ---------- */
  function nota(txt) {
    var n = h('div', { class: 'vx vx-nota', role: 'status', texto: txt });
    document.body.appendChild(n);
    setTimeout(function () { n.remove(); }, 6000);
  }
  var pedidoAt = false;
  function agendar() { if (pedidoAt) return; pedidoAt = true; Promise.resolve().then(function () { pedidoAt = false; atualizar(); }); }
  function atualizar() {
    if (!S.ctx) return;
    aplicarCores();
    if (S.pagina) return;
    atualizarAvise();
    agendarSobreposicao();
  }

  /**
   * Monta os extras por cima do modelo já desenhado.
   * ctx: { loja, lojaId, slug, params, pagina, demo, rascunho, item, itens, marca, links, porProps }
   */
  function montar(ctx) {
    ctx = ctx || {};
    S.ctx = {
      loja: ctx.loja || null, lojaId: String(ctx.lojaId || ''), slug: String(ctx.slug || ''), params: ctx.params || {}, pagina: ctx.pagina || 'inicio',
      demo: ctx.demo !== false, rascunho: !!ctx.rascunho, item: String(ctx.item || ''), itens: Array.isArray(ctx.itens) ? ctx.itens : [],
      marca: ctx.marca || {}, links: ctx.links || {}, porProps: !!ctx.porProps
    };
    S.app = document.getElementById('app');
    if (!S.app || S.montado) { atualizar(); return; }
    S.montado = true;
    injetarCss();
    aplicarCores();
    // ícone e manifest depois das fontes do modelo (as iniciais saem na letra da loja); sem resposta em 1,5 s, vai assim mesmo
    var feito = false, manifest = function () { if (feito) return; feito = true; S.coresTxt = ''; S.coresChave = ''; aplicarCores(); prepararManifest(); atualizarBarra(); };
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(manifest, manifest);
    setTimeout(manifest, 1500);
    // o modelo redesenha a tela a cada clique: os extras acompanham (cor escolhida, tema claro/escuro)
    new MutationObserver(agendar).observe(S.app, { childList: true, subtree: true, attributes: true, attributeFilter: ['aria-pressed', 'data-theme', 'class'] });
    // estilos e fontes do modelo chegam depois do primeiro desenho (o layout e a letra mudam sem rolar a página)
    if (window.ResizeObserver) new ResizeObserver(agendar).observe(S.app);
    window.addEventListener('load', agendar);
    Array.prototype.forEach.call(document.querySelectorAll('link[rel="stylesheet"]'), function (l) { if (!l.sheet) l.addEventListener('load', agendar); });
    if (S.ctx.params.acompanhar) { abrirAcompanhar(); return; }
    montarBarra();
    document.addEventListener('click', guardaCompra, true);
    window.addEventListener('scroll', agendarSobreposicao, { passive: true });
    window.addEventListener('resize', agendarSobreposicao);
    atualizar();
    if (S.vipAtivo && !S.ctx.demo) nota('Acesso VIP liberado: os lançamentos já aparecem para você.');
  }

  window.VitrineExtras = { filtrarItens: filtrarItens, montar: montar, sha256: sha256, fecharJanela: fecharJanela };
})();
