// ===========================
// RIGHT PANEL SCRIPT (Pantone Analysis with CMYKOVG, LAB, Mode, Density)
// ===========================

import { 
  convertLabToCmykovg, 
  convertCmykToLab,
  deltaE, 
  labToXyz,
  xyzToLinearRgb,
  rgbToCmyk,
  normalizeByDensity,
} from './lab_to_cmykovg_converter.js';
window.convertCmykToLab = convertCmykToLab;
window.normalizeByDensity = normalizeByDensity;

import { 
  standardDensity, 
  updateDensityDisplay 
} from './densities.js';

window.measuredLabEditedManually = false;
['measured_lab_l', 'measured_lab_a', 'measured_lab_b'].forEach(name => {
  document.addEventListener('DOMContentLoaded', () => {
    const input = document.querySelector(`input[name="${name}"]`);
    if (input) {
      input.addEventListener('input', () => {
        window.measuredLabEditedManually = true;
      });
    }
  });
});
let pantoneData = [];
function convertCmykToLabSmart(cmyk, mode, gloss) {
const raw = window.convertCmykToLab(cmyk, mode, gloss);
  return {
    L: raw.L ?? raw.l,
    A: raw.A ?? raw.a,
    B: raw.B ?? raw.b
  };
}
  

 function findBestCmykForLab(targetLab, pressSettings, inks = ['C','M','Y','K'], step = 5) {
  let best = null;
  let minDeltaE = Infinity;
  const vals = [];
  for (let i = 0; i <= 100; i += step) vals.push(i);

  for (let c of (inks.includes('C') ? vals : [0]))
    for (let m of (inks.includes('M') ? vals : [0]))
      for (let y of (inks.includes('Y') ? vals : [0]))
        for (let k of (inks.includes('K') ? vals : [0])) {

          const candidate = { C: c, M: m, Y: y, K: k };
          const lab = convertCmykToLabSmart(candidate, pressSettings.mode, pressSettings.gloss);
                const dE = calculateDeltaE2000(targetLab, lab);

          if (dE < minDeltaE) {
            minDeltaE = dE;
            best = { ...candidate };
          }

          if (dE < 0.5) return best;
        }
 
  return best;
}

 
function handlePantoneSelect(pantoneIndex = 0) {
  const pantone = pantoneData[pantoneIndex];
  if (!pantone || !pantone.lab) return;

  // 🆕 קביעת ערכי CMYK מהקובץ (אם קיימים בקובץ pantoneDB.json)
  if (pantone.cmyk) {
    ['c', 'm', 'y', 'k'].forEach(ch => {
      const val = pantone.cmyk[ch.toUpperCase()];
      const existingInput = document.querySelector(`input[name="existing_${ch}"]`);
      if (existingInput) {
        existingInput.value = isFinite(val) ? val.toFixed(2) : '';
        console.log(`🟢 Loaded CMYK from DB: existing_${ch} =`, existingInput.value);
      }
    });
    window.cmykLoadedFromDB = true;
  }

  // קביעת ערכי יעד LAB
  document.querySelector('input[name="lab_l"]').value = pantone.lab.L;
  document.querySelector('input[name="lab_a"]').value = pantone.lab.A;
  document.querySelector('input[name="lab_b"]').value = pantone.lab.B;

  // אם לא שונה ידנית, קובע גם Measured
  if (!window.measuredLabEditedManually) {
    document.querySelector('input[name="measured_lab_l"]').value = pantone.lab.L;
    document.querySelector('input[name="measured_lab_a"]').value = pantone.lab.A;
    document.querySelector('input[name="measured_lab_b"]').value = pantone.lab.B;
  }
   window.measuredLabEditedManually = false;
  const rgb = labToRgb(pantone.lab);
  const cmyk = rgbToCmyk(rgb);

  // ✅ רק אם אין ערכים מ־pantone.cmyk נטענים – נחשב אותם ידנית
  if (!window.cmykEditedManually && !pantone.cmyk) {
    ['c', 'm', 'y', 'k'].forEach(ch => {
      const val = cmyk[ch.toUpperCase()];
      const percent = isFinite(val) ? +(val * 100).toFixed(1) : '';

      const labInput = document.querySelector(`input[name="lab_${ch}"]`);
      const existingInput = document.querySelector(`input[name="existing_${ch}"]`);

      if (labInput) labInput.value = percent;
      if (existingInput) existingInput.value = percent;
    });
  }

  // קובע דגל לעריכה ידנית = false
  window.cmykEditedManually = false;

  updateColorDisplayFromLab(pantone.lab, pantone.lab);

  const selectedInks = Array.from(
    document.querySelectorAll('input[name="ink"]:checked') || []
  ).map(cb => cb?.value?.toLowerCase()).filter(Boolean);

  const targetLab = pantone.lab;

  const pressSettings = {
    mode: document.querySelector('input[name="mode"]:checked')?.value || 'M1',
    gloss: document.querySelector('select[name="paper-gloss"]')?.value || 'gloss'
  };

  const measuredLab = {
  L: safeParseFloat(document.querySelector('input[name="measured_lab_l"]')?.value),
  A: safeParseFloat(document.querySelector('input[name="measured_lab_a"]')?.value),
  B: safeParseFloat(document.querySelector('input[name="measured_lab_b"]')?.value)
};

const suggestions = generateCMYKOVGSuggestions(targetLab, measuredLab, pressSettings, selectedInks, 5);
console.log("✅ Suggestions:", suggestions);
renderSuggestions(suggestions, pressSettings);
console.log('✅ Suggestions:', suggestions);

updateDeltaE2000(targetLab, measuredLab);

// עדכון הריבוע הימני עם הערכים הידניים של Measured
const measuredLabInput = {
  L: safeParseFloat(document.querySelector('input[name="measured_lab_l"]').value),
  A: safeParseFloat(document.querySelector('input[name="measured_lab_a"]').value),
  B: safeParseFloat(document.querySelector('input[name="measured_lab_b"]').value)
};
const targetLabInput = {
  L: safeParseFloat(document.querySelector('input[name="lab_l"]').value),
  A: safeParseFloat(document.querySelector('input[name="lab_a"]').value),
  B: safeParseFloat(document.querySelector('input[name="lab_b"]').value)
};
updateColorDisplayFromLab(targetLabInput, measuredLabInput);

}
// 🛡 פונקציה למניעת NaN
function safeParseFloat(value, fallback = 0) {
  const num = parseFloat(value);
  return isNaN(num) ? fallback : num;
}

