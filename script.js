import { updateDensityDisplay } from './densities.js';

let chartInstance = null;

const channels = ['c', 'm', 'y', 'k', 'o', 'v', 'g'];
const channelColors = {
  c: 'cyan',
  m: 'magenta',
  y: 'yellow',
  k: 'black',
  o: 'orange',
  v: 'violet',
  g: 'green'
};

// 🔄 שמירת מצב אוטומטית של כל השדות
function saveFormState() {
  const inputs = document.querySelectorAll('input[type="number"]');
  const data = {};
  inputs.forEach(input => {
    if (input.name) data[input.name] = input.value;
  });

  // שמירת אחוזים נוספים בטבלה (בלי 40 ו-80)
  const extraPercents = Array.from(document.querySelectorAll('#existing-sample-table tbody tr'))
    .map(row => row.firstElementChild?.innerText?.replace('%', '').trim())
    .filter(p => p !== '40' && p !== '80');

  localStorage.setItem('dotGainInputs', JSON.stringify(data));
  localStorage.setItem('dotGainExtraPoints', JSON.stringify(extraPercents));
  console.log('[✔] Saved form state:', { data, extraPercents });
}

// ♻️ שחזור מצב מה־localStorage
function restoreFormState() {
  const saved = localStorage.getItem('dotGainInputs');
  const extra = localStorage.getItem('dotGainExtraPoints');
  if (!saved) {
    console.log('[ℹ] No saved form state found');
    return;
  }

  const data = JSON.parse(saved);
  const extraPercents = JSON.parse(extra || '[]');
  console.log('[✔] Restoring form state...', { data, extraPercents });

  // הוספת שורות נוספות (מעבר ל-40 ו-80) אם לא קיימות
  extraPercents.forEach(percent => {
    if (!document.getElementById(`row_${percent}`)) {
      addMeasurementRow(+percent);
    }
  });

  // שחזור הערכים לתיבות הקלט
  Object.entries(data).forEach(([name, value]) => {
    const input = document.querySelector(`[name="${name}"]`);
    if (input) input.value = value;
  });
}

// ➕ הוספת שורה לטבלה
function addMeasurementRow(percent) {
  console.log(`[🔁] Adding row for ${percent}%`);

  if (!Number.isInteger(percent) || percent <= 0 || percent >= 100) {
    console.warn(`[⚠️] Invalid percentage: ${percent}. Row will not be added.`);
    return;
  }

  const existingTable = document.querySelector('#existing-sample-table tbody');
  const newTable = document.querySelector('#new-sample-table tbody');

  if (!existingTable || !newTable) {
    console.error('[❌] Tables not found');
    return;
  }

  // שורת "אתמול"
  const oldRow = document.createElement('tr');
  oldRow.id = `row_${percent}`;
  oldRow.innerHTML = `
    <td>${percent}%</td>
    <td><input name="c_old_${percent}" type="number" value="${localStorage.getItem('c_old_' + percent) || ''}" /></td>
    <td><input name="m_old_${percent}" type="number" value="${localStorage.getItem('m_old_' + percent) || ''}" /></td>
    <td><input name="y_old_${percent}" type="number" value="${localStorage.getItem('y_old_' + percent) || ''}" /></td>
    <td><input name="k_old_${percent}" type="number" value="${localStorage.getItem('k_old_' + percent) || ''}" /></td>
    <td><button type="button" class="delete-row-btn">🗑️</button></td>
  `;

  // שורת "היום"
  const newRow = document.createElement('tr');
  newRow.id = `new_row_${percent}`;
  newRow.innerHTML = `
    <td>${percent}%</td>
    <td><input name="c_new_${percent}" type="number" value="${localStorage.getItem('c_new_' + percent) || ''}" /></td>
    <td><input name="m_new_${percent}" type="number" value="${localStorage.getItem('m_new_' + percent) || ''}" /></td>
    <td><input name="y_new_${percent}" type="number" value="${localStorage.getItem('y_new_' + percent) || ''}" /></td>
    <td><input name="k_new_${percent}" type="number" value="${localStorage.getItem('k_new_' + percent) || ''}" /></td>
  `;

  // הכנסת השורות למיקום הנכון לפי אחוז
  const insertBeforeOld = Array.from(existingTable.children).find(row => {
    const val = row.firstElementChild?.innerText?.replace('%', '');
    return !isNaN(val) && Number(val) > percent;
  });

  const insertBeforeNew = Array.from(newTable.children).find(row => {
    const val = row.firstElementChild?.innerText?.replace('%', '');
    return !isNaN(val) && Number(val) > percent;
  });

  if (insertBeforeOld) existingTable.insertBefore(oldRow, insertBeforeOld);
  else existingTable.appendChild(oldRow);

  if (insertBeforeNew) newTable.insertBefore(newRow, insertBeforeNew);
  else newTable.appendChild(newRow);

  // מאזינים לשינויים שיחסכו אוטומטית
  const allInputs = [...oldRow.querySelectorAll('input'), ...newRow.querySelectorAll('input')];
  allInputs.forEach(input => input.addEventListener('input', saveFormState));

  saveFormState();
  console.log(`[✔] Added row for ${percent}% successfully`);
}

