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
  var gradSeq = 0;

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
        viewBox: '0 0 10 10', refX: 8, refY: 5, orient: 'auto-start-reverse', markerUnits: 'userSpaceOnUse'
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

  function arrowPath(from, to, colorKey, dashed) {
    // gerade Linie mit Pfeilspitze am Ziel
    var attrs = {
      d: 'M' + from.x + ',' + from.y + ' L' + to.x + ',' + to.y,
      fill: 'none', stroke: COLORS[colorKey], 'stroke-width': colorKey === 'feed' ? 2 : 3,
      'stroke-linecap': 'round', 'marker-end': 'url(#' + markerId(colorKey) + ')'
    };
    if (dashed) attrs['stroke-dasharray'] = '6 5';
    return el('path', attrs);
  }

  function samePD(a, b) { return a && b && a.pos === b.pos && a.depth === b.depth; }

  // Eine Linie mit zwei Pfeilspitzen für gleiche Strecke hin & zurück (z. B. RH gegen RH).
  // Farbe nach Ballhälfte: A's Schlag (blau) erreicht B's Seite (oben), B's Schlag (rot)
  // erreicht A's Seite (unten). Wechsel am Netz. pA = A-Seite (unten), pB = B-Seite (oben).
  function drawDoubleArrow(svg, pA, pB, dashed) {
    var id = 'grad' + (gradSeq++);
    var grad = el('linearGradient', {
      id: id, gradientUnits: 'userSpaceOnUse',
      x1: pA.x, y1: pA.y, x2: pB.x, y2: pB.y
    });
    [[0, COLORS.B], [0.48, COLORS.B], [0.52, COLORS.A], [1, COLORS.A]].forEach(function (s) {
      grad.appendChild(el('stop', { offset: s[0], 'stop-color': s[1] }));
    });
    svg.appendChild(grad);
    var attrs = {
      d: 'M' + pA.x + ',' + pA.y + ' L' + pB.x + ',' + pB.y,
      fill: 'none', stroke: 'url(#' + id + ')', 'stroke-width': 3, 'stroke-linecap': 'round',
      'marker-start': 'url(#' + markerId('B') + ')',   // Pfeilspitze unten (B's Ball zu A), rot
      'marker-end': 'url(#' + markerId('A') + ')'       // Pfeilspitze oben (A's Ball zu B), blau
    };
    if (dashed) attrs['stroke-dasharray'] = '6 5';
    svg.appendChild(el('path', attrs));
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

  // Einen „shot" zeichenfertig machen (Punkte berechnet, Ursprung(e), Pfeile/Zone).
  function prep(t, shot, player, opts) {
    var opp = player === 'A' ? 'B' : 'A';
    var isFeed = opts.multiball && player === opts.feeder;
    var colorKey = isFeed ? 'feed' : player;
    var froms = shot.froms && shot.froms.length ? shot.froms : [shot.from];
    var fromPts = froms.map(function (f) { return geo.point(t, player, f.pos, f.depth); });
    var arrows = shot.arrows.map(function (ar) {
      return { toPD: ar.to, toPt: geo.point(t, opp, ar.to.pos, ar.to.depth), dashed: isFeed || ar.dashed };
    });
    return {
      player: player, opp: opp, colorKey: colorKey,
      fromPDs: froms, fromPts: fromPts, fromPt: fromPts[0],
      arrows: arrows, zone: shot.zone, zoneDashed: shot.zoneDashed, variable: shot.variable, label: shot.label
    };
  }

  function drawZoneAndLabel(svg, t, S) {
    if (S.variable && !S.zone) {
      var v1 = geo.point(t, S.opp, 'VH', 'lang'), v2 = geo.point(t, S.opp, 'RH', 'lang');
      drawZone(svg, S.fromPt, v1, v2, S.colorKey, true);
    }
    if (S.zone) {
      var z1 = geo.point(t, S.opp, S.zone.from.pos, S.zone.from.depth);
      var z2 = geo.point(t, S.opp, S.zone.to.pos, S.zone.to.depth);
      var mid = { x: (z1.x + z2.x) / 2, y: (z1.y + z2.y) / 2 };
      S.fromPts.forEach(function (fp) {     // je Ursprung eine Zone/ein Pfeil zur Mitte
        drawZone(svg, fp, z1, z2, S.colorKey, S.variable);
        svg.appendChild(arrowPath(fp, mid, S.colorKey, S.zoneDashed));
      });
    }
    var ly = S.player === 'A' ? (t.startY + t.length + 26) : (t.startY - 14);
    svg.appendChild(label(S.fromPt.x, ly, S.label, { size: 20, fill: COLORS[S.colorKey] }));
  }

  function drawMarker(svg, t, rs) {
    var fy = rs.player === 'A' ? (t.startY + t.length - 30) : (t.startY + 30);
    var txt = (TTV.i18n && TTV.i18n.marker) ? TTV.i18n.marker(rs.kind) : (rs.kind === 'endlos' ? '∞ endlos' : 'frei');
    svg.appendChild(label(t.midX, fy, txt, { size: 18, fill: '#333' }));
  }

  // Flache Segmentliste (Ursprung x Ziel) über alle shots eines Spielers.
  function segmentsOf(prepped) {
    var out = [];
    prepped.forEach(function (S) {
      S.fromPts.forEach(function (fp, fi) {
        S.arrows.forEach(function (ar) {
          out.push({ fromPt: fp, fromPD: S.fromPDs[fi], toPt: ar.toPt, toPD: ar.toPD, dashed: ar.dashed, colorKey: S.colorKey, used: false });
        });
      });
    });
    return out;
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
      var a = rows[i].a, b = rows[i].b;

      if (opts.multiball) {
        // Balleimer: nur Spieler A. Das Zuspiel (gestrichelt) geht dorthin, wo A spielt.
        if (a && (a.kind === 'frei' || a.kind === 'endlos')) drawMarker(svg, t, a);
        if (a && a.kind === 'stroke') {
          a.shots.map(function (s) { return prep(t, s, a.player, opts); }).forEach(function (S) {
            drawZoneAndLabel(svg, t, S);
            S.fromPts.forEach(function (fp) {
              svg.appendChild(arrowPath(geo.point(t, 'B', 'RH', 'halblang'), fp, 'feed', true));
              S.arrows.forEach(function (aa) { svg.appendChild(arrowPath(fp, aa.toPt, S.colorKey, aa.dashed)); });
            });
          });
        }
        continue;
      }

      if (a && (a.kind === 'frei' || a.kind === 'endlos')) drawMarker(svg, t, a);
      if (b && (b.kind === 'frei' || b.kind === 'endlos')) drawMarker(svg, t, b);
      var aShots = (a && a.kind === 'stroke') ? a.shots.map(function (s) { return prep(t, s, a.player, opts); }) : [];
      var bShots = (b && b.kind === 'stroke') ? b.shots.map(function (s) { return prep(t, s, b.player, opts); }) : [];
      aShots.concat(bShots).forEach(function (S) { drawZoneAndLabel(svg, t, S); });

      // Gegenläufige Segmente (gleiche Strecke hin & zurück) -> zweifarbige Doppellinie
      var aSegs = segmentsOf(aShots), bSegs = segmentsOf(bShots);
      aSegs.forEach(function (as) {
        if (as.used) return;
        for (var j = 0; j < bSegs.length; j++) {
          var bs = bSegs[j];
          if (!bs.used && samePD(as.fromPD, bs.toPD) && samePD(as.toPD, bs.fromPD)) {
            drawDoubleArrow(svg, as.fromPt, as.toPt, as.dashed || bs.dashed);
            as.used = true; bs.used = true;
            break;
          }
        }
      });
      aSegs.concat(bSegs).forEach(function (s) {
        if (!s.used) svg.appendChild(arrowPath(s.fromPt, s.toPt, s.colorKey, s.dashed));
      });
    }
    return svg;
  }

  TTV.renderer = { render: render, COLORS: COLORS };
})(window.TTV = window.TTV || {});
