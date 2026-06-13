/*
 * export.js — Download der Visualisierung als SVG oder PNG.
 * Reines Vanilla-JS (Canvas), keine externe Bibliothek.
 */
(function (TTV) {
  'use strict';

  function serialize(svg) {
    var clone = svg.cloneNode(true);
    clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    clone.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink');
    // feste Pixelmaße statt 100%-Style, damit Canvas die Größe kennt
    clone.style.maxWidth = '';
    clone.style.width = '';
    clone.style.height = '';
    return new XMLSerializer().serializeToString(clone);
  }

  function triggerDownload(blob, filename) {
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }

  function exportSVG(svg, filename) {
    if (!svg) return;
    var str = '<?xml version="1.0" encoding="UTF-8"?>\n' + serialize(svg);
    triggerDownload(new Blob([str], { type: 'image/svg+xml;charset=utf-8' }), filename || 'uebung.svg');
  }

  function exportPNG(svg, filename, scale) {
    if (!svg) return;
    scale = scale || 3;
    var width = parseFloat(svg.getAttribute('width')) || svg.getBoundingClientRect().width;
    var height = parseFloat(svg.getAttribute('height')) || svg.getBoundingClientRect().height;
    var str = serialize(svg);
    var svgUrl = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(str)));

    var img = new Image();
    img.onload = function () {
      var canvas = document.createElement('canvas');
      canvas.width = Math.round(width * scale);
      canvas.height = Math.round(height * scale);
      var ctx = canvas.getContext('2d');
      ctx.fillStyle = '#ffffff';                 // weißer Hintergrund
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(function (blob) {
        if (blob) triggerDownload(blob, filename || 'uebung.png');
      }, 'image/png');
    };
    img.onerror = function () {
      alert('PNG-Export fehlgeschlagen. Bitte versuche den SVG-Export.');
    };
    img.src = svgUrl;
  }

  TTV.exporter = { exportSVG: exportSVG, exportPNG: exportPNG };
})(window.TTV = window.TTV || {});
