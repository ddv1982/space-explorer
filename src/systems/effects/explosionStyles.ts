/**
 * How each kind of hull dies. Every blast shares the same fire and smoke; the style colours its sparks,
 * embers and shockwave with the ship's identity accent and shapes the ring to its silhouette.
 */
export interface ExplosionStyle {
  /** Spark and ember tints, hottest last. */
  palette: readonly number[];
  ringTint: number;
  ringScaleX: number;
  ringScaleY: number;
  /** Heavy hulls shed debris and smoke longer. */
  heavy: boolean;
}

const STYLE = (
  palette: readonly number[],
  ringTint: number,
  ringScaleX = 1,
  ringScaleY = 1,
  heavy = false
): ExplosionStyle => ({ palette, ringTint, ringScaleX, ringScaleY, heavy });

const DEFAULT_STYLE = STYLE([0xff5d73, 0xff8c52, 0xffe0e5], 0xff6f82);

const ENEMY_STYLES: Record<string, ExplosionStyle> = {
  swarm: STYLE([0xffff5d, 0xffd73d, 0xffffff], 0xffff73, 1, 0.72),
  swarmling: STYLE([0xffff5d, 0xff5db1, 0xffffff], 0xffd0ec, 1, 0.72),
  diver: STYLE([0xff5df0, 0xff5d9e, 0xffffff], 0xff73df, 0.72, 1.2),
  splitter: STYLE([0xff7a4b, 0xff5d9e, 0xffffff], 0xff9a73, 0.72, 1.2),
  dodger: STYLE([0x4bf0ff, 0x63a4ff, 0xffffff], 0x63dfff, 1.3, 0.7),
  gunship: STYLE([0x63a4ff, 0x4bf0ff, 0xffffff], 0x63a4ff, 1.3, 0.7, true),
  bomber: STYLE([0xffb14b, 0xff6a3d, 0xfff0c4], 0xffa45d, 1.18, 1.18, true),
  sower: STYLE([0xb45dff, 0xff6a3d, 0xf0e0ff], 0xc08cff, 1.18, 1.18, true),
  lancer: STYLE([0xd8e9ff, 0x8bb9ff, 0xffffff], 0xc9e3ff, 0.58, 1.45, true),
  fighter: STYLE([0xff8a3a, 0xc8452f, 0xffe2c8], 0xff9a5a),
};

/** Generic blasts (asteroids, bombs, the player) burn amber. */
export const NEUTRAL_EXPLOSION_STYLE = STYLE([0xffb861, 0xffdfad, 0xffffff], 0xffb066, 1, 1, true);

export function getEnemyExplosionStyle(enemyType: string): ExplosionStyle {
  return ENEMY_STYLES[enemyType] ?? DEFAULT_STYLE;
}
