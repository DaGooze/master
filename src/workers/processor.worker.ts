import { ProcessRequest, ProcessResponse } from '@/lib/types';

const srgbToLinear = (v: number): number => {
  const x = v / 255;
  return x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4;
};

const luminance = (r: number, g: number, b: number): number => {
  const rl = srgbToLinear(r);
  const gl = srgbToLinear(g);
  const bl = srgbToLinear(b);
  return 0.2126 * rl + 0.7152 * gl + 0.0722 * bl;
};

const applyContrastGamma = (value: number, contrast: number, gamma: number): number => {
  const c = (259 * (contrast + 255)) / (255 * (259 - contrast));
  const shifted = Math.max(0, Math.min(1, c * (value - 0.5) + 0.5));
  return Math.pow(shifted, 1 / gamma);
};

const blurAlpha = (alpha: Float32Array, width: number, height: number, radius: number): Float32Array => {
  if (radius <= 0) return alpha;
  const out = new Float32Array(alpha.length);
  const r = Math.max(1, Math.round(radius));

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let sum = 0;
      let count = 0;
      for (let oy = -r; oy <= r; oy++) {
        const yy = y + oy;
        if (yy < 0 || yy >= height) continue;
        for (let ox = -r; ox <= r; ox++) {
          const xx = x + ox;
          if (xx < 0 || xx >= width) continue;
          sum += alpha[yy * width + xx];
          count += 1;
        }
      }
      out[y * width + x] = sum / count;
    }
  }
  return out;
};

const morphAlpha = (alpha: Float32Array, width: number, height: number, radius: number): Float32Array => {
  if (radius === 0) return alpha;
  const out = new Float32Array(alpha.length);
  const r = Math.abs(radius);
  const dilate = radius > 0;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let best = dilate ? 0 : 1;
      for (let oy = -r; oy <= r; oy++) {
        const yy = y + oy;
        if (yy < 0 || yy >= height) continue;
        for (let ox = -r; ox <= r; ox++) {
          const xx = x + ox;
          if (xx < 0 || xx >= width) continue;
          const v = alpha[yy * width + xx];
          best = dilate ? Math.max(best, v) : Math.min(best, v);
        }
      }
      out[y * width + x] = best;
    }
  }
  return out;
};

const despeckle = (alpha: Float32Array, width: number, height: number, amount: number): Float32Array => {
  const threshold = amount / 100;
  const out = alpha.slice();
  if (threshold <= 0) return out;

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const i = y * width + x;
      if (alpha[i] < 0.15) continue;
      let neighbors = 0;
      for (let oy = -1; oy <= 1; oy++) {
        for (let ox = -1; ox <= 1; ox++) {
          if (ox === 0 && oy === 0) continue;
          if (alpha[(y + oy) * width + x + ox] > 0.2) neighbors += 1;
        }
      }
      if (neighbors / 8 < threshold) out[i] = 0;
    }
  }

  return out;
};

