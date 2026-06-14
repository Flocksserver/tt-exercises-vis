'use strict';
const { test } = require('node:test');
const assert = require('node:assert');
const { loadTTV } = require('./harness');

const TTV = loadTTV();
const P = TTV.notation.parseCell;
const R = TTV.resolver.resolveSequence;

function seq(rows) {
  return R(rows.map(r => ({ a: P(r[0]), b: P(r[1] === undefined ? '' : r[1]) })));
}

test('deriveTarget: diagonal hält Seite, parallel spiegelt', () => {
  const d = TTV.resolver.deriveTarget;
  assert.equal(d('VH', 'diagonal'), 'VH');
  assert.equal(d('RH', 'diagonal'), 'RH');
  assert.equal(d('VH', 'parallel'), 'RH');
  assert.equal(d('RH', 'parallel'), 'VH');
  assert.equal(d('Mitte', 'parallel'), 'Mitte');
});

test('erster Schlag ohne aus: Ursprung aus Schlaghand', () => {
  const res = seq([['RHK/RHT in RH', 'RHB in RH']]);
  assert.deepEqual(res[0].a.from, { pos: 'RH', depth: 'lang' });   // RH-Technik -> RH
});

test('Rückkehr ohne aus: Ursprung = Ballort (nicht Hand)', () => {
  // A spielt in die Mitte; B blockt mit VH -> muss AUS der Mitte kommen
  const res = seq([['VHT aus VH in Mitte', 'VHB in VH']]);
  assert.deepEqual(res[0].b.from, { pos: 'Mitte', depth: 'lang' });
  assert.deepEqual(res[0].b.arrows[0].to, { pos: 'VH', depth: 'lang' });
});

test('Ballverlauf-Kette über mehrere Reihen', () => {
  const res = seq([
    ['RHK/RHT in RH', 'RHB in Mitte der VH'],
    ['VHT in RH', 'frei']
  ]);
  // Reihe2 A: Ball liegt da, wo B hingespielt hat (MitteVH)
  assert.deepEqual(res[1].a.from, { pos: 'MitteVH', depth: 'lang' });
});

test('Richtung leitet Ziel ab, wenn kein in', () => {
  const res = seq([['VHT aus RH parallel', 'frei']]);
  assert.equal(res[0].a.arrows.length, 1);
  assert.equal(res[0].a.arrows[0].to.pos, 'VH');   // RH parallel -> VH
});

test('unregelmäßig ohne Ziel -> Zone über ganzen Tisch', () => {
  const res = seq([['Block unregelmäßig', 'frei']]);
  assert.ok(res[0].a.zone, 'Zone gesetzt');
  assert.equal(res[0].a.variable, true);
});

test('ganzer Tisch -> Zone VH..RH', () => {
  const res = seq([['VHT in ganzer Tisch', 'frei']]);
  assert.deepEqual(res[0].a.zone, { from: { pos: 'VH', depth: 'lang' }, to: { pos: 'RH', depth: 'lang' } });
});

test('Bereich (bis) -> Zone mit den zwei Positionen', () => {
  const res = seq([['VHT aus VH in VH bis Mitte', 'frei']]);
  assert.deepEqual(res[0].a.zone.from.pos, 'VH');
  assert.deepEqual(res[0].a.zone.to.pos, 'Mitte');
});

test('oder: mehrere Pfeile, erste markiert Folgeposition', () => {
  const res = seq([['VHT aus VH in Mitte oder RH', 'Block in VH']]);
  assert.equal(res[0].a.arrows.length, 2);
  // primäres Ziel (erstes) = Mitte -> B kommt aus Mitte
  assert.deepEqual(res[0].b.from, { pos: 'Mitte', depth: 'lang' });
});

test('frei/endlos werden als Marker durchgereicht', () => {
  const res = seq([['VHT aus VH in RH', 'frei'], ['endlos', '']]);
  assert.equal(res[0].b.kind, 'frei');
  assert.equal(res[1].a.kind, 'endlos');
});

test('Fehlerzellen werden zu null (nicht gezeichnet)', () => {
  const res = seq([['VHT aus Foo in RH', 'frei']]);
  assert.equal(res[0].a, null);
});
