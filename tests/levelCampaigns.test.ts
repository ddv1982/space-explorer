import { describe, expect, test } from 'bun:test';

import { defineCampaign, flattenCampaignLevels } from '../src/config/levels/campaigns';
import { CORE_CAMPAIGN } from '../src/config/levels/definitions/coreCampaign';
import { LEVELS } from '../src/config/levels/registry';
import type { LevelConfig } from '../src/config/levels/types';

function getLevelByNumber(levelNumber: number): LevelConfig {
  const level = LEVELS[levelNumber - 1];
  if (!level) {
    throw new Error(`Missing level ${levelNumber}`);
  }

  return level;
}

function countSignatureWaves(level: LevelConfig): number {
  return level.sections.reduce((total, section) => total + (section.signatureWaves?.length ?? 0), 0);
}

function countRecoveryDrops(level: LevelConfig): number {
  return level.sections.reduce((total, section) => total + (section.recoveryDrops?.length ?? 0), 0);
}

function hasProjectileBlockingCover(level: LevelConfig): boolean {
  return level.sections.some((section) =>
    section.hazardEvents?.some((hazard) => hazard.type === 'rock-corridor' && hazard.blocksEnemyProjectiles)
  );
}

describe('campaign helper regression coverage', () => {
  test('defineCampaign rejects empty campaigns', () => {
    expect(() =>
      defineCampaign({
        id: 'empty',
        title: 'Empty Campaign',
        summary: 'No levels',
        levels: [],
      })
    ).toThrow('[levels] Campaign "empty" must include at least one level.');
  });

  test('flattenCampaignLevels rejects empty campaigns', () => {
    const emptyCampaign = {
      id: 'empty',
      title: 'Empty Campaign',
      summary: 'No levels',
      levels: [],
    } as (typeof CORE_CAMPAIGN);

    expect(() => flattenCampaignLevels([emptyCampaign])).toThrow(
      '[levels] Campaign "empty" must include at least one level.'
    );
  });

  test('flattenCampaignLevels rejects duplicate levels across campaigns', () => {
    const duplicateLevel = CORE_CAMPAIGN.levels[0];

    const campaignA = defineCampaign({
      id: 'campaign-a',
      title: 'Campaign A',
      summary: 'First test campaign',
      levels: [duplicateLevel],
    });

    const campaignB = defineCampaign({
      id: 'campaign-b',
      title: 'Campaign B',
      summary: 'Second test campaign',
      levels: [duplicateLevel],
    });

    expect(() => flattenCampaignLevels([campaignA, campaignB])).toThrow(
      `[levels] Duplicate level entry "${duplicateLevel.name}" detected while building campaign order.`
    );
  });

  test('vertical slice levels declare their approved authored gameplay beats', () => {
    const level1 = getLevelByNumber(1);
    const level5 = getLevelByNumber(5);
    const level6 = getLevelByNumber(6);
    const level10 = getLevelByNumber(10);

    expect(level1.hasBoss).toBe(false);
    expect(countSignatureWaves(level1)).toBeGreaterThanOrEqual(2);

    expect(level5.boss?.attackStyle).toBe('pressure');
    expect(countRecoveryDrops(level5)).toBeGreaterThanOrEqual(2);

    expect(level6.boss?.attackStyle).toBe('bulwark');
    expect(hasProjectileBlockingCover(level6)).toBe(true);
    expect(countRecoveryDrops(level6)).toBeGreaterThanOrEqual(1);

    expect(countSignatureWaves(level10)).toBeGreaterThanOrEqual(3);
    expect(countRecoveryDrops(level10)).toBeGreaterThanOrEqual(2);
  });
});
