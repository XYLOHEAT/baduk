/*
 * worker.js — Monte-Carlo Go bot (runs off the main thread).
 * Flat Monte-Carlo: for each candidate move (plus pass), play random games to the
 * end and keep the move with the best win rate for the bot. No neural net, no model,
 * no network — pure playouts. Modest amateur strength on 9x9/13x13.
 * ponytail: flat MC, not UCT/neural. Good for a beginner opponent; swap in a net
 *   (KataGo WASM) only if real dan-level strength is ever required.
 */
/* global GoEngine, importScripts, postMessage, onmessage */
importScripts('engine.js');
var E = GoEngine, EMPTY = E.EMPTY;

function isEye(g, i, color) {
  var ns = E.neighbors(g, i);
  for (var k = 0; k < ns.length; k++) if (g.board[ns[k]] !== color) return false;
  return true; // surrounded entirely by own stones — don't fill it during playouts
}

function clone(s) {
  return {
    size: s.size, board: s.board.slice(), toMove: s.toMove, komi: s.komi,
    captures: { 1: s.captures[1], 2: s.captures[2] },
    ko: s.ko, passes: 0, moveNumber: 0, lastMove: null, history: []
  };
}

// play one random (non-eye) move for the side to move; pass if none is sensible
function randomTurn(g) {
  var color = g.toMove, n = g.size, cands = [];
  for (var i = 0; i < g.board.length; i++) {
    if (g.board[i] !== EMPTY || i === g.ko) continue;
    if (isEye(g, i, color)) continue;
    cands.push(i);
  }
  for (var j = cands.length - 1; j > 0; j--) { // Fisher-Yates
    var k = (Math.random() * (j + 1)) | 0, t = cands[j]; cands[j] = cands[k]; cands[k] = t;
  }
  for (var c = 0; c < cands.length; c++) {
    var x = cands[c] % n, y = (cands[c] - (cands[c] % n)) / n;
    if (E.play(g, x, y, color).ok) return true; // play() reverts on illegal, so just try next
  }
  E.pass(g);
  return false;
}

// random game to the end (or a move cap), scored from the bot's perspective
function simulate(g, botColor) {
  var cap = g.size * g.size * 2, moves = 0;
  while (g.passes < 2 && moves < cap) { randomTurn(g); moves++; }
  var sc = E.score(g);
  return sc.winner === botColor ? 1 : (sc.winner === 0 ? 0.5 : 0);
}

onmessage = function (e) {
  var d = e.data;
  var root = {
    size: d.size, board: Int8Array.from(d.board), toMove: d.toMove, komi: d.komi,
    captures: { 1: 0, 2: 0 }, ko: (d.ko == null ? -1 : d.ko),
    passes: 0, moveNumber: 0, lastMove: null, history: []
  };
  var botColor = d.toMove, n = root.size;

  // candidate moves: every legal-looking point, plus the option to pass
  var cands = [];
  for (var i = 0; i < root.board.length; i++) {
    if (root.board[i] !== EMPTY || i === root.ko) continue;
    if (isEye(root, i, botColor)) continue;
    cands.push(i);
  }
  cands.push(-1); // -1 = pass

  if (cands.length === 1) { postMessage({ pass: true, token: d.token }); return; }

  var stats = cands.map(function () { return { w: 0, n: 0 }; });
  var deadline = Date.now() + (d.budgetMs || 800), iter = 0;
  while (Date.now() < deadline) {
    var ci = iter % cands.length; iter++;
    var g = clone(root);
    var mv = cands[ci];
    if (mv === -1) { E.pass(g); }
    else {
      var x = mv % n, y = (mv - (mv % n)) / n;
      if (!E.play(g, x, y, botColor).ok) { stats[ci].n++; continue; } // illegal -> counts as loss
    }
    stats[ci].w += simulate(g, botColor);
    stats[ci].n++;
  }

  var bestI = -1, bestRate = -1;
  for (var s = 0; s < cands.length; s++) {
    if (stats[s].n === 0) continue;
    var rate = stats[s].w / stats[s].n;
    if (rate > bestRate) { bestRate = rate; bestI = s; }
  }
  var best = cands[bestI];
  if (best === -1 || best == null) postMessage({ pass: true, token: d.token });
  else postMessage({ x: best % n, y: (best - (best % n)) / n, token: d.token, winRate: bestRate });
};