function labToRgb(lab) {
  // LAB -> XYZ
  let y = (lab.L + 16) / 116;
  let x = lab.A / 500 + y;
  let z = y - lab.B / 200;

  [x, y, z] = [x, y, z].map(v => {
    let v3 = v ** 3;
    return v3 > 0.008856 ? v3 : (v - 16/116) / 7.787;
  });

  let X = x * 95.047;
  let Y = y * 100.000;
  let Z = z * 108.883;

  // XYZ -> RGB
  X /= 100; Y /= 100; Z /= 100;

  let r = X *  3.2406 + Y * -1.5372 + Z * -0.4986;
  let g = X * -0.9689 + Y *  1.8758 + Z *  0.0415;
  let b = X *  0.0557 + Y * -0.2040 + Z *  1.0570;

  [r, g, b] = [r, g, b].map(v =>
    v > 0.0031308
      ? 1.055 * Math.pow(v, 1 / 2.4) - 0.055
      : 12.92 * v
  );

  return {
    R: Math.round(Math.min(Math.max(0, r * 255), 255)),
    G: Math.round(Math.min(Math.max(0, g * 255), 255)),
    B: Math.round(Math.min(Math.max(0, b * 255), 255))
  };
}

function getMeasuredCmykFromLab(measuredLab, pressSettings) {
  // המרה ל-RGB
  const measuredRgb = labToRgb(measuredLab);
  // המרה ל-CMYK
  const measuredCmykRaw = rgbToCmyk(measuredRgb);
  // לא מנרמל שוב - מנרמל רק ערכים בין 0-100
  let measuredCmyk = {};
  ['C','M','Y','K'].forEach(ch => {
    measuredCmyk[ch] = isFinite(measuredCmykRaw[ch]) ? +(measuredCmykRaw[ch] * 100).toFixed(2) : 0;
    // אפס שלילי או ערכים חריגים
    if (measuredCmyk[ch] < 0) measuredCmyk[ch] = 0;
    if (measuredCmyk[ch] > 100) measuredCmyk[ch] = 100;
  });
  return measuredCmyk;
}


function cmykovgToRgb(cmykovg) {
  // המרה פשוטה לצורך הדמיה בסיסית – תוכל לעדכן לפי צורך
  const { C = 0, M = 0, Y = 0, K = 0, O = 0, V = 0, G = 0 } = cmykovg;

  // משקל יחסי כדי ליצור RGB לצפייה בלבד
  const total = C + M + Y + K + O + V + G || 1;

  const r = 255 * (1 - (C + K + O) / total);
  const g = 255 * (1 - (M + K + V) / total);
  const b = 255 * (1 - (Y + K + G) / total);

  return {
    R: Math.max(0, Math.min(255, Math.round(r))),
    G: Math.max(0, Math.min(255, Math.round(g))),
    B: Math.max(0, Math.min(255, Math.round(b)))
  };
}

 
function generateCMYKOVGSuggestions(targetLab, measuredLab, pressSettings, inks, step = 5, measuredCmykInput) {
  const suggestions = [];

  const measuredCmyk = getMeasuredCmykFromLab(measuredLab, pressSettings);

  const isLabIdentical =
    Math.abs((targetLab.L ?? 0) - (measuredLab.L ?? 0)) < 0.01 &&
    Math.abs((targetLab.A ?? 0) - (measuredLab.A ?? 0)) < 0.01 &&
    Math.abs((targetLab.B ?? 0) - (measuredLab.B ?? 0)) < 0.01;

  if (isLabIdentical) {
  const delta = calculateInkDelta(measuredCmyk, measuredCmyk); // יהיה כולו אפסים
  suggestions.push({
    cmyk: measuredCmyk,
    lab: measuredLab,
    deltaE: 0,
    measuredCmyk,
    delta,
    channels: ['C', 'M', 'Y', 'K'],
    isBaseline: true,
    measuredLab
  });
  return suggestions;
}


  const bestCmyk = findBestCmykForLab(targetLab, pressSettings, ['C','M','Y','K'], step);
  if (!bestCmyk) return [];

  const fixedLab = convertCmykToLabSmart(bestCmyk, pressSettings.mode, pressSettings.gloss);
  const deltaEvalue = calculateDeltaE2000(targetLab, fixedLab);

  const delta = {};
  ['C','M','Y','K'].forEach(ch => {
    delta[ch] = +(bestCmyk[ch] - (measuredCmyk[ch] ?? 0)).toFixed(2);
  });

  suggestions.push({
    cmyk: bestCmyk,
    lab: fixedLab,
    deltaE: deltaEvalue,
    measuredCmyk,
    delta,
    channels: ['C', 'M', 'Y', 'K'],
    isBaseline: true,
    measuredLab
  });

  return suggestions;
}


// ✅ יצירת מפתח ייחודי לשורת CMYK הבסיסית

function inkPercentagesToLab(cmykovg, pressSettings) {
  return convertLabToCmykovg(cmykovg, pressSettings.mode, pressSettings.gloss);
}


function generateInkCombinations(inks, step = 25) {
  const ranges = inks.map(() => {
    const values = [];
    for (let i = 0; i <= 100; i += step) values.push(i);
    return values;
  });

  const results = [];
  const combine = (arr = [], idx = 0) => {
    if (idx === inks.length) {
      const combo = {};
      inks.forEach((ink, i) => {
        if (arr[i] > 0) combo[ink.toUpperCase()] = arr[i];
      });
      if (Object.keys(combo).length > 0) results.push(combo);
      return;
    }
    ranges[idx].forEach(val => combine([...arr, val], idx + 1));
  };

  combine();
  return results;
}

function findBestCMYKOVGforLAB(targetLab, pressSettings, step = 33, inks = ['C','M','Y','K','O','V','G']) {
  const results = [];
  const steps = [];
  for (let i = 0; i <= 100; i += step) steps.push(i / 100);

  const inkSet = new Set(inks.map(i => i.toUpperCase()));
  const start = performance.now();
  const MAX_DURATION_MS = 3000;

  for (let c of inkSet.has('C') ? steps : [0])
    for (let m of inkSet.has('M') ? steps : [0])
      for (let y of inkSet.has('Y') ? steps : [0])
        for (let k of inkSet.has('K') ? steps : [0])
          for (let o of inkSet.has('O') ? steps : [0])
            for (let v of inkSet.has('V') ? steps : [0])
              for (let g of inkSet.has('G') ? steps : [0]) {

                const candidate = { C: c, M: m, Y: y, K: k, O: o, V: v, G: g };
                const simulated = convertLabToCmykovg(candidate, pressSettings.mode, pressSettings.gloss);
                const dE = deltaE(targetLab, simulated);

                results.push({
                  candidate,
                  lab: simulated,
                  deltaE: +dE.toFixed(2),
                  usedInks: Object.entries(candidate).filter(([_, val]) => val > 0).map(([ink]) => ink)
                });

                if (performance.now() - start > MAX_DURATION_MS) {
                  return results
                    .sort((a, b) => a.deltaE - b.deltaE)
                    .slice(0, 5);
                }
              }


  return results
    .sort((a, b) => a.deltaE - b.deltaE)
    .slice(0, 5);
}

