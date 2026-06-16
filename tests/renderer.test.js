'use strict';
const { test } = require('node:test');
const assert = require('node:assert');
const H = require('./harness');

const TTV = H.loadTTV();
const P = TTV.notation.parseCell;
const R = TTV.resolver.resolveSequence;
const COLORS = TTV.renderer.COLORS;

function render(rows, opts) {
  const resolved = R(rows.map(r => ({ a: P(r[0]), b: P(r[1] === undefined ? '' : r[1]) })));
  return TTV.renderer.render(resolved, opts || {});
}

test('Wiederhol-Gruppe: „×N"-Klammer + höheres SVG (Band)', () => {
  const resolved = R([
    { a: P('VHT aus VH in VH'), b: { type: 'empty' } },
    { a: P('VHT aus Mitte in VH'), b: { type: 'empty' } },
    { a: P('RHT aus RH in RH'), b: { type: 'empty' } }
  ], { inferReplies: true });
  const base = TTV.renderer.render(resolved, {});
  const badged = TTV.renderer.render(resolved, { repeatGroups: [{ start: 0, len: 3, repeat: '2' }] });
  assert.ok(H.texts(badged).indexOf('×2') >= 0, '×2-Label vorhanden');
  assert.ok(parseInt(badged.getAttribute('height'), 10) > parseInt(base.getAttribute('height'), 10), 'Band erhöht die SVG-Höhe');
});

test('RH-Konter: eine Doppellinie, keine Einzelpfeile, solide', () => {
  const svg = render([['RHK aus RH in RH', 'RHK aus RH in RH']]);
  assert.equal(H.doubleArrows(svg).length, 1);
  assert.equal(H.singleArrows(svg).length, 0);
  assert.equal(H.isDashed(H.doubleArrows(svg)[0]), false);
});

test('VH-Merge funktioniert ebenso (nicht nur RH)', () => {
  const svg = render([['VHT aus VH diagonal', 'Block in VH']]);
  assert.equal(H.doubleArrows(svg).length, 1);
});

test('Doppellinie: Farbverlauf rot (unten/A-Seite) -> blau (oben/B-Seite)', () => {
  const svg = render([['RHK aus RH in RH', 'RHK aus RH in RH']]);
  const grad = H.byTag(svg, 'linearGradient')[0];
  const stops = grad.children;
  assert.equal(stops[0].getAttribute('stop-color'), COLORS.B);                 // unten = B (rot)
  assert.equal(stops[stops.length - 1].getAttribute('stop-color'), COLORS.A);  // oben = A (blau)
});

test('oder: per-Pfeil-Merge + alle gestrichelt, kein Überlappen', () => {
  const svg = render([['2-3 mal VHT aus VH diagonal', 'Block in VH oder RH oder Mitte']]);
  const dbl = H.doubleArrows(svg), sgl = H.singleArrows(svg);
  assert.equal(dbl.length, 1, 'VH<->VH verschmilzt');
  assert.equal(sgl.length, 2, 'RH + Mitte bleiben einzeln');
  assert.ok(dbl.concat(sgl).every(H.isDashed), 'alle gestrichelt wegen oder');
});

test('oder ohne Merge: alle Pfeile des Schlags gestrichelt', () => {
  const svg = render([['VHT aus VH in Mitte oder RH', 'frei']]);
  const sgl = H.singleArrows(svg);
  assert.equal(sgl.length, 2);
  assert.ok(sgl.every(H.isDashed));
  assert.equal(H.doubleArrows(svg).length, 0);
});

test('einzelner Schlag ist solide (nicht gestrichelt)', () => {
  const svg = render([['VHT aus VH in RH', 'frei']]);
  const sgl = H.singleArrows(svg);
  assert.equal(sgl.length, 1);
  assert.equal(H.isDashed(sgl[0]), false);
});

test('Ursprungs-oder: ein Pfeil je Ursprung, alle gestrichelt, kein Merge', () => {
  const svg = render([['VHT aus Mitte oder RH in VH', 'frei']]);
  const sgl = H.singleArrows(svg);
  assert.equal(sgl.length, 2, 'je ein Pfeil von Mitte und von RH');
  assert.ok(sgl.every(H.isDashed));
  assert.equal(H.doubleArrows(svg).length, 0);
});

