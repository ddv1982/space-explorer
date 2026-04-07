import { LEVELS } from '../src/config/levels/registry';
import type { LevelConfig, LevelSectionConfig, ScriptedHazardConfig } from '../src/config/levels/types';

interface ValidationIssue {
  level: string;
  message: string;
}

const errors: ValidationIssue[] = [];
const warnings: ValidationIssue[] = [];

function pushError(level: string, message: string): void {
  errors.push({ level, message });
}

function pushWarning(level: string, message: string): void {
  warnings.push({ level, message });
}

function levelLabel(level: LevelConfig): string {
  return `${level.name} (${level.planetName})`;
}

function validateHazard(levelName: string, section: LevelSectionConfig, hazard: ScriptedHazardConfig, index: number): void {
  const prefix = `${section.id} hazard[${index}]`;

  if (hazard.cadenceMs !== undefined && hazard.cadenceMs <= 0) {
    pushError(levelName, `${prefix}: cadenceMs must be > 0`);
  }

  if (hazard.durationMs !== undefined && hazard.durationMs <= 0) {
    pushError(levelName, `${prefix}: durationMs must be > 0`);
  }

  if (hazard.intensity !== undefined && (hazard.intensity < 0 || hazard.intensity > 1.25)) {
    pushError(levelName, `${prefix}: intensity must be between 0 and 1.25`);
  }

  if (hazard.type === 'rock-corridor') {
    if (hazard.laneCount !== undefined && (hazard.laneCount < 1 || hazard.laneCount > 3)) {
      pushError(levelName, `${prefix}: rock-corridor laneCount must be between 1 and 3`);
    }

    if (hazard.corridorWidth !== undefined && (hazard.corridorWidth < 140 || hazard.corridorWidth > 280)) {
      pushWarning(levelName, `${prefix}: corridorWidth is outside typical 140-280 range`);
    }
  }

  if (hazard.damage !== undefined && hazard.damage < 0) {
    pushError(levelName, `${prefix}: damage must be >= 0`);
  }
}

function validateSectionSequence(level: LevelConfig): void {
  const name = levelLabel(level);
  if (level.sections.length === 0) {
    pushError(name, 'must define at least one section');
    return;
  }

  const sorted = [...level.sections].sort((a, b) => a.startProgress - b.startProgress);
  const first = sorted[0];
  const last = sorted[sorted.length - 1];
  const expectedTerminalProgress = level.hasBoss ? level.bossTriggerProgress : 1;

  if (Math.abs(first.startProgress - 0) > 1e-6) {
    pushError(name, 'first section must start at progress 0');
  }

  if (Math.abs(last.endProgress - expectedTerminalProgress) > 1e-6) {
    pushError(
      name,
      `last section must end at progress ${expectedTerminalProgress.toFixed(2)}`
    );
  }

  for (let i = 0; i < sorted.length; i++) {
    const section = sorted[i];
    if (section.startProgress < 0 || section.endProgress > 1) {
      pushError(name, `${section.id}: section progress must stay within [0, 1]`);
    }

    if (section.endProgress <= section.startProgress) {
      pushError(name, `${section.id}: endProgress must be > startProgress`);
    }

    if (section.encounterSizeOverride) {
      if (
        section.encounterSizeOverride.min < 1 ||
        section.encounterSizeOverride.max < section.encounterSizeOverride.min
      ) {
        pushError(name, `${section.id}: invalid encounterSizeOverride bounds`);
      }
    }

    if (section.spawnRateMultiplier !== undefined && section.spawnRateMultiplier <= 0) {
      pushError(name, `${section.id}: spawnRateMultiplier must be > 0`);
    }

    if (section.asteroidInterval !== undefined && section.asteroidInterval <= 0) {
      pushError(name, `${section.id}: asteroidInterval must be > 0`);
    }

    section.hazardEvents?.forEach((hazard, hazardIndex) => {
      validateHazard(name, section, hazard, hazardIndex);
    });

    const next = sorted[i + 1];
    if (!next) {
      continue;
    }

    const delta = next.startProgress - section.endProgress;
    if (Math.abs(delta) > 1e-6) {
      pushError(name, `${section.id} -> ${next.id}: sections must be contiguous without gaps/overlaps`);
    }
  }
}

function validateBossConfig(level: LevelConfig): void {
  const name = levelLabel(level);

  if (level.hasBoss) {
    if (!level.boss) {
      pushError(name, 'hasBoss=true requires a boss config');
    }

    if (level.bossTriggerProgress <= 0 || level.bossTriggerProgress >= 1) {
      pushError(name, 'bossTriggerProgress must be between 0 and 1');
    }

    const hasBossApproachSection = level.sections.some((section) => section.phase === 'boss-approach');
    if (!hasBossApproachSection) {
      pushWarning(name, 'boss level has no boss-approach section');
    }
  } else {
    if (level.boss !== null) {
      pushError(name, 'hasBoss=false should use boss: null');
    }

    if (level.bossTriggerProgress <= 0 || level.bossTriggerProgress > 1) {
      pushError(name, 'non-boss levels should keep bossTriggerProgress in (0, 1]');
    }
  }
}

for (const level of LEVELS) {
  const name = levelLabel(level);

  if (level.spawnRateMultiplier <= 0) {
    pushError(name, 'spawnRateMultiplier must be > 0');
  }

  if (level.asteroidInterval <= 0) {
    pushError(name, 'asteroidInterval must be > 0');
  }

  if (level.levelDistance <= 0) {
    pushError(name, 'levelDistance must be > 0');
  }

  if (level.encounterSize.min < 1 || level.encounterSize.max < level.encounterSize.min) {
    pushError(name, 'encounterSize must have min >= 1 and max >= min');
  }

  validateSectionSequence(level);
  validateBossConfig(level);
}

if (warnings.length > 0) {
  console.log('Level validation warnings:');
  for (const warning of warnings) {
    console.log(`- ${warning.level}: ${warning.message}`);
  }
}

if (errors.length > 0) {
  console.error('Level validation failed:');
  for (const error of errors) {
    console.error(`- ${error.level}: ${error.message}`);
  }
  throw new Error(`Level validation found ${errors.length} error(s).`);
}

console.log(`Level validation passed (${LEVELS.length} levels checked).`);
