import { channels, GRAY_BALANCE_WEIGHT } from './constants.js';
import { getDensityFactor } from './density_factors.js';
import { deltaE2000 } from './util.js';
import { dotAreaTargets as importedDotAreaTargets } from './dotarea_targets.js';

function normalizeProfileName(name) {
  if (!name) return '';
  return name
    .trim()
    .toLowerCase()
    .replace(/\.icc$/, '')
    .replace(/\s*\(.+\)$/, '')
    .replace(/\s+/g, '_');
}

export function runRecalculationPart3({
  PROFILE,
  dotAreaTargets = importedDotAreaTargets,
  tonePercents,
  dotAreaValues,
  grayLAB,
  densityMeasured,
  densityTargets,
  lutResultTable
}) {
  if (!lutResultTable) {
    lutResultTable = document.getElementById('icc-lut-results');
  }
  if (!lutResultTable) {
    console.error('Element #icc-lut-results לא נמצא בדף');
    return {};
  }

  let table = lutResultTable.querySelector('table');
  if (!table) {
    table = document.createElement('table');
    table.style.borderCollapse = 'collapse';
    lutResultTable.innerHTML = '';
    lutResultTable.appendChild(table);
  }

  let tbody = table.querySelector('tbody');
  if (!tbody) {
    tbody = document.createElement('tbody');
    table.appendChild(tbody);
  }
  tbody.innerHTML = '';

  if (!table.querySelector('thead')) {
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');

    const thEmpty = document.createElement('th');
    headerRow.appendChild(thEmpty);

    channels.forEach(ch => {
      const th = document.createElement('th');
      th.textContent = ch;
      th.style.border = '1px solid #ccc';
      th.style.padding = '4px';
      headerRow.appendChild(th);
    });

    thead.appendChild(headerRow);
    table.insertBefore(thead, tbody);
  }

  table.style.width = '100%';
  table.style.border = '1px solid #ccc';

  const lutMatrix = {};
  channels.forEach(channel => {
    lutMatrix[channel] = {};
  });

  tonePercents.filter(tonePercent => tonePercent < 100).forEach(targetPercent => {
    const row = document.createElement('tr');
    row.style.border = '1px solid #ccc';

    const toneCell = document.createElement('td');
    toneCell.textContent = `${targetPercent}%`;
    toneCell.style.border = '1px solid #ccc';
    toneCell.style.padding = '4px';
    row.appendChild(toneCell);

    channels.forEach(channel => {
      const cell = document.createElement('td');
      cell.style.border = '1px solid #ccc';
      cell.style.padding = '4px';

      // 1. dotAreaTarget (יעד מהפרופיל)
      const dotAreaTarget = dotAreaTargets[PROFILE]?.[targetPercent]?.[channel];
      if (dotAreaTarget === undefined) {
        cell.textContent = '-';
        lutMatrix[channel][targetPercent] = undefined;
        row.appendChild(cell);
        return;
      }

      // 2. מערך dotAreaMeasured לפי אחוזי מדידה, כולל שקלול דלתא-E (C/M/Y)
      const percentArr = Object.keys(dotAreaValues[channel] || {})
        .map(k => parseFloat(k))
        .filter(k => !isNaN(k))
        .sort((a, b) => a - b);

      const dotAreaArr = percentArr.map(percent => {
        let val = dotAreaValues[channel][percent];
        // פיצוי אפורים
        if (['C', 'M', 'Y'].includes(channel) && grayLAB?.[percent] && dotAreaTargets[PROFILE]?.[percent]?.[channel + '_LAB']) {
          const measuredLab = grayLAB[percent];
          const targetLab = dotAreaTargets[PROFILE][percent][channel + '_LAB'];
          if (measuredLab && targetLab) {
            const dE = deltaE2000(measuredLab, targetLab);
            if (
              (channel === 'C' && measuredLab.b < -1) ||
              (channel === 'M' && measuredLab.a > 1) ||
              (channel === 'Y' && measuredLab.b > 1)
            ) {
              val += 0.2 * dE;
            }
          }
        }
        return { percent, dotArea: val };
      });

      // 3. אינטרפולציה למציאת ToneInput עבור dotAreaTarget
      let ToneInput = percentArr[0]; // ברירת מחדל אם אין טווח
      for (let i = 0; i < dotAreaArr.length - 1; i++) {
        const curr = dotAreaArr[i], next = dotAreaArr[i + 1];
        if (
          (curr.dotArea <= dotAreaTarget && dotAreaTarget <= next.dotArea) ||
          (curr.dotArea >= dotAreaTarget && dotAreaTarget >= next.dotArea)
        ) {
          const t = (dotAreaTarget - curr.dotArea) / (next.dotArea - curr.dotArea);
          ToneInput = curr.percent + (next.percent - curr.percent) * t;
          break;
        }
      }

      // 4. חישוב הערך הסופי ל־LUT
      let lutValue = dotAreaTarget - (ToneInput - targetPercent);
          
      // 5. הגבלת מינימום (לא פחות מהטון)
      lutValue = Math.max(targetPercent, Math.min(lutValue, 98));

      cell.textContent = lutValue.toFixed(1);
      lutMatrix[channel][targetPercent] = lutValue;
      row.appendChild(cell);
    });

    tbody.appendChild(row);
  });

  console.log('LUT Table generated:', lutResultTable.innerHTML);
  return lutMatrix;
}
