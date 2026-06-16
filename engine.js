/*
 * engine.js — Go / Baduk rules engine. Pure logic, no DOM.
 * Works in the browser (attaches to window.GoEngine) and in Node (module.exports),
 * so the self-check at the bottom runs with `node engine.js`.
 *
 * Rules implemented: placement, group/liberty (flood fill), capture, suicide ban,
 * simple ko (single-stone recapture), pass, area (Chinese) scoring + komi.
 * ponytail: simple-ko only (covers the textbook case); swap to positional superko
 *   if you ever need to forbid long-cycle repetitions. Dead-stone removal is manual
 *   (players agree) — automating it is a hard problem, out of scope for a teaching app.
 */
(function (root) {
  'use strict';

  var EMPTY = 0, BLACK = 1, WHITE = 2;
  var other = function (c) { return c === BLACK ? WHITE : BLACK; };

  function createGame(size, komi) {
    size = size || 9;
    return {
      size: size,
      board: new Int8Array(size * size), // 0 empty, 1 black, 2 white
      toMove: BLACK,
      komi: komi == null ? 6.5 : komi,
      captures: { 1: 0, 2: 0 },          // stones captured BY black / BY white
      ko: -1,                            // forbidden index for the immediate next move
      lastMove: null,                    // {x,y,color,captured:[idx...]} or {pass:true}
      passes: 0,                         // consecutive passes
      moveNumber: 0,
      history: []                        // {x,y,color} or {pass}
    };
  }

  function idx(g, x, y) { return y * g.size + x; }
  function inB(g, x, y) { return x >= 0 && y >= 0 && x < g.size && y < g.size; }

  function neighbors(g, i) {
    var s = g.size, x = i % s, y = (i - x) / s, out = [];
    if (x > 0) out.push(i - 1);
    if (x < s - 1) out.push(i + 1);
    if (y > 0) out.push(i - s);
    if (y < s - 1) out.push(i + s);
    return out;
  }

  // Flood-fill the connected group at i. Returns {stones:[idx], liberties:Set}.
  function group(g, i) {
    var color = g.board[i];
    var stones = [], seen = {}, libs = {}, stack = [i];
    seen[i] = true;
    while (stack.length) {
      var cur = stack.pop();
      stones.push(cur);
      var ns = neighbors(g, cur);
      for (var k = 0; k < ns.length; k++) {
        var n = ns[k], v = g.board[n];
        if (v === EMPTY) { libs[n] = true; }
        else if (v === color && !seen[n]) { seen[n] = true; stack.push(n); }
      }
    }
    return { stones: stones, liberties: Object.keys(libs).map(Number) };
  }

  function libertyCount(g, i) { return group(g, i).liberties.length; }

  // Try a move. Returns {ok:true, captured:[idx]} or {ok:false, reason:'...'}.
  // Mutates g only on success.
  function play(g, x, y, color) {
    color = color || g.toMove;
    if (!inB(g, x, y)) return { ok: false, reason: 'offboard' };
    var i = idx(g, x, y);
    if (g.board[i] !== EMPTY) return { ok: false, reason: 'occupied' };
    if (i === g.ko) return { ok: false, reason: 'ko' };

    var opp = other(color);
    g.board[i] = color; // tentative

    // 1) capture opponent groups left with no liberties
    var captured = [];
    var ns = neighbors(g, i);
    var checked = {};
    for (var k = 0; k < ns.length; k++) {
      var n = ns[k];
      if (g.board[n] === opp && !checked[n]) {
        var grp = group(g, n);
        for (var q = 0; q < grp.stones.length; q++) checked[grp.stones[q]] = true;
        if (grp.liberties.length === 0) {
          for (var q2 = 0; q2 < grp.stones.length; q2++) {
            g.board[grp.stones[q2]] = EMPTY;
            captured.push(grp.stones[q2]);
          }
        }
      }
    }

    // 2) suicide check: own group must have a liberty (unless it captured)
    if (captured.length === 0 && libertyCount(g, i) === 0) {
      g.board[i] = EMPTY; // revert
      return { ok: false, reason: 'suicide' };
    }

    // commit
    g.captures[color] += captured.length;

    // 3) simple-ko: if exactly one stone captured AND the placed stone is now a
    //    lone group with exactly one liberty, the captured point is forbidden next.
    var myGroup = group(g, i);
    if (captured.length === 1 && myGroup.stones.length === 1 && myGroup.liberties.length === 1) {
      g.ko = captured[0];
    } else {
      g.ko = -1;
    }

    g.toMove = opp;
    g.passes = 0;
    g.moveNumber++;
    g.lastMove = { x: x, y: y, color: color, captured: captured };
    g.history.push({ x: x, y: y, color: color });
    return { ok: true, captured: captured };
  }

  function pass(g) {
    g.ko = -1;
    g.toMove = other(g.toMove);
    g.passes++;
    g.moveNumber++;
    g.lastMove = { pass: true, color: other(g.toMove) };
    g.history.push({ pass: true });
    return { ok: true, ended: g.passes >= 2 };
  }

  // Area (Chinese) scoring: stones on board + territory enclosed by one colour only.
  // `dead` (optional Set/array of indices) is treated as removed before scoring, so
  // players can mark dead stones at game end and have their points count as territory.
  function score(g, dead) {
    var s = g.size, area = { 1: 0, 2: 0 };
    var board = g.board;
    if (dead && dead.forEach) { board = g.board.slice(); dead.forEach(function (i) { board[i] = EMPTY; }); }
    var seen = new Int8Array(s * s);
    for (var i = 0; i < board.length; i++) {
      if (board[i] !== EMPTY) { area[board[i]]++; continue; }
      if (seen[i]) continue;
      // flood the empty region, record which colours border it
      var stack = [i], region = [], borders = {};
      seen[i] = 1;
      while (stack.length) {
        var cur = stack.pop();
        region.push(cur);
        var ns = neighbors(g, cur);
        for (var k = 0; k < ns.length; k++) {
          var n = ns[k], v = board[n];
          if (v === EMPTY) { if (!seen[n]) { seen[n] = 1; stack.push(n); } }
          else borders[v] = true;
        }
      }
      var b = borders[BLACK], w = borders[WHITE];
      if (b && !w) area[BLACK] += region.length;
      else if (w && !b) area[WHITE] += region.length;
      // bordered by both (dame) or neither (empty board): neutral
    }
    var black = area[BLACK];
    var white = area[WHITE] + g.komi;
    return {
      black: black, white: white,
      blackArea: area[BLACK], whiteArea: area[WHITE], komi: g.komi,
      winner: black > white ? BLACK : (white > black ? WHITE : 0),
      margin: Math.abs(black - white)
    };
  }

  var GoEngine = {
    EMPTY: EMPTY, BLACK: BLACK, WHITE: WHITE,
    other: other, createGame: createGame, idx: idx, inB: inB,
    neighbors: neighbors, group: group, libertyCount: libertyCount,
    play: play, pass: pass, score: score
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = GoEngine;
  else root.GoEngine = GoEngine;

  // ---- self-check (runs only under node: `node engine.js`) ----
  if (typeof module !== 'undefined' && require.main === module) {
    var assert = require('assert');
    var G = GoEngine;

    // capture: black surrounds a lone white stone, white is removed
    var g = G.createGame(5, 0.5);
    G.play(g, 1, 1, WHITE);
    G.play(g, 1, 0, BLACK);
    G.play(g, 0, 1, BLACK);
    G.play(g, 2, 1, BLACK);
    var r = G.play(g, 1, 2, BLACK); // fills last liberty
    assert(r.ok && r.captured.length === 1, 'capture failed');
    assert(g.board[G.idx(g, 1, 1)] === EMPTY, 'captured stone not removed');
    assert(g.captures[BLACK] === 1, 'capture count wrong');

    // suicide: white plays into a fully black-surrounded empty point -> illegal
    var g2 = G.createGame(5, 0.5);
    G.play(g2, 1, 0, BLACK); G.play(g2, 4, 4, WHITE);
    G.play(g2, 0, 1, BLACK); G.play(g2, 4, 3, WHITE);
    G.play(g2, 2, 1, BLACK); G.play(g2, 3, 4, WHITE);
    G.play(g2, 1, 2, BLACK); // black surrounds (1,1)
    var bad = G.play(g2, 1, 1, WHITE);
    assert(!bad.ok && bad.reason === 'suicide', 'suicide not rejected: ' + JSON.stringify(bad));

    // suicide that captures is legal: classic corner take
    var g3 = G.createGame(3, 0.5);
    // white group at a1,a2 (idx 6,3) with black wall; black plays to capture, legal
    g3.board[G.idx(g3, 0, 0)] = WHITE;
    g3.board[G.idx(g3, 0, 1)] = WHITE;
    g3.board[G.idx(g3, 1, 0)] = BLACK;
    g3.board[G.idx(g3, 1, 1)] = BLACK;
    g3.toMove = BLACK;
    var cap = G.play(g3, 0, 2, BLACK); // last liberty of white group -> capture 2
    assert(cap.ok && cap.captured.length === 2, 'capturing move misjudged: ' + JSON.stringify(cap));

    // ko: black captures one stone and is itself left in atari -> the recapture
    // point is forbidden to white on the immediately following move.
    //   white: (3,2) [the victim], (1,2),(2,1),(2,3) [walling black's stone]
    //   black: (4,2),(3,1),(3,3) [walling the victim]; black then plays (2,2).
    var g4 = G.createGame(5, 0.5);
    [[3,2],[1,2],[2,1],[2,3]].forEach(function (p) { g4.board[G.idx(g4, p[0], p[1])] = WHITE; });
    [[4,2],[3,1],[3,3]].forEach(function (p) { g4.board[G.idx(g4, p[0], p[1])] = BLACK; });
    g4.toMove = BLACK;
    var koCap = G.play(g4, 2, 2, BLACK);
    assert(koCap.ok && koCap.captured.length === 1, 'ko capture failed: ' + JSON.stringify(koCap));
    assert(g4.ko === G.idx(g4, 3, 2), 'ko point not set');
    var koBad = G.play(g4, 3, 2, WHITE);
    assert(!koBad.ok && koBad.reason === 'ko', 'ko recapture not forbidden: ' + JSON.stringify(koBad));
    // after white plays elsewhere, the ko point frees up
    G.play(g4, 0, 0, WHITE);
    assert(g4.ko === -1, 'ko point not cleared after a move elsewhere');

    // scoring: a 3x3 fully owned by black = 9 points; white only has komi
    var sg = G.createGame(3, 6.5);
    [[1,0],[0,1],[2,1],[1,2],[1,1]].forEach(function (p) { sg.board[G.idx(sg, p[0], p[1])] = BLACK; });
    var sc = G.score(sg);
    assert(sc.black === 9 && sc.winner === BLACK, 'area scoring wrong: ' + JSON.stringify(sc));

    // dead-stone scoring: a white stone inside black's area, marked dead, becomes black territory
    var dg = G.createGame(3, 6.5);
    [[1, 0], [0, 1], [2, 1], [1, 2]].forEach(function (p) { dg.board[G.idx(dg, p[0], p[1])] = BLACK; });
    dg.board[G.idx(dg, 1, 1)] = WHITE; // a dead white stone in the centre
    var dsc = G.score(dg, [G.idx(dg, 1, 1)]);
    assert(dsc.black === 9 && dsc.whiteArea === 0, 'dead-stone scoring wrong: ' + JSON.stringify(dsc));

    console.log('engine.js self-check PASS: capture, suicide, capturing-suicide, ko, scoring, dead-stones');
  }
})(typeof window !== 'undefined' ? window : this);