// פונקציית אינטרפולציה ליניארית
function interpolate(points) {
  points.sort((a, b) => a.x - b.x);
  return x => {
    if (x <= points[0].x) {
      const [p1, p2] = [points[0], points[1]];
      return p1.y + ((x - p1.x) * (p2.y - p1.y)) / (p2.x - p1.x);
    }
    if (x >= points.at(-1).x) {
      const [p1, p2] = [points.at(-2), points.at(-1)];
      return p2.y + ((x - p2.x) * (p2.y - p1.y)) / (p2.x - p1.x);
    }
    for (let i = 0; i < points.length - 1; i++) {
      const [p1, p2] = [points[i], points[i + 1]];
      if (x >= p1.x && x <= p2.x) {
        const ratio = (x - p1.x) / (p2.x - p1.x);
        return p1.y + ratio * (p2.y - p1.y);
      }
    }
    return 0;
  };
}

// תיקון משוקלל בין מדידה קיימת לחדשה
function getWeightedCorrection(T, M) {
  return Math.round((T + M) / 2);
}

// פונקציית חישוב Dot Gain והצגת תוצאות וגרף
function handleDotGainCalculation(e) {
  e.preventDefault();
  saveFormState();

  const oldData = {};
  const newData = {};
  channels.forEach(ch => {
    oldData[ch] = [];
    newData[ch] = [];
  });

  // אחוזים ייחודיים מכל ערוצי "החדש"
  const percents = Array.from(document.querySelectorAll('input[name*="_new_"]'))
    .map(input => input.name.match(/_(\d+)$/)?.[1])
    .filter(Boolean)
    .map(Number);
  const uniquePercents = [...new Set(percents)].sort((a, b) => a - b);

  // איסוף הנתונים מכל ערוץ ואחוז
  uniquePercents.forEach(percent => {
    channels.forEach(ch => {
      const T = +document.querySelector(`input[name="${ch}_old_${percent}"]`)?.value || 0;
      const M = +document.querySelector(`input[name="${ch}_new_${percent}"]`)?.value || 0;
      oldData[ch].push({ x: percent, y: T });
      newData[ch].push({ x: percent, y: M });
    });
  });

  // יצירת פונקציית אינטרפולציה לכל ערוץ עם נקודות 0 ו-100 אם חסרות
  const interpolatedData = {};
  channels.forEach(ch => {
    const data = [...newData[ch]];
    if (!data.find(p => p.x === 0)) data.unshift({ x: 0, y: 0 });
    if (!data.find(p => p.x === 100)) data.push({ x: 100, y: 100 });
    const f = interpolate(data);
    interpolatedData[ch] = Array.from({ length: 101 }, (_, x) => ({ x, y: +f(x).toFixed(2) }));
  });

  // הצגת טבלת תיקון
  const resultDiv = document.getElementById('dot-gain-results');
  const cmyk = ['c', 'm', 'y', 'k'];
  let html = `
    <h3>Correction Table</h3>
    <table class="lut-table"><thead>
      <tr>
        <th>Input %</th><th>Channel</th>
        <th>Existing Sample</th><th>Printed Sample</th><th>Correction</th>
      </tr></thead><tbody>
  `;

  uniquePercents.forEach(percent => {
    cmyk.forEach(ch => {
      const T = +document.querySelector(`input[name="${ch}_old_${percent}"]`)?.value;
      const M = +document.querySelector(`input[name="${ch}_new_${percent}"]`)?.value;
      if (isNaN(T) || isNaN(M)) return;
      const corrected = getWeightedCorrection(T, M);
      const isOut = corrected < 0 || corrected > 100;
      html += `
  <tr${isOut ? ' style="background-color:#ffe6e6;color:#900;"' : ''}>
    <td>${percent}%</td>
    <td class="channel-${ch.toUpperCase()}">${ch.toUpperCase()}</td>
    <td>${T}</td>
    <td>${M}</td>
    <td class="correction-cell">${corrected}${isOut ? ' ⚠️' : ''}</td>
  </tr>`;
    });
  });

  html += '</tbody></table>';
  resultDiv.innerHTML = html;

  // עדכון הגרף
  if (chartInstance) {
    chartInstance.data.datasets = cmyk.map(ch => ({
      label: ch.toUpperCase(),
      data: interpolatedData[ch],
      borderColor: channelColors[ch],
      backgroundColor: channelColors[ch],
      fill: false,
      tension: 0.3,
      pointRadius: 0
    }));
    updateChartVisibility();
  }
}

