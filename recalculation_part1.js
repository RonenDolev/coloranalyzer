import { dotAreaTargets } from './dotarea_targets.js';
import { iccLUT } from './iccLUT.js';
import { channels, GRAY_BALANCE_WEIGHT } from './constants.js';
import { getTonePercentsFromInputs } from './tonePercents.js';

export function runRecalculationPart1({ PROFILE } = {}) {
  const lutTable = document.getElementById('icc-lut-results');
  if (!lutTable) return null;

  // לא מוחקים ולא מוסיפים לטבלה! רק מחשבים

  if (!PROFILE) {
    PROFILE = document.querySelector('select[name="fogra-standard"]')?.value || 'fogra51';
  }

  if (!dotAreaTargets[PROFILE] || !iccLUT[PROFILE]) {
    lutTable.innerHTML = `<div style="color:red">Profile "${PROFILE}" not found</div>`;
    return null;
  }

  const tonePercents = getTonePercentsFromInputs();

  // --- תמיד מחשב dot area מהדנסיטי אם יש, אחרת מה-input ---
  const dotAreaValues = {};
  channels.forEach(channel => {
    dotAreaValues[channel] = {};
    tonePercents.forEach(percent => {
      // חישוב dotArea מתוך דנסיטי (אם יש)
      const D = parseFloat(document.querySelector(`input[name="density_${channel}_${percent}"]`)?.value);
      const D0 = 0; // נניח אפס כי אין שדה מתאים
      const D100 = parseFloat(document.querySelector(`input[name="density_${channel}"]`)?.value);
      const n = parseFloat(document.querySelector(`input[name="yn_param"]`)?.value) || 1.8;

      if (!isNaN(D) && !isNaN(D0) && !isNaN(D100) && D100 !== D0) {
        const dotArea = Math.pow((D - D0) / (D100 - D0), 1 / n) * 100;
        if (isFinite(dotArea)) {
          dotAreaValues[channel][percent] = dotArea;
        }
      } else {
        // אם אין דנסיטי, שלוף dotArea מה-input
        let val = document.querySelector(`input[name="dotarea_${channel}_${percent}"]`)?.value;
        if (val !== undefined && val !== null && val !== "" && !isNaN(val)) {
          dotAreaValues[channel][percent] = parseFloat(val);
        }
      }
    });
  });

  // --- שליפת דנסיטי נמדד מה־UI בלבד ---
  const densityMeasured = {};
  channels.forEach(channel => {
    const val = document.querySelector(`input[name="density_${channel}"]`)?.value;
    if (val && !isNaN(val)) {
      densityMeasured[channel] = parseFloat(val);
    }
  });

  // דיבאג סופי
  console.log('---- runRecalculationPart1 output ----');
  console.log('PROFILE:', PROFILE);
  console.log('tonePercents:', tonePercents);
  console.log('dotAreaValues:', dotAreaValues);
  console.log('densityMeasured:', densityMeasured);

  // לא מוחזרים אלמנטים או טבלאות!
  return { lutTable, PROFILE, tonePercents, dotAreaValues, densityMeasured };
}
