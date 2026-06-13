/*
 * notation.js — Parser & Validator für die Übungs-Notation.
 *
 * Grammatik:
 *   [N[-M] mal] [kurzer ]TECHNIK aus [kurze ]POSITION in ZIEL
 *   ZIEL := [kurze ]POSITION (oder [kurze ]POSITION)*    // Alternativen (unregelmäßig)
 *         | POSITION bis POSITION                        // Bereich
 *   Frei                                                 // beendet die Rally
 *   POSITION := VH | RH | Mitte   (Groß/Klein egal)
 *
 * Beispiele:
 *   VHT aus VH in Mitte
 *   kurzer VHB aus VH in kurze Mitte
 *   VHT aus VH in Mitte oder RH
 *   VHT aus VH in VH bis Mitte
 *   2-3 mal RHT aus RH in RH
 *   Frei
 *
 * parseCell(text) liefert eines von:
 *   { type: 'empty' }
 *   { type: 'frei' }
 *   { type: 'error', message: '…' }
 *   { type: 'stroke', repeat, technik, shortStroke,
 *     from: {pos, short}, to: [{pos, short}…], range: {from,to}|null }
 */
(function (TTV) {
  'use strict';

  var RESERVED = ['aus', 'in', 'oder', 'bis', 'mal'];
  var KURZ = /^(kurz|kurze|kurzer|kurzes|kurzen)$/i;
  var REPEAT = /^\d+(-\d+)?$/;
  // Technik: ein Wort, Buchstaben (inkl. Umlaute), Ziffern, / und -
  var TECHNIK = /^[A-Za-zÄÖÜäöüß0-9][A-Za-zÄÖÜäöüß0-9/\-]*$/;

  function normalizePos(token) {
    if (token == null) return null;
    var t = token.toLowerCase();
    if (t === 'vh') return 'VH';
    if (t === 'rh') return 'RH';
    if (t === 'mitte') return 'Mitte';
    return null;
  }

  function isReserved(token) {
    var t = (token || '').toLowerCase();
    return RESERVED.indexOf(t) !== -1 || KURZ.test(t);
  }

  function fail(message) {
    return { type: 'error', message: message };
  }

  function parseCell(rawText) {
    var text = (rawText == null ? '' : String(rawText)).trim().replace(/\s+/g, ' ');
    if (text === '') return { type: 'empty' };
    if (/^frei$/i.test(text)) return { type: 'frei' };

    var tokens = text.split(' ');
    var i = 0;
    var peek = function () { return tokens[i]; };
    var atEnd = function () { return i >= tokens.length; };

    // optional: "N mal" / "N-M mal"
    var repeat = null;
    if (REPEAT.test(tokens[i])) {
      if ((tokens[i + 1] || '').toLowerCase() !== 'mal') {
        return fail('Nach der Wiederholungszahl „' + tokens[i] + '“ wird „mal“ erwartet.');
      }
      repeat = tokens[i];
      i += 2;
    }

    // optional: "kurzer" vor der Technik
    var shortStroke = false;
    if (!atEnd() && KURZ.test(peek())) { shortStroke = true; i++; }

    // TECHNIK
    if (atEnd()) return fail('Es fehlt die Technik (z. B. „VHT“).');
    if (isReserved(peek())) return fail('„' + peek() + '“ ist ein Schlüsselwort, hier wird eine Technik erwartet.');
    if (!TECHNIK.test(peek())) return fail('Ungültige Technik „' + peek() + '“ (nur ein Wort, keine Leerzeichen).');
    var technik = peek(); i++;

    // "aus"
    if (atEnd() || peek().toLowerCase() !== 'aus') {
      return fail('Nach der Technik wird „aus“ erwartet (z. B. „' + technik + ' aus VH in RH“).');
    }
    i++;

    // FROM-Position (optional "kurze")
    var fromShort = false;
    if (!atEnd() && KURZ.test(peek())) { fromShort = true; i++; }
    var fromPos = normalizePos(peek());
    if (!fromPos) return fail('Ungültige Start-Position „' + (peek() || '') + '“. Erlaubt: VH, RH, Mitte.');
    i++;

    // "in"
    if (atEnd() || peek().toLowerCase() !== 'in') {
      return fail('Nach der Start-Position wird „in“ erwartet.');
    }
    i++;

    // erstes Ziel (optional "kurze")
    var firstShort = false;
    if (!atEnd() && KURZ.test(peek())) { firstShort = true; i++; }
    var firstPos = normalizePos(peek());
    if (!firstPos) return fail('Ungültiges Ziel „' + (peek() || '') + '“. Erlaubt: VH, RH, Mitte.');
    i++;

    var to = [];
    var range = null;

    if (!atEnd() && peek().toLowerCase() === 'bis') {
      // Bereich: POSITION bis POSITION
      if (firstShort) return fail('„kurz“ ist bei einem Bereich (bis) nicht erlaubt.');
      i++;
      var rangeTo = normalizePos(peek());
      if (!rangeTo) return fail('Nach „bis“ wird eine Position erwartet (VH, RH, Mitte).');
      i++;
      range = { from: firstPos, to: rangeTo };
    } else {
      // Alternativen: POSITION (oder POSITION)*
      to.push({ pos: firstPos, short: firstShort });
      while (!atEnd() && peek().toLowerCase() === 'oder') {
        i++;
        var altShort = false;
        if (!atEnd() && KURZ.test(peek())) { altShort = true; i++; }
        var altPos = normalizePos(peek());
        if (!altPos) return fail('Nach „oder“ wird eine Position erwartet (VH, RH, Mitte).');
        i++;
        to.push({ pos: altPos, short: altShort });
      }
    }

    if (!atEnd()) {
      return fail('Unerwartete Eingabe ab „' + peek() + '“.');
    }

    return {
      type: 'stroke',
      repeat: repeat,
      technik: technik,
      shortStroke: shortStroke,
      from: { pos: fromPos, short: fromShort },
      to: to,
      range: range
    };
  }

  // Für Live-Validierung: leere Eingabe ist ok.
  function validateCell(rawText) {
    var parsed = parseCell(rawText);
    if (parsed.type === 'error') return { valid: false, message: parsed.message };
    return { valid: true, message: '' };
  }

  // Label-Text für die Visualisierung, z. B. "2-3× kurz VHB"
  function labelFor(stroke) {
    var parts = [];
    if (stroke.repeat) parts.push(stroke.repeat + '×');
    if (stroke.shortStroke) parts.push('kurz');
    parts.push(stroke.technik);
    return parts.join(' ');
  }

  TTV.notation = {
    parseCell: parseCell,
    validateCell: validateCell,
    labelFor: labelFor,
    normalizePos: normalizePos
  };
})(window.TTV = window.TTV || {});
