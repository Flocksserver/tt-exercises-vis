/*
 * app.js — UI: Eingabe-Tabelle, Live-Validierung, Auto-Render, Beispiele, Export.
 */
(function (TTV) {
  'use strict';

  var MAX_ROWS = 10;
  var MIN_ROWS = 1;

  var DEFAULT_ROWS = [
    { a: 'VHT aus VH in Mitte', b: 'VHB aus Mitte in RH' },
    { a: 'RHT aus RH in VH', b: 'VHT aus VH in VH' },
    { a: 'VHT aus VH in VH', b: 'Frei' }
  ];

  var EXAMPLES = [
    {
      name: 'Standard-Rhythmus',
      rows: [
        { a: 'VHT aus VH in Mitte', b: 'VHB aus Mitte in RH' },
        { a: 'RHT aus RH in VH', b: 'VHT aus VH in VH' },
        { a: 'VHT aus VH in VH', b: 'Frei' }
      ]
    },
    {
      name: 'CampMappe (ohne „aus“)',
      rows: [
        { a: 'RHK/RHT in RH', b: 'RHB in RH' },
        { a: 'RHK/RHT in RH', b: 'RHB in Mitte der VH' },
        { a: 'VHT in RH', b: 'frei' }
      ]
    },
    {
      name: 'Diagonal / Längs',
      rows: [
        { a: 'VHT aus VH diagonal', b: 'Block in Mitte' },
        { a: 'VHT aus RH längs', b: 'frei' }
      ]
    },
    {
      name: 'Tiefen: kurz/halblang/lang',
      rows: [
        { a: 'kurzer VHB aus VH in kurze Mitte', b: 'Flip in halblang RH' },
        { a: 'VHT in lang VH', b: 'frei' }
      ]
    },
    {
      name: 'Unregelmäßig & ganzer Tisch',
      rows: [
        { a: 'VHT aus VH in Mitte oder RH', b: 'Block unregelmäßig in VH' },
        { a: 'VHT in ganzer Tisch', b: 'frei' }
      ]
    },
    {
      name: 'Aufschlag & Rückschlag',
      rows: [
        { a: 'kurzer Aufschlag in kurze RH', b: 'Schupf in RH' },
        { a: 'VHT aus VH diagonal', b: 'frei' }
      ]
    },
    {
      name: 'Wiederholung',
      rows: [
        { a: '2-3 mal RHT in RH', b: '2-3 mal RHB in RH' },
        { a: 'VHT aus RH in VH', b: 'frei' }
      ]
    },
    {
      name: 'Multiball (Zuspiel)',
      multiball: true,
      rows: [
        { a: 'VHT in VH', b: 'Zuspiel in VH' },
        { a: 'VHT in Mitte', b: 'Zuspiel in Mitte' },
        { a: 'VHT in RH', b: 'Zuspiel in RH' }
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
    state.forEach(function (row) {
      var pa = TTV.notation.parseCell(row.a);
      var pb = TTV.notation.parseCell(row.b);
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
    updateColumnHeads();
    rebuildTable();
    renderNow();
  }

  function updateColumnHeads() {
    if (!dom.headB) return;
    dom.headB.innerHTML = dom.multiball.checked
      ? 'Zuspieler <span class="muted">(Multiball)</span>'
      : 'Spieler B <span class="muted">(hinten)</span>';
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
    dom.headB = document.getElementById('headB');

    dom.addRow.addEventListener('click', addRow);
    dom.multiball.addEventListener('change', function () { updateColumnHeads(); renderNow(); });
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
