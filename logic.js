import { dotAreaTargets } from './dotarea_targets.js';
import { iccLUT } from './iccLUT.js';
import { deltaE2000 } from './util.js';
import { getDensityFactor } from './density_factors.js';
import './listeners.js';
import { getTonePercentsFromInputs } from './tonePercents.js';
import { runRecalculation } from './recalculation.js';

const channels = ['C', 'M', 'Y', 'K'];
const GRAY_BALANCE_WEIGHT = 0.2;
export { runRecalculation };