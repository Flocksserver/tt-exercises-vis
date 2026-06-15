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

  // Tische groß; Außenrand (MARGIN_X) und oben/unten (MARGIN_Y) knapp, ABER die
  // Lücke ZWISCHEN den Tischen (GAP) bleibt großzügig (sonst kleben sie aneinander).
  var TABLE_W = 180;
  var TABLE_L = 320;
  var GAP = 48;        // Abstand zwischen benachbarten Tischen
  var MARGIN_X = 20;   // Außenrand links/rechts (klein -> Tisch näher an die Kante)
  var MARGIN_Y = 36;   // oben/unten (nur so viel wie das Label braucht)
  var INSET = 16;

  // seitliche Lage (0 = links … 1 = rechts) aus Sicht von Spieler A.
  // VH/RH bewusst weit in die Ecken, Mitte VH/RH klar in der jeweiligen Hälfte.
  // „weit" = klar weiter außen (zur Seite raus) als VH bzw. RH – bis an den Tischrand
  // (lx <0 / >1 schiebt über die Spielfeld-Innenlinie hinaus an die Außenkante).
  var LX_A = {
    VHweit: 1.06, VH: 0.93, MitteVH: 0.74, Mitte: 0.50, MitteRH: 0.26, RH: 0.07, RHweit: -0.06
  };
  // Tiefe als Anteil der halben Tischlänge, vom Netz aus gemessen
  var DEPTH = { kurz: 0.26, halblang: 0.56, lang: 0.90 };

  function layout(numberOfTables) {
    return {
      width: 2 * MARGIN_X + numberOfTables * TABLE_W + Math.max(0, numberOfTables - 1) * GAP,
      height: TABLE_L + 2 * MARGIN_Y
    };
  }

  function table(index) {
    var startX = MARGIN_X + index * (TABLE_W + GAP);
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
  // depth: Tiefen-Schlüssel (kurz/halblang/lang) ODER eine rohe Zahl (Anteil halbe Länge).
  function pointLx(t, side, lx, depth) {
    if (lx == null) lx = 0.5;
    if (side === 'B') lx = 1 - lx;
    var x = t.startX + INSET + lx * (t.width - 2 * INSET);
    var df = (typeof depth === 'number') ? depth : (DEPTH[depth] != null ? DEPTH[depth] : DEPTH.lang);
    var half = t.length / 2;
    var y = side === 'A' ? (t.midY + df * half) : (t.midY - df * half);
    return { x: x, y: y };
  }

  // „weit/tief" sitzt über die Ecke raus -> bei Standard-Tiefe etwas Richtung Netz ziehen.
  var WEIT_DEPTH = 0.80;   // statt lang (0.90): leicht netzwärts
  function point(t, side, pos, depth) {
    var lx = LX_A[pos];
    if (lx == null) lx = 0.5;
    var d = depth;
    if ((pos === 'VHweit' || pos === 'RHweit') && (d == null || d === 'lang')) d = WEIT_DEPTH;
    return pointLx(t, side, lx, d);
  }

  TTV.geometry = {
    TABLE_W: TABLE_W, TABLE_L: TABLE_L, MARGIN_X: MARGIN_X, MARGIN_Y: MARGIN_Y,
    layout: layout, table: table, point: point, pointLx: pointLx,
    POSITIONS: Object.keys(LX_A), DEPTHS: Object.keys(DEPTH)
  };
})(window.TTV = window.TTV || {});
