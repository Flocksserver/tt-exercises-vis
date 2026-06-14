'use strict';
const { test } = require('node:test');
const assert = require('node:assert');
const H = require('./harness');

const TTV = H.loadTTV();
const P = TTV.notation.parseCell;
const R = TTV.resolver.resolveSequence;
function render(rows, opts) {
  return TTV.renderer.render(R(rows.map(r => ({ a: P(r[0]), b: P(r[1] || '') }))), opts || {});
}

test('Groß-/Kleinschreibung wird toleriert', () => {
  const r = P('vht AUS vh IN mitte');
  assert.equal(r.type, 'stroke');
  assert.equal(r.target.list[0].pos, 'Mitte');
});

test('fehlende Zielposition -> Fehler', () => {
  assert.equal(P('VHT aus VH in').type, 'error');
  assert.equal(P('VHT aus VH in Mitte oder').type, 'error');
});

test('nur Wiederholung ohne Technik -> Fehler', () => {
  assert.equal(P('2-3 mal').type, 'error');
});

test('Wiederholung + führende Tiefe kombiniert', () => {
  const r = P('2-3 mal kurzer Aufschlag in RH');
  assert.equal(r.repeat, '2-3');
  assert.equal(r.strokeDepth, 'kurz');
  assert.equal(r.technik, 'Aufschlag');
  assert.equal(r.target.list[0].depth, 'kurz');
});

test('Freitext-Zusätze werden tolerant ignoriert', () => {
  assert.equal(P('VHT aus VH in Mitte zum Punktgewinn').type, 'stroke');
});

test('kein Merge wenn Strecken verschieden', () => {
  // A: VH->RH (diagonal), B: RH->RH (parallel) -> verschiedene Linien
  const svg = render([['VHT aus VH in RH', 'RHB aus RH in RH']]);
  assert.equal(H.doubleArrows(svg).length, 0);
  assert.equal(H.singleArrows(svg).length, 2);
});

test('Merge führt unterschiedliche Tiefen sauber (kurz<->lang dieselbe Strecke)', () => {
  // A spielt VH->kurze VH; B blockt von dort zurück in A's VH -> dieselbe Strecke
  const svg = render([['VHT aus VH in kurze VH', 'Block in VH']]);
  assert.equal(H.doubleArrows(svg).length, 1);
  assert.equal(H.singleArrows(svg).length, 0);
});

test('Zone (A) + Pfeil (B) verschmelzen nicht', () => {
  const svg = render([['VHT aus VH in VH bis Mitte', 'Block in VH']]);
  assert.equal(H.doubleArrows(svg).length, 0);
  assert.equal(H.byTag(svg, 'polygon').length, 1);
});

test('nur Spieler B in einer Reihe', () => {
  const svg = render([['', 'RHB in RH']]);
  assert.equal(H.singleArrows(svg).length, 1);
  assert.equal(H.doubleArrows(svg).length, 0);
});

test('Balleimer mit oder: alle A-Pfeile gestrichelt + Zuspiel', () => {
  const svg = render([['VHT aus VH in VH oder RH', '']], { multiball: true });
  const feed = H.paths(svg).filter(p => p.getAttribute('stroke') === TTV.renderer.COLORS.feed);
  assert.equal(feed.length, 1);
  const blue = H.paths(svg).filter(p => p.getAttribute('stroke') === TTV.renderer.COLORS.A);
  assert.equal(blue.length, 2);
  assert.ok(blue.every(H.isDashed));
});

test('leere Übung -> gültiges SVG ohne Ball-Pfeile (nur Marker-Defs)', () => {
  const svg = TTV.renderer.render([], {});
  assert.equal(svg.tagName, 'svg');
  assert.equal(H.singleArrows(svg).length + H.doubleArrows(svg).length, 0);
  assert.equal(H.byTag(svg, 'rect').filter(r => r.getAttribute('fill') === '#0a7d3c').length, 0);
});

test('viele Reihen (10) rendern ohne Fehler', () => {
  const rows = [];
  for (let i = 0; i < 10; i++) rows.push(['VHT aus VH in RH', 'frei']);
  const svg = render(rows);
  assert.equal(H.byTag(svg, 'rect').filter(r => r.getAttribute('fill') === '#0a7d3c').length, 10);
});
