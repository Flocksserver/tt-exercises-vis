'use strict';
const { test } = require('node:test');
const assert = require('node:assert');
const { loadTTV } = require('./harness');

const TTV = loadTTV();
const P = TTV.notation.parseCell;

test('leer und Rally-Marker', () => {
  assert.equal(P('').type, 'empty');
  assert.equal(P('   ').type, 'empty');
  assert.equal(P('frei').type, 'frei');
  assert.equal(P('Frei').type, 'frei');
  assert.equal(P('endlos').type, 'endlos');
});

test('Grundmuster TECHNIK aus POSITION in POSITION', () => {
  const r = P('VHT aus VH in Mitte');
  assert.equal(r.type, 'stroke');
  assert.equal(r.technik, 'VHT');
  assert.deepEqual(r.from, { pos: 'VH', depth: 'lang' });
  assert.equal(r.target.kind, 'positions');
  assert.deepEqual(r.target.list, [{ pos: 'Mitte', depth: 'lang' }]);
});

test('aus ist optional (nur Ziel)', () => {
  const r = P('RHK/RHT in RH');
  assert.equal(r.type, 'stroke');
  assert.equal(r.technik, 'RHK/RHT');
  assert.equal(r.from, null);
  assert.deepEqual(r.target.list, [{ pos: 'RH', depth: 'lang' }]);
});

test('in und auf sind gleichwertig', () => {
  assert.equal(P('VHT auf VH').type, 'stroke');
  assert.equal(P('VHT auf VH').target.list[0].pos, 'VH');
});

test('Positionen inkl. Zonen', () => {
  assert.equal(P('RHB in Mitte der VH').target.list[0].pos, 'MitteVH');
  assert.equal(P('RHB in Mitte der RH').target.list[0].pos, 'MitteRH');
  assert.equal(P('VHT in Ellbogen').target.list[0].pos, 'Ellbogen');
  assert.equal(P('VHT in Ellenbogen').target.list[0].pos, 'Ellbogen');
  assert.equal(P('RHK in RH-Bereich').target.list[0].pos, 'RH');
  assert.equal(P('VHT in ganzer Tisch').target.kind, 'whole');
  assert.equal(P('VHT in ganze Tischhälfte').target.kind, 'whole');
});

test('Tiefen kurz/halblang/lang', () => {
  assert.equal(P('VHB in kurze Mitte').target.list[0].depth, 'kurz');
  assert.equal(P('Flip in halblang VH').target.list[0].depth, 'halblang');
  assert.equal(P('VHT in lang VH').target.list[0].depth, 'lang');
  // führende Tiefe vor der Technik -> Standard-Zieltiefe
  const s = P('kurzer Aufschlag in RH');
  assert.equal(s.strokeDepth, 'kurz');
  assert.equal(s.target.list[0].depth, 'kurz');
  // explizite Zieltiefe überschreibt die führende
  assert.equal(P('kurzer Aufschlag in lang RH').target.list[0].depth, 'lang');
});

test('Richtung diagonal/parallel, längs entfällt', () => {
  assert.equal(P('VHT aus VH diagonal').direction, 'diagonal');
  assert.equal(P('VHT aus RH parallel').direction, 'parallel');
  assert.equal(P('VHT aus RH längs').type, 'error');   // längs nicht mehr erlaubt
});

test('Alternativen (oder), beliebig viele', () => {
  const r = P('VHT aus VH in Mitte oder RH');
  assert.equal(r.target.list.length, 2);
  const r3 = P('Block in VH oder RH oder Mitte');
  assert.deepEqual(r3.target.list.map(x => x.pos), ['VH', 'RH', 'Mitte']);
  // oder mit Tiefe
  assert.equal(P('VHT in VH oder kurze Mitte').target.list[1].depth, 'kurz');
});

test('Technik-Alternativen mit „oder“ (VHT oder RHT)', () => {
  const r = P('VHT oder RHT aus RH-Bereich in RH');
  assert.equal(r.type, 'stroke');
  assert.equal(r.technik, 'VHT/RHT');
  assert.deepEqual(r.from, { pos: 'RH', depth: 'lang' });
  assert.deepEqual(r.target.list, [{ pos: 'RH', depth: 'lang' }]);
  // drei Techniken
  assert.equal(P('VHT oder RHT oder VHK in RH').technik, 'VHT/RHT/VHK');
  // Ziel-oder bleibt Ziel-oder (nicht als Technik gefressen)
  assert.equal(P('VHT in VH oder RH').target.list.length, 2);
});

test('Zonen-Suffixe: -Bereich/-Feld/-Hälfte, auch mit Leerzeichen', () => {
  assert.equal(P('RHK in RH-Bereich').target.list[0].pos, 'RH');
  assert.equal(P('RHK in RH Bereich').target.list[0].pos, 'RH');
  assert.equal(P('VHT in VH-Feld').target.list[0].pos, 'VH');
  assert.equal(P('VHT aus VH-Feld in RH').from.pos, 'VH');
  assert.equal(P('RHB in RH-Hälfte').target.list[0].pos, 'RH');
  assert.equal(P('RHB in RH Hälfte').target.list[0].pos, 'RH');
});

test('Bereich (bis)', () => {
  const r = P('VHT aus VH in VH bis Mitte');
  assert.equal(r.target.kind, 'range');
  assert.deepEqual(r.target.range, { from: 'VH', to: 'Mitte' });
});

test('Wiederholung N mal / N-M mal / (Nx) / Nx', () => {
  assert.equal(P('2 mal VHT in RH').repeat, '2');
  assert.equal(P('2-3 mal VHT in RH').repeat, '2-3');
  assert.equal(P('VHT (2x) in RH').repeat, '2');
  assert.equal(P('3x RHK in RH').repeat, '3');
});

test('Regelmäßigkeit; unregelmäßig auch ohne Ziel', () => {
  assert.equal(P('VHT aus VH in RH unregelmäßig').regular, 'unregelmaessig');
  assert.equal(P('Block in RH regelmäßig').regular, 'regelmaessig');
  assert.equal(P('Block wechselnd in RH').regular, 'wechselnd');
  // unregelmäßig ohne Ziel ist gültig (variabel)
  assert.equal(P('Block unregelmäßig').type, 'stroke');
});

test('Fehlerfälle', () => {
  assert.equal(P('VHT aus Foo in Mitte').type, 'error');
  assert.equal(P('VHT aus VH in Quatsch').type, 'error');
  assert.equal(P('aus VH in RH').type, 'error');        // Technik = Schlüsselwort
  assert.equal(P('VHT aus VH').type, 'error');           // kein Ziel/Richtung
  assert.equal(P('5 VHT in RH').type, 'error');          // Zahl ohne mal/x
});

test('validateCell', () => {
  assert.equal(TTV.notation.validateCell('').valid, true);
  assert.equal(TTV.notation.validateCell('VHT in RH').valid, true);
  assert.equal(TTV.notation.validateCell('VHT aus Foo in RH').valid, false);
});

test('labelFor', () => {
  assert.equal(TTV.notation.labelFor(P('2-3 mal VHT aus VH diagonal')), '2-3× VHT diag');
  assert.equal(TTV.notation.labelFor(P('VHT aus RH parallel')), 'VHT parallel');
  assert.equal(TTV.notation.labelFor(P('kurzer Aufschlag in RH')), 'kurz Aufschlag');
  assert.equal(TTV.notation.labelFor(P('Block unregelmäßig')), 'Block ·unr');
});
