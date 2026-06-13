/*
 * app.js — UI: Eingabe-Tabelle, Live-Validierung, Auto-Render, Beispiele, Export.
 */
(function (TTV) {
  'use strict';

  var MAX_ROWS = 8;
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
      name: 'Kurze Bälle',
      rows: [
        { a: 'kurzer VHB aus VH in kurze Mitte', b: 'kurzer RHB aus Mitte in kurze RH' },
        { a: 'VHT aus RH in VH', b: 'Frei' }
      ]
    },
    {
      name: 'Unregelmäßig (oder)',
      rows: [
        { a: 'VHT aus VH in Mitte oder RH', b: 'Frei' }
      ]
    },
    {
      name: 'Bereich (bis)',
      rows: [
        { a: 'VHT aus VH in VH bis Mitte', b: 'Frei' }
      ]
    },
    {
      name: 'Wiederholung',
      rows: [
        { a: '2-3 mal RHT aus RH in RH', b: '2-3 mal RHB aus RH in RH' },
        { a: 'VHT aus RH in VH', b: 'Frei' }
      ]
    }
  ];

  var state = [];           // [{a, b}]
  var renderTimer = null;
  var dom = {};

  function debouncedRender() {
    if (renderTimer) clearTimeout(renderTimer);
    renderTimer = setTimeout(renderNow, 180);
  }

  function buildUebung() {
    var uebung = [];
    state.forEach(function (row) {
      var pa = TTV.notation.parseCell(row.a);
      var pb = TTV.notation.parseCell(row.b);
      var hasContent = pa.type !== 'empty' || pb.type !== 'empty';
      if (!hasContent) return;
      uebung.push({
        a: (pa.type === 'stroke' || pa.type === 'frei') ? pa : null,
        b: (pb.type === 'stroke' || pb.type === 'frei') ? pb : null
      });
    });
    return uebung;
  }

  function renderNow() {
    var uebung = buildUebung();
    dom.svgContainer.innerHTML = '';
    if (uebung.length === 0) {
      var hint = document.createElement('p');
      hint.className = 'svg-empty';
      hint.textContent = 'Trage oben eine Übung ein – die Visualisierung erscheint hier.';
      dom.svgContainer.appendChild(hint);
      return;
    }
    dom.svgContainer.appendChild(TTV.renderer.render(uebung));
  }

  function currentSvg() {
    return dom.svgContainer.querySelector('svg');
  }

  // --- Eingabe-Tabelle aufbauen ----------------------------------------

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

    function onInput() {
      state[rowIndex][key] = input.value;
      var res = TTV.notation.validateCell(input.value);
      if (res.valid) {
        input.classList.remove('invalid');
        err.textContent = '';
      } else {
        input.classList.add('invalid');
        err.textContent = res.message;
      }
      debouncedRender();
    }

    input.addEventListener('input', onInput);
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
    // bereits vorhandene Eingaben validieren
    revalidateAll();
  }

  function revalidateAll() {
    var inputs = dom.rowsBody.querySelectorAll('.cell-input');
    inputs.forEach(function (input) {
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

  function loadRows(rows) {
    state = rows.map(function (r) { return { a: r.a || '', b: r.b || '' }; });
    if (state.length === 0) state = [{ a: '', b: '' }];
    rebuildTable();
    renderNow();
  }

  function buildExampleButtons() {
    EXAMPLES.forEach(function (ex) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'btn-chip';
      btn.textContent = ex.name;
      btn.addEventListener('click', function () { loadRows(ex.rows); });
      dom.examples.appendChild(btn);
    });
  }

  function init() {
    dom.rowsBody = document.getElementById('rowsBody');
    dom.addRow = document.getElementById('addRow');
    dom.examples = document.getElementById('examples');
    dom.svgContainer = document.getElementById('svgContainer');

    dom.addRow.addEventListener('click', addRow);
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

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})(window.TTV = window.TTV || {});
