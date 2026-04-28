export type PremiumBackgroundLayerRole = 'far' | 'nebula' | 'mid' | 'near' | 'overlay';

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
const BACKGROUND_ALPHA = 0.78;
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


export function getAllPremiumBackgroundPreloadQueue(): Array<{ key: string; url: string }> {
  const queued = new Map<string, { key: string; url: string }>();

  for (const manifest of Object.values(PREMIUM_BACKGROUND_MANIFESTS)) {
    for (const layer of manifest.layers) {
      queued.set(layer.key, { key: layer.key, url: layer.url });
    }
  }

  return [...queued.values()];
}
