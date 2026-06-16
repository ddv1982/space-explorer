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
const EARLY_LEVEL_MIN_HAZARD_CADENCE_MS = 1800;
const EARLY_LEVEL_MAX_HAZARD_INTENSITY = 0.62;
const MIN_RELEASE_INTENSITY_DELTA = 0.18;
const HAZARD_INTENSITY_JUMP_WARNING_DELTA = 0.35;
const HAZARD_CADENCE_JUMP_WARNING_RATIO = 1.8;
const MIN_GAMEPLAY_SECTION_SPAN = 0.08;
const HIGH_PRESSURE_MUSIC_INTENSITY = 0.78;
const MIN_SIGNATURE_WAVE_TELEGRAPH_PROGRESS = 0.12;
const HAZARD_PRESSURE_DECAY_PER_MS = 1 / 1800;
const HAZARD_PRESSURE_MAX = 2.4;
const HAZARD_REACHABILITY_STEP_MS = 100;
const HAZARD_REACHABILITY_CYCLES = 6;
const HAZARD_BASE_PRESSURE_COST: Record<ScriptedHazardConfig['type'], number> = {
  'ambient-asteroids': 0.35,
  'debris-surge': 0.55,
  minefield: 0.7,
  'nebula-ambush': 0.78,
  'ring-crossfire': 0.85,
  'rock-corridor': 1.05,
  'energy-storm': 0.95,
  'gravity-well': 1.1,
};
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

  if (hazard.coverHp !== undefined && hazard.coverHp <= 0) {
    pushError(levelName, `${prefix}: coverHp must be > 0 when provided`);
  }

  if (hazard.coverHp !== undefined && hazard.coverIndestructible === true) {
    pushWarning(levelName, `${prefix}: coverHp is ignored when coverIndestructible=true`);
  }
}