function renderSuggestions(suggestions, pressSettings) {
  const tableBody = document.getElementById('suggestion-table-body');
  if (!tableBody) return;

  if (!suggestions || suggestions.length === 0) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="7" style="text-align:center;color:red;">
          ⚠️ No suitable CMYK suggestions found for the current LAB values.
        </td>
      </tr>`;
    return;
  }

  const sug = suggestions[0];

  // <-- הקוד שהיה כתוב בטעות בחוץ צריך להיכנס לכאן
  const table = tableBody.closest('table');
  let gamutMsgEl = document.getElementById('gamut-msg');
  if (!gamutMsgEl) {
    gamutMsgEl = document.createElement('div');
    gamutMsgEl.id = 'gamut-msg';
    gamutMsgEl.style.margin = '6px 0 10px 0';
    gamutMsgEl.style.fontSize = '90%';
    gamutMsgEl.style.color = '#222';
    if (table && table.parentNode) {
      table.parentNode.insertBefore(gamutMsgEl, table);
    }
  }

  
  // ==== הוספה חדשה כאן ====
  const targetLab = {
    L: parseFloat(document.querySelector('input[name="lab_l"]').value),
    A: parseFloat(document.querySelector('input[name="lab_a"]').value),
    B: parseFloat(document.querySelector('input[name="lab_b"]').value)
  };
  const threshold = 1.0;
  // =======================

  // חישוב LAB מתוך ערכי CMYK Measured Values
  const measuredLabFromCmyk = sug.measuredCmyk 
  ? convertCmykToLabSmart(sug.measuredCmyk, pressSettings.mode, pressSettings.gloss) 
  : null;

let inCmykGamut = false;
let gamutDeltaE = '-';

if (
  measuredLabFromCmyk &&
  isFinite(measuredLabFromCmyk.L) &&
  isFinite(measuredLabFromCmyk.A) &&
  isFinite(measuredLabFromCmyk.B)
) {
  gamutDeltaE = window.calculateDeltaE2000(targetLab, measuredLabFromCmyk);
  if (gamutDeltaE < threshold) inCmykGamut = true;
}

if (inCmykGamut) {
  gamutMsgEl.innerHTML = 'You are currently in the color space based on CMYK.';
} else {
  gamutMsgEl.innerHTML = 'Please note, your measured LAB values are outside the CMYK color space, and it is recommended to add OVG channels.';
}

   
  tableBody.innerHTML = '';

  const tagColors = {
    C: '#00aaff', M: '#ff33aa', Y: '#ffee00', K: '#222',
    O: '#ffa500', V: '#aa66ff', G: '#00cc44'
  
};
 
window.lastSuggestions = suggestions;
suggestions.forEach((sug, idx) => {
  const row = document.createElement('tr');
  row.className = (idx === 0) ? 'suggestion-good' : '';

  // 🟨 גיבוי ערכים חסרים אם צריך
  if (!sug.measuredCmyk && sug.lab) {
    sug.measuredCmyk = convertLabToCMYKOVG(sug.lab, pressSettings.mode, pressSettings.gloss);
  }

  if (!sug.delta && sug.cmyk && sug.measuredCmyk) {
    sug.delta = calculateInkDelta(sug.cmyk, sug.measuredCmyk);
  }

  const tagColors = {
    C: '#00aaff', M: '#ff33aa', Y: '#ffee00', K: '#222',
    O: '#ffa500', V: '#aa66ff', G: '#00cc44'
  };

  // CMYK מוצע
  const cmykStr = sug.cmyk
    ? ['C', 'M', 'Y', 'K'].map(ch =>
        `<span style="color:${tagColors[ch]};font-weight:bold">${ch}: ${sug.cmyk[ch]?.toFixed(2) ?? '0.00'}%</span>`
      ).join('<br>')
    : '-';

  // Measured Values (מתוך LAB)
  const measuredCmykStr = sug.measuredCmyk
  ? ['C', 'M', 'Y', 'K'].map(ch =>
    `<span style="color:#000;">${ch}: ${typeof sug.measuredCmyk[ch] !== 'undefined' ? sug.measuredCmyk[ch].toFixed(2) : '0.00'}%</span>`
  ).join('<br>')
  : '-';

  // ΔCMYK
  let deltaCmykStr = '-';
if (sug.delta && sug.measuredCmyk) {
  const deltas = Object.entries(sug.delta)
    .filter(([_, val]) => Math.abs(val) > 0.01)
    .map(([ch, val]) =>
      `${ch}: ${val > 0 ? '+' : ''}${val.toFixed(2)}`
    );

  deltaCmykStr = deltas.length > 0 ? deltas.join(' / ') : 'No correction needed';
}

  // fixedCmyk = נמדד + דלתא
  const fixedCmyk = {};
  ['C', 'M', 'Y', 'K', 'O', 'V', 'G'].forEach(ch => {
    fixedCmyk[ch] = (sug.measuredCmyk?.[ch] ?? 0) + (sug.delta?.[ch] ?? 0);
  });

  // חישוב LAB מתוך fixedCmyk
  const fixedLab = convertCmykToLabSmart(fixedCmyk, pressSettings.mode, pressSettings.gloss);
  const labStr = (fixedLab && isFinite(fixedLab.L) && isFinite(fixedLab.A) && isFinite(fixedLab.B))
    ? `L: ${fixedLab.L.toFixed(2)}<br>A: ${fixedLab.A.toFixed(2)}<br>B: ${fixedLab.B.toFixed(2)}`
    : '-';

  // חישוב ΔE מול יעד
console.log('🔍 Calculating deltaE2000 from:', targetLab, fixedLab);

// בדיקה ש־fixedLab תקין
if (!fixedLab || !isFinite(fixedLab.L) || !isFinite(fixedLab.A) || !isFinite(fixedLab.B)) {
  console.warn('⚠️ fixedLab לא תקין:', fixedLab);
}  
const deltaEStr = (fixedLab && targetLab)
    ? calculateDeltaE2000(targetLab, fixedLab).toFixed(2)
    : '-';

  const label = (idx === 0) ? '<b>Best (CMYK only)</b>' : `Suggestion #${idx + 1}`;
  const channelsStr = (sug.channels || []).join(', ') || '-';

  row.innerHTML = `
    <td><input type="radio" name="suggestion_select" value="${idx}" ${idx === 0 ? 'checked' : ''}></td>
    <td>${label}</td>
    <td>${channelsStr}</td>
      <td>${measuredCmykStr}</td>
    <td>${labStr}</td>
    <td>${deltaCmykStr}</td>
    <td><b>${deltaEStr}</b></td>
  `;

  document.getElementById('suggestion-table-body').appendChild(row);

  // האזנה ללחיצה
  row.querySelector('input[type="radio"]').addEventListener('change', () => {
    applySuggestionToInputs(suggestions[idx]);
  });
});

}
 function applySuggestionToInputs(suggestion) {
  console.log("🟩 applySuggestionToInputs הופעלה עם:", suggestion);
  if (!suggestion || !suggestion.measuredCmyk || !suggestion.delta) {
    console.warn('❌ No valid suggestion data.');
    return;
  }

  // ===== הוסף את זה ממש כאן =====
  const targetLab = {
    L: parseFloat(document.querySelector('input[name="lab_l"]').value),
    A: parseFloat(document.querySelector('input[name="lab_a"]').value),
    B: parseFloat(document.querySelector('input[name="lab_b"]').value)
  };
  // ==============================

  // 1. חישוב CMYK אחרי תיקון (נמדד + דלתא)
  let fixedCmyk = {};
['C', 'M', 'Y', 'K', 'O', 'V', 'G'].forEach(ch => {
  fixedCmyk[ch] = (suggestion.measuredCmyk?.[ch] ?? 0) + (suggestion.delta?.[ch] ?? 0);
});

  console.log("🟨 fixedCmyk (CMYK מומלץ):", fixedCmyk);

  // עדכון שדות Measured CMYK בתחתית הדף לערכי ההמלצה
  ['C', 'M', 'Y', 'K', 'O', 'V', 'G'].forEach(ch => {
  const input = document.querySelector(`input[name="measured_${ch.toLowerCase()}"]`);
  if (input) {
    input.value = isFinite(fixedCmyk[ch]) ? fixedCmyk[ch].toFixed(2) : '';
  }
});

  // 3. חישוב LAB חדש מתוך ערכי ה-CMYK המתוקנים
  const pressSettings = {
    mode: document.querySelector('input[name="mode"]:checked')?.value || 'M1',
    gloss: document.querySelector('select[name="paper-gloss"]')?.value || 'gloss'
  };
  const measuredLab = convertCmykToLabSmart(fixedCmyk, pressSettings.mode, pressSettings.gloss);
  console.log("🟧 fixedLabObj (LAB הצפוי):", measuredLab);

  // 5. שלוף ערכי LAB אחרי עדכון - **נשארים הערכים הידניים בטופס**
  const newMeasuredLab = {
    L: parseFloat(document.querySelector('input[name="measured_lab_l"]').value),
    A: parseFloat(document.querySelector('input[name="measured_lab_a"]').value),
    B: parseFloat(document.querySelector('input[name="measured_lab_b"]').value)
  };

  // 6. עדכון צבעים ודלתא E עם ערכי LAB הידניים
  window.updateColorDisplayFromLab(targetLab, newMeasuredLab);
  window.updateDeltaE2000(targetLab, newMeasuredLab);

}


