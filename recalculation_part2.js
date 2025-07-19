import { channels, GRAY_BALANCE_WEIGHT } from './constants.js';

export function runRecalculationPart2({ lutTable, PROFILE, tonePercents, dotAreaValues }) {
  // שליפת LAB אפורים מה־UI
  const grayLAB = {};
  document.querySelectorAll('input[name^="gray_"]').forEach(input => {
    const m = input.name.match(/^gray_(\d+)_(l|a|b)$/);
    if (m) {
      const lVal = m[1], type = m[2];
      if (!grayLAB[lVal]) grayLAB[lVal] = {};
      grayLAB[lVal][type] = parseFloat(input.value);
    }
  });

  // שליפת דנסיטי מהשדות המתאימים (ולא 0 אם אין)
  const densityMeasured = {};
  channels.forEach(channel => {
    const input = document.querySelector(`input[name="density_${channel}"]`);
    console.log(`Input element for density_${channel}:`, input);
    if (input && input.value !== '') {
      densityMeasured[channel] = parseFloat(input.value);
    }
  });
  console.log('densityMeasured:', densityMeasured);

  // יעד דנסיטי (ניתן לשנות)
  const gloss = document.querySelector('select[name="paper-gloss"]')?.value || 'gloss';
  const mode = document.querySelector('input[name="mode"]:checked')?.value || 'M1';
  const densityTargets = window.standardDensity?.[mode]?.[gloss] || { C: 1.4, M: 1.4, Y: 1.0, K: 1.7 };

  // --- כאן מחקת את יצירת הכותרת והטבלה! ---

  return { grayLAB, densityMeasured, densityTargets };
}