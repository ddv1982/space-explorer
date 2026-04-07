import type { LevelConfig } from './types';

interface CampaignConfig {
  id: string;
  title: string;
  summary: string;
  levels: readonly LevelConfig[];
}

export function defineCampaign(config: CampaignConfig): CampaignConfig {
  if (config.levels.length === 0) {
    throw new Error(`[levels] Campaign "${config.id}" must include at least one level.`);
  }

  return Object.freeze({
    ...config,
    levels: Object.freeze([...config.levels]),
  });
}

export function flattenCampaignLevels(campaigns: readonly CampaignConfig[]): LevelConfig[] {
  const orderedLevels: LevelConfig[] = [];
  const seenLevelKeys = new Set<string>();

  for (const campaign of campaigns) {
    if (campaign.levels.length === 0) {
      throw new Error(`[levels] Campaign "${campaign.id}" must include at least one level.`);
    }

    for (const level of campaign.levels) {
      const levelKey = `${level.name}::${level.planetName}`;
      if (seenLevelKeys.has(levelKey)) {
        throw new Error(
          `[levels] Duplicate level entry "${level.name}" detected while building campaign order.`
        );
      }

      seenLevelKeys.add(levelKey);
      orderedLevels.push(level);
    }
  }

  return orderedLevels;
}
