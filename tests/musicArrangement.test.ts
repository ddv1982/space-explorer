import { describe, expect, test } from 'bun:test';

import type { MusicArrangementConfig } from '../src/config/LevelsConfig';
import { resolveArrangementForBar } from '../src/systems/audio/procedural/arrangement';

const ARRANGEMENT: MusicArrangementConfig = {
  loop: true,
  sections: [
    { phase: 'intro', barsDuration: 2, density: 0.3, energyLift: 0.1 },
    { phase: 'build', barsDuration: 1, density: 0.6, energyLift: 0.2 },
  ],
};

describe('resolveArrangementForBar', () => {
  test('a looping arrangement wraps back to its first section', () => {
    const phases = [0, 1, 2, 3, 4, 5].map((bar) => resolveArrangementForBar(ARRANGEMENT, bar).phase);
    expect(phases).toEqual(['intro', 'intro', 'build', 'intro', 'intro', 'build']);
  });

  test('a one-shot arrangement holds its last section', () => {
    expect(resolveArrangementForBar({ ...ARRANGEMENT, loop: false }, 10).phase).toBe('build');
  });

  test('a track without an arrangement plays at full density', () => {
    expect(resolveArrangementForBar(undefined, 3)).toMatchObject({ density: 1, energyLift: 0 });
  });
});
