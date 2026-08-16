import { describe, expect, test } from 'bun:test';
import { mockPhaserModule } from './helpers/phaserMock';

mockPhaserModule();

const { CHAIN_OVERDRIVE_READOUT_COLOR, CHAIN_READOUT_COLOR, resolveChainReadout } =
  await import('../src/systems/hud/chainReadout');
const { CHAIN_MAX_MULTIPLIER } = await import('../src/systems/ScoreManager');

describe('resolveChainReadout', () => {
  test('stays hidden without an active chain multiplier', () => {
    expect(resolveChainReadout({ chain: 0, multiplier: 1 })).toEqual({
      label: '',
      color: CHAIN_READOUT_COLOR,
    });
  });

  test('keeps the existing chain treatment below the cap', () => {
    expect(resolveChainReadout({ chain: 12, multiplier: 3 })).toEqual({
      label: 'x3 CHAIN 12',
      color: CHAIN_READOUT_COLOR,
    });
  });

  test('marks the readout with a static overdrive suffix at the x5 cap', () => {
    expect(resolveChainReadout({ chain: 40, multiplier: CHAIN_MAX_MULTIPLIER })).toEqual({
      label: 'x5 CHAIN 40 · OVERDRIVE',
      color: CHAIN_OVERDRIVE_READOUT_COLOR,
    });
  });

  test('drops the overdrive mark as soon as the chain falls below the cap', () => {
    expect(resolveChainReadout({ chain: 39, multiplier: CHAIN_MAX_MULTIPLIER - 1 })).toEqual({
      label: 'x4 CHAIN 39',
      color: CHAIN_READOUT_COLOR,
    });
  });
});
