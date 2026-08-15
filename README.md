# 囲碁 · Go · หมากล้อม — learn & play

A small, dependency-free web app to **learn and play Go** (Baduk / Weiqi / หมากล้อม) in the browser.

**▶ Play: [go.soxylo.com](https://go.soxylo.com)** — the full version.
(`xyloheat.github.io/baduk` redirects there: GitHub Pages can't serve the neural tier — see [Deploy](#deploy).)

- **Learn mode** — 12 interactive lessons: placing stones · liberties · capture · connect & cut ·
  the ladder · no-suicide · ko · snapback · two eyes = life · false eyes · territory & scoring ·
  how a real game ends. Every board is verified against the engine (`tools/test-lessons.js`).
- **Two players** — hot-seat on one device.
- **Vs bot** — pick your colour (Black/White) and a difficulty:

  | Board | Easy | Medium | Hard | Neural |
  |---|---|---|---|---|
  | 9×9 | greedy, instant | flat Monte-Carlo | compact KataGo net, 128 visits | KataGo b18 dan net, 256 visits |
  | 13×13 | greedy, instant | flat Monte-Carlo | compact net, 128 visits | b18 dan, 256 visits |
  | 19×19 | greedy, instant | compact net, 32 visits | compact net, 96 visits | b18 dan, 256 visits |

  The neural tiers load lazily and are freed again when unused (tier switch, leaving bot mode,
  idle, or the tab going away). On machines without WebGPU or with little RAM, **Neural**
  transparently uses the compact net instead of the 93 MB b18 net, so it can't lock the machine up.
- **Manual dead-stone scoring** at game end (two passes), area (Chinese) scoring + komi.
- Board sizes **9 / 13 / 19**, full rules: capture, suicide ban, simple ko.
- **ไทย / English / 日本語**, light + dark themes, keyboard play (arrow keys + Enter), reduced-motion aware.
- Optional **碁石さん stone faces** that react to the position — a stone in atari looks scared,
  one that just captured looks smug, a doomed group gives up, and so on.

## 碁石さん

The mascot and stone artwork is the **「碁石さん」** character by **とろろ**
([tororoigo.web.fc2.com](https://tororoigo.web.fc2.com/)), used with the artist's permission for this
non-commercial, educational app. The expression mapping and several lesson positions were corrected
following the artist's own review. Not redistributed as standalone artwork — see `THIRD_PARTY_NOTICES.md`.

## Stack

The core game is vanilla HTML + CSS + JS, **no build step, no framework**. The only third-party code
is the optional neural bot, which lazy-loads `neural-worker.js` + a KataGo model only when selected.

| File | Role |
|------|------|
| `engine.js` | Pure rules engine (no DOM). Run `node engine.js` for the self-check. |
| `lessons.js` | Teaching-mode content (data + tiny predicates), TH/EN/JA. |
| `ui.js` | Board rendering (SVG), interaction, modes, bot routing + neural lifecycle. |
| `worker.js` | Flat Monte-Carlo bot (Medium on 9×9/13×13), off the main thread. |
| `neural-worker.js` · `tfjs/` | KataGo engine bundled from MIT [web-katrain](https://github.com/Sir-Teo/web-katrain) + TensorFlow.js. |
| `assets/models/` | Compact KataGo net (~3.8 MB, ships in the repo) for Hard / Medium-on-19×19. |
| `functions/models/[[path]].js` | Cloudflare Pages Function streaming the 93 MB b18 dan net from R2 (too big for a static file). |
| `assets/mascot/` | 碁石さん artwork (guide + 18 stone expressions × 2 colours). |
| `index.html` / `styles.css` | Page + theme. |
| `tools/` | `test-lessons.js` (lesson validator), `bump.sh` (version bump across all files). |

## Run locally

```bash
python3 -m http.server 4173    # then open http://localhost:4173
```

The compact-net tiers work locally; the **Neural** tier needs the b18 model, which is served from R2
in production (not in the repo).

## Tests

```bash
node engine.js              # rules: capture, suicide, ko, pass, scoring (incl. dead stones)
node tools/test-lessons.js  # every lesson: legal prefill, solvable, TH/EN/JA strings present
```

## Deploy

- **Cloudflare Pages** (what runs on go.soxylo.com): no build command, output directory `/`.
  `_headers` sets COOP/COEP so cross-origin isolation enables multithreaded WASM, plus
  `frame-ancestors 'none'` (that directive is ignored in a `<meta>` CSP, so it must be a real header).
  The `/models/*` Function streams the dan net from an R2 bucket bound as `MODELS`.
- **GitHub Pages** can't do either of those — no custom headers, no Functions — so the neural tier
  would 404 and cross-origin isolation would be off. The `gh-pages` branch therefore just redirects
  to the Cloudflare deployment.

## Requirements

See [`REQUIREMENTS.md`](REQUIREMENTS.md) for per-mode browser/RAM guidance. Short version: everything
except the neural tiers runs on anything; **Neural** wants WebGPU and 8 GB+ RAM.

## Security

No backend, no analytics, no external hosts. Strict `Content-Security-Policy`
(`default-src 'none'`, `script-src 'self' 'wasm-unsafe-eval'`, `connect-src 'self'`). Because Web
Workers are **not** governed by the document's `<meta>` CSP, the neural worker is constrained
separately by a `Content-Security-Policy: connect-src 'self'` **HTTP header** (`_headers`), so the
vendored engine can fetch only same-origin assets and cannot phone home. Third-party neural
components are vendored and pinned (`THIRD_PARTY_NOTICES.md`).

## License

MIT (this app). Bundled neural components retain their own licenses, and the 碁石さん artwork remains
the property of its creator — see `THIRD_PARTY_NOTICES.md`.
