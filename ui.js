/*
 * ui.js — board rendering + interaction + modes (pass-and-play / vs bot / learn).
 * Vanilla DOM, SVG board built with createElementNS (no innerHTML with data).
 * Depends on: engine.js (GoEngine), lessons.js (GoLessons).
 */
(function () {
  'use strict';
  var E = window.GoEngine, LESSONS = window.GoLessons;
  var BLACK = E.BLACK, WHITE = E.WHITE, EMPTY = E.EMPTY;

  // ---------- i18n (static strings only; never user input) ----------
  var T = {
    th: {
      modePlay: 'เล่นกับเพื่อน', modeBot: 'เล่นกับบอท', modeLearn: 'โหมดสอนเล่น',
      newGame: 'เกมใหม่', pass: 'ผ่าน (Pass)', undo: 'ย้อนกลับ', count: 'นับแต้ม',
      size: 'ขนาดกระดาน', turn: 'ตาเดิน', black: 'ดำ', white: 'ขาว',
      capByBlack: 'ดำจับกิน', capByWhite: 'ขาวจับกิน',
      illegalOccupied: 'จุดนี้มีหมากแล้ว', illegalKo: 'กฎโก: จับคืนทันทีไม่ได้',
      illegalSuicide: 'ห้ามฆ่าตัวตาย (เหลือลมหายใจศูนย์)', illegalOff: 'นอกกระดาน',
      youAre: 'คุณคือ', botThinks: 'บอทกำลังคิด…', botPassed: 'บอทขอผ่าน',
      gameOver: 'จบเกม', winnerBlack: 'ดำชนะ', winnerWhite: 'ขาวชนะ', tie: 'เสมอ',
      by: 'ด้วยแต้ม', points: 'แต้ม', komi: 'โคมิ',
      hint: 'คำใบ้', gotIt: 'เข้าใจแล้ว', prev: 'ก่อนหน้า', next: 'ถัดไป',
      lesson: 'บทเรียน', goalLabel: 'เป้าหมาย', wellDone: 'ทำได้ดีมาก',
      allDone: 'จบทุกบทแล้ว! ไปลองเล่นจริงได้เลย', theme: 'สลับธีม', langName: 'EN',
      passLabel: 'ผ่าน', stoneOnBoard: 'หมากบนกระดาน',
      resume: 'เล่นต่อ', scoringHint: 'แตะกลุ่มหมากที่ “ตาย” เพื่อนำออก แล้วดูแต้มด้านล่าง',
      mascotHi: 'มาเริ่มเรียนกัน!', mascotGood: 'เก่งมาก!', mascotThink: 'ขอคิดแป๊บ…',
      mascotOops: 'อุ๊ปส์ ตรงนั้นเดินไม่ได้', mascotWin: 'จบเกม มานับแต้มกัน', mascotPlay: 'ตาคุณแล้ว วางได้เลย',
      difficulty: 'ระดับความยาก', diffEasy: 'ง่าย', diffMedium: 'กลาง', diffHard: 'ยาก',
      diffNote19: 'กระดาน 19×19 บอทเล่นระดับเดียว (เร็ว)'
    },
    en: {
      modePlay: 'Two players', modeBot: 'Vs bot', modeLearn: 'Learn',
      newGame: 'New game', pass: 'Pass', undo: 'Undo', count: 'Count score',
      size: 'Board size', turn: 'To move', black: 'Black', white: 'White',
      capByBlack: 'Black captured', capByWhite: 'White captured',
      illegalOccupied: 'That point is taken', illegalKo: 'Ko: cannot retake immediately',
      illegalSuicide: 'No suicide (zero liberties)', illegalOff: 'Off the board',
      youAre: 'You are', botThinks: 'Bot is thinking…', botPassed: 'Bot passed',
      gameOver: 'Game over', winnerBlack: 'Black wins', winnerWhite: 'White wins', tie: 'Tie',
      by: 'by', points: 'pts', komi: 'komi',
      hint: 'Hint', gotIt: 'Got it', prev: 'Prev', next: 'Next',
      lesson: 'Lesson', goalLabel: 'Goal', wellDone: 'Well done',
      allDone: 'All lessons done! Go play a real game.', theme: 'Theme', langName: 'ไทย',
      passLabel: 'pass', stoneOnBoard: 'stones on board',
      resume: 'Resume', scoringHint: 'Tap “dead” groups to remove them, then read the score below',
      mascotHi: "Let's learn!", mascotGood: 'Nice move!', mascotThink: 'Thinking…',
      mascotOops: 'Oops, you can\'t play there', mascotWin: 'Game over, let\'s count', mascotPlay: 'Your turn',
      difficulty: 'Difficulty', diffEasy: 'Easy', diffMedium: 'Medium', diffHard: 'Hard',
      diffNote19: '19×19: the bot plays one fast level'
    }
  };

  // ---------- state ----------
  var S = {
    // validate persisted values: a corrupted localStorage must not crash or inject
    lang: localStorage.getItem('baduk.lang') === 'en' ? 'en' : 'th',
    theme: localStorage.getItem('baduk.theme'),
    mode: 'play',
    size: 9,
    game: null,
    snapshots: [],
    cursor: { x: 4, y: 4 },
    hover: null,
    lessonIdx: 0,
    busy: false,
    scoring: false,    // dead-stone marking mode at game end
    dead: null,        // Set of dead stone indices while scoring
    botToken: 0,       // guards against stale worker replies after new game
    difficulty: (['easy', 'medium', 'hard'].indexOf(localStorage.getItem('baduk.difficulty')) >= 0
      ? localStorage.getItem('baduk.difficulty') : 'medium')
  };
  function t(k) { return T[S.lang][k]; }
  var botWorker = null;

  var $ = function (id) { return document.getElementById(id); };
  var svg, layerGrid, layerMark, layerStone, layerOver;
  var SVGNS = 'http://www.w3.org/2000/svg';
  var PAD = 1, R = 0.46;

  // mascot guide: the licensed 碁石さん art will be dropped into #mascot later
  // (pending the creator's OK). For now only the speech line (#mascotMsg) is used;
  // setMascot() also stamps data-state so swapped-in art can animate per reaction.

  // ---------- helpers ----------
  function cloneGame(g) {
    return {
      size: g.size, board: g.board.slice(), toMove: g.toMove, komi: g.komi,
      captures: { 1: g.captures[1], 2: g.captures[2] }, ko: g.ko,
      lastMove: g.lastMove, passes: g.passes, moveNumber: g.moveNumber,
      history: g.history.slice()
    };
  }
  function px(v) { return PAD + v; }
  function el(tag, attrs) {
    var e = document.createElementNS(SVGNS, tag);
    for (var k in attrs) if (attrs.hasOwnProperty(k)) e.setAttribute(k, attrs[k]);
    return e;
  }
  function starPoints(n) {
    if (n === 9) return [[2, 2], [6, 2], [4, 4], [2, 6], [6, 6]];
    if (n === 13) return [[3, 3], [9, 3], [6, 6], [3, 9], [9, 9]];
    if (n === 19) return [[3, 3], [9, 3], [15, 3], [3, 9], [9, 9], [15, 9], [3, 15], [9, 15], [15, 15]];
    return [];
  }

  // ---------- board build (grid once per new game) ----------
  function buildBoard() {
    var n = S.size, V = (n - 1) + 2 * PAD;
    svg.setAttribute('viewBox', '0 0 ' + V + ' ' + V);
    svg.setAttribute('aria-label', n + 'x' + n + ' Go board');
    [layerGrid, layerMark, layerStone, layerOver].forEach(function (L) {
      while (L.firstChild) L.removeChild(L.firstChild);
    });
    // lines
    for (var i = 0; i < n; i++) {
      layerGrid.appendChild(el('line', { x1: px(0), y1: px(i), x2: px(n - 1), y2: px(i), class: 'grid-line' }));
      layerGrid.appendChild(el('line', { x1: px(i), y1: px(0), x2: px(i), y2: px(n - 1), class: 'grid-line' }));
    }
    // star points
    starPoints(n).forEach(function (p) {
      layerGrid.appendChild(el('circle', { cx: px(p[0]), cy: px(p[1]), r: 0.09, class: 'star' }));
    });
  }

  // ---------- render stones, markers, overlay ----------
  function render() {
    var g = S.game, n = g.size;
    while (layerStone.firstChild) layerStone.removeChild(layerStone.firstChild);
    while (layerMark.firstChild) layerMark.removeChild(layerMark.firstChild);
    while (layerOver.firstChild) layerOver.removeChild(layerOver.firstChild);

    // lesson markers
    if (S.mode === 'learn') {
      var L = LESSONS[S.lessonIdx];
      (L.markers || []).forEach(function (m) {
        var cls = m[2] === 'eye' ? 'mark-eye' : (m[2] === 'good' ? 'mark-good' : 'mark-target');
        layerMark.appendChild(el('circle', { cx: px(m[0]), cy: px(m[1]), r: 0.30, class: cls }));
      });
    }

    // stones
    for (var i = 0; i < g.board.length; i++) {
      var v = g.board[i];
      if (v === EMPTY) continue;
      var x = i % n, y = (i - x) / n;
      var cls = 'stone ' + (v === BLACK ? 'black' : 'white');
      if (g.lastMove && !g.lastMove.pass && g.lastMove.x === x && g.lastMove.y === y) cls += ' just-placed';
      if (S.scoring && S.dead && S.dead.has(i)) cls += ' dead';
      layerStone.appendChild(el('circle', { cx: px(x), cy: px(y), r: R, class: cls }));
    }

    // last move dot
    if (g.lastMove && !g.lastMove.pass) {
      layerOver.appendChild(el('circle', {
        cx: px(g.lastMove.x), cy: px(g.lastMove.y), r: 0.12,
        class: 'last-move ' + (g.lastMove.color === BLACK ? 'on-black' : 'on-white')
      }));
    }
    // ko marker
    if (g.ko >= 0) {
      var kx = g.ko % n, ky = (g.ko - kx) / n;
      layerOver.appendChild(el('rect', { x: px(kx) - 0.16, y: px(ky) - 0.16, width: 0.32, height: 0.32, class: 'ko-mark' }));
    }
    // hover ghost
    if (S.hover && g.board[E.idx(g, S.hover.x, S.hover.y)] === EMPTY && !S.busy) {
      layerOver.appendChild(el('circle', {
        cx: px(S.hover.x), cy: px(S.hover.y), r: R,
        class: 'ghost ' + (currentColor() === BLACK ? 'black' : 'white')
      }));
    }
    // keyboard cursor
    layerOver.appendChild(el('rect', {
      x: px(S.cursor.x) - R, y: px(S.cursor.y) - R, width: 2 * R, height: 2 * R, rx: 0.08,
      class: 'cursor'
    }));

    paintSidebar();
  }

  function currentColor() {
    if (S.mode === 'learn') return LESSONS[S.lessonIdx].toMove;
    return S.game.toMove;
  }

  // ---------- sidebar / status ----------
  function setStatus(msg) { var s = $('status'); if (s) s.textContent = msg; }

  function paintSidebar() {
    var g = S.game;
    $('capBlack').textContent = t('capByBlack') + ': ' + g.captures[BLACK];
    $('capWhite').textContent = t('capByWhite') + ': ' + g.captures[WHITE];
    var turnC = currentColor();
    $('turnLabel').textContent = t('turn');
    var sw = $('turnSwatch');
    sw.className = 'swatch ' + (turnC === BLACK ? 'black' : 'white');
    $('turnName').textContent = turnC === BLACK ? t('black') : t('white');

    // panel content depends on mode
    if (S.mode === 'learn') {
      var L = LESSONS[S.lessonIdx];
      $('panelTitle').textContent = (S.lang === 'th' ? 'บทที่ ' : 'Lesson ') + (S.lessonIdx + 1) + '. ' + L.title[S.lang];
      $('panelBody').textContent = L.body[S.lang];
      $('goalBox').hidden = false;
      $('goalText').textContent = t('goalLabel') + ': ' + L.goal[S.lang];
      $('lessonNav').hidden = false;
      $('lessonProgress').textContent = (S.lessonIdx + 1) + ' / ' + LESSONS.length;
      $('gotItBtn').hidden = !L.manualDone;
      $('hintBtn').hidden = false;
    } else {
      $('panelTitle').textContent = S.mode === 'bot' ? t('modeBot') : t('modePlay');
      $('panelBody').textContent = S.mode === 'bot'
        ? (t('youAre') + ' ' + t('black') + '. ' + (S.lang === 'th' ? 'บอทเล่นขาว เดินสลับกัน' : 'The bot plays White. Take turns.'))
        : (S.lang === 'th' ? 'ผลัดกันเดินบนเครื่องเดียว ดำเริ่มก่อน' : 'Hot-seat on one device. Black starts.');
      $('goalBox').hidden = true;
      $('lessonNav').hidden = true;
      $('gotItBtn').hidden = true;
      $('hintBtn').hidden = true;
    }
  }

  // ---------- moves ----------
  function snapshot() { S.snapshots.push(cloneGame(S.game)); if (S.snapshots.length > 400) S.snapshots.shift(); }

  function reasonMsg(r) {
    return r === 'occupied' ? t('illegalOccupied') : r === 'ko' ? t('illegalKo')
      : r === 'suicide' ? t('illegalSuicide') : t('illegalOff');
  }

  function tryPlay(x, y) {
    if (S.busy) return;
    var g = S.game;
    var color = currentColor();
    snapshot();
    var res = E.play(g, x, y, color);
    if (!res.ok) {
      S.snapshots.pop();
      setStatus(reasonMsg(res.reason));
      setMascot('oops', t('mascotOops'));
      flashInvalid(x, y);
      // in the suicide / ko lessons, an illegal attempt is part of learning
      render();
      return;
    }
    if (S.mode === 'learn') {
      g.toMove = color; // learn mode: keep playing the lesson colour
      render();
      runLessonCheck();
      return;
    }
    render();
    announceMove(res, color, x, y);
    if (g.passes >= 2) { endGame(); return; }
    if (S.mode === 'bot' && g.toMove === WHITE) botTurn();
  }

  function announceMove(res, color, x, y) {
    var nm = (color === BLACK ? t('black') : t('white'));
    var msg = nm + ' ' + String.fromCharCode(65 + x) + (S.size - y);
    if (res.captured && res.captured.length) { msg += ' · +' + res.captured.length; setMascot('happy', t('mascotGood')); }
    setStatus(msg);
  }

  function doPass() {
    if (S.busy) return;
    snapshot();
    var r = E.pass(S.game);
    setStatus((S.game.lastMove.color === BLACK ? t('black') : t('white')) + ' ' + t('passLabel'));
    render();
    if (r.ended) { endGame(); return; }
    if (S.mode === 'bot' && S.game.toMove === WHITE) botTurn();
  }

  function undo() {
    if (S.busy || !S.snapshots.length) return;
    S.game = S.snapshots.pop();
    // in bot mode, also undo the bot's reply so the human is to move again
    if (S.mode === 'bot' && S.game.toMove === WHITE && S.snapshots.length) S.game = S.snapshots.pop();
    setStatus('');
    render();
  }

  function flashInvalid(x, y) {
    var c = el('circle', { cx: px(x), cy: px(y), r: R, class: 'invalid' });
    layerOver.appendChild(c);
    setTimeout(function () { if (c.parentNode) c.parentNode.removeChild(c); }, 260);
  }

  // ---------- bot ----------
  // Difficulty maps to engine + thinking budget:
  //   easy   -> greedy heuristic (weak, instant) at any size
  //   medium -> Monte-Carlo, short budget   (worker.js)
  //   hard   -> Monte-Carlo, long budget     (reads more, stronger)
  // Monte-Carlo runs on 9x9 / 13x13 only; on 19x19 flat MC is too slow/weak in JS,
  // so every level falls back to the greedy heuristic there.
  function botBudgetMs() {
    if (S.difficulty === 'medium') return S.size <= 9 ? 500 : 750;
    return S.size <= 9 ? 1400 : 1900; // hard
  }

  function botTurn() {
    S.busy = true;
    setStatus(t('botThinks'));
    setMascot('think', t('mascotThink'));
    render();
    var useMC = (S.difficulty !== 'easy') && S.size <= 13;
    if (useMC) {
      var g = S.game, token = ++S.botToken;
      getWorker().postMessage({
        board: Array.from(g.board), size: g.size, toMove: WHITE, komi: g.komi,
        ko: g.ko, budgetMs: botBudgetMs(), token: token
      });
    } else {
      setTimeout(function () { applyBotMove(botMove(S.game, WHITE)); }, 200);
    }
  }

  function getWorker() {
    if (!botWorker) {
      botWorker = new Worker('worker.js');
      botWorker.onmessage = function (e) {
        if (e.data.token !== S.botToken) return; // stale reply (new game / mode change)
        applyBotMove(e.data.pass ? null : { x: e.data.x, y: e.data.y });
      };
      botWorker.onerror = function () { applyBotMove(botMove(S.game, WHITE)); }; // fall back
    }
    return botWorker;
  }

  function applyBotMove(mv) {
    S.busy = false;
    setMascot('idle', t('mascotPlay'));
    snapshot();
    var res = mv ? E.play(S.game, mv.x, mv.y, WHITE) : { ok: false };
    if (!res.ok) { S.snapshots.pop(); var r = E.pass(S.game); setStatus(t('botPassed')); render(); if (r.ended) endGame(); return; }
    render();
    announceMove(res, WHITE, mv.x, mv.y);
    if (S.game.passes >= 2) endGame();
  }

  function isOwnEye(g, x, y, color) {
    var i = E.idx(g, x, y);
    var ns = E.neighbors(g, i);
    for (var k = 0; k < ns.length; k++) if (g.board[ns[k]] !== color) return false;
    return true; // all orthogonal neighbours are own colour
  }

  function botMove(g, color) {
    var best = null, bestScore = -1e9, ties = [];
    for (var i = 0; i < g.board.length; i++) {
      if (g.board[i] !== EMPTY) continue;
      var x = i % g.size, y = (i - x) / g.size;
      if (i === g.ko) continue;
      if (isOwnEye(g, x, y, color)) continue; // never fill own eye
      var trial = cloneGame(g);
      var r = E.play(trial, x, y, color);
      if (!r.ok) continue;
      var sc = 0;
      sc += r.captured.length * 12;                       // capturing is great
      var myLib = E.libertyCount(trial, i);
      if (myLib === 1 && r.captured.length === 0) sc -= 8; // avoid self-atari
      // reward putting an opponent group in atari
      var ns = E.neighbors(trial, i), seen = {};
      for (var k = 0; k < ns.length; k++) {
        var nb = ns[k];
        if (trial.board[nb] === E.other(color) && !seen[nb]) {
          var grp = E.group(trial, nb);
          grp.stones.forEach(function (st) { seen[st] = 1; });
          if (grp.liberties.length === 1) sc += 5;
        }
      }
      sc += myLib * 0.3;                                   // mild preference for breathing room
      sc += Math.random() * 0.2;                           // break ties naturally
      if (sc > bestScore) { bestScore = sc; best = { x: x, y: y }; ties = [best]; }
    }
    return best; // null => pass (no legal/sensible move)
  }

  // ---------- learn check ----------
  function runLessonCheck() {
    var L = LESSONS[S.lessonIdx];
    if (L.check && L.check(S.game)) {
      setStatus('✔ ' + t('wellDone') + ' · ' + L.success[S.lang]);
      setMascot('happy', t('mascotGood'));
      $('nextLesson').classList.add('pulse');
    }
  }

  function loadLesson(idx) {
    S.lessonIdx = (idx + LESSONS.length) % LESSONS.length;
    var L = LESSONS[S.lessonIdx];
    S.size = L.size;
    S.game = E.createGame(L.size, 6.5);
    (L.stones || []).forEach(function (st) {
      S.game.board[E.idx(S.game, st[0], st[1])] = st[2] === 'B' ? BLACK : WHITE;
    });
    S.game.toMove = L.toMove;
    S.snapshots = [];
    S.cursor = { x: Math.floor(L.size / 2), y: Math.floor(L.size / 2) };
    S.scoring = false; S.dead = null; S.busy = false; S.botToken++;
    $('scoreBox').hidden = true; $('scoreControls').hidden = true;
    buildBoard();
    render();
    setStatus('');
    setMascot('idle', t('mascotHi'));
    $('nextLesson').classList.remove('pulse');
  }

  // ---------- scoring (manual dead-stone marking + area count) ----------
  function endGame() { enterScoring(); }

  function enterScoring() {
    if (S.scoring) return;
    S.scoring = true;
    S.dead = new Set();
    S.hover = null;
    $('scoreControls').hidden = false;
    $('scoreHint').textContent = t('scoringHint');
    $('resumeBtn').textContent = t('resume');
    setStatus(t('scoringHint'));
    setMascot('happy', t('mascotWin'));
    updateScoreLive();
    render();
  }

  function exitScoring() {
    S.scoring = false;
    S.dead = null;
    $('scoreControls').hidden = true;
    $('scoreBox').hidden = true;
    setStatus('');
    setMascot('idle', t('mascotPlay'));
    render();
  }

  function toggleDead(x, y) {
    var g = S.game, i = E.idx(g, x, y);
    if (g.board[i] === EMPTY) return;
    var grp = E.group(g, i);
    var wasDead = S.dead.has(grp.stones[0]);
    grp.stones.forEach(function (st) { if (wasDead) S.dead.delete(st); else S.dead.add(st); });
    updateScoreLive();
    render();
  }

  function updateScoreLive() {
    var sc = E.score(S.game, S.dead ? Array.from(S.dead) : null);
    $('scoreBox').hidden = false;
    var who = sc.winner === BLACK ? t('winnerBlack') : sc.winner === WHITE ? t('winnerWhite') : t('tie');
    $('scoreHead').textContent = t('count');
    $('scoreLine').textContent =
      t('black') + ' ' + sc.black + '  ·  ' + t('white') + ' ' + sc.white + ' (' + t('komi') + ' ' + sc.komi + ')';
    $('scoreWinner').textContent = sc.winner === 0 ? who
      : who + ' ' + t('by') + ' ' + sc.margin.toFixed(1) + ' ' + t('points');
  }

  // ---------- pointer + keyboard ----------
  function svgToPoint(evt) {
    var rect = svg.getBoundingClientRect();
    var n = S.size, V = (n - 1) + 2 * PAD;
    var sx = (evt.clientX - rect.left) / rect.width * V - PAD;
    var sy = (evt.clientY - rect.top) / rect.height * V - PAD;
    var x = Math.round(sx), y = Math.round(sy);
    if (x < 0 || y < 0 || x >= n || y >= n) return null;
    return { x: x, y: y };
  }

  function attach() {
    svg.addEventListener('pointermove', function (e) {
      var p = svgToPoint(e);
      if (!p) { if (S.hover) { S.hover = null; render(); } return; }
      if (!S.hover || S.hover.x !== p.x || S.hover.y !== p.y) { S.hover = p; render(); }
    });
    svg.addEventListener('pointerleave', function () { S.hover = null; render(); });
    svg.addEventListener('pointerdown', function (e) {
      var p = svgToPoint(e); if (!p) return;
      S.cursor = { x: p.x, y: p.y };
      if (S.scoring) toggleDead(p.x, p.y); else tryPlay(p.x, p.y);
    });
    svg.addEventListener('keydown', function (e) {
      var n = S.size, c = S.cursor, handled = true;
      if (e.key === 'ArrowLeft') c.x = Math.max(0, c.x - 1);
      else if (e.key === 'ArrowRight') c.x = Math.min(n - 1, c.x + 1);
      else if (e.key === 'ArrowUp') c.y = Math.max(0, c.y - 1);
      else if (e.key === 'ArrowDown') c.y = Math.min(n - 1, c.y + 1);
      else if (e.key === 'Enter' || e.key === ' ') { if (S.scoring) toggleDead(c.x, c.y); else tryPlay(c.x, c.y); }
      else handled = false;
      if (handled) { e.preventDefault(); render(); }
    });

    $('newGameBtn').onclick = function () { if (S.mode === 'learn') loadLesson(S.lessonIdx); else newGame(); };
    $('passBtn').onclick = doPass;
    $('undoBtn').onclick = undo;
    $('countBtn').onclick = function () { if (!S.busy) enterScoring(); };
    $('resumeBtn').onclick = exitScoring;
    $('langBtn').onclick = function () { S.lang = S.lang === 'th' ? 'en' : 'th'; localStorage.setItem('baduk.lang', S.lang); applyLang(); render(); };
    $('themeBtn').onclick = toggleTheme;
    $('sizeSel').onchange = function (e) { S.size = parseInt(e.target.value, 10); newGame(); };
    $('hintBtn').onclick = function () {
      var L = LESSONS[S.lessonIdx];
      var m = (L.markers || [])[0];
      if (m) { S.cursor = { x: m[0], y: m[1] }; render(); setStatus(S.lang === 'th' ? 'ลองดูจุดที่ถูกไฮไลต์' : 'Look at the highlighted point'); }
    };
    $('gotItBtn').onclick = function () {
      var L = LESSONS[S.lessonIdx];
      setStatus('✔ ' + L.success[S.lang]);
      $('nextLesson').classList.add('pulse');
    };
    $('prevLesson').onclick = function () { loadLesson(S.lessonIdx - 1); };
    $('nextLesson').onclick = function () {
      if (S.lessonIdx === LESSONS.length - 1) { setStatus(t('allDone')); return; }
      loadLesson(S.lessonIdx + 1);
    };
    document.querySelectorAll('[data-mode]').forEach(function (b) {
      b.onclick = function () { setMode(b.getAttribute('data-mode')); };
    });
    document.querySelectorAll('[data-diff]').forEach(function (b) {
      b.onclick = function () { setDifficulty(b.getAttribute('data-diff')); };
    });
  }

  // ---------- mode / lang / theme ----------
  function setMode(m) {
    S.mode = m;
    document.querySelectorAll('[data-mode]').forEach(function (b) {
      b.setAttribute('aria-pressed', b.getAttribute('data-mode') === m ? 'true' : 'false');
    });
    $('scoreBox').hidden = true;
    $('sizeRow').hidden = (m === 'learn');
    $('difficultyRow').hidden = (m !== 'bot'); // difficulty only matters vs the bot
    if (m === 'learn') loadLesson(S.lessonIdx);
    else newGame();
  }

  function setDifficulty(d) {
    S.difficulty = d;
    localStorage.setItem('baduk.difficulty', d);
    document.querySelectorAll('[data-diff]').forEach(function (b) {
      b.setAttribute('aria-pressed', b.getAttribute('data-diff') === d ? 'true' : 'false');
    });
    $('diffNote').hidden = !(S.size >= 19); // difficulty has no effect on 19x19
  }

  function newGame() {
    S.game = E.createGame(S.size, 6.5);
    S.snapshots = [];
    S.cursor = { x: Math.floor(S.size / 2), y: Math.floor(S.size / 2) };
    S.scoring = false; S.dead = null; S.busy = false; S.botToken++; // invalidate any in-flight bot reply
    $('scoreBox').hidden = true; $('scoreControls').hidden = true;
    $('diffNote').hidden = !(S.size >= 19);
    setMascot('idle', S.mode === 'bot' ? t('mascotPlay') : t('mascotHi'));
    buildBoard();
    render();
    setStatus('');
  }

  function applyLang() {
    document.documentElement.lang = S.lang;
    $('modePlayBtn').textContent = t('modePlay');
    $('modeBotBtn').textContent = t('modeBot');
    $('modeLearnBtn').textContent = t('modeLearn');
    $('newGameBtn').textContent = t('newGame');
    $('passBtn').textContent = t('pass');
    $('undoBtn').textContent = t('undo');
    $('countBtn').textContent = t('count');
    $('sizeLabel').textContent = t('size');
    $('diffLabel').textContent = t('difficulty');
    $('diffEasy').textContent = t('diffEasy');
    $('diffMed').textContent = t('diffMedium');
    $('diffHard').textContent = t('diffHard');
    $('diffNote').textContent = t('diffNote19');
    $('hintBtn').textContent = t('hint');
    $('gotItBtn').textContent = t('gotIt');
    $('prevLesson').textContent = '‹ ' + t('prev');
    $('nextLesson').textContent = t('next') + ' ›';
    $('langBtn').textContent = t('langName');
    $('themeBtn').setAttribute('aria-label', t('theme'));
  }

  function toggleTheme() {
    var cur = document.documentElement.getAttribute('data-theme');
    var next = cur === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('baduk.theme', next);
  }

  // ---------- mascot guide ----------
  // Only the speech line for now; data-state lets future licensed art react.
  function setMascot(state, msg) {
    var m = $('mascot'); if (m) m.setAttribute('data-state', state);
    if (msg !== undefined) $('mascotMsg').textContent = msg;
  }

  // ---------- init ----------
  function init() {
    svg = $('board');
    layerGrid = $('layerGrid'); layerMark = $('layerMark');
    layerStone = $('layerStone'); layerOver = $('layerOver');
    if (S.theme === 'dark' || S.theme === 'light') document.documentElement.setAttribute('data-theme', S.theme);
    var rl = $('repoLink'); if (rl) rl.href = 'https://github.com/XYLOHEAT/baduk';
    applyLang();
    attach();
    setDifficulty(S.difficulty); // sync the difficulty control with the stored value
    setMode('learn'); // start in teaching mode, as requested
    setMascot('idle', t('mascotHi'));
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
