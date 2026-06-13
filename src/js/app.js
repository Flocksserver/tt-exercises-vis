/*
 * app.js — UI: Eingabe-Tabelle, Live-Validierung, Auto-Render, Beispiele, Export.
 */
(function (TTV) {
  'use strict';

  var MAX_ROWS = 10;
  var MIN_ROWS = 1;

  var DEFAULT_ROWS = [
    { a: 'VHT aus VH diagonal', b: 'Block in Mitte' },
    { a: 'VHT aus Mitte in RH', b: 'Block in RH' },
    { a: 'RHT aus RH in VH', b: 'frei' }
  ];

  // Spielnahe, real trainierbare Übungen (aus typischen Trainingsformen abgeleitet).
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
      // Beinarbeit: A zieht aus RH/VH, B blockt wechselnd.
      name: 'Block-Wechsel (Beinarbeit)',
      rows: [
        { a: 'RHT aus RH in VH', b: 'VHB in RH' },
        { a: 'VHT aus VH in Mitte', b: 'VHB in VH' },
        { a: 'VHT aus VH in RH', b: 'frei' }
      ]
    },
    {
      // Richtung: diagonal und parallel im Wechsel.
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
      // VH-Beinarbeit aus Mitte und VH, Abschluss in die RH.
      name: 'VH-Beinarbeit (Mitte↔VH)',
      rows: [
        { a: 'VHT aus Mitte in VH', b: 'VHB aus VH in Mitte' },
        { a: 'VHT aus VH in VH', b: 'VHB aus VH in VH' },
        { a: 'VHT aus Mitte in RH', b: 'frei' }
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
      // Spiel auf den Wechselpunkt (Ellbogen) und Block über den ganzen Tisch.
      name: 'Wechselpunkt & ganzer Tisch',
      rows: [
        { a: 'RHK/RHT in RH', b: 'RHB in RH' },
        { a: 'VHT aus VH in Ellbogen', b: 'Block in ganzer Tisch' },
        { a: 'VHT aus RH diagonal', b: 'frei' }
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

  var state = [];
  var renderTimer = null;
  var dom = {};

  function debouncedRender() {
    if (renderTimer) clearTimeout(renderTimer);
    renderTimer = setTimeout(renderNow, 180);
  }

  function buildParsedRows() {
    var rows = [];
    var balleimer = dom.multiball.checked;
    state.forEach(function (row) {
      var pa = TTV.notation.parseCell(row.a);
      var pb = balleimer ? { type: 'empty' } : TTV.notation.parseCell(row.b);
      if (pa.type === 'empty' && pb.type === 'empty') return;
      rows.push({ a: pa, b: pb });
    });
    return rows;
  }

  function renderNow() {
    var parsedRows = buildParsedRows();
    dom.svgContainer.innerHTML = '';
    if (parsedRows.length === 0) {
      var hint = document.createElement('p');
      hint.className = 'svg-empty';
      hint.textContent = 'Trage oben eine Übung ein – die Visualisierung erscheint hier.';
      dom.svgContainer.appendChild(hint);
      return;
    }
    var resolved = TTV.resolver.resolveSequence(parsedRows);
    var opts = { multiball: dom.multiball.checked, feeder: 'B' };
    dom.svgContainer.appendChild(TTV.renderer.render(resolved, opts));
  }

  function currentSvg() { return dom.svgContainer.querySelector('svg'); }

  // --- Eingabe-Tabelle --------------------------------------------------

  function makeCell(rowIndex, key) {
    var wrap = document.createElement('td');
    var input = document.createElement('input');
    input.type = 'text';
    input.className = 'cell-input';
    input.value = state[rowIndex][key];
    input.setAttribute('autocomplete', 'off');
    input.setAttribute('spellcheck', 'false');
    input.setAttribute('aria-label', (key === 'a' ? 'Spieler A' : 'Spieler B') + ', Zeile ' + (rowIndex + 1));

    var err = document.createElement('span');
    err.className = 'cell-error';
    err.setAttribute('aria-live', 'polite');

    input.addEventListener('input', function () {
      state[rowIndex][key] = input.value;
      var res = TTV.notation.validateCell(input.value);
      if (res.valid) { input.classList.remove('invalid'); err.textContent = ''; }
      else { input.classList.add('invalid'); err.textContent = res.message; }
      debouncedRender();
    });

    wrap.appendChild(input);
    wrap.appendChild(err);
    return wrap;
  }

  function rebuildTable() {
    dom.rowsBody.innerHTML = '';
    state.forEach(function (row, i) {
      var tr = document.createElement('tr');

      var num = document.createElement('td');
      num.className = 'row-num';
      num.textContent = (i + 1);
      tr.appendChild(num);

      tr.appendChild(makeCell(i, 'a'));
      tr.appendChild(makeCell(i, 'b'));

      var actions = document.createElement('td');
      actions.className = 'row-actions';
      var remove = document.createElement('button');
      remove.type = 'button';
      remove.className = 'btn-icon';
      remove.textContent = '✕';
      remove.title = 'Zeile entfernen';
      remove.setAttribute('aria-label', 'Zeile ' + (i + 1) + ' entfernen');
      remove.disabled = state.length <= MIN_ROWS;
      remove.addEventListener('click', function () { removeRow(i); });
      actions.appendChild(remove);
      tr.appendChild(actions);

      dom.rowsBody.appendChild(tr);
    });
    dom.addRow.disabled = state.length >= MAX_ROWS;
    revalidateAll();
  }

  function revalidateAll() {
    dom.rowsBody.querySelectorAll('.cell-input').forEach(function (input) {
      var res = TTV.notation.validateCell(input.value);
      var err = input.parentNode.querySelector('.cell-error');
      if (res.valid) { input.classList.remove('invalid'); err.textContent = ''; }
      else { input.classList.add('invalid'); err.textContent = res.message; }
    });
  }

  function addRow() {
    if (state.length >= MAX_ROWS) return;
    state.push({ a: '', b: '' });
    rebuildTable();
  }

  function removeRow(i) {
    if (state.length <= MIN_ROWS) return;
    state.splice(i, 1);
    rebuildTable();
    renderNow();
  }

  function loadRows(rows, opts) {
    state = rows.map(function (r) { return { a: r.a || '', b: r.b || '' }; });
    if (state.length === 0) state = [{ a: '', b: '' }];
    dom.multiball.checked = !!(opts && opts.multiball);
    updateBalleimer();
    rebuildTable();
    renderNow();
  }

  function updateBalleimer() {
    // Im Balleimer-Modus nur die Spalte „Spieler A“ – das Zuspiel ergibt sich aus A's Position.
    if (dom.table) dom.table.classList.toggle('hide-b', dom.multiball.checked);
  }

  function buildExampleButtons() {
    EXAMPLES.forEach(function (ex) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'btn-chip';
      btn.textContent = ex.name;
      btn.addEventListener('click', function () { loadRows(ex.rows, { multiball: ex.multiball }); });
      dom.examples.appendChild(btn);
    });
  }

  function init() {
    dom.rowsBody = document.getElementById('rowsBody');
    dom.addRow = document.getElementById('addRow');
    dom.examples = document.getElementById('examples');
    dom.svgContainer = document.getElementById('svgContainer');
    dom.multiball = document.getElementById('multiball');
    dom.table = document.querySelector('.input-table');

    dom.addRow.addEventListener('click', addRow);
    dom.multiball.addEventListener('change', function () { updateBalleimer(); renderNow(); });
    document.getElementById('btnPng').addEventListener('click', function () {
      TTV.exporter.exportPNG(currentSvg(), 'tt-uebung.png', 3);
    });
    document.getElementById('btnSvg').addEventListener('click', function () {
      TTV.exporter.exportSVG(currentSvg(), 'tt-uebung.svg');
    });
    document.getElementById('btnReset').addEventListener('click', function () {
      loadRows(DEFAULT_ROWS);
    });

    var yearEl = document.getElementById('year');
    if (yearEl) yearEl.textContent = new Date().getFullYear();

    buildExampleButtons();
    loadRows(DEFAULT_ROWS);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})(window.TTV = window.TTV || {});
