import type { LevelConfig } from './types';
import { flattenCampaignLevels } from './campaigns';
import { CORE_CAMPAIGN } from './definitions/coreCampaign';
import { EXPANSION_CAMPAIGN } from './definitions/expansionCampaign';

const CAMPAIGN_SEQUENCE = [
  CORE_CAMPAIGN,
  EXPANSION_CAMPAIGN,
] as const;

// Canonical campaign ordering for runtime progression.
export const LEVELS: LevelConfig[] = flattenCampaignLevels(CAMPAIGN_SEQUENCE);
