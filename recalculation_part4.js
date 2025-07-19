import { channels } from './constants.js';

export function runRecalculationPart4({ tonePercents, dotAreaValues, lutMatrix, lutTable }) {
  // מחיקת תוכן קודם (קריטי למניעת כפילויות)
  lutTable.innerHTML = "";
  // ====== טבלת Final LUT Table ======
  const lutHeader = document.createElement('h3');
  lutHeader.textContent = 'Final LUT Table';
  lutTable.appendChild(lutHeader);

  const lutResultTable = document.createElement('table');
  lutResultTable.className = 'lut-table';
  lutResultTable.style.borderCollapse = 'collapse';
  lutResultTable.style.width = '100%';
  lutResultTable.style.border = '1px solid #ccc';

  lutResultTable.innerHTML = `
    <thead>
      <tr>
        <th>% Tone</th>
        <th>Cyan</th>
        <th>Magenta</th>
        <th>Yellow</th>
        <th>Black</th>
      </tr>
    </thead>
    <tbody></tbody>
  `;

  // מילוי ערכים מה-LUT (lutMatrix)
  tonePercents
    .filter(tonePercent => tonePercent < 100)
    .forEach(tonePercent => {
      const row = document.createElement('tr');
      const toneCell = document.createElement('td');
      toneCell.textContent = `${tonePercent}%`;
      row.appendChild(toneCell);

      channels.forEach(channel => {
        const cell = document.createElement('td');
        const lutVal = lutMatrix[channel]?.[tonePercent];
        cell.textContent = (lutVal !== undefined && !isNaN(lutVal)) ? lutVal.toFixed(1) + '%' : '-';
        row.appendChild(cell);
      });

      lutResultTable.querySelector('tbody').appendChild(row);
    });

  lutTable.appendChild(lutResultTable);

  // גרף Dot Gain (LUT)
  let graphSection = document.getElementById('dotgain-graph-section');
  if (graphSection) graphSection.remove();

  graphSection = document.createElement('div');
  graphSection.id = 'dotgain-graph-section';
  graphSection.style.marginTop = '36px';
  graphSection.innerHTML = `
    <label for="dotgain-channel-select" style="margin-left:16px;">Select Channel:</label>
    <select id="dotgain-channel-select" style="margin-right:16px;">
      <option value="all">All</option>
      <option value="C">Cyan</option>
      <option value="M">Magenta</option>
      <option value="Y">Yellow</option>
      <option value="K">Black</option>
    </select>
    <canvas id="dotgain-graph" width="600" height="350"></canvas>
  `;
  lutTable.appendChild(graphSection);

  const chartData = channels.map(channel => {
    let points = tonePercents
      .filter(percent => percent < 100)
      .map(percent => ({
        x: percent,
        y: dotAreaValues[channel][percent] !== undefined ? dotAreaValues[channel][percent] : null
      }));

    if (!tonePercents.includes(0)) points.unshift({ x: 0, y: 0 });
    points.push({ x: 100, y: 100 });
    points = points.sort((a, b) => a.x - b.x);

    let color = '';
    switch (channel) {
      case 'C': color = 'cyan'; break;
      case 'M': color = 'magenta'; break;
      case 'Y': color = 'gold'; break;
      case 'K': color = 'black'; break;
    }

    return {
      label: channel === 'C' ? 'Cyan' : channel === 'M' ? 'Magenta' : channel === 'Y' ? 'Yellow' : 'Black',
      borderColor: color,
      backgroundColor: 'transparent',
      data: points,
      hidden: false,
      fill: false,
      tension: 1,
      cubicInterpolationMode: 'monotone'
    };
  });

  let chartInstance = null;
  function renderGraph(selectedChannel) {
    const ctx = document.getElementById('dotgain-graph').getContext('2d');
    if (chartInstance) chartInstance.destroy();
    let datasets = selectedChannel === 'all' ? chartData :
      chartData.filter(ds => ds.label.toLowerCase().startsWith(selectedChannel.toLowerCase()));
    chartInstance = new Chart(ctx, {
      type: 'line',
      data: { datasets },
      options: {
        responsive: false,
        plugins: {
          legend: { display: true },
          title: { display: true, text: 'Dot Area Output vs Input (CMYK)' }
        },
        scales: {
          x: { type: 'linear', title: { display: true, text: 'Input (%)' }, min: 0, max: 100 },
          y: { title: { display: true, text: 'Dot %' }, min: 0, max: 100 }
        }
      }
    });
  }

  document.getElementById('dotgain-channel-select').addEventListener('change', function () {
    renderGraph(this.value);
  });
  renderGraph('all');

  // ====== טבלת TVI (רק אחת, מתחת לגרף ה-LUT) ======
  const tviHeader = document.createElement('h3');
  tviHeader.textContent = `TVI (Dot Gain) Table`;
  lutTable.appendChild(tviHeader);

  const tviTable = document.createElement('table');
  tviTable.className = 'lut-table';
  tviTable.innerHTML = `
    <thead>
      <tr>
        <th>% Tone</th>
        <th>Cyan</th>
        <th>Magenta</th>
        <th>Yellow</th>
        <th>Black</th>
      </tr>
    </thead>
    <tbody></tbody>
  `;

  tonePercents
    .filter(tonePercent => tonePercent < 100)
    .forEach(tonePercent => {
      const row = document.createElement('tr');
      const toneCell = document.createElement('td');
      toneCell.textContent = `${tonePercent}%`;
      row.appendChild(toneCell);

      channels.forEach(channel => {
        const cell = document.createElement('td');
        const lutVal = lutMatrix[channel]?.[tonePercent];
        if (lutVal === undefined || lutVal === null || isNaN(lutVal)) {
          cell.textContent = '-';
        } else {
          const tvi = lutVal - tonePercent;
          cell.textContent = `${tvi.toFixed(1)}%`;
        }
        row.appendChild(cell);
      });

      tviTable.querySelector('tbody').appendChild(row);
    });

  lutTable.appendChild(tviTable);

  // ====== גרף TVI ======
  let tviGraphSection = document.getElementById('tvi-graph-section');
  if (tviGraphSection) tviGraphSection.remove();

  tviGraphSection = document.createElement('div');
  tviGraphSection.id = 'tvi-graph-section';
  tviGraphSection.style.margin = '32px 0 0 0';
  tviGraphSection.innerHTML = `
    <label for="tvi-channel-select" style="margin-left:16px;">Select Channel:</label>
    <select id="tvi-channel-select" style="margin-right:16px;">
      <option value="all">All</option>
      <option value="C">Cyan</option>
      <option value="M">Magenta</option>
      <option value="Y">Yellow</option>
      <option value="K">Black</option>
    </select>
    <canvas id="tvi-graph" width="600" height="350"></canvas>
  `;
  lutTable.appendChild(tviGraphSection);

  const tviChartData = channels.map(channel => {
    let points = tonePercents
      .filter(percent => percent < 100)
      .map(percent => ({
        x: percent,
        y: lutMatrix[channel] && lutMatrix[channel][percent] !== undefined ? lutMatrix[channel][percent] - percent : null
      }));

    points.push({ x: 100, y: 0 });
    if (!tonePercents.includes(0)) points.unshift({ x: 0, y: 0 });
    points = points.sort((a, b) => a.x - b.x);

    let color = '';
    switch (channel) {
      case 'C': color = 'cyan'; break;
      case 'M': color = 'magenta'; break;
      case 'Y': color = 'gold'; break;
      case 'K': color = 'black'; break;
    }

    return {
      label: channel === 'C' ? 'Cyan' : channel === 'M' ? 'Magenta' : channel === 'Y' ? 'Yellow' : 'Black',
      borderColor: color,
      backgroundColor: 'transparent',
      data: points,
      hidden: false,
      fill: false,
      tension: 1,
      cubicInterpolationMode: 'monotone'
    };
  });

  let tviChartInstance = null;
  function renderTviGraph(selectedChannel) {
    const ctx = document.getElementById('tvi-graph').getContext('2d');
    if (tviChartInstance) tviChartInstance.destroy();
    let datasets = selectedChannel === 'all' ? tviChartData :
      tviChartData.filter(ds => ds.label.toLowerCase().startsWith(selectedChannel.toLowerCase()));
    tviChartInstance = new Chart(ctx, {
      type: 'line',
      data: { datasets },
      options: {
        responsive: false,
        plugins: {
          legend: { display: true },
          title: { display: true, text: 'TVI (Dot Gain) vs Input (CMYK)' }
        },
        scales: {
          x: { type: 'linear', title: { display: true, text: 'Input (%)' }, min: 0, max: 100 },
          y: { title: { display: true, text: 'TVI (%)' }, min: 0, max: 30 }
        }
      }
    });
  }

  document.getElementById('tvi-channel-select').addEventListener('change', function () {
    renderTviGraph(this.value);
  });
  renderTviGraph('all');
}
