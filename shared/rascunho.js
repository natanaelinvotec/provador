/* rascunho.js — o montador guarda a loja em construção neste navegador (IndexedDB aguenta as fotos).
 * A prévia (vitrine.html?rascunho=1) lê daqui. Nada sai do aparelho até a pessoa publicar. */
(function (root) {
  'use strict';
  var DB = 'provador', ST = 'rascunho', KEY = 'atual';
  function abrir() {
    return new Promise(function (ok, erro) {
      var r = indexedDB.open(DB, 1);
      r.onupgradeneeded = function () { r.result.createObjectStore(ST); };
      r.onsuccess = function () { ok(r.result); };
      r.onerror = function () { erro(r.error); };
    });
  }
  function tx(modo, fn) {
    return abrir().then(function (db) {
      return new Promise(function (ok, erro) {
        var t = db.transaction(ST, modo), req = fn(t.objectStore(ST));
        t.oncomplete = function () { ok(req && req.result); };
        t.onerror = function () { erro(t.error); };
      });
    });
  }
  root.Rascunho = {
    ler: function () { return tx('readonly', function (s) { return s.get(KEY); }).catch(function () { return null; }); },
    gravar: function (v) { return tx('readwrite', function (s) { return s.put(v, KEY); }); },
    apagar: function () { return tx('readwrite', function (s) { return s.delete(KEY); }); }
  };
})(typeof self !== 'undefined' ? self : this);
