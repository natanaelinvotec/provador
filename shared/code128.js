/*
 * code128.js — código de barras Code 128 (conjunto B), o mesmo já conferido em assets/js/provador-pagina.js.
 * Serve para as etiquetas do painel da loja (leitores USB/Bluetooth e a câmera leem direto).
 *
 *   Code128.desenhar(svgElemento, 'K7Q2ZA-M')   desenha as barras dentro de um <svg> existente
 *   Code128.svg('K7Q2ZA-M', { altura: 40 })      devolve o <svg> pronto em texto (para montar HTML)
 *   Code128.codificar('K7Q2ZA-M')                larguras dos módulos (barra, espaço, barra...)
 */
(function () {
  'use strict';
  // largura de barras e espaços de cada símbolo (0 a 106); o último é o "stop" (com a barra final)
  var padroes = ('212222 222122 222221 121223 121322 131222 122213 122312 132212 221213 221312 231212 112232 122132 122231 113222 123122 123221 223211 221132 ' +
    '221231 213212 223112 312131 311222 321122 321221 312212 322112 322211 212123 212321 232121 111323 131123 131321 112313 132113 132311 211313 ' +
    '231113 231311 112133 112331 132131 113123 113321 133121 313121 211331 231131 213113 213311 213131 311123 311321 331121 312113 312311 332111 ' +
    '314111 221411 431111 111224 111422 121124 121421 141122 141221 112214 112412 122114 122411 142112 142211 241211 221114 413111 241112 134111 ' +
    '111242 121142 121241 114212 124112 124211 411212 421112 421211 212141 214121 412121 111143 111341 131141 114113 114311 411113 411311 113141 ' +
    '114131 311141 411131 211412 211214 211232 2331112').split(' ');
  var MARGEM = 10; // zona livre (em módulos) de cada lado: o leitor precisa dela

  /** Texto -> sequência de larguras (início B = 104, dígito verificador módulo 103, stop = 106). */
  function codificar(texto) {
    texto = String(texto == null ? '' : texto);
    var v = [104], soma = 104;
    for (var i = 0; i < texto.length; i++) {
      var c = texto.charCodeAt(i) - 32;
      if (c < 0 || c > 94) c = 0; // fora do conjunto B vira espaço
      v.push(c); soma += c * (i + 1);
    }
    v.push(soma % 103, 106);
    return v.map(function (k) { return padroes[k]; }).join('');
  }

  // retângulos em unidades de módulo (posições inteiras: barras nítidas em qualquer escala)
  function barras(texto) {
    var larg = codificar(texto), x = MARGEM, partes = [];
    for (var j = 0; j < larg.length; j++) {
      var w = +larg[j];
      if (j % 2 === 0) partes.push('<rect x="' + x + '" y="0" width="' + w + '" height="1"/>');
      x += w;
    }
    return { rects: partes.join(''), total: x + MARGEM };
  }

  /** Desenha dentro de um <svg> já na página. As barras esticam para a largura do svg. */
  function desenhar(svg, texto, cor) {
    if (!svg) return;
    var b = barras(texto);
    svg.setAttribute('viewBox', '0 0 ' + b.total + ' 1');
    svg.setAttribute('preserveAspectRatio', 'none');
    svg.setAttribute('shape-rendering', 'crispEdges');
    svg.innerHTML = '<g fill="' + (cor || '#000') + '">' + b.rects + '</g>';
  }

  /** O mesmo desenho em texto, para entrar direto num HTML montado. */
  function svg(texto, op) {
    op = op || {};
    var b = barras(texto);
    return '<svg class="' + (op.classe || 'c128') + '" viewBox="0 0 ' + b.total + ' 1" preserveAspectRatio="none" shape-rendering="crispEdges"' +
      ' role="img" aria-label="Código de barras ' + String(texto).replace(/[&<>"]/g, '') + '"><g fill="' + (op.cor || '#000') + '">' + b.rects + '</g></svg>';
  }

  window.Code128 = { padroes: padroes, codificar: codificar, desenhar: desenhar, svg: svg };
})();
