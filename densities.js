// densities.js

export const standardDensity = {
  M0: {
    gloss:     { C: 1.45, M: 1.45, Y: 1.00, K: 1.75, O: 1.85, V: 1.45, G: 1.45 },
    semimatte: { C: 1.30, M: 1.30, Y: 0.95, K: 1.55, O: 1.60, V: 1.30, G: 1.30 },
    matte:     { C: 1.20, M: 1.20, Y: 0.90, K: 1.35, O: 1.45, V: 1.20, G: 1.20 }
  },
  M1: {
    gloss:     { C: 1.45, M: 1.45, Y: 1.00, K: 1.75, O: 1.85, V: 1.45, G: 1.45 },
    semimatte: { C: 1.30, M: 1.30, Y: 0.95, K: 1.55, O: 1.60, V: 1.30, G: 1.30 },
    matte:     { C: 1.20, M: 1.20, Y: 0.90, K: 1.35, O: 1.45, V: 1.20, G: 1.20 }
  },
  M2: {
    gloss:     { C: 1.45, M: 1.45, Y: 1.00, K: 1.75, O: 1.85, V: 1.45, G: 1.45 },
    semimatte: { C: 1.30, M: 1.30, Y: 0.95, K: 1.55, O: 1.60, V: 1.30, G: 1.30 },
    matte:     { C: 1.20, M: 1.20, Y: 0.90, K: 1.35, O: 1.45, V: 1.20, G: 1.20 }
  },
  M3: {
    gloss:     { C: 1.45, M: 1.45, Y: 1.00, K: 1.75, O: 1.85, V: 1.45, G: 1.45 },
    semimatte: { C: 1.30, M: 1.30, Y: 0.95, K: 1.55, O: 1.60, V: 1.30, G: 1.30 },
    matte:     { C: 1.20, M: 1.20, Y: 0.90, K: 1.35, O: 1.45, V: 1.20, G: 1.20 }
  }
};

export function updateDensityDisplay() {
  const gloss = document.querySelector('select[name="paper-gloss"]')?.value || 'gloss';
  const mode = document.querySelector('input[name="mode"]:checked')?.value || 'M1';

  const d = standardDensity[mode]?.[gloss];
   console.log('🟢 [updateDensityDisplay] mode:', mode, 'gloss:', gloss, 'density:', d);
  const densityDiv = document.getElementById('density-values');
  if (!densityDiv || !d) return;

  densityDiv.innerHTML = `
    <span>C: ${d.C}</span>
    <span>M: ${d.M}</span>
    <span>Y: ${d.Y}</span>
    <span>K: ${d.K}</span>
    <span>O: ${d.O}</span>
    <span>V: ${d.V}</span>
    <span>G: ${d.G}</span>
    <span style="margin-left: 1rem; font-weight: bold;">[${mode} / ${gloss}]</span>
  `;
}
window.updateDensityDisplay = updateDensityDisplay;
window.standardDensity = standardDensity;