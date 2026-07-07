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
      title: { th: 'วางหมาก', en: 'Placing stones', ja: '石を置く' },
      body: {
        th: 'โกะเล่นบน “จุดตัด” ของเส้น ไม่ใช่ในช่อง ดำเดินก่อนเสมอ คลิกจุดตัดเพื่อวางหมากสามเม็ด',
        en: 'Go is played on the line intersections, not the squares. Black moves first. Click three intersections to place three stones.',
        ja: '碁は線の交点に打ちます（マスの中ではありません）。黒が先手です。交点をクリックして黒石を3つ置いてみましょう。'
      },
      goal: { th: 'วางหมากดำ 3 เม็ด', en: 'Place 3 black stones', ja: '黒石を3つ置く' },
      size: 9, toMove: B, stones: [], markers: [],
      check: function (g) { return countStones(g, B) >= 3; },
      success: { th: 'เยี่ยม! นั่นคือการเดินหมากพื้นฐาน', en: 'Nice. That is the basic move.', ja: 'その調子！それが基本の一手です。' }
    },
    {
      id: 'liberty',
      title: { th: 'ลมหายใจ (Liberties)', en: 'Liberties (breath)', ja: '呼吸点（ダメ）' },
      body: {
        th: 'จุดว่างที่ติดกับหมากคือ “ลมหายใจ” หมากขาวตรงกลางมีลมหายใจ 4 ทาง วางหมากดำลดให้เหลือลมหายใจเดียว (เรียกว่า “อาตาริ”)',
        en: 'Each empty point touching a stone is a "liberty". The white stone has 4 liberties. Reduce it to a single liberty — this is called "atari".',
        ja: '石に接する空点は「呼吸点」です。中央の白石には4つあります。黒を打って白の呼吸点を1つにしましょう — これが「アタリ」です。'
      },
      goal: { th: 'ทำให้ขาวเหลือลมหายใจเดียว (อาตาริ)', en: 'Put white in atari (1 liberty)', ja: '白をアタリにする（呼吸点1つ）' },
      size: 9, toMove: B,
      stones: [[4, 4, 'W']],
      markers: [[4, 3, 'target'], [3, 4, 'target'], [5, 4, 'target']],
      check: function (g) {
        var i = idx(g, 4, 4);
        return g.board[i] === W && GoEngine.libertyCount(g, i) === 1;
      },
      success: { th: 'นั่นคือ “อาตาริ” — อีกเม็ดเดียวก็จับกินได้', en: 'That is "atari" — one more stone captures it.', ja: 'それが「アタリ」— あと一手で取れます。' }
    },
    {
      id: 'capture',
      title: { th: 'จับกิน', en: 'Capturing', ja: '石を取る' },
      body: {
        th: 'เมื่อหมาก(หรือกลุ่มหมาก) เหลือลมหายใจเป็นศูนย์ จะถูกยกออกจากกระดาน ขาวเหลือลมหายใจเดียวแล้ว วางหมากดำปิดจุดสุดท้ายเพื่อจับกิน',
        en: 'When a stone or group has zero liberties it is captured and lifted off the board. White is in atari — play on its last liberty to capture it.',
        ja: '石（グループ）の呼吸点がゼロになると盤から取り上げられます。白はアタリです。最後の呼吸点に打って取りましょう。'
      },
      goal: { th: 'จับกินหมากขาว', en: 'Capture the white stone', ja: '白石を取る' },
      size: 9, toMove: B,
      stones: [[4, 4, 'W'], [4, 3, 'B'], [3, 4, 'B'], [5, 4, 'B']],
      markers: [[4, 5, 'target']],
      check: function (g) { return g.captures[B] >= 1; },
      success: { th: 'จับกินสำเร็จ! หมากขาวถูกยกออก', en: 'Captured. The white stone is removed.', ja: '取れました！白石は盤から取り上げられます。' }
    },
    {
      id: 'connect',
      title: { th: 'เชื่อมและตัด', en: 'Connect & cut', ja: 'つながりと切断' },
      body: {
        th: 'หมากสีเดียวกันที่อยู่ติดกัน (แนวตั้ง/นอน) นับเป็น “กลุ่มเดียว” ใช้ลมหายใจร่วมกัน ถ้าปล่อยให้ถูก “ตัด” จะกลายเป็นกลุ่มเล็กๆ ที่ตายง่าย — เชื่อมหมากดำสองเม็ดให้เป็นกลุ่มเดียวที่จุดเป้าหมาย ก่อนขาวจะตัด',
        en: 'Same-coloured stones on adjacent points (up/down/left/right) form one group sharing liberties. If you get "cut", you become small weak groups — connect the two black stones at the marked point before white cuts.',
        ja: '縦横に隣り合う同色の石は、呼吸点を共有する1つのグループです。「切られる」と弱い小さなグループになってしまいます — 白に切られる前に、目印の点で黒をつなぎましょう。'
      },
      goal: { th: 'เชื่อมดำให้เป็นกลุ่มเดียว 3 เม็ด', en: 'Connect black into one 3-stone group', ja: '黒を3子の1グループにつなぐ' },
      size: 9, toMove: B,
      stones: [[3, 4, 'B'], [5, 4, 'B'], [4, 3, 'W'], [4, 5, 'W']],
      markers: [[4, 4, 'target']],
      check: function (g) {
        var i = idx(g, 4, 4);
        return g.board[i] === B && GoEngine.group(g, i).stones.length >= 3;
      },
      success: { th: 'เชื่อมแล้ว! สามเม็ดนี้เป็นกลุ่มเดียว แข็งแรงกว่าแยกกันมาก', en: 'Connected. These three stones are one group — far stronger than apart.', ja: 'つながりました！3子で1つのグループ — バラバラよりずっと強い。' }
    },
    {
      id: 'ladder',
      title: { th: 'บันได (Ladder)', en: 'The ladder', ja: 'シチョウ' },
      body: {
        th: 'เทคนิคจับกินคลาสสิก: ไล่อาตาริซ้ำๆ ให้กลุ่มที่หนีเหลือลมเดียวตลอดทาง เป็นขั้นบันไดจนชนขอบ — กลุ่มขาวนี้ถูกไล่มาจนสุดทางแล้ว ปิดลมสุดท้ายเพื่อจับกินทั้งแถบ',
        en: 'A classic capture: chase with repeated atari so the fleeing group always has one liberty, zigzagging toward the edge. This white group has been laddered to the end — fill the last liberty and take the whole chain.',
        ja: '代表的な取り方: アタリを続けて、逃げる石の呼吸点を常に1つにしたまま階段状に追い込みます。この白はもう逃げ場がありません — 最後の呼吸点を詰めて全部取りましょう。'
      },
      goal: { th: 'จับกินกลุ่มขาวทั้ง 4 เม็ด', en: 'Capture all 4 white stones', ja: '白4子をすべて取る' },
      size: 9, toMove: B,
      stones: [
        [3, 3, 'W'], [3, 4, 'W'], [4, 4, 'W'], [4, 5, 'W'],
        [2, 3, 'B'], [3, 2, 'B'], [2, 4, 'B'], [4, 3, 'B'], [3, 5, 'B'], [5, 4, 'B'], [5, 5, 'B']
      ],
      markers: [[4, 6, 'target']],
      check: function (g) { return g.captures[B] >= 4; },
      success: { th: 'จับกินยกแถบ! ก่อนหนีบันได ให้เช็คก่อนว่าปลายทางมีตัวช่วยไหม', en: 'The whole chain is captured! Before running a ladder, check whether a helper stone waits at the end.', ja: '一網打尽！シチョウで追う（逃げる）前に、先の方に味方の石がないか確認しましょう。' }
    },
    {
      id: 'noselfatari',
      title: { th: 'ห้ามฆ่าตัวตาย', en: 'No suicide', ja: '自殺手の禁止' },
      body: {
        th: 'ห้ามวางหมากลงจุดที่ทำให้ตัวเองเหลือลมหายใจศูนย์ทันที — ยกเว้นการวางนั้นจับกินฝ่ายตรงข้ามพอดี จุดเป้าหมายถูกขาวประกบอยู่ แต่วางแล้วจับกินคู่ขาวได้ทันที จึงถูกกฎ',
        en: 'You may not play onto a point that leaves your own stone with zero liberties — unless that same move captures the opponent. The marked point is pressed by white, but playing it captures the pair, so it is legal.',
        ja: '自分の石の呼吸点がゼロになる点には打てません — ただし、その一手で相手を取れる場合は打てます。目印の点は白に挟まれていますが、打てば白2子を取れるので合法です。'
      },
      goal: { th: 'จับกินกลุ่มขาวที่มุม', en: 'Capture the white corner group', ja: '隅の白2子を取る' },
      size: 9, toMove: B,
      // artist-reviewed shape (とろろ, l6_2): the marked point really has zero liberties —
      // white presses it from below/right too — so ONLY the capture makes it legal
      stones: [[0, 0, 'W'], [0, 1, 'W'], [1, 2, 'W'], [0, 3, 'W'], [1, 0, 'B'], [1, 1, 'B']],
      markers: [[0, 2, 'target']],
      check: function (g) { return g.captures[B] >= 2; },
      success: { th: 'ดี! กลุ่มขาวสองเม็ดถูกจับกิน — จุดล้อมที่จับกินได้ไม่ใช่การฆ่าตัวตาย', en: 'Good. Both white stones captured — a surrounded point that captures is not suicide.', ja: 'よし！相手を取れる点への着手は自殺手ではありません。' }
    },
    {
      id: 'ko',
      title: { th: 'กฎโก (Ko)', en: 'The ko rule', ja: 'コウ' },
      body: {
        th: 'กฎโกห้ามจับคืนทันทีเพื่อย้อนกระดานให้เหมือนเดิม (เกมจะวนไม่จบ) จับกินหมากขาวที่จุดเป้าหมาย — สังเกตเครื่องหมายโก ห้ามจับคืนตาถัดไป',
        en: 'The ko rule forbids immediately recapturing to recreate the previous board (it would loop forever). Capture the white stone at the marked point — note the ko marker that appears; the recapture is blocked next move.',
        ja: 'コウのルールは、直前の盤面に戻る即座の取り返しを禁じます（無限ループ防止）。目印の点で白を取ってみましょう — コウ印が現れ、白は次の一手では取り返せません。'
      },
      goal: { th: 'จับกินหมากขาวเพื่อเริ่มโก', en: 'Capture the white stone to start a ko', ja: '白石を取ってコウを作る' },
      size: 9, toMove: B,
      stones: [
        [4, 3, 'W'], [3, 4, 'W'], [4, 5, 'W'], // walls around the capturer's stone
        [5, 4, 'W'],                            // the victim (will be captured)
        [5, 3, 'B'], [6, 4, 'B'], [5, 5, 'B']   // walls around the victim
      ],
      markers: [[4, 4, 'target']],
      check: function (g) { return g.captures[B] >= 1 && g.ko >= 0; },
      success: { th: 'เริ่มโกแล้ว! เครื่องหมายโกคือจุดที่ขาวห้ามจับคืนทันที', en: 'Ko started. The ko marker is the point white may not retake immediately.', ja: 'コウの始まり！印の点は白がすぐには取り返せない点です。' }
    },
    {
      id: 'snapback',
      title: { th: 'สแนปแบ็ก (Snapback)', en: 'Snapback', ja: 'ウッテガエシ' },
      body: {
        th: 'ขาวเพิ่งจับกินหมากดำหนึ่งเม็ดที่จุดเป้าหมาย — แต่นั่นคือเหยื่อ! การจับกินทำให้กลุ่มขาวใหญ่เหลือลมเดียวคือจุดนั้นเอง วางดำคืนที่เดิม จะจับกินขาว 5 เม็ด ต่างจากกฎโกตรงที่การจับคืนนี้กินมากกว่า 1 เม็ด กระดานไม่ย้อนกลับเป็นแบบเดิม จึงไม่ผิดกฎ',
        en: 'White just captured one black stone on the marked point — but it was bait! That capture left the big white group with a single liberty: that very point. Play back there to take five stones. Unlike ko, this recapture takes more than one stone, so the board does not repeat and the rule allows it.',
        ja: '白は目印の点で黒1子を取ったばかり — でもそれは捨て石！その取りで白の大きなグループの呼吸点がその一点だけになりました。同じ点に打ち返すと白5子を取れます。コウと違って1子より多く取るので、盤面は繰り返されずルール違反になりません。'
      },
      goal: { th: 'จับกินกลุ่มขาว 5 เม็ดที่จุดเป้าหมาย', en: 'Capture the 5-stone white group at the mark', ja: '目印の点で白5子を取る' },
      size: 9, toMove: B,
      // exact board from the artist's l8 diagram (とろろ): the big white group's only
      // liberty is the point it just captured on; the two lone whites survive
      stones: [
        [3, 1, 'W'], [2, 2, 'W'], [4, 2, 'W'], [2, 3, 'W'], [3, 3, 'W'], [2, 4, 'W'], [3, 4, 'W'],
        [1, 1, 'B'], [2, 1, 'B'], [1, 2, 'B'], [1, 3, 'B'], [4, 3, 'B'], [1, 4, 'B'], [4, 4, 'B'], [2, 5, 'B'], [3, 5, 'B']
      ],
      markers: [[3, 2, 'target']],
      check: function (g) { return g.captures[B] >= 5; },
      success: { th: 'สแนปแบ็ก! เสีย 1 ได้ 5 — การสละหมากเล็กเพื่อกินใหญ่คือหัวใจของเทคนิคนี้', en: 'Snapback! One stone traded for five — a small sacrifice for a big capture.', ja: 'ウッテガエシ！1子の犠牲で5子ゲット — 小を捨てて大を取る手筋です。' }
    },
    {
      id: 'eyes',
      title: { th: 'สองตา = เป็น', en: 'Two eyes = life', ja: '二眼あれば生き' },
      body: {
        th: 'กลุ่มที่มี “ตา” (ช่องว่างล้อมรอบ) สองตาขึ้นไป จะจับกินไม่ได้เลย เพราะคู่ต่อสู้วางปิดทั้งสองตาพร้อมกันไม่ได้ กลุ่มดำนี้มีสองตา ลองวางขาวในตา — จะเป็นการฆ่าตัวตายและถูกปฏิเสธ',
        en: 'A group with two separate "eyes" (enclosed empty points) can never be captured: the opponent cannot fill both at once. This black group has two eyes. Try playing white inside an eye — it is suicide and will be refused.',
        ja: '「眼」（囲んだ空点）が2つ以上あるグループは絶対に取られません。相手は両方の眼を同時には埋められないからです。この黒には眼が2つ。眼の中に白を打ってみてください — 自殺手として拒否されます。'
      },
      goal: { th: 'ลองวางขาวในตาทั้งสอง (จะถูกปฏิเสธ) แล้วกด “เข้าใจแล้ว”', en: 'Try white in the eyes (refused), then press “Got it”.', ja: '両方の眼に白を打ってみて（拒否されます）、「わかった」を押す' },
      size: 9, toMove: W,
      // artist-reviewed shape (とろろ, l9_2): the old layout had two ADJACENT empty points —
      // one big eye space, actually a dead shape. Real life needs two SEPARATED eyes;
      // white fully surrounds the group to show it still cannot be captured.
      stones: [
        [2, 3, 'B'], [3, 3, 'B'], [4, 3, 'B'], [5, 3, 'B'], [6, 3, 'B'],
        [2, 4, 'B'], [4, 4, 'B'], [6, 4, 'B'],
        [2, 5, 'B'], [3, 5, 'B'], [4, 5, 'B'], [5, 5, 'B'], [6, 5, 'B'],
        [2, 2, 'W'], [3, 2, 'W'], [4, 2, 'W'], [5, 2, 'W'], [6, 2, 'W'],
        [1, 3, 'W'], [7, 3, 'W'], [1, 4, 'W'], [7, 4, 'W'], [1, 5, 'W'], [7, 5, 'W'],
        [2, 6, 'W'], [3, 6, 'W'], [4, 6, 'W'], [5, 6, 'W'], [6, 6, 'W']
      ],
      markers: [[3, 4, 'eye'], [5, 4, 'eye']],
      manualDone: true, // completed by the "Got it" button
      check: function () { return false; },
      success: { th: 'ถูกต้อง สองตาคือหัวใจของการมีชีวิตในโกะ', en: 'Right. Two eyes is the heart of life in Go.', ja: 'その通り。二眼こそ碁における生きの心臓部です。' }
    },
    {
      id: 'falseeye',
      title: { th: 'ตาปลอม', en: 'False eyes', ja: '欠け目' },
      body: {
        th: 'ไม่ใช่ทุกช่องว่างจะเป็น “ตาจริง” — ตาซ้าย (เส้นประ) มุมทแยงเป็นดำหมด จึงเป็นตาจริง แต่ตาขวา (จุดแดง) ขาวยึดมุมทแยงไว้ ทำให้หมากดำรอบตานั้นไม่ได้เชื่อมเป็นกลุ่มเดียว สุดท้ายจะโดนอาตาริจนต้องถมตาเอง — กลุ่มที่มีตาจริงเดียว + ตาปลอม = ตาย',
        en: 'Not every hole is a real eye. The left eye (dashed) has all-black diagonals — real. The right one (red) has white on its diagonals, so the black stones around it are not one group; eventually atari forces black to fill it. One real eye + a false eye = dead.',
        ja: 'どの空点も「本物の眼」とは限りません。左の眼（点線）は斜めが全部黒 — 本物です。右（赤印）は白が斜めを押さえていて、周りの黒が1つのグループにつながっていません。いずれアタリされて自分で埋めることに — 本物の眼1つ+欠け目=死にです。'
      },
      goal: { th: 'สังเกตความต่างของสองตา แล้วกด “เข้าใจแล้ว”', en: 'Compare the two eyes, then press "Got it".', ja: '2つの眼の違いを見比べて「わかった」を押す' },
      size: 9, toMove: W,
      // artist-reviewed shape (とろろ, l10): the left group's eye is real (black on every
      // side and diagonal); the right cluster only meets the rest THROUGH the false-eye
      // point, whose diagonals (3,1)/(3,3) are white.
      stones: [
        [0, 1, 'B'], [1, 1, 'B'], [2, 1, 'B'], [4, 1, 'B'], [5, 1, 'B'],
        [0, 2, 'B'], [2, 2, 'B'], [3, 2, 'B'], [5, 2, 'B'],
        [0, 3, 'B'], [1, 3, 'B'], [2, 3, 'B'], [4, 3, 'B'], [5, 3, 'B'],
        [3, 0, 'W'], [4, 0, 'W'], [5, 0, 'W'], [6, 0, 'W'],
        [3, 1, 'W'], [6, 1, 'W'], [3, 3, 'W'], [6, 3, 'W'],
        [3, 4, 'W'], [4, 4, 'W'], [5, 4, 'W'], [6, 4, 'W']
      ],
      markers: [[1, 2, 'eye'], [4, 2, 'target']],
      manualDone: true,
      check: function () { return false; },
      success: { th: 'ใช่เลย เวลานับตาให้มองมุมทแยงด้วย ไม่ใช่แค่ช่องว่าง', en: 'Exactly — judge eyes by their diagonals, not just the empty point.', ja: 'その通り — 眼は空点だけでなく斜めも見て判断しましょう。' }
    },
    {
      id: 'territory',
      title: { th: 'อาณาเขตและการนับแต้ม', en: 'Territory & scoring', ja: '地と数え方' },
      body: {
        th: 'เป้าหมายของเกมคือล้อม “อาณาเขต” (จุดว่างที่มีแค่สีเราติดอยู่) ให้มากกว่าคู่ต่อสู้ นับแบบจีน: แต้ม = หมากบนกระดาน + อาณาเขต + โคมิของขาว กดปุ่ม “นับแต้ม” เพื่อดูผล',
        en: 'The goal is to surround more "territory" (empty points bordered only by your colour) than your opponent. Chinese scoring: points = your stones on the board + your territory + white\'s komi. Press “Count score” to see the result.',
        ja: '目的は相手より広い「地」（自分の色だけに接する空点）を囲むこと。中国ルール: 得点 = 盤上の石 + 地 + 白のコミ。「数える」ボタンで結果を見てみましょう。'
      },
      goal: { th: 'กด “นับแต้ม” เพื่อดูผลการนับ', en: 'Press “Count score” to evaluate', ja: '「数える」を押して結果を見る' },
      size: 9, toMove: B,
      stones: buildTerritoryDemo(),
      markers: [],
      manualDone: true,
      check: function () { return false; },
      success: { th: 'นี่คือพื้นฐานการนับแต้ม ลองเล่นจริงกับบอทหรือเพื่อนได้แล้ว!', en: 'That is scoring in a nutshell. Now try a real game vs the bot or a friend!', ja: 'これが数え方の基本。ボットや友だちと実戦してみましょう！' }
    },
    {
      id: 'ending',
      title: { th: 'เกมจริงจบยังไง', en: 'How a real game ends', ja: '実戦の終わり方' },
      body: {
        th: 'เมื่อเดินต่อก็ไม่ได้แต้มเพิ่ม ให้กด “ผ่าน” — ถ้าทั้งสองฝ่ายผ่านติดกัน เกมจบและเข้าหน้านับแต้มอัตโนมัติ จากนั้นแตะกลุ่มที่ “ตาย” เพื่อนำออก แล้วอ่านผล ลองเลย: กดปุ่ม “ผ่าน” สองครั้งบนกระดานนี้ ดูหน้านับแต้ม แล้วกด “เล่นต่อ” เพื่อกลับมา',
        en: 'When no move gains points, press "Pass". Two passes in a row end the game and open scoring automatically; tap "dead" groups to remove them and read the result. Try it: press "Pass" twice on this board, look at the score, then "Resume" to come back.',
        ja: '打っても得にならなくなったら「パス」。両者が続けてパスすると終局し、自動で計算画面へ。死んだグループをタップして取り除き、結果を読みます。試してみて: この盤で「パス」を2回押し、計算画面を見て「対局に戻る」で戻ってきてください。'
      },
      goal: { th: 'ลองพาส 2 ครั้งเพื่อดูการจบเกม แล้วกด “เข้าใจแล้ว”', en: 'Pass twice to see the ending flow, then press "Got it".', ja: 'パスを2回して終局の流れを見て、「わかった」を押す' },
      size: 9, toMove: B,
      stones: buildTerritoryDemo(),
      markers: [],
      manualDone: true,
      check: function () { return false; },
      success: { th: 'ครบทุกบทแล้ว! พร้อมเล่นเกมจริง — ไปที่ “เล่นกับบอท” ระดับง่ายได้เลย', en: 'All lessons done! You are ready — head to "Vs bot" on Easy.', ja: '全レッスン完了！「ボットと対局」のやさしいから始めましょう。' }
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
