/*
 * examples.js — Standard-Übung und Beispielkatalog (reine Daten, kein DOM).
 * Jede Übung gibt es in deutscher (rows) und englischer (rowsEn) Notation; die App wählt
 * je nach UI-Sprache. Alle Übungen sind logisch konsistent (Ursprung = Ballort).
 */
(function (TTV) {
  'use strict';

  var DEFAULT_ROWS = [
    { a: 'VHT aus VH diagonal', b: 'Block in Mitte' },
    { a: 'VHT aus Mitte in RH', b: 'Block in RH' },
    { a: 'RHT aus RH in VH', b: 'frei' }
  ];
  var DEFAULT_ROWS_EN = [
    { a: 'FHT from FH diagonal', b: 'Block to middle' },
    { a: 'FHT from middle to BH', b: 'Block to BH' },
    { a: 'BHT from BH to FH', b: 'free' }
  ];

  // Standard-Sequenz = Positions-Beinarbeit, zweimal durchgeführt (-> „×2" automatisch erkannt).
  var DEFAULT_SEQ = 'VH Mitte RH VH Mitte RH';
  var DEFAULT_SEQ_EN = 'FH middle BH FH middle BH';

  var EXAMPLES = [
    {
      name: 'RH-Konter (endlos)',
      rows: [
        { a: 'RHK/RHT aus RH in RH', b: 'RHK/RHB aus RH in RH' },
        { a: 'endlos', b: '' }
      ],
      rowsEn: [
        { a: 'BHC/BHT from BH to BH', b: 'BHC/BHB from BH to BH' },
        { a: 'endless', b: '' }
      ]
    },
    {
      name: 'Block-Wechsel (Beinarbeit)',
      rows: [
        { a: 'VHT aus VH in VH', b: 'Block in RH' },
        { a: 'RHT aus RH in RH', b: 'Block in VH' },
        { a: 'VHT aus VH in Mitte', b: 'frei' }
      ],
      rowsEn: [
        { a: 'FHT from FH to FH', b: 'Block to BH' },
        { a: 'BHT from BH to BH', b: 'Block to FH' },
        { a: 'FHT from FH to middle', b: 'free' }
      ]
    },
    {
      name: 'Diagonal & Parallel',
      rows: [
        { a: 'RHK/RHT diagonal', b: 'RHK/RHB in RH' },
        { a: 'RHK/RHT parallel', b: 'VHK/VHB in VH' },
        { a: 'VHT diagonal', b: 'frei' }
      ],
      rowsEn: [
        { a: 'BHC/BHT diagonal', b: 'BHC/BHB to BH' },
        { a: 'BHC/BHT parallel', b: 'FHC/FHB to FH' },
        { a: 'FHT diagonal', b: 'free' }
      ]
    },
    {
      name: 'Ohne „aus“ (Ballverlauf)',
      rows: [
        { a: 'RHK/RHT in RH', b: 'RHB in RH' },
        { a: 'RHK/RHT in RH', b: 'RHB in Mitte der VH' },
        { a: 'VHT in RH', b: 'frei' }
      ],
      rowsEn: [
        { a: 'BHC/BHT to BH', b: 'BHB to BH' },
        { a: 'BHC/BHT to BH', b: 'BHB to middle of FH' },
        { a: 'FHT to BH', b: 'free' }
      ]
    },
    {
      name: 'VH-Beinarbeit (Mitte↔VH)',
      rows: [
        { a: 'VHT aus VH in VH', b: 'VHB in Mitte' },
        { a: 'VHT aus Mitte in VH', b: 'VHB in VH' },
        { a: 'VHT aus VH in RH', b: 'frei' }
      ],
      rowsEn: [
        { a: 'FHT from FH to FH', b: 'FHB to middle' },
        { a: 'FHT from middle to FH', b: 'FHB to FH' },
        { a: 'FHT from FH to BH', b: 'free' }
      ]
    },
    {
      name: 'Kurzes Spiel → Eröffnung',
      rows: [
        { a: 'kurzer Aufschlag in kurze VH', b: 'Schupf in kurze RH' },
        { a: 'Schupf in kurze RH', b: 'Flip in halblang VH' },
        { a: 'VHT aus VH diagonal', b: 'frei' }
      ],
      rowsEn: [
        { a: 'short serve to short FH', b: 'push to short BH' },
        { a: 'push to short BH', b: 'flip to half-long FH' },
        { a: 'FHT from FH diagonal', b: 'free' }
      ]
    },
    {
      name: 'Wechselpunkt & ganzer Tisch',
      rows: [
        { a: 'RHK/RHT in RH', b: 'RHB in RH' },
        { a: 'VHT aus RH in Ellbogen', b: 'RHB in RH' },
        { a: 'VHT aus RH diagonal', b: 'Block in ganzer Tisch' }
      ],
      rowsEn: [
        { a: 'BHC/BHT to BH', b: 'BHB to BH' },
        { a: 'FHT from BH to elbow', b: 'BHB to BH' },
        { a: 'FHT from BH diagonal', b: 'Block to whole table' }
      ]
    },
    {
      name: 'Variabel & Wiederholung',
      rows: [
        { a: '2-3 mal VHT aus VH diagonal', b: 'Block in VH oder RH' },
        { a: 'VHT aus RH in VH bis Mitte', b: 'Block unregelmäßig' }
      ],
      rowsEn: [
        { a: '2-3 times FHT from FH diagonal', b: 'Block to FH or BH' },
        { a: 'FHT from BH to FH through middle', b: 'Block irregular' }
      ]
    },
    {
      name: 'Balleimer (Zuspiel)',
      multiball: true,
      rows: [
        { a: 'VHT aus VH diagonal', b: '' },
        { a: 'VHT aus Mitte in VH', b: '' },
        { a: 'VHT aus RH parallel', b: '' }
      ],
      rowsEn: [
        { a: 'FHT from FH diagonal', b: '' },
        { a: 'FHT from middle to FH', b: '' },
        { a: 'FHT from BH parallel', b: '' }
      ]
    }
  ];

  TTV.examples = {
    DEFAULT_ROWS: DEFAULT_ROWS, DEFAULT_ROWS_EN: DEFAULT_ROWS_EN,
    DEFAULT_SEQ: DEFAULT_SEQ, DEFAULT_SEQ_EN: DEFAULT_SEQ_EN, EXAMPLES: EXAMPLES
  };
})(window.TTV = window.TTV || {});
