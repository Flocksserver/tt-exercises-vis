'use strict';
const { test } = require('node:test');
const assert = require('node:assert');
const { loadI18n } = require('./harness');

test('Standardsprache aus Browser: de bei de-*, sonst en', () => {
  assert.equal(loadI18n('de-DE').lang, 'de');
  assert.equal(loadI18n('de').lang, 'de');
  assert.equal(loadI18n('en-US').lang, 'en');
  assert.equal(loadI18n('fr').lang, 'en');   // Fallback Englisch
  assert.equal(loadI18n('').lang, 'en');
});

test('Umschalten ändert Texte', () => {
  const i = loadI18n('de');
  assert.equal(i.t('addRow'), '+ Zeile');
  i.setLang('en');
  assert.equal(i.lang, 'en');
  assert.equal(i.t('addRow'), '+ Row');
  assert.equal(i.t('exportPng'), 'Export PNG');
});

test('Fehlermeldungen übersetzt + interpoliert', () => {
  const i = loadI18n('en');
  assert.ok(/Invalid start position .Foo./.test(i.error('badFrom', 'Foo')));
  i.setLang('de');
  assert.ok(/Start-Position .Foo./.test(i.error('badFrom', 'Foo')));
  assert.ok(i.error('noTech').length > 0);
});

test('Marker und Beispielnamen je Sprache', () => {
  const i = loadI18n('en');
  assert.equal(i.marker('frei'), 'free');
  assert.equal(i.marker('endlos'), '∞ endless');
  assert.ok(i.exampleName(0).length > 0);
  i.setLang('de');
  assert.equal(i.marker('frei'), 'frei');
  assert.ok(i.exampleName(0).length > 0);
});
