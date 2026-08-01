import { describe, expect, test } from 'bun:test';
import { mockPhaserModule } from './helpers/phaserMock';

mockPhaserModule();

const { getSparkConfig } = await import('../src/systems/effects/emitterSetup');

describe('getSparkConfig', () => {
  test('aligns spark rotation with live velocity on update, not on emit', () => {
    // Phaser runs rotate.onEmit before assigning particle velocity, so the
    // streak direction must come from onUpdate (which runs after integration).
    const rotate = getSparkConfig().rotate as {
      onEmit?: unknown;
      onUpdate: (particle: { velocityX: number; velocityY: number }) => number;
    };

    expect(rotate.onEmit).toBeUndefined();
    expect(rotate.onUpdate({ velocityX: 10, velocityY: 0 })).toBe(0);
    expect(rotate.onUpdate({ velocityX: 0, velocityY: 10 })).toBe(90);
    expect(rotate.onUpdate({ velocityX: 0, velocityY: -10 })).toBe(-90);
  });
});
