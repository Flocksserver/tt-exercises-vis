/*
 * notation.js — Parser & Validator für die Übungs-Notation.
 *
 * Grammatik (Spec, EBNF; tolerant – Unbekanntes wird übersprungen, Synonyme s. LEXICON):
 *
 *   Zelle      = 'frei' | 'endlos' | Schlag ( 'oder' Schlag )* ;
 *   Schlag     = [ Wiederh ] TECHNIK ( 'oder' TECHNIK )* [ RICHTUNG ]
 *                [ 'aus' Ort ( 'oder' Ort )* ] [ ('in'|'auf'|'über') Ziel ]
 *                [ REGELMASS ] ;
 *   Wiederh    = N['-'M] [ 'mal' | 'x' ] | '(' N['-'M] 'x' ')' ;
 *   Ort        = [ TIEFE ] POSITION ;
 *   Ziel       = ZielTeil ( 'oder' ZielTeil )* | POSITION 'bis' POSITION ;
 *   ZielTeil   = [ TIEFE ] ( POSITION | POSITION'/'POSITION… ) ;
 *   TECHNIK    = ein Wort, auch „/“-Varianten und „-“ (VHT, RHK/RHT, US-Aufschlag) ;
 *   RICHTUNG   = diagonal | parallel ;
 *   TIEFE      = kurz | halblang | lang ;
 *   POSITION   = VH | RH | Mitte | Mitte[ der ]VH/RH
 *              | ganzer Tisch | halber Tisch VH/RH | …-Bereich/-Feld/-Hälfte/-Ecke ;
 *              ( Ellbogen/Ellenbogen/Wechselpunkt = Synonym für Mitte )
 *   REGELMASS  = regelmäßig | unregelmäßig | wechselnd ;
 *
 * Semantik (resolver.js): fehlt „aus", kommt der Ursprung aus dem Ballverlauf (bzw. der
 * Schlaghand beim ersten Schlag); fehlt das Ziel, wird es aus der Richtung abgeleitet.
 * Kurzformen/Synonyme (Mi, tiefe, Wechselpunkt, o., …) zentral im LEXICON-Objekt.
 *
 * parseCell(text) -> { type, … }:
 *   'empty' | 'frei' | 'endlos' | 'error'(message)
 *   'stroke': { repeat, technik, direction, regular, strokeDepth,
 *               from:{pos,depth}|null, fromAlts:[…]|null,
 *               target:{ kind:'positions'|'range'|'whole', list:[{pos,depth}], range }|null }
 *   'alternatives': { variants:[stroke,…] }   // ganze Schläge mit „oder"
 *
 * pos  ∈ VH | RH | Mitte | MitteVH | MitteRH | whole | halfVH | halfRH
 * depth∈ kurz | halblang | lang
 */
