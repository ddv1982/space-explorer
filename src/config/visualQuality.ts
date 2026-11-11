/**
 * Player-facing visual quality. Auto is the full look and adapts at runtime (RuntimePerformanceBudget
 * and the lighting budget shed cost under pressure); Low is the baked look with no dynamic lighting.
 */
export type VisualQualityTier = 'auto' | 'low';

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
};

/** Low stays Low; everything else, including the retired Standard and High tiers, reads as Auto. */
function parseStoredTier(value: string | null | undefined): VisualQualityTier {
  return value === 'low' ? 'low' : 'auto';
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

function readTier(storage: VisualQualityStorage | null): VisualQualityTier {
  try {
    return parseStoredTier(storage?.getItem(VISUAL_QUALITY_STORAGE_KEY));
  } catch {
    return 'auto';
  }
}

/** The browser's stored tier, remembered between reads; `setVisualQualityTier` refreshes it. */
let rememberedTier: VisualQualityTier | null = null;

/**
 * Effects ask for the tier many times per frame and `localStorage` is a synchronous call into the
 * browser, so the browser's own storage is read once and remembered. An explicit `storage` is always
 * read directly.
 */
export function getVisualQualityTier(storage?: VisualQualityStorage | null): VisualQualityTier {
  if (storage !== undefined) return readTier(storage);
  if (rememberedTier) return rememberedTier;
  const browserStorage = getVisualQualityStorage();
  const tier = readTier(browserStorage);
  if (browserStorage) rememberedTier = tier;
  return tier;
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
    rememberedTier = null;
    return true;
  } catch {
    return false;
  }
}

export function getVisualQualityProfile(storage?: VisualQualityStorage | null): VisualQualityProfile {
  return PROFILES[getVisualQualityTier(storage)];
}
