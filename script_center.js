import { iccLUT } from './iccLUT.js';
import { labToRgb, convertCmykToLab } from './lab_to_cmykovg_converter.js';
import { tonePercents, channels, deltaE, getMeasuredLabFromInputs, getTargetDotAreaFromLab } from './util.js';
import { runRecalculation } from './logic.js';
import {
  renderCMYKandGrayInputs,
  renderDensityInputs,
  renderStandardICCData,
  renderPrintLUTTable
} from './ui_handlers.js';

import { dotAreaTargets } from './dotarea_targets.js';

// זמינות גלובלית (אם נדרש)
window.labToRgb = labToRgb;
window.renderCMYKandGrayInputs = renderCMYKandGrayInputs;
window.renderDensityInputs = renderDensityInputs;
window.renderStandardICCData = renderStandardICCData;
window.renderPrintLUTTable = renderPrintLUTTable;
window.dotAreaTargets = dotAreaTargets;
window.runRecalculation = runRecalculation;

window.addEventListener('DOMContentLoaded', () => {
  const panel = document.getElementById('panel-middle');
  if (panel) panel.style.display = 'block';

  const savedStandard = localStorage.getItem('selected_standard');
  const savedGloss = localStorage.getItem('selected_gloss');
  const savedMode = localStorage.getItem('selected_mode');

  const stdSelect = document.querySelector('select[name="fogra-standard"]');
  const glossSelect = document.querySelector('select[name="paper-gloss"]');
  const modeRadios = document.querySelectorAll('input[name="mode"]');

  if (savedStandard && stdSelect) stdSelect.value = savedStandard;
  if (savedGloss && glossSelect) glossSelect.value = savedGloss;
  if (savedMode) {
    modeRadios.forEach(radio => {
      if (radio.value === savedMode) radio.checked = true;
    });
  }

  if (stdSelect) {
    stdSelect.addEventListener('change', () => {
      localStorage.setItem('selected_standard', stdSelect.value);
    });
  }

  if (glossSelect) {
    glossSelect.addEventListener('change', () => {
      localStorage.setItem('selected_gloss', glossSelect.value);
    });
  }
   if (glossSelect) {
  glossSelect.addEventListener('change', () => {
    localStorage.setItem('selected_gloss', glossSelect.value);
    window.updateDensityDisplay && window.updateDensityDisplay();
  });
}
  modeRadios.forEach(input => {
    input.addEventListener('change', () => {
      localStorage.setItem('selected_mode', input.value);
    });
  });

  // ---------------------------
  // קריאות ראשוניות – רק בעת טעינת הדף
  // ---------------------------
  window.renderStandardICCData();
  window.renderCMYKandGrayInputs();
  window.renderDensityInputs();
  window.runRecalculation();
const calcBtn = document.getElementById('calc-lut-btn');
  if (calcBtn) {
    calcBtn.addEventListener('click', () => {
  const select = document.querySelector('select[name="fogra-standard"]');
  const selectedStandard = select?.value || 'fogra39';

  window.runRecalculation({ PROFILE: selectedStandard });

  window.renderStandardICCData && window.renderStandardICCData();
  // window.renderPrintLUTTable && window.renderPrintLUTTable();
});
  }
});
