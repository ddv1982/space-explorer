import type { BossAttackStyle } from './levels/types';

/**
 * Every ship, boss, turret, mine and asteroid is a code-built 3D model rendered by `scripts/shipyard`
 * into a one-row sprite sheet: albedo with baked key light plus a matching normal map, so the scene's
 * dynamic lights shade them per pixel. Logical sizes match the Arcade bodies the entities were tuned
 * with; sheets are authored at `SPRITE_DENSITY` physical pixels per logical pixel.
 */
export const SPRITE_DENSITY = 4;

/**
 * `bank` frames roll the model about its nose-to-tail axis (centre frame is level);
 * `variant` frames are distinct shapes of the same object (e.g. asteroid rocks).
 */
type SpritePose = 'bank' | 'variant';

export interface ShipyardSpriteSpec {
  key: string;
  file: string;
  width: number;
  height: number;
  frames: number;
  pose: SpritePose;
  /** Bank sheets only: roll of the outermost frames. */
  maxBankDeg: number;
}

function single(key: string, file: string, width: number, height: number): ShipyardSpriteSpec {
  return { key, file, width, height, frames: 1, pose: 'bank', maxBankDeg: 0 };
}

export const BOSS_STYLES = [
  'barrage',
  'bulwark',
  'carrier',
  'pursuit',
  'maelstrom',
  'pressure',
] as const satisfies readonly BossAttackStyle[];

export const ASTEROID_VARIANTS = 4;

export const SHIPYARD_SPRITES: readonly ShipyardSpriteSpec[] = [
  // Keys keep the names every system already looks ships up by.
  { key: 'player-ship', file: 'player', width: 36, height: 44, frames: 9, pose: 'bank', maxBankDeg: 35 },
  single('helper-ship', 'helper', 24, 30),
  single('scout-texture', 'scout', 26, 28),
  single('fighter-texture', 'fighter', 36, 36),
  single('bomber-texture', 'bomber', 44, 38),
  single('gunship-texture', 'gunship', 40, 40),
  single('swarm-texture', 'swarm', 20, 20),
  single('swarmling-texture', 'swarmling', 14, 14),
  single('diver-texture', 'diver', 24, 30),
  single('dodger-texture', 'dodger', 30, 24),
  single('sower-texture', 'sower', 34, 34),
  single('lancer-texture', 'lancer', 22, 40),
  single('splitter-texture', 'splitter', 30, 26),
  single('picket-turret', 'turret', 24, 24),
  single('sower-mine', 'mine', 16, 16),
  ...BOSS_STYLES.map((style) => single(bossTextureKey(style), `boss-${style}`, 88, 56)),
  {
    key: 'asteroid-texture',
    file: 'asteroid',
    width: 44,
    height: 44,
    frames: ASTEROID_VARIANTS,
    pose: 'variant',
    maxBankDeg: 0,
  },
];

export const PLAYER_SPRITE = SHIPYARD_SPRITES[0]!;

export function bossTextureKey(style: BossAttackStyle): string {
  return `boss-${style}`;
}

export function shipyardAssetUrl(file: string, normal = false): string {
  return `assets/shipyard/${file}${normal ? '_n' : ''}.webp`;
}

export interface SheetLayout {
  frameWidth: number;
  frameHeight: number;
  sheetWidth: number;
  sheetHeight: number;
  /** Per-frame roll in degrees; all zero for variant sheets. */
  frameBankDeg: number[];
}

export function sheetLayout(spec: ShipyardSpriteSpec, density: number): SheetLayout {
  const frameWidth = spec.width * density;
  const frameHeight = spec.height * density;
  const frameBankDeg = Array.from({ length: spec.frames }, (_, index) =>
    spec.pose === 'variant' || spec.frames === 1
      ? 0
      : -spec.maxBankDeg + (index * 2 * spec.maxBankDeg) / (spec.frames - 1)
  );
  return { frameWidth, frameHeight, sheetWidth: frameWidth * spec.frames, sheetHeight: frameHeight, frameBankDeg };
}

/** The frame a sheet shows by default: the level pose for bank sheets, the first rock for variants. */
export function restingFrame(spec: ShipyardSpriteSpec): number {
  return spec.pose === 'bank' ? (spec.frames - 1) / 2 : 0;
}

/** Maps a bank in [-1, 1] to the nearest sheet frame; non-finite input shows the level frame. */
export function bankToFrame(bank: number, frames: number): number {
  if (frames <= 1) return 0;
  const centre = (frames - 1) / 2;
  if (!Number.isFinite(bank)) return centre;
  const clamped = Math.max(-1, Math.min(1, bank));
  return Math.round(centre + clamped * centre);
}
