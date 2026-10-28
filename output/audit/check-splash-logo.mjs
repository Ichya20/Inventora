import assert from 'node:assert/strict';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { DotLottie } from '@lottiefiles/dotlottie-web';
import { inventoraLogoAnimation, inventoraLogoPlayback } from '../../src/lib/inventoraLogo.ts';

// Native WASM rendering only. No browser or network requests.
const wasmUrl = pathToFileURL(resolve('node_modules/@lottiefiles/dotlottie-web/dist/dotlottie-player.wasm')).href;
const nativeFetch = globalThis.fetch;
globalThis.fetch = (input, init) => String(input) === wasmUrl
  ? Promise.resolve(new Response(readFileSync(new URL(wasmUrl)), { headers: { 'content-type': 'application/wasm' } }))
  : nativeFetch(input, init);
DotLottie.setWasmUrl(wasmUrl);
const player = new DotLottie({
  canvas: { width: 240, height: 240 }, data: inventoraLogoAnimation, autoplay: false, loop: false, speed: inventoraLogoPlayback.speed,
  renderConfig: { autoResize: false, devicePixelRatio: 1 },
});

try {
  await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Local WASM load timed out')), 15000);
    player.addEventListener('load', () => { clearTimeout(timeout); resolve(); });
    player.addEventListener('loadError', event => { clearTimeout(timeout); reject(event.error); });
  });
  assert.equal(player.totalFrames, 72);
  assert.equal(player.duration, 1.2);
  assert.equal(player.speed, 0.5);
  assert.equal(player.duration / player.speed, 2.4);
  const first = Buffer.from(player.buffer);
  const samples = [0, 12, 24, 48, 71];
  const out = 'output/motion/splash-logo';
  mkdirSync(out, { recursive: true });
  let hasMotion = false;
  for (let frame = 0; frame < player.totalFrames; frame++) {
    player.setFrame(frame);
    const pixels = player.buffer;
    assert.equal(pixels.length, 240 * 240 * 4);
    hasMotion ||= !first.equals(Buffer.from(pixels));
    for (let position = 0; position < 240; position++) {
      for (const [x, y] of [[position, 0], [position, 239], [0, position], [239, position]]) {
        assert.equal(pixels[(y * 240 + x) * 4 + 3], 0, `Clipped logo at frame ${frame}`);
      }
    }
    if (samples.includes(frame)) writeFileSync(`${out}/${frame}.rgba`, pixels);
  }
  assert.ok(hasMotion);
  assert.deepEqual(Buffer.from(player.buffer), first);
  for (const [x, y, alpha] of [[60, 60, 255], [180, 60, 38], [60, 180, 38], [180, 180, 255]]) {
    assert.equal(player.buffer[(y * 240 + x) * 4 + 3], alpha);
  }
  console.log(JSON.stringify({
    localWasm: 'pass', renderedFrames: 72, playbackSeconds: player.duration / player.speed, noClippedTiles: 'pass',
    originalDiagonalOpacity: 'pass', identicalFirstAndLastFrame: 'pass', movement: 'pass',
    scope: 'native dotLottie renderer; not browser layout or playback QA',
  }));
} finally {
  player.destroy();
  globalThis.fetch = nativeFetch;
}
