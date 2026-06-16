'use strict';
const { test } = require('node:test');
const assert = require('node:assert');
const { loadTTV } = require('./harness');

const TTV = loadTTV();
const R = TTV.replies;

test('classify: Abbrev (Hand + Familie aus Suffix)', () => {
  assert.deepEqual(R.classify('VHT'), { hand: 'VH', family: 'topspin' });
  assert.deepEqual(R.classify('RHB'), { hand: 'RH', family: 'block' });
  assert.deepEqual(R.classify('VHK'), { hand: 'VH', family: 'konter' });
  assert.deepEqual(R.classify('RHF'), { hand: 'RH', family: 'flip' });
  // FH/BH = VH/RH
  assert.equal(R.classify('FHT').hand, 'VH');
  assert.equal(R.classify('BHB').hand, 'RH');
  // Slash-Variante: erste nehmen
  assert.deepEqual(R.classify('RHK/RHT'), { hand: 'RH', family: 'konter' });
});

test('classify: Wort-Techniken (Hand meist null)', () => {
  assert.deepEqual(R.classify('Block'), { hand: null, family: 'block' });
  assert.deepEqual(R.classify('Schupf'), { hand: null, family: 'schupf' });
  assert.equal(R.classify('Flip').family, 'flip');
  assert.equal(R.classify('Topspin').family, 'topspin');
  assert.equal(R.classify('Konter').family, 'konter');
  assert.equal(R.classify('Eröffnung').family, 'topspin');
  assert.equal(R.classify('Aufschlag').family, 'aufschlag');
  assert.equal(R.classify('US-Aufschlag').family, 'aufschlag');
  assert.equal(R.classify('AS').family, 'aufschlag');
  assert.equal(R.classify('Ballonabwehr').family, 'lob');
  // unbekannt
  assert.equal(R.classify('Bagatelle').family, null);
  // bloße Seite = Grundschlag (Vorhand/Rückhand) -> topspin-Familie (für Positions-Sequenzen)
  assert.equal(R.classify('VH').family, 'topspin');
  assert.equal(R.classify('RH').family, 'topspin');
});

test('handForLanding: Mitte -> VH (abgestimmt), RH-Seite -> RH', () => {
  assert.equal(R.handForLanding('RH'), 'RH');
  assert.equal(R.handForLanding('MitteRH'), 'RH');
  assert.equal(R.handForLanding('RHweit'), 'RH');
  assert.equal(R.handForLanding('VH'), 'VH');
  assert.equal(R.handForLanding('MitteVH'), 'VH');
  assert.equal(R.handForLanding('Mitte'), 'VH');
  assert.equal(R.handForLanding('whole'), 'VH');
});

test('defaultReply: abgestimmte Tabelle', () => {
  // Topspin -> Block, Landung RH -> RHB
  assert.equal(R.defaultReply('VHT', 'RH').technik, 'RHB');
  assert.deepEqual(R.defaultReply('VHT', 'RH').from, { pos: 'RH', depth: 'lang' });
  assert.equal(R.defaultReply('VHT', 'RH').target, null);
  // Konter -> Konter
  assert.equal(R.defaultReply('RHK', 'RH').technik, 'RHK');
  // Block -> Topspin, Landung VH -> VHT
  assert.equal(R.defaultReply('Block', 'VH').technik, 'VHT');
  // Schupf -> Schupf (Wort), Mitte -> Hand VH
  assert.equal(R.defaultReply('Schupf', 'Mitte').technik, 'Schupf');
  // Flip -> Block
  assert.equal(R.defaultReply('Flip', 'RH').technik, 'RHB');
  // Aufschlag -> kein Default (B offen)
  assert.equal(R.defaultReply('Aufschlag', 'RH'), null);
  assert.equal(R.defaultReply('AS', 'VH'), null);
  // unbekannte Technik -> kein Default
  assert.equal(R.defaultReply('Bagatelle', 'RH'), null);
  // landingPos auch als Objekt {pos,depth}
  assert.deepEqual(R.defaultReply('VHT', { pos: 'MitteRH', depth: 'kurz' }).from, { pos: 'MitteRH', depth: 'kurz' });
  assert.equal(R.defaultReply('VHT', { pos: 'MitteRH', depth: 'kurz' }).technik, 'RHB');
});
