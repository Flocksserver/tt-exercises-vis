/*
 * renderer.js — zeichnet die aufgelöste Übung als SVG (reines DOM, keine Bibliothek).
 *
 * render(resolvedRows, opts) -> <svg>
 *   resolvedRows: Ausgabe von TTV.resolver.resolveSequence
 *   opts.multiball: boolean, opts.feeder: 'A'|'B' (Zuspieler im Multiball)
 */
(function (TTV) {
  'use strict';

  var SVGNS = 'http://www.w3.org/2000/svg';
  var geo = TTV.geometry;

  var COLORS = { A: '#1d4ed8', B: '#c0233b', feed: '#6b7280' };
  var OFFSET = 5;   // kleiner Parallel-Versatz, damit A/B bei gleicher Linie nicht überlappen

  function el(name, attrs) {
    var e = document.createElementNS(SVGNS, name);
    if (attrs) for (var k in attrs) if (Object.prototype.hasOwnProperty.call(attrs, k)) e.setAttribute(k, attrs[k]);
    return e;
  }

  function markerId(key) { return 'arrow-' + key; }

  function defineMarkers(svg) {
    var defs = el('defs');
    Object.keys(COLORS).forEach(function (key) {
      var m = el('marker', {
        id: markerId(key), markerWidth: 8, markerHeight: 8,
        viewBox: '0 0 10 10', refX: 8, refY: 5, orient: 'auto', markerUnits: 'userSpaceOnUse'
      });
      m.appendChild(el('path', { d: 'M0,0 L10,5 L0,10 z', fill: COLORS[key] }));
      defs.appendChild(m);
    });
    svg.appendChild(defs);
  }

  function label(x, y, text, opts) {
    opts = opts || {};
    var t = el('text', {
      x: x, y: y,
      'font-family': 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif',
      'font-weight': '700', 'font-size': opts.size || 14,
      'text-anchor': opts.anchor || 'middle', fill: opts.fill || '#111'
    });
    if (opts.halo !== false) {
      t.setAttribute('stroke', '#fff'); t.setAttribute('stroke-width', '3.5');
      t.setAttribute('paint-order', 'stroke'); t.setAttribute('stroke-linejoin', 'round');
    }
    t.textContent = text;
    return t;
  }

  function drawTable(svg, t, opts) {
    svg.appendChild(el('rect', { x: t.startX, y: t.startY, width: t.width, height: t.length, fill: '#111' }));
    svg.appendChild(el('rect', { x: t.startX + 1, y: t.startY + 1, width: t.width - 2, height: t.length - 2, fill: '#fff' }));
    svg.appendChild(el('rect', { x: t.startX + 4, y: t.startY + 4, width: t.width - 8, height: t.length - 8, fill: '#0a7d3c' }));
    svg.appendChild(el('line', { x1: t.midX, y1: t.startY + 4, x2: t.midX, y2: t.startY + t.length - 4, stroke: '#fff', 'stroke-width': 2 }));
    svg.appendChild(el('line', { x1: t.net.x1, y1: t.net.y, x2: t.net.x2, y2: t.net.y, stroke: '#cfd4d9', 'stroke-width': 4, 'stroke-linecap': 'round' }));

    var aTag = (opts.multiball && opts.feeder === 'A') ? 'Z' : 'A';
    var bTag = (opts.multiball && opts.feeder === 'B') ? 'Z' : 'B';
    svg.appendChild(label(t.startX - 6, t.startY + t.length - 4, aTag, { anchor: 'end', size: 13, fill: aTag === 'Z' ? COLORS.feed : COLORS.A, halo: false }));
    svg.appendChild(label(t.startX - 6, t.startY + 12, bTag, { anchor: 'end', size: 13, fill: bTag === 'Z' ? COLORS.feed : COLORS.B, halo: false }));
  }

  function arrowPath(from, to, player, dashed, colorKey) {
    // gerade Linie; Spieler A/B leicht senkrecht versetzt (sonst exakte Überlagerung
    // bei gleicher Linie). Versatz aus kanonischer Ausrichtung, damit beide parallel laufen.
    var flip = (to.y < from.y) || (to.y === from.y && to.x < from.x);
    var cdx = flip ? (from.x - to.x) : (to.x - from.x);
    var cdy = flip ? (from.y - to.y) : (to.y - from.y);
    var len = Math.sqrt(cdx * cdx + cdy * cdy) || 1;
    var sign = player === 'A' ? 1 : -1;
    var px = (-cdy / len) * OFFSET * sign;
    var py = (cdx / len) * OFFSET * sign;
    var attrs = {
      d: 'M' + (from.x + px) + ',' + (from.y + py) + ' L' + (to.x + px) + ',' + (to.y + py),
      fill: 'none', stroke: COLORS[colorKey], 'stroke-width': colorKey === 'feed' ? 2 : 3,
      'stroke-linecap': 'round', 'marker-end': 'url(#' + markerId(colorKey) + ')'
    };
    if (dashed) attrs['stroke-dasharray'] = '6 5';
    return el('path', attrs);
  }

  function drawZone(svg, from, e1, e2, colorKey, faint) {
    svg.appendChild(el('polygon', {
      points: [from.x + ',' + from.y, e1.x + ',' + e1.y, e2.x + ',' + e2.y].join(' '),
      fill: COLORS[colorKey], 'fill-opacity': faint ? '0.08' : '0.16',
      stroke: COLORS[colorKey], 'stroke-opacity': faint ? '0.25' : '0.35', 'stroke-width': 1
    }));
    svg.appendChild(el('line', {
      x1: e1.x, y1: e1.y, x2: e2.x, y2: e2.y,
      stroke: COLORS[colorKey], 'stroke-width': 2, 'stroke-dasharray': '5 4', 'stroke-opacity': faint ? '0.6' : '1'
    }));
  }

  function drawShot(svg, t, rs, opts) {
    if (rs.kind === 'frei' || rs.kind === 'endlos') {
      var fy = rs.player === 'A' ? (t.startY + t.length - 30) : (t.startY + 30);
      svg.appendChild(label(t.midX, fy, rs.kind === 'endlos' ? '∞ endlos' : 'frei', { size: 18, fill: '#333' }));
      return;
    }
    if (rs.kind !== 'stroke') return;

    var player = rs.player;
    var opp = player === 'A' ? 'B' : 'A';
    var isFeed = opts.multiball && player === opts.feeder;
    var colorKey = isFeed ? 'feed' : player;
    var from = geo.point(t, player, rs.from.pos, rs.from.depth);

    // Variabilitäts-Band (unregelmäßig mit explizitem Ziel)
    if (rs.variable && !rs.zone) {
      var v1 = geo.point(t, opp, 'VH', 'lang'), v2 = geo.point(t, opp, 'RH', 'lang');
      drawZone(svg, from, v1, v2, colorKey, true);
    }

    if (rs.zone) {
      var z1 = geo.point(t, opp, rs.zone.from.pos, rs.zone.from.depth);
      var z2 = geo.point(t, opp, rs.zone.to.pos, rs.zone.to.depth);
      drawZone(svg, from, z1, z2, colorKey, rs.variable);
      svg.appendChild(arrowPath(from, { x: (z1.x + z2.x) / 2, y: (z1.y + z2.y) / 2 }, player, isFeed, colorKey));
    }

    rs.arrows.forEach(function (ar) {
      var to = geo.point(t, opp, ar.to.pos, ar.to.depth);
      svg.appendChild(arrowPath(from, to, player, ar.dashed || isFeed, colorKey));
    });

    // Label in den Rand außerhalb des Tischs setzen (A unten, B oben) – nicht am Ball kleben.
    var ly = player === 'A' ? (t.startY + t.length + 26) : (t.startY - 14);
    svg.appendChild(label(from.x, ly, rs.label, { size: 20, fill: COLORS[colorKey] }));
  }

  function render(rows, opts) {
    opts = opts || {};
    if (opts.multiball && !opts.feeder) opts.feeder = 'B';

    var n = Math.max(rows.length, 1);
    var dim = geo.layout(n);

    var svg = el('svg', { xmlns: SVGNS, width: dim.width, height: dim.height, viewBox: '0 0 ' + dim.width + ' ' + dim.height });
    svg.setAttribute('id', 'svg');
    svg.style.width = '100%'; svg.style.height = 'auto'; svg.style.maxWidth = dim.width + 'px';
    svg.style.display = 'block'; svg.style.margin = '0 auto';

    defineMarkers(svg);

    for (var i = 0; i < rows.length; i++) {
      var t = geo.table(i);
      drawTable(svg, t, opts);
      if (rows[i].a) drawShot(svg, t, rows[i].a, opts);
      if (rows[i].b) drawShot(svg, t, rows[i].b, opts);
    }
    return svg;
  }

  TTV.renderer = { render: render, COLORS: COLORS };
})(window.TTV = window.TTV || {});
