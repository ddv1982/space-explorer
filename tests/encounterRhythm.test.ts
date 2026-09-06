import { describe, expect, test } from 'bun:test';
import { LEVELS } from '../src/config/levels/registry';
import { analyzeEncounterRhythm } from '../scripts/analyzeEncounterRhythm';
import { LevelManager } from '../src/systems/LevelManager';

function level(number: number) {
  const config = LEVELS[number - 1];
  if (!config) throw new Error(`Missing level ${number}`);
  return config;
}

describe('authored encounter timing', () => {
  test('analysis follows the actual LevelManager gameplay clock', () => {
    for (const [index, config] of LEVELS.entries()) {
      const manager = new LevelManager();
      manager.init(index + 1);
      const audit = analyzeEncounterRhythm(config);
      manager.update(audit.approachAtMs);
      expect(manager.progress).toBeCloseTo(config.hasBoss ? config.bossTriggerProgress : 1, 10);
    }
  });

  test('every choreographed wave fits before its section ends', () => {
    for (const config of LEVELS) {
      for (const section of analyzeEncounterRhythm(config).sections) {
        for (const wave of section.waves) {
          expect(wave.remainingMs).toBeGreaterThan(600);
        }
      }
    }
  });

  test.each([3, 6])('level %i shield can drift to portrait midfield before the boss arrives', (number) => {
    const config = level(number);
    const approach = config.sections.find((section) => section.phase === 'boss-approach');
    if (!approach) throw new Error(`Missing approach in ${config.name}`);
    const audit = analyzeEncounterRhythm(config).sections.find((section) => section.id === approach.id);
    const shield = audit?.drops.find((drop) => drop.type === 'shield');
    expect(shield).toBeDefined();
    expect(shield?.beforeBossMs).toBeGreaterThan((40 / 60) * 1000 + ((844 * 0.5) / 60) * 1000);
    expect(approach.hazardEvents ?? []).toHaveLength(0);
    expect(approach.enemyFocus).toEqual([{ type: 'scout', weight: 1 }]);
    expect(approach.encounterSizeOverride).toEqual({ min: 1, max: 1 });
  });

  test('Aurora release preserves its duration and gives one readable side-lane task', () => {
    const release = level(1).sections.find((section) => section.id === 'slipstream-release');
    expect(release?.startProgress).toBe(0.84);
    expect(release?.endProgress).toBe(1);
    expect(release?.waves).toHaveLength(1);
    expect(release?.waves?.[0].telegraph).toBe('warning');
    expect(release?.enemyFocus).toEqual([{ type: 'scout', weight: 1 }]);
  });

  test('Debris teaches beams separately before the siege remix', () => {
    const sections = level(6).sections;
    const flare = sections.find((section) => section.id === 'flare-strobe-debut');
    expect(flare?.hazardEvents?.map((hazard) => hazard.type)).toEqual(['solar-flare']);
    const switchbacks = sections.find((section) => section.id === 'lattice-cover-switchbacks');
    const lattice = switchbacks?.hazardEvents?.find((hazard) => hazard.type === 'laser-lattice');
    const cover = switchbacks?.hazardEvents?.find((hazard) => hazard.type === 'rock-corridor');
    // Even a pressure-delayed final lattice activation must expire before the first cover eligibility.
    expect((lattice?.durationMs ?? Infinity) + 800 + 2200).toBeLessThan(cover?.cadenceMs ?? 0);
    const siege = sections.find((section) => section.id === 'bulwark-siege-peak');
    expect(siege?.hazardEvents?.map((hazard) => hazard.type)).toEqual(['solar-flare', 'laser-lattice', 'debris-surge']);
  });
});
