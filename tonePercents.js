import { channels } from './constants.js';

export function getTonePercentsFromInputs() {
  const percents = new Set();
  channels.forEach(channel => {
    console.log(`[Channel Loop] מתחילים עם ערוץ: ${channel}`);
    // שימוש בסלקטור מדויק יותר שמתאים למבנה השמות: input[name="density_C_20"]
    document.querySelectorAll(`input[name^="density_${channel}_"]`).forEach(input => {
      const m = input.name.match(/density_([A-Z])_(\d+)/);
      if (m && m[2]) {
        const val = Number(m[2]);
        percents.add(val);
        console.log(`Adding percent ${val} from input name ${input.name}`);
      }
    });
  });
  return Array.from(percents).sort((a, b) => a - b);
}
