type PremiumBackgroundLayerRole = 'far' | 'nebula' | 'mid' | 'near' | 'overlay';

export interface PremiumBackgroundLayerConfig {
  role: PremiumBackgroundLayerRole;
  key: string;
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
  compositeKey: string;
  runtimeLayers: PremiumBackgroundLayerConfig[];
  baseSize: { width: number; height: number };
  layers: PremiumBackgroundLayerConfig[];
}

/**
 * Premium backgrounds are generated procedurally at runtime (neon vector art
 * direction), so manifests describe layer structure only; there are no image
 * URLs to download. Textures are produced by neonBackgroundGenerator.
 */
const BASE_SIZE = { width: 1024, height: 1024 } as const;

const LEVELS = [
  { index: 1, name: 'Aurora Threshold' },
  { index: 2, name: 'Tideglass Shallows' },
  { index: 3, name: 'Ember Monsoon' },
  { index: 4, name: 'Clockwork Causeway' },
  { index: 5, name: 'Shatter Reef' },
  { index: 6, name: 'Debris Gauntlet' },
  { index: 7, name: 'Hollow Choir' },
  { index: 8, name: 'Eclipse Narrows' },
  { index: 9, name: 'Swarmfront' },
  { index: 10, name: 'Eventide Engine' },
] as const;

interface LayerSpec {
  suffix: string;
  role: PremiumBackgroundLayerRole;
  alpha: number;
  depth: number;
  scrollSpeed: number;
  blendMode?: string;
  pulse?: { amplitude: number; speed: number };
}

const LAYER_SPECS: LayerSpec[] = [
  { suffix: '', role: 'far', alpha: 1, depth: -20, scrollSpeed: 0.05 },
  {
    suffix: '_nebula',
    role: 'nebula',
    alpha: 0.9,
    depth: -19,
    scrollSpeed: 0.1,
    pulse: { amplitude: 0.05, speed: 0.0006 },
  },
  { suffix: '_mid', role: 'mid', alpha: 0.85, depth: -18, scrollSpeed: 0.16 },
  { suffix: '_near', role: 'near', alpha: 0.9, depth: -17, scrollSpeed: 0.24 },
  {
    suffix: '_overlay',
    role: 'overlay',
    alpha: 0.75,
    depth: -16,
    scrollSpeed: 0.34,
    blendMode: 'ADD',
  },
];

function createLayers(assetPrefix: string): PremiumBackgroundLayerConfig[] {
  return LAYER_SPECS.map((spec) => ({
    role: spec.role,
    key: `${assetPrefix}${spec.suffix}`,
    alpha: spec.alpha,
    depth: spec.depth,
    scrollSpeed: spec.scrollSpeed,
    ...(spec.blendMode ? { blendMode: spec.blendMode } : {}),
    ...(spec.role !== 'far' ? { transparent: true } : {}),
    ...(spec.pulse ? { pulse: spec.pulse } : {}),
  }));
}

function createManifest(level: (typeof LEVELS)[number]): PremiumBackgroundManifest {
  const assetPrefix = `bg_level${String(level.index).padStart(2, '0')}`;
  const layers = createLayers(assetPrefix);

  return {
    levelName: level.name,
    assetPrefix,
    compositeKey: `${assetPrefix}_composite`,
    baseSize: { ...BASE_SIZE },
    layers,
    runtimeLayers: [
      {
        ...layers[0],
        key: `${assetPrefix}_composite`,
        alpha: 1,
        scrollSpeed: 0.07,
      },
      {
        ...layers[2],
        key: `${assetPrefix}_motif`,
        alpha: 0.92,
        scrollSpeed: 0.18,
      },
      {
        ...layers[4],
        key: `${assetPrefix}_atmosphere`,
        alpha: 0.7,
        scrollSpeed: 0.34,
      },
    ],
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

/**
 * Level numbers to keep warm for gameplay. By default only the active level is
 * retained; PlanetIntermission explicitly generates the next level before the
 * transition, avoiding permanent double residency for three 1024px textures.
 */
export function getPremiumBackgroundLevelWindow(
  levelNumber: number,
  options: { lookAhead?: number; totalLevels?: number } = {}
): number[] {
  const totalLevels = options.totalLevels ?? LEVELS.length;
  const lookAhead = options.lookAhead ?? 0;
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

function getPremiumBackgroundKeysForLevels(levelNumbers: readonly number[]): string[] {
  const keys: string[] = [];

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
      keys.push(layer.key);
    }
    for (const layer of manifest.runtimeLayers) {
      keys.push(layer.key);
    }
  }

  return keys;
}

export function getPremiumBackgroundPreloadQueueForLevelWindow(
  levelNumber: number,
  options: { lookAhead?: number; totalLevels?: number } = {}
): string[] {
  return getPremiumBackgroundKeysForLevels(getPremiumBackgroundLevelWindow(levelNumber, options));
}

/** Boot-time queue: Level 1 only, so Menu → gameplay is ready without a second resident set. */
export function getStartupPremiumBackgroundPreloadQueue(): string[] {
  return getPremiumBackgroundPreloadQueueForLevelWindow(1);
}

export function getAllPremiumBackgroundPreloadQueue(): string[] {
  return getPremiumBackgroundKeysForLevels(LEVELS.map((level) => level.index));
}

export function getPremiumBackgroundKeysOutsideLevelWindow(
  levelNumber: number,
  options: { lookAhead?: number; totalLevels?: number } = {}
): string[] {
  const keep = new Set(getPremiumBackgroundPreloadQueueForLevelWindow(levelNumber, options));

  return getAllPremiumBackgroundPreloadQueue().filter((key) => !keep.has(key));
}
