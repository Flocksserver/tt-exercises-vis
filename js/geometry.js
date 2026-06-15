/*
 * geometry.js — Koordinaten für Tisch und Ball-Positionen.
 *
 * Draufsicht: Spieler A vorne (unten, großes y), Spieler B hinten (oben, kleines y).
 * Netz = waagerechte Linie in der Mitte (midY).
 *
 * Seitliche Lage (x) je Position – aus Sicht von A: VH = rechts, RH = links.
 *   VH · MitteVH · Mitte · MitteRH/Ellbogen · RH   (B spiegelverkehrt)
 * Tiefe (y, Abstand vom Netz): kurz (am Netz) · halblang (Mitte) · lang (Grundlinie)
 */
(function (TTV) {
  'use strict';

  var TABLE_W = 196;
  var TABLE_L = 304;
  var MARGIN_X = 30;
  var MARGIN_Y = 44;
  var INSET = 16;

  // seitliche Lage (0 = links … 1 = rechts) aus Sicht von Spieler A.
  // VH/RH bewusst weit in die Ecken, Mitte VH/RH klar in der jeweiligen Hälfte.
  // „weit" = noch weiter außen (zur Seite raus) als VH bzw. RH.
  var LX_A = {
    VHweit: 0.985, VH: 0.93, MitteVH: 0.74, Mitte: 0.50, MitteRH: 0.26, RH: 0.07, RHweit: 0.015
  };
  // Tiefe als Anteil der halben Tischlänge, vom Netz aus gemessen
  var DEPTH = { kurz: 0.26, halblang: 0.56, lang: 0.90 };

  function layout(numberOfTables) {
    return {
      width: numberOfTables * (TABLE_W + MARGIN_X) + MARGIN_X,
      height: TABLE_L + 2 * MARGIN_Y
    };
  }

  function table(index) {
    var startX = MARGIN_X + index * (TABLE_W + MARGIN_X);
    var startY = MARGIN_Y;
    return {
      startX: startX,
      startY: startY,
      width: TABLE_W,
      length: TABLE_L,
      midX: startX + TABLE_W / 2,
      midY: startY + TABLE_L / 2,
      net: { x1: startX - 14, x2: startX + TABLE_W + 14, y: startY + TABLE_L / 2 }
    };
  }

  /**
   * @param {object} t     Tisch aus table()
   * @param {string} side  'A' (unten) | 'B' (oben)
   * @param {string} pos   VH|RH|Mitte|MitteVH|MitteRH|Ellbogen
   * @param {string} depth kurz|halblang|lang
   */
  // Punkt aus roher seitlicher Lage (0 = ganz RH-Seite … 1 = ganz VH-Seite, Sicht A).
  function pointLx(t, side, lx, depth) {
    if (lx == null) lx = 0.5;
    if (side === 'B') lx = 1 - lx;
    var x = t.startX + INSET + lx * (t.width - 2 * INSET);
    var df = DEPTH[depth] != null ? DEPTH[depth] : DEPTH.lang;
    var half = t.length / 2;
    var y = side === 'A' ? (t.midY + df * half) : (t.midY - df * half);
    return { x: x, y: y };
  }

  function point(t, side, pos, depth) {
    var lx = LX_A[pos];
    if (lx == null) lx = 0.5;
    return pointLx(t, side, lx, depth);
  }

  TTV.geometry = {
    TABLE_W: TABLE_W, TABLE_L: TABLE_L, MARGIN_X: MARGIN_X, MARGIN_Y: MARGIN_Y,
    layout: layout, table: table, point: point, pointLx: pointLx,
    POSITIONS: Object.keys(LX_A), DEPTHS: Object.keys(DEPTH)
  };
})(window.TTV = window.TTV || {});
