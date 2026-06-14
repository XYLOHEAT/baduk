# 围棋 · Go · หมากล้อม — learn & play

A small, dependency-free web app to **learn and play Go** (Baduk / Weiqi / หมากล้อม) in the browser.

- **Learn mode** — 7 interactive lessons: placing stones, liberties, capture, no-suicide, ko, two-eyes life, territory & scoring.
- **Two players** — hot-seat on one device.
- **Vs bot** — a lightweight greedy opponent for beginners.
- Board sizes **9 / 13 / 19**, full rules: capture, suicide ban, simple ko, area (Chinese) scoring + komi.
- Bilingual **ไทย / English**, light + dark themes, keyboard play (arrow keys + Enter), reduced-motion aware.

## Stack

Vanilla HTML + CSS + JavaScript. **Zero dependencies, no build step.** Open `index.html` or serve the folder.

| File | Role |
|------|------|
| `engine.js` | Pure rules engine (no DOM). Run `node engine.js` for the self-check. |
| `lessons.js` | Teaching-mode content (data + tiny predicates). |
| `ui.js` | Board rendering (SVG), interaction, modes, bot. |
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

- **GitHub Pages:** push to `main`; the workflow in `.github/workflows/deploy.yml` publishes the site (or enable Pages → Deploy from branch, root).
- **Cloudflare Pages:** create a project, no build command, output directory `/`.

## Security

No backend, no network calls, no third-party scripts. A strict `Content-Security-Policy` (`default-src 'none'`, scripts/styles `'self'` only) is set in `index.html`. CI uses a least-privilege token and SHA-pinned official actions.

## License

MIT.