function updateColorDisplayFromLab(target, measured) {
  const box1 = document.getElementById('color-display');
  const box2 = document.getElementById('measured-color-box');
  // Check values
  function isValidLab(lab) {
    return lab && isFinite(lab.L) && isFinite(lab.A) && isFinite(lab.B);
  }
  let rgb1 = {R:255,G:255,B:255}, rgb2 = {R:255,G:255,B:255};

  if (isValidLab(target)) rgb1 = labToRgb(target);
  if (isValidLab(measured)) rgb2 = labToRgb(measured);

  if (box1 && isFinite(rgb1.R) && isFinite(rgb1.G) && isFinite(rgb1.B)) {
    box1.style.backgroundColor = `rgb(${rgb1.R}, ${rgb1.G}, ${rgb1.B})`;
  }
  if (box2 && isFinite(rgb2.R) && isFinite(rgb2.G) && isFinite(rgb2.B)) {
    box2.style.backgroundColor = `rgb(${rgb2.R}, ${rgb2.G}, ${rgb2.B})`;
  } else if (box2) {
    box2.style.backgroundColor = '#fff';
  }

  // debug log
  console.log(
  'updateColorDisplayFromLab:',
  {target, measured},
  'rgb1:', rgb1,
  'rgb2:', rgb2
);


  // Debug:
  console.log('Target LAB:', target);
console.log('Measured LAB:', measured);
console.log('Target L:', target.L, 'A:', target.A, 'B:', target.B);
console.log('Measured L:', measured.L, 'A:', measured.A, 'B:', measured.B);
console.log('RGB from labToRgb:', labToRgb(measured));


  box1.style.backgroundColor = `rgb(${rgb1.R}, ${rgb1.G}, ${rgb1.B})`;
  box2.style.backgroundColor = `rgb(${rgb2.R}, ${rgb2.G}, ${rgb2.B})`;
}

