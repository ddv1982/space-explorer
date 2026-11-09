import { describe, expect, test } from 'bun:test';
import { mockPhaserModule } from './helpers/phaserMock';

mockPhaserModule();

const { EMITTERS, getFireConfig, getSparkConfig } = await import('../src/systems/effects/emitterSetup');

describe('effect emitters', () => {
  test('sparks take the blast palette', () => {
    expect(getSparkConfig([0x111111, 0x222222]).tint).toEqual([0x111111, 0x222222]);
  });

  test('aligns spark rotation with live velocity on update, not on emit', () => {
    // Phaser runs rotate.onEmit before assigning particle velocity, so the
    // streak direction must come from onUpdate (which runs after integration).
    const rotate = getSparkConfig([0xffffff]).rotate as {
      onEmit?: unknown;
      onUpdate: (particle: { velocityX: number; velocityY: number }) => number;
    };

    expect(rotate.onEmit).toBeUndefined();
    expect(rotate.onUpdate({ velocityX: 10, velocityY: 0 })).toBe(0);
    expect(rotate.onUpdate({ velocityX: 0, velocityY: 10 })).toBe(90);
    expect(rotate.onUpdate({ velocityX: 0, velocityY: -10 })).toBe(-90);
  });

  test('fire cools from white-hot to dark red over its life and grows with intensity', () => {
    const small = getFireConfig(0.5);
    const large = getFireConfig(2);
    expect((small.color as number[])[0]).toBe(0xffffff);
    expect((small.color as number[]).at(-1)).toBe(0x501408);
    expect((large.speed as { max: number }).max).toBeGreaterThan((small.speed as { max: number }).max);
  });

  test('smoke draws beneath fire and sparks above it', () => {
    expect(EMITTERS.smoke.depth).toBeLessThan(EMITTERS.fire.depth);
    expect(EMITTERS.spark.depth).toBeGreaterThan(EMITTERS.fire.depth);
  });
});
