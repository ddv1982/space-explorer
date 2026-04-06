import type { LevelConfig } from './types';
import { CORE_CAMPAIGN_LEVELS } from './definitions/coreCampaign';
import { EXPANSION_CAMPAIGN_LEVELS } from './definitions/expansionCampaign';

export const LEVELS: LevelConfig[] = [
  ...CORE_CAMPAIGN_LEVELS,
  ...EXPANSION_CAMPAIGN_LEVELS,
];