function updateVisuals() {
  // מוכן לשימוש בהמשך
}

function handleMeasuredLabChange() {
  window.measuredLabEditedManually = true;

  const targetLab = {
    L: parseFloat(document.querySelector('input[name="lab_l"]').value),
    A: parseFloat(document.querySelector('input[name="lab_a"]').value),
    B: parseFloat(document.querySelector('input[name="lab_b"]').value)
  };

  const measuredLab = {
    L: safeParseFloat(document.querySelector('input[name="measured_lab_l"]').value),
    A: safeParseFloat(document.querySelector('input[name="measured_lab_a"]').value),
    B: safeParseFloat(document.querySelector('input[name="measured_lab_b"]').value)
  };

  // קריאה לפונקציית ההצעות והטבלה!
  const selectedInks = Array.from(
  document.querySelectorAll('input[name="ink"]:checked') || []
).map(cb => cb?.value?.toLowerCase()).filter(Boolean);

const pressSettings = {
  mode: document.querySelector('input[name="mode"]:checked')?.value || 'M1',
  gloss: document.querySelector('select[name="paper-gloss"]')?.value || 'gloss'
};

let suggestions = generateCMYKOVGSuggestions(targetLab, measuredLab, pressSettings, selectedInks, 5);

// אם לא נמצאו הצעות – ננסה עם CMYKOVG
if (!suggestions || suggestions.length === 0) {
  console.warn("⚠️ No CMYK suggestions found, switching to CMYKOVG...");
  const ovgInks = ['C','M','Y','K','O','V','G'];
  const measuredCmyk = getMeasuredCmykFromLab(measuredLab, pressSettings);

suggestions = findBestCMYKOVGforLAB(targetLab, pressSettings, 25, ovgInks).map(item => ({
  cmyk: item.candidate,
  lab: item.lab,
  deltaE: item.deltaE,
  delta: calculateInkDelta(item.candidate, measuredCmyk),
  measuredCmyk,
  channels: item.usedInks,
  isBaseline: false,
  measuredLab
}));

} 

renderSuggestions(suggestions, pressSettings);
updateColorDisplayFromLab(targetLab, measuredLab);
updateDeltaE2000(targetLab, measuredLab);

}

function calculateDeltaE2000(lab1, lab2) {
  const { L: L1, A: a1, B: b1 } = lab1;
  const { L: L2, A: a2, B: b2 } = lab2;

  const deltaL = L1 - L2;
  const deltaA = a1 - a2;
  const deltaB = b1 - b2;

  const c1 = Math.sqrt(a1 * a1 + b1 * b1);
  const c2 = Math.sqrt(a2 * a2 + b2 * b2);
  const deltaC = c1 - c2;

  const deltaH = Math.sqrt(Math.max(0, deltaA * deltaA + deltaB * deltaB - deltaC * deltaC));

  const sl = 1;
  const kc = 1;
  const kh = 1;
  const sc = 1 + 0.045 * c1;
  const sh = 1 + 0.015 * c1;

  const deltaE = Math.sqrt(
    Math.pow(deltaL / sl, 2) +
    Math.pow(deltaC / sc, 2) +
    Math.pow(deltaH / sh, 2)
  );

  return deltaE;
}
window.calculateDeltaE2000 = calculateDeltaE2000;

