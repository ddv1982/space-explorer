import { defineCampaign } from '../campaigns';
import { WRECKFIELD_RUN_LEVEL } from './wreckfieldRun';
import { GHOSTLIGHT_VEIL_LEVEL } from './ghostlightVeil';
import { CROWN_OF_RINGS_LEVEL } from './crownOfRings';
import { OBSIDIAN_MAW_LEVEL } from './obsidianMaw';
import { TERMINUS_BLACK_LEVEL } from './terminusBlack';

export const EXPANSION_CAMPAIGN = defineCampaign({
  id: 'expansion',
  title: 'Expansion Campaign',
  summary: 'Post-core progression arc that deepens encounter complexity and intensity.',
  levels: [
    WRECKFIELD_RUN_LEVEL,
    GHOSTLIGHT_VEIL_LEVEL,
    CROWN_OF_RINGS_LEVEL,
    OBSIDIAN_MAW_LEVEL,
    TERMINUS_BLACK_LEVEL,
  ],
});
