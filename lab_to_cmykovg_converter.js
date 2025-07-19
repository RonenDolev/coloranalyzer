import { standardDensity } from './densities.js';

// === Utility: LAB to XYZ ===
export function labToXyz({ L, a, b }) {
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
export function xyzToLinearRgb({ X, Y, Z }) {
  const R = X * 3.2406 + Y * -1.5372 + Z * -0.4986;
  const G = X * -0.9689 + Y * 1.8758 + Z * 0.0415;
  const B = X * 0.0557 + Y * -0.2040 + Z * 1.0570;
  return { R, G, B };
}

// === Utility: RGB to CMYK ===
export function rgbToCmyk(rgb) {
  let r = (rgb.R ?? 0) / 255;
  let g = (rgb.G ?? 0) / 255;
  let b = (rgb.B ?? 0) / 255;

  let k = 1 - Math.max(r, g, b);
  let c = (1 - r - k) / (1 - k) || 0;
  let m = (1 - g - k) / (1 - k) || 0;
  let y = (1 - b - k) / (1 - k) || 0;

  return {
    C: isFinite(c) ? c : 0,
    M: isFinite(m) ? m : 0,
    Y: isFinite(y) ? y : 0,
    K: isFinite(k) ? k : 0
  };
}

// === Determines which OVG channels are relevant to the LAB hue ===
function getRelevantOVGChannels({ A, B }) {
  const channels = [];
  if (A > 5 && B > 5) channels.push('O');
  if (A < -5 && B > 5) channels.push('G');
  if (A < -5 && B < -5) channels.push('V');
  return channels;
}

// === Add OVG channels based on LAB ===
function addOVG(cmyk, lab) {
  const result = { ...cmyk };
  const relevant = getRelevantOVGChannels(lab);

  if (relevant.includes('O')) result.O = 0.5 * cmyk.M;
  if (relevant.includes('V')) result.V = 0.5 * cmyk.C;
  if (relevant.includes('G')) result.G = 0.5 * cmyk.Y;

  return result;
}

// === Normalize CMYKOVG by density ===
export function normalizeByDensity(cmykovg, illumination = 'M1', paper = 'gloss') {
  const density = standardDensity?.[illumination]?.[paper];
  if (!density) return cmykovg;

  const normalized = {};
  for (let key in cmykovg) {
    if (density[key]) {
      normalized[key] = +(cmykovg[key] / density[key]).toFixed(4);
    } else {
      normalized[key] = cmykovg[key];
    }
  }
  return normalized;
}

// === LAB to CMYKOVG ===
export function convertLabToCmykovg(lab, illumination = 'M1', paper = 'gloss') {
  const xyz = labToXyz(lab);
  const rgb = xyzToLinearRgb(xyz);

  const rgb255 = {
    R: Math.max(0, Math.min(255, Math.round(rgb.R * 255))),
    G: Math.max(0, Math.min(255, Math.round(rgb.G * 255))),
    B: Math.max(0, Math.min(255, Math.round(rgb.B * 255)))
  };

  const cmyk = rgbToCmyk(rgb255);
  const cmykovg = addOVG(cmyk, lab);
  return normalizeByDensity(cmykovg, illumination, paper);
}

// === Delta E ===
export function deltaE(lab1, lab2) {
  const dL = lab1.L - lab2.L;
  const da = lab1.a - lab2.a;
  const db = lab1.b - lab2.b;
  return Math.sqrt(dL ** 2 + da ** 2 + db ** 2);
}

// === CMYK → RGB ===
export function cmykToRgb(cmyk) {
  const C = (cmyk.C || 0) / 100;
  const M = (cmyk.M || 0) / 100;
  const Y = (cmyk.Y || 0) / 100;
  const K = (cmyk.K || 0) / 100;

  const R = 255 * (1 - C) * (1 - K);
  const G = 255 * (1 - M) * (1 - K);
  const B = 255 * (1 - Y) * (1 - K);

  return { R, G, B };
}

// === RGB → LAB ===
export function rgbToLab({ R, G, B }) {
  R /= 255; G /= 255; B /= 255;

  [R, G, B] = [R, G, B].map(v =>
    v > 0.04045 ? ((v + 0.055) / 1.055) ** 2.4 : v / 12.92
  );

  const X = R * 0.4124 + G * 0.3576 + B * 0.1805;
  const Y = R * 0.2126 + G * 0.7152 + B * 0.0722;
  const Z = R * 0.0193 + G * 0.1192 + B * 0.9505;

  const refX = 0.95047, refY = 1.00000, refZ = 1.08883;
  let x = X / refX, y = Y / refY, z = Z / refZ;

  [x, y, z] = [x, y, z].map(v =>
    v > 0.008856 ? Math.cbrt(v) : (7.787 * v) + (16 / 116)
  );

  return {
    L: (116 * y) - 16,
    a: 500 * (x - y),
    b: 200 * (y - z)
  };
}

// === CMYK → LAB כולל צפיפות ===
export function convertCmykToLab(cmyk, illumination = 'M1', paper = 'gloss') {
  const density = standardDensity?.[illumination]?.[paper] || {};
  const denormCMYK = {};
  for (const key in cmyk) {
    const dens = density[key] || 1;
    denormCMYK[key] = cmyk[key] * dens;
  }

  const rgb = cmykToRgb(denormCMYK);
  return rgbToLab(rgb);
}

// === אם מישהו צריך את labToRgb ===
export function labToRgb(lab) {
  const xyz = labToXyz(lab);
  const { R, G, B } = xyzToLinearRgb(xyz);

  return {
    R: Math.round(Math.min(255, Math.max(0, R * 255))),
    G: Math.round(Math.min(255, Math.max(0, G * 255))),
    B: Math.round(Math.min(255, Math.max(0, B * 255)))
  };
}
