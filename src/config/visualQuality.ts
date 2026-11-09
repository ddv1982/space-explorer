export type VisualQualityTier = 'low' | 'standard' | 'high' | 'auto';

export interface VisualQualityProfile {
  tier: VisualQualityTier;
  uiGlowStrength: number;
  particleBurstScale: number;
  particleQuantityScale: number;
  menuAtmosphere: number;
  /** Pooled dynamic lights (explosions, engines). 0 keeps the baked-light look only. */
  dynamicLights: number;
  /** Per-pixel lighting of v2 sprites through their normal maps. */
  normalMapLighting: boolean;
  bloom: 'off' | 'soft' | 'full';
}

export const VISUAL_QUALITY_STORAGE_KEY = 'space-explorer.visualQuality.v1';

type VisualQualityStorage = Pick<Storage, 'getItem' | 'setItem'>;

const PROFILES: Record<VisualQualityTier, VisualQualityProfile> = {
  low: {
    tier: 'low',
    uiGlowStrength: 0.4,
    particleBurstScale: 0.75,
    particleQuantityScale: 0.6,
    menuAtmosphere: 1,
    dynamicLights: 0,
    normalMapLighting: false,
    bloom: 'off',
  },
  standard: {
    tier: 'standard',
    uiGlowStrength: 0.8,
    particleBurstScale: 0.9,
    particleQuantityScale: 0.8,
    menuAtmosphere: 2,
    dynamicLights: 4,
    normalMapLighting: true,
    bloom: 'soft',
  },
  high: {
    tier: 'high',
    uiGlowStrength: 1,
    particleBurstScale: 1.15,
    particleQuantityScale: 1,
    menuAtmosphere: 3,
    dynamicLights: 8,
    normalMapLighting: true,
    bloom: 'full',
  },
  auto: {
    tier: 'auto',
    uiGlowStrength: 1,
    particleBurstScale: 1.15,
    particleQuantityScale: 1,
    menuAtmosphere: 3,
    dynamicLights: 8,
    normalMapLighting: true,
    bloom: 'full',
  },
};

function isVisualQualityTier(value: unknown): value is VisualQualityTier {
  return value === 'low' || value === 'standard' || value === 'high' || value === 'auto';
}

function getVisualQualityStorage(): VisualQualityStorage | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function getVisualQualityTier(
  storage: VisualQualityStorage | null = getVisualQualityStorage()
): VisualQualityTier {
  try {
    const stored = storage?.getItem(VISUAL_QUALITY_STORAGE_KEY);
    return isVisualQualityTier(stored) ? stored : 'standard';
  } catch {
    return 'standard';
  }
}

export function setVisualQualityTier(
  tier: VisualQualityTier,
  storage: VisualQualityStorage | null = getVisualQualityStorage()
): boolean {
  if (!storage) {
    return false;
  }

  try {
    storage.setItem(VISUAL_QUALITY_STORAGE_KEY, tier);
    return true;
  } catch {
    return false;
  }
}

export function getVisualQualityProfile(
  storage: VisualQualityStorage | null = getVisualQualityStorage()
): VisualQualityProfile {
  return PROFILES[getVisualQualityTier(storage)];
}
