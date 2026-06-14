/*
 * notation.js — Parser & Validator für die Übungs-Notation.
 *
 * Erweiterte, tolerante Grammatik (alle Teile außer der Technik sind optional):
 *
 *   [N[-M] mal | (Nx)] TECHNIK [RICHTUNG] [aus [TIEFE] POSITION] [in|auf [TIEFE] ZIEL]
 *                      [regelmäßig|unregelmäßig|wechselnd]
 *   Frei | endlos
 *
 *   TECHNIK   = ein Wort, auch Alternative mit „/“ (VHT, RHK/RHT, Schupf, Aufschlag, AS)
 *   RICHTUNG  = diagonal | parallel
 *   TIEFE     = kurz | halblang | lang
 *   POSITION  = VH | RH | Mitte | Mitte der VH | Mitte der RH | Ellbogen
 *               | VH-Bereich/RH-Bereich (… „-Bereich“ wird ignoriert)
 *               | ganzer Tisch | ganze Tischhälfte
 *   ZIEL      = POSITION [oder [TIEFE] POSITION]…   |   POSITION bis POSITION
 *
 * Fehlt „aus …“, wird der Ursprung später aus dem Ballverlauf abgeleitet (resolver.js).
 * Fehlt „in …“, wird das Ziel aus der Richtung + Ursprung abgeleitet.
 *
 * parseCell(text) -> { type, … }:
 *   { type:'empty' } | { type:'frei' } | { type:'endlos' } | { type:'error', message }
 *   { type:'stroke', repeat, technik, direction, regular,
 *     from: {pos,depth}|null,
 *     target: { kind:'positions'|'range'|'whole', list:[{pos,depth}], range:{from,to} }|null }
 *
 * pos  ∈ VH | RH | Mitte | MitteVH | MitteRH | Ellbogen | whole
 * depth∈ kurz | halblang | lang
 */
