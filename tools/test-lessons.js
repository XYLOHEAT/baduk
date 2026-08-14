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
  ladder: [[7, 8]],
  noselfatari: [[0, 2]],
  ko: [[4, 4]],
  snapback: [[3, 2]]
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
  ['th', 'en', 'ja'].forEach(function (lang) {
    assert(L.title[lang] && L.body[lang] && L.goal[lang] && L.success[lang],
      L.id + ': missing a ' + lang.toUpperCase() + ' string');
  });

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

function lesson(id) { return LESSONS.filter(function (L) { return L.id === id; })[0]; }

// 'eyes' promises white inside either eye is refused as suicide (artist review: the old
// two-ADJACENT-empty-points shape was one big eye space — a dead shape, and the play
// inside it was legal, breaking the demo)
var eyesG = build(lesson('eyes'));
lesson('eyes').markers.forEach(function (m) {
  var r = G.play(eyesG, m[0], m[1], 2);
  assert(!r.ok && r.reason === 'suicide', 'eyes: white at ' + m + ' was not refused as suicide');
});

// 'noselfatari' promises the target is a zero-liberty point EXCEPT for the capture:
// every empty neighbour of the target must be... none — all its neighbours are stones
var nsL = lesson('noselfatari'), nsG = build(nsL), nsT = nsL.markers[0];
G.neighbors(nsG, G.idx(nsG, nsT[0], nsT[1])).forEach(function (nb) {
  assert(nsG.board[nb] !== 0, 'noselfatari: target has an empty neighbour — not a zero-liberty point');
});

// 'snapback' (artist's exact l8 board) promises: the big white group's ONLY liberty is
// the marked point, and the two lone whites survive the recapture
var sbL = lesson('snapback'), sbG = build(sbL), sbT = sbL.markers[0];
var big = G.group(sbG, G.idx(sbG, 2, 2));
assert(big.stones.length === 5, 'snapback: big white group is not 5 connected stones');
assert(big.liberties.length === 1 && big.liberties[0] === G.idx(sbG, sbT[0], sbT[1]),
  'snapback: big group liberty is not exactly the marked point');
var sbR = G.play(sbG, sbT[0], sbT[1], 1);
assert(sbR.ok && sbR.captured.length === 5, 'snapback: recapture did not take exactly 5');
assert(sbG.board[G.idx(sbG, 3, 1)] === 2 && sbG.board[G.idx(sbG, 4, 2)] === 2,
  'snapback: the lone white stones should survive');

// 'ladder' promises a single white staircase chased to the board EDGE whose only liberty
// is the marked point (artist review: the shape must read as a ladder, not a blob)
var ldL = lesson('ladder'), ldG = build(ldL), ldT = ldL.markers[0];
var chain = G.group(ldG, G.idx(ldG, 3, 3));
assert(chain.stones.length === 9, 'ladder: white staircase is not 9 connected stones');
assert(chain.liberties.length === 1 && chain.liberties[0] === G.idx(ldG, ldT[0], ldT[1]),
  'ladder: the only liberty is not the marked point');
var onEdge = chain.stones.some(function (i) {
  var x = i % ldG.size, y = (i - x) / ldG.size;
  return x === 0 || y === 0 || x === ldG.size - 1 || y === ldG.size - 1;
});
assert(onEdge, 'ladder: the chase does not reach the board edge');

// 'falseeye' promises the false-eye point is orthogonally all-black with white diagonals
var feL = lesson('falseeye'), feG = build(feL), feT = feL.markers.filter(function (m) { return m[2] === 'target'; })[0];
G.neighbors(feG, G.idx(feG, feT[0], feT[1])).forEach(function (nb) {
  assert(feG.board[nb] === 1, 'falseeye: false-eye point has a non-black orthogonal neighbour');
});
assert(feG.board[G.idx(feG, 3, 1)] === 2 && feG.board[G.idx(feG, 3, 3)] === 2,
  'falseeye: the white diagonals are missing');

console.log('test-lessons PASS: ' + LESSONS.length + ' lessons — prefills legal, solutions complete, TH/EN/JA strings present');
