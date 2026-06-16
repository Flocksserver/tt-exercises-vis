/*
 * replies.js — Default-Antworten des Gegners (Wissensbasis, reine Daten/Funktionen).
 *
 * Vorbereitung für die Sequenz-Schreibweise: dort wird nur Spieler A getippt und Spieler B
 * automatisch abgeleitet. Ablage & Richtung von B kommen aus dem Ballverlauf (resolver.js) +
 * Default-Diagonal; HIER liegt nur, welche TECHNIK B per Default auf A's Technik spielt.
 *
 * Datengetrieben: neue/justierte Regel = eine Zeile in REPLY_DEFAULTS. Kein DOM, keine
 * Abhängigkeit zu anderen Modulen. Noch NICHT in die UI verdrahtet.
 *
 *   classify(technik)            -> { hand:'VH'|'RH'|null, family:string|null }
 *   handForLanding(pos)          -> 'VH' | 'RH'              (Mitte -> VH, abgestimmt)
 *   defaultReply(technik, landingPos)
 *        -> { technik, from:{pos,depth}, target:null } | null   (null = kein Default, B offen)
 */
(function (TTV) {
  'use strict';

  // A-Familie -> B-Default-Familie (null/ fehlend = kein Default, B bleibt offen).
  var REPLY_DEFAULTS = {
    topspin: 'block',     // Topspin -> Block
    konter: 'konter',     // Konter  -> Konter
    block: 'topspin',     // Block   -> Topspin (wieder eröffnen)
    schupf: 'schupf',     // Schupf  -> Schupf (Schupf-Rally)
    flip: 'block',        // Flip    -> Block
    lob: 'topspin',       // Ballonabwehr -> Topspin/Angriff (vorläufig)
    aufschlag: null,      // Aufschlag    -> kein Default (B offen)
    rueckschlag: null     // Rückschlag   -> kein Default (vorläufig)
  };

  // Abbrev-Familien -> Suffixbuchstabe; Wort-Familien -> ausgeschriebenes Wort.
  var SUFFIX = { topspin: 'T', konter: 'K', block: 'B', flip: 'F' };
  var WORD = { schupf: 'Schupf', lob: 'Ballonabwehr' };

  function lc(s) { return String(s == null ? '' : s).toLowerCase(); }

  // Technik-Token in { hand, family } zerlegen. Slash-Varianten: erste nehmen.
  function classify(technik) {
    var t0 = String(technik == null ? '' : technik).split('/')[0].trim();
    var low = lc(t0);

    // Schlaghand aus dem Präfix (VH/FH -> VH, RH/BH -> RH); fehlt bei „Block“, „US-Aufschlag“ …
    var lead = low.slice(0, 2);
    var hand = (lead === 'vh' || lead === 'fh') ? 'VH' : (lead === 'rh' || lead === 'bh') ? 'RH' : null;
    if (!hand) {   // ausgeschriebene Seite
      if (/^(vorhand|forehand)$/.test(low)) hand = 'VH';
      else if (/^(r[üu]ckhand|backhand)$/.test(low)) hand = 'RH';
    }

    // Familie: ausgeschriebene Techniken (im Token enthalten) zuerst …
    var family = null;
    if (/topspin|er[öo]ffnung/.test(low)) family = 'topspin';
    else if (/konter|counter/.test(low)) family = 'konter';
    else if (/schupf|schub|push/.test(low)) family = 'schupf';
    else if (/flip|flick/.test(low)) family = 'flip';
    else if (/block/.test(low)) family = 'block';
    else if (/ballonabwehr|lob/.test(low)) family = 'lob';
    else if (/aufschlag|serve/.test(low) || /^(as|us|s[üu]s)$/.test(low)) family = 'aufschlag';
    else if (/r[üu]ckschlag|return/.test(low) || /^rs$/.test(low)) family = 'rueckschlag';
    else if (/^(vh|fh|rh|bh|vorhand|forehand|r[üu]ckhand|backhand)$/.test(low)) family = 'topspin';   // bloße Seite = Grundschlag -> Gegner blockt
    else {
      // … sonst Abbrev-Suffix: VH/RH/FH/BH + T|K|B|F
      var m = low.match(/^(?:vh|fh|rh|bh)([tkbf])$/);
      if (m) { var s = m[1]; family = s === 't' ? 'topspin' : s === 'k' ? 'konter' : s === 'b' ? 'block' : 'flip'; }
    }
    return { hand: hand, family: family };
  }

  // Schlaghand, mit der B den auf seiner Seite landenden Ball nimmt (Mitte -> VH, abgestimmt).
  function handForLanding(pos) {
    if (pos === 'RH' || pos === 'RHweit' || pos === 'MitteRH' || /^frac:rh/.test(lc(pos))) return 'RH';
    return 'VH';   // VH, MitteVH, VHweit, Mitte, whole, Bruch-VH …
  }

  function composeToken(family, hand) {
    if (SUFFIX[family]) return hand + SUFFIX[family];
    return WORD[family] || family;
  }

  // Default-Schlag von B als Antwort auf A's Technik. landingPos = Landepunkt auf B's Seite
  // (String wie 'RH' oder Objekt {pos,depth}). null = es gibt keinen Default (B bleibt offen).
  function defaultReply(technik, landingPos) {
    var fam = classify(technik).family;
    if (!fam) return null;
    var reply = REPLY_DEFAULTS[fam];
    if (!reply) return null;
    var pos = (landingPos && landingPos.pos) ? landingPos.pos : landingPos;
    var depth = (landingPos && landingPos.depth) ? landingPos.depth : 'lang';
    var hand = handForLanding(pos);
    return { technik: composeToken(reply, hand), from: { pos: pos, depth: depth }, target: null };
  }

  TTV.replies = {
    REPLY_DEFAULTS: REPLY_DEFAULTS,
    classify: classify,
    handForLanding: handForLanding,
    defaultReply: defaultReply
  };
})(window.TTV = window.TTV || {});
