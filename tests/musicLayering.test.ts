import { describe, expect, test } from 'bun:test';

import { LEVELS } from '../src/config/levels/registry';
import { getLayerPresence } from '../src/systems/audio/procedural/scheduleStep';

describe('music layering', () => {
  test('a layer is silent well below its entry point and full at it', () => {
    expect(getLayerPresence(0.2, 0.4)).toBe(0);
    expect(getLayerPresence(0.325, 0.4)).toBeCloseTo(0.5);
    expect(getLayerPresence(0.4, 0.4)).toBe(1);
    expect(getLayerPresence(1, 0.4)).toBe(1);
    expect(getLayerPresence(0, 0)).toBe(1);
  });

  test('every stage track always has its bass and brings the lead in later than the pulse', () => {
    for (const level of LEVELS) {
      const { bass, pulse, lead } = level.music.stage;
      expect(bass.enterAt ?? 0).toBe(0);
      expect(lead?.enterAt ?? 0).toBeGreaterThan(pulse?.enterAt ?? 0);
    }
  });

  test('boss tracks carry drums and neighbouring sectors do not share an instrument palette', () => {
    const voicing = (index: number): string => {
      const { bass, pulse, lead, drums, pad, space } = LEVELS[index].music.stage;
      return JSON.stringify([bass.waveform, pulse?.waveform, lead?.waveform, drums, pad, space]);
    };
    LEVELS.forEach((level, index) => {
      expect(level.music.boss.drums).toBeDefined();
      if (index > 0) expect(voicing(index)).not.toBe(voicing(index - 1));
    });
  });
});
