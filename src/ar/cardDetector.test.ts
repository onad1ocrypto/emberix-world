import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { parseMindTarget } from '../game/rules';
import {
  CARD_DETECT_THRESHOLD,
  buildCardDetectorTarget,
  detectCardFrame,
} from './cardDetector';

const mindPath = path.join(process.cwd(), 'public/assets/ar/ember-card.mind');

function loadTarget() {
  const buf = fs.readFileSync(mindPath);
  const parsed = parseMindTarget(
    buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer,
  );
  assert.ok(parsed.valid, 'shipped .mind target must parse');
  assert.ok(parsed.header, 'shipped .mind target must expose a header');
  return buildCardDetectorTarget(
    parsed.header!.grid16,
    parsed.header!.colorSignature as { meanR: number; meanG: number; meanB: number },
  );
}

/** Paints a frame that imitates the card: target luminance inside a window. */
function frameWithCard(
  grid16: number[],
  options: { winStart?: number; winSize?: number; gain?: number; offset?: number } = {},
): Uint8ClampedArray {
  const size = 64;
  const { winStart = 10, winSize = 36, gain = 1, offset = 0 } = options;
  const px = new Uint8ClampedArray(size * size * 4).fill(60);
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const i = (y * size + x) * 4;
      px[i + 3] = 255;
      const inside =
        x >= winStart && x < winStart + winSize && y >= winStart && y < winStart + winSize;
      if (!inside) continue;
      const gx = Math.min(15, Math.floor(((x - winStart) / winSize) * 16));
      const gy = Math.min(15, Math.floor(((y - winStart) / winSize) * 16));
      const lum = Math.max(0, Math.min(255, grid16[gy * 16 + gx] * gain + offset));
      // Warm tint, close to the card's colour signature.
      px[i] = Math.min(255, lum * 1.18);
      px[i + 1] = lum * 0.94;
      px[i + 2] = lum * 0.82;
    }
  }
  return px;
}

test('detects the card pattern placed in a frame', () => {
  const buf = fs.readFileSync(mindPath);
  const parsed = parseMindTarget(
    buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer,
  );
  const grid16 = parsed.header!.grid16;
  const target = loadTarget();
  const result = detectCardFrame(frameWithCard(grid16), target);
  assert.equal(result.detected, true, `expected detection, got ${result.confidence}`);
  assert.ok(result.confidence >= CARD_DETECT_THRESHOLD);
});

test('detection survives a dim, low-contrast frame', () => {
  const buf = fs.readFileSync(mindPath);
  const parsed = parseMindTarget(
    buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer,
  );
  const grid16 = parsed.header!.grid16;
  const target = loadTarget();
  // Same structure at 45% brightness — the old detector failed here.
  const dim = detectCardFrame(frameWithCard(grid16, { gain: 0.45, offset: 12 }), target);
  assert.equal(dim.detected, true, `dim frame should still match (${dim.confidence})`);
});

test('rejects an empty frame and a flat wall', () => {
  const target = loadTarget();
  const blank = new Uint8ClampedArray(64 * 64 * 4);
  assert.equal(detectCardFrame(blank, target).detected, false);

  const wall = new Uint8ClampedArray(64 * 64 * 4);
  for (let i = 0; i < wall.length; i += 4) {
    wall[i] = 225;
    wall[i + 1] = 224;
    wall[i + 2] = 220;
    wall[i + 3] = 255;
  }
  const wallResult = detectCardFrame(wall, target);
  assert.equal(wallResult.detected, false);
  assert.ok(wallResult.confidence < 0.2);
});

test('rejects random noise', () => {
  const target = loadTarget();
  const noise = new Uint8ClampedArray(64 * 64 * 4);
  let seed = 12345;
  for (let i = 0; i < noise.length; i += 4) {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    noise[i] = seed % 256;
    noise[i + 1] = (seed >> 3) % 256;
    noise[i + 2] = (seed >> 7) % 256;
    noise[i + 3] = 255;
  }
  assert.equal(detectCardFrame(noise, target).detected, false);
});

test('warmth is a tie-breaker, not a gate', () => {
  const buf = fs.readFileSync(mindPath);
  const parsed = parseMindTarget(
    buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer,
  );
  const grid16 = parsed.header!.grid16;
  const target = loadTarget();
  const neutral = frameWithCard(grid16);
  // Strip the warm tint: a cool white room light must not break detection.
  for (let i = 0; i < neutral.length; i += 4) {
    const lum = 0.299 * neutral[i] + 0.587 * neutral[i + 1] + 0.114 * neutral[i + 2];
    neutral[i] = lum;
    neutral[i + 1] = lum;
    neutral[i + 2] = lum;
  }
  assert.equal(detectCardFrame(neutral, target).detected, true);
});