function calculateInkDelta(candidate, measured) {
  const delta = {};
  for (const key of ['C', 'M', 'Y', 'K', 'O', 'V', 'G']) {
    const c = candidate[key] || 0;
    const m = measured?.[key] || 0;
    delta[key] = +(c - m).toFixed(2);
  }
  return delta;
}

function updateDeltaE2000(targetLab, measuredLab) {
  // אם אחד הערכים חסר או לא מספר – הצג ריק
  if (!targetLab || !measuredLab ||
      !isFinite(targetLab.L) || !isFinite(targetLab.A) || !isFinite(targetLab.B) ||
      !isFinite(measuredLab.L) || !isFinite(measuredLab.A) || !isFinite(measuredLab.B)) {
    const deltaBox = document.getElementById('delta-result');
    if (deltaBox) {
      deltaBox.innerHTML = `ΔE<sub>2000</sub>: <strong>-</strong>`;
      deltaBox.style.backgroundColor = '#f7f7f7';
    }
    return;
  }

  const delta = calculateDeltaE2000(targetLab, measuredLab);
  const deltaBox = document.getElementById('delta-result');
  if (deltaBox) {
    deltaBox.innerHTML = `ΔE<sub>2000</sub>: <strong>${delta.toFixed(2)}</strong>`;
    deltaBox.style.backgroundColor = delta < 2 ? '#d4edda' : delta < 5 ? '#fff3cd' : '#f8d7da';
    deltaBox.style.border = '1px solid #ccc';
    deltaBox.style.padding = '8px';
  }
}
function handleApplySuggestionClick() {
console.log("🟦 handleApplySuggestionClick: כפתור הופעל");
  const suggestions = window.lastSuggestions;
  if (!suggestions || !Array.isArray(suggestions) || suggestions.length === 0) return;

  // שלוף איזו שורה מסומנת (רדיו)
  const selectedRadio = document.querySelector('input[name="suggestion_select"]:checked');
  const idx = selectedRadio ? +selectedRadio.value : 0;

  if (suggestions[idx]) {
    applySuggestionToInputs(suggestions[idx]);
  }

  // עדכון צבע הריבוע הימני עם הערכים המעודכנים של Measured
  const measuredLabInput = {
    L: safeParseFloat(document.querySelector('input[name="measured_lab_l"]').value),
    A: safeParseFloat(document.querySelector('input[name="measured_lab_a"]').value),
    B: safeParseFloat(document.querySelector('input[name="measured_lab_b"]').value)
  };
  const targetLabInput = {
    L: safeParseFloat(document.querySelector('input[name="lab_l"]').value),
    A: safeParseFloat(document.querySelector('input[name="lab_a"]').value),
    B: safeParseFloat(document.querySelector('input[name="lab_b"]').value)
  };
  window.updateColorDisplayFromLab(targetLabInput, measuredLabInput);
}


['lab_c', 'lab_m', 'lab_y', 'lab_k'].forEach(name => {
  const input = document.querySelector(`input[name="${name}"]`);
  if (input) {
    input.addEventListener('input', () => {
      cmykEditedManually = false;

      const c = parseFloat(document.querySelector('input[name="lab_c"]').value) || 0;
      const m = parseFloat(document.querySelector('input[name="lab_m"]').value) || 0;
      const y = parseFloat(document.querySelector('input[name="lab_y"]').value) || 0;
      const k = parseFloat(document.querySelector('input[name="lab_k"]').value) || 0;

      const rgb = window.cmykToRgb({ C: c, M: m, Y: y, K: k });
      const simulatedLab = window.rgbToLab(rgb);

      const measuredLab = {
        L: parseFloat(document.querySelector('input[name="measured_lab_l"]').value),
        A: parseFloat(document.querySelector('input[name="measured_lab_a"]').value),
        B: parseFloat(document.querySelector('input[name="measured_lab_b"]').value)
      };

      // רק עדכון תצוגה של צבעים ודלתא
      window.updateColorDisplayFromLab(simulatedLab, measuredLab);
      window.updateDeltaE2000(simulatedLab, measuredLab);
    });
  }
});

document.querySelectorAll('input[name^="measured_lab_"]').forEach(input => {
  input.addEventListener('input', handleMeasuredLabChange);
});
document.querySelector('select[name="paper-gloss"]').addEventListener('change', handleMeasuredLabChange);

