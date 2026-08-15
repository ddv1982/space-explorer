export type VisualQualityTier = 'low' | 'standard' | 'high';

export interface VisualQualityProfile {
  tier: VisualQualityTier;
  entityTextureResolution: number;
  particleTextureResolution: number;
  backgroundLayerCount: number;
}

export const VISUAL_QUALITY_STORAGE_KEY = 'space-explorer.visualQuality.v1';

type VisualQualityStorage = Pick<Storage, 'getItem' | 'setItem'>;

const PROFILES: Record<VisualQualityTier, VisualQualityProfile> = {
  low: {
    tier: 'low',
    entityTextureResolution: 1,
    particleTextureResolution: 1,
    backgroundLayerCount: 2,
  },
  standard: {
    tier: 'standard',
    entityTextureResolution: 2,
    particleTextureResolution: 2,
    backgroundLayerCount: 3,
  },
  high: {
    tier: 'high',
    entityTextureResolution: 3,
    particleTextureResolution: 2,
    backgroundLayerCount: 3,
  },
};

function isVisualQualityTier(value: unknown): value is VisualQualityTier {
  return value === 'low' || value === 'standard' || value === 'high';
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