(function (TTV) {
  'use strict';

  var KURZ = /^(kurz|kurze|kurzer|kurzes|kurzen|kurzem)$/i;
  var LANG = /^(lang|lange|langer|langes|langen|langem)$/i;
  var HALBLANG = /^halblang(e|er|es|en|em)?$/i;
  var DIAGONAL = /^diagonal(e|er)?$/i;
  var PARALLEL = /^parallel(e|er)?$/i;
  var MAL = /^mal$/i;
  var TECHNIK = /^[A-Za-zÄÖÜäöüß0-9]([A-Za-zÄÖÜäöüß0-9/]*[A-Za-zÄÖÜäöüß0-9])?$/;

  function depthOf(token) {
    if (KURZ.test(token)) return 'kurz';
    if (HALBLANG.test(token)) return 'halblang';
    if (LANG.test(token)) return 'lang';
    return null;
  }

  function regularOf(token) {
    var t = token.toLowerCase();
    if (/^unregelm(ä|ae)(ß|ss)ig/.test(t)) return 'unregelmaessig';
    if (/^regelm(ä|ae)(ß|ss)ig/.test(t)) return 'regelmaessig';
    if (/^(ab)?wechselnd/.test(t)) return 'wechselnd';
    return null;
  }

  function fail(message) { return { type: 'error', message: message }; }

  // Versucht ab Index i eine (ggf. mehrteilige) Position zu lesen.
  // Rückgabe: { pos, n } (n = Anzahl verbrauchter Tokens) oder null.
  function readPosition(tokens, i) {
    var t0 = (tokens[i] || '');
    var low0 = t0.toLowerCase();

    // ganzer Tisch / ganze Tischhälfte
    if (/^ganze[rn]?$/.test(low0)) {
      var nxt = (tokens[i + 1] || '').toLowerCase();
      if (/^tisch/.test(nxt) || /^tischh(ä|ae)lfte/.test(nxt)) return { pos: 'whole', n: 2 };
      return { pos: 'whole', n: 1 };
    }

    // halber Tisch RH/VH | halbe RH/VH  -> Halbfeld-Zone
    if (/^halbe[rn]?$/.test(low0)) {
      var h1 = (tokens[i + 1] || '').toLowerCase(), h2 = (tokens[i + 2] || '').toLowerCase();
      if (/^tisch/.test(h1)) {
        if (/^vh/.test(h2)) return { pos: 'halfVH', n: 3 };
        if (/^rh/.test(h2)) return { pos: 'halfRH', n: 3 };
      }
      if (/^vh/.test(h1)) return { pos: 'halfVH', n: 2 };
      if (/^rh/.test(h1)) return { pos: 'halfRH', n: 2 };
      return null;
    }

    // Mitte VH / Mitte RH (mit oder ohne „der“); sonst Mitte
    if (low0 === 'mitte') {
      var m1 = (tokens[i + 1] || '').toLowerCase();
      if (m1 === 'der') {
        var side = (tokens[i + 2] || '').toLowerCase();
        if (/^vh/.test(side)) return { pos: 'MitteVH', n: 3 };
        if (/^rh/.test(side)) return { pos: 'MitteRH', n: 3 };
      } else if (/^vh/.test(m1)) {
        return { pos: 'MitteVH', n: 2 };
      } else if (/^rh/.test(m1)) {
        return { pos: 'MitteRH', n: 2 };
      }
      var mSuffix = /^(bereich|feld|seite)$/i.test(m1) ? 1 : 0;
      return { pos: 'Mitte', n: 1 + mSuffix };
    }

    // X-Hälfte (Bindestrich) -> Halbfeld-Zone
    if (/^vh[-–]h(ä|ae)lfte$/i.test(t0)) return { pos: 'halfVH', n: 1 };
    if (/^rh[-–]h(ä|ae)lfte$/i.test(t0)) return { pos: 'halfRH', n: 1 };

    // einzelnes VH/RH, ggf. mit Suffix-Wort („RH Bereich“, „VH Feld“, „RH Hälfte“)
    var base = t0.replace(/[-–](bereich|feld|bauch|seite)$/i, '');
    var lowb = base.toLowerCase();
    var nextLow = (tokens[i + 1] || '').toLowerCase();
    var halfSuffix = /^h(ä|ae)lfte$/.test(nextLow);
    var areaSuffix = /^(bereich|feld|seite)$/.test(nextLow);
    var consume = (halfSuffix || areaSuffix) ? 1 : 0;
    if (lowb === 'vh') return { pos: halfSuffix ? 'halfVH' : 'VH', n: 1 + consume };
    if (lowb === 'rh') return { pos: halfSuffix ? 'halfRH' : 'RH', n: 1 + consume };
    if (/^ell(en)?bogen$/.test(lowb)) return { pos: 'Ellbogen', n: 1 };
    // „VH-Bauch“ ~ Mitte der VH
    if (/^vh[-–]bauch$/i.test(t0)) return { pos: 'MitteVH', n: 1 };
    if (/^rh[-–]bauch$/i.test(t0)) return { pos: 'MitteRH', n: 1 };
    return null;
  }

  // Halbfeld/Ganzfeld als Zielzone (Bereich) übersetzen.
  var HALF_RANGE = {
    whole: { from: 'VH', to: 'RH' },
    halfVH: { from: 'Mitte', to: 'VH' },
    halfRH: { from: 'Mitte', to: 'RH' }
  };
  var HALF_POINT = { whole: 'Mitte', halfVH: 'MitteVH', halfRH: 'MitteRH' };

  function parseCell(rawText) {
    var text = (rawText == null ? '' : String(rawText)).trim().replace(/\s+/g, ' ');
    if (text === '') return { type: 'empty' };
    if (/^frei$/i.test(text)) return { type: 'frei' };
    if (/^endlos$/i.test(text)) return { type: 'endlos' };

    // 1) Wiederholung & Richtung & Regelmäßigkeit aus beliebiger Position herauslösen
    var repeat = null, direction = null, regular = null;

    text = text.replace(/\((\d+(?:-\d+)?)\s*x\)/i, function (_, n) { repeat = n; return ' '; });
    text = text.replace(/\b(\d+(?:-\d+)?)\s*mal\b/i, function (_, n) { repeat = repeat || n; return ' '; });
    text = text.replace(/\b(\d+(?:-\d+)?)\s*x\b/i, function (_, n) { repeat = repeat || n; return ' '; });

    var coreTokens = [];
    text.trim().split(/\s+/).forEach(function (tok) {
      if (!tok) return;
      if (DIAGONAL.test(tok)) { direction = 'diagonal'; return; }
      if (PARALLEL.test(tok)) { direction = 'parallel'; return; }
      var r = regularOf(tok);
      if (r) { regular = r; return; }
      coreTokens.push(tok);
    });

    if (coreTokens.length === 0) {
      return fail('Es fehlt die Technik (z. B. „VHT“).');
    }

    // 1b) optionale Tiefe VOR der Technik („kurzer Aufschlag“) -> Standard-Zieltiefe
    var strokeDepth = null;
    var leadDepth = depthOf(coreTokens[0]);
    if (leadDepth && coreTokens.length > 1) { strokeDepth = leadDepth; coreTokens.shift(); }

    // 2) Technik
    var technik = coreTokens[0];
    if (!TECHNIK.test(technik)) {
      return fail('Ungültige Technik „' + technik + '“ (ein Wort, „/“ für Varianten erlaubt).');
    }
    var i = 1;

    // 2b) Technik-Alternativen mit „oder“ (VHT oder RHT) -> wie „VHT/RHT“
    while ((coreTokens[i] || '').toLowerCase() === 'oder'
      && coreTokens[i + 1]
      && TECHNIK.test(coreTokens[i + 1])
      && !/^(aus|in|auf|bis|mal|oder)$/i.test(coreTokens[i + 1])
      && !readPosition(coreTokens, i + 1)) {
      technik += '/' + coreTokens[i + 1];
      i += 2;
    }

    // 3) optional: aus [TIEFE] POSITION [oder [TIEFE] POSITION]…
    var from = null, fromAlts = [];
    if ((coreTokens[i] || '').toLowerCase() === 'aus') {
      i++;
      var fromDepth = 'lang';
      var d1 = depthOf(coreTokens[i] || '');
      if (d1) { fromDepth = d1; i++; }
      var fp = readPosition(coreTokens, i);
      if (!fp) return fail('Ungültige Start-Position „' + (coreTokens[i] || '') + '“. Erlaubt: VH, RH, Mitte …');
      i += fp.n;
      // Halb-/Ganzfeld als Ursprung -> repräsentativer Punkt
      from = { pos: HALF_POINT[fp.pos] || fp.pos, depth: fromDepth };
      // weitere Ursprünge mit „oder“ (aus Mitte oder RH)
      while ((coreTokens[i] || '').toLowerCase() === 'oder') {
        var j = i + 1, da = depthOf(coreTokens[j] || '');
        if (da) j++;
        var fa = readPosition(coreTokens, j);
        if (!fa) break;   // gehört nicht zum Ursprung (z. B. Ziel-„oder“)
        i = j + fa.n;
        fromAlts.push({ pos: HALF_POINT[fa.pos] || fa.pos, depth: da || 'lang' });
      }
    }

    // 4) optional: in|auf [TIEFE] ZIEL
    var target = null;
    var defDepth = strokeDepth || 'lang';
    if (/^(in|auf)$/i.test(coreTokens[i] || '')) {
      i++;
      var first = readTargetItem(coreTokens, i, defDepth);
      if (first.error) return fail(first.error);
      i = first.next;

      if ((coreTokens[i] || '').toLowerCase() === 'bis') {
        i++;
        var second = readTargetItem(coreTokens, i, defDepth);
        if (second.error) return fail(second.error);
        i = second.next;
        target = { kind: 'range', range: { from: first.item.pos, to: second.item.pos }, list: [] };
      } else if (first.item.pos === 'whole') {
        target = { kind: 'whole', list: [], range: null };
      } else if (HALF_RANGE[first.item.pos]) {
        // halber Tisch RH/VH -> Bereichs-Zone
        target = { kind: 'range', range: HALF_RANGE[first.item.pos], list: [] };
      } else {
        var list = [first.item];
        while ((coreTokens[i] || '').toLowerCase() === 'oder') {
          i++;
          var more = readTargetItem(coreTokens, i, defDepth);
          if (more.error) return fail(more.error);
          i = more.next;
          list.push(more.item);
        }
        target = { kind: 'positions', list: list, range: null };
      }
    }

    // 5) Plausibilität: ohne Ziel brauchen wir Richtung ODER „unregelmäßig“ (variabel)
    if (!target && !direction && regular !== 'unregelmaessig') {
      return fail('Es fehlt das Ziel: „… in VH“, eine Richtung („diagonal“/„parallel“) oder „unregelmäßig“.');
    }

    // übrige Tokens werden tolerant ignoriert (Freitext-Zusätze in echten Mappen)
    return {
      type: 'stroke',
      repeat: repeat,
      technik: technik,
      direction: direction,
      regular: regular,
      strokeDepth: strokeDepth,
      from: from,
      fromAlts: fromAlts.length ? fromAlts : null,
      target: target
    };
  }

  function readTargetItem(tokens, i, defaultDepth) {
    var depth = defaultDepth || 'lang';
    var d = depthOf(tokens[i] || '');
    if (d) { depth = d; i++; }
    var p = readPosition(tokens, i);
    if (!p) return { error: 'Ungültiges Ziel „' + (tokens[i] || '') + '“. Erlaubt: VH, RH, Mitte, Ellbogen, ganzer Tisch …' };
    return { item: { pos: p.pos, depth: depth }, next: i + p.n };
  }

  function validateCell(rawText) {
    var parsed = parseCell(rawText);
    if (parsed.type === 'error') return { valid: false, message: parsed.message };
    return { valid: true, message: '' };
  }

  // Kompaktes Label, z. B. „2-3× VHT diag“, „RHK/RHT“, „kurz VHB“
  function labelFor(stroke) {
    var parts = [];
    if (stroke.repeat) parts.push(stroke.repeat + '×');
    if (stroke.strokeDepth && stroke.strokeDepth !== 'lang') parts.push(stroke.strokeDepth);
    parts.push(stroke.technik);
    if (stroke.direction === 'diagonal') parts.push('diag');
    else if (stroke.direction === 'parallel') parts.push('parallel');
    var tag = stroke.regular === 'unregelmaessig' ? 'unr' :
              stroke.regular === 'regelmaessig' ? 'reg' :
              stroke.regular === 'wechselnd' ? 'wechs' : '';
    if (tag) parts.push('·' + tag);
    return parts.join(' ');
  }

  TTV.notation = {
    parseCell: parseCell,
    validateCell: validateCell,
    labelFor: labelFor
  };
})(window.TTV = window.TTV || {});
