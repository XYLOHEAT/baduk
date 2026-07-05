/*
 * tools/test-lessons.js — proves every lesson is well-formed and completable.
 * Run: node tools/test-lessons.js
 * For each lesson: prefill stones legally-shaped (in bounds, no overlap, no
 * zero-liberty prefilled group), then play the intended solution and assert
 * check() passes (or manualDone). Catches impossible lessons (like the old
 * noselfatari board whose white group had zero liberties from the start).
 */
'use strict';
var assert = require('assert');
var G = global.GoEngine = require('../engine.js');
var LESSONS = require('../lessons.js');

// intended solution per lesson id: list of [x,y] moves for the lesson colour
var SOLUTIONS = {
  place: [[0, 0], [1, 0], [2, 0]],
  liberty: [[4, 3], [3, 4], [5, 4]],
  capture: [[4, 5]],
  connect: [[4, 4]],
  ladder: [[4, 6]],
  noselfatari: [[0, 2]],
  ko: [[4, 4]],
  snapback: [[4, 4]]
};

function build(L) {
  var g = G.createGame(L.size, 6.5);
  (L.stones || []).forEach(function (st) {
    var i = G.idx(g, st[0], st[1]);
    assert(G.inB(g, st[0], st[1]), L.id + ': prefill stone off board ' + st);
    assert(g.board[i] === 0, L.id + ': prefill overlap at ' + st);
    g.board[i] = st[2] === 'B' ? 1 : 2;
  });
  g.toMove = L.toMove;
  return g;
}

LESSONS.forEach(function (L) {
  var g = build(L);
  // no prefilled group may start with zero liberties (it could never be captured or saved)
  for (var i = 0; i < g.board.length; i++) {
    if (g.board[i] === 0) continue;
    assert(G.group(g, i).liberties.length > 0, L.id + ': prefilled group at idx ' + i + ' has no liberties');
  }
  // markers must be in bounds
  (L.markers || []).forEach(function (m) { assert(G.inB(g, m[0], m[1]), L.id + ': marker off board ' + m); });
  assert(L.title.th && L.title.en && L.body.th && L.body.en && L.goal.th && L.goal.en
    && L.success.th && L.success.en, L.id + ': missing a TH/EN string');

  if (L.manualDone) { assert(L.check(g) === false, L.id + ': manualDone lesson must not auto-complete'); return; }

  var sol = SOLUTIONS[L.id];
  assert(sol, L.id + ': interactive lesson has no solution listed in test');
  assert(!L.check(g), L.id + ': check passes before any move');
  sol.forEach(function (mv) {
    var r = G.play(g, mv[0], mv[1], L.toMove);
    assert(r.ok, L.id + ': solution move ' + mv + ' illegal: ' + r.reason);
    g.toMove = L.toMove; // learn mode keeps the lesson colour to move
  });
  assert(L.check(g), L.id + ': check still failing after the solution');
});

// the 'ending' lesson promises pass-pass ends the game on its board
var endL = LESSONS.filter(function (L) { return L.id === 'ending'; })[0];
var eg = build(endL);
G.pass(eg);
assert(G.pass(eg).ended, 'ending: two passes did not end the game');

console.log('test-lessons PASS: ' + LESSONS.length + ' lessons — prefills legal, solutions complete, TH/EN strings present');
