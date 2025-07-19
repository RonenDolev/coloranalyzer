import { deltaE, getMeasuredLabFromInputs, getTargetDotAreaFromLab } from './util.js';
import { runRecalculation } from './logic.js';
import { channels } from './constants.js'; 
import { iccLUT } from './iccLUT.js';
import { g7GrayBalanceTargets } from './g7GrayBalanceTargets.js';
import defaultDensities from './defaultDensities.js';

window.standardDensity = defaultDensities;

// Utils
function normalizeProfileName(name) {
  if (!name) return '';
  return name.trim().toLowerCase().replace(/\.icc$/, '').replace(/\s*\(.+\)$/, '').replace(/\s+/g, '_');
}

// Constants
const allChannels = channels || ['C', 'M', 'Y', 'K'];
const dotPercents = [20, 40, 60, 80];
const grayLvals = [90, 80, 70, 60, 50, 40, 30];

// Render CMYK and Gray Inputs
export function renderCMYKandGrayInputs() {
  const select = document.querySelector('select[name="fogra-standard"]');
  const selectedStandard = select?.value || 'fogra39';
  runRecalculation({ PROFILE: selectedStandard });

  const gloss = document.querySelector('select[name="paper-gloss"]')?.value || 'gloss';
  const densityDefaults = defaultDensities[gloss] || {};
  const mode = document.querySelector('input[name="mode"]:checked')?.value || 'M1';

  const percents = [...dotPercents, 'Density'];
  const cmykContainer = document.getElementById('manual-cmyk-inputs');
  const grayContainer = document.getElementById('manual-gray-inputs');
  const standardDisplay = document.getElementById('selected-standard-display');

  if (standardDisplay) {
    standardDisplay.style.marginBottom = '10px';
    standardDisplay.textContent = `The standard is: ${selectedStandard}`;
  }

  // Dot Area Table (renamed to Density Table)
  const dotAreaWrapper = document.createElement('div');
  dotAreaWrapper.style.marginTop = '30px';

  const dotAreaTitle = document.createElement('div');
  dotAreaTitle.textContent = 'Measured Density (%) for CMYK Channels';
  dotAreaWrapper.appendChild(dotAreaTitle);

  const dotTable = document.createElement('table');
  dotTable.style.borderCollapse = 'collapse';
  dotTable.style.marginTop = '10px';
  dotTable.style.width = '100%';
  dotTable.style.border = '1px solid #aaa';

  // Header row
  const dotHeaderRow = document.createElement('tr');
  const emptyTh = document.createElement('th');
  emptyTh.textContent = '';
  emptyTh.style.border = '1px solid #ccc';
  emptyTh.style.padding = '4px';
  dotHeaderRow.appendChild(emptyTh);

  percents.forEach(p => {
    const th = document.createElement('th');
    th.textContent = p === 'Density' ? 'Density (100%)' : `${p}%`;
    if (p === 'Density') th.style.paddingLeft = '40px';
    th.style.textAlign = 'center';
    th.style.border = '1px solid #ccc';
    th.style.padding = '4px';
    dotHeaderRow.appendChild(th);
  });
  dotTable.appendChild(dotHeaderRow);

  // Rows per channel
  allChannels.forEach(channel => {
    const row = document.createElement('tr');

    const channelTd = document.createElement('td');
    channelTd.textContent = channel;
    channelTd.style.textAlign = 'center';
    channelTd.style.border = '1px solid #ccc';
    channelTd.style.padding = '4px';
    row.appendChild(channelTd);

    percents.forEach(p => {
      const td = document.createElement('td');
      if (p === 'Density') td.style.paddingLeft = '40px';
      td.style.border = '1px solid #ccc';
      td.style.padding = '4px';

      const input = document.createElement('input');
      input.type = 'number';
      input.step = '0.01';
      input.style.width = '50px';
      input.style.display = 'inline-block';
      input.style.margin = '0 auto';
      input.style.textAlign = 'center';
      input.style.verticalAlign = 'middle';

      if (p !== 'Density') {
        input.name = `density_${channel}_${p}`;
        if (
          densityDefaults[channel] &&
          densityDefaults[channel][p] !== undefined
        ) {
          input.value = densityDefaults[channel][p];
        } else {
          input.value = '';
        }
      } else {
        input.name = `density_${channel}`;
        input.id = `density_${channel}_real`;
        if (
          densityDefaults[channel] &&
          densityDefaults[channel]['100'] !== undefined
        ) {
          input.value = densityDefaults[channel]['100'];
        } else {
          input.value = '';
        }
      }
      td.appendChild(input);
      row.appendChild(td);
    });

    dotTable.appendChild(row);
  });

  dotAreaWrapper.appendChild(dotTable);

  if (cmykContainer) {
    cmykContainer.innerHTML = '';
    cmykContainer.appendChild(dotAreaWrapper);
  }

  // Gray LAB Inputs
  const grayInputsWrapper = document.createElement('div');
  grayInputsWrapper.style.marginTop = '30px';

  const grayInputsTitle = document.createElement('div');
  grayInputsTitle.textContent = 'Measured LAB for Grays';
   grayInputsTitle.style.marginBottom = '12px';
  grayInputsWrapper.appendChild(grayInputsTitle);

  const headerRow = document.createElement('div');
  headerRow.style.display = 'flex';
  headerRow.style.gap = '10px';
  headerRow.style.marginBottom = '6px';

  grayLvals.forEach(L => {
    const label = document.createElement('div');
    label.textContent = `L* ${L}`;
    label.style.textAlign = 'center';
    label.style.width = '70px';
    headerRow.appendChild(label);
  });
  grayInputsWrapper.appendChild(headerRow);

  const inputRow = document.createElement('div');
  inputRow.style.display = 'flex';
  inputRow.style.gap = '10px';

  grayLvals.forEach(L => {
    const block = document.createElement('div');
    block.style.display = 'flex';
    block.style.flexDirection = 'column';
    block.style.alignItems = 'center';
    block.style.gap = '4px';

    ['l', 'a', 'b'].forEach(key => {
      const input = document.createElement('input');
      input.type = 'number';
      input.step = '0.01';
      input.placeholder = `${key}*`;
      input.name = `gray_${L}_${key}`;
      input.style.width = '60px';
      input.style.textAlign = 'center';
      input.style.fontSize = '14px';

      // Defaults from table, not localStorage
      let defaultVal = '';
      if (g7GrayBalanceTargets[L]) {
        if (key === 'l') defaultVal = g7GrayBalanceTargets[L].L;
        if (key === 'a') defaultVal = g7GrayBalanceTargets[L].a;
        if (key === 'b') defaultVal = g7GrayBalanceTargets[L].b;
      }
      input.value = defaultVal !== undefined ? defaultVal : '';

      renderGrayDeltaERow();
      input.addEventListener('input', renderGrayDeltaERow);
      block.appendChild(input);
    });

    inputRow.appendChild(block);
  });

  grayInputsWrapper.appendChild(inputRow);

  // Function to refresh ΔE row
  function renderGrayDeltaERow() {
    if (grayInputsWrapper._deltaETitle) {
      grayInputsWrapper.removeChild(grayInputsWrapper._deltaETitle);
      grayInputsWrapper._deltaETitle = null;
    }
    if (grayInputsWrapper._deltaERow) {
      grayInputsWrapper.removeChild(grayInputsWrapper._deltaERow);
      grayInputsWrapper._deltaERow = null;
      
    }

    const deltaETitle = document.createElement('div');
    deltaETitle.textContent = 'ΔE2000';
    deltaETitle.style.fontSize = '14px';
    deltaETitle.style.fontWeight = 'bold';
    deltaETitle.style.marginTop = '6px';
    deltaETitle.style.marginBottom = '0px';
    deltaETitle.style.display = 'flex';
    deltaETitle.style.gap = '10px';
    deltaETitle.style.justifyContent = 'flex-start';
    grayInputsWrapper.appendChild(deltaETitle);
    grayInputsWrapper._deltaETitle = deltaETitle;

    const deltaERow = document.createElement('div');
    deltaERow.style.display = 'flex';
    deltaERow.style.gap = '10px';
    deltaERow.style.marginTop = '6px';

    const profileSelect = document.querySelector('select[name="fogra-standard"]');
    const selectedProfile = (profileSelect?.value || '').toLowerCase();
    const grayChannel = 'K';

    grayLvals.forEach((L) => {
      const lInput = document.querySelector(`input[name="gray_${L}_l"]`);
      const aInput = document.querySelector(`input[name="gray_${L}_a"]`);
      const bInput = document.querySelector(`input[name="gray_${L}_b"]`);
      const l = lInput ? parseFloat(lInput.value) : NaN;
      const a = aInput ? parseFloat(aInput.value) : NaN;
      const b = bInput ? parseFloat(bInput.value) : NaN;

      let ideal = null;
      if (
        window.iccLUT &&
        window.iccLUT[selectedProfile] &&
        window.iccLUT[selectedProfile][L] &&
        window.iccLUT[selectedProfile][L][grayChannel]
      ) {
        const iccVal = window.iccLUT[selectedProfile][L][grayChannel];
        ideal = {
          L: iccVal.L,
          a: iccVal.a !== undefined ? iccVal.a : iccVal.A,
          b: iccVal.b !== undefined ? iccVal.b : iccVal.B,
        };
      } else {
        ideal = { L: L, a: 0, b: 0 };
      }

      let deltaEVal = '';
      if (!isNaN(l) && !isNaN(a) && !isNaN(b) && ideal) {
        deltaEVal = deltaE({ L: l, a: a, b: b }, ideal).toFixed(2);
      }

      const resultInput = document.createElement('input');
      resultInput.type = 'text';
      resultInput.readOnly = true;
      resultInput.style.width = '60px';
      resultInput.style.textAlign = 'center';
      resultInput.style.marginTop = '4px';
      resultInput.style.border = '1px solid #ccc';
      resultInput.value = deltaEVal !== '' ? deltaEVal : '';
      resultInput.style.color = deltaEVal > 2 ? 'red' : 'black';
      resultInput.style.background = '#f8f8f8';
      resultInput.style.fontSize = '14px';

      deltaERow.appendChild(resultInput);
    });

    grayInputsWrapper.appendChild(deltaERow);
    grayInputsWrapper._deltaERow = deltaERow;
  }

  renderGrayDeltaERow();

  if (cmykContainer) {
    cmykContainer.innerHTML = '';
    cmykContainer.appendChild(dotAreaWrapper);
  }
  if (grayContainer) {
    grayContainer.innerHTML = '';
    grayContainer.appendChild(grayInputsWrapper);
  }

  setTimeout(() => {
    const middlePanel = document.getElementById('panel-middle');
    if (!middlePanel) return;
    middlePanel.style.display = 'block';
    middlePanel.style.visibility = 'visible';
    middlePanel.style.opacity = '1';
    middlePanel.style.height = 'auto';
    middlePanel.style.overflow = 'visible';
    Array.from(middlePanel.querySelectorAll('input')).forEach(el => {
      el.style.display = 'inline-block';
      el.style.visibility = 'visible';
      el.style.opacity = '1';
    });
  }, 100);
}