async function loadPantoneOptions() {
  try {
    const response = await fetch('pantoneDB.json');
    const data = await response.json();
    pantoneData = data;

    const select = document.getElementById('pantone-select');
    if (!select) return;
    select.innerHTML = '';

    pantoneData.forEach((item, idx) => {
      const option = document.createElement('option');
      option.value = idx;
      option.textContent = item.name;
      select.appendChild(option);
    });

    select.selectedIndex = 0;
    handlePantoneSelect();

    select.addEventListener('change', () => {
      const idx = parseInt(select.value, 10);
      handlePantoneSelect(idx);
    });
  } catch (err) {
    console.error('❌ Pantone load error:', err.message || err);
  }
}

function cmykToRgb(cmyk) {
  let C = cmyk.C ?? 0;
  let M = cmyk.M ?? 0;
  let Y = cmyk.Y ?? 0;
  let K = cmyk.K ?? 0;
  C = C / 100; M = M / 100; Y = Y / 100; K = K / 100;
  const R = 255 * (1 - C) * (1 - K);
  const G = 255 * (1 - M) * (1 - K);
  const B = 255 * (1 - Y) * (1 - K);
  return { R: Math.round(R), G: Math.round(G), B: Math.round(B) };
}

function rgbToLab(rgb) {
  // 0-255 ל- 0-1
  let r = rgb.R / 255, g = rgb.G / 255, b = rgb.B / 255;
  // sRGB to Linear
  r = r > 0.04045 ? Math.pow((r + 0.055) / 1.055, 2.4) : r / 12.92;
  g = g > 0.04045 ? Math.pow((g + 0.055) / 1.055, 2.4) : g / 12.92;
  b = b > 0.04045 ? Math.pow((b + 0.055) / 1.055, 2.4) : b / 12.92;
  // Linear RGB to XYZ
  let X = r * 0.4124 + g * 0.3576 + b * 0.1805;
  let Y = r * 0.2126 + g * 0.7152 + b * 0.0722;
  let Z = r * 0.0193 + g * 0.1192 + b * 0.9505;
  // Reference white
  X /= 0.95047; Y /= 1.00000; Z /= 1.08883;
  [X, Y, Z] = [X, Y, Z].map(v => v > 0.008856 ? Math.pow(v, 1/3) : (7.787 * v) + 16/116);
  return {
    L: (116 * Y) - 16,
    A: 500 * (X - Y),
    B: 200 * (Y - Z)
  };
}
window.rgbToLab = rgbToLab;


window.loadPantoneOptions = loadPantoneOptions;
window.generateCMYKOVGSuggestions = generateCMYKOVGSuggestions;
window.renderSuggestions = renderSuggestions;
window.updateColorDisplayFromLab = updateColorDisplayFromLab;
window.updateDeltaE2000 = updateDeltaE2000;
window.updateVisuals = updateVisuals;
window.handleMeasuredLabChange = handleMeasuredLabChange;
window.labToRgb = labToRgb;
window.rgbToCmyk = rgbToCmyk;
window.rgbToLab = rgbToLab;
window.cmykToRgb = cmykToRgb;        
window.cmykovgToRgb = cmykovgToRgb;   
window.handleApplySuggestionClick = handleApplySuggestionClick;

// ===============================
// שלב 1: האזנה לשינוי מודול/ברק
// ===============================
function handleModeOrGlossChange() {
  const measuredLab = {
    L: parseFloat(document.querySelector('input[name="measured_lab_l"]')?.value),
    A: parseFloat(document.querySelector('input[name="measured_lab_a"]')?.value),
    B: parseFloat(document.querySelector('input[name="measured_lab_b"]')?.value)
  };

  const targetLab = {
    L: parseFloat(document.querySelector('input[name="lab_l"]')?.value),
    A: parseFloat(document.querySelector('input[name="lab_a"]')?.value),
    B: parseFloat(document.querySelector('input[name="lab_b"]')?.value)
  };

  const selectedInks = Array.from(
    document.querySelectorAll('input[name="ink"]:checked') || []
  ).map(cb => cb?.value?.toLowerCase()).filter(Boolean);

  if (selectedInks.length === 0) {
    selectedInks.push('c', 'm', 'y', 'k');
  }

  const pressSettings = {
    mode: document.querySelector('input[name="mode"]:checked')?.value || 'M1',
    gloss: document.querySelector('select[name="paper-gloss"]')?.value || 'gloss'
  };

  const suggestions = generateCMYKOVGSuggestions(targetLab, measuredLab, pressSettings, selectedInks, 5);

  // ✅ הדפסת ההצעות לפני ההצגה בטבלה
  console.log("✅ Suggestions:", suggestions);

  renderSuggestions(suggestions, pressSettings);
}

document.querySelectorAll('input[name="mode"]').forEach(radio =>
  radio.addEventListener('change', handleModeOrGlossChange)
);
document.querySelector('select[name="paper-gloss"]').addEventListener('change', handleModeOrGlossChange);