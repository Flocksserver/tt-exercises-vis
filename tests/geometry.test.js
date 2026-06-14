'use strict';
const { test } = require('node:test');
const assert = require('node:assert');
const { loadTTV } = require('./harness');

const TTV = loadTTV();
const G = TTV.geometry;

test('layout skaliert mit Tischanzahl', () => {
  const one = G.layout(1), two = G.layout(2);
  assert.ok(two.width > one.width);
  assert.equal(one.height, two.height);
});

test('table liefert Netz in der Mitte', () => {
  const t = G.table(0);
  assert.equal(t.midY, t.startY + t.length / 2);
  assert.equal(t.net.y, t.midY);
});

test('Spieler A: VH rechts, RH links, Mitte mittig', () => {
  const t = G.table(0);
  const vh = G.point(t, 'A', 'VH', 'lang');
  const rh = G.point(t, 'A', 'RH', 'lang');
  const mi = G.point(t, 'A', 'Mitte', 'lang');
  assert.ok(vh.x > mi.x, 'VH rechts von Mitte');
  assert.ok(rh.x < mi.x, 'RH links von Mitte');
  assert.ok(Math.abs(mi.x - t.midX) < 0.001, 'Mitte = Tischmitte');
});

test('seitliche Reihenfolge VH > MitteVH > Mitte > MitteRH > RH (Spieler A)', () => {
  const t = G.table(0);
  const x = (p) => G.point(t, 'A', p, 'lang').x;
  assert.ok(x('VH') > x('MitteVH'));
  assert.ok(x('MitteVH') > x('Mitte'));
  assert.ok(x('Mitte') > x('MitteRH'));
  assert.ok(x('MitteRH') > x('RH'));
});

test('Spieler B ist spiegelverkehrt zu A', () => {
  const t = G.table(0);
  const a = G.point(t, 'A', 'VH', 'lang');
  const b = G.point(t, 'B', 'VH', 'lang');
  // gleiche Distanz zur Tischmitte, gegenüberliegende Seite
  assert.ok(Math.abs((a.x - t.midX) + (b.x - t.midX)) < 0.001);
});

test('Tiefe: A lang an Grundlinie (unten), kurz nah am Netz', () => {
  const t = G.table(0);
  const lang = G.point(t, 'A', 'Mitte', 'lang');
  const halb = G.point(t, 'A', 'Mitte', 'halblang');
  const kurz = G.point(t, 'A', 'Mitte', 'kurz');
  assert.ok(lang.y > halb.y && halb.y > kurz.y, 'A: lang unten, kurz oben (näher Netz)');
  assert.ok(kurz.y > t.midY, 'kurz noch auf A-Seite (unter Netz)');
  assert.ok(lang.y < t.startY + t.length, 'innerhalb Tisch');
});

test('Tiefe: B gespiegelt (lang oben, kurz nah am Netz)', () => {
  const t = G.table(0);
  const lang = G.point(t, 'B', 'Mitte', 'lang');
  const kurz = G.point(t, 'B', 'Mitte', 'kurz');
  assert.ok(lang.y < kurz.y, 'B: lang oben, kurz weiter unten (Richtung Netz)');
  assert.ok(kurz.y < t.midY, 'kurz auf B-Seite (über Netz)');
});

test('unbekannte Position/Tiefe fallen sauf Mitte/lang zurück', () => {
  const t = G.table(0);
  assert.ok(Math.abs(G.point(t, 'A', 'Quatsch', 'lang').x - t.midX) < 0.001);
  const def = G.point(t, 'A', 'Mitte', 'unsinn');
  const lang = G.point(t, 'A', 'Mitte', 'lang');
  assert.equal(def.y, lang.y);
});
