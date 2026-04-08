import { LEVELS } from '../src/config/levels/registry';
import { CORE_CAMPAIGN } from '../src/config/levels/definitions/coreCampaign';
import type { LevelConfig, LevelSectionConfig, ScriptedHazardConfig } from '../src/config/levels/types';

interface ValidationIssue {
  level: string;
  message: string;
}

const errors: ValidationIssue[] = [];
const warnings: ValidationIssue[] = [];

const EARLY_LEVEL_GUARDRAIL_COUNT = 2;
const EARLY_LEVEL_GATE_WARNING_THRESHOLD = 0.5;
const EARLY_LEVEL_PHASE_SCATTER_WARNING_THRESHOLD = 3;
const EARLY_LEVELS = new Set(
  CORE_CAMPAIGN.levels.slice(0, EARLY_LEVEL_GUARDRAIL_COUNT).map((level) => levelLabel(level))
);

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

function isFiniteNumber(value: number): boolean {
  return Number.isFinite(value);
}

function validateEarlyLevelRhythmGuardrails(level: LevelConfig, trackName: 'stage' | 'boss'): void {
  const levelName = levelLabel(level);
  if (!EARLY_LEVELS.has(levelName)) {
    return;
  }

  const track = level.music[trackName];
  const trackScope = `music.${trackName}`;
  const { beatsPerBar, beatUnit } = track.intent.timeSignature;
  const quarterNotesPerBar = beatsPerBar * (4 / beatUnit);
  const stepsPerBar = Math.max(1, Math.round(track.stepsPerBeat * quarterNotesPerBar));
  const isOddMeter = Number.isInteger(beatsPerBar) && Math.abs(beatsPerBar % 2) === 1;
  const rhythmLayers = [
    ['bass', track.bass.rhythm],
    ['pulse', track.pulse?.rhythm],
    ['lead', track.lead?.rhythm],
    ['noise', track.noise?.rhythm],
  ] as const;

  for (const [layerName, rhythm] of rhythmLayers) {
    if (!rhythm) {
      continue;
    }

    const rhythmScope = `${trackScope}.${layerName}.rhythm`;

    if (
      isOddMeter &&
      isFiniteNumber(rhythm.division ?? Number.NaN) &&
      rhythm.division !== beatsPerBar &&
      rhythm.division !== stepsPerBar
    ) {
      pushWarning(
        levelName,
        `${rhythmScope}: early-level odd-meter division ${rhythm.division} is off bar grid; expected ${beatsPerBar} (beatsPerBar) or ${stepsPerBar} (stepsPerBar)`
      );
    }

    if (isFiniteNumber(rhythm.gate ?? Number.NaN) && rhythm.gate < EARLY_LEVEL_GATE_WARNING_THRESHOLD) {
      pushWarning(
        levelName,
        `${rhythmScope}: early-level gate ${rhythm.gate.toFixed(2)} is below recommended threshold ${EARLY_LEVEL_GATE_WARNING_THRESHOLD.toFixed(2)}`
      );
    }
  }

  const phaseValues = rhythmLayers
    .filter(([, rhythm]) => rhythm && isFiniteNumber(rhythm.phase ?? Number.NaN))
    .map(([, rhythm]) => rhythm!.phase as number);

  if (phaseValues.length < 2) {
    return;
  }

  const minPhase = Math.min(...phaseValues);
  const maxPhase = Math.max(...phaseValues);
  const scatter = maxPhase - minPhase;
  if (scatter > EARLY_LEVEL_PHASE_SCATTER_WARNING_THRESHOLD) {
    pushWarning(
      levelName,
      `${trackScope}: early-level rhythm phase scatter ${scatter.toFixed(2)} exceeds recommended limit ${EARLY_LEVEL_PHASE_SCATTER_WARNING_THRESHOLD.toFixed(2)}`
    );
  }
}

function validateMusicLayerRhythm(
  levelName: string,
  trackScope: string,
  layerName: 'bass' | 'pulse' | 'lead' | 'noise',
  rhythm: LevelConfig['music']['stage']['bass']['rhythm']
): void {
  if (!rhythm) {
    return;
  }

  const rhythmScope = `${trackScope}.${layerName}.rhythm`;

  if (!isFiniteNumber(rhythm.division ?? Number.NaN) || (rhythm.division ?? 0) <= 0) {
    pushError(levelName, `${rhythmScope}: division must be a finite number > 0`);
  }

  if (!isFiniteNumber(rhythm.gate ?? Number.NaN) || (rhythm.gate ?? -1) < 0 || (rhythm.gate ?? 2) > 1) {
    pushError(levelName, `${rhythmScope}: gate must be a finite number in [0, 1]`);
  }

  if (rhythm.phase !== undefined && !isFiniteNumber(rhythm.phase)) {
    pushError(levelName, `${rhythmScope}: phase must be finite when provided`);
  }

  if (rhythm.accentAmount !== undefined && !isFiniteNumber(rhythm.accentAmount)) {
    pushError(levelName, `${rhythmScope}: accentAmount must be finite when provided`);
  }

  rhythm.accentPattern?.forEach((step, stepIndex) => {
    if (!isFiniteNumber(step)) {
      pushError(levelName, `${rhythmScope}: accentPattern[${stepIndex}] must be finite`);
    }
  });
}

