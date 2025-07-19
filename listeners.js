window.addEventListener('DOMContentLoaded', () => {
  const stdSelect = document.querySelector('select[name="fogra-standard"]');
  const glossSelect = document.querySelector('select[name="paper-gloss"]');
  const modeRadios = document.querySelectorAll('input[name="mode"]');

  function resetDensityLocalStorage() {
    ['C', 'M', 'Y', 'K'].forEach(ch => {
      localStorage.removeItem(`density_${ch}`);
    });
  }

  if (stdSelect) {
    stdSelect.addEventListener('change', () => {
      localStorage.setItem('selected_standard', stdSelect.value);
      resetDensityLocalStorage();
      window.renderDensityInputs && window.renderDensityInputs();
      window.renderCMYKandGrayInputs && window.renderCMYKandGrayInputs();
    });
  }
  if (glossSelect) {
    glossSelect.addEventListener('change', () => {
      localStorage.setItem('selected_gloss', glossSelect.value);
      resetDensityLocalStorage();
      window.renderDensityInputs && window.renderDensityInputs();
      window.renderCMYKandGrayInputs && window.renderCMYKandGrayInputs();
    });
  }
  modeRadios.forEach(radio => {
    radio.addEventListener('change', () => {
      localStorage.setItem('selected_mode', radio.value);
      resetDensityLocalStorage();
      window.renderDensityInputs && window.renderDensityInputs();
      window.renderCMYKandGrayInputs && window.renderCMYKandGrayInputs();
    });
  });

  
  // רענון ראשוני (אפשר להשאיר או להסיר)
  const select = document.querySelector('select[name="fogra-standard"]');
  const selectedStandard = select?.value || 'fogra39';
  runRecalculation({ PROFILE: selectedStandard });
});
