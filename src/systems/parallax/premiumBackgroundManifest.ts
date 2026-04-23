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

export interface PremiumBackgroundManifest {
  levelName: string;
  assetPrefix: string;
  baseSize: { width: number; height: number };
  premiumAssetsReplaceProcedural: true;
  layers: PremiumBackgroundLayerConfig[];
}

const BACKGROUND_BASE_URL = '/assets/backgrounds';
const BASE_SIZE = { width: 1024, height: 2048 } as const;

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

const ROLE_DEFAULTS: Record<PremiumBackgroundLayerRole, Omit<PremiumBackgroundLayerConfig, 'role' | 'key' | 'url'>> = {
  far: { alpha: 1, depth: -14, scrollSpeed: 0.08 },
  nebula: { alpha: 0.72, depth: -12, scrollSpeed: 0.16 },
  mid: { alpha: 0.58, depth: -9, scrollSpeed: 0.28, transparent: true },
  near: { alpha: 0.38, depth: -6, scrollSpeed: 0.44, transparent: true },
  overlay: {
    alpha: 0.22,
    depth: -4,
    scrollSpeed: 0.62,
    blendMode: 'ADD',
    transparent: true,
    pulse: { amplitude: 0.08, speed: 0.0014 },
  },
};

function createLayer(levelIndex: number, role: PremiumBackgroundLayerRole): PremiumBackgroundLayerConfig {
  const key = `bg_level${String(levelIndex).padStart(2, '0')}_${role}`;
  return {
    role,
    key,
    url: `${BACKGROUND_BASE_URL}/${key}.png`,
    ...ROLE_DEFAULTS[role],
  };
}

function createManifest(level: (typeof LEVELS)[number]): PremiumBackgroundManifest {
  const assetPrefix = `bg_level${String(level.index).padStart(2, '0')}`;

  return {
    levelName: level.name,
    assetPrefix,
    baseSize: { ...BASE_SIZE },
    premiumAssetsReplaceProcedural: true,
    layers: (['far', 'nebula', 'mid', 'near', 'overlay'] as const).map((role) => createLayer(level.index, role)),
  };
}

export const PREMIUM_BACKGROUND_MANIFESTS: Record<string, PremiumBackgroundManifest> = Object.fromEntries(
  LEVELS.map((level) => [level.name, createManifest(level)])
) as Record<string, PremiumBackgroundManifest>;

export function getPremiumBackgroundManifest(levelName: string | undefined): PremiumBackgroundManifest | undefined {
  if (!levelName) {
    return undefined;
  }

  return PREMIUM_BACKGROUND_MANIFESTS[levelName];
}

export function getPremiumBackgroundPreloadQueue(levelName: string | undefined): Array<{ key: string; url: string }> {
  const manifest = getPremiumBackgroundManifest(levelName);

  if (!manifest) {
    return [];
  }

  return manifest.layers.map((layer) => ({ key: layer.key, url: layer.url }));
}