function validateMusicTrack(level: LevelConfig, trackName: 'stage' | 'boss'): void {
  const levelName = levelLabel(level);
  const track = level.music[trackName];
  const trackScope = `music.${trackName}`;

  if (!isFiniteNumber(track.tempo) || track.tempo <= 0) {
    pushError(levelName, `${trackScope}: tempo must be a finite number > 0`);
  }

  if (!isFiniteNumber(track.rootHz) || track.rootHz <= 0) {
    pushError(levelName, `${trackScope}: rootHz must be a finite number > 0`);
  }

  if (!isFiniteNumber(track.stepsPerBeat) || track.stepsPerBeat <= 0) {
    pushError(levelName, `${trackScope}: stepsPerBeat must be a finite number > 0`);
  }

  if (!isFiniteNumber(track.masterGain) || track.masterGain <= 0) {
    pushError(levelName, `${trackScope}: masterGain must be a finite number > 0`);
  }

  if (track.intent.deterministicSeed.trim().length === 0) {
    pushError(levelName, `${trackScope}.intent: deterministicSeed must be non-empty`);
  }

  if (!isFiniteNumber(track.intent.timeSignature.beatsPerBar) || track.intent.timeSignature.beatsPerBar <= 0) {
    pushError(levelName, `${trackScope}.intent.timeSignature: beatsPerBar must be a finite number > 0`);
  }

  if (![2, 4, 8, 16].includes(track.intent.timeSignature.beatUnit)) {
    pushError(levelName, `${trackScope}.intent.timeSignature: beatUnit must be one of 2, 4, 8, 16`);
  }

  const harmonySteps = track.intent.descriptors.harmony.steps;
  if (harmonySteps.length === 0) {
    pushError(levelName, `${trackScope}.intent.descriptors.harmony: steps must be non-empty`);
  }

  harmonySteps.forEach((step, stepIndex) => {
    if (step.degree < 1 || step.degree > 7) {
      pushError(levelName, `${trackScope}.intent.descriptors.harmony.steps[${stepIndex}]: degree must be in [1, 7]`);
    }

    if (!isFiniteNumber(step.barsDuration) || step.barsDuration <= 0) {
      pushError(
        levelName,
        `${trackScope}.intent.descriptors.harmony.steps[${stepIndex}]: barsDuration must be a finite number > 0`
      );
    }
  });

  const arrangement = track.intent.descriptors.arrangement;
  if (arrangement) {
    if (arrangement.sections.length === 0) {
      pushError(levelName, `${trackScope}.intent.descriptors.arrangement: sections must be non-empty`);
    }

    arrangement.sections.forEach((section, sectionIndex) => {
      const sectionScope = `${trackScope}.intent.descriptors.arrangement.sections[${sectionIndex}]`;
      if (!isFiniteNumber(section.barsDuration) || section.barsDuration <= 0) {
        pushError(levelName, `${sectionScope}: barsDuration must be a finite number > 0`);
      }

      if (!isFiniteNumber(section.density) || section.density < 0 || section.density > 1) {
        pushError(levelName, `${sectionScope}: density must be a finite number in [0, 1]`);
      }

      if (!isFiniteNumber(section.energyLift)) {
        pushError(levelName, `${sectionScope}: energyLift must be finite`);
      }

      const multipliers = section.layerGainMultipliers;
      if (multipliers) {
        for (const layer of ['bass', 'pulse', 'lead', 'noise'] as const) {
          const value = multipliers[layer];
          if (value !== undefined && !isFiniteNumber(value)) {
            pushError(levelName, `${sectionScope}.layerGainMultipliers.${layer}: must be finite when provided`);
          }
        }
      }
    });
  }

  validateMusicLayerRhythm(levelName, trackScope, 'bass', track.bass.rhythm);
  validateMusicLayerRhythm(levelName, trackScope, 'pulse', track.pulse?.rhythm);
  validateMusicLayerRhythm(levelName, trackScope, 'lead', track.lead?.rhythm);
  validateMusicLayerRhythm(levelName, trackScope, 'noise', track.noise?.rhythm);
  validateEarlyLevelRhythmGuardrails(level, trackName);
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
  validateMusicTrack(level, 'stage');
  validateMusicTrack(level, 'boss');
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
