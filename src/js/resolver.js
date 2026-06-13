/*
 * resolver.js — macht aus den (ggf. unvollständigen) Parser-Ergebnissen konkrete Schläge.
 *
 * Zwei Aufgaben, die die verkürzte Trainingsnotation erst zeichenbar machen:
 *  1) Ballverlauf-Kette: fehlt „aus …“, ist der Ursprung der letzte Landepunkt auf der
 *     eigenen Seite (in der Rally kommt der Ball von dort, wo der Vorschlag hinging).
 *  2) Richtung: fehlt das Ziel, wird es aus Ursprung + diagonal/längs abgeleitet.
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
    var laengs = { VH: 'RH', RH: 'VH', MitteVH: 'MitteRH', MitteRH: 'MitteVH', Ellbogen: 'MitteVH', Mitte: 'Mitte' };
    return laengs[pos] || pos;                      // längs / parallel
  }

  function resolveSequence(rows) {
    // null = kein Ball auf dieser Seite im Spiel (noch kein Schlag dorthin)
    var ballOnA = null;
    var ballOnB = null;

    function resolveShot(parsed, player) {
      if (!parsed || parsed.type === 'empty') return null;
      if (parsed.type === 'frei') return { kind: 'frei', player: player };
      if (parsed.type === 'endlos') return { kind: 'endlos', player: player };
      if (parsed.type !== 'stroke') return null;

      // Ursprung: explizit „aus …" > Ballort (Ballverlauf-Kette) > Schlaghand (erster Schlag)
      var incoming = player === 'A' ? ballOnA : ballOnB;
      var hand = handOf(parsed.technik);
      var from = parsed.from
        ? { pos: parsed.from.pos, depth: parsed.from.depth }
        : incoming
          ? clone(incoming)
          : hand
            ? { pos: hand, depth: 'lang' }
            : { pos: 'Mitte', depth: 'lang' };

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

      // Ball verlässt die eigene Seite; Gegenseite bekommt das primäre Ziel.
      var primary = arrows.length ? arrows[0].to : (zone ? { pos: 'Mitte', depth: zone.from.depth || 'lang' } : null);
      if (player === 'A') {
        ballOnA = null;
        if (primary) ballOnB = { pos: primary.pos, depth: primary.depth };
      } else {
        ballOnB = null;
        if (primary) ballOnA = { pos: primary.pos, depth: primary.depth };
      }

      return {
        kind: 'stroke', player: player, label: TTV.notation.labelFor(parsed),
        from: from, arrows: arrows, zone: zone, variable: variable
      };
    }

    return rows.map(function (row) {
      // Reihenfolge A -> B: A's Ziel ist B's Ursprung in derselben Reihe.
      var a = resolveShot(row.a, 'A');
      var b = resolveShot(row.b, 'B');
      return { a: a, b: b };
    });
  }

  TTV.resolver = { resolveSequence: resolveSequence, deriveTarget: deriveTarget };
})(window.TTV = window.TTV || {});
