// cmykovg_suggestions_ext.js

import { convertLabToCmykovg, convertCmykToLab, deltaE, normalizeByDensity } from './lab_to_cmykovg_converter.js';

// === מחשב דלתא דיו בין הצעה לערכים נמדדים ===
function calculateInkDelta(candidate, measured) {
  const delta = {};
  for (const key of ['C', 'M', 'Y', 'K', 'O', 'V', 'G']) {
    const c = candidate[key] || 0;
    const m = measured?.[key] || 0;
    delta[key] = +(c - m).toFixed(2);
  }
  return delta;
}

// === מזהה אילו ערוצים שימשו בפועל ===
function getUsedInkChannels(cmykovg) {
  return Object.entries(cmykovg)
    .filter(([_, val]) => val > 0.01)
    .map(([ch]) => ch)
    .join('');
}

// === הפקת הצעות CMYKOVG מהרחבת גאמוט ===
export function generateExtendedCMYKOVGSuggestions(targetLab, measuredLab, pressSettings, limit = 3) {
  const steps = [0, 0.33, 0.66, 1.0];
  const results = [];
  const start = performance.now();
  const MAX_DURATION = 3000;
  const measuredCmyk = getMeasuredCmykFromLab(measuredLab);

  for (let c of steps)
    for (let m of steps)
      for (let y of steps)
        for (let k of steps)
          for (let o of steps)
            for (let v of steps)
              for (let g of steps) {
                const candidate = { C: c, M: m, Y: y, K: k, O: o, V: v, G: g };
                const normalized = normalizeByDensity(candidate, pressSettings.mode, pressSettings.gloss);
                const simulatedLab = convertCmykToLab(normalized, pressSettings.mode, pressSettings.gloss);
                const dE = deltaE(targetLab, simulatedLab);

                results.push({
                  cmyk: candidate,
                  lab: simulatedLab,
                  deltaE: +dE.toFixed(2),
                  delta: calculateInkDelta(candidate, measuredCmyk),
                  measuredCmyk,
                  channels: getUsedInkChannels(candidate),
                  isExtendedOVG: true,
                  measuredLab
                });

                if (performance.now() - start > MAX_DURATION) break;
              }

  return results
    .sort((a, b) => a.deltaE - b.deltaE)
    .slice(0, limit);
}

// === המרה LAB ל-RGB ===
function labToRgb(lab) {
  let y = (lab.L + 16) / 116;
  let x = lab.A / 500 + y;
  let z = y - lab.B / 200;

  [x, y, z] = [x, y, z].map(v => {
    const v3 = v ** 3;
    return v3 > 0.008856 ? v3 : (v - 16 / 116) / 7.787;
  });

  let X = x * 95.047;
  let Y = y * 100.0;
  let Z = z * 108.883;

  X /= 100; Y /= 100; Z /= 100;

  let r = X * 3.2406 + Y * -1.5372 + Z * -0.4986;
  let g = X * -0.9689 + Y * 1.8758 + Z * 0.0415;
  let b = X * 0.0557 + Y * -0.2040 + Z * 1.0570;

  [r, g, b] = [r, g, b].map(v =>
    v > 0.0031308 ? 1.055 * v ** (1 / 2.4) - 0.055 : 12.92 * v
  );

  return {
    R: Math.round(Math.min(Math.max(0, r * 255), 255)),
    G: Math.round(Math.min(Math.max(0, g * 255), 255)),
    B: Math.round(Math.min(Math.max(0, b * 255), 255))
  };
}

// === RGB ל-CMYK ===
function rgbToCmyk({ R, G, B }) {
  let r = R / 255, g = G / 255, b = B / 255;
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

// === יצירת CMYK מדומה מתוך LAB נמדד ===
function getMeasuredCmykFromLab(measuredLab) {
  const rgb = labToRgb(measuredLab);
  const cmyk = rgbToCmyk(rgb);
  const result = {};
  ['C', 'M', 'Y', 'K'].forEach(ch => {
    result[ch] = +(cmyk[ch] * 100).toFixed(2);
  });
  return result;
}

// === החלת ההצעה לשדות המדידה בתחתית המסך ===
export function applyExtendedSuggestionToInputs(suggestion) {
  if (!suggestion || !suggestion.cmyk) return;

  ['C', 'M', 'Y', 'K', 'O', 'V', 'G'].forEach(ch => {
    const val = suggestion.cmyk[ch] ?? 0;
    const input = document.querySelector(`input[name="measured_${ch.toLowerCase()}"]`);
    if (input) {
      input.value = isFinite(val) ? val.toFixed(2) : '';
    }
  });

  const lab = suggestion.lab;
  if (lab) {
    document.querySelector('input[name="measured_lab_l"]').value = lab.L.toFixed(2);
    document.querySelector('input[name="measured_lab_a"]').value = lab.A.toFixed(2);
    document.querySelector('input[name="measured_lab_b"]').value = lab.B.toFixed(2);
  }
}
