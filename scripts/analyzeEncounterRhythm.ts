import { LEVELS } from '../src/config/levels/registry';
import { SCROLL_SPEED } from '../src/config/constants/world';
import type { LevelConfig } from '../src/config/levels/types';

// LevelManager advances distance at SCROLL_SPEED * 60 per gameplay second.
export function analyzeEncounterRhythm(level: LevelConfig) {
  const durationMs = (level.levelDistance / (SCROLL_SPEED * 60)) * 1000;
  const terminalProgress = level.hasBoss ? level.bossTriggerProgress : 1;
  return {
    name: level.name,
    approachAtMs: durationMs * terminalProgress,
    sections: level.sections.map((section) => {
      const startMs = section.startProgress * durationMs;
      const endMs = Math.min(section.endProgress, terminalProgress) * durationMs;
      const sectionMs = (section.endProgress - section.startProgress) * durationMs;
      return {
        id: section.id,
        decision: section.summary,
        startMs,
        endMs,
        durationMs: endMs - startMs,
        waves: (section.waves ?? []).map((wave) => ({
          id: wave.id,
          atMs: startMs + wave.atMs,
          remainingMs: endMs - startMs - wave.atMs,
        })),
        hazards: (section.hazardEvents ?? []).map((hazard) => ({
          type: hazard.type,
          firstEligibleAfterMs: startMs + (hazard.cadenceMs ?? 2000),
          lastEligibleMs: startMs + Math.min(sectionMs, hazard.durationMs ?? sectionMs),
          cadenceMs: hazard.cadenceMs ?? 2000,
        })),
        drops: (section.recoveryDrops ?? []).map((drop) => ({
          id: drop.id,
          type: drop.type,
          atMs: startMs + sectionMs * drop.triggerProgress,
          beforeBossMs: level.hasBoss
            ? durationMs * terminalProgress - startMs - sectionMs * drop.triggerProgress
            : null,
          // WaveManager spawns at -40; PowerUp travels down at 60 px/s.
          portraitMidfieldArrivalMs: ((40 + 844 * 0.5) / 60) * 1000,
        })),
        randomEnemies: section.enemyFocus ?? level.enemies,
        encounterSize: section.encounterSizeOverride ?? level.encounterSize,
        spawnRateMultiplier: section.spawnRateMultiplier ?? level.spawnRateMultiplier,
      };
    }),
  };
}

if (import.meta.main) {
  console.log(
    JSON.stringify(
      {
        assumptions: [
          'Gameplay time excludes pauses; boss battle duration is not predicted.',
          'Hazard times are eligibility windows, not actual spawns. Pressure and pool capacity can delay or omit spawns.',
          'Pickup drift ignores bobbing and assumes a player at 50% of an 844px viewport.',
          'This is authored timing analysis, not a survival or enjoyment result.',
        ],
        levels: LEVELS.map(analyzeEncounterRhythm),
      },
      null,
      2
    )
  );
}
