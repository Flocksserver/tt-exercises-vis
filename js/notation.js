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
    depth: {                 // Wort -> Tiefe (DE + EN)
      kurz: ['kurz', 'kurze', 'kurzer', 'kurzes', 'kurzen', 'kurzem', 'short'],
      halblang: ['halblang', 'halblange', 'halblanger', 'halblanges', 'halblangen', 'halblangem', 'half-long', 'halflong'],
      lang: ['lang', 'lange', 'langer', 'langes', 'langen', 'langem', 'long', 'deep']
    },
    direction: {             // Wort -> Richtung (DE + EN)
      diagonal: ['diagonal', 'diagonale', 'diagonaler', 'cross', 'crosscourt'],
      parallel: ['parallel', 'parallele', 'paralleler', 'straight', 'longline', 'down-the-line']
    },
    regular: {               // Präfix -> Regelmäßigkeit (unregel… vor regel… prüfen)
      unregelmaessig: ['unregelm', 'irregular', 'random'],
      regelmaessig: ['regelm', 'regular'],
      wechselnd: ['wechselnd', 'abwechselnd', 'alternating']
    },
    article: ['den', 'die', 'das', 'der', 'dem', 'eine', 'einen', 'einer', 'the', 'a', 'an'],
    position: {              // Ein-Wort-Synonyme -> kanonische Position (DE + EN)
      // Ellbogen/Ellenbogen/Wechselpunkt/Bauch/elbow = Synonyme für Mitte
      Mitte: ['mitte', 'mi', 'middle', 'mid', 'center', 'centre', 'ellbogen', 'ellenbogen', 'eb', 'bauch', 'wechselpunkt', 'elbow']
    },
    // Seiten-Synonyme (für VH/RH-Erkennung in Positionen/Zonen)
    side: { vh: ['vh', 'fh', 'forehand'], rh: ['rh', 'bh', 'backhand'] },
    // Schnitt-/Rotations-Annotationen -> ignoriert (DE + EN)
    spin: ['us', 'üs', 'uüs', 'unterschnitt', 'überschnitt', 'seitschnitt', 'schnitt', 'rotation', 'spin',
           'topspin', 'backspin', 'sidespin', 'underspin', 'no-spin', 'nospin'],
    // Schlüsselwörter nach Rolle (DE + EN)
    from: ['aus', 'from'],
    prep: ['in', 'auf', 'über', 'to', 'into', 'on', 'over'],   // Ziel-Präposition
    range: ['bis', 'through', 'thru', 'to'],                    // „… bis …“ / „… to …“
    alt: ['oder', 'or'],
    tisch: ['tisch', 'tischhälfte', 'tischhaelfte', 'table'],   // „ganzer Tisch“ / „whole table“
    whole: ['ganze', 'ganzer', 'ganzen', 'ganzem', 'whole', 'full'],
    half: ['halbe', 'halber', 'halben', 'half'],
    // „weit“ = laterale Position: noch weiter außen (zur Seite raus) als VH/RH – KEINE Tiefe!
    // „tief/tiefe …“ ist im Camp-Sprachgebrauch ein Synonym dafür (nicht = lang!).
    weit: ['weit', 'weite', 'weiter', 'weites', 'weiten', 'weitem',
           'tief', 'tiefe', 'tiefer', 'tiefes', 'tiefen', 'tiefem', 'wide'],
    der: ['der', 'of']                                          // „Mitte der VH“ / „middle of FH“
  };

  function reverse(map) {
    var r = {};
    Object.keys(map).forEach(function (k) { map[k].forEach(function (w) { r[w] = k; }); });
    return r;
  }
  function setOf(arr) { var s = {}; arr.forEach(function (w) { s[w] = true; }); return s; }
  var DEPTH_OF = reverse(LEXICON.depth);
  var DIR_OF = reverse(LEXICON.direction);
  var POS_OF = reverse(LEXICON.position);
  var SIDE_OF = reverse(LEXICON.side);      // vh/fh/forehand -> vh · rh/bh/backhand -> rh
  var ARTICLE = setOf(LEXICON.article);
  var SPIN = setOf(LEXICON.spin);
  var FROM = setOf(LEXICON.from), PREP = setOf(LEXICON.prep), RANGE = setOf(LEXICON.range), ALT = setOf(LEXICON.alt);
  var WHOLE = setOf(LEXICON.whole), HALFW = setOf(LEXICON.half), TISCH = setOf(LEXICON.tisch), DER = setOf(LEXICON.der);
  var WEIT = setOf(LEXICON.weit);
  var RESERVED = setOf(LEXICON.from.concat(LEXICON.prep, LEXICON.range, LEXICON.alt, ['mal', 'times', 'x']));
  function lc(s) { return String(s == null ? '' : s).toLowerCase(); }
  function sideOf(tok) { return SIDE_OF[lc(tok)] || null; }   // 'vh' | 'rh' | null

  // Technik: ein Wort, auch mit „/“ (Varianten) und „-“ (US-Aufschlag, VH-Flip, RH-Banane)
  var TECHNIK = /^[A-Za-zÄÖÜäöüß0-9]([A-Za-zÄÖÜäöüß0-9/\-]*[A-Za-zÄÖÜäöüß0-9])?$/;
  var AREA_SUFFIX = /^(bereich|feld|seite|ecke|diagonale|area|corner|field|side)$/i;   // Flächen-Suffix -> Punkt
  var HALF_SUFFIX = /^(h(ä|ae)lfte|half)$/i;          // Halbfeld-Suffix -> Zone

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

  // ─── Fuzzy „Meinten Sie …?“ (Vorschlag-only, kein Auto-Correct) ───
  // In-house, zero-dep. Greift NUR bei einem Parse-Fehler und schlägt das nächste
  // Wort aus dem geschlossenen Vokabular vor (DE+EN). Technik bleibt Freitext.
  function levenshtein(a, b) {
    var m = a.length, n = b.length;
    if (!m) return n;
    if (!n) return m;
    var prev = new Array(n + 1), cur = new Array(n + 1), i, j;
    for (j = 0; j <= n; j++) prev[j] = j;
    for (i = 1; i <= m; i++) {
      cur[0] = i;
      for (j = 1; j <= n; j++) {
        var cost = a.charCodeAt(i - 1) === b.charCodeAt(j - 1) ? 0 : 1;
        cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost);
      }
      var tmp = prev; prev = cur; cur = tmp;
    }
    return prev[n];
  }
  function collectWords(group) {
    if (Array.isArray(group)) return group.slice();
    var out = [];
    Object.keys(group).forEach(function (k) { group[k].forEach(function (w) { out.push(w); }); });
    return out;
  }
  function vocabFrom() {
    var seen = {}, out = [];
    for (var k = 0; k < arguments.length; k++) {
      collectWords(arguments[k]).forEach(function (w) {
        w = String(w).toLowerCase();
        if (!seen[w]) { seen[w] = true; out.push(w); }
      });
    }
    return out;
  }
  // Positions-Slot (aus/in): Positionen, Seiten, ganz/halb/Tisch.
  var POS_VOCAB = vocabFrom(LEXICON.position, LEXICON.side, LEXICON.whole, LEXICON.half, LEXICON.tisch, LEXICON.weit);
  var DISPLAY = { mitte: 'Mitte' };   // dt. Substantiv groß; „middle“/Keywords bleiben klein
  function display(w) {
    if (DISPLAY[w]) return DISPLAY[w];
    if (SIDE_OF[w]) return w.toUpperCase();   // vh/fh/rh/bh -> VH/FH/RH/BH
    return w;
  }
  function suggest(token, vocab) {
    var w = lc(token);
    if (w.length < 3) return null;            // zu kurz -> zu viel Rauschen
    var max = w.length <= 4 ? 1 : 2;          // Schwellwert nach Länge
    var best = null, bestD = max + 1;
    for (var k = 0; k < vocab.length; k++) {
      var cand = vocab[k];
      if (cand === w) return null;            // exakt -> kein Tippfehler
      if (Math.abs(cand.length - w.length) > max) continue;
      var d = levenshtein(w, cand);
      if (d < bestD) { bestD = d; best = cand; }
    }
    return (best && bestD >= 1 && bestD <= max) ? display(best) : null;
  }

  // Bruchteil-Erkennung: „2/3“, „3/4“, „¾“, „⅔“ … (echter Bruch < 1) -> { num, den }.
  var UNI_FRAC = { '¼': [1, 4], '½': [1, 2], '¾': [3, 4], '⅓': [1, 3], '⅔': [2, 3], '⅕': [1, 5], '⅖': [2, 5], '⅗': [3, 5], '⅘': [4, 5] };
  function parseFraction(tok) {
    if (!tok) return null;
    if (UNI_FRAC[tok]) return { num: UNI_FRAC[tok][0], den: UNI_FRAC[tok][1] };
    var m = String(tok).match(/^(\d+)\/(\d+)$/);
    if (m) { var n = +m[1], d = +m[2]; if (d > 0 && n > 0 && n < d) return { num: n, den: d }; }
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
  function fail(code, arg, suggestion) {
    var msg = (MSG_DE[code] || code).replace('{0}', arg != null ? arg : '');
    if (suggestion) msg += ' — meinten Sie „' + suggestion + '“?';
    return {
      type: 'error', code: code, arg: (arg != null ? String(arg) : ''),
      suggestion: suggestion || null, message: msg
    };
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

    // ganzer Tisch / ganze Tischhälfte / whole table / full table
    if (WHOLE[low0]) {
      return TISCH[lc(tokens[i + 1])] ? { pos: 'whole', n: 2 } : { pos: 'whole', n: 1 };
    }

    // „weit(e/er) VH/RH“ / „wide FH/BH“ = noch weiter außen (laterale Position, keine Tiefe)
    if (WEIT[low0]) {
      var wside = sideOf(tokens[i + 1]);
      if (wside === 'vh') return { pos: 'VHweit', n: 2 };
      if (wside === 'rh') return { pos: 'RHweit', n: 2 };
      return null;   // „weit“ ohne Seite ist keine Position
    }

    // Bruchzone: „2/3 VH“, „¾ RH“, „2/3 VH-Tisch“ -> Zone über den Bruchteil zur Seite hin
    var fr = parseFraction(t0);
    if (fr) {
      var fj = i + 1;
      if (TISCH[lc(tokens[fj])]) fj++;                                  // „2/3 Tisch VH“
      var fside = sideOf(tokens[fj]) || sideOf(String(tokens[fj] || '').replace(/[-–]tisch$/i, ''));
      if (!fside) return null;                                          // Bruch ohne Seite -> keine Position
      fj++;
      if (TISCH[lc(tokens[fj])]) fj++;                                  // „2/3 VH Tisch“
      return { pos: 'frac:' + fside + ':' + fr.num + ':' + fr.den, n: fj - i };
    }

    // halber Tisch RH/VH | halbe RH/VH | half table FH | half FH  -> Halbfeld-Zone
    if (HALFW[low0]) {
      var h1 = lc(tokens[i + 1]), h2 = lc(tokens[i + 2]);
      if (TISCH[h1]) {
        if (sideOf(h2) === 'vh') return { pos: 'halfVH', n: 3 };
        if (sideOf(h2) === 'rh') return { pos: 'halfRH', n: 3 };
      }
      if (sideOf(h1) === 'vh') return { pos: 'halfVH', n: 2 };
      if (sideOf(h1) === 'rh') return { pos: 'halfRH', n: 2 };
      return null;
    }

    // Mitte VH/RH (mit/ohne „der“/„of“) | middle of FH | mid BH; sonst Mitte
    if (POS_OF[low0] === 'Mitte') {
      var m1 = lc(tokens[i + 1]);
      if (DER[m1]) {
        var k = i + 2;
        if (ARTICLE[lc(tokens[k])]) k++;          // „middle of the FH“
        var s = sideOf(tokens[k]);
        if (s === 'vh') return { pos: 'MitteVH', n: k - i + 1 };
        if (s === 'rh') return { pos: 'MitteRH', n: k - i + 1 };
      } else if (sideOf(m1) === 'vh') {
        return { pos: 'MitteVH', n: 2 };
      } else if (sideOf(m1) === 'rh') {
        return { pos: 'MitteRH', n: 2 };
      }
      return { pos: 'Mitte', n: 1 + (AREA_SUFFIX.test(m1) ? 1 : 0) };
    }

    // X-Hälfte / X-half (Bindestrich) -> Halbfeld-Zone
    var hm = t0.match(/^([a-zäöü]+)[-–](?:h(?:ä|ae)lfte|half)$/i);
    if (hm && sideOf(hm[1])) return { pos: sideOf(hm[1]) === 'vh' ? 'halfVH' : 'halfRH', n: 1 };

    // „VH-Bauch“ ~ Mitte der VH (bare „Bauch“ wird oben zu Mitte)
    var bm = t0.match(/^([a-zäöü]+)[-–]bauch$/i);
    if (bm && sideOf(bm[1])) return { pos: sideOf(bm[1]) === 'vh' ? 'MitteVH' : 'MitteRH', n: 1 };

    // einzelnes VH/RH/FH/BH, ggf. mit Suffix-Wort („RH Bereich“, „FH area“, „RH-Diagonale“)
    var base = t0.replace(/[-–](bereich|feld|seite|ecke|diagonale|area|corner|field|side)$/i, '');
    var sb = sideOf(base);
    if (sb) {
      var nextLow = lc(tokens[i + 1]);
      var halfSuffix = HALF_SUFFIX.test(nextLow);
      var consume = (halfSuffix || AREA_SUFFIX.test(nextLow)) ? 1 : 0;
      if (sb === 'vh') return { pos: halfSuffix ? 'halfVH' : 'VH', n: 1 + consume };
      return { pos: halfSuffix ? 'halfRH' : 'RH', n: 1 + consume };
    }
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
      if (ALT[lw] && !directionOf(tokens[k + 1] || '')) {   // „… oder <Richtung>" bleibt zusammen
        var j = k + 1;
        if (depthOf(tokens[j] || '')) j++;
        // neuer Schlag nur, wenn der bisherige schon ein Ziel/eine Richtung hat UND
        // nach „oder" eine Technik (keine Position) folgt. Sonst Technik-/Ziel-/Richtungs-„oder".
        if (hasTarget && !readPosition(tokens, j)) {
          segs.push(cur.join(' ')); cur = []; hasTarget = false; continue;
        }
      }
      if (PREP[lw] || directionOf(tokens[k])) hasTarget = true;
      cur.push(tokens[k]);
    }
    segs.push(cur.join(' '));
    return segs.filter(function (s) { return s.trim() !== ''; });
  }

  // Kleinkram glätten: Aufzählungs-Präfix, „o.“ = oder, abschließende Satzzeichen.
  function normalizeCell(text) {
    text = text.replace(/\s+/g, ' ').trim();
    text = text.replace(/\s*\/\s*/g, '/');                 // „VHT/ RHT“, „RH / VH“ -> „VHT/RHT“ (PDF-Artefakt)
    text = text.replace(/^([a-zA-Z]\)|\d+[.)])\s+/, '');   // „a) “, „1. “, „2) “
    text = text.replace(/(^|\s)o\.(?=\s|$)/gi, '$1oder');  // „o.“ -> „oder“
    text = text.replace(/([A-Za-zÄÖÜäöüß])[.,;]+(?=\s|$)/g, '$1'); // „Mi.“ „EB.“ -> ohne Punkt
    return text.trim();
  }

  function parseCell(rawText) {
    var text = normalizeCell(rawText == null ? '' : String(rawText));
    if (text === '') return { type: 'empty' };
    if (/^(frei|free)$/i.test(text)) return { type: 'frei' };
    if (/^(endlos|endless)$/i.test(text)) return { type: 'endlos' };

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
    text = text.replace(/\b(\d+(?:-\d+)?)\s*(?:mal|times)\b/i, function (_, n) { repeat = repeat || n; return ' '; });
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
        while (ALT[lc(toks[p + 1])] && directionOf(toks[p + 2] || '')) {
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
    if (coreTokens.length > 1 && /^(frei|free)$/i.test(coreTokens[coreTokens.length - 1] || '')) {
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
    if (RESERVED[lc(technik)]) {
      return fail('noTech');
    }
    if (!TECHNIK.test(technik)) {
      return fail('badTech', technik);
    }
    var i = 1;

    // 2b) Technik-Alternativen mit „oder“ (VHT oder RHT) -> wie „VHT/RHT“
    while (ALT[lc(coreTokens[i])]
      && coreTokens[i + 1]
      && TECHNIK.test(coreTokens[i + 1])
      && !RESERVED[lc(coreTokens[i + 1])]
      && !readPosition(coreTokens, i + 1)) {
      technik += '/' + coreTokens[i + 1];
      i += 2;
    }

    // Tolerant: unbekannten Freitext / Schnitt-Annotationen bis „aus“ oder echter
    // Präposition überspringen („mit viel Rotation“, „auf Unterschnitt …“, „zurück“).
    function skipNoise() {
      while (i < coreTokens.length) {
        var w = (coreTokens[i] || '').toLowerCase();
        if (PREP[w]) {
          if (SPIN[(coreTokens[i + 1] || '').toLowerCase()]) { i += 2; continue; } // „auf Unterschnitt“
          return;                                                                   // echte Präposition
        }
        if (FROM[w] || RANGE[w] || ALT[w]) return;
        i++;
      }
    }
    skipNoise();

    // 3) optional: aus [TIEFE] POSITION [oder [TIEFE] POSITION]…
    var from = null, fromAlts = [];
    if (FROM[lc(coreTokens[i])]) {
      i++;
      var fromDepth = 'lang';
      var d1 = depthOf(coreTokens[i] || '');
      if (d1) { fromDepth = d1; i++; }
      var fp = readPosition(coreTokens, i);
      if (!fp) return fail('badFrom', coreTokens[i] || '', suggest(coreTokens[i] || '', POS_VOCAB));
      i += fp.n;
      // Halb-/Ganzfeld als Ursprung -> repräsentativer Punkt
      from = { pos: HALF_POINT[fp.pos] || fp.pos, depth: fromDepth };
      // weitere Ursprünge mit „oder“ (aus Mitte oder RH)
      while (ALT[lc(coreTokens[i])]) {
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
    if (PREP[lc(coreTokens[i])]) {
      i++;
      var first = readTargetItem(coreTokens, i, defDepth);
      if (first.error) return fail(first.code, first.arg, first.suggestion);
      i = first.next;
      var firstPos = first.items[0].pos;

      if (RANGE[lc(coreTokens[i])]) {
        i++;
        var second = readTargetItem(coreTokens, i, defDepth);
        if (second.error) return fail(second.code, second.arg, second.suggestion);
        i = second.next;
        target = { kind: 'range', range: { from: firstPos, to: second.items[0].pos }, list: [] };
      } else if (firstPos === 'whole') {
        target = { kind: 'whole', list: [], range: null };
      } else if (HALF_RANGE[firstPos]) {
        // halber Tisch RH/VH -> Bereichs-Zone
        target = { kind: 'range', range: HALF_RANGE[firstPos], list: [] };
      } else if (firstPos.indexOf('frac:') === 0) {
        // Bruchzone „2/3 VH“ -> Anteil-Band zur Seite hin (resolver rechnet die Lage)
        target = { kind: 'fraczone', spec: firstPos, list: [], range: null };
      } else {
        var list = first.items.slice();   // Slash-Positionen (VH/Mitte/RH) sind schon mehrere
        while (ALT[lc(coreTokens[i])]) {
          i++;
          var more = readTargetItem(coreTokens, i, defDepth);
          if (more.error) return fail(more.code, more.arg, more.suggestion);
          i = more.next;
          more.items.forEach(function (it) { list.push(it); });
        }
        target = { kind: 'positions', list: list, range: null };
      }
    }

    // 5) Ohne Ziel UND ohne Richtung gilt der Schlag als diagonal aus der Schlaghand
    //    (bzw. dem Ballverlauf) – das leitet der resolver ab. Kein Fehler mehr.

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
      target: target,
      openEnd: openEnd
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
    if (!p) return { error: true, code: 'badTarget', arg: tokens[i] || '', suggestion: suggest(tokens[i] || '', POS_VOCAB) };
    return { items: [{ pos: p.pos, depth: depth }], next: i + p.n };
  }

  function validateCell(rawText) {
    var parsed = parseCell(rawText);
    if (parsed.type === 'error') return { valid: false, code: parsed.code, arg: parsed.arg, suggestion: parsed.suggestion || null, message: parsed.message };
    return { valid: true, message: '' };
  }

  // Kompaktes Label, z. B. „2-3× VHT diag“, „RHK/RHT“, „kurz VHB“
  function labelFor(stroke) {
    var parts = [];
    if (stroke.repeat) parts.push(stroke.repeat + '×');
    if (stroke.strokeDepth && stroke.strokeDepth !== 'lang') {
      parts.push((TTV.i18n && TTV.i18n.depthWord) ? TTV.i18n.depthWord(stroke.strokeDepth) : stroke.strokeDepth);
    }
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
