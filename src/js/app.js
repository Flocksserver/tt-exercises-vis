/*
 * app.js — UI: Eingabe-Tabelle, Live-Validierung, Auto-Render, Beispiele, Export.
 */
(function (TTV) {
  'use strict';

  var MAX_ROWS = 10;
  var MIN_ROWS = 1;

  // Standard-Übung und Beispielkatalog kommen aus examples.js (separat testbar).
  var DEFAULT_ROWS = TTV.examples.DEFAULT_ROWS;
  var EXAMPLES = TTV.examples.EXAMPLES;

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

  function T(k) { return TTV.i18n ? TTV.i18n.t(k) : k; }
  function errText(res) { return res.valid ? '' : (TTV.i18n ? TTV.i18n.error(res.code, res.arg) : res.message); }

  function renderNow() {
    var parsedRows = buildParsedRows();
    dom.svgContainer.innerHTML = '';
    if (parsedRows.length === 0) {
      var hint = document.createElement('p');
      hint.className = 'svg-empty';
      hint.textContent = T('svgEmpty');
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
    input.setAttribute('aria-label', (TTV.i18n ? TTV.i18n.aria(key === 'a' ? 'playerA' : 'playerB') : key) + ' ' + (rowIndex + 1));

    var err = document.createElement('span');
    err.className = 'cell-error';
    err.setAttribute('aria-live', 'polite');

    input.addEventListener('input', function () {
      state[rowIndex][key] = input.value;
      var res = TTV.notation.validateCell(input.value);
      if (res.valid) { input.classList.remove('invalid'); err.textContent = ''; }
      else { input.classList.add('invalid'); err.textContent = errText(res); }
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
      var rmLabel = TTV.i18n ? TTV.i18n.aria('removeRow', i + 1) : 'remove';
      remove.title = rmLabel;
      remove.setAttribute('aria-label', rmLabel);
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
      else { input.classList.add('invalid'); err.textContent = errText(res); }
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
    if (dom.headB) dom.headB.innerHTML = T(dom.multiball.checked ? 'colZ' : 'colB');
  }

  function buildExampleButtons() {
    EXAMPLES.forEach(function (ex, idx) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'btn-chip';
      btn.addEventListener('click', function () { loadRows(ex.rows, { multiball: ex.multiball }); });
      dom.examples.appendChild(btn);
    });
    setExampleNames();
  }

  function setExampleNames() {
    var btns = dom.examples.querySelectorAll('.btn-chip');
    EXAMPLES.forEach(function (ex, idx) {
      if (btns[idx]) btns[idx].textContent = TTV.i18n ? TTV.i18n.exampleName(idx) : ex.name;
    });
  }

  function setYear() {
    var y = document.getElementById('year');
    if (y) y.textContent = new Date().getFullYear();
  }

  function onLangChange() {
    setExampleNames();
    updateBalleimer();
    setYear();
    revalidateAll();
    renderNow();
  }

  function init() {
    dom.rowsBody = document.getElementById('rowsBody');
    dom.addRow = document.getElementById('addRow');
    dom.examples = document.getElementById('examples');
    dom.svgContainer = document.getElementById('svgContainer');
    dom.multiball = document.getElementById('multiball');
    dom.table = document.querySelector('.input-table');
    dom.headB = document.getElementById('headB');

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

    // Sprachumschalter (Flaggen) + Reaktion auf Sprachwechsel
    [].forEach.call(document.querySelectorAll('[data-lang-btn]'), function (b) {
      b.addEventListener('click', function () { if (TTV.i18n) TTV.i18n.setLang(b.getAttribute('data-lang-btn')); });
    });
    document.addEventListener('ttv:lang', onLangChange);

    buildExampleButtons();
    loadRows(DEFAULT_ROWS);
    if (TTV.i18n) TTV.i18n.apply(); else { setYear(); }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})(window.TTV = window.TTV || {});
