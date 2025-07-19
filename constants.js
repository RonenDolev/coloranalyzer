import { runRecalculationPart1 } from './recalculation_part1.js';
import { runRecalculationPart2 } from './recalculation_part2.js';
import { runRecalculationPart3 } from './recalculation_part3.js';
import { runRecalculationPart4 } from './recalculation_part4.js';

export function runRecalculation() {
  const part1 = runRecalculationPart1();
  if (!part1) return;

  const part2 = runRecalculationPart2(part1);
  const part3 = runRecalculationPart3({ ...part1, ...part2 });
  runRecalculationPart4({ ...part1, ...part2, ...part3 });
}



export const channels = ['C', 'M', 'Y', 'K'];
export const GRAY_BALANCE_WEIGHT = 0.2;
