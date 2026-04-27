import Phaser from 'phaser';
import type { LevelConfig } from '../../config/LevelsConfig';
import { mixColor } from '../../utils/colorUtils';

interface ViewportSize {
  width: number;
  height: number;
}

export interface DebrisMoteState {
  sprite: Phaser.GameObjects.Image;
  baseX: number;
  baseY: number;
  baseAlpha: number;
  speed: number;
  driftX: number;
  driftY: number;
  phase: number;
  rotSpeed: number;
}

export function createDebrisMotes(
  scene: Phaser.Scene,
  config: LevelConfig,
  viewport: ViewportSize,
  debrisMotes: DebrisMoteState[]
): void {
  const moteCount = Phaser.Math.Between(6, 12);

  for (let i = 0; i < moteCount; i++) {
    const size = Phaser.Math.FloatBetween(1.5, 4);
    const textureKey = `debris-mote-${Math.round(size * 10)}-${config.accentColor.toString(16)}`;

    if (!scene.textures.exists(textureKey)) {
      const g = scene.add.graphics();
      const moteColor = mixColor(0x888888, config.accentColor, 0.2);
      g.fillStyle(moteColor, 0.3);
      // Irregular small shape
      g.beginPath();
      g.moveTo(size, 0);
      g.lineTo(size * 1.5, size * 0.5);
      g.lineTo(size, size * 1.2);
      g.lineTo(0, size * 0.8);
      g.closePath();
      g.fillPath();
      g.generateTexture(textureKey, Math.ceil(size * 1.5), Math.ceil(size * 1.2));
      g.destroy();
    }

    const x = Phaser.Math.Between(0, viewport.width);
    const y = Phaser.Math.Between(0, viewport.height);
    const sprite = scene.add.image(x, y, textureKey);
    sprite.setDepth(-5);
    sprite.setAlpha(Phaser.Math.FloatBetween(0.15, 0.35));

    debrisMotes.push({
      sprite,
      baseX: x,
      baseY: y,
      baseAlpha: sprite.alpha,
      speed: Phaser.Math.FloatBetween(0.0003, 0.001),
      driftX: Phaser.Math.FloatBetween(10, 40),
      driftY: Phaser.Math.FloatBetween(5, 20),
      phase: Phaser.Math.FloatBetween(0, Math.PI * 2),
      rotSpeed: Phaser.Math.FloatBetween(-0.5, 0.5),
    });
  }
}

export function destroyDebrisMotes(debrisMotes: DebrisMoteState[]): DebrisMoteState[] {
  for (const mote of debrisMotes) {
    mote.sprite.destroy();
  }

  return [];
}
