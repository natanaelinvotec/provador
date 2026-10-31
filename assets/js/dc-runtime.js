/*
 * dc-runtime.js — roda as telas do mockup (.dc.html) como páginas de verdade.
 *
 * Entende o formato do canvas: <x-dc> com <helmet> (estilos e fontes), template com
 * {{caminho}}, <sc-for list as>, <sc-if value>, eventos onClick/onChange/... e uma
 * classe `Component extends DCLogic` com renderVals(), setState() e ciclo de vida.
 * A tela é redesenhada comparando a árvore nova com o DOM atual (sem recriar tudo),
 * então foco, rolagem e animações de entrada continuam como no mockup.
 */
(function (global) {
  'use strict';

  var VOID = { img: 1, input: 1, br: 1, meta: 1, link: 1, hr: 1, source: 1, area: 1, col: 1, wbr: 1, base: 1, embed: 1, track: 1 };
  var SVG_NS = 'http://www.w3.org/2000/svg';
  var TEXT_INPUT = /^(text|search|email|tel|url|password|number|date|time|datetime-local|month|week)$/;

  /* ---------- leitura do template ---------- */
  function parse(src) {
    var root = { lt: '#root', children: [] }, stack = [root], last = 0, m;
    var re = /<!--[\s\S]*?-->|<\/([a-zA-Z0-9-]+)\s*>|<([a-zA-Z][a-zA-Z0-9-]*)((?:\s+[^\s=>\/]+(?:\s*=\s*(?:"[^"]*"|'[^']*'))?)*)\s*(\/?)>/g;
    while ((m = re.exec(src))) {
      if (m.index > last) stack[stack.length - 1].children.push({ text: src.slice(last, m.index) });
      last = re.lastIndex;
      if (m[0].indexOf('<!--') === 0) continue;
      if (m[1]) {
        var t = m[1].toLowerCase();
        for (var k = stack.length - 1; k > 0; k--) { if (stack[k].lt === t) { stack.length = k; break; } }
        continue;
      }
      var attrs = [], ar = /([^\s=>\/]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'))?/g, a;
      while ((a = ar.exec(m[3]))) attrs.push([a[1], a[2] !== undefined ? decode(a[2]) : (a[3] !== undefined ? decode(a[3]) : null)]);
      var node = { tag: m[2], lt: m[2].toLowerCase(), attrs: attrs, children: [] };
      stack[stack.length - 1].children.push(node);
      if (!VOID[node.lt] && !m[4]) stack.push(node);
    }
    if (last < src.length) stack[stack.length - 1].children.push({ text: src.slice(last) });
    return root.children;
  }

  var ENT = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', middot: '·', mdash: '—', ndash: '–', hellip: '…', copy: '©', times: '×', minus: '−', rarr: '→', larr: '←' };
  function decode(s) {
    if (s.indexOf('&') < 0) return s;
    return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, function (all, e) {
      if (e[0] === '#') return String.fromCodePoint(e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10));
      return ENT[e.toLowerCase()] !== undefined ? ENT[e.toLowerCase()] : all;
    });
  }

  function get(scope, path) {
    path = path.trim();
    if (path === 'true') return true;
    if (path === 'false') return false;
    if (/^-?\d+(\.\d+)?$/.test(path)) return +path;
    var parts = path.split('.'), v = scope[parts[0]];
    for (var k = 1; k < parts.length; k++) { if (v == null) return undefined; v = v[parts[k]]; }
    return v;
  }
  function interp(str, scope) {
    if (str.indexOf('{{') < 0) return str;
    return str.replace(/\{\{([^}]+)\}\}/g, function (_, p) {
      var v = get(scope, p);
      return (v == null || typeof v === 'function') ? '' : String(v);
    });
  }

  /* ---------- árvore virtual ---------- */
  function build(nodes, scope, out) {
    for (var i = 0; i < nodes.length; i++) {
      var n = nodes[i];
      if (n.text !== undefined) {
        var txt = interp(n.text, scope);
        if (txt !== '') out.push({ text: decode(txt) });
        continue;
      }
      var at = {}, j;
      for (j = 0; j < n.attrs.length; j++) at[n.attrs[j][0]] = n.attrs[j][1];
      if (n.lt === 'sc-for') {
        var w = (at.list || '').match(/^\{\{([^}]+)\}\}$/);
        var list = w ? get(scope, w[1]) : null, as = at.as || 'item';
        if (list && list.length) {
          for (var q = 0; q < list.length; q++) {
            var s2 = Object.create(scope);
            s2[as] = list[q]; s2.$index = q;
            build(n.children, s2, out);
          }
        }
        continue;
      }
      if (n.lt === 'sc-if') {
        var w2 = (at.value || '').match(/^\{\{([^}]+)\}\}$/);
        var val = w2 ? get(scope, w2[1]) : at.value;
        if (val) build(n.children, scope, out);
        continue;
      }
      var v = { tag: n.tag, lt: n.lt, attrs: {}, events: {}, children: [] };
      for (j = 0; j < n.attrs.length; j++) {
        var k = n.attrs[j][0], raw = n.attrs[j][1];
        if (k.indexOf('hint-') === 0) continue;
        if (/^on[A-Z]/.test(k)) {
          var we = raw && raw.match(/^\{\{([^}]+)\}\}$/);
          var fn = we ? get(scope, we[1]) : null;
          if (typeof fn === 'function') v.events[k.slice(2).toLowerCase()] = fn;
          continue;
        }
        if (raw === null) { v.attrs[k] = ''; continue; }
        var whole = raw.match(/^\{\{([^}]+)\}\}$/);
        if (whole) {
          var x = get(scope, whole[1]);
          var aria = k.indexOf('aria-') === 0;
          if (typeof x === 'function') continue;
          if (x === false || x == null) { if (aria) v.attrs[k] = 'false'; continue; }
          if (x === true) { v.attrs[k] = aria ? 'true' : ''; continue; }
          v.attrs[k] = String(x);
          continue;
        }
        v.attrs[k] = interp(raw, scope);
      }
      build(n.children, scope, v.children);
      out.push(v);
    }
    return out;
  }

  /* ---------- DOM ---------- */
  function eventName(v, name) {
    if (name !== 'change') return name;
    var tag = v.lt, type = (v.attrs.type || 'text').toLowerCase();
    if (tag === 'textarea' || (tag === 'input' && TEXT_INPUT.test(type))) return 'input';
    return 'change';
  }
  function dispatcher(e) {
    var el = e.currentTarget, fn = el.__ev && el.__ev[e.type];
    if (e.type === 'submit') e.preventDefault();
    if (fn) fn(e);
  }
  function setEvents(el, v) {
    var want = {}, k;
    for (k in v.events) want[eventName(v, k)] = v.events[k];
    el.__ev = el.__ev || {};
    el.__on = el.__on || {};
    for (k in want) {
      if (!el.__on[k]) { el.addEventListener(k, dispatcher); el.__on[k] = true; }
      el.__ev[k] = want[k];
    }
    for (k in el.__ev) if (!(k in want)) el.__ev[k] = null;
    if (v.lt === 'form' && !el.__on.submit) { el.addEventListener('submit', dispatcher); el.__on.submit = true; }
  }
  function setAttr(el, k, val) {
    if (k === 'value' && ('value' in el)) { if (document.activeElement !== el && el.value !== val) el.value = val; }
    else if (k === 'checked') el.checked = true;
    else if (k === 'selected') el.selected = true;
    if (el.getAttribute(k) !== val) {
      try { el.setAttribute(k, val); } catch (err) { /* atributo inválido no template: ignora */ }
    }
  }
  function removeAttr(el, k) {
    el.removeAttribute(k);
    if (k === 'checked') el.checked = false;
    else if (k === 'selected') el.selected = false;
    else if (k === 'disabled') el.disabled = false;
  }
  function create(v, inSvg) {
    if (v.text !== undefined) return document.createTextNode(v.text);
    var svg = inSvg || v.lt === 'svg';
    var el = svg ? document.createElementNS(SVG_NS, v.tag) : document.createElement(v.tag);
    for (var k in v.attrs) setAttr(el, k, v.attrs[k]);
    setEvents(el, v);
    var childSvg = svg && v.lt !== 'foreignobject';
    for (var i = 0; i < v.children.length; i++) el.appendChild(create(v.children[i], childSvg));
    el.__v = v;
    return el;
  }
  function patch(parent, newKids, inSvg) {
    var old = parent.childNodes, i;
    for (i = 0; i < newKids.length; i++) {
      var nv = newKids[i], cur = old[i];
      if (!cur) { parent.appendChild(create(nv, inSvg)); continue; }
      if (nv.text !== undefined) {
        if (cur.nodeType === 3) { if (cur.nodeValue !== nv.text) cur.nodeValue = nv.text; }
        else parent.replaceChild(create(nv, inSvg), cur);
        continue;
      }
      if (cur.nodeType !== 1 || !cur.__v || cur.__v.lt !== nv.lt) { parent.replaceChild(create(nv, inSvg), cur); continue; }
      var ov = cur.__v, k;
      for (k in ov.attrs) if (!(k in nv.attrs)) removeAttr(cur, k);
      for (k in nv.attrs) if (ov.attrs[k] !== nv.attrs[k] || k === 'value') setAttr(cur, k, nv.attrs[k]);
      setEvents(cur, nv);
      var svg = inSvg || nv.lt === 'svg';
      patch(cur, nv.children, svg && nv.lt !== 'foreignobject');
      cur.__v = nv;
    }
    while (old.length > newKids.length) parent.removeChild(parent.lastChild);
  }

  /* ---------- arquivo .dc.html ---------- */
  function split(src) {
    var a = src.indexOf('<x-dc>'), b = src.indexOf('</x-dc>');
    var xdc = a >= 0 ? src.slice(a + 6, b) : src;
    var h0 = xdc.indexOf('<helmet>'), h1 = xdc.indexOf('</helmet>');
    var helmet = h0 >= 0 ? xdc.slice(h0 + 8, h1) : '';
    var tpl = h0 >= 0 ? xdc.slice(0, h0) + xdc.slice(h1 + 9) : xdc;
    var sm = src.match(/<script type="text\/x-dc"([^>]*)>([\s\S]*?)<\/script>/);
    var props = {};
    if (sm) {
      var pm = sm[1].match(/data-props='([^']*)'/);
      if (pm) { try { var def = JSON.parse(decode(pm[1])); for (var k in def) if (k[0] !== '$' && def[k] && 'default' in def[k]) props[k] = def[k].default; } catch (e) { /* props opcionais */ } }
    }
    var tm = src.match(/<title>([\s\S]*?)<\/title>/);
    return { helmet: helmet, template: tpl, code: sm ? sm[2] : '', props: props, title: tm ? decode(tm[1]) : '' };
  }

  function DCLogic() { this.state = undefined; this.props = {}; }
  DCLogic.prototype.setState = function (o) {
    var next = typeof o === 'function' ? o(this.state || {}) : o;
    this.state = Object.assign({}, this.state || {}, next);
    if (this.__schedule) this.__schedule();
  };

  function injectHelmet(helmet, key) {
    var holder = document.createElement('div');
    holder.innerHTML = helmet; // conteúdo do próprio mockup (arquivo nosso, não vem do usuário)
    Array.prototype.slice.call(holder.children).forEach(function (n) {
      n.setAttribute('data-dc', key);
      document.head.appendChild(n);
    });
  }

  /**
   * Monta uma tela. `src` é o texto do .dc.html (já com as trocas da loja aplicadas).
   * Devolve { component, render, destroy }.
   */
  function mount(src, target, opts) {
    opts = opts || {};
    var parts = split(src);
    if (opts.title !== false && parts.title) document.title = opts.title || parts.title;
    injectHelmet(parts.helmet, opts.key || 'dc');
    var tree = parse(parts.template);
    var Component = new Function('DCLogic', parts.code + '\n;return Component;')(DCLogic);
    var c = new Component();
    c.props = Object.assign({}, parts.props, opts.props || {});
    if (opts.state) c.state = Object.assign({}, opts.state);
    var queued = false;
    function render() {
      queued = false;
      var vals = c.renderVals();
      patch(target, build(tree, vals, []), false);
      if (opts.afterRender) opts.afterRender(target, vals, c);
    }
    c.__schedule = function () {
      if (queued) return;
      queued = true;
      (global.queueMicrotask || setTimeout)(render);
    };
    render();
    if (typeof c.componentDidMount === 'function') c.componentDidMount();
    global.addEventListener('pagehide', function () { if (typeof c.componentWillUnmount === 'function') c.componentWillUnmount(); });
    return { component: c, render: render };
  }

  global.DCRuntime = { mount: mount, parse: parse, build: build, split: split, DCLogic: DCLogic };
})(window);
