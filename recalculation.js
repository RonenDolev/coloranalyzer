import { runRecalculationPart1 } from './recalculation_part1.js';
import { runRecalculationPart2 } from './recalculation_part2.js';
import { runRecalculationPart3 } from './recalculation_part3.js';
import { runRecalculationPart4 } from './recalculation_part4.js';

export function runRecalculation({ PROFILE } = {}) {
  console.log('runRecalculation triggered with PROFILE:', PROFILE);
  
  // שלב 1 - העבר PROFILE
  const part1 = runRecalculationPart1({ PROFILE });
  if (!part1) return;

  // שלב 2
  const part2 = runRecalculationPart2(part1);

  const allArgs = { 
    ...part1, 
    ...part2, 
    PROFILE, // הוסף PROFILE
    lutResultTable: part2.lutResultTable || part1.lutTable
  };

  // שלב 3
  console.log("runRecalculationPart3 args:", allArgs);
  const part3 = runRecalculationPart3(allArgs);

  // שלב 4
  runRecalculationPart4({ ...part1, ...part2, lutMatrix: part3 });
}
