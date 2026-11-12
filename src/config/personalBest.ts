import type { GameplayDifficultyTier } from './gameplayDifficulty';
import { createStoredPreference, storedRecord, type PreferenceStorage } from './storedPreference';

/** The best final score per difficulty. Kept in this browser only; it is never sent anywhere. */
type PersonalBests = Record<GameplayDifficultyTier, number>;

const TIERS: readonly GameplayDifficultyTier[] = ['low', 'normal', 'high'];

function readBest(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
}

const preference = createStoredPreference<PersonalBests>('space-explorer.personalBest.v1', (stored) => {
  const record = storedRecord(stored);
  return { low: readBest(record.low), normal: readBest(record.normal), high: readBest(record.high) };
});

export interface RunScoreResult {
  /** The best score on this difficulty, counting this run. */
  best: number;
  /** True when this run set or matched the best with a score above zero. */
  isNewBest: boolean;
}

/**
 * Records a finished run's score and reports how it compares. Safe to call again for the same run (a
 * summary screen is rebuilt when the window resizes): the result stays the same.
 */
export function recordRunScore(
  score: number,
  tier: GameplayDifficultyTier,
  storage?: PreferenceStorage | null
): RunScoreResult {
  // Another tab may have set a best since this one last looked.
  const bests = storage === undefined ? preference.reload() : preference.get(storage);
  const finalScore = readBest(score);
  const previous = TIERS.includes(tier) ? bests[tier] : 0;
  if (finalScore > previous) preference.set({ ...bests, [tier]: finalScore }, storage);
  return { best: Math.max(previous, finalScore), isNewBest: finalScore > 0 && finalScore >= previous };
}
