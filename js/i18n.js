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
      colA: 'Spieler A <span class="muted">(vorne)</span>',
      colB: 'Spieler B <span class="muted">(hinten)</span>',
      colZ: 'Zuspieler <span class="muted">(Balleimer)</span>',
      addRow: '+ Zeile',
      reset: 'Zurücksetzen',
      balleimer: 'Balleimer (Zuspiel)',
      exportPng: 'PNG exportieren',
      exportSvg: 'SVG exportieren',
      svgEmpty: 'Trage oben eine Übung ein – die Visualisierung erscheint hier.',
      legendTitle: 'Notation &amp; Legende',
      legBasics: '<h3>Grundmuster</h3>' +
        '<p class="syntax"><code>[N&nbsp;mal] <b>TECHNIK</b> [Richtung] [aus [Tiefe] <b>POS</b>] in [Tiefe] <b>ZIEL</b></code></p>' +
        '<ul class="legend-list">' +
        '<li><b>TECHNIK</b> – ein Wort; Varianten mit „/“ (<code>RHK/RHT</code>). Auch <code>Aufschlag</code>/<code>AS</code>, <code>Block</code>, <code>Schupf</code>, <code>Flip</code>.</li>' +
        '<li><b>POSITION</b> – <code>VH</code>, <code>RH</code>, <code>Mitte</code>, <code>Mitte VH/RH</code>, <code>ganzer Tisch</code>, <code>halber Tisch RH/VH</code>.</li>' +
        '<li><code>in</code> = Ziel (auch <code>auf</code>), <code>aus</code> = Start (optional).</li>' +
        '<li><code>Frei</code> beendet, <code>endlos</code> = Dauerübung.</li></ul>',
      legExt: '<h3>Erweiterungen</h3><ul class="legend-list">' +
        '<li><b>Ohne „aus“:</b> nur das Ziel (<code>RHK/RHT in RH</code>); Start = Schlaghand (RH/VH) bzw. letzter Ball.</li>' +
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
      footer: '© <span id="year">2026</span> Marcel Kaufmann · MIT-Lizenz · frei für jeden Zweck nutzbar. <a href="https://github.com/Flocksserver/tt-exercises-vis">Quellcode auf GitHub</a>',
      marker: { frei: 'frei', endlos: '∞ endlos' },
      aria: { playerA: 'Spieler A', playerB: 'Spieler B', removeRow: 'Zeile {0} entfernen', langDe: 'Auf Deutsch umschalten', langEn: 'Auf Englisch umschalten' },
      errors: {
        noTech: 'Es fehlt die Technik (z. B. „VHT“).',
        badTech: 'Ungültige Technik „{0}“ (ein Wort, „/“ für Varianten erlaubt).',
        badFrom: 'Ungültige Start-Position „{0}“. Erlaubt: VH, RH, Mitte …',
        badTarget: 'Ungültiges Ziel „{0}“. Erlaubt: VH, RH, Mitte, ganzer Tisch …',
        noTarget: 'Es fehlt das Ziel: „… in VH“, eine Richtung („diagonal“/„parallel“) oder „unregelmäßig“.'
      },
      examples: ['RH-Konter (endlos)', 'Block-Wechsel (Beinarbeit)', 'Diagonal & Parallel', 'Ohne „aus“ (Ballverlauf)', 'VH-Beinarbeit (Mitte↔VH)', 'Kurzes Spiel → Eröffnung', 'Wechselpunkt & ganzer Tisch', 'Variabel & Wiederholung', 'Balleimer (Zuspiel)']
    },
    en: {
      htmlLang: 'en',
      docTitle: 'Table Tennis Drill Designer',
      title: '🏓 Table Tennis Drill Designer',
      tagline: 'Turn simple text notation into table-tennis diagrams – and export them as PNG or SVG.',
      toolTitle: 'Create a drill',
      intro: 'Each row is one rally step. <strong>Player A</strong> is at the front, <strong>Player B</strong> at the back. Per field write e.g. <code>VHT aus VH in Mitte</code> – the <code>aus …</code> part is optional (<code>VHT in RH</code>); the origin is then inferred from the ball path. <code>Frei</code> or <code>endlos</code> ends/continues the rally.',
      examplesLabel: 'Examples:',
      colA: 'Player A <span class="muted">(front)</span>',
      colB: 'Player B <span class="muted">(back)</span>',
      colZ: 'Feeder <span class="muted">(multiball)</span>',
      addRow: '+ Row',
      reset: 'Reset',
      balleimer: 'Ball feeder (multiball)',
      exportPng: 'Export PNG',
      exportSvg: 'Export SVG',
      svgEmpty: 'Enter a drill above – the diagram appears here.',
      legendTitle: 'Notation &amp; legend',
      legBasics: '<h3>Basic pattern</h3>' +
        '<p class="syntax"><code>[N&nbsp;mal] <b>TECHNIQUE</b> [direction] [aus [depth] <b>POS</b>] in [depth] <b>TARGET</b></code></p>' +
        '<ul class="legend-list">' +
        '<li><b>TECHNIQUE</b> – one word; variants with „/“ (<code>RHK/RHT</code>). Also <code>Aufschlag</code>/<code>AS</code>, <code>Block</code>, <code>Schupf</code>, <code>Flip</code>.</li>' +
        '<li><b>POSITION</b> – <code>VH</code> (forehand), <code>RH</code> (backhand), <code>Mitte</code> (middle), <code>Mitte VH/RH</code>, <code>ganzer Tisch</code> (whole table), <code>halber Tisch RH/VH</code> (half table).</li>' +
        '<li><code>in</code> = target (also <code>auf</code>), <code>aus</code> = origin (optional).</li>' +
        '<li><code>Frei</code> ends, <code>endlos</code> = continuous drill.</li></ul>',
      legExt: '<h3>Extensions</h3><ul class="legend-list">' +
        '<li><b>Without „aus“:</b> target only (<code>RHK/RHT in RH</code>); origin = playing hand (RH/VH) or last ball.</li>' +
        '<li><b>Direction:</b> <code>diagonal</code> / <code>parallel</code> – target is derived.</li>' +
        '<li><b>Depth:</b> <code>kurz</code> (short) / <code>halblang</code> (half-long) / <code>lang</code> (long), e.g. <code>in kurze Mitte</code>.</li>' +
        '<li><b>Alternatives:</b> target <code>… in Mitte oder RH</code>, origin <code>aus Mitte oder RH …</code> or whole strokes <code>VHT aus VH in RH oder RHT aus RH in RH</code>.</li>' +
        '<li><b>Range:</b> <code>… in VH bis Mitte</code>.</li>' +
        '<li><b>Variable:</b> <code>unregelmäßig</code> · <b>Repetition:</b> <code>2-3 mal …</code> / <code>(2x)</code>.</li></ul>',
      legGraphic: '<h3>Diagram</h3><ul class="legend-list">' +
        '<li><span class="swatch swatch-a"></span> ball from <b>A</b> · <span class="swatch swatch-b"></span> ball from <b>B</b> · <span class="swatch swatch-feed"></span> feed (multiball).</li>' +
        '<li>Same line there &amp; back = <b>one line, two heads</b>; colour switches at the net (blue = A’s ball on B’s side, red = B’s ball on A’s side).</li>' +
        '<li>Dashed = alternative (<code>oder</code>) or feed.</li>' +
        '<li>Shaded area = range (<code>bis</code>), <code>ganzer Tisch</code> or <code>unregelmäßig</code>.</li>' +
        '<li>Depth on the table: net = <b>short</b>, middle = <b>half-long</b>, baseline = <b>long</b>.</li></ul>',
      footer: '© <span id="year">2026</span> Marcel Kaufmann · MIT license · free for any use. <a href="https://github.com/Flocksserver/tt-exercises-vis">Source on GitHub</a>',
      marker: { frei: 'free', endlos: '∞ endless' },
      aria: { playerA: 'Player A', playerB: 'Player B', removeRow: 'Remove row {0}', langDe: 'Switch to German', langEn: 'Switch to English' },
      errors: {
        noTech: 'Technique is missing (e.g. „VHT“).',
        badTech: 'Invalid technique „{0}“ (one word, „/“ for variants).',
        badFrom: 'Invalid start position „{0}“. Allowed: VH, RH, Mitte …',
        badTarget: 'Invalid target „{0}“. Allowed: VH, RH, Mitte, ganzer Tisch …',
        noTarget: 'Target missing: „… in VH“, a direction („diagonal“/„parallel“) or „unregelmäßig“.'
      },
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
  function error(code, arg) { return fmt((DICT[lang].errors && DICT[lang].errors[code]) || DICT.de.errors[code] || code, arg); }
  function marker(kind) { return (DICT[lang].marker || DICT.de.marker)[kind]; }
  function aria(key, arg) { return fmt((DICT[lang].aria || DICT.de.aria)[key] || key, arg); }
  function exampleName(i) { var a = DICT[lang].examples; return (a && a[i]) || DICT.de.examples[i]; }

  function apply() {
    document.documentElement.setAttribute('lang', t('htmlLang'));
    document.title = t('docTitle');
    [].forEach.call(document.querySelectorAll('[data-i18n]'), function (el) { el.textContent = t(el.getAttribute('data-i18n')); });
    [].forEach.call(document.querySelectorAll('[data-i18n-html]'), function (el) { el.innerHTML = t(el.getAttribute('data-i18n-html')); });
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
    t: t, error: error, marker: marker, aria: aria, exampleName: exampleName,
    setLang: setLang, apply: apply
  };
})(window.TTV = window.TTV || {});