// פונקציה לעדכון גלוי/הסתרת ערוצי הגרף בהתאם לבחירה
function updateChartVisibility() {
  const channelSelect = document.getElementById('channel-select');
  if (!channelSelect) {
    console.warn('⚠️ channel-select element not found');
    return;
  }

  const selected = channelSelect.value.toLowerCase();
  console.log(`📌 Selected channel: ${selected}`);

  chartInstance.data.datasets.forEach(ds => {
    const label = ds.label.toLowerCase();
    ds.hidden = selected !== 'all' && selected !== label;
    console.log(`🔍 Dataset "${label}" hidden: ${ds.hidden}`);
  });

  chartInstance.update();
  console.log(`📊 Chart updated with filter: ${selected}`);
}

// יצירת הגרף עם Chart.js
function initDotGainChart() {
  const ctx = document.getElementById('dot-gain-chart')?.getContext('2d');
  if (!ctx) return;

  chartInstance = new Chart(ctx, {
    type: 'line',
    data: { datasets: [] },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'top' },
        title: { display: true, text: 'Dot Area Output vs Input (CMYK)' }
      },
      scales: {
        x: { type: 'linear', min: 0, max: 100, title: { display: true, text: 'Input (%)' } },
        y: { min: 0, max: 100, title: { display: true, text: 'Output (%)' } }
      }
    }
  });
}

// 🚀 טעינה ראשונית
document.addEventListener('DOMContentLoaded', () => {
  initDotGainChart();
  restoreFormState();
  updateDensityDisplay();

  // מאזינים לשינוי בשדות הקלט
  document.querySelectorAll('#existing-sample-table input[type="number"], #new-sample-table input[type="number"]').forEach(input => {
    input.addEventListener('input', saveFormState);
  });

  // טיפול בשליחת הטופס
  document.getElementById('dot-gain-form')?.addEventListener('submit', handleDotGainCalculation);

  // טיפול בכפתור הוספת נקודה
  document.getElementById('add-point-btn')?.addEventListener('click', () => {
    const input = document.getElementById('new-percentage');
    const val = Number(input.value);

    if (!Number.isInteger(val) || val <= 0 || val >= 100) {
      alert('נא להזין מספר שלם בין 1 ל-99 בלבד.');
      return;
    }

    if (document.getElementById(`row_${val}`)) {
      alert(`שורה עבור ${val}% כבר קיימת.`);
      return;
    }

    addMeasurementRow(val);
    input.value = '';
  });

  // טיפול בכפתור מחיקה דינמי לשורות בטבלה
  document.addEventListener('click', e => {
    if (!e.target.classList.contains('delete-row-btn')) return;
    const row = e.target.closest('tr');
    const percent = row?.firstElementChild?.innerText?.replace('%', '').trim();
    if (row) row.remove();
    const newRow = document.getElementById(`new_row_${percent}`);
    if (newRow) newRow.remove();
    saveFormState();
  });
});