test('Ursprungs-oder mit Bereich: eine Zone je Ursprung', () => {
  const svg = render([['VHT aus Mitte oder RH in VH bis Mitte', 'frei']]);
  assert.equal(H.byTag(svg, 'polygon').length, 2);
});

test('Stroke-Alternativen: je ein Pfeil pro Alternative, gestrichelt, eigene Labels', () => {
  const svg = render([['VHT aus VH in RH oder RHT aus RH in Mitte', 'frei']]);
  const sgl = H.singleArrows(svg);
  assert.equal(sgl.length, 2, 'ein Pfeil je Alternative');
  assert.ok(sgl.every(H.isDashed));
  const labels = H.texts(svg);
  assert.ok(labels.includes('VHT') && labels.includes('RHT'), 'beide Techniken beschriftet');
});

test('Stroke-Alternative deckt das Block-Reaktions-Szenario ab', () => {
  // A: VHT aus VH in RH ODER RHT aus RH in RH, je nach B-Block
  const svg = render([['VHT aus VH in RH oder RHT aus RH in RH', 'Block in VH oder RH']]);
  // A-Alternativen + B-oder-Blocks, teils zu Doppellinien gemergt
  const total = H.singleArrows(svg).length + H.doubleArrows(svg).length;
  assert.ok(total >= 2);
});

test('frei und endlos erzeugen Marker-Text', () => {
  const svg = render([['VHT aus VH in RH', 'frei'], ['endlos', '']]);
  const txt = H.texts(svg);
  assert.ok(txt.includes('frei'));
  assert.ok(txt.some(t => /endlos/.test(t)));
});

test('Zonen (ganzer Tisch, halber Tisch, bis, unregelmäßig) erzeugen Polygone', () => {
  assert.equal(H.byTag(render([['VHT in ganzer Tisch', 'frei']]), 'polygon').length, 1);
  assert.equal(H.byTag(render([['VHT aus VH in VH bis Mitte', 'frei']]), 'polygon').length, 1);
  assert.equal(H.byTag(render([['Block unregelmäßig', 'frei']]), 'polygon').length, 1);
  assert.equal(H.byTag(render([['VHT diagonal', 'Block in halber Tisch RH']]), 'polygon').length, 1);
});

test('Technik-Label: A unterhalb, B oberhalb des Tischs', () => {
  const svg = render([['VHT aus VH in RH', 'VHB in VH']]);
  const t = TTV.geometry.table(0);
  const textsNodes = H.byTag(svg, 'text');
  const aLabel = textsNodes.find(n => n.textContent === 'VHT');
  const bLabel = textsNodes.find(n => n.textContent === 'VHB');
  assert.ok(Number(aLabel.getAttribute('y')) > t.startY + t.length, 'A-Label unter dem Tisch');
  assert.ok(Number(bLabel.getAttribute('y')) < t.startY, 'B-Label über dem Tisch');
});

test('Balleimer: nur A + graues gestricheltes Zuspiel aus RH halblang, kein B-Schlag', () => {
  const svg = render([['VHT aus VH diagonal', 'Zuspiel egal']], { multiball: true });
  const feed = H.paths(svg).filter(p => p.getAttribute('stroke') === COLORS.feed);
  assert.equal(feed.length, 1, 'genau ein Zuspiel-Pfeil');
  assert.ok(H.isDashed(feed[0]), 'Zuspiel gestrichelt');
  // Zuspiel beginnt bei B RH halblang
  const start = TTV.geometry.point(TTV.geometry.table(0), 'B', 'RH', 'halblang');
  assert.ok(feed[0].getAttribute('d').indexOf('M' + start.x + ',' + start.y) === 0);
  // kein roter B-Schlag
  assert.equal(H.paths(svg).filter(p => p.getAttribute('stroke') === COLORS.B).length, 0);
});

test('mehrere Tische werden gezeichnet', () => {
  const svg = render([['VHT aus VH in RH', 'frei'], ['VHT aus VH in VH', 'frei'], ['RHK in RH', 'frei']]);
  // grüne Spielfläche je Tisch
  const green = H.byTag(svg, 'rect').filter(r => r.getAttribute('fill') === '#0a7d3c');
  assert.equal(green.length, 3);
});