// Render Density Inputs (Side panel)
export function renderDensityInputs(densityContainerId = 'density-column') {
  const container = document.getElementById(densityContainerId);
  if (!container) return;
  container.innerHTML = '';
  container.style.marginLeft = '60px';
  container.style.borderLeft = '1px solid #ccc';
  container.style.paddingLeft = '20px';

  const mode = document.querySelector('input[name="mode"]:checked')?.value || 'M1';
  const gloss = document.querySelector('select[name="paper-gloss"]')?.value || 'gloss';
  const densityDefaults = window.standardDensity?.[mode]?.[gloss] || {};

  const title = document.createElement('div');
  title.textContent = 'Density Values';
  title.style.fontWeight = 'bold';
  title.style.marginBottom = '8px';
  container.appendChild(title);

  window._densityInputsByChannel ??= {};
  allChannels.forEach(ch => {
    const wrapper = document.createElement('div');
    wrapper.style.display = 'flex';
    wrapper.style.alignItems = 'center';
    wrapper.style.gap = '6px';
    wrapper.style.marginBottom = '4px';

    const label = document.createElement('label');
    label.textContent = ch;
    label.style.width = '20px';

    const input = document.createElement('input');
    input.type = 'number';
    input.step = '0.01';
    input.min = '0';
    input.max = '5';
    input.name = `density_${ch}`;
    input.style.width = '60px';
    input.style.textAlign = 'center';

    if (densityDefaults[ch] !== undefined) {
      input.value = densityDefaults[ch].toFixed(2);
    } else {
      input.value = '';
    }

    window._densityInputsByChannel[ch] ??= [];
    window._densityInputsByChannel[ch].push(input);

    wrapper.appendChild(label);
    wrapper.appendChild(input);
    container.appendChild(wrapper);
  });
}

