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
  assert.equal(P('VHT in Ellbogen').target.list[0].pos, 'Mitte');
  assert.equal(P('VHT in Ellenbogen').target.list[0].pos, 'Mitte');
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
  // „längs“ ist keine erkannte Richtung -> wird ignoriert; der Schlag fällt auf Default-Diagonal zurück
  assert.equal(P('VHT aus RH längs').direction, null);
  assert.equal(P('VHT aus RH längs').type, 'stroke');
});

test('Richtungs-Alternativen (diagonal oder parallel)', () => {
  var r = P('VHT aus VH diagonal oder parallel');
  assert.equal(r.type, 'stroke');
  assert.deepEqual(r.directions, ['diagonal', 'parallel']);
  assert.deepEqual(r.from, { pos: 'VH', depth: 'lang' });
  assert.equal(r.target, null);   // Ziel wird aus den Richtungen abgeleitet
  assert.equal(TTV.notation.labelFor(r), 'VHT diag/parallel');
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

test('Zonen-Suffixe: -Bereich/-Feld als Punkt, auch mit Leerzeichen', () => {
  assert.equal(P('RHK in RH-Bereich').target.list[0].pos, 'RH');
  assert.equal(P('RHK in RH Bereich').target.list[0].pos, 'RH');
  assert.equal(P('VHT in VH-Feld').target.list[0].pos, 'VH');
  assert.equal(P('VHT aus VH-Feld in RH').from.pos, 'VH');
});

test('Halbfeld: halber Tisch / -Hälfte -> Bereichs-Zone', () => {
  assert.deepEqual(P('Block in halber Tisch RH').target.range, { from: 'Mitte', to: 'RH' });
  assert.deepEqual(P('Block in halber Tisch VH').target.range, { from: 'Mitte', to: 'VH' });
  assert.deepEqual(P('Block in halbe RH').target.range, { from: 'Mitte', to: 'RH' });
  assert.equal(P('RHB in RH-Hälfte').target.kind, 'range');
  assert.deepEqual(P('RHB in RH-Hälfte').target.range, { from: 'Mitte', to: 'RH' });
  assert.equal(P('RHB in RH Hälfte').target.kind, 'range');
  assert.deepEqual(P('VHB in VH-Hälfte').target.range, { from: 'Mitte', to: 'VH' });
});

test('Mitte VH/RH (mit und ohne „der“), Mitte bleibt Mitte', () => {
  assert.equal(P('VHT in Mitte VH').target.list[0].pos, 'MitteVH');
  assert.equal(P('VHT in Mitte RH').target.list[0].pos, 'MitteRH');
  assert.equal(P('VHT in Mitte der VH').target.list[0].pos, 'MitteVH');
  assert.equal(P('VHT in Mitte').target.list[0].pos, 'Mitte');
  assert.equal(P('VHT in Mitte oder RH').target.list.length, 2);
  assert.equal(P('VHT aus Mitte VH in RH').from.pos, 'MitteVH');
});

test('Stroke-Alternativen: ganze Schläge mit „oder“', () => {
  const r = P('VHT aus VH in RH oder RHT aus RH in RH');
  assert.equal(r.type, 'alternatives');
  assert.equal(r.variants.length, 2);
  assert.equal(r.variants[0].technik, 'VHT');
  assert.deepEqual(r.variants[0].from, { pos: 'VH', depth: 'lang' });
  assert.equal(r.variants[1].technik, 'RHT');
  assert.deepEqual(r.variants[1].from, { pos: 'RH', depth: 'lang' });
  // drei Alternativen
  assert.equal(P('VHT in VH oder RHT in RH oder Block in Mitte').variants.length, 3);
  // Ziel-„oder“ wird NICHT gesplittet (Folge ist Position)
  assert.equal(P('VHT in Mitte oder RH').type, 'stroke');
  // Ursprungs-„oder“ wird NICHT gesplittet
  assert.equal(P('VHT aus Mitte oder RH in VH').type, 'stroke');
});

test('Ursprungs-Alternativen (aus … oder …)', () => {
  const r = P('VHT aus Mitte oder RH in VH bis Mitte');
  assert.equal(r.type, 'stroke');
  assert.deepEqual(r.from, { pos: 'Mitte', depth: 'lang' });
  assert.deepEqual(r.fromAlts, [{ pos: 'RH', depth: 'lang' }]);
  assert.deepEqual(r.target.range, { from: 'VH', to: 'Mitte' });
  // mehrere Ursprünge
  assert.equal(P('VHT aus VH oder Mitte oder RH in VH').fromAlts.length, 2);
  // Ziel-oder bleibt davon unberührt
  const t = P('VHT aus VH in Mitte oder RH');
  assert.equal(t.fromAlts, null);
  assert.equal(t.target.list.length, 2);
});

test('Toleranz: Schnitt-Annotationen & Freitext überspringen', () => {
  // „auf Unterschnitt" ist Annotation, echtes Ziel ist „auf den Ellenbogen"
  assert.equal(P('VHT auf Unterschnitt auf den Ellenbogen').target.list[0].pos, 'Mitte');
  assert.equal(P('VHT mit viel Rotation auf Ellenbogen').target.list[0].pos, 'Mitte');
  assert.equal(P('Langer Aufschlag mit Unterschnitt in RH').target.list[0].pos, 'RH');
  // Freitext mitten drin
  assert.equal(P('VHB zurück in VH-Bereich').target.list[0].pos, 'VH');
  // -Diagonale als Ziel -> Position
  assert.equal(P('VHT aus Mitte in RH-Diagonale').target.list[0].pos, 'RH');
  // trailing „frei" -> offener Schlag (gültig, kein Ziel nötig)
  var f = P('VHT aus Mitte frei');
  assert.equal(f.type, 'stroke');
  assert.deepEqual(f.from, { pos: 'Mitte', depth: 'lang' });
  assert.equal(f.target, null);
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
  assert.equal(P('VHT aus VH').type, 'stroke');          // ohne Ziel/Richtung -> Default diagonal (kein Fehler)
});

test('Default: ohne Ziel & Richtung -> diagonal aus Schlaghand', () => {
  // bloße Technik ist gültig (kein noTarget-Fehler mehr)
  const r = P('VHT');
  assert.equal(r.type, 'stroke');
  assert.equal(r.target, null);
  assert.equal(r.direction, null);
  assert.equal(r.openEnd, false);
  // Technik + Ursprung ohne Ziel ebenfalls gültig
  assert.equal(P('RHT aus RH').type, 'stroke');
  // „frei“ am Ende bleibt offen (kein Default-Pfeil) -> openEnd
  assert.equal(P('VHT aus Mitte frei').openEnd, true);
});

test('Bruchzonen: „2/3 VH“, „¾ RH“, „2/3 VH-Tisch“', () => {
  assert.equal(P('Block in 2/3 VH').target.kind, 'fraczone');
  assert.equal(P('Block in 2/3 VH').target.spec, 'frac:vh:2:3');
  assert.equal(P('VHT in ¾ RH').target.spec, 'frac:rh:3:4');
  assert.equal(P('Block in 2/3 VH-Tisch').target.kind, 'fraczone');
  assert.equal(P('Block in 3/4 VH Tisch').target.spec, 'frac:vh:3:4');
  // unechter Bruch / ohne Seite -> keine Bruchzone
  assert.equal(P('Block in 3/2 VH').type, 'error');     // 3/2 ist kein echter Bruch < 1
  assert.equal(P('Block in 2/3').type, 'error');        // ohne Seite
  // Bruch mit -Seite/Seite-Suffix (docx-Mappen)
  assert.equal(P('Block in 2/3 VH-Seite').target.spec, 'frac:vh:2:3');
  assert.equal(P('VHB in 2/3 VH Seite').target.spec, 'frac:vh:2:3');
});

test('docx-Mappen Synonyme: M/Elle = Mitte, Vorhand/Rückhand, VH-Mitte', () => {
  // M / Elle = Mitte
  assert.equal(P('RHB in M').target.list[0].pos, 'Mitte');
  assert.equal(P('VHT in Elle').target.list[0].pos, 'Mitte');
  // Vorhand/Rückhand (ausgeschrieben) = VH/RH
  assert.equal(P('VHT aus Rückhand in VH').from.pos, 'RH');
  assert.equal(P('RHT aus Vorhand in RH').from.pos, 'VH');
  // VH-Mitte / RH-Mi (Bindestrich) = Mitte der VH/RH
  assert.equal(P('VHB aus VH in VH-Mitte').target.list[0].pos, 'MitteVH');
  assert.equal(P('VHT aus VH-Mitte in VH').from.pos, 'MitteVH');
  assert.equal(P('Block in RH-Mi').target.list[0].pos, 'MitteRH');
});

test('Kurzformen & Synonyme (CampMappe)', () => {
  // Mi = Mitte
  assert.equal(P('VHT aus VH in Mi').target.list[0].pos, 'Mitte');
  assert.equal(P('VHT aus Mi in RH').from.pos, 'Mitte');
  // tiefe = weit (Synonym; laterale Außen-Position, KEINE Tiefe)
  assert.equal(P('RHB in tiefe VH').target.list[0].pos, 'VHweit');
  // Wechselpunkt / EB = Mitte (Synonym), mit Artikel
  assert.equal(P('Block auf den Wechselpunkt').target.list[0].pos, 'Mitte');
  assert.equal(P('VHT auf EB').target.list[0].pos, 'Mitte');
  // X-Ecke = Ecke (Punkt)
  assert.equal(P('Schupf in VH-Ecke').target.list[0].pos, 'VH');
  // Bindestrich-Technik
  assert.equal(P('US-Aufschlag in RH').technik, 'US-Aufschlag');
  assert.equal(P('VH-Flip in halblang VH').technik, 'VH-Flip');
  // o. = oder ; führende Zahl ohne „mal"
  assert.equal(P('1-2 VHB in VH').repeat, '1-2');
  assert.equal(P('VHT in VH o. RH').target.list.length, 2);
  // Slash-Positionen
  assert.deepEqual(P('Aufschlag in VH/Mitte/RH').target.list.map(x => x.pos), ['VH', 'Mitte', 'RH']);
  // Aufzählungs-Präfix + abschließender Punkt
  assert.equal(P('a) RHT diagonal').type, 'stroke');
  assert.equal(P('1. Kurzer Aufschlag in Mi').type, 'stroke');
});

test('Englische DSL (from/to/or, FH/BH/middle, whole/half table, times, free)', () => {
  assert.deepEqual(P('FHT from FH to middle').from, { pos: 'VH', depth: 'lang' });
  assert.equal(P('FHT from FH to middle').target.list[0].pos, 'Mitte');
  assert.equal(P('FHT from forehand to backhand').target.list[0].pos, 'RH');
  assert.equal(P('Block to whole table').target.kind, 'whole');
  assert.deepEqual(P('FHT to half table BH').target.range, { from: 'Mitte', to: 'RH' });
  assert.equal(P('Block to middle of FH').target.list[0].pos, 'MitteVH');
  assert.equal(P('FHT to FH through middle').target.kind, 'range');
  assert.deepEqual(P('FHT from FH diagonal or parallel').directions, ['diagonal', 'parallel']);
  assert.equal(P('2-3 times BHC in BH').repeat, '2-3');
  assert.equal(P('short serve to short BH').target.list[0].depth, 'kurz');
  assert.equal(P('Block irregular').regular, 'unregelmaessig');
  assert.equal(P('FHT from FH to BH or BHT from BH to BH').type, 'alternatives');
  assert.equal(P('free').type, 'frei');
  assert.equal(P('endless').type, 'endlos');
  // gemischt erlaubt, aber sinnlos zu prüfen; wichtig: DE bleibt unberührt
  assert.equal(P('VHT aus VH in Mitte').target.list[0].pos, 'Mitte');
});

test('validateCell', () => {
  assert.equal(TTV.notation.validateCell('').valid, true);
  assert.equal(TTV.notation.validateCell('VHT in RH').valid, true);
  assert.equal(TTV.notation.validateCell('VHT aus Foo in RH').valid, false);
});

test('„weit“ = laterale Position (weiter außen), KEINE Tiefe', () => {
  // Ziel
  assert.equal(P('VHT in weite VH').target.list[0].pos, 'VHweit');
  assert.equal(P('RHB in weite RH').target.list[0].pos, 'RHweit');
  // Tiefe bleibt Standard (lang), „weit“ ist keine Tiefe
  assert.equal(P('VHT in weite VH').target.list[0].depth, 'lang');
  // Beugungen + Ursprung
  assert.equal(P('VHT aus weiter VH in RH').from.pos, 'VHweit');
  assert.equal(P('2x VHT aus weiter VH frei').from.pos, 'VHweit');
  // Englisch „wide“
  assert.equal(P('FHT to wide FH').target.list[0].pos, 'VHweit');
  assert.equal(P('BHB to wide BH').target.list[0].pos, 'RHweit');
  // „tief/tiefe“ ist Synonym für weit (nicht lang!)
  assert.equal(P('VHT in tiefe VH').target.list[0].pos, 'VHweit');
  assert.equal(P('RHB aus tiefer RH in VH').from.pos, 'RHweit');
  // „über Ecke [raus]“ ist ebenfalls Synonym für weit
  assert.equal(P('VHT in über Ecke VH').target.list[0].pos, 'VHweit');
  assert.equal(P('VHT in über Ecke raus RH').target.list[0].pos, 'RHweit');
  assert.equal(P('RHB aus über Ecke VH in RH').from.pos, 'VHweit');
  assert.equal(P('VHT über Ecke VH').target.list[0].pos, 'VHweit');   // „über“ als Präposition
  assert.equal(P('VHT über Ecke raus RH').target.list[0].pos, 'RHweit');
  // „über Ecke“ OHNE Seite: gültig, Default-Diagonal -> weit auf der abgeleiteten Seite
  var oc = P('VHT aus VH über ecke');
  assert.equal(oc.type, 'stroke');
  assert.equal(oc.overCorner, true);
  assert.equal(oc.direction, 'diagonal');
  assert.equal(oc.target, null);
  // auch ohne „über“: „in ecke“, „in eine Ecke“ -> over-corner-Modifier
  assert.equal(P('VHT aus VH in ecke').overCorner, true);
  assert.equal(P('VHT aus VH in ecke').type, 'stroke');
  assert.equal(P('VHT aus VH in eine Ecke').overCorner, true);
  assert.equal(P('VHT über die Ecke').overCorner, true);
  // Guards: „VH Ecke“ bleibt VH-Punkt, „Ecke VH“ bleibt VHweit
  assert.equal(P('VHT auf VH Ecke').target.list[0].pos, 'VH');
  assert.equal(P('VHT in Ecke VH').target.list[0].pos, 'VHweit');
  // „lang“ bleibt Tiefe
  assert.equal(P('VHT in lang VH').target.list[0].depth, 'lang');
  assert.equal(P('VHT in lang VH').target.list[0].pos, 'VH');
  // „weit“ ohne Seite ist keine Position -> Fehler
  assert.equal(P('VHT in weit').type, 'error');
});

test('billige Mappen-Fixes: ganzem (Dativ), Slash mit Leerzeichen', () => {
  // „ganzem Tisch“ (Dativ) wie „ganzer Tisch“
  assert.equal(P('VHK aus ganzem Tisch in RH').from.pos, 'Mitte');
  assert.equal(P('Block in ganzem Tisch').target.kind, 'whole');
  // Leerzeichen um „/“ (PDF-Artefakt) -> Slash-Varianten/-Positionen
  assert.equal(P('VHT/ RHT in RH').technik, 'VHT/RHT');
  assert.equal(P('RHT / VHT in RH').technik, 'RHT/VHT');
  assert.deepEqual(P('Aufschlag in VH/ Mitte /RH').target.list.map(x => x.pos), ['VH', 'Mitte', 'RH']);
});

test('Fuzzy „Meinten Sie …?“ — Vorschlag bei Tippfehler (kein Auto-Correct)', () => {
  // Ziel-Tippfehler -> Positions-Vorschlag
  const a = P('VHT in Mittte');
  assert.equal(a.type, 'error');
  assert.equal(a.code, 'badTarget');
  assert.equal(a.suggestion, 'Mitte');
  // Ursprungs-Tippfehler -> Positions-Vorschlag
  const b = P('VHT aus Mittte in RH');
  assert.equal(b.code, 'badFrom');
  assert.equal(b.suggestion, 'Mitte');
  // Seiten-Tippfehler -> VH/RH (Display groß)
  assert.equal(P('VHT in RHH').suggestion, 'RH');
  // EN: middl -> middle (klein), kein Auto-Correct
  assert.equal(P('FHT to middl').suggestion, 'middle');
  // KEIN Vorschlag bei gültiger Eingabe; Technik wird nie „korrigiert“
  assert.equal(P('VHT aus VH in Mitte').type, 'stroke');
  assert.equal(P('FHT from FH to BH').type, 'stroke');
  assert.equal(P('Block in RH').type, 'stroke');
  // „VHT oder RHT“ ohne Ziel ist gültig (Default diagonal), kein Fehler/Vorschlag
  assert.equal(P('VHT oder RHT').type, 'stroke');
  // validateCell reicht den Vorschlag durch
  assert.equal(TTV.notation.validateCell('VHT in Mittte').suggestion, 'Mitte');
});

test('labelFor', () => {
  assert.equal(TTV.notation.labelFor(P('2-3 mal VHT aus VH diagonal')), '2-3× VHT diag');
  assert.equal(TTV.notation.labelFor(P('VHT aus RH parallel')), 'VHT parallel');
  assert.equal(TTV.notation.labelFor(P('kurzer Aufschlag in RH')), 'kurz Aufschlag');
  assert.equal(TTV.notation.labelFor(P('Block unregelmäßig')), 'Block ·unr');
});
