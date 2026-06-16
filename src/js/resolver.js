/*
 * resolver.js — macht aus den (ggf. unvollständigen) Parser-Ergebnissen konkrete Schläge.
 *
 * Zwei Aufgaben, die die verkürzte Trainingsnotation erst zeichenbar machen:
 *  1) Ballverlauf-Kette: fehlt „aus …“, ist der Ursprung der letzte Landepunkt auf der
 *     eigenen Seite (in der Rally kommt der Ball von dort, wo der Vorschlag hinging).
 *  2) Richtung: fehlt das Ziel, wird es aus Ursprung + diagonal/parallel abgeleitet.
 *
 * resolveSequence(rows) -> [{ a: rstroke|marker|null, b: rstroke|marker|null }]
 *   rstroke = { kind:'stroke', player, label, from:{pos,depth},
 *               arrows:[{to:{pos,depth}, dashed}], zone:{from,to}|null, variable }
 *   marker  = { kind:'frei'|'endlos', player }
 */
(function (TTV) {
  'use strict';

  function clone(p) { return { pos: p.pos, depth: p.depth }; }

  // Schlaghand aus der Technik (RH*/VH*) -> natürliche Ursprungsseite, wenn „aus …" fehlt.
  function handOf(technik) {
    var t = (technik || '').split('/')[0].toUpperCase();
    if (t.indexOf('VH') === 0 || t.indexOf('FH') === 0) return 'VH';   // Vorhand / forehand
    if (t.indexOf('RH') === 0 || t.indexOf('BH') === 0) return 'RH';   // Rückhand / backhand
    return null;
  }

  // Ziel aus Ursprung + Richtung ableiten (Spieler stehen sich gegenüber).
  function deriveTarget(pos, dir) {
    if (dir === 'diagonal') return pos;            // VH→VH, RH→RH (kreuzt optisch)
    var parallel = { VH: 'RH', RH: 'VH', VHweit: 'RHweit', RHweit: 'VHweit', MitteVH: 'MitteRH', MitteRH: 'MitteVH', Ellbogen: 'MitteVH', Mitte: 'Mitte' };
    return parallel[pos] || pos;                    // parallel (längs)
  }
  // „über Ecke“ (overCorner): abgeleitetes Ziel an die Außenkante ziehen.
  function weitOf(pos) { return pos === 'VH' ? 'VHweit' : pos === 'RH' ? 'RHweit' : pos; }
  function aim(fromPos, dir, over) { var p = deriveTarget(fromPos, dir); return over ? weitOf(p) : p; }

  // Ursprünge eines Schlags: explizit „aus …" (+ oder-Alternativen) > Ballort > Schlaghand.
  function buildFroms(parsed, incoming) {
    if (parsed.from) {
      return [{ pos: parsed.from.pos, depth: parsed.from.depth }].concat(
        (parsed.fromAlts || []).map(function (f) { return { pos: f.pos, depth: f.depth }; }));
    }
    if (incoming) return [{ pos: incoming.pos, depth: incoming.depth }];
    var hand = handOf(parsed.technik);
    if (hand) return [{ pos: hand, depth: 'lang' }];
    return [{ pos: 'Mitte', depth: 'lang' }];
  }

  // Einen Einzelschlag in einen „shot" (Ursprünge + Pfeile/Zone) übersetzen.
  function buildShot(parsed, incoming, forceDashed) {
    var froms = buildFroms(parsed, incoming);
    var arrows = [], zone = null, variable = false;
    var tgt = parsed.target;
    if (tgt && tgt.kind === 'range') {
      zone = { from: { pos: tgt.range.from, depth: 'lang' }, to: { pos: tgt.range.to, depth: 'lang' } };
    } else if (tgt && tgt.kind === 'whole') {
      zone = { from: { pos: 'VH', depth: 'lang' }, to: { pos: 'RH', depth: 'lang' } };
    } else if (tgt && tgt.kind === 'fraczone') {
      // Bruchteil-Band: „2/3 VH“ = äußere 2/3 zur VH-Seite. lx (Sicht A): 1 = VH, 0 = RH.
      var fp = tgt.spec.split(':'), fside = fp[1], frac = (+fp[2]) / (+fp[3]);
      var lo = fside === 'vh' ? (1 - frac) : 0;
      var hi = fside === 'vh' ? 1 : frac;
      zone = { from: { lx: lo, depth: 'lang' }, to: { lx: hi, depth: 'lang' } };
    } else if (tgt && tgt.kind === 'positions') {
      arrows = tgt.list.map(function (it, idx) { return { to: { pos: it.pos, depth: it.depth }, dashed: idx > 0 }; });
    } else if (parsed.directions && parsed.directions.length) {
      // Richtung(en) leiten das Ziel ab; „diagonal oder parallel“ -> mehrere Pfeile
      arrows = parsed.directions.map(function (d) {
        return { to: { pos: aim(froms[0].pos, d, parsed.overCorner), depth: parsed.strokeDepth || 'lang' }, dashed: false };
      });
    } else if (parsed.direction) {
      arrows = [{ to: { pos: aim(froms[0].pos, parsed.direction, parsed.overCorner), depth: parsed.strokeDepth || 'lang' }, dashed: false }];
    }
    if (parsed.regular === 'unregelmaessig') {
      variable = true;
      if (!zone && arrows.length === 0) zone = { from: { pos: 'VH', depth: 'lang' }, to: { pos: 'RH', depth: 'lang' } };
    }
    // Default: kein Ziel & keine Richtung -> diagonal aus dem Ursprung (Schlaghand/Ballverlauf).
    if (!arrows.length && !zone && parsed.regular !== 'unregelmaessig' && !parsed.openEnd) {
      arrows = [{ to: { pos: aim(froms[0].pos, 'diagonal', parsed.overCorner), depth: parsed.strokeDepth || 'lang' }, dashed: false }];
    }
    // „frei" (openEnd) = freie Platzierung -> variables Band über die ganze Gegnerseite,
    // und der Ballwechsel endet hier (kein Folgeball, keine B-Antwort).
    if (parsed.openEnd && !arrows.length && !zone) {
      variable = true;
      zone = { from: { pos: 'VH', depth: 'lang' }, to: { pos: 'RH', depth: 'lang' } };
    }
    var multiFrom = froms.length > 1;
    var dashAll = forceDashed || multiFrom || arrows.length > 1;
    arrows = arrows.map(function (a) { return { to: a.to, dashed: dashAll || a.dashed }; });
    var primary = parsed.openEnd ? null
      : (arrows.length ? arrows[0].to : (zone ? { pos: 'Mitte', depth: zone.from.depth || 'lang' } : null));
    var variableTarget = !!zone || arrows.length > 1 || multiFrom || forceDashed || parsed.regular === 'unregelmaessig';
    return {
      shot: { label: TTV.notation.labelFor(parsed), from: froms[0], froms: froms, arrows: arrows, zone: zone, variable: variable, zoneDashed: forceDashed || multiFrom },
      primary: primary, variableTarget: variableTarget
    };
  }

  // Technik-Token einer (geparsten) Zelle (für die Default-Antwort-Ableitung).
  function techOf(cell) {
    if (!cell) return null;
    if (cell.type === 'stroke') return cell.technik;
    if (cell.type === 'alternatives' && cell.variants[0]) return cell.variants[0].technik;
    return null;
  }
  function isEmptyCell(cell) { return !cell || cell.type === 'empty'; }
  // Ursprungs-Position einer (geparsten) A-Zelle (für B's Zuspiel-Ziel).
  function originOf(cell) {
    var v = (cell && cell.type === 'stroke') ? cell : (cell && cell.type === 'alternatives' ? cell.variants[0] : null);
    if (!v) return null;
    return v.from ? v.from.pos : (handOf(v.technik) || null);
  }
  // Default-Antwort (TTV.replies) als vollwertige Schlag-Zelle. B's Ursprung = A's Landepunkt
  // (aus dem Ballverlauf); B's ZIEL = A's nächste Position (targetPos), damit der Ballweg
  // zusammenpasst – fehlt die nächste Position, leitet die Default-Diagonale das Ziel ab.
  function replyCell(rep, targetPos) {
    var target = targetPos ? { kind: 'positions', list: [{ pos: targetPos, depth: 'lang' }], range: null } : null;
    return {
      type: 'stroke', technik: rep.technik, repeat: null, direction: null, directions: [],
      regular: null, strokeDepth: null, from: null, fromAlts: null, target: target,
      openEnd: false, overCorner: false
    };
  }

  function freiWord() { return (TTV.i18n && TTV.i18n.marker) ? TTV.i18n.marker('frei') : 'frei'; }
  // Freier Ball von Spieler A: aus der gespielten Seite über den GANZEN Tisch, Label „frei".
  function freeBandShot(player, fromPos) {
    var from = { pos: fromPos || 'Mitte', depth: 'lang' };
    return {
      kind: 'stroke', player: player, shots: [{
        label: freiWord(), from: from, froms: [from], arrows: [],
        zone: { from: { pos: 'VH', depth: 'lang' }, to: { pos: 'RH', depth: 'lang' } },
        variable: true, zoneDashed: false
      }]
    };
  }

  function run(rows, opts) {
    var inferReplies = !!(opts && opts.inferReplies);
    var repeatGroups = (opts && opts.repeatGroups) || null;
    // Nach dem letzten Schlag einer wiederholten Gruppe folgt wieder der erste (Loop) ->
    // B spielt dorthin zu. Index -> Index des Zyklus-Starts.
    function nextAfter(idx) {
      if (repeatGroups) {
        for (var k = 0; k < repeatGroups.length; k++) {
          var g = repeatGroups[k];
          if (+g.repeat > 1 && idx === g.start + g.len - 1) return rows[g.start] && rows[g.start].a;
        }
      }
      return rows[idx + 1] && rows[idx + 1].a;
    }
    // ball[seite] = null (kein Ball) oder { pos, depth, variable }
    var ball = { A: null, B: null };
    var issues = [];

    function resolveShot(parsed, player, rowIdx) {
      if (!parsed || parsed.type === 'empty') return null;
      if (parsed.type === 'frei' || parsed.type === 'endlos') {
        var incFree = ball[player];
        ball.A = null; ball.B = null;   // Rally-Grenze: Ball unbestimmt
        // „frei" bei Spieler A = freier Ball: aus der gespielten Seite über den ganzen Tisch.
        // (Spieler B bzw. „endlos" bleiben ein Text-Marker.)
        if (parsed.type === 'frei' && player === 'A') return freeBandShot(player, incFree && incFree.pos);
        return { kind: parsed.type, player: player };
      }
      var variants, isAlt;
      if (parsed.type === 'stroke') { variants = [parsed]; isAlt = false; }
      else if (parsed.type === 'alternatives') { variants = parsed.variants; isAlt = true; }
      else return null;

      var opp = player === 'A' ? 'B' : 'A';
      var incoming = ball[player];
      var shots = [], primary = null, variableAfter = isAlt;

      variants.forEach(function (pv, vi) {
        // Logik-Check nur bei eindeutigem, explizitem Ursprung (keine Alternativen)
        if (!isAlt && pv.from && !pv.fromAlts && incoming && !incoming.variable && pv.from.pos !== incoming.pos) {
          issues.push({ row: rowIdx, player: player, technik: pv.technik, expected: incoming.pos, got: pv.from.pos });
        }
        var b = buildShot(pv, incoming, isAlt);
        // Abschließendes „frei" an A's Schlag (offener Ball) -> als „frei" labeln (Band = ganzer Tisch).
        if (player === 'A' && pv.openEnd) b.shot.label = freiWord();
        shots.push(b.shot);
        if (vi === 0) primary = b.primary;
        if (b.variableTarget) variableAfter = true;
      });

      ball[player] = null;                       // Ball verlässt die eigene Seite
      if (primary) ball[opp] = { pos: primary.pos, depth: primary.depth, variable: variableAfter };

      return { kind: 'stroke', player: player, shots: shots };
    }

    var resolved = rows.map(function (row, idx) {
      // Reihenfolge A -> B: A's Ziel ist B's Ursprung in derselben Reihe.
      var a = resolveShot(row.a, 'A', idx);
      // Sequenz-Modus: fehlt B, wird die Default-Antwort abgeleitet (Technik aus TTV.replies;
      // Annahme-Position = A's Landepunkt = ball.B, Richtung = Default-Diagonale).
      var bCell = row.b;
      if (inferReplies && TTV.replies && isEmptyCell(bCell) && a && a.kind === 'stroke') {
        var landing = ball.B, aTech = techOf(row.a);
        var rep = (landing && aTech) ? TTV.replies.defaultReply(aTech, landing.pos) : null;
        // B spielt zur NÄCHSTEN A-Position zu (damit der Ballweg zusammenpasst);
        // am Ende einer wiederholten Gruppe wieder zum Zyklus-Start.
        if (rep) bCell = replyCell(rep, originOf(nextAfter(idx)));
      }
      var b = resolveShot(bCell, 'B', idx);
      return { a: a, b: b };
    });
    return { rows: resolved, issues: issues };
  }

  function resolveSequence(rows, opts) { return run(rows, opts).rows; }
  function resolveWithIssues(rows, opts) { return run(rows, opts); }
  // Logische Plausibilität der Sequenz: explizite Ursprünge, die nicht zum Ballort passen.
  function findOriginIssues(rows) { return run(rows).issues; }

  TTV.resolver = {
    resolveSequence: resolveSequence,
    resolveWithIssues: resolveWithIssues,
    findOriginIssues: findOriginIssues,
    deriveTarget: deriveTarget
  };
})(window.TTV = window.TTV || {});
