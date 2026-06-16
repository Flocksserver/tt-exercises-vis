/*
 * app.js — UI: Eingabe-Tabelle, Live-Validierung, Auto-Render, Beispiele, Export.
 */
(function (TTV) {
  'use strict';

  var MAX_ROWS = 10;
  var MIN_ROWS = 1;

  // Standard-Übung und Beispielkatalog kommen aus examples.js (separat testbar).
  var EXAMPLES = TTV.examples.EXAMPLES;

  function isEn() { return TTV.i18n && TTV.i18n.lang === 'en'; }
  function exRows(ex) { return (isEn() && ex.rowsEn) ? ex.rowsEn : ex.rows; }
  function defaultRows() { return (isEn() && TTV.examples.DEFAULT_ROWS_EN) ? TTV.examples.DEFAULT_ROWS_EN : TTV.examples.DEFAULT_ROWS; }

  var pristine = null;   // 'default' | Beispiel-Objekt | null (vom Nutzer bearbeitet)

  var state = [];
  var mode = 'table';        // 'table' | 'sequence'
  var seqPristine = true;    // Sequenz-Textfeld noch unverändert (für Sprachwechsel-Neuladen)
  var renderTimer = null;
  var dom = {};

  function debouncedRender() {
    if (renderTimer) clearTimeout(renderTimer);
    renderTimer = setTimeout(renderNow, 180);
  }

  // --- Sequenz-Modus ----------------------------------------------------

  // Sequenz-Text in einzelne Schläge zerlegen. Trenner: Zeile, Komma, Semikolon, „->“,
  // „ - “ (Bindestrich mit Leerzeichen) und „|“. (Bare „-“ NICHT, sonst bräche „VH-Mitte“,
  // „2-3“, „US-Aufschlag“; „→“ zusätzlich erlaubt, ist aber nicht tippbar.)
  function splitSeq(text) {
    return String(text || '').split(/\r?\n|[,;|]|->|→|\s-\s|\s+(?:und|and)\s+/i).map(function (s) { return s.trim(); }).filter(Boolean);
  }

  // Standard-Sequenz aus examples.js (authentische CampMappe-Übung), je Sprache.
  function defaultSeqText() {
    return (isEn() && TTV.examples.DEFAULT_SEQ_EN) ? TTV.examples.DEFAULT_SEQ_EN : TTV.examples.DEFAULT_SEQ;
  }

  // Ist das Token eine reine (Einwort-)Position? (z. B. VH, Mitte, RH, MitteVH …)
  var _barePos = {};
  function barePos(tok) {
    if (Object.prototype.hasOwnProperty.call(_barePos, tok)) return _barePos[tok];
    var r = TTV.notation.parseCell('Zz in ' + tok);
    var ok = r.type === 'stroke' && r.target && r.target.kind === 'positions' && r.target.list.length === 1;
    return (_barePos[tok] = ok ? r.target.list[0].pos : null);
  }

  // Ein Sequenz-Element zu (ggf. mehreren) Schlägen expandieren.
  // Reine Positionsfolge „VH Mitte RH" -> je Position ein Schlag: Vorhand aus VH/Mitte (Mitte =
  // umlaufen), Rückhand aus RH, jeweils diagonal auf die Schlaghand-Seite. Sonst: ein normaler Schlag.
  function expandItem(itemText) {
    // „dann/danach/then" sind nur Bindewörter (z. B. „… dann frei") -> entfernen.
    var t = itemText.trim().replace(/^\s*(dann|danach|then)\s+/i, '');
    if (/^(frei|free|endlos|endless)$/i.test(t)) return [TTV.notation.parseCell(t)];   // alleinstehender Marker
    var toks = t.split(/\s+/).filter(Boolean).filter(function (x) { return !/^(dann|danach|then)$/i.test(x); });
    // abschließendes „frei/free" gehört zum LETZTEN Schlag (der ist offen) – keine eigene Kachel
    var openLast = toks.length > 1 && /^(frei|free)$/i.test(toks[toks.length - 1]);
    if (openLast) toks = toks.slice(0, -1);
    if (toks.length && toks.every(function (x) { return barePos(x); })) {
      return toks.map(function (tok, idx) {
        var hand = TTV.replies.handForLanding(barePos(tok));   // VH/Mitte -> VH, RH -> RH
        var last = idx === toks.length - 1;
        var text = (last && openLast) ? (hand + 'T aus ' + tok + ' frei')   // letzter Ball offen
                                      : (hand + 'T aus ' + tok + ' in ' + hand);
        return TTV.notation.parseCell(text);
      });
    }
    return [TTV.notation.parseCell(t)];
  }

  function buildSequenceRows() {
    var aRaw = dom.seqA.value, bRaw = dom.seqB.value, aItems, bItems;
    if (/\n/.test(aRaw) || /\n/.test(bRaw)) {
      // mehrzeilig: ein Element je Zeile, B Zeile-für-Zeile (leere B-Zeile = Auto-Antwort)
      aItems = aRaw.split(/\r?\n/); bItems = bRaw.split(/\r?\n/);
    } else {
      // einzeilig: Komma / „->“ / „ - “ als Trenner (kein Zeilen-Override)
      aItems = splitSeq(aRaw); bItems = splitSeq(bRaw);
    }
    var rows = [], groups = [];
    aItems.forEach(function (aTxt, i) {
      aTxt = String(aTxt).trim();
      if (!aTxt) return;
      // optionaler Gruppen-Wiederholungsfaktor: „2x VH Mitte RH" / „2 mal …" / „(2x) …"
      var gm = aTxt.match(/^\(?\s*(\d+(?:-\d+)?)\s*(?:x|mal|times)\s*\)?\s+(.+)$/i);
      var repeat = gm ? gm[1] : null;
      var expanded = expandItem(gm ? gm[2] : aTxt);          // 1..n Schläge
      if (repeat && expanded.length <= 1) { repeat = null; expanded = expandItem(aTxt); } // Einzelschlag -> Parser-Repeat
      var bTxt = String(bItems[i] || '').trim();
      var start = rows.length;
      expanded.forEach(function (pa) {
        // B-Override nur bei Einzelschlag-Elementen; expandierte Folgen bekommen Auto-Antwort
        var pb = (expanded.length === 1 && bTxt) ? TTV.notation.parseCell(bTxt) : { type: 'empty' };
        if (pa.type === 'empty' && pb.type === 'empty') return;
        rows.push({ a: pa, b: pb });
      });
      // wiederholte Gruppe -> Zyklus einmal zeichnen + „×N"-Klammer
      if (repeat && rows.length - start > 1) groups.push({ start: start, len: rows.length - start, repeat: repeat });
    });

    // Auto-Erkennung: ist die GANZE Folge N-mal derselbe Zyklus, einmal zeichnen + „×N".
    // Endet die Folge mit einem FREIEN Ball (Loop-Auflösung), NICHT zusammenfassen – dann
    // werden alle Ballwege gezeichnet und der letzte Ball ist frei (ganzer Tisch).
    var lastA = rows.length ? rows[rows.length - 1].a : null;
    var endsFree = lastA && (lastA.openEnd || lastA.type === 'frei');
    if (!groups.length && !endsFree) {
      var cyc = detectCycle(rows);
      if (cyc) groups = [{ start: 0, len: (rows = rows.slice(0, cyc.base)).length, repeat: String(cyc.reps) }];
      else rows = splitTransitions(rows);   // Wiederholung mit Ursprungswechsel -> Loop + Übergang
    }
    return { rows: rows, groups: groups };
  }

  // Schlag-Signatur (Technik/Ursprung/Richtung/Regel/Ziel) – „frei"-Schläge nur über Technik+Ursprung
  // vergleichen (deren Ziel ist offen), damit ein abschließender freier Ball den Zyklus nicht bricht.
  function aSig(a) {
    var t = a.target, tk = t ? (t.kind + ':' + ((t.list || []).map(function (x) { return x.pos; }).join(',')) + (t.range ? t.range.from + '>' + t.range.to : '') + (t.spec || '')) : '';
    return [a.technik, a.from ? a.from.pos : '', (a.directions || []).join(','), a.regular || '', tk].join('|');
  }
  function aHand(a) { return a.technik + '|' + (a.from ? a.from.pos : ''); }
  function sameCycleStroke(x, y) { return (x.openEnd || y.openEnd) ? aHand(x) === aHand(y) : aSig(x) === aSig(y); }
  function originKey(a) { return a.from ? a.from.pos : ''; }

  // Wiederholung mit Ursprungswechsel auflösen: gleiche aufeinanderfolgende Schläge zu einem
  // „N×"-Loop-Tisch bündeln; wechselt danach der Ursprung, einen Übergangs-Tisch einfügen
  // (B blockt dort zur nächsten Position statt zur eigenen). Beispiel: „2x aus VH" dann „2x aus
  // Mitte" -> [2× VH (B→VH)] [Übergang VH→Mitte] [2× Mitte (B→Mitte)].
  function splitTransitions(rows) {
    var merged = [];
    rows.forEach(function (r) {
      var last = merged[merged.length - 1];
      if (last && r.a && r.a.type === 'stroke' && last.a && last.a.type === 'stroke' &&
          !last.a.openEnd && !r.a.openEnd && aSig(r.a) === aSig(last.a)) {
        last.__n = (last.__n || 1) + 1;
      } else { if (r.a && r.a.type === 'stroke') r.__n = 1; merged.push(r); }
    });
    merged.forEach(function (r) { if (r.__n > 1 && r.a && !r.a.repeat) r.a.repeat = String(r.__n); delete r.__n; });
    var out = [];
    for (var i = 0; i < merged.length; i++) {
      var r = merged[i], nx = merged[i + 1]; out.push(r);
      var rep = r.a && r.a.type === 'stroke' && r.a.repeat && /^\d+$/.test(String(r.a.repeat)) && +r.a.repeat > 1;
      if (rep && nx && nx.a && nx.a.type === 'stroke' && originKey(r.a) !== originKey(nx.a)) {
        var n = +r.a.repeat;
        var tr = {}; for (var k in r.a) tr[k] = r.a[k]; tr.repeat = null;   // der N-te Ball = Übergang
        r.a.repeat = (n - 1) > 1 ? String(n - 1) : null;                   // Loop zeigt einen weniger
        out.push({ a: tr, b: { type: 'empty' } });
      }
    }
    return out;
  }
  // Kleinste Periode p (mit n/p >= 2 gleichen Blöcken) finden; sonst null.
  function detectCycle(rows) {
    var n = rows.length;
    if (n < 2) return null;
    for (var p = 1; p <= n / 2; p++) {
      if (n % p) continue;
      var ok = true;
      for (var i = p; i < n && ok; i++) {
        var a = rows[i].a, b = rows[i % p].a;
        if (!a || a.type !== 'stroke' || !b || b.type !== 'stroke' || !sameCycleStroke(a, b)) ok = false;
      }
      if (ok) return { base: p, reps: n / p };
    }
    return null;
  }

  function validateSeq() {
    var items = splitSeq(dom.seqA.value).concat(splitSeq(dom.seqB.value));
    var bad = null;
    for (var i = 0; i < items.length && !bad; i++) {
      var r = TTV.notation.validateCell(items[i]);
      if (!r.valid) bad = r;
    }
    dom.seqError.textContent = bad ? errText(bad) : '';
  }

  function setMode(m) {
    mode = m;
    dom.panelTable.hidden = m !== 'table';
    dom.panelSequence.hidden = m !== 'sequence';
    [].forEach.call(dom.modeBtns, function (b) {
      var on = b.getAttribute('data-mode-btn') === m;
      b.classList.toggle('active', on);
      b.setAttribute('aria-selected', on ? 'true' : 'false');
      b.tabIndex = on ? 0 : -1;                 // Roving tabindex (ARIA Tabs-Muster)
    });
    renderNow();
  }

  // Lokalisierte aria-labels der Flaggen-Buttons (Screenreader).
  function setLangLabels() {
    if (!TTV.i18n) return;
    var de = document.querySelector('[data-lang-btn="de"]'), en = document.querySelector('[data-lang-btn="en"]');
    if (de) de.setAttribute('aria-label', TTV.i18n.aria('langDe'));
    if (en) en.setAttribute('aria-label', TTV.i18n.aria('langEn'));
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
  function errText(res) { return res.valid ? '' : (TTV.i18n ? TTV.i18n.error(res.code, res.arg, res.suggestion) : res.message); }

  function emptyHint() {
    var hint = document.createElement('p');
    hint.className = 'svg-empty';
    hint.textContent = T('svgEmpty');
    return hint;
  }

  function renderNow() {
    if (mode === 'sequence') validateSeq();
    var seqMode = mode === 'sequence';
    var balleimer = seqMode ? dom.seqMultiball.checked : dom.multiball.checked;
    var built = seqMode ? buildSequenceRows() : null;
    var parsedRows = seqMode ? built.rows : buildParsedRows();
    dom.svgContainer.innerHTML = '';
    if (parsedRows.length === 0) { dom.svgContainer.appendChild(emptyHint()); return; }
    var opts = balleimer ? { multiball: true, feeder: 'B' } : {};
    if (seqMode && built.groups.length) opts.repeatGroups = built.groups;   // „×N"-Klammern
    // B nur ableiten, wenn kein Balleimer (im Balleimer-Modus fällt Spieler B weg).
    var resolved = TTV.resolver.resolveSequence(parsedRows, {
      inferReplies: seqMode && !balleimer,
      repeatGroups: seqMode ? built.groups : null   // letzter Zyklus-Ball loopt zurück zum Start
    });
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
      pristine = null;   // Nutzer hat bearbeitet -> bei Sprachwechsel nicht überschreiben
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

  function loadRows(rows, opts, source) {
    state = rows.map(function (r) { return { a: r.a || '', b: r.b || '' }; });
    if (state.length === 0) state = [{ a: '', b: '' }];
    dom.multiball.checked = !!(opts && opts.multiball);
    pristine = source !== undefined ? source : null;
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
      btn.addEventListener('click', function () { loadRows(exRows(ex), { multiball: ex.multiball }, ex); });
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
    setLangLabels();
    setYear();
    if (dom.seqA && seqPristine) dom.seqA.value = defaultSeqText();   // Sequenz mit-übersetzen
    // unveränderte Standard-/Beispiel-Inhalte in der neuen Sprache neu laden
    if (pristine === 'default') loadRows(defaultRows(), {}, 'default');
    else if (pristine) loadRows(exRows(pristine), { multiball: pristine.multiball }, pristine);
    else { updateBalleimer(); revalidateAll(); renderNow(); }
  }

  function init() {
    dom.rowsBody = document.getElementById('rowsBody');
    dom.addRow = document.getElementById('addRow');
    dom.examples = document.getElementById('examples');
    dom.svgContainer = document.getElementById('svgContainer');
    dom.multiball = document.getElementById('multiball');
    dom.table = document.querySelector('.input-table');
    dom.headB = document.getElementById('headB');
    dom.seqA = document.getElementById('seqA');
    dom.seqB = document.getElementById('seqB');
    dom.seqError = document.getElementById('seqError');
    dom.panelTable = document.getElementById('panel-table');
    dom.panelSequence = document.getElementById('panel-sequence');
    dom.seqMultiball = document.getElementById('seqMultiball');
    dom.modeTabs = document.getElementById('modeTabs');
    dom.modeBtns = document.querySelectorAll('[data-mode-btn]');

    dom.addRow.addEventListener('click', addRow);
    [].forEach.call(dom.modeBtns, function (b) {
      b.addEventListener('click', function () { setMode(b.getAttribute('data-mode-btn')); });
    });
    // Pfeiltasten-Navigation zwischen den Tabs (ARIA Tabs-Muster)
    dom.modeTabs.addEventListener('keydown', function (e) {
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
      var btns = [].slice.call(dom.modeBtns), i = btns.indexOf(document.activeElement);
      if (i < 0) return;
      var ni = e.key === 'ArrowRight' ? (i + 1) % btns.length : (i - 1 + btns.length) % btns.length;
      setMode(btns[ni].getAttribute('data-mode-btn')); btns[ni].focus(); e.preventDefault();
    });
    dom.seqA.addEventListener('input', function () { seqPristine = false; debouncedRender(); });
    dom.seqB.addEventListener('input', function () { seqPristine = false; debouncedRender(); });
    dom.seqMultiball.addEventListener('change', function () {
      dom.panelSequence.classList.toggle('hide-b', dom.seqMultiball.checked);   // B-Feld ausblenden
      renderNow();
    });

    // Spracheingabe (Experiment) – nur einblenden, wenn der Browser sie unterstützt.
    dom.voiceRow = document.getElementById('voiceRow');
    dom.btnVoice = document.getElementById('btnVoice');
    dom.voiceStatus = document.getElementById('voiceStatus');
    if (TTV.voice && TTV.voice.isSupported() && dom.voiceRow) {
      dom.voiceRow.hidden = false;
      dom.btnVoice.addEventListener('click', function () {
        TTV.voice.toggle(isEn() ? 'en' : 'de', {
          onStatus: function (state, info) {
            if (state === 'loading') {
              dom.voiceStatus.textContent = T('voiceLoading') + (typeof info === 'number' ? ' ' + info + ' %' : '');
            } else if (state === 'ready') {
              dom.voiceStatus.textContent = TTV.voice.isRecording() ? T('voiceListening') : '';
            } else {
              var k = { listening: 'voiceListening', transcribing: 'voiceTranscribing', error: 'voiceError' }[state];
              dom.voiceStatus.textContent = k ? T(k) : '';
            }
            dom.btnVoice.classList.toggle('recording', TTV.voice.isRecording());
          },
          onResult: function (text) {
            if (!text) return;
            dom.seqA.value = text; seqPristine = false;
            dom.seqA.dispatchEvent(new Event('input', { bubbles: true }));
          }
        });
      });
    }
    dom.multiball.addEventListener('change', function () { updateBalleimer(); renderNow(); });
    document.getElementById('btnPng').addEventListener('click', function () {
      TTV.exporter.exportPNG(currentSvg(), 'tt-uebung.png', 3);
    });
    document.getElementById('btnSvg').addEventListener('click', function () {
      TTV.exporter.exportSVG(currentSvg(), 'tt-uebung.svg');
    });
    document.getElementById('btnReset').addEventListener('click', function () {
      // Zurücksetzen = Eingaben LÖSCHEN (kein Beispiel wiederherstellen).
      if (mode === 'sequence') {
        dom.seqA.value = ''; dom.seqB.value = ''; seqPristine = false;
        dom.seqMultiball.checked = false; dom.panelSequence.classList.remove('hide-b');
        renderNow();
      } else {
        loadRows([], { multiball: false }, null);   // eine leere Zeile
      }
    });

    // Sprachumschalter (Flaggen) + Reaktion auf Sprachwechsel
    [].forEach.call(document.querySelectorAll('[data-lang-btn]'), function (b) {
      b.addEventListener('click', function () { if (TTV.i18n) TTV.i18n.setLang(b.getAttribute('data-lang-btn')); });
    });
    document.addEventListener('ttv:lang', onLangChange);

    buildExampleButtons();
    dom.seqA.value = defaultSeqText();   // Sequenz-Feld vorbefüllen (Standard-Übung)
    loadRows(defaultRows(), {}, 'default');
    if (TTV.i18n) TTV.i18n.apply(); else { setYear(); }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})(window.TTV = window.TTV || {});
