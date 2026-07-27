import { describe, expect, mock, test } from 'bun:test';

mock.module('phaser', () => ({
  default: {
    Math: {
      Clamp: (value: number, min: number, max: number) => Math.min(max, Math.max(min, value)),
    },
  },
}));

const { applyHazardTelegraphGlow } = await import('../src/utils/renderingCompat');

describe('hazard telegraph glow', () => {
  test('uses one bounded Phaser 4 internal glow filter', () => {
    const addGlow = mock(() => ({ id: 'glow' }));
    const clear = mock();
    const gameObject = {
      enableFilters: mock(),
      filters: {
        internal: { clear, addGlow },
      },
    };

    const filter = applyHazardTelegraphGlow(gameObject as never, 0x55ccff);

    expect(gameObject.enableFilters).toHaveBeenCalledTimes(1);
    expect(clear).toHaveBeenCalledTimes(1);
    expect(addGlow).toHaveBeenCalledWith(0x55ccff, 1.4, 0.15, 0.5, false);
    expect(filter as unknown).toEqual({ id: 'glow' });
  });
});
