import { describe, expect, mock, test } from 'bun:test';

mock.module('phaser', () => ({
  default: {},
}));

mock.module('../src/systems/AudioManager', () => ({
  audioManager: {
    playSfx: mock(),
  },
}));

const { applyPowerUpPickup } = await import('../src/systems/GameplayFlow');
const { MAX_CURRENT_SHIELDS } = await import('../src/systems/PlayerState');

describe('applyPowerUpPickup', () => {
  test('caps live shield charges at the named maximum', () => {
    const player = { hp: 5, maxHp: 5, fireRate: 180, shields: MAX_CURRENT_SHIELDS, x: 0, y: 0 };
    const effectsManager = {
      createSparkBurst: mock(),
      createPowerUpBurst: mock(),
    };
    const label = { setOrigin: () => label, setDepth: () => label, setScale: () => label };
    const scene = {
      scale: { getViewPort: () => ({ x: 0, y: 0, width: 800, height: 600 }) },
      add: { text: () => label },
      tweens: { add: mock() },
    };

    applyPowerUpPickup(scene as never, player as never, effectsManager as never, 'shield');

    expect(player.shields).toBe(MAX_CURRENT_SHIELDS);
  });
});