function validateAuthoredSectionContent(levelName: string, section: LevelSectionConfig): void {
  section.signatureWaves?.forEach((wave, waveIndex) => {
    const prefix = `${section.id} signatureWaves[${waveIndex}]`;
    if (wave.id.trim().length === 0) {
      pushError(levelName, `${prefix}: id must be non-empty`);
    }

    if (wave.triggerProgress < 0 || wave.triggerProgress > 1) {
      pushError(levelName, `${prefix}: triggerProgress must be within [0, 1]`);
    }

    if (wave.enemies.length === 0) {
      pushError(levelName, `${prefix}: enemies must be non-empty`);
    }

    if (wave.enemies.length > 3) {
      pushWarning(levelName, `${prefix}: more than three authored enemies may reduce mobile lane readability`);
    }

    if (wave.triggerProgress < MIN_SIGNATURE_WAVE_TELEGRAPH_PROGRESS) {
      pushWarning(
        levelName,
        `${prefix}: triggerProgress ${wave.triggerProgress.toFixed(2)} may not leave enough Lane-Reading setup before the authored wave`
      );
    }

    const laneReadingText = `${section.summary} ${wave.notes ?? ''}`.toLowerCase();
    if (!/(lane|route|shelter|cover|telegraph|read)/.test(laneReadingText)) {
      pushWarning(
        levelName,
        `${prefix}: notes/summary should explain the Lane-Reading or route cue protected by this authored wave`
      );
    }

    const laneCounts = new Map<string, number>();
    wave.enemies.forEach((enemy, enemyIndex) => {
      laneCounts.set(enemy.lane, (laneCounts.get(enemy.lane) ?? 0) + 1);
      if (enemy.y !== undefined && enemy.y > 0) {
        pushWarning(levelName, `${prefix}.enemies[${enemyIndex}]: positive y starts may reduce spawn telegraph time`);
      }
    });

    for (const [lane, count] of laneCounts) {
      if (count > 2) {
        pushWarning(levelName, `${prefix}: ${count} enemies share the ${lane} lane; consider spreading the wave`);
      }
    }
  });

  section.recoveryDrops?.forEach((drop, dropIndex) => {
    const prefix = `${section.id} recoveryDrops[${dropIndex}]`;
    if (drop.id.trim().length === 0) {
      pushError(levelName, `${prefix}: id must be non-empty`);
    }

    if (drop.triggerProgress < 0 || drop.triggerProgress > 1) {
      pushError(levelName, `${prefix}: triggerProgress must be within [0, 1]`);
    }

    const recoveryText = `${section.summary} ${drop.notes ?? ''}`.toLowerCase();
    if (!/(recovery beat|relief|breath|stabiliz|task-shift)/.test(recoveryText)) {
      pushWarning(
        levelName,
        `${prefix}: notes/summary should identify the Recovery Beat purpose instead of only placing a pickup`
      );
    }

    if (
      section.phase !== 'boss-approach' &&
      (section.musicIntensity ?? 0) >= HIGH_PRESSURE_MUSIC_INTENSITY &&
      drop.triggerProgress < 0.5
    ) {
      pushWarning(
        levelName,
        `${prefix}: high-pressure Recovery Beat appears before the section midpoint; verify it follows a pressure peak`
      );
    }
  });
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

    const sectionSpan = section.endProgress - section.startProgress;
    if (section.phase !== 'boss-approach' && sectionSpan < MIN_GAMEPLAY_SECTION_SPAN) {
      pushWarning(
        name,
        `${section.id}: gameplay section span ${sectionSpan.toFixed(2)} may be too short for readable Within-Level Pacing`
      );
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
    validateAuthoredSectionContent(name, section);
    validateHazardReachability(name, section);

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

function average(values: number[]): number | null {
  if (values.length === 0) {
    return null;
  }

  return values.reduce((total, value) => total + value, 0) / values.length;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function getValidationHazardPressureCost(hazard: ScriptedHazardConfig): number {
  const baseCost = HAZARD_BASE_PRESSURE_COST[hazard.type];
  const intensity = clamp(hazard.intensity ?? 0.5, 0, 1.25);
  return baseCost * (0.8 + (1.35 - 0.8) * intensity);
}

function simulateHazardReachability(hazards: ScriptedHazardConfig[]): { counts: number[]; horizonMs: number } {
  const maxCadenceMs = Math.max(...hazards.map((hazard) => hazard.cadenceMs ?? 2000));
  const maxDurationMs = Math.max(...hazards.map((hazard) => hazard.durationMs ?? 0));
  const horizonMs = Math.max(maxCadenceMs * HAZARD_REACHABILITY_CYCLES, maxDurationMs);
  const counts = hazards.map(() => 0);
  const lastTriggered = hazards.map(() => 0);
  let hazardPressure = 0;

  for (let time = HAZARD_REACHABILITY_STEP_MS; time <= horizonMs; time += HAZARD_REACHABILITY_STEP_MS) {
    hazardPressure = Math.max(0, hazardPressure - HAZARD_REACHABILITY_STEP_MS * HAZARD_PRESSURE_DECAY_PER_MS);

    hazards.forEach((hazard, index) => {
      const cadence = hazard.cadenceMs ?? 2000;
      const duration = hazard.durationMs;

      if (duration !== undefined && time > Math.max(0, duration)) {
        return;
      }

      if (time <= lastTriggered[index] + cadence) {
        return;
      }

      const pressureCost = getValidationHazardPressureCost(hazard);
      if (hazardPressure + pressureCost > HAZARD_PRESSURE_MAX) {
        return;
      }

      hazardPressure = Math.min(HAZARD_PRESSURE_MAX, hazardPressure + pressureCost);
      lastTriggered[index] = time;
      counts[index] += 1;
    });
  }

  return { counts, horizonMs };
}

function validateHazardReachability(levelName: string, section: LevelSectionConfig): void {
  const hazards = section.hazardEvents;
  if (!hazards?.length) {
    return;
  }

  const { counts, horizonMs } = simulateHazardReachability(hazards);
  counts.forEach((count, hazardIndex) => {
    if (count > 0) {
      return;
    }

    pushError(
      levelName,
      `${section.id} hazard[${hazardIndex}] (${hazards[hazardIndex].type}) is not pressure-reachable within ${horizonMs}ms; stagger cadence/order or reduce pressure`
    );
  });
}

function validatePacingGuardrails(level: LevelConfig): void {
  const name = levelLabel(level);
  const sorted = [...level.sections].sort((a, b) => a.startProgress - b.startProgress);
  if (sorted.length === 0) {
    return;
  }

  if (sorted[0]?.phase !== 'intro') {
    pushWarning(name, `first section phase is '${sorted[0]?.phase}', expected 'intro' for onboarding readability`);
  }

  const hasBuild = sorted.some((section) => section.phase === 'build');
  const hasHazardOrClimax = sorted.some((section) => section.phase === 'hazard' || section.phase === 'climax');
  if (!hasBuild || !hasHazardOrClimax) {
    pushWarning(name, 'section progression should include both build and hazard/climax phases to create a readable difficulty arc');
  }

  if (level.coreGameplayIdea.trim().length < 24) {
    pushWarning(name, 'coreGameplayIdea should state the level Dominant Motif in concrete project language');
  }

  const motifText = level.coreGameplayIdea.toLowerCase();
  const motifIsReferenced = sorted.some((section) => {
    const summary = section.summary.toLowerCase();
    return motifText
      .split(/[^a-z0-9]+/)
      .filter((word) => word.length >= 6)
      .some((word) => summary.includes(word));
  });
  if (!motifIsReferenced) {
    pushWarning(name, 'section summaries should echo or twist the Dominant Motif rather than reading as disconnected pressure beats');
  }

  const musicIntensities = sorted
    .map((section) => section.musicIntensity)
    .filter((value): value is number => value !== undefined);
  if (!level.hasBoss && musicIntensities.length >= 2) {
    const peakIntensity = Math.max(...musicIntensities);
    const lastIntensity = musicIntensities[musicIntensities.length - 1] ?? peakIntensity;
    if (peakIntensity - lastIntensity < MIN_RELEASE_INTENSITY_DELTA) {
      pushWarning(
        name,
        `music intensity release window is shallow (peak ${peakIntensity.toFixed(2)} -> end ${lastIntensity.toFixed(2)}); consider stronger post-climax recovery`
      );
    }
  }

  let previousCadence: number | null = null;
  let previousIntensity: number | null = null;
  const seenHazards = new Set<ScriptedHazardConfig['type']>();
  for (const section of sorted) {
    const cadences = section.hazardEvents
      ?.map((hazard) => hazard.cadenceMs)
      .filter((value): value is number => value !== undefined) ?? [];
    const intensities = section.hazardEvents
      ?.map((hazard) => hazard.intensity)
      .filter((value): value is number => value !== undefined) ?? [];

    const cadence = average(cadences);
    const intensity = average(intensities);

    for (const [hazardIndex, hazard] of section.hazardEvents?.entries() ?? []) {
      if (
        hazard.type === 'nebula-ambush' &&
        (hazard.intensity ?? 0.5) >= 0.6 &&
        section.phase !== 'build' &&
        !seenHazards.has('nebula-ambush')
      ) {
        pushWarning(
          name,
          `${section.id} hazard[${hazardIndex}]: high-pressure nebula-ambush lacks an earlier Ambush Anticipation setup cue`
        );
      }

      seenHazards.add(hazard.type);
    }

    if (cadence !== null && previousCadence !== null) {
      const ratio = cadence > previousCadence ? cadence / previousCadence : previousCadence / cadence;
      if (ratio >= HAZARD_CADENCE_JUMP_WARNING_RATIO) {
        pushWarning(
          name,
          `${section.id}: average hazard cadence jump vs previous section may feel abrupt (${previousCadence.toFixed(0)}ms -> ${cadence.toFixed(0)}ms)`
        );
      }
    }

    if (intensity !== null && previousIntensity !== null) {
      const delta = Math.abs(intensity - previousIntensity);
      if (delta >= HAZARD_INTENSITY_JUMP_WARNING_DELTA) {
        pushWarning(
          name,
          `${section.id}: average hazard intensity jump vs previous section is large (${previousIntensity.toFixed(2)} -> ${intensity.toFixed(2)})`
        );
      }
    }

    if (cadence !== null) {
      previousCadence = cadence;
    }

    if (intensity !== null) {
      previousIntensity = intensity;
    }
  }

  if (!EARLY_LEVELS.has(name)) {
    return;
  }

  for (const section of sorted) {
    for (const [hazardIndex, hazard] of section.hazardEvents?.entries() ?? []) {
      if (hazard.cadenceMs !== undefined && hazard.cadenceMs < EARLY_LEVEL_MIN_HAZARD_CADENCE_MS) {
        pushWarning(
          name,
          `${section.id} hazard[${hazardIndex}]: early-level cadence ${hazard.cadenceMs}ms may reduce telegraph readability (recommended >= ${EARLY_LEVEL_MIN_HAZARD_CADENCE_MS}ms)`
        );
      }

      if (hazard.intensity !== undefined && hazard.intensity > EARLY_LEVEL_MAX_HAZARD_INTENSITY) {
        pushWarning(
          name,
          `${section.id} hazard[${hazardIndex}]: early-level intensity ${hazard.intensity.toFixed(2)} may be too punishing (recommended <= ${EARLY_LEVEL_MAX_HAZARD_INTENSITY.toFixed(2)})`
        );
      }
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

    const gate = rhythm.gate;
    if (gate !== undefined && isFiniteNumber(gate) && gate < EARLY_LEVEL_GATE_WARNING_THRESHOLD) {
      pushWarning(
        levelName,
        `${rhythmScope}: early-level gate ${gate.toFixed(2)} is below recommended threshold ${EARLY_LEVEL_GATE_WARNING_THRESHOLD.toFixed(2)}`
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
  validatePacingGuardrails(level);
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
