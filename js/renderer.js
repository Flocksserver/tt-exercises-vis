/*
 * renderer.js — zeichnet die Übung als SVG (reines DOM, keine Bibliothek).
 *
 * render(uebung) -> <svg>
 *   uebung: Array von Reihen, je Reihe { a: parsed|null, b: parsed|null }
 *   parsed: Ergebnis von TTV.notation.parseCell (Typ 'stroke' | 'frei' | … )
 */
(function (TTV) {
  'use strict';

  var SVGNS = 'http://www.w3.org/2000/svg';
  var geo = TTV.geometry;

  var COLOR = { A: '#1d4ed8', B: '#c0233b' };   // Spieler A blau, Spieler B rot
  var CURVE = 16;                                // Auswölbung der Pfeile (gegen Überlagerung)

  function el(name, attrs) {
    var e = document.createElementNS(SVGNS, name);
    if (attrs) {
      for (var k in attrs) {
        if (Object.prototype.hasOwnProperty.call(attrs, k)) e.setAttribute(k, attrs[k]);
      }
    }
    return e;
  }

  function markerId(player) { return 'arrow-' + player; }

  function defineMarkers(svg) {
    var defs = el('defs');
    ['A', 'B'].forEach(function (player) {
      var marker = el('marker', {
        id: markerId(player),
        markerWidth: 8, markerHeight: 8,
        viewBox: '0 0 10 10', refX: 8, refY: 5,
        orient: 'auto', markerUnits: 'userSpaceOnUse'
      });
      marker.appendChild(el('path', { d: 'M0,0 L10,5 L0,10 z', fill: COLOR[player] }));
      defs.appendChild(marker);
    });
    svg.appendChild(defs);
  }

  function drawTable(svg, t) {
    // Rahmen (schwarz) -> weiße Linie -> grüne Spielfläche
    svg.appendChild(el('rect', { x: t.startX, y: t.startY, width: t.width, height: t.length, fill: '#111' }));
    svg.appendChild(el('rect', { x: t.startX + 1, y: t.startY + 1, width: t.width - 2, height: t.length - 2, fill: '#fff' }));
    svg.appendChild(el('rect', { x: t.startX + 4, y: t.startY + 4, width: t.width - 8, height: t.length - 8, fill: '#0a7d3c' }));
    // Mittellinie (längs)
    svg.appendChild(el('line', {
      x1: t.midX, y1: t.startY + 4, x2: t.midX, y2: t.startY + t.length - 4,
      stroke: '#fff', 'stroke-width': 2
    }));
    // Netz (quer, ragt über die Kanten hinaus)
    svg.appendChild(el('line', {
      x1: t.net.x1, y1: t.net.y, x2: t.net.x2, y2: t.net.y,
      stroke: '#cfd4d9', 'stroke-width': 4, 'stroke-linecap': 'round'
    }));
    // Spieler-Markierungen
    svg.appendChild(label(t.startX - 6, t.startY + t.length - 4, 'A', { anchor: 'end', size: 13, fill: COLOR.A, halo: false }));
    svg.appendChild(label(t.startX - 6, t.startY + 12, 'B', { anchor: 'end', size: 13, fill: COLOR.B, halo: false }));
  }

  function label(x, y, text, opts) {
    opts = opts || {};
    var t = el('text', {
      x: x, y: y,
      'font-family': 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif',
      'font-weight': '700',
      'font-size': opts.size || 15,
      'text-anchor': opts.anchor || 'middle',
      fill: opts.fill || '#111'
    });
    if (opts.halo !== false) {
      // weißer Rand für Lesbarkeit über der grünen Fläche
      t.setAttribute('stroke', '#fff');
      t.setAttribute('stroke-width', '3.5');
      t.setAttribute('paint-order', 'stroke');
      t.setAttribute('stroke-linejoin', 'round');
    }
    t.textContent = text;
    return t;
  }

  function arrowPath(from, to, player, dashed) {
    // Senkrechte aus EINER kanonischen Ausrichtung der Strecke (unabhängig von der
    // Flugrichtung) berechnen. Sonst kippt die Wölbung mit der Richtung und A/B würden
    // sich bei gleicher Linie (z. B. beide RH->RH) exakt überlagern.
    var flip = (to.y < from.y) || (to.y === from.y && to.x < from.x);
    var cdx = flip ? (from.x - to.x) : (to.x - from.x);
    var cdy = flip ? (from.y - to.y) : (to.y - from.y);
    var len = Math.sqrt(cdx * cdx + cdy * cdy) || 1;
    // Vorzeichen je Spieler -> A und B wölben sich auseinander
    var sign = player === 'A' ? 1 : -1;
    var px = (-cdy / len) * CURVE * sign;
    var py = (cdx / len) * CURVE * sign;
    var cx = (from.x + to.x) / 2 + px;
    var cy = (from.y + to.y) / 2 + py;
    var attrs = {
      d: 'M' + from.x + ',' + from.y + ' Q' + cx + ',' + cy + ' ' + to.x + ',' + to.y,
      fill: 'none',
      stroke: COLOR[player],
      'stroke-width': 3,
      'stroke-linecap': 'round',
      'marker-end': 'url(#' + markerId(player) + ')'
    };
    if (dashed) attrs['stroke-dasharray'] = '6 5';
    return el('path', attrs);
  }

  function drawZone(svg, from, e1, e2, player) {
    // halbtransparenter Keil vom Start über den Zielbereich
    var poly = el('polygon', {
      points: [from.x + ',' + from.y, e1.x + ',' + e1.y, e2.x + ',' + e2.y].join(' '),
      fill: COLOR[player],
      'fill-opacity': '0.16',
      stroke: COLOR[player],
      'stroke-opacity': '0.35',
      'stroke-width': 1
    });
    svg.appendChild(poly);
    // gestrichelte Linie über die Breite des Bereichs
    svg.appendChild(el('line', {
      x1: e1.x, y1: e1.y, x2: e2.x, y2: e2.y,
      stroke: COLOR[player], 'stroke-width': 2, 'stroke-dasharray': '5 4'
    }));
  }

  function drawStroke(svg, t, parsed, player) {
    if (!parsed) return;

    if (parsed.type === 'frei') {
      var fy = player === 'A' ? (t.startY + t.length - 30) : (t.startY + 30);
      svg.appendChild(label(t.midX, fy, 'frei', { size: 16, fill: '#333' }));
      return;
    }
    if (parsed.type !== 'stroke') return;

    var opponent = player === 'A' ? 'B' : 'A';
    var from = geo.point(t, player, parsed.from.pos, parsed.from.short);

    if (parsed.range) {
      var e1 = geo.point(t, opponent, parsed.range.from, false);
      var e2 = geo.point(t, opponent, parsed.range.to, false);
      drawZone(svg, from, e1, e2, player);
      var mid = { x: (e1.x + e2.x) / 2, y: (e1.y + e2.y) / 2 };
      svg.appendChild(arrowPath(from, mid, player, false));
    } else {
      parsed.to.forEach(function (target, idx) {
        var to = geo.point(t, opponent, target.pos, target.short);
        svg.appendChild(arrowPath(from, to, player, idx > 0));
      });
    }

    // Technik-Label nahe dem Startpunkt
    var ly = player === 'A' ? (from.y + 20) : (from.y - 12);
    svg.appendChild(label(from.x, ly, TTV.notation.labelFor(parsed), { size: 15, fill: COLOR[player] }));
  }

  function render(uebung) {
    var n = Math.max(uebung.length, 1);
    var dim = geo.layout(n);

    var svg = el('svg', {
      xmlns: SVGNS,
      width: dim.width,
      height: dim.height,
      viewBox: '0 0 ' + dim.width + ' ' + dim.height
    });
    svg.setAttribute('id', 'svg');
    svg.style.width = '100%';
    svg.style.height = 'auto';
    svg.style.maxWidth = dim.width + 'px';
    svg.style.display = 'block';
    svg.style.margin = '0 auto';

    defineMarkers(svg);

    for (var i = 0; i < uebung.length; i++) {
      var t = geo.table(i);
      drawTable(svg, t);
      drawStroke(svg, t, uebung[i].a, 'A');
      drawStroke(svg, t, uebung[i].b, 'B');
    }

    return svg;
  }

  TTV.renderer = { render: render, COLOR: COLOR };
})(window.TTV = window.TTV || {});