// Render final LUT table with Yule-Nielsen adjustment and ΔE Gray balance
export function renderPrintLUTTable() {
  const lutTarget = document.getElementById('icc-lut-results');
  if (!lutTarget) return;

  // מחק רק את טבלת ה-LUT הישנה (אם יש)
  const oldLutTable = lutTarget.querySelector('table.lut-table');
  if (oldLutTable) oldLutTable.remove();

  // מחק כותרת (h3) של ה-LUT אם קיימת
  const oldHeader = Array.from(lutTarget.querySelectorAll('h3'))
    .find(h3 => h3.textContent.includes('Final LUT Table'));
  if (oldHeader) oldHeader.remove();


  const n = 1.8; // Yule-Nielsen exponent
  const grayPatches = {};
  grayLvals.forEach(L => {
    const lInput = document.querySelector(`input[name="gray_${L}_l"]`);
    const aInput = document.querySelector(`input[name="gray_${L}_a"]`);
    const bInput = document.querySelector(`input[name="gray_${L}_b"]`);
    let l = lInput ? parseFloat(lInput.value) : null;
    let a = aInput ? parseFloat(aInput.value) : null;
    let b = bInput ? parseFloat(bInput.value) : null;
    if (!isNaN(l) && !isNaN(a) && !isNaN(b)) {
      grayPatches[L] = { L: l, a, b };
    }
  });

  }

