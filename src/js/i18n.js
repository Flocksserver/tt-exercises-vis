/*
 * i18n.js — Zweisprachigkeit DE/EN.
 * Standard = Browsersprache (alles Nicht-Deutsche -> Englisch), per Flagge umschaltbar,
 * Auswahl in localStorage gemerkt. Statische Texte über [data-i18n]/[data-i18n-html];
 * dynamische Teile (Beispiele, SVG-Marker, Fehler) reagieren auf das 'ttv:lang'-Event.
 */
(function (TTV) {
  'use strict';

  var DICT = {
    de: {
      htmlLang: 'de',
      docTitle: 'Tischtennis-Übungsdesign-Visualisierer',
      title: '🏓 Tischtennis-Übungsdesign-Visualisierer',
      tagline: 'Übungen aus einfacher Textnotation als Tisch-Grafik zeichnen – und als PNG oder SVG exportieren.',
      toolTitle: 'Übung erstellen',
      intro: 'Jede Zeile ist ein Ballwechsel-Schritt. <strong>Spieler A</strong> steht vorne, <strong>Spieler B</strong> hinten. Schreibe pro Feld z. B. <code>VHT aus VH in Mitte</code> – das <code>aus …</code> darf entfallen (<code>VHT in RH</code>), der Ursprung wird dann aus dem Ballverlauf abgeleitet. Mit <code>Frei</code> bzw. <code>endlos</code> endet/läuft die Rally.',
      examplesLabel: 'Beispiele:',
      modeTable: 'Tabelle',
      modeSequence: 'Sequenz',
      seqIntro: 'Tippe die Schläge von <strong>Spieler A</strong> als Sequenz – ein Schlag pro Zeile, oder mit <code>-&gt;</code> bzw. Komma getrennt; eine Gruppe wiederholen mit <code>2x …</code>. <strong>Spieler B</strong> wird automatisch ergänzt (Topspin→Block, Konter→Konter, Block→Topspin …) – optional unten überschreibbar.',
      seqAlabel: 'Spieler A – Sequenz',
      seqBlabel: 'Spieler B – optional',
      seqPlaceholderA: 'VHT aus VH diagonal\nVHT aus Mitte in RH\nRHT aus RH in VH',
      seqPlaceholderB: '(leer = automatische Antwort)',
      colA: 'Spieler A <span class="muted">(vorne)</span>',
      colB: 'Spieler B <span class="muted">(hinten)</span>',
      colZ: 'Zuspieler <span class="muted">(Balleimer)</span>',
      addRow: '+ Zeile',
      reset: 'Zurücksetzen',
      balleimer: 'Balleimer (Zuspiel)',
      exportPng: 'PNG exportieren',
      exportSvg: 'SVG exportieren',
      svgEmpty: 'Trage oben eine Übung ein – die Visualisierung erscheint hier.',
      svgAlt: 'Diagramm der Tischtennis-Übung',
      legendTitle: 'Notation &amp; Legende',
      legBasics: '<h3>Grundmuster</h3>' +
        '<p class="syntax"><code>[N&nbsp;mal] <b>TECHNIK</b> [Richtung] [aus [Tiefe] <b>POS</b>] in [Tiefe] <b>ZIEL</b></code></p>' +
        '<ul class="legend-list">' +
        '<li><b>TECHNIK</b> – ein Wort; Varianten mit „/“ (<code>RHK/RHT</code>). Auch <code>Aufschlag</code>/<code>AS</code>, <code>Block</code>, <code>Schupf</code>, <code>Flip</code>.</li>' +
        '<li><b>POSITION</b> – <code>VH</code>, <code>RH</code>, <code>weite/tiefe VH/RH</code> (weiter außen), <code>Mitte</code>, <code>Mitte VH/RH</code>, <code>ganzer Tisch</code>, <code>halber Tisch RH/VH</code>.</li>' +
        '<li><code>in</code> = Ziel (auch <code>auf</code>), <code>aus</code> = Start (optional).</li>' +
        '<li><code>Frei</code> beendet, <code>endlos</code> = Dauerübung.</li></ul>',
      legExt: '<h3>Erweiterungen</h3><ul class="legend-list">' +
        '<li><b>Ohne „aus“:</b> nur das Ziel (<code>RHK/RHT in RH</code>); Start = Schlaghand (RH/VH) bzw. letzter Ball.</li>' +
        '<li><b>Ohne Ziel &amp; Richtung:</b> gilt automatisch als <code>diagonal</code> aus der Schlaghand (<code>VHT</code> = <code>VHT aus VH diagonal</code>).</li>' +
        '<li><b>Richtung:</b> <code>diagonal</code> / <code>parallel</code> – Ziel wird abgeleitet.</li>' +
        '<li><b>Tiefe:</b> <code>kurz</code> / <code>halblang</code> / <code>lang</code> (z. B. <code>in kurze Mitte</code>).</li>' +
        '<li><b>Alternativen:</b> Ziel <code>… in Mitte oder RH</code>, Ursprung <code>aus Mitte oder RH …</code> oder ganze Schläge <code>VHT aus VH in RH oder RHT aus RH in RH</code>.</li>' +
        '<li><b>Bereich:</b> <code>… in VH bis Mitte</code>.</li>' +
        '<li><b>Variabel:</b> <code>unregelmäßig</code> · <b>Wiederholung:</b> <code>2-3 mal …</code> / <code>(2x)</code>.</li></ul>',
      legGraphic: '<h3>Grafik</h3><ul class="legend-list">' +
        '<li><span class="swatch swatch-a"></span> Ball von <b>A</b> · <span class="swatch swatch-b"></span> Ball von <b>B</b> · <span class="swatch swatch-feed"></span> Zuspiel (Balleimer).</li>' +
        '<li>Gleiche Strecke hin &amp; zurück = <b>eine Linie, zwei Spitzen</b>; Farbwechsel am Netz (blau = A’s Ball auf B-Seite, rot = B’s Ball auf A-Seite).</li>' +
        '<li>Gestrichelt = Alternative (<code>oder</code>) bzw. Zuspiel.</li>' +
        '<li>Schattierte Fläche = Bereich (<code>bis</code>), <code>ganzer Tisch</code> oder <code>unregelmäßig</code>.</li>' +
        '<li>Tiefe am Tisch: Netz = <b>kurz</b>, Mitte = <b>halblang</b>, Grundlinie = <b>lang</b>.</li></ul>',
      voiceBtn: 'Diktieren',
      voiceLoading: 'Sprachmodell lädt… (einmalig)',
      voiceListening: 'Höre zu… (Klick zum Stoppen)',
      voiceTranscribing: 'Erkenne…',
      voiceError: 'Spracheingabe nicht möglich.',
      feedbackTitle: 'Mitmachen & Feedback',
      fbUse: 'Nutzt du das Tool und hilft es dir? – Gib mir dazu gerne Rückmeldung.',
      fbBug: 'Hast du einen Fehler gefunden oder vermisst du ein Feature? – Gib mir gerne Rückmeldung.',
      fbSupport: 'Willst du meine Arbeit unterstützen? – Schau doch unten bei <strong>„Buy me a coffee“</strong> vorbei.',
      fbDev: 'Bist du Developer:in und willst das Projekt woanders nutzen oder erweitern? – Feel free, unter der <a href="https://github.com/Flocksserver/tt-exercises-vis">MIT-Lizenz</a>.',
      fbHow: 'Rückmeldung per <a href="mailto:flocksserver@gmail.com?subject=TT-Übungsdesign-Visualisierer">Mail</a> oder in den <a href="https://github.com/Flocksserver/tt-exercises-vis/issues">GitHub-Issues</a>.',
      footer: '© <span id="year">2026</span> Marcel Kaufmann · MIT-Lizenz · frei für jeden Zweck nutzbar. <a href="https://github.com/Flocksserver/tt-exercises-vis">Quellcode auf GitHub</a>',
      marker: { frei: 'frei', endlos: '∞ endlos' },
      depth: { kurz: 'kurz', halblang: 'halblang', lang: 'lang' },
      aria: { playerA: 'Spieler A', playerB: 'Spieler B', removeRow: 'Zeile {0} entfernen', langDe: 'Auf Deutsch umschalten', langEn: 'Auf Englisch umschalten' },
      errors: {
        noTech: 'Es fehlt die Technik (z. B. „VHT“).',
        badTech: 'Ungültige Technik „{0}“ (ein Wort, „/“ für Varianten erlaubt).',
        badFrom: 'Ungültige Start-Position „{0}“. Erlaubt: VH, RH, Mitte …',
        badTarget: 'Ungültiges Ziel „{0}“. Erlaubt: VH, RH, Mitte, ganzer Tisch …',
        noTarget: 'Es fehlt das Ziel: „… in VH“, eine Richtung („diagonal“/„parallel“) oder „unregelmäßig“.'
      },
      errorSuffix: ' — meinten Sie „{0}“?',
      examples: ['RH-Konter (endlos)', 'Block-Wechsel (Beinarbeit)', 'Diagonal & Parallel', 'Ohne „aus“ (Ballverlauf)', 'VH-Beinarbeit (Mitte↔VH)', 'Kurzes Spiel → Eröffnung', 'Wechselpunkt & ganzer Tisch', 'Variabel & Wiederholung', 'Balleimer (Zuspiel)']
    },
    en: {
      htmlLang: 'en',
      docTitle: 'Table Tennis Drill Designer',
      title: '🏓 Table Tennis Drill Designer',
      tagline: 'Turn simple text notation into table-tennis diagrams – and export them as PNG or SVG.',
      toolTitle: 'Create a drill',
      intro: 'Each row is one rally step. <strong>Player A</strong> is at the front, <strong>Player B</strong> at the back. Per field write e.g. <code>FHT from FH to middle</code> – the <code>from …</code> part is optional (<code>FHT to BH</code>); the origin is then inferred from the ball path. <code>free</code> or <code>endless</code> ends/continues the rally.',
      examplesLabel: 'Examples:',
      modeTable: 'Table',
      modeSequence: 'Sequence',
      seqIntro: 'Type <strong>Player A</strong>’s strokes as a sequence – one per line, or separated by <code>-&gt;</code> or a comma; repeat a group with <code>2x …</code>. <strong>Player B</strong> is filled in automatically (topspin→block, counter→counter, block→topspin …) – optionally overridden below.',
      seqAlabel: 'Player A – sequence',
      seqBlabel: 'Player B – optional',
      seqPlaceholderA: 'FHT from FH diagonal\nFHT from middle to BH\nBHT from BH to FH',
      seqPlaceholderB: '(empty = automatic reply)',
      colA: 'Player A <span class="muted">(front)</span>',
      colB: 'Player B <span class="muted">(back)</span>',
      colZ: 'Feeder <span class="muted">(multiball)</span>',
      addRow: '+ Row',
      reset: 'Reset',
      balleimer: 'Ball feeder (multiball)',
      exportPng: 'Export PNG',
      exportSvg: 'Export SVG',
      svgEmpty: 'Enter a drill above – the diagram appears here.',
      svgAlt: 'Table-tennis drill diagram',
      legendTitle: 'Notation &amp; legend',
      legBasics: '<h3>Basic pattern</h3>' +
        '<p class="syntax"><code>[N&nbsp;times] <b>TECHNIQUE</b> [direction] [from [depth] <b>POS</b>] to [depth] <b>TARGET</b></code></p>' +
        '<ul class="legend-list">' +
        '<li><b>TECHNIQUE</b> – one word; variants with „/“ (<code>FHC/FHT</code>). Also <code>serve</code>, <code>push</code>, <code>block</code>, <code>flip</code>.</li>' +
        '<li><b>POSITION</b> – <code>FH</code> (forehand), <code>BH</code> (backhand), <code>wide FH/BH</code> (further out), <code>middle</code>, <code>middle FH/BH</code>, <code>whole table</code>, <code>half table FH/BH</code>.</li>' +
        '<li><code>to</code> = target (also <code>in</code>), <code>from</code> = origin (optional).</li>' +
        '<li><code>free</code> ends, <code>endless</code> = continuous drill.</li></ul>',
      legExt: '<h3>Extensions</h3><ul class="legend-list">' +
        '<li><b>Without „from“:</b> target only (<code>FHC/FHT to BH</code>); origin = playing hand (FH/BH) or last ball.</li>' +
        '<li><b>No target &amp; direction:</b> defaults to <code>diagonal</code> from the playing hand (<code>FHT</code> = <code>FHT from FH diagonal</code>).</li>' +
        '<li><b>Direction:</b> <code>diagonal</code> / <code>parallel</code> – target is derived.</li>' +
        '<li><b>Depth:</b> <code>short</code> / <code>half-long</code> / <code>long</code>, e.g. <code>to short middle</code>.</li>' +
        '<li><b>Alternatives:</b> target <code>… to middle or BH</code>, origin <code>from middle or BH …</code> or whole strokes <code>FHT from FH to BH or BHT from BH to BH</code>.</li>' +
        '<li><b>Range:</b> <code>… to FH through middle</code>.</li>' +
        '<li><b>Variable:</b> <code>irregular</code> · <b>Repetition:</b> <code>2-3 times …</code> / <code>(2x)</code>.</li></ul>',
      legGraphic: '<h3>Diagram</h3><ul class="legend-list">' +
        '<li><span class="swatch swatch-a"></span> ball from <b>A</b> · <span class="swatch swatch-b"></span> ball from <b>B</b> · <span class="swatch swatch-feed"></span> feed (multiball).</li>' +
        '<li>Same line there &amp; back = <b>one line, two heads</b>; colour switches at the net (blue = A’s ball on B’s side, red = B’s ball on A’s side).</li>' +
        '<li>Dashed = alternative (<code>or</code>) or feed.</li>' +
        '<li>Shaded area = range (<code>through</code>), <code>whole table</code> or <code>irregular</code>.</li>' +
        '<li>Depth on the table: net = <b>short</b>, middle = <b>half-long</b>, baseline = <b>long</b>.</li></ul>',
      voiceBtn: 'Dictate',
      voiceLoading: 'Loading speech model… (one-time)',
      voiceListening: 'Listening… (click to stop)',
      voiceTranscribing: 'Transcribing…',
      voiceError: 'Voice input failed.',
      feedbackTitle: 'Get involved & feedback',
      fbUse: 'Using the tool and finding it helpful? – I\'d love to hear from you.',
      fbBug: 'Found a bug or missing a feature? – Let me know.',
      fbSupport: 'Want to support my work? – Check out <strong>“Buy me a coffee”</strong> below.',
      fbDev: 'A developer who wants to reuse or extend the project elsewhere? – Feel free, under the <a href="https://github.com/Flocksserver/tt-exercises-vis">MIT licence</a>.',
      fbHow: 'Reach me by <a href="mailto:flocksserver@gmail.com?subject=TT%20Drill%20Designer">email</a> or via <a href="https://github.com/Flocksserver/tt-exercises-vis/issues">GitHub issues</a>.',
      footer: '© <span id="year">2026</span> Marcel Kaufmann · MIT license · free for any use. <a href="https://github.com/Flocksserver/tt-exercises-vis">Source on GitHub</a>',
      marker: { frei: 'free', endlos: '∞ endless' },
      depth: { kurz: 'short', halblang: 'half-long', lang: 'long' },
      aria: { playerA: 'Player A', playerB: 'Player B', removeRow: 'Remove row {0}', langDe: 'Switch to German', langEn: 'Switch to English' },
      errors: {
        noTech: 'Technique is missing (e.g. „FHT“).',
        badTech: 'Invalid technique „{0}“ (one word, „/“ for variants).',
        badFrom: 'Invalid start position „{0}“. Allowed: FH, BH, middle …',
        badTarget: 'Invalid target „{0}“. Allowed: FH, BH, middle, whole table …',
        noTarget: 'Target missing: „… to BH“, a direction („diagonal“/„parallel“) or „irregular“.'
      },
      errorSuffix: ' — did you mean „{0}“?',
      examples: ['BH counter (endless)', 'Block switch (footwork)', 'Diagonal & parallel', 'Without „aus“ (ball path)', 'FH footwork (Mitte↔VH)', 'Short game → opening', 'Crossover & whole table', 'Variable & repetition', 'Ball feeder (multiball)']
    }
  };

  function fmt(s, arg) { return String(s).replace('{0}', arg != null ? arg : ''); }
  function detect() {
    try {
      var l = (navigator.language || (navigator.languages || [])[0] || 'en').toLowerCase();
      return l.indexOf('de') === 0 ? 'de' : 'en';
    } catch (e) { return 'en'; }
  }
  function stored() { try { return localStorage.getItem('ttv-lang'); } catch (e) { return null; } }

  var lang = (stored() === 'de' || stored() === 'en') ? stored() : detect();

  function t(key) { return (DICT[lang] && DICT[lang][key]) != null ? DICT[lang][key] : (DICT.de[key] || key); }
  function error(code, arg, suggestion) {
    var msg = fmt((DICT[lang].errors && DICT[lang].errors[code]) || DICT.de.errors[code] || code, arg);
    if (suggestion) msg += fmt(DICT[lang].errorSuffix || DICT.de.errorSuffix, suggestion);
    return msg;
  }
  function marker(kind) { return (DICT[lang].marker || DICT.de.marker)[kind]; }
  function depthWord(d) { return (DICT[lang].depth || DICT.de.depth)[d] || d; }
  function aria(key, arg) { return fmt((DICT[lang].aria || DICT.de.aria)[key] || key, arg); }
  function exampleName(i) { var a = DICT[lang].examples; return (a && a[i]) || DICT.de.examples[i]; }

  function apply() {
    document.documentElement.setAttribute('lang', t('htmlLang'));
    document.title = t('docTitle');
    [].forEach.call(document.querySelectorAll('[data-i18n]'), function (el) { el.textContent = t(el.getAttribute('data-i18n')); });
    [].forEach.call(document.querySelectorAll('[data-i18n-html]'), function (el) { el.innerHTML = t(el.getAttribute('data-i18n-html')); });
    [].forEach.call(document.querySelectorAll('[data-i18n-placeholder]'), function (el) { el.setAttribute('placeholder', t(el.getAttribute('data-i18n-placeholder'))); });
    [].forEach.call(document.querySelectorAll('[data-lang-btn]'), function (b) {
      b.classList.toggle('active', b.getAttribute('data-lang-btn') === lang);
    });
    document.dispatchEvent(new CustomEvent('ttv:lang', { detail: { lang: lang } }));
  }

  function setLang(l) {
    if (l !== 'de' && l !== 'en') return;
    lang = l;
    try { localStorage.setItem('ttv-lang', l); } catch (e) { /* ignore */ }
    apply();
  }

  TTV.i18n = {
    get lang() { return lang; },
    t: t, error: error, marker: marker, depthWord: depthWord, aria: aria, exampleName: exampleName,
    setLang: setLang, apply: apply
  };
})(window.TTV = window.TTV || {});
