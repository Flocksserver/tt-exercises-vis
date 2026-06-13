/*
 * geometry.js — Koordinaten für Tisch und Ball-Positionen.
 *
 * Draufsicht auf den Tisch:
 *   - Spieler A steht vorne (unten, großes y), Spieler B hinten (oben, kleines y).
 *   - Netz = waagerechte Linie in der Mitte (midY).
 *   - VH/RH/Mitte bestimmen die seitliche Lage (x):
 *       A: VH = rechts, RH = links, Mitte = Mitte
 *       B: VH = links,  RH = rechts, Mitte = Mitte   (Spieler stehen sich gegenüber)
 *   - lang  = an der Grundlinie (weit vom Netz)
 *     kurz  = nahe am Netz
 */
(function (TTV) {
  'use strict';

  var TABLE_W = 164;   // Tischbreite (x)
  var TABLE_L = 274;   // Tischlänge (y)
  var MARGIN_X = 52;   // seitlicher Rand / Abstand zwischen Tischen
  var MARGIN_Y = 56;   // Rand oben/unten (Platz für Labels)
  var INSET = 20;      // Abstand der Grundlinien-Positionen von der Tischkante
  var NET_OFFSET = 34; // Abstand der Kurz-Positionen vom Netz

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
      net: {
        x1: startX - 14,
        x2: startX + TABLE_W + 14,
        y: startY + TABLE_L / 2
      }
    };
  }

  /**
   * Liefert den Punkt {x,y} für eine Position.
   * @param {object} t      Tisch-Geometrie aus table()
   * @param {string} side   'A' (vorne/unten) oder 'B' (hinten/oben)
   * @param {string} pos    'VH' | 'RH' | 'Mitte'
   * @param {boolean} short kurz (nahe Netz) statt lang (Grundlinie)
   */
  function point(t, side, pos, short) {
    var leftX = t.startX + INSET;
    var rightX = t.startX + t.width - INSET;
    var midX = t.midX;
    var x;

    if (side === 'A') {
      x = pos === 'VH' ? rightX : pos === 'RH' ? leftX : midX;
    } else {
      x = pos === 'VH' ? leftX : pos === 'RH' ? rightX : midX;
    }

    var y;
    if (side === 'A') {
      y = short ? (t.midY + NET_OFFSET) : (t.startY + t.length - INSET);
    } else {
      y = short ? (t.midY - NET_OFFSET) : (t.startY + INSET);
    }

    return { x: x, y: y };
  }

  TTV.geometry = {
    TABLE_W: TABLE_W,
    TABLE_L: TABLE_L,
    MARGIN_X: MARGIN_X,
    MARGIN_Y: MARGIN_Y,
    layout: layout,
    table: table,
    point: point
  };
})(window.TTV = window.TTV || {});
