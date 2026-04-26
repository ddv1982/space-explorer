import type { LevelConfig } from './types';

interface CampaignConfig {
  id: string;
  title: string;
  summary: string;
  levels: readonly LevelConfig[];
}

function assertCampaignHasLevels(campaign: Pick<CampaignConfig, 'id' | 'levels'>): void {
  if (campaign.levels.length === 0) {
    throw new Error(`[levels] Campaign "${campaign.id}" must include at least one level.`);
  }
}

export function defineCampaign(config: CampaignConfig): CampaignConfig {
  assertCampaignHasLevels(config);

  return Object.freeze({
    ...config,
    levels: Object.freeze([...config.levels]),
  });
}

export function flattenCampaignLevels(campaigns: readonly CampaignConfig[]): LevelConfig[] {
  const orderedLevels: LevelConfig[] = [];
  const seenLevelKeys = new Set<string>();

  for (const campaign of campaigns) {
    assertCampaignHasLevels(campaign);

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