const process = ({ sourcePixels, width, height, backgroundRemoval, halftone, knockout, previewScale }: ProcessRequest): ProcessResponse => {
  const scaledW = Math.max(1, Math.floor(width * previewScale));
  const scaledH = Math.max(1, Math.floor(height * previewScale));
  const src = new Uint8ClampedArray(scaledW * scaledH * 4);

  for (let y = 0; y < scaledH; y++) {
    for (let x = 0; x < scaledW; x++) {
      const srcX = Math.floor((x / scaledW) * width);
      const srcY = Math.floor((y / scaledH) * height);
      const srcIdx = (srcY * width + srcX) * 4;
      const dstIdx = (y * scaledW + x) * 4;
      src[dstIdx] = sourcePixels[srcIdx];
      src[dstIdx + 1] = sourcePixels[srcIdx + 1];
      src[dstIdx + 2] = sourcePixels[srcIdx + 2];
      src[dstIdx + 3] = sourcePixels[srcIdx + 3];
    }
  }

  const luma = new Float32Array(scaledW * scaledH);
  const alpha = new Float32Array(scaledW * scaledH);

  for (let i = 0; i < luma.length; i++) {
    const p = i * 4;
    const a = src[p + 3] / 255;
    let aOut = a;
    if (backgroundRemoval.enabled) {
      const avg = (src[p] + src[p + 1] + src[p + 2]) / 3;
      if (avg > backgroundRemoval.threshold) {
        const soft = Math.max(1, backgroundRemoval.softness);
        aOut *= Math.max(0, 1 - (avg - backgroundRemoval.threshold) / soft);
      }
    }
    alpha[i] = aOut;
    luma[i] = applyContrastGamma(luminance(src[p], src[p + 1], src[p + 2]), halftone.contrast, halftone.gamma);
  }

  const halftonePixels = new Uint8ClampedArray(scaledW * scaledH * 4);
  const angle = (halftone.angle * Math.PI) / 180;
  const cosA = Math.cos(angle);
  const sinA = Math.sin(angle);
  const spacing = Math.max(1, halftone.dotSpacing);

  for (let y = 0; y < scaledH; y += spacing) {
    for (let x = 0; x < scaledW; x += spacing) {
      const cx = x + spacing / 2;
      const cy = y + spacing / 2;
      const rx = Math.floor(cx * cosA - cy * sinA);
      const ry = Math.floor(cx * sinA + cy * cosA);
      const sx = Math.max(0, Math.min(scaledW - 1, rx));
      const sy = Math.max(0, Math.min(scaledH - 1, ry));
      const idx = sy * scaledW + sx;
      const tone = halftone.invert ? luma[idx] : 1 - luma[idx];
      const toneThresholded = tone > halftone.threshold / 255 ? tone : 0;
      const radius = Math.min(halftone.dotSize / 2, (toneThresholded * halftone.dotSize) / 2);
      if (halftone.preserveHighlights && toneThresholded < 0.03) continue;

      for (let oy = -radius; oy <= radius; oy++) {
        for (let ox = -radius; ox <= radius; ox++) {
          if (ox * ox + oy * oy > radius * radius) continue;
          const px = Math.floor(cx + ox);
          const py = Math.floor(cy + oy);
          if (px < 0 || py < 0 || px >= scaledW || py >= scaledH) continue;
          const pIdx = py * scaledW + px;
          const a = Math.min(1, toneThresholded * alpha[pIdx]);
          const out = pIdx * 4;
          halftonePixels[out] = 0;
          halftonePixels[out + 1] = 0;
          halftonePixels[out + 2] = 0;
          halftonePixels[out + 3] = Math.max(halftonePixels[out + 3], Math.floor(a * 255));
        }
      }
    }
  }

  let cleanedAlpha = new Float32Array(scaledW * scaledH);
  for (let i = 0; i < cleanedAlpha.length; i++) {
    const tone = 1 - luma[i];
    const base = tone > knockout.threshold / 255 ? 1 : 0;
    const detailBoost = 0.5 + knockout.detailPreservation / 200;
    cleanedAlpha[i] = base * alpha[i] * detailBoost;
  }

  cleanedAlpha = morphAlpha(cleanedAlpha, scaledW, scaledH, knockout.chokeSpread);
  cleanedAlpha = blurAlpha(cleanedAlpha, scaledW, scaledH, knockout.softness);
  cleanedAlpha = despeckle(cleanedAlpha, scaledW, scaledH, 100 - knockout.detailPreservation);

  const knockoutPixels = new Uint8ClampedArray(scaledW * scaledH * 4);
  for (let i = 0; i < cleanedAlpha.length; i++) {
    const a = Math.max(0, Math.min(1, cleanedAlpha[i] * (knockout.underbaseStrength / 100)));
    const out = i * 4;
    const minDotPass = knockout.minimumDot <= 0 || a * 255 >= knockout.minimumDot;

    if (!minDotPass) continue;

    if (knockout.mode === 'underbase') {
      knockoutPixels[out] = 255;
      knockoutPixels[out + 1] = 255;
      knockoutPixels[out + 2] = 255;
      knockoutPixels[out + 3] = Math.floor(a * 255);
    } else {
      knockoutPixels[out] = 0;
      knockoutPixels[out + 1] = 0;
      knockoutPixels[out + 2] = 0;
      knockoutPixels[out + 3] = Math.floor((1 - a) * 255);
    }
  }

  return { halftonePixels, knockoutPixels, width: scaledW, height: scaledH };
};

self.onmessage = (event: MessageEvent<ProcessRequest>) => {
  const response = process(event.data);
  self.postMessage(response, [response.halftonePixels.buffer, response.knockoutPixels.buffer]);
};
