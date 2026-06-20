/*
 * ui.js — board rendering + interaction + modes (pass-and-play / vs bot / learn).
 * Vanilla DOM, SVG board built with createElementNS (no innerHTML with data).
 * Depends on: engine.js (GoEngine), lessons.js (GoLessons).
 */
(function () {
  'use strict';
  var E = window.GoEngine, LESSONS = window.GoLessons;
  var BLACK = E.BLACK, WHITE = E.WHITE, EMPTY = E.EMPTY;
  var VERSION = '1.12.0';
  // shown in the in-app "version history" dialog (newest first)
  var CHANGELOG = [
    { v: '1.12.0', th: 'ลื่นขึ้น: หมากไม่กระพริบตอนเลื่อนเมาส์ + ใช้แรมน้อยลง', en: 'Smoother: no stone flicker on hover + lower memory' },
    { v: '1.11.0', th: 'เพิ่มประวัติเวอร์ชันในเว็บ', en: 'In-app version history' },
    { v: '1.10.0', th: 'หน้าหมากตามสถานการณ์ + ไกด์สีชมพู', en: 'Situation-based stone faces + pink guide' },
    { v: '1.9.0', th: 'ใช้สีหน้า 碁石さん ครบ 18 แบบ', en: 'All 18 碁石さん expressions used' },
    { v: '1.8.0', th: 'หมากมีอารมณ์ครบ (กังวล/ตกใจ/ตาย)', en: 'Full stone emotions (worried/scared/dead)' },
    { v: '1.7.0', th: 'หมากเปลี่ยนสีหน้าเมื่อจะโดนกิน', en: 'Stones react when in atari' },
    { v: '1.6.0', th: 'ปุ่มสลับหมาก ปกติ / โกอิชิซัง', en: 'Classic / Goishi-san stone toggle' },
    { v: '1.5.0', th: 'เพิ่มมาสคอตนำทาง 碁石さん', en: 'Added 碁石さん teaching mascot' },
    { v: '1.4.0', th: 'บอทนิวรัล KataGo ระดับดั้น', en: 'Dan-level KataGo neural bot' },
    { v: '1.2.0', th: 'จบเกมด้วยพาส 2 ครั้ง + นับแต้ม', en: 'Two passes end the game + scoring' },
    { v: '1.1.0', th: 'เล่นกับบอท + เลือกสี + ปรับความยาก', en: 'Vs bot + colour choice + difficulty' },
    { v: '1.0.0', th: 'เกมโกะ + โหมดสอนเล่น', en: 'Go game + teaching mode' }
  ];
  // KataGo dan net (b18c384nbt, ~93MB) served same-origin from R2 via functions/models/.
  var NEURAL_MODEL = 'models/kata1-b18c384nbt-s9996604416-d4316597426.bin.gz';

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
      passLabel: 'ผ่าน', stoneOnBoard: 'หมากบนกระดาน', stoneStyle: 'แบบหมาก', stoneNormal: 'ปกติ', stoneMascot: 'โกอิชิซัง', verHistory: 'ประวัติเวอร์ชัน', closeLbl: 'ปิด',
      resume: 'เล่นต่อ', scoringHint: 'แตะกลุ่มหมากที่ “ตาย” เพื่อนำออก แล้วดูแต้มด้านล่าง',
      mascotHi: 'มาเริ่มเรียนกัน!', mascotGood: 'เก่งมาก!', mascotThink: 'ขอคิดแป๊บ…',
      mascotOops: 'อุ๊ปส์ ตรงนั้นเดินไม่ได้', mascotWin: 'จบเกม มานับแต้มกัน', mascotPlay: 'ตาคุณแล้ว วางได้เลย',
      difficulty: 'ระดับความยาก', diffEasy: 'ง่าย', diffMedium: 'กลาง', diffHard: 'ยาก', diffNeural: 'นิวรัล',
      diffNote19: '19×19: โหมดเร็วใช้ greedy · นิวรัลเล่นได้แต่ช้ากว่า',
      neuralLoading: 'กำลังโหลดเอนจินนิวรัล KataGo ระดับดั้น (~90MB) … ครั้งแรกช้า แล้วจะ cache ไว้',
      neuralFail: 'โหลดนิวรัลไม่สำเร็จ ใช้บอทปกติแทน',
      playAs: 'คุณเล่นเป็น', botPlays: 'บอทเล่น', blackFirst: 'ดำเดินก่อน', takeTurns: 'เดินสลับกัน'
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
      passLabel: 'pass', stoneOnBoard: 'stones on board', stoneStyle: 'Stones', stoneNormal: 'Classic', stoneMascot: 'Goishi-san', verHistory: 'Version history', closeLbl: 'Close',
      resume: 'Resume', scoringHint: 'Tap “dead” groups to remove them, then read the score below',
      mascotHi: "Let's learn!", mascotGood: 'Nice move!', mascotThink: 'Thinking…',
      mascotOops: 'Oops, you can\'t play there', mascotWin: 'Game over, let\'s count', mascotPlay: 'Your turn',
      difficulty: 'Difficulty', diffEasy: 'Easy', diffMedium: 'Medium', diffHard: 'Hard', diffNeural: 'Neural',
      diffNote19: '19×19: fast tiers use greedy · neural works but is slower',
      neuralLoading: 'Loading dan-level KataGo engine (~90MB)… slow first time, then cached',
      neuralFail: 'Neural failed to load; using the regular bot',
      playAs: 'You play', botPlays: 'Bot plays', blackFirst: 'Black moves first', takeTurns: 'take turns'
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
    scoringOver: false,// true when scoring was triggered by game end (two passes)
    dead: null,        // Set of dead stone indices while scoring
    botToken: 0,       // guards against stale worker replies after new game
    difficulty: (['easy', 'medium', 'hard', 'neural'].indexOf(localStorage.getItem('baduk.difficulty')) >= 0
      ? localStorage.getItem('baduk.difficulty') : 'medium'),
    humanColor: (localStorage.getItem('baduk.humanColor') === '2' ? WHITE : BLACK), // vs bot: your colour
    stoneStyle: (localStorage.getItem('baduk.stoneStyle') === 'mascot' ? 'mascot' : 'normal') // 'normal' circles | 'mascot' 碁石さん faces
  };
  function t(k) { return T[S.lang][k]; }
  var botWorker = null;

  var $ = function (id) { return document.getElementById(id); };
  var svg, layerGrid, layerMark, layerStone, layerOver;
  var SVGNS = 'http://www.w3.org/2000/svg';
  var PAD = 1, R = 0.46;
  // genuinely-calm 碁石さん faces — the only non-situational pick, for a plain
  // settled stone (kept stable per position so a stone's resting face doesn't flicker).
  var CALM_FACES = [11, 3, 17, 18];

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

  // ---------- render ----------
  // Full render = stones + overlay + sidebar. Hover/cursor only redraw the overlay,
  // so the SVG <image> stones aren't torn down on every mouse move (no flicker, no churn).
  function render() { renderStones(); renderOverlay(); paintSidebar(); }

  // stones + lesson markers — rerun only when the stones' look can change
  // (move, pass, undo, scoring/dead, stone style, lesson/new game/size), never on hover.
  function renderStones() {
    var g = S.game, n = g.size;
    while (layerStone.firstChild) layerStone.removeChild(layerStone.firstChild);
    while (layerMark.firstChild) layerMark.removeChild(layerMark.firstChild);

    // lesson markers
    if (S.mode === 'learn') {
      var L = LESSONS[S.lessonIdx];
      (L.markers || []).forEach(function (m) {
        var cls = m[2] === 'eye' ? 'mark-eye' : (m[2] === 'good' ? 'mark-good' : 'mark-target');
        layerMark.appendChild(el('circle', { cx: px(m[0]), cy: px(m[1]), r: 0.30, class: cls }));
      });
    }

    // mascot stones: precompute group liberties + sizes, the star-point set, and
    // what the last move just captured — so each stone can pick a fitting expression.
    var libOf = null, sizeOf = null, starSet = null, capSet = null, capColor = 0;
    if (S.stoneStyle === 'mascot') {
      libOf = {}; sizeOf = {};
      for (var gi = 0; gi < g.board.length; gi++) {
        if (g.board[gi] === EMPTY || libOf[gi] !== undefined) continue;
        var grp = E.group(g, gi), lc = grp.liberties.length, sz = grp.stones.length, s;
        for (s = 0; s < sz; s++) { libOf[grp.stones[s]] = lc; sizeOf[grp.stones[s]] = sz; }
      }
      starSet = {};
      starPoints(n).forEach(function (p) { starSet[p[1] * n + p[0]] = 1; });
      capSet = {};
      if (g.lastMove && g.lastMove.captured) {
        g.lastMove.captured.forEach(function (ci) { capSet[ci] = 1; });
        capColor = g.lastMove.color; // the side that made the capture
      }
    }

    // stones
    for (var i = 0; i < g.board.length; i++) {
      var v = g.board[i];
      if (v === EMPTY) continue;
      var x = i % n, y = (i - x) / n;
      var cls = 'stone ' + (v === BLACK ? 'black' : 'white');
      var justPlaced = g.lastMove && !g.lastMove.pass && g.lastMove.x === x && g.lastMove.y === y;
      if (justPlaced) cls += ' just-placed';
      if (S.scoring && S.dead && S.dead.has(i)) cls += ' dead';
      if (S.stoneStyle === 'mascot') {
        // pick a 碁石さん expression from the situation around this stone
        var nbrs = E.neighbors(g, i), enemy = v === BLACK ? WHITE : BLACK;
        var attacks = false, koNext = false, k;
        for (k = 0; k < nbrs.length; k++) {
          var nb = nbrs[k];
          if (g.board[nb] === enemy && libOf[nb] === 1) attacks = true;  // we threaten an enemy group with capture
          if (g.ko >= 0 && nb === g.ko) koNext = true;                   // sitting beside the ko point
        }
        // a friendly stone just captured diagonally next to us (an orthogonal neighbour
        // of a captured point shares its group, so it'd be gone too) -> anger
        var friendLost = false;
        if (capColor === enemy) {
          var dd = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
          for (k = 0; k < 4; k++) {
            var dx2 = x + dd[k][0], dy2 = y + dd[k][1];
            if (dx2 >= 0 && dy2 >= 0 && dx2 < n && dy2 < n && capSet[dy2 * n + dx2]) { friendLost = true; break; }
          }
        }
        var capN = (justPlaced && g.lastMove.captured) ? g.lastMove.captured.length : 0;
        var hash = (i * 2654435761 >>> 0);
        var fn;
        if (S.scoring && S.dead && S.dead.has(i)) fn = 16;       // marked dead -> sleeping
        else if (libOf[i] === 1) fn = sizeOf[i] >= 4 ? 4 : 15;  // atari: big group doomed -> pale shock, else panic
        else if (capN >= 3) fn = 14;                            // just captured a big group -> big laugh
        else if (capN >= 1) fn = 2;                             // just captured -> smug
        else if (friendLost) fn = (hash & 1) ? 1 : 5;          // a friend was just captured beside us -> angry
        else if (libOf[i] === 2) fn = 8;                        // 2 liberties -> worried
        else if (justPlaced) fn = attacks ? 10 : 13;           // just placed: sneaky if it threatens, else happy
        else if (attacks) fn = 10;                             // threatening an enemy group -> mischievous
        else if (koNext) fn = 6;                               // beside the ko point -> pouty
        else if (libOf[i] === 3) fn = 9;                       // getting hemmed in -> uneasy
        else if (libOf[i] >= 6 || sizeOf[i] >= 5) fn = 7;      // strong / large group -> content
        else if (starSet[i]) fn = 12;                          // star point -> the special card
        else fn = CALM_FACES[hash % CALM_FACES.length];        // plain settled stone -> calm
        layerStone.appendChild(el('image', {
          x: px(x) - R, y: px(y) - R, width: 2 * R, height: 2 * R,
          href: 'assets/mascot/stone-' + (v === BLACK ? 'black' : 'white') + '-' + fn + '.png',
          preserveAspectRatio: 'xMidYMid meet', class: cls
        }));
      } else {
        layerStone.appendChild(el('circle', { cx: px(x), cy: px(y), r: R, class: cls }));
      }
    }
  }

  // overlay: last move, ko, hover ghost, keyboard cursor — cheap, redrawn on every hover/cursor move
  function renderOverlay() {
    var g = S.game, n = g.size;
    while (layerOver.firstChild) layerOver.removeChild(layerOver.firstChild);

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
  }

  function currentColor() {
    if (S.mode === 'learn') return LESSONS[S.lessonIdx].toMove;
    return S.game.toMove;
  }
  function botColor() { return E.other(S.humanColor); } // vs bot, the bot takes the other colour

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
      if (S.mode === 'bot') {
        var hName = S.humanColor === BLACK ? t('black') : t('white');
        var bName = botColor() === BLACK ? t('black') : t('white');
        $('panelBody').textContent = t('playAs') + ' ' + hName + ' · ' + t('botPlays') + ' ' + bName + ' · ' + t('blackFirst');
      } else {
        $('panelBody').textContent = (S.lang === 'th' ? 'ผลัดกันเดินบนเครื่องเดียว ดำเริ่มก่อน' : 'Hot-seat on one device. Black starts.');
      }
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
    if (S.mode === 'bot' && g.toMove === botColor()) botTurn();
  }

  function announceMove(res, color, x, y) {
    var nm = (color === BLACK ? t('black') : t('white'));
    var msg = nm + ' ' + String.fromCharCode(65 + x) + (S.size - y);
    if (res.captured && res.captured.length) { msg += ' · +' + res.captured.length; setMascot('happy', t('mascotGood')); }
    setStatus(msg);
  }

  function doPass() {
    if (S.busy || S.scoring) return; // not while counting at game end
    snapshot();
    var r = E.pass(S.game);
    setStatus((S.game.lastMove.color === BLACK ? t('black') : t('white')) + ' ' + t('passLabel'));
    render();
    if (r.ended) { endGame(); return; }
    if (S.mode === 'bot' && S.game.toMove === botColor()) botTurn();
  }

  function undo() {
    if (S.busy || S.scoring || !S.snapshots.length) return;
    S.game = S.snapshots.pop();
    // in bot mode, also undo the bot's reply so the human is to move again
    if (S.mode === 'bot' && S.game.toMove === botColor() && S.snapshots.length) S.game = S.snapshots.pop();
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
    var bc = botColor();
    var token = ++S.botToken;                 // one token per bot turn; every async path checks it
    // If the human just passed and the bot is not losing, pass too so the game
    // ends (standard Go: a pass is answered by a pass when you are content).
    if (S.game.lastMove && S.game.lastMove.pass) {
      var sc = E.score(S.game);
      var botPts = bc === BLACK ? sc.black : sc.white;
      var oppPts = bc === BLACK ? sc.white : sc.black;
      if (botPts >= oppPts) { setTimeout(function () { if (token === S.botToken) applyBotMove(null); }, 250); return; }
    }
    if (S.difficulty === 'neural') { neuralTurn(bc, token); return; }
    var useMC = (S.difficulty !== 'easy') && S.size <= 13;
    if (useMC) {
      var g = S.game;
      getWorker().postMessage({
        board: Array.from(g.board), size: g.size, toMove: bc, komi: g.komi,
        ko: g.ko, budgetMs: botBudgetMs(), token: token
      });
    } else {
      setTimeout(function () { if (token === S.botToken) applyBotMove(botMove(S.game, bc)); }, 200);
    }
  }

  function getWorker() {
    if (!botWorker) {
      botWorker = new Worker('worker.js?v=' + VERSION);
      botWorker.onmessage = function (e) {
        if (e.data.token !== S.botToken) return; // stale reply (new game / mode change)
        applyBotMove(e.data.pass ? null : { x: e.data.x, y: e.data.y });
      };
      botWorker.onerror = function () { if (S.busy) applyBotMove(botMove(S.game, botColor())); }; // recover only if a turn is live
    }
    return botWorker;
  }

  // ---------- neural bot (KataGo via vendored worker; lazy-loaded) ----------
  var neural = null; // { worker, ready: Promise }
  function ensureNeural() {
    if (neural) return neural.ready;
    var worker = new Worker('neural-worker.js?v=' + VERSION, { type: 'module' });
    var obj = { worker: worker };
    obj.initialized = false;
    obj.ready = new Promise(function (resolve, reject) {
      worker.onmessage = function (ev) {
        var m = ev.data;
        if (m.type === 'katago:init_result') { if (m.ok) { obj.initialized = true; resolve(); } else reject(new Error(m.error || 'init failed')); return; }
        if (m.type === 'katago:analyze_result') { onNeuralResult(m); return; }
        // katago:analyze_update progress — ignore
      };
      worker.onerror = function () {
        if (!obj.initialized) { reject(new Error('neural worker error')); }
        else if (S.busy) { setStatus(t('neuralFail')); applyBotMove(botMove(S.game, botColor())); } // recover a stuck analysis
      };
    });
    setStatus(t('neuralLoading'));
    setMascot('think', t('neuralLoading'));
    worker.postMessage({ type: 'katago:init', modelUrl: NEURAL_MODEL });
    neural = obj;
    return obj.ready;
  }

  function neuralTurn(bc, token) {
    var budget = S.size <= 9 ? 4000 : S.size <= 13 ? 6000 : 10000;
    // Watchdog: a worker that stalls (WASM thread deadlock, or a model load/network
    // hang) must never freeze the board. After a generous grace period, fall back to
    // the greedy bot. The first call's grace also covers the ~90MB model download.
    setTimeout(function () {
      if (token !== S.botToken || !S.busy) return; // a real reply already landed
      S.botToken++;                                // invalidate any late neural reply so it can't double-move
      setStatus(t('neuralFail'));
      applyBotMove(botMove(S.game, bc));
    }, (neural && neural.initialized) ? budget + 8000 : 90000);
    ensureNeural().then(function () {
      if (token !== S.botToken) return;          // stale (new game / mode / difficulty change)
      setStatus(t('botThinks'));
      neural.worker.postMessage({
        type: 'katago:analyze', id: token, modelUrl: NEURAL_MODEL,
        board: toIntersections(S.game), currentPlayer: bc === BLACK ? 'black' : 'white',
        komi: S.game.komi, rules: 'chinese',
        visits: 256, maxTimeMs: budget, moveHistory: []
      });
    }).catch(function () {
      if (token !== S.botToken) return;
      setStatus(t('neuralFail'));                // graceful fallback to the greedy bot
      applyBotMove(botMove(S.game, bc));
    });
  }

  function onNeuralResult(m) {
    if (m.id !== S.botToken) return;             // stale result
    if (!m.ok) { applyBotMove(botMove(S.game, botColor())); return; } // analysis failed -> greedy fallback, not a pass
    var mv = null;
    if (m.analysis && m.analysis.moves && m.analysis.moves.length) {
      var b = m.analysis.moves[0];
      if (b.x >= 0 && b.y >= 0 && b.x < S.size && b.y < S.size) mv = { x: b.x, y: b.y }; // else off-board -> genuine pass
    }
    applyBotMove(mv);
  }

  function toIntersections(g) { // engine board -> KataGo BoardState (board[y][x] = 'black'|'white'|null)
    var n = g.size, out = [];
    for (var y = 0; y < n; y++) {
      var row = [];
      for (var x = 0; x < n; x++) { var v = g.board[y * n + x]; row.push(v === BLACK ? 'black' : v === WHITE ? 'white' : null); }
      out.push(row);
    }
    return out;
  }

  function applyBotMove(mv) {
    S.busy = false;
    setMascot('idle', t('mascotPlay'));
    var bc = botColor();
    snapshot();
    var res = mv ? E.play(S.game, mv.x, mv.y, bc) : { ok: false };
    if (!res.ok) { S.snapshots.pop(); var r = E.pass(S.game); setStatus(t('botPassed')); render(); if (r.ended) endGame(); return; }
    render();
    announceMove(res, bc, mv.x, mv.y);
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
    S.scoring = false; S.scoringOver = false; S.dead = null; S.busy = false; S.botToken++;
    $('scoreBox').hidden = true; $('scoreControls').hidden = true;
    buildBoard();
    render();
    setStatus('');
    setMascot('idle', t('mascotHi'));
    $('nextLesson').classList.remove('pulse');
  }

  // ---------- scoring (manual dead-stone marking + area count) ----------
  // over=true when triggered by game end (two passes); false for a mid-game count.
  function endGame() {
    if (!S.scoring) { enterScoring(true); return; }
    S.scoringOver = true; updateScoreLive(); render(); // upgrade an in-progress count to game-over
  }

  function enterScoring(over) {
    if (S.scoring) return;
    S.scoring = true;
    S.scoringOver = !!over;
    S.dead = new Set();
    S.hover = null;
    $('scoreControls').hidden = false;
    $('scoreHint').textContent = t('scoringHint');
    $('resumeBtn').textContent = t('resume');
    setMascot('happy', t('mascotWin'));
    updateScoreLive();
    render();
  }

  function exitScoring() {
    S.scoring = false;
    S.scoringOver = false;
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
    var result = sc.winner === 0 ? who : who + ' ' + t('by') + ' ' + sc.margin.toFixed(1) + ' ' + t('points');
    $('scoreHead').textContent = S.scoringOver ? t('gameOver') : t('count');
    $('scoreLine').textContent =
      t('black') + ' ' + sc.black + '  ·  ' + t('white') + ' ' + sc.white + ' (' + t('komi') + ' ' + sc.komi + ')';
    $('scoreWinner').textContent = result;
    setStatus(S.scoringOver ? (t('gameOver') + ' · ' + result) : t('scoringHint'));
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
      if (!p) { if (S.hover) { S.hover = null; renderOverlay(); } return; }
      if (!S.hover || S.hover.x !== p.x || S.hover.y !== p.y) { S.hover = p; renderOverlay(); } // overlay only: stones stay put
    });
    svg.addEventListener('pointerleave', function () { S.hover = null; renderOverlay(); });
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
      // arrows just move the cursor (overlay); Enter/Space already full-rendered via tryPlay/toggleDead
      if (handled) { e.preventDefault(); renderOverlay(); }
    });

    $('newGameBtn').onclick = function () { if (S.mode === 'learn') loadLesson(S.lessonIdx); else newGame(); };
    $('passBtn').onclick = doPass;
    $('undoBtn').onclick = undo;
    $('countBtn').onclick = function () { if (!S.busy) enterScoring(false); };
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
    document.querySelectorAll('[data-color]').forEach(function (b) {
      b.onclick = function () { setHumanColor(parseInt(b.getAttribute('data-color'), 10), true); };
    });
    document.querySelectorAll('[data-stone]').forEach(function (b) {
      b.onclick = function () { setStoneStyle(b.getAttribute('data-stone')); };
    });
    $('versionBtn').onclick = openChangelog;
    $('changelogClose').onclick = function () { $('changelog').close(); };
    $('changelog').onclick = function (e) { if (e.target === $('changelog')) $('changelog').close(); }; // click backdrop to close
  }

  // ---------- version history ----------
  function openChangelog() {
    var ul = $('changelogBody');
    while (ul.firstChild) ul.removeChild(ul.firstChild);
    CHANGELOG.forEach(function (c) {
      var li = document.createElement('li');
      var b = document.createElement('b'); b.textContent = 'v' + c.v;       // textContent: no HTML injection
      var span = document.createElement('span'); span.textContent = c[S.lang] || c.en;
      li.appendChild(b); li.appendChild(span); ul.appendChild(li);
    });
    $('changelogTitle').textContent = t('verHistory');
    $('changelogClose').textContent = t('closeLbl');
    $('changelog').showModal();
  }

  // ---------- mode / lang / theme ----------
  function setMode(m) {
    S.mode = m;
    document.querySelectorAll('[data-mode]').forEach(function (b) {
      b.setAttribute('aria-pressed', b.getAttribute('data-mode') === m ? 'true' : 'false');
    });
    $('scoreBox').hidden = true;
    $('sizeRow').hidden = (m === 'learn');
    $('colorRow').hidden = (m !== 'bot');       // colour choice only matters vs the bot
    $('difficultyRow').hidden = (m !== 'bot'); // difficulty only matters vs the bot
    if (m === 'learn') loadLesson(S.lessonIdx);
    else newGame();
  }

  function setDifficulty(d) {
    S.difficulty = d;
    S.botToken++; // invalidate any in-flight bot move so a tier switch mid-think can't land a stale move
    localStorage.setItem('baduk.difficulty', d);
    document.querySelectorAll('[data-diff]').forEach(function (b) {
      b.setAttribute('aria-pressed', b.getAttribute('data-diff') === d ? 'true' : 'false');
    });
    $('diffNote').hidden = !(S.size >= 19); // difficulty has no effect on 19x19
  }

  function setHumanColor(c, restart) {
    S.humanColor = c;
    localStorage.setItem('baduk.humanColor', String(c));
    document.querySelectorAll('[data-color]').forEach(function (b) {
      b.setAttribute('aria-pressed', parseInt(b.getAttribute('data-color'), 10) === c ? 'true' : 'false');
    });
    if (restart && S.mode === 'bot') newGame(); // who opens changes, so start fresh
  }

  var mascotPreloaded = false;
  function preloadMascot() {
    if (mascotPreloaded) return;
    mascotPreloaded = true;
    ['white', 'black'].forEach(function (c) {
      for (var i = 1; i <= 18; i++) { var im = new Image(); im.src = 'assets/mascot/stone-' + c + '-' + i + '.png'; }
    });
  }
  function setStoneStyle(s) {
    S.stoneStyle = s;
    localStorage.setItem('baduk.stoneStyle', s);
    if (svg) svg.classList.toggle('mascot-stones', s === 'mascot'); // disables the heavy group drop-shadow for <image> stones
    if (s === 'mascot') preloadMascot();                            // warm the HTTP/decode cache so faces don't pop in
    document.querySelectorAll('[data-stone]').forEach(function (b) {
      b.setAttribute('aria-pressed', b.getAttribute('data-stone') === s ? 'true' : 'false');
    });
    if (S.game) render();
  }

  function newGame() {
    S.game = E.createGame(S.size, 6.5);
    S.snapshots = [];
    S.cursor = { x: Math.floor(S.size / 2), y: Math.floor(S.size / 2) };
    S.scoring = false; S.scoringOver = false; S.dead = null; S.busy = false; S.botToken++; // invalidate in-flight bot reply
    $('scoreBox').hidden = true; $('scoreControls').hidden = true;
    $('diffNote').hidden = !(S.size >= 19);
    setMascot('idle', S.mode === 'bot' ? t('mascotPlay') : t('mascotHi'));
    buildBoard();
    render();
    setStatus('');
    // if the human chose White, the bot (Black) opens — Black always moves first
    if (S.mode === 'bot' && S.game.toMove === botColor()) botTurn();
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
    $('stoneLabel').textContent = t('stoneStyle');
    $('stoneNormal').textContent = t('stoneNormal');
    $('stoneMascot').textContent = t('stoneMascot');
    $('colorLabel').textContent = t('playAs');
    $('colorBlack').textContent = t('black');
    $('colorWhite').textContent = t('white');
    $('diffLabel').textContent = t('difficulty');
    $('diffEasy').textContent = t('diffEasy');
    $('diffMed').textContent = t('diffMedium');
    $('diffHard').textContent = t('diffHard');
    $('diffNeural').textContent = t('diffNeural');
    $('diffNote').textContent = t('diffNote19');
    $('hintBtn').textContent = t('hint');
    $('gotItBtn').textContent = t('gotIt');
    $('prevLesson').textContent = '‹ ' + t('prev');
    $('nextLesson').textContent = t('next') + ' ›';
    $('langBtn').textContent = t('langName');
    $('themeBtn').setAttribute('aria-label', t('theme'));
    if ($('changelog').open) openChangelog(); // refresh the version list in the new language
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
    var ver = $('version'); if (ver) ver.textContent = 'v' + VERSION;
    applyLang();
    attach();
    setDifficulty(S.difficulty); // sync the difficulty control with the stored value
    setHumanColor(S.humanColor, false); // sync the colour control with the stored value
    setStoneStyle(S.stoneStyle); // sync the stone-style control with the stored value
    setMode('learn'); // start in teaching mode, as requested
    setMascot('idle', t('mascotHi'));
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