(function (TTV) {
  'use strict';

  // ─── Lexikon: Synonyme/Kurzformen an EINER Stelle (datengetrieben) ───
  // Neues Synonym aufnehmen = hier eine Zeile ergänzen, kein Code-Eingriff.
  var LEXICON = {
    depth: {                 // Wort -> Tiefe
      kurz: ['kurz', 'kurze', 'kurzer', 'kurzes', 'kurzen', 'kurzem'],
      halblang: ['halblang', 'halblange', 'halblanger', 'halblanges', 'halblangen', 'halblangem'],
      lang: ['lang', 'lange', 'langer', 'langes', 'langen', 'langem',
             'tief', 'tiefe', 'tiefer', 'tiefes', 'tiefen', 'tiefem']    // „tiefe VH“ = lang
    },
    direction: {             // Wort -> Richtung
      diagonal: ['diagonal', 'diagonale', 'diagonaler'],
      parallel: ['parallel', 'parallele', 'paralleler']
    },
    regular: {               // Präfix -> Regelmäßigkeit (unregel… vor regel… prüfen)
      unregelmaessig: ['unregelm'],
      regelmaessig: ['regelm'],
      wechselnd: ['wechselnd', 'abwechselnd']
    },
    article: ['den', 'die', 'das', 'der', 'dem', 'eine', 'einen', 'einer'],
    position: {              // Ein-Wort-Synonyme -> kanonische Position
      // Ellbogen/Ellenbogen/Wechselpunkt/Bauch = Synonyme für Mitte
      Mitte: ['mitte', 'mi', 'ellbogen', 'ellenbogen', 'eb', 'bauch', 'wechselpunkt']
    },
    // Schnitt-/Rotations-Annotationen („mit US“, „auf Unterschnitt“) -> ignoriert
    spin: ['us', 'üs', 'uüs', 'unterschnitt', 'überschnitt', 'seitschnitt', 'schnitt', 'rotation', 'spin']
  };

  function reverse(map) {
    var r = {};
    Object.keys(map).forEach(function (k) { map[k].forEach(function (w) { r[w] = k; }); });
    return r;
  }
  var DEPTH_OF = reverse(LEXICON.depth);
  var DIR_OF = reverse(LEXICON.direction);
  var POS_OF = reverse(LEXICON.position);   // mitte/mi -> Mitte · eb/bauch/wechselpunkt/… -> Ellbogen
  var ARTICLE = {}; LEXICON.article.forEach(function (w) { ARTICLE[w] = true; });
  var SPIN = {}; LEXICON.spin.forEach(function (w) { SPIN[w] = true; });

  // Technik: ein Wort, auch mit „/“ (Varianten) und „-“ (US-Aufschlag, VH-Flip, RH-Banane)
  var TECHNIK = /^[A-Za-zÄÖÜäöüß0-9]([A-Za-zÄÖÜäöüß0-9/\-]*[A-Za-zÄÖÜäöüß0-9])?$/;
  var AREA_SUFFIX = /^(bereich|feld|seite|ecke|diagonale)$/i;   // Flächen-Suffix -> Punkt
  var HALF_SUFFIX = /^h(ä|ae)lfte$/i;                 // Halbfeld-Suffix -> Zone

  function depthOf(token) { return DEPTH_OF[String(token).toLowerCase()] || null; }
  function directionOf(token) { return DIR_OF[String(token).toLowerCase()] || null; }
  function regularOf(token) {
    var t = String(token).toLowerCase();
    var keys = ['unregelmaessig', 'regelmaessig', 'wechselnd'];
    for (var i = 0; i < keys.length; i++) {
      if (LEXICON.regular[keys[i]].some(function (p) { return t.indexOf(p) === 0; })) return keys[i];
    }
    return null;
  }

  // Fehlermeldungen als Codes (für i18n); .message bleibt die deutsche Standardform.
  var MSG_DE = {
    noTech: 'Es fehlt die Technik (z. B. „VHT“).',
    badTech: 'Ungültige Technik „{0}“ (ein Wort, „/“ für Varianten erlaubt).',
    badFrom: 'Ungültige Start-Position „{0}“. Erlaubt: VH, RH, Mitte …',
    badTarget: 'Ungültiges Ziel „{0}“. Erlaubt: VH, RH, Mitte, ganzer Tisch …',
    noTarget: 'Es fehlt das Ziel: „… in VH“, eine Richtung („diagonal“/„parallel“) oder „unregelmäßig“.'
  };
  function fail(code, arg) {
    var msg = (MSG_DE[code] || code).replace('{0}', arg != null ? arg : '');
    return { type: 'error', code: code, arg: (arg != null ? String(arg) : ''), message: msg };
  }

  // Versucht ab Index i eine (ggf. mehrteilige) Position zu lesen.
  // Rückgabe: { pos, n } (n = Anzahl verbrauchter Tokens) oder null.
  function readPosition(tokens, i) {
    var t0 = (tokens[i] || '');
    var low0 = t0.toLowerCase();

    // Artikel überspringen („auf den Wechselpunkt“, „in die Ecke“)
    if (ARTICLE[low0]) {
      var inner = readPosition(tokens, i + 1);
      return inner ? { pos: inner.pos, n: inner.n + 1 } : null;
    }

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

    // Mitte VH / Mitte RH (mit oder ohne „der“); sonst Mitte. „Mi“ = Kurzform.
    if (POS_OF[low0] === 'Mitte') {
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
      return { pos: 'Mitte', n: 1 + (AREA_SUFFIX.test(m1) ? 1 : 0) };
    }

    // X-Hälfte (Bindestrich) -> Halbfeld-Zone
    if (/^vh[-–]h(ä|ae)lfte$/i.test(t0)) return { pos: 'halfVH', n: 1 };
    if (/^rh[-–]h(ä|ae)lfte$/i.test(t0)) return { pos: 'halfRH', n: 1 };

    // „VH-Bauch“ ~ Mitte der VH (bare „Bauch“ wird oben zu Ellbogen)
    if (/^vh[-–]bauch$/i.test(t0)) return { pos: 'MitteVH', n: 1 };
    if (/^rh[-–]bauch$/i.test(t0)) return { pos: 'MitteRH', n: 1 };

    // einzelnes VH/RH, ggf. mit Suffix-Wort („RH Bereich“, „VH Feld“, „VH Ecke“, „RH-Diagonale“)
    var base = t0.replace(/[-–](bereich|feld|seite|ecke|diagonale)$/i, '');
    var lowb = base.toLowerCase();
    var nextLow = (tokens[i + 1] || '').toLowerCase();
    var halfSuffix = HALF_SUFFIX.test(nextLow);
    var areaSuffix = AREA_SUFFIX.test(nextLow);
    var consume = (halfSuffix || areaSuffix) ? 1 : 0;
    if (lowb === 'vh') return { pos: halfSuffix ? 'halfVH' : 'VH', n: 1 + consume };
    if (lowb === 'rh') return { pos: halfSuffix ? 'halfRH' : 'RH', n: 1 + consume };
    return null;
  }

  // Halbfeld/Ganzfeld als Zielzone (Bereich) übersetzen.
  var HALF_RANGE = {
    whole: { from: 'VH', to: 'RH' },
    halfVH: { from: 'Mitte', to: 'VH' },
    halfRH: { from: 'Mitte', to: 'RH' }
  };
  var HALF_POINT = { whole: 'Mitte', halfVH: 'MitteVH', halfRH: 'MitteRH' };

  // Zelle an „oder" trennen, wenn danach eine TECHNIK folgt (nicht eine Position).
  // -> ganze Schlag-Alternativen („… in RH oder RHT aus RH in RH").
  function splitAlternatives(text) {
    var tokens = text.split(' ');
    var segs = [], cur = [], hasTarget = false;
    for (var k = 0; k < tokens.length; k++) {
      var lw = tokens[k].toLowerCase();
      if (lw === 'oder' && !directionOf(tokens[k + 1] || '')) {   // „… oder <Richtung>" bleibt zusammen
        var j = k + 1;
        if (depthOf(tokens[j] || '')) j++;
        // neuer Schlag nur, wenn der bisherige schon ein Ziel/eine Richtung hat UND
        // nach „oder" eine Technik (keine Position) folgt. Sonst Technik-/Ziel-/Richtungs-„oder".
        if (hasTarget && !readPosition(tokens, j)) {
          segs.push(cur.join(' ')); cur = []; hasTarget = false; continue;
        }
      }
      if (/^(in|auf|über)$/.test(lw) || directionOf(tokens[k])) hasTarget = true;
      cur.push(tokens[k]);
    }
    segs.push(cur.join(' '));
    return segs.filter(function (s) { return s.trim() !== ''; });
  }

  // Kleinkram glätten: Aufzählungs-Präfix, „o.“ = oder, abschließende Satzzeichen.
  function normalizeCell(text) {
    text = text.replace(/\s+/g, ' ').trim();
    text = text.replace(/^([a-zA-Z]\)|\d+[.)])\s+/, '');   // „a) “, „1. “, „2) “
    text = text.replace(/(^|\s)o\.(?=\s|$)/gi, '$1oder');  // „o.“ -> „oder“
    text = text.replace(/([A-Za-zÄÖÜäöüß])[.,;]+(?=\s|$)/g, '$1'); // „Mi.“ „EB.“ -> ohne Punkt
    return text.trim();
  }

  function parseCell(rawText) {
    var text = normalizeCell(rawText == null ? '' : String(rawText));
    if (text === '') return { type: 'empty' };
    if (/^frei$/i.test(text)) return { type: 'frei' };
    if (/^endlos$/i.test(text)) return { type: 'endlos' };

    var segs = splitAlternatives(text);
    if (segs.length > 1) {
      var variants = [];
      for (var s = 0; s < segs.length; s++) {
        var pv = parseStroke(segs[s]);
        if (pv.type === 'error') return pv;
        variants.push(pv);
      }
      return { type: 'alternatives', variants: variants };
    }
    return parseStroke(text);
  }

  function parseStroke(text) {
    // 1) Wiederholung & Richtung & Regelmäßigkeit aus beliebiger Position herauslösen
    var repeat = null, direction = null, regular = null;

    text = text.replace(/\((\d+(?:-\d+)?)\s*x\)/i, function (_, n) { repeat = n; return ' '; });
    text = text.replace(/\b(\d+(?:-\d+)?)\s*mal\b/i, function (_, n) { repeat = repeat || n; return ' '; });
    text = text.replace(/\b(\d+(?:-\d+)?)\s*x\b/i, function (_, n) { repeat = repeat || n; return ' '; });
    // führende Zahl ohne „mal“ (z. B. „1-2 VHB“, „0-1 RHT“, „2+ VHT“)
    text = text.replace(/^\s*(\d+(?:-\d+)?\+?)\s+(?=\S)/, function (_, n) { repeat = repeat || n; return ''; });

    var coreTokens = [], directions = [];
    var toks = text.trim().split(/\s+/);
    for (var p = 0; p < toks.length; p++) {
      var tok = toks[p];
      if (!tok) continue;
      var dir = directionOf(tok);
      if (dir) {
        directions.push(dir);
        // „diagonal oder parallel“ -> Richtungs-Alternativen
        while ((toks[p + 1] || '').toLowerCase() === 'oder' && directionOf(toks[p + 2] || '')) {
          directions.push(directionOf(toks[p + 2])); p += 2;
        }
        continue;
      }
      var r = regularOf(tok);
      if (r) { regular = r; continue; }
      coreTokens.push(tok);
    }
    direction = directions[0] || null;

    // abschließendes „frei“ („VHT aus Mitte frei“) = offener Schlag ohne festes Ziel
    var openEnd = false;
    if (coreTokens.length > 1 && (coreTokens[coreTokens.length - 1] || '').toLowerCase() === 'frei') {
      coreTokens.pop(); openEnd = true;
    }

    if (coreTokens.length === 0) {
      return fail('noTech');
    }

    // 1b) optionale Tiefe VOR der Technik („kurzer Aufschlag“) -> Standard-Zieltiefe
    var strokeDepth = null;
    var leadDepth = depthOf(coreTokens[0]);
    if (leadDepth && coreTokens.length > 1) { strokeDepth = leadDepth; coreTokens.shift(); }

    // 2) Technik
    var technik = coreTokens[0];
    if (/^(aus|in|auf|über|oder|bis|mal)$/i.test(technik)) {
      return fail('noTech');
    }
    if (!TECHNIK.test(technik)) {
      return fail('badTech', technik);
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

    // Tolerant: unbekannten Freitext / Schnitt-Annotationen bis „aus“ oder echter
    // Präposition überspringen („mit viel Rotation“, „auf Unterschnitt …“, „zurück“).
    function skipNoise() {
      while (i < coreTokens.length) {
        var w = (coreTokens[i] || '').toLowerCase();
        if (w === 'aus' || w === 'bis' || w === 'oder') return;
        if (/^(in|auf|über)$/.test(w)) {
          if (SPIN[(coreTokens[i + 1] || '').toLowerCase()]) { i += 2; continue; } // „auf Unterschnitt“
          return;                                                                   // echte Präposition
        }
        i++;
      }
    }
    skipNoise();

    // 3) optional: aus [TIEFE] POSITION [oder [TIEFE] POSITION]…
    var from = null, fromAlts = [];
    if ((coreTokens[i] || '').toLowerCase() === 'aus') {
      i++;
      var fromDepth = 'lang';
      var d1 = depthOf(coreTokens[i] || '');
      if (d1) { fromDepth = d1; i++; }
      var fp = readPosition(coreTokens, i);
      if (!fp) return fail('badFrom', coreTokens[i] || '');
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

    skipNoise();   // Freitext zwischen Ursprung und Ziel überspringen

    // 4) optional: in|auf|über [TIEFE] ZIEL
    var target = null;
    var defDepth = strokeDepth || 'lang';
    if (/^(in|auf|über)$/i.test(coreTokens[i] || '')) {
      i++;
      var first = readTargetItem(coreTokens, i, defDepth);
      if (first.error) return fail(first.code, first.arg);
      i = first.next;
      var firstPos = first.items[0].pos;

      if ((coreTokens[i] || '').toLowerCase() === 'bis') {
        i++;
        var second = readTargetItem(coreTokens, i, defDepth);
        if (second.error) return fail(second.code, second.arg);
        i = second.next;
        target = { kind: 'range', range: { from: firstPos, to: second.items[0].pos }, list: [] };
      } else if (firstPos === 'whole') {
        target = { kind: 'whole', list: [], range: null };
      } else if (HALF_RANGE[firstPos]) {
        // halber Tisch RH/VH -> Bereichs-Zone
        target = { kind: 'range', range: HALF_RANGE[firstPos], list: [] };
      } else {
        var list = first.items.slice();   // Slash-Positionen (VH/Mitte/RH) sind schon mehrere
        while ((coreTokens[i] || '').toLowerCase() === 'oder') {
          i++;
          var more = readTargetItem(coreTokens, i, defDepth);
          if (more.error) return fail(more.code, more.arg);
          i = more.next;
          more.items.forEach(function (it) { list.push(it); });
        }
        target = { kind: 'positions', list: list, range: null };
      }
    }

    // 5) Plausibilität: ohne Ziel brauchen wir Richtung, „unregelmäßig“ oder „frei“ (offen)
    if (!target && !direction && regular !== 'unregelmaessig' && !openEnd) {
      return fail('noTarget');
    }

    // übrige Tokens werden tolerant ignoriert (Freitext-Zusätze in echten Mappen)
    return {
      type: 'stroke',
      repeat: repeat,
      technik: technik,
      direction: direction,
      directions: directions,
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
    // Slash-Positionen als ein Token: „VH/Mitte/RH“ -> mehrere Ziele
    var tok = tokens[i] || '';
    if (tok.indexOf('/') !== -1) {
      var parts = tok.split('/').map(function (pp) { return readPosition([pp], 0); });
      if (parts.every(Boolean)) {
        return { items: parts.map(function (pp) { return { pos: pp.pos, depth: depth }; }), next: i + 1 };
      }
    }
    var p = readPosition(tokens, i);
    if (!p) return { error: true, code: 'badTarget', arg: tokens[i] || '' };
    return { items: [{ pos: p.pos, depth: depth }], next: i + p.n };
  }

  function validateCell(rawText) {
    var parsed = parseCell(rawText);
    if (parsed.type === 'error') return { valid: false, code: parsed.code, arg: parsed.arg, message: parsed.message };
    return { valid: true, message: '' };
  }

  // Kompaktes Label, z. B. „2-3× VHT diag“, „RHK/RHT“, „kurz VHB“
  function labelFor(stroke) {
    var parts = [];
    if (stroke.repeat) parts.push(stroke.repeat + '×');
    if (stroke.strokeDepth && stroke.strokeDepth !== 'lang') parts.push(stroke.strokeDepth);
    parts.push(stroke.technik);
    var dirs = (stroke.directions && stroke.directions.length) ? stroke.directions : (stroke.direction ? [stroke.direction] : []);
    if (dirs.length) parts.push(dirs.map(function (d) { return d === 'diagonal' ? 'diag' : 'parallel'; }).join('/'));
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
