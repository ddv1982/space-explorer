import Phaser from 'phaser';
import { despawnEntity } from '../utils/entityUtils';
import { ensurePowerUpTextures } from '../utils/SpriteFactory';

export type PowerUpType = 'health' | 'shield' | 'rapidfire';

function getPowerUpFromRuntimeValue(value: unknown): PowerUp | null {
  if (value instanceof PowerUp) {
    return value;
  }

  if (!value || typeof value !== 'object' || !('gameObject' in value)) {
    return null;
  }

  const { gameObject } = value as { gameObject?: unknown };
  return gameObject instanceof PowerUp ? gameObject : null;
}

export function resolvePowerUpOverlap(...values: unknown[]): PowerUp | null {
  for (const value of values) {
    const powerUp = getPowerUpFromRuntimeValue(value);
    if (powerUp) {
      return powerUp;
    }
  }

  return null;
}

export class PowerUp extends Phaser.Physics.Arcade.Sprite {
  powerUpType: PowerUpType = 'health';
  private bobTime: number = 0;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    ensurePowerUpTextures(scene);

    super(scene, x, y, 'powerup-health');
    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setActive(false);
    this.setVisible(false);
    this.setDepth(4);
  }

  spawn(x: number, y: number, type: PowerUpType): void {
    this.powerUpType = type;
    this.setTexture(`powerup-${type}`);
    (this.body as Phaser.Physics.Arcade.Body).reset(x, y);
    this.setPosition(x, y);
    this.setActive(true);
    this.setVisible(true);
    this.setVelocityY(60);
    this.bobTime = 0;

    // Add glow based on type
    if (!this.filters) {
      this.enableFilters();
    }

    const colors: Record<PowerUpType, number> = {
      health: 0x00ff44,
      shield: 0x4488ff,
      rapidfire: 0xffcc00,
    };

    this.filters?.internal.clear();
    this.filters?.internal.addGlow(colors[type], 2, 2, 1, false);
  }

  preUpdate(time: number, delta: number): void {
    super.preUpdate(time, delta);
    if (!this.active) return;

    // Gentle bobbing motion
    this.bobTime += delta;
    this.x += Math.sin(this.bobTime * 0.005) * 0.3;

    // Go off screen
    if (this.y > this.scene.scale.gameSize.height + 30) {
      this.kill();
    }
  }

  kill(): void {
    despawnEntity(this);
  }
}
