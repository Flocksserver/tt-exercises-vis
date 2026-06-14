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
      if (parsed.type !== 'stroke') return null;

      var opp = player === 'A' ? 'B' : 'A';
      var incoming = ball[player];
      var hand = handOf(parsed.technik);
      // Ursprung: explizit „aus …" > Ballort (Kette) > Schlaghand (erster Schlag)
      var from = parsed.from
        ? { pos: parsed.from.pos, depth: parsed.from.depth }
        : incoming
          ? { pos: incoming.pos, depth: incoming.depth }
          : hand
            ? { pos: hand, depth: 'lang' }
            : { pos: 'Mitte', depth: 'lang' };

      // Mehrere Ursprünge (aus … oder …) sind bewusst variabel.
      var froms = parsed.from
        ? [{ pos: parsed.from.pos, depth: parsed.from.depth }].concat(
            (parsed.fromAlts || []).map(function (f) { return { pos: f.pos, depth: f.depth }; }))
        : [from];

      // Logik-Check: explizites „aus" muss zum Ballort passen (außer Ball variabel/unbestimmt
      // oder Ursprung selbst variabel via „oder").
      if (parsed.from && !parsed.fromAlts && incoming && !incoming.variable && parsed.from.pos !== incoming.pos) {
        issues.push({ row: rowIdx, player: player, technik: parsed.technik, expected: incoming.pos, got: parsed.from.pos });
      }

      var arrows = [], zone = null, variable = false;
      var tgt = parsed.target;
      if (tgt && tgt.kind === 'range') {
        zone = { from: { pos: tgt.range.from, depth: 'lang' }, to: { pos: tgt.range.to, depth: 'lang' } };
      } else if (tgt && tgt.kind === 'whole') {
        zone = { from: { pos: 'VH', depth: 'lang' }, to: { pos: 'RH', depth: 'lang' } };
      } else if (tgt && tgt.kind === 'positions') {
        arrows = tgt.list.map(function (it, idx) {
          return { to: { pos: it.pos, depth: it.depth }, dashed: idx > 0 };
        });
      } else if (parsed.direction) {
        arrows = [{ to: { pos: deriveTarget(from.pos, parsed.direction), depth: parsed.strokeDepth || 'lang' }, dashed: false }];
      }

      if (parsed.regular === 'unregelmaessig') {
        variable = true;
        if (!zone && arrows.length === 0) {
          zone = { from: { pos: 'VH', depth: 'lang' }, to: { pos: 'RH', depth: 'lang' } };
        }
      }

      // Ziel nicht eindeutig (oder / Bereich / ganzer Tisch / unregelmäßig)?
      var variableTarget = !!zone || arrows.length > 1 || parsed.regular === 'unregelmaessig';
      var primary = arrows.length ? arrows[0].to : (zone ? { pos: 'Mitte', depth: zone.from.depth || 'lang' } : null);
      ball[player] = null;                       // Ball verlässt die eigene Seite
      if (primary) ball[opp] = { pos: primary.pos, depth: primary.depth, variable: variableTarget };

      return {
        kind: 'stroke', player: player, label: TTV.notation.labelFor(parsed),
        from: froms[0], froms: froms, arrows: arrows, zone: zone, variable: variable
      };
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
