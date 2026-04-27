import Phaser from 'phaser';

export interface TwinkleState {
  sprite: Phaser.GameObjects.Image;
  phase: number;
  speed: number;
  minAlpha: number;
  maxAlpha: number;
  baseMinAlpha: number;
  baseMaxAlpha: number;
}

interface TwinkleViewport {
  width: number;
  height: number;
  depths: readonly number[];
}

export function createStarTwinkles(
  scene: Phaser.Scene,
  twinkles: TwinkleState[],
  viewport: TwinkleViewport
): void {
  const twinkleCount = Phaser.Math.Between(12, 24);

  for (let i = 0; i < twinkleCount; i++) {
    const size = Phaser.Math.FloatBetween(2, 5);
    const textureKey = `twinkle-${Math.round(size * 10)}`;

    if (!scene.textures.exists(textureKey)) {
      const g = scene.add.graphics();
      // Four-point star twinkle
      const cx = size;
      const cy = size;
      const ts = size;

      // Soft outer glow
      g.fillStyle(0xffffff, 0.08);
      g.fillCircle(cx, cy, ts);

      g.fillStyle(0xffffff, 0.25);
      g.fillCircle(cx, cy, ts * 0.5);

      // Cross rays
      g.fillStyle(0xffffff, 0.5);
      g.fillRect(cx - ts, cy - 0.3, ts * 2, 0.6);
      g.fillRect(cx - 0.3, cy - ts, 0.6, ts * 2);

      // Hot center
      g.fillStyle(0xffffff, 1);
      g.fillCircle(cx, cy, 0.6);

      g.generateTexture(textureKey, Math.ceil(size * 2), Math.ceil(size * 2));
      g.destroy();
    }

    const x = Phaser.Math.Between(0, viewport.width);
    const y = Phaser.Math.Between(0, viewport.height);
    const depth = viewport.depths[Phaser.Math.Between(0, viewport.depths.length - 1)];
    const sprite = scene.add.image(x, y, textureKey);
    sprite.setDepth(depth + 1);
    sprite.setAlpha(0);

    twinkles.push({
      sprite,
      phase: Phaser.Math.FloatBetween(0, Math.PI * 2),
      speed: Phaser.Math.FloatBetween(0.0008, 0.003),
      minAlpha: Phaser.Math.FloatBetween(0, 0.15),
      maxAlpha: Phaser.Math.FloatBetween(0.3, 0.8),
      baseMinAlpha: 0,
      baseMaxAlpha: 0,
    });

    const state = twinkles[twinkles.length - 1];
    state.baseMinAlpha = state.minAlpha;
    state.baseMaxAlpha = state.maxAlpha;
  }
}

export function destroyTwinkles(twinkles: TwinkleState[]): TwinkleState[] {
  for (const twinkle of twinkles) {
    twinkle.sprite.destroy();
  }

  return [];
}
