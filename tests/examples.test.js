'use strict';
const { test } = require('node:test');
const assert = require('node:assert');
const { loadTTV } = require('./harness');

const TTV = loadTTV();
const P = TTV.notation.parseCell;
const { DEFAULT_ROWS, EXAMPLES } = TTV.examples;

function parseRows(rows) {
  return rows.map(r => ({ a: P(r.a || ''), b: P(r.b || '') }));
}

const DEFAULT_ROWS_EN = TTV.examples.DEFAULT_ROWS_EN;

test('alle Beispiel-Zellen (DE + EN) sind syntaktisch gültig', () => {
  const all = [{ name: 'DEFAULT', rows: DEFAULT_ROWS, rowsEn: DEFAULT_ROWS_EN }].concat(EXAMPLES);
  all.forEach(ex => {
    [['de', ex.rows], ['en', ex.rowsEn]].forEach(([langKey, rows]) => {
      assert.ok(rows, `${ex.name}: ${langKey}-Zeilen fehlen`);
      rows.forEach((row, i) => {
        ['a', 'b'].forEach(k => {
          const r = P(row[k] || '');
          assert.notEqual(r.type, 'error', `${ex.name} ${langKey} Zeile ${i + 1} (${k}): "${row[k]}" -> ${r.message || ''}`);
        });
      });
    });
  });
});

test('englische Beispiele sind logisch konsistent', () => {
  [{ rows: DEFAULT_ROWS_EN }].concat(EXAMPLES.map(e => ({ rows: e.rowsEn }))).forEach(ex => {
    const issues = TTV.resolver.findOriginIssues(parseRows(ex.rows));
    assert.equal(issues.length, 0, JSON.stringify(issues));
  });
});

test('Standard-Übung ist logisch konsistent (keine Ursprungs-Fehler)', () => {
  const issues = TTV.resolver.findOriginIssues(parseRows(DEFAULT_ROWS));
  assert.deepEqual(issues, [], JSON.stringify(issues));
});

test('jedes Beispiel ist logisch konsistent (aus = Ballort)', () => {
  EXAMPLES.forEach(ex => {
    const issues = TTV.resolver.findOriginIssues(parseRows(ex.rows));
    assert.equal(issues.length, 0,
      `${ex.name}: ` + issues.map(i => `Zeile ${i.row + 1} ${i.player} ${i.technik} aus ${i.got}, Ball liegt aber ${i.expected}`).join('; '));
  });
});

test('findOriginIssues erkennt unlogischen Ursprung', () => {
  // B spielt deterministisch in die RH, danach spielt A "aus VH" -> Ball liegt aber in RH
  const bad = [
    { a: 'RHK in RH', b: 'RHB in RH' },
    { a: 'VHT aus VH in Mitte', b: 'frei' }
  ];
  const issues = TTV.resolver.findOriginIssues(parseRows(bad));
  assert.equal(issues.length, 1);
  assert.equal(issues[0].player, 'A');
  assert.equal(issues[0].expected, 'RH');
  assert.equal(issues[0].got, 'VH');
});

test('findOriginIssues meldet NICHT nach variablem Ball (oder/ganzer Tisch/unregelmäßig)', () => {
  const okAfterVariable = [
    { a: 'VHT aus VH in VH oder RH', b: 'frei' },   // variabel
    { a: 'VHT aus RH in VH', b: 'frei' }            // aus RH nach variabel -> ok
  ];
  assert.deepEqual(TTV.resolver.findOriginIssues(parseRows(okAfterVariable)), []);
});

test('erster Schlag und Pivot (Umlaufen) sind erlaubt', () => {
  // Ball liegt in RH, A läuft um und spielt Vorhand AUS RH -> kein Fehler (Hand != Seite ok)
  const pivot = [
    { a: 'RHK in RH', b: 'RHB in RH' },
    { a: 'VHT aus RH diagonal', b: 'frei' }
  ];
  assert.deepEqual(TTV.resolver.findOriginIssues(parseRows(pivot)), []);
});
