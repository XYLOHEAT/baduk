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

## models/katago-small.bin.gz
A small KataGo test network (`g170-b6c96-s175395328-d26788732`) from the
**KataGo** project by David Wu (lightvector).
https://github.com/lightvector/KataGo — networks are released for free use.

## How neural-worker.js was built (reproducible)
```
git clone --depth 1 https://github.com/Sir-Teo/web-katrain
cd web-katrain && npm install
npx esbuild src/engine/katago/worker.ts --bundle --format=esm --platform=browser \
  --target=es2020 '--define:import.meta.env={"BASE_URL":"/","DEV":false,"PROD":true,"MODE":"production"}' \
  --outfile=neural-worker.js
# tfjs/*.wasm copied from node_modules/@tensorflow/tfjs-backend-wasm/dist/
# model copied from public/models/katago-small.bin.gz
```
