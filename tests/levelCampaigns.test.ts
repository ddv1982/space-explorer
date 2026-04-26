import { describe, expect, test } from 'bun:test';

import { defineCampaign, flattenCampaignLevels } from '../src/config/levels/campaigns';
import { CORE_CAMPAIGN } from '../src/config/levels/definitions/coreCampaign';

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
});
