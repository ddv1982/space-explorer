type PremiumBackgroundLayerRole = 'far' | 'nebula' | 'mid' | 'near' | 'overlay';

export interface PremiumBackgroundLayerConfig {
  role: PremiumBackgroundLayerRole;
  key: string;
  url: string;
  alpha: number;
  depth: number;
  scrollSpeed: number;
  blendMode?: number | string;
  transparent?: boolean;
  pulse?: {
    amplitude: number;
    speed: number;
  };
}

interface PremiumBackgroundManifest {
  levelName: string;
  assetPrefix: string;
  baseSize: { width: number; height: number };
  layers: PremiumBackgroundLayerConfig[];
}

const BACKGROUND_BASE_URL = '/assets/backgrounds';
const BASE_SIZE = { width: 1254, height: 1254 } as const;
const BACKGROUND_ALPHA = 1;
const BACKGROUND_SCROLL_SPEED = 0.09;

const LEVELS = [
  { index: 1, name: 'Solar Slipstream' },
  { index: 2, name: 'Prism Reef' },
  { index: 3, name: 'Magnetar Foundry' },
  { index: 4, name: 'Fracture Convoy' },
  { index: 5, name: 'Cinder Vault' },
  { index: 6, name: 'Graveyard Lattice' },
  { index: 7, name: 'Mirage Archive' },
  { index: 8, name: 'Halo Cartography' },
  { index: 9, name: 'Glass Rift Narrows' },
  { index: 10, name: 'Eventide Singularity' },
] as const;

function createLayer(levelIndex: number): PremiumBackgroundLayerConfig {
  const key = `bg_level${String(levelIndex).padStart(2, '0')}`;
  return {
    role: 'far',
    key,
    url: `${BACKGROUND_BASE_URL}/${key}.png`,
    alpha: BACKGROUND_ALPHA,
    depth: -20,
    scrollSpeed: BACKGROUND_SCROLL_SPEED,
  };
}

function createManifest(level: (typeof LEVELS)[number]): PremiumBackgroundManifest {
  const assetPrefix = `bg_level${String(level.index).padStart(2, '0')}`;

  return {
    levelName: level.name,
    assetPrefix,
    baseSize: { ...BASE_SIZE },
    layers: [createLayer(level.index)],
  };
}

const PREMIUM_BACKGROUND_MANIFESTS: Record<string, PremiumBackgroundManifest> = Object.fromEntries(
  LEVELS.map((level) => [level.name, createManifest(level)])
) as Record<string, PremiumBackgroundManifest>;

export function getPremiumBackgroundManifest(levelName: string | undefined): PremiumBackgroundManifest | undefined {
  if (!levelName) {
    return undefined;
  }

  return PREMIUM_BACKGROUND_MANIFESTS[levelName];
}

export type PremiumBackgroundAsset = { key: string; url: string };

/**
 * Level numbers to keep warm for gameplay: the active level plus a short look-ahead.
 * Defaults match the art-bible guidance (current + next).
 */
export function getPremiumBackgroundLevelWindow(
  levelNumber: number,
  options: { lookAhead?: number; totalLevels?: number } = {}
): number[] {
  const totalLevels = options.totalLevels ?? LEVELS.length;
  const lookAhead = options.lookAhead ?? 1;
  if (totalLevels <= 0) {
    return [];
  }

  const current = Math.min(Math.max(1, Math.floor(levelNumber)), totalLevels);
  const last = Math.min(totalLevels, current + Math.max(0, Math.floor(lookAhead)));
  const windowLevels: number[] = [];

  for (let level = current; level <= last; level += 1) {
    windowLevels.push(level);
  }

  return windowLevels;
}

function getPremiumBackgroundPreloadQueueForLevels(
  levelNumbers: readonly number[]
): PremiumBackgroundAsset[] {
  const queued = new Map<string, PremiumBackgroundAsset>();

  for (const levelNumber of levelNumbers) {
    const level = LEVELS.find((entry) => entry.index === levelNumber);
    if (!level) {
      continue;
    }

    const manifest = PREMIUM_BACKGROUND_MANIFESTS[level.name];
    if (!manifest) {
      continue;
    }

    for (const layer of manifest.layers) {
      queued.set(layer.key, { key: layer.key, url: layer.url });
    }
  }

  return [...queued.values()];
}

export function getPremiumBackgroundPreloadQueueForLevelWindow(
  levelNumber: number,
  options: { lookAhead?: number; totalLevels?: number } = {}
): PremiumBackgroundAsset[] {
  return getPremiumBackgroundPreloadQueueForLevels(
    getPremiumBackgroundLevelWindow(levelNumber, options)
  );
}

/** Boot-time queue: first campaign window so Menu → Level 1 is ready. */
export function getStartupPremiumBackgroundPreloadQueue(): PremiumBackgroundAsset[] {
  return getPremiumBackgroundPreloadQueueForLevelWindow(1);
}

export function getAllPremiumBackgroundPreloadQueue(): PremiumBackgroundAsset[] {
  return getPremiumBackgroundPreloadQueueForLevels(LEVELS.map((level) => level.index));
}

export function getPremiumBackgroundKeysOutsideLevelWindow(
  levelNumber: number,
  options: { lookAhead?: number; totalLevels?: number } = {}
): string[] {
  const keep = new Set(
    getPremiumBackgroundPreloadQueueForLevelWindow(levelNumber, options).map((asset) => asset.key)
  );

  return getAllPremiumBackgroundPreloadQueue()
    .map((asset) => asset.key)
    .filter((key) => !keep.has(key));
}
