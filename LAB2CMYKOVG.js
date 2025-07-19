// lab_to_cmykovg_converter.js

import { standardDensity } from './densities.js';

// === Utility: LAB to XYZ ===
function labToXyz({ L, a, b }) {
  const refX = 0.9642, refY = 1.0000, refZ = 0.8249;
  let y = (L + 16) / 116;
  let x = y + a / 500;
  let z = y - b / 200;

  const [x3, y3, z3] = [x, y, z].map(v => {
    const v3 = v ** 3;
    return v3 > 0.008856 ? v3 : (v - 16 / 116) / 7.787;
  });

  return {
    X: x3 * refX,
    Y: y3 * refY,
    Z: z3 * refZ
  };
}

// === Utility: XYZ to linear RGB ===
function xyzToLinearRgb({ X, Y, Z }) {
  const R = X *  3.2406 + Y * -1.5372 + Z * -0.4986;
  const G = X * -0.9689 + Y *  1.8758 + Z *  0.0415;
  const B = X *  0.0557 + Y * -0.2040 + Z *  1.0570;
  return { R, G, B };
}

// === Utility: RGB to CMYK ===
function rgbToCmyk(R, G, B) {
  const C = 1 - Math.min(1, Math.max(0, R));
  const M = 1 - Math.min(1, Math.max(0, G));
  const Y = 1 - Math.min(1, Math.max(0, B));
  const K = Math.min(C, M, Y);
  return {
    C: (C - K) / (1 - K) || 0,
    M: (M - K) / (1 - K) || 0,
    Y: (Y - K) / (1 - K) || 0,
    K
  };
}

// === Add OVG channels (approximate) ===
function addOVG(cmyk) {
  return {
    ...cmyk,
    O: 0.5 * cmyk.M, // Orange
    V: 0.5 * cmyk.C, // Violet
    G: 0.5 * cmyk.Y  // Green
  };
}

// === Normalize CMYKOVG by density ===
function normalizeByDensity(cmykovg, illumination = 'M1', paper = 'gloss') {
  const density = standardDensity?.[illumination]?.[paper];
  if (!density) return cmykovg;

  const normalized = {};
  for (let key in cmykovg) {
    normalized[key] = +(cmykovg[key] / density[key]).toFixed(4);
  }
  return normalized;
}

// === Exported Conversion Function ===
export function convertLabToCmykovg(lab, illumination = 'M1', paper = 'gloss') {
  const xyz = labToXyz(lab);
  const rgb = xyzToLinearRgb(xyz);
  const cmyk = rgbToCmyk(rgb.R, rgb.G, rgb.B);
  const cmykovg = addOVG(cmyk);
  return normalizeByDensity(cmykovg, illumination, paper);
}

// === Optional: Delta E checker (for reverse optimization use) ===
export function deltaE(lab1, lab2) {
  const dL = lab1.L - lab2.L;
  const da = lab1.a - lab2.a;
  const db = lab1.b - lab2.b;
  return Math.sqrt(dL ** 2 + da ** 2 + db ** 2);
}
