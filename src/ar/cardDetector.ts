/**
 * Card detector for AR mode.
 *
 * The printed EMBER card is matched against the compiled `.mind` target with a
 * luminance-structure comparison (normalised cross-correlation over a small
 * grid) plus a chroma check. Every window is normalised against its own mean
 * and standard deviation, so the match survives dim rooms, cool LED lighting
 * and uneven exposure — the three things that used to kill detection.
 *
 * Deliberately not a feature-based pose estimator: there is no homography and
 * no 6-DoF tracking. The card is located as a window in the frame, and the pet
 * is anchored to that window. Honest naming matters more than the acronym.
 */

export interface CardDetectorTarget {
  /** Normalised luminance grids keyed by grid size (8, 12, 16). */
  grids: Record<number, number[]>;
  chroma: { r: number; g: number; b: number };
}

export interface CardDetection {
  detected: boolean;
  normX: number;
  normY: number;
  scale: number;
  confidence: number;
}

/** Minimum combined score. Calibrated: card shots score 0.72–0.85, empty
 *  rooms, desks, walls and noise stay below 0.30. */
export const CARD_DETECT_THRESHOLD = 0.66;

const FRAME_SIZE = 64;
const WINDOW_SIZES = [14, 20, 28, 36, 46];
const SEARCH_STEP = 3;

function normalise(values: number[]): number[] {
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance =
    values.reduce((a, b) => a + (b - mean) * (b - mean), 0) / values.length;
  const std = Math.sqrt(variance);
  if (std < 1e-6) return values.map(() => 0);
  return values.map((v) => (v - mean) / std);
}

/** 8×8 grid by averaging 2×2 blocks of the 16×16 target grid. */
function downscaleGrid(grid16: number[], size: number): number[] {
  const out: number[] = [];
  const ratio = 16 / size;
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const sy = Math.floor((y + 0.5) * ratio - 0.5);
      const sx = Math.floor((x + 0.5) * ratio - 0.5);
      const y0 = Math.max(0, Math.min(15, sy));
      const x0 = Math.max(0, Math.min(15, sx));
      const y1 = Math.min(15, y0 + 1);
      const x1 = Math.min(15, x0 + 1);
      const fy = Math.max(0, Math.min(1, (y + 0.5) * ratio - 0.5 - y0));
      const fx = Math.max(0, Math.min(1, (x + 0.5) * ratio - 0.5 - x0));
      const v =
        grid16[y0 * 16 + x0] * (1 - fx) * (1 - fy) +
        grid16[y0 * 16 + x1] * fx * (1 - fy) +
        grid16[y1 * 16 + x0] * (1 - fx) * fy +
        grid16[y1 * 16 + x1] * fx * fy;
      out.push(v);
    }
  }
  return out;
}

/** Builds the matching target once from the `.mind` header. */
export function buildCardDetectorTarget(
  grid16: number[],
  colorSignature: { meanR: number; meanG: number; meanB: number },
): CardDetectorTarget {
  const total = colorSignature.meanR + colorSignature.meanG + colorSignature.meanB;
  const safeTotal = total > 0 ? total : 1;
  return {
    grids: {
      8: normalise(downscaleGrid(grid16, 8)),
      12: normalise(downscaleGrid(grid16, 12)),
      16: normalise(grid16),
    },
    chroma: {
      r: colorSignature.meanR / safeTotal,
      g: colorSignature.meanG / safeTotal,
      b: colorSignature.meanB / safeTotal,
    },
  };
}

function gridSizeForWindow(winSize: number): 8 | 12 | 16 {
  if (winSize < 22) return 8;
  if (winSize < 32) return 12;
  return 16;
}

const NO_MATCH: CardDetection = {
  detected: false,
  normX: 0,
  normY: 0,
  scale: 1,
  confidence: 0,
};

/**
 * Finds the card in a square RGBA frame (default 64×64).
 * `pixels` is straight RGBA from `getImageData`.
 */
export function detectCardFrame(
  pixels: Uint8ClampedArray,
  target: CardDetectorTarget,
  size: number = FRAME_SIZE,
): CardDetection {
  if (!target || pixels.length < size * size * 4) return NO_MATCH;

  let bestScore = 0;
  let bestCx = size / 2;
  let bestCy = size / 2;
  let bestWin = 36;

  const samples: number[] = [];

  for (const winSize of WINDOW_SIZES) {
    if (winSize > size) continue;
    const n = gridSizeForWindow(winSize);
    const targetGrid = target.grids[n];
    if (!targetGrid) continue;
    const maxStart = size - winSize;

    for (let wy = 0; wy <= maxStart; wy += SEARCH_STEP) {
      for (let wx = 0; wx <= maxStart; wx += SEARCH_STEP) {
        samples.length = 0;
        let sumR = 0;
        let sumG = 0;
        let sumB = 0;

        for (let gy = 0; gy < n; gy += 1) {
          const py = Math.min(size - 1, wy + Math.floor((gy / n) * winSize));
          for (let gx = 0; gx < n; gx += 1) {
            const pxx = Math.min(size - 1, wx + Math.floor((gx / n) * winSize));
            const idx = (py * size + pxx) * 4;
            const r = pixels[idx];
            const g = pixels[idx + 1];
            const b = pixels[idx + 2];
            samples.push(0.299 * r + 0.587 * g + 0.114 * b);
            sumR += r;
            sumG += g;
            sumB += b;
          }
        }

        // Flat windows carry no structure to compare.
        let mean = 0;
        for (const v of samples) mean += v;
        mean /= samples.length;
        let variance = 0;
        for (const v of samples) variance += (v - mean) * (v - mean);
        variance /= samples.length;
        const std = Math.sqrt(variance);
        if (std < 3) continue;

        let correlation = 0;
        for (let i = 0; i < samples.length; i += 1) {
          correlation += ((samples[i] - mean) / std) * targetGrid[i];
        }
        correlation /= samples.length;

        const gridScore = Math.max(0, Math.min(1, (correlation + 0.05) / 0.8));

        const total = sumR + sumG + sumB;
        if (total <= 1) continue;
        const chromaDistance =
          (Math.abs(sumR / total - target.chroma.r) +
            Math.abs(sumG / total - target.chroma.g) +
            Math.abs(sumB / total - target.chroma.b)) /
          3;
        const chromaScore = Math.max(0, Math.min(1, 1 - chromaDistance / 0.1));

        // Warmth is a gentle tie-breaker, never a hard gate: a plain white
        // room light must not make the card undetectable.
        const warmth =
          sumR / samples.length > (sumB / samples.length) * 1.22 ? 1 : 0;

        const combined =
          (gridScore * 0.74 + chromaScore * 0.26) * (0.92 + 0.08 * warmth);

        if (combined > bestScore) {
          bestScore = combined;
          bestCx = wx + winSize / 2;
          bestCy = wy + winSize / 2;
          bestWin = winSize;
        }
      }
    }
  }

  if (bestScore < CARD_DETECT_THRESHOLD) {
    return { ...NO_MATCH, confidence: Number(bestScore.toFixed(2)) };
  }

  return {
    detected: true,
    normX: (bestCx / size) * 2 - 1,
    normY: -((bestCy / size) * 2 - 1),
    scale: bestWin / 36,
    confidence: Number(bestScore.toFixed(2)),
  };
}
