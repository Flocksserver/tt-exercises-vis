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
    if (t.indexOf('VH') === 0) return 'VH';
    if (t.indexOf('RH') === 0) return 'RH';
    return null;
  }

  // Ziel aus Ursprung + Richtung ableiten (Spieler stehen sich gegenüber).
  function deriveTarget(pos, dir) {
    if (dir === 'diagonal') return pos;            // VH→VH, RH→RH (kreuzt optisch)
    var parallel = { VH: 'RH', RH: 'VH', MitteVH: 'MitteRH', MitteRH: 'MitteVH', Ellbogen: 'MitteVH', Mitte: 'Mitte' };
    return parallel[pos] || pos;                    // parallel (längs)
  }

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
    } else if (tgt && tgt.kind === 'positions') {
      arrows = tgt.list.map(function (it, idx) { return { to: { pos: it.pos, depth: it.depth }, dashed: idx > 0 }; });
    } else if (parsed.direction) {
      arrows = [{ to: { pos: deriveTarget(froms[0].pos, parsed.direction), depth: parsed.strokeDepth || 'lang' }, dashed: false }];
    }
    if (parsed.regular === 'unregelmaessig') {
      variable = true;
      if (!zone && arrows.length === 0) zone = { from: { pos: 'VH', depth: 'lang' }, to: { pos: 'RH', depth: 'lang' } };
    }
    var multiFrom = froms.length > 1;
    var dashAll = forceDashed || multiFrom || arrows.length > 1;
    arrows = arrows.map(function (a) { return { to: a.to, dashed: dashAll || a.dashed }; });
    var primary = arrows.length ? arrows[0].to : (zone ? { pos: 'Mitte', depth: zone.from.depth || 'lang' } : null);
    var variableTarget = !!zone || arrows.length > 1 || multiFrom || forceDashed || parsed.regular === 'unregelmaessig';
    return {
      shot: { label: TTV.notation.labelFor(parsed), from: froms[0], froms: froms, arrows: arrows, zone: zone, variable: variable, zoneDashed: forceDashed || multiFrom },
      primary: primary, variableTarget: variableTarget
    };
  }

  function run(rows) {
    // ball[seite] = null (kein Ball) oder { pos, depth, variable }
    var ball = { A: null, B: null };
    var issues = [];

    function resolveShot(parsed, player, rowIdx) {
      if (!parsed || parsed.type === 'empty') return null;
      if (parsed.type === 'frei' || parsed.type === 'endlos') {
        ball.A = null; ball.B = null;   // Rally-Grenze: Ball unbestimmt
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
      var b = resolveShot(row.b, 'B', idx);
      return { a: a, b: b };
    });
    return { rows: resolved, issues: issues };
  }

  function resolveSequence(rows) { return run(rows).rows; }
  function resolveWithIssues(rows) { return run(rows); }
  // Logische Plausibilität der Sequenz: explizite Ursprünge, die nicht zum Ballort passen.
  function findOriginIssues(rows) { return run(rows).issues; }

  TTV.resolver = {
    resolveSequence: resolveSequence,
    resolveWithIssues: resolveWithIssues,
    findOriginIssues: findOriginIssues,
    deriveTarget: deriveTarget
  };
})(window.TTV = window.TTV || {});
