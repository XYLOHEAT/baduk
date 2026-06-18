# 围棋 · Go · หมากล้อม — learn & play

A small, dependency-free web app to **learn and play Go** (Baduk / Weiqi / หมากล้อม) in the browser.

- **Learn mode** — 7 interactive lessons: placing stones, liberties, capture, no-suicide, ko, two-eyes life, territory & scoring.
- **Two players** — hot-seat on one device.
- **Vs bot** — pick your colour (Black/White) and a difficulty:
  - **Easy** greedy · **Medium/Hard** Monte-Carlo (Web Worker) · **Neural** KataGo (TensorFlow.js, WebGPU/WASM)
- **Manual dead-stone scoring** at game end (two passes), area (Chinese) scoring + komi.
- Board sizes **9 / 13 / 19**, full rules: capture, suicide ban, simple ko.
- Bilingual **ไทย / English**, light + dark themes, keyboard play (arrow keys + Enter), reduced-motion aware.

## Stack

The core game is vanilla HTML + CSS + JS, **no build step**. The only third-party
code is the **optional Neural tier**, which lazy-loads `neural-worker.js` + a KataGo
model only when selected (see `THIRD_PARTY_NOTICES.md`).

| File | Role |
|------|------|
| `engine.js` | Pure rules engine (no DOM). Run `node engine.js` for the self-check. |
| `lessons.js` | Teaching-mode content (data + tiny predicates). |
| `ui.js` | Board rendering (SVG), interaction, modes, bots. |
| `worker.js` | Monte-Carlo bot (Medium/Hard), runs off the main thread. |
| `neural-worker.js` · `models/` · `tfjs/` | Optional KataGo neural bot (bundled from MIT [web-katrain](https://github.com/Sir-Teo/web-katrain); TF.js; KataGo net). Loaded only for the Neural tier. |
| `index.html` / `styles.css` | Page + theme. |

## Run locally

```bash
python3 -m http.server 4173    # then open http://localhost:4173
```

## Test the rules engine

```bash
node engine.js
# engine.js self-check PASS: capture, suicide, capturing-suicide, ko, scoring
```

## Deploy

- **Cloudflare Pages (recommended for the Neural tier):** no build command, output directory `/`. The `_headers` file sets COOP/COEP so cross-origin isolation enables multithreaded WASM (faster neural fallback when WebGPU is absent).
- **GitHub Pages:** the workflow in `.github/workflows/deploy.yml` publishes on push to `main`. Neural still works via WebGPU; WASM fallback runs single-threaded (GitHub Pages can't set COOP/COEP headers).

## Security

No backend, no network calls, no external hosts. The document has a strict `Content-Security-Policy` (`default-src 'none'`, `script-src 'self' 'wasm-unsafe-eval'`, `connect-src 'self'`). Because Web Workers are **not** governed by the document's `<meta>` CSP, the neural worker is constrained separately by a `Content-Security-Policy: connect-src 'self'` **HTTP header** (`_headers`) on `neural-worker.js`, so the vendored engine can fetch only same-origin assets and cannot phone home. The neural engine runs in a sandboxed Web Worker. CI uses a least-privilege token and SHA-pinned official actions. Third-party neural components are vendored and pinned (`THIRD_PARTY_NOTICES.md`).

## License

MIT (this app). Bundled neural components retain their own licenses — see `THIRD_PARTY_NOTICES.md`.