// Render ICC Standard LUT Data Table
export function renderStandardICCData() {
  const standard = document.querySelector('select[name="fogra-standard"]')?.value;
  const display = document.getElementById('selected-standard-display');
  if (display) {
    display.textContent = `The standard is: ${standard || 'none'}`;
  }
  if (!standard || standard === 'none') {
    const lutContainer = document.getElementById('icc-lut-results-standard');
    if (display) display.textContent = `No standard selected.`;
    if (lutContainer) lutContainer.innerHTML = '<p>Please select a standard to view ICC LUT Correction.</p>';
    return;
  }
  const lutContainer = document.getElementById('icc-lut-results-standard');
  // lutContainer.innerHTML = '<h3>ICC LUT Correction</h3>';
  const levels = [20, 40, 60, 80]; // dotPercents
  const iccData = window.iccLUT?.[standard];
  if (!iccData) return;

  const table = document.createElement('table');
  table.className = 'lut-table';
  table.style.borderCollapse = 'collapse';
  table.style.width = '100%';
  table.style.border = '1px solid #ccc';

  const header = document.createElement('tr');
  header.style.borderBottom = '1px solid #ccc';
  header.innerHTML = '<th>%</th>' + (channels || ['C','M','Y','K']).map(ch => `<th>${ch}</th>`).join('');
  table.appendChild(header);

  levels.forEach(percent => {
    const row = document.createElement('tr');
    row.style.borderBottom = '1px solid #eee';

    const label = document.createElement('td');
    label.textContent = percent + '%';
    label.style.border = '1px solid #ccc';
    label.style.padding = '4px';
    row.appendChild(label);

    (channels || ['C','M','Y','K']).forEach(ch => {
      const measuredLab = getMeasuredLabFromInputs(ch, percent);
      const targetLab = iccData?.[percent]?.[ch];
      let delta = '-';
      let tvi = '-';
      const targetDot = getTargetDotAreaFromLab(targetLab, ch, standard);
      let measuredDot;
      if (percent === 100) {
        const densityStr = document.querySelector(`input[name="dotarea_${ch}_100"]`)?.value;
        measuredDot = parseFloat(densityStr);
      } else {
        measuredDot = parseFloat(document.querySelector(`input[name="dotarea_${ch}_${percent}"]`)?.value);
      }
      if (measuredLab && targetLab) {
        const dE = deltaE(measuredLab, targetLab);
        delta = dE.toFixed(2);
      }
      if (!isNaN(measuredDot) && !isNaN(targetDot)) {
        tvi = (measuredDot - targetDot).toFixed(1);
      }
      const td = document.createElement('td');
      td.innerHTML = `
        <div>∆E: ${delta}</div>
        <div>∆TVI: <span style="color:${Math.abs(tvi) > 5 ? 'red' : 'black'}">${tvi}</span></div>
      `;
      td.className = 'correction-cell';
      td.style.border = '1px solid #ccc';
      td.style.padding = '4px';
      row.appendChild(td);
    });
    table.appendChild(row);
  });

  lutContainer.appendChild(table);
}
