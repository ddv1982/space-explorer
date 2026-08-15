export type GameplayDifficultyTier = 'low' | 'normal' | 'high';

export interface GameplayDifficultyProfile {
  tier: GameplayDifficultyTier;
  hullDamageMultiplier: number;
}

export const GAMEPLAY_DIFFICULTY_STORAGE_KEY = 'space-explorer.gameplayDifficulty.v1';

type GameplayDifficultyStorage = Pick<Storage, 'getItem' | 'setItem'>;

const PROFILES: Record<GameplayDifficultyTier, GameplayDifficultyProfile> = {
  low: {
    tier: 'low',
    hullDamageMultiplier: 0.75,
  },
  normal: {
    tier: 'normal',
    hullDamageMultiplier: 1,
  },
  high: {
    tier: 'high',
    hullDamageMultiplier: 1.25,
  },
};

function isGameplayDifficultyTier(value: unknown): value is GameplayDifficultyTier {
  return value === 'low' || value === 'normal' || value === 'high';
}

function getGameplayDifficultyStorage(): GameplayDifficultyStorage | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function getGameplayDifficultyTier(
  storage: GameplayDifficultyStorage | null = getGameplayDifficultyStorage()
): GameplayDifficultyTier {
  try {
    const stored = storage?.getItem(GAMEPLAY_DIFFICULTY_STORAGE_KEY);
    return isGameplayDifficultyTier(stored) ? stored : 'normal';
  } catch {
    return 'normal';
  }
}

export function setGameplayDifficultyTier(
  tier: GameplayDifficultyTier,
  storage: GameplayDifficultyStorage | null = getGameplayDifficultyStorage()
): boolean {
  if (!storage) {
    return false;
  }

  try {
    storage.setItem(GAMEPLAY_DIFFICULTY_STORAGE_KEY, tier);
    return true;
  } catch {
    return false;
  }
}

export function getGameplayDifficultyProfile(
  storage: GameplayDifficultyStorage | null = getGameplayDifficultyStorage()
): GameplayDifficultyProfile {
  return PROFILES[getGameplayDifficultyTier(storage)];
}
