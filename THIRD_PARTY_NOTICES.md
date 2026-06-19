# Third-party notices

The optional **Neural** bot tier bundles third-party code and a neural network.
These components are only loaded when a user selects the Neural difficulty.

## neural-worker.js
A bundle (built with esbuild) of the in-browser KataGo engine from
**Web KaTrain** by Sir-Teo, plus its dependencies. Source:
https://github.com/Sir-Teo/web-katrain

Licensed under the MIT License:

```
MIT License

Copyright (c) 2026 Web KatRain Contributors

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

### TensorFlow.js (bundled inside neural-worker.js, and tfjs/*.wasm)
TensorFlow.js by Google, licensed under the **Apache License 2.0**.
https://github.com/tensorflow/tfjs — see the Apache-2.0 license and NOTICE at
that repository. Also bundled: `pako` (MIT) and `jszip` (MIT or GPLv3, used here under MIT).

## KataGo networks
From the **KataGo** project by David Wu (lightvector) — networks are released for free use.
https://github.com/lightvector/KataGo · https://katagotraining.org/
- **Active (Neural tier):** `kata1-b18c384nbt-s9996604416-d4316597426` (~93MB, dan strength).
  Too large for a Pages static file (25 MiB limit), so it is stored in Cloudflare R2
  and streamed same-origin via `functions/models/[[path]].js`. Not committed to git.
  (No static `models/` directory is shipped, so the Function owns the `/models/*` route.)

## 碁石さん (Goishi-san) mascot artwork
The teaching mascot images in `assets/mascot/` (idle/happy/think/oops) are the
**「碁石さん」** character by **とろろ (tororo, @tororo2048)**.
Source: https://tororoigo.web.fc2.com/ · original art page:
https://www.asahi-net.or.jp/~hk6t-itu/igo/goisisan.html

Used with the creator's explicit permission (email, 2026-06-17) for this
non-commercial, educational Go-learning web app. Credited in the footer with a
link back to the creator's site. Not redistributed as standalone artwork.

## How neural-worker.js was built (reproducible)
Pinned to web-katrain commit `ac761de06a5b10e5950721f37de9d7bc0f46a47a`.
```
git clone https://github.com/Sir-Teo/web-katrain
cd web-katrain && git checkout ac761de06a5b10e5950721f37de9d7bc0f46a47a && npm install
npx esbuild src/engine/katago/worker.ts --bundle --format=esm --platform=browser \
  --target=es2020 '--define:import.meta.env={"BASE_URL":"/","DEV":false,"PROD":true,"MODE":"production"}' \
  --outfile=neural-worker.js
# tfjs/*.wasm copied from node_modules/@tensorflow/tfjs-backend-wasm/dist/
# model copied from public/models/katago-small.bin.gz
```
