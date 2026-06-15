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
const s0 = cell => cell.shots[0];   // erster shot einer Zelle

test('deriveTarget: diagonal hält Seite, parallel spiegelt', () => {
  const d = TTV.resolver.deriveTarget;
  assert.equal(d('VH', 'diagonal'), 'VH');
  assert.equal(d('RH', 'diagonal'), 'RH');
  assert.equal(d('VH', 'parallel'), 'RH');
  assert.equal(d('RH', 'parallel'), 'VH');
  assert.equal(d('Mitte', 'parallel'), 'Mitte');
  // weite Außen-Positionen spiegeln aufeinander
  assert.equal(d('VHweit', 'diagonal'), 'VHweit');
  assert.equal(d('VHweit', 'parallel'), 'RHweit');
  assert.equal(d('RHweit', 'parallel'), 'VHweit');
});

test('erster Schlag ohne aus: Ursprung aus Schlaghand', () => {
  const res = seq([['RHK/RHT in RH', 'RHB in RH']]);
  assert.deepEqual(s0(res[0].a).from, { pos: 'RH', depth: 'lang' });   // RH-Technik -> RH
});

test('Rückkehr ohne aus: Ursprung = Ballort (nicht Hand)', () => {
  const res = seq([['VHT aus VH in Mitte', 'VHB in VH']]);
  assert.deepEqual(s0(res[0].b).from, { pos: 'Mitte', depth: 'lang' });
  assert.deepEqual(s0(res[0].b).arrows[0].to, { pos: 'VH', depth: 'lang' });
});

test('Ballverlauf-Kette über mehrere Reihen', () => {
  const res = seq([
    ['RHK/RHT in RH', 'RHB in Mitte der VH'],
    ['VHT in RH', 'frei']
  ]);
  assert.deepEqual(s0(res[1].a).from, { pos: 'MitteVH', depth: 'lang' });
});

test('Richtung leitet Ziel ab, wenn kein in', () => {
  const res = seq([['VHT aus RH parallel', 'frei']]);
  assert.equal(s0(res[0].a).arrows.length, 1);
  assert.equal(s0(res[0].a).arrows[0].to.pos, 'VH');   // RH parallel -> VH
});

test('Richtungs-Alternativen -> ein Pfeil je Richtung (gestrichelt)', () => {
  const res = seq([['VHT aus VH diagonal oder parallel', 'frei']]);
  const a = s0(res[0].a);
  assert.equal(a.arrows.length, 2);
  assert.deepEqual(a.arrows.map(x => x.to.pos).sort(), ['RH', 'VH']);  // diagonal->VH, parallel->RH
  assert.ok(a.arrows.every(x => x.dashed));
});

test('unregelmäßig ohne Ziel -> Zone über ganzen Tisch', () => {
  const res = seq([['Block unregelmäßig', 'frei']]);
  assert.ok(s0(res[0].a).zone, 'Zone gesetzt');
  assert.equal(s0(res[0].a).variable, true);
});

test('ganzer Tisch -> Zone VH..RH', () => {
  const res = seq([['VHT in ganzer Tisch', 'frei']]);
  assert.deepEqual(s0(res[0].a).zone, { from: { pos: 'VH', depth: 'lang' }, to: { pos: 'RH', depth: 'lang' } });
});

test('Bereich (bis) -> Zone mit den zwei Positionen', () => {
  const res = seq([['VHT aus VH in VH bis Mitte', 'frei']]);
  assert.equal(s0(res[0].a).zone.from.pos, 'VH');
  assert.equal(s0(res[0].a).zone.to.pos, 'Mitte');
});

test('oder: mehrere Pfeile, erste markiert Folgeposition', () => {
  const res = seq([['VHT aus VH in Mitte oder RH', 'Block in VH']]);
  assert.equal(s0(res[0].a).arrows.length, 2);
  assert.deepEqual(s0(res[0].b).from, { pos: 'Mitte', depth: 'lang' });
});

test('Ursprungs-oder: froms-Liste + kein Logik-Fehler (variabel)', () => {
  const rows = [
    { a: P('VHT aus VH diagonal'), b: P('Block in Mitte oder RH') },
    { a: P('VHT aus Mitte oder RH in VH bis Mitte'), b: P('frei') }
  ];
  const res = TTV.resolver.resolveWithIssues(rows);
  assert.deepEqual(s0(res.rows[1].a).froms.map(f => f.pos), ['Mitte', 'RH']);
  assert.deepEqual(res.issues, []);
});

test('Stroke-Alternativen: zwei shots mit eigener Technik/Ursprung/Ziel', () => {
  const res = seq([['VHT aus VH in RH oder RHT aus RH in RH', 'Block in VH oder RH']]);
  const a = res[0].a;
  assert.equal(a.shots.length, 2);
  assert.deepEqual(s0(a).from, { pos: 'VH', depth: 'lang' });
  assert.deepEqual(s0(a).arrows[0].to, { pos: 'RH', depth: 'lang' });
  assert.deepEqual(a.shots[1].from, { pos: 'RH', depth: 'lang' });
  assert.deepEqual(a.shots[1].arrows[0].to, { pos: 'RH', depth: 'lang' });
  assert.equal(s0(a).label, 'VHT');
  assert.equal(a.shots[1].label, 'RHT');
  // alle Alternativen gestrichelt
  assert.ok(a.shots.every(sh => sh.arrows.every(ar => ar.dashed)));
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
