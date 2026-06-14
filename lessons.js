/*
 * lessons.js — teaching-mode content. Plain data + tiny check() predicates.
 * Bilingual TH/EN. No DOM here; ui.js drives it.
 * Stones: [x, y, 'B'|'W']. Markers hint the board: [x, y, kind].
 */
(function (root) {
  'use strict';
  var B = 1, W = 2;

  var LESSONS = [
    {
      id: 'place',
      title: { th: 'วางหมาก', en: 'Placing stones' },
      body: {
        th: 'โกะเล่นบน “จุดตัด” ของเส้น ไม่ใช่ในช่อง ดำเดินก่อนเสมอ คลิกจุดตัดเพื่อวางหมากสามเม็ด',
        en: 'Go is played on the line intersections, not the squares. Black moves first. Click three intersections to place three stones.'
      },
      goal: { th: 'วางหมากดำ 3 เม็ด', en: 'Place 3 black stones' },
      size: 9, toMove: B, stones: [], markers: [],
      check: function (g) { return countStones(g, B) >= 3; },
      success: { th: 'เยี่ยม! นั่นคือการเดินหมากพื้นฐาน', en: 'Nice. That is the basic move.' }
    },
    {
      id: 'liberty',
      title: { th: 'ลมหายใจ (Liberties)', en: 'Liberties (breath)' },
      body: {
        th: 'จุดว่างที่ติดกับหมากคือ “ลมหายใจ” หมากขาวตรงกลางมีลมหายใจ 4 ทาง วางหมากดำลดให้เหลือลมหายใจเดียว (เรียกว่า “อาตาริ”)',
        en: 'Each empty point touching a stone is a "liberty". The white stone has 4 liberties. Reduce it to a single liberty — this is called "atari".'
      },
      goal: { th: 'ทำให้ขาวเหลือลมหายใจเดียว (อาตาริ)', en: 'Put white in atari (1 liberty)' },
      size: 9, toMove: B,
      stones: [[4, 4, 'W']],
      markers: [[4, 3, 'target'], [3, 4, 'target'], [5, 4, 'target']],
      check: function (g) {
        var i = idx(g, 4, 4);
        return g.board[i] === W && GoEngine.libertyCount(g, i) === 1;
      },
      success: { th: 'นั่นคือ “อาตาริ” — อีกเม็ดเดียวก็จับกินได้', en: 'That is "atari" — one more stone captures it.' }
    },
    {
      id: 'capture',
      title: { th: 'จับกิน', en: 'Capturing' },
      body: {
        th: 'เมื่อหมาก(หรือกลุ่มหมาก) เหลือลมหายใจเป็นศูนย์ จะถูกยกออกจากกระดาน ขาวเหลือลมหายใจเดียวแล้ว วางหมากดำปิดจุดสุดท้ายเพื่อจับกิน',
        en: 'When a stone or group has zero liberties it is captured and lifted off the board. White is in atari — play on its last liberty to capture it.'
      },
      goal: { th: 'จับกินหมากขาว', en: 'Capture the white stone' },
      size: 9, toMove: B,
      stones: [[4, 4, 'W'], [4, 3, 'B'], [3, 4, 'B'], [5, 4, 'B']],
      markers: [[4, 5, 'target']],
      check: function (g) { return g.captures[B] >= 1; },
      success: { th: 'จับกินสำเร็จ! หมากขาวถูกยกออก', en: 'Captured. The white stone is removed.' }
    },
    {
      id: 'noselfatari',
      title: { th: 'ห้ามฆ่าตัวตาย', en: 'No suicide' },
      body: {
        th: 'ห้ามวางหมากลงจุดที่ทำให้ตัวเองเหลือลมหายใจศูนย์ทันที (ยกเว้นการวางนั้นจับกินฝ่ายตรงข้ามพอดี) ลองวางดำตรงจุดที่ถูกขาวล้อม — ระบบจะไม่ยอม แล้วค่อยจับกินขาวที่อาตาริแทน',
        en: 'You may not play onto a point that would leave your own stone with zero liberties — unless that same move captures the opponent. Try the surrounded point (it will be refused), then capture the white group in atari instead.'
      },
      goal: { th: 'จับกินกลุ่มขาว (เลี่ยงจุดฆ่าตัวตาย)', en: 'Capture the white group (avoid the suicide point)' },
      size: 9, toMove: B,
      // white group of two in atari; (1,1) corner is a self-atari trap if played wrong
      stones: [[0, 0, 'W'], [0, 1, 'W'], [1, 0, 'B'], [1, 1, 'B'], [0, 2, 'B']],
      markers: [[0, 0, 'target']],
      check: function (g) { return g.captures[B] >= 2; },
      success: { th: 'ดี! กลุ่มขาวสองเม็ดถูกจับกิน', en: 'Good. Both white stones captured.' }
    },
    {
      id: 'ko',
      title: { th: 'กฎโก (Ko)', en: 'The ko rule' },
      body: {
        th: 'กฎโกห้ามจับคืนทันทีเพื่อย้อนกระดานให้เหมือนเดิม (เกมจะวนไม่จบ) จับกินหมากขาวที่จุดเป้าหมาย — สังเกตเครื่องหมายโก ห้ามจับคืนตาถัดไป',
        en: 'The ko rule forbids immediately recapturing to recreate the previous board (it would loop forever). Capture the white stone at the marked point — note the ko marker that appears; the recapture is blocked next move.'
      },
      goal: { th: 'จับกินหมากขาวเพื่อเริ่มโก', en: 'Capture the white stone to start a ko' },
      size: 9, toMove: B,
      stones: [
        [4, 3, 'W'], [3, 4, 'W'], [4, 5, 'W'], // walls around the capturer's stone
        [5, 4, 'W'],                            // the victim (will be captured)
        [5, 3, 'B'], [6, 4, 'B'], [5, 5, 'B']   // walls around the victim
      ],
      markers: [[4, 4, 'target']],
      check: function (g) { return g.captures[B] >= 1 && g.ko >= 0; },
      success: { th: 'เริ่มโกแล้ว! เครื่องหมายโกคือจุดที่ขาวห้ามจับคืนทันที', en: 'Ko started. The ko marker is the point white may not retake immediately.' }
    },
    {
      id: 'eyes',
      title: { th: 'สองตา = เป็น', en: 'Two eyes = life' },
      body: {
        th: 'กลุ่มที่มี “ตา” (ช่องว่างล้อมรอบ) สองตาขึ้นไป จะจับกินไม่ได้เลย เพราะคู่ต่อสู้วางปิดทั้งสองตาพร้อมกันไม่ได้ กลุ่มดำนี้มีสองตา ลองวางขาวในตา — จะเป็นการฆ่าตัวตายและถูกปฏิเสธ',
        en: 'A group with two separate "eyes" (enclosed empty points) can never be captured: the opponent cannot fill both at once. This black group has two eyes. Try playing white inside an eye — it is suicide and will be refused.'
      },
      goal: { th: 'ลองวางขาวในตาทั้งสอง (จะถูกปฏิเสธ) แล้วกด “เข้าใจแล้ว”', en: 'Try white in the eyes (refused), then press “Got it”.' },
      size: 9, toMove: W,
      stones: [
        [1, 1, 'B'], [2, 1, 'B'], [3, 1, 'B'], [4, 1, 'B'],
        [1, 2, 'B'], [4, 2, 'B'], [1, 3, 'B'], [2, 3, 'B'], [3, 3, 'B'], [4, 3, 'B'],
        // eyes at (2,2) and (3,2)
      ],
      markers: [[2, 2, 'eye'], [3, 2, 'eye']],
      manualDone: true, // completed by the "Got it" button
      check: function () { return false; },
      success: { th: 'ถูกต้อง สองตาคือหัวใจของการมีชีวิตในโกะ', en: 'Right. Two eyes is the heart of life in Go.' }
    },
    {
      id: 'territory',
      title: { th: 'อาณาเขตและการนับแต้ม', en: 'Territory & scoring' },
      body: {
        th: 'เป้าหมายของเกมคือล้อม “อาณาเขต” (จุดว่างที่มีแค่สีเราติดอยู่) ให้มากกว่าคู่ต่อสู้ นับแบบจีน: แต้ม = หมากบนกระดาน + อาณาเขต + โคมิของขาว กดปุ่ม “นับแต้ม” เพื่อดูผล',
        en: 'The goal is to surround more "territory" (empty points bordered only by your colour) than your opponent. Chinese scoring: points = your stones on the board + your territory + white\'s komi. Press “Count score” to see the result.'
      },
      goal: { th: 'กด “นับแต้ม” เพื่อดูผลการนับ', en: 'Press “Count score” to evaluate' },
      size: 9, toMove: B,
      stones: buildTerritoryDemo(),
      markers: [],
      manualDone: true,
      check: function () { return false; },
      success: { th: 'นี่คือพื้นฐานการนับแต้ม ลองเล่นจริงกับบอทหรือเพื่อนได้แล้ว!', en: 'That is scoring in a nutshell. Now try a real game vs the bot or a friend!' }
    }
  ];

  // a simple split board: black owns the left, white owns the right
  function buildTerritoryDemo() {
    var out = [];
    for (var y = 0; y < 9; y++) { out.push([3, y, 'B']); out.push([5, y, 'W']); }
    return out;
  }

  function idx(g, x, y) { return GoEngine.idx(g, x, y); }
  function countStones(g, c) {
    var n = 0;
    for (var i = 0; i < g.board.length; i++) if (g.board[i] === c) n++;
    return n;
  }

  root.GoLessons = LESSONS;
  if (typeof module !== 'undefined' && module.exports) module.exports = LESSONS;
})(typeof window !== 'undefined' ? window : this);
