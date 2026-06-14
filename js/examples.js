/*
 * examples.js — Standard-Übung und Beispielkatalog (reine Daten, kein DOM).
 * Alle Übungen sind logisch konsistent: ein explizites „aus POSITION" entspricht der
 * Stelle, an der der vorige Ball gelandet ist (außer beim ersten Schlag oder nach einem
 * variablen Ball wie oder/Bereich/ganzer Tisch/unregelmäßig).
 */
(function (TTV) {
  'use strict';

  var DEFAULT_ROWS = [
    { a: 'VHT aus VH diagonal', b: 'Block in Mitte' },
    { a: 'VHT aus Mitte in RH', b: 'Block in RH' },
    { a: 'RHT aus RH in VH', b: 'frei' }
  ];

  var EXAMPLES = [
    {
      // Rückhand-Konter diagonal, endlos – beide aus RH in RH.
      name: 'RH-Konter (endlos)',
      rows: [
        { a: 'RHK/RHT aus RH in RH', b: 'RHK/RHB aus RH in RH' },
        { a: 'endlos', b: '' }
      ]
    },
    {
      // Block-Wechsel: B blockt abwechselnd in die Ecken, A kontert mit VH bzw. RH.
      name: 'Block-Wechsel (Beinarbeit)',
      rows: [
        { a: 'VHT aus VH in VH', b: 'Block in RH' },
        { a: 'RHT aus RH in RH', b: 'Block in VH' },
        { a: 'VHT aus VH in Mitte', b: 'frei' }
      ]
    },
    {
      // Richtung: diagonal und parallel im Wechsel (ohne „aus“, Ursprung aus Ballverlauf).
      name: 'Diagonal & Parallel',
      rows: [
        { a: 'RHK/RHT diagonal', b: 'RHK/RHB in RH' },
        { a: 'RHK/RHT parallel', b: 'VHK/VHB in VH' },
        { a: 'VHT diagonal', b: 'frei' }
      ]
    },
    {
      // Verkürzte Schreibweise ohne „aus“ – Ursprung aus dem Ballverlauf.
      name: 'Ohne „aus“ (Ballverlauf)',
      rows: [
        { a: 'RHK/RHT in RH', b: 'RHB in RH' },
        { a: 'RHK/RHT in RH', b: 'RHB in Mitte der VH' },
        { a: 'VHT in RH', b: 'frei' }
      ]
    },
    {
      // VH-Beinarbeit: A zieht Vorhand aus VH und Mitte, B blockt passend zurück.
      name: 'VH-Beinarbeit (Mitte↔VH)',
      rows: [
        { a: 'VHT aus VH in VH', b: 'VHB in Mitte' },
        { a: 'VHT aus Mitte in VH', b: 'VHB in VH' },
        { a: 'VHT aus VH in RH', b: 'frei' }
      ]
    },
    {
      // Kurzes Spiel: Aufschlag, Schupf, Flip – Übergang ins Topspinspiel.
      name: 'Kurzes Spiel → Eröffnung',
      rows: [
        { a: 'kurzer Aufschlag in kurze VH', b: 'Schupf in kurze RH' },
        { a: 'Schupf in kurze RH', b: 'Flip in halblang VH' },
        { a: 'VHT aus VH diagonal', b: 'frei' }
      ]
    },
    {
      // Spiel auf den Wechselpunkt (Ellbogen); zum Schluss öffnet B über den ganzen Tisch.
      name: 'Wechselpunkt & ganzer Tisch',
      rows: [
        { a: 'RHK/RHT in RH', b: 'RHB in RH' },
        { a: 'VHT aus RH in Ellbogen', b: 'RHB in RH' },
        { a: 'VHT aus RH diagonal', b: 'Block in ganzer Tisch' }
      ]
    },
    {
      // Wiederholung (2-3×), Alternativen (oder), Bereich (bis), variabel (unregelmäßig).
      name: 'Variabel & Wiederholung',
      rows: [
        { a: '2-3 mal VHT aus VH diagonal', b: 'Block in VH oder RH' },
        { a: 'VHT aus RH in VH bis Mitte', b: 'Block unregelmäßig' }
      ]
    },
    {
      // Balleimer: Zuspiel kommt zu A's Position, Spieler macht Beinarbeit + Topspin.
      name: 'Balleimer (Zuspiel)',
      multiball: true,
      rows: [
        { a: 'VHT aus VH diagonal', b: '' },
        { a: 'VHT aus Mitte in VH', b: '' },
        { a: 'VHT aus RH parallel', b: '' }
      ]
    }
  ];

  TTV.examples = { DEFAULT_ROWS: DEFAULT_ROWS, EXAMPLES: EXAMPLES };
})(window.TTV = window.TTV || {});
