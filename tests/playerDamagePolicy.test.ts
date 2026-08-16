import { describe, expect, test } from 'bun:test';
import { routePlayerDamageOutcome } from '../src/systems/collision/playerDamagePolicy';

describe('playerDamagePolicy', () => {
  test('maps entity outcomes onto collision orchestration routes', () => {
    expect(routePlayerDamageOutcome('ignored')).toBe('none');
    expect(routePlayerDamageOutcome('absorbed')).toBe('hit-feedback');
    expect(routePlayerDamageOutcome('damaged')).toBe('hit-feedback');
    expect(routePlayerDamageOutcome('fatal')).toBe('fatal-transition');
  });
});
