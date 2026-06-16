'use strict';
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('fs'), vm = require('vm'), path = require('path');

// voice.js isoliert laden (window-Stub; navigator/MediaRecorder werden nur in Funktionen genutzt).
function loadVoice() {
  const ctx = {}; ctx.window = ctx; ctx.navigator = {};
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'src', 'js', 'voice.js'), 'utf8'), ctx, { filename: 'voice.js' });
  return ctx.window.TTV.voice;
}
const V = loadVoice();

test('normalize: Satzzeichen entfernen, Wortliste zu Sequenz', () => {
  assert.equal(V.normalize('Vorhand Mitte Rückhand danach frei.'), 'Vorhand Mitte Rückhand danach frei');
  assert.equal(V.normalize('Vorhand, Mitte, Rückhand'), 'Vorhand Mitte Rückhand');
});

test('normalize: Zahlwörter -> Ziffern (auch „zweimal")', () => {
  assert.equal(V.normalize('zwei mal Vorhand aus VH'), '2 mal Vorhand aus VH');
  assert.equal(V.normalize('zweimal VHT'), '2 mal VHT');
  assert.equal(V.normalize('drei mal Rückhand'), '3 mal Rückhand');
});

test('normalize: Artikel „eine" bleibt (kein Zahlwort)', () => {
  assert.equal(V.normalize('VHT in eine Ecke'), 'VHT in eine Ecke');
});

test('snap: Whisper-Murks an erlaubte Wörter einrasten, Füllwörter raus', () => {
  // Mishears -> kanonische Wörter
  assert.equal(V.snap('Vorderhand Mitte rück hand'), 'vorhand mitte rückhand');
  assert.equal(V.snap('mitter middle'), 'mitte middle');
  // Tippnahe Fehler einrasten
  assert.equal(V.snap('diagonl parralel'), 'diagonal parallel');
  // Füllwörter (nicht im Vokabular) werden verworfen
  assert.equal(V.snap('also dann spiele ich frei'), 'dann frei');
  // erlaubte Sequenz bleibt erhalten (inkl. „über ecke")
  assert.equal(V.snap('vorhand mitte rückhand über ecke'), 'vorhand mitte rückhand über ecke');
});

test('snap+normalize: gesprochener Satz -> Sequenz', () => {
  assert.equal(V.normalize(V.snap('Vorhand Mitte Rückhand danach frei.')), 'vorhand mitte rückhand danach frei');
  assert.equal(V.normalize(V.snap('zwei mal Vorhand danach Mitte')), '2 mal vorhand danach mitte');
});

test('isSupported ist ohne Browser-APIs false (kein Crash beim Laden)', () => {
  assert.equal(typeof V.isSupported, 'function');
  assert.equal(V.isSupported(), false);
});
