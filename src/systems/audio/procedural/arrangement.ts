import type {
  MusicArrangementConfig,
  MusicArrangementLayerGainMultipliersConfig,
  MusicArrangementPhase,
  MusicArrangementSectionConfig,
} from '../../../config/LevelsConfig';

export interface MusicArrangementResolution {
  phase: MusicArrangementPhase;
  density: number;
  energyLift: number;
  layerGainMultipliers?: MusicArrangementLayerGainMultipliersConfig;
  sectionIndex: number;
  cycleBarIndex: number;
}

const FALLBACK_PHASE: MusicArrangementPhase = 'intro';

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function positiveModulo(value: number, modulus: number): number {
  return ((value % modulus) + modulus) % modulus;
}

function toNonNegativeInteger(value: number): number {
  return Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
}

function normalizePhase(value: MusicArrangementSectionConfig['phase']): MusicArrangementPhase {
  return value === 'intro' || value === 'build' || value === 'peak' || value === 'release' ? value : FALLBACK_PHASE;
}

function normalizeLayerGainMultipliers(
  value: MusicArrangementSectionConfig['layerGainMultipliers']
): MusicArrangementLayerGainMultipliersConfig | undefined {
  if (!value) {
    return undefined;
  }

  const normalized: MusicArrangementLayerGainMultipliersConfig = {};
  for (const key of ['bass', 'pulse', 'lead', 'noise'] as const) {
    const gain = value[key];
    if (Number.isFinite(gain)) {
      normalized[key] = gain;
    }
  }

  return Object.keys(normalized).length > 0 ? normalized : undefined;
}

function normalizeSections(config: MusicArrangementConfig | undefined): MusicArrangementSectionConfig[] {
  const sections = config?.sections ?? [];

  return sections
    .filter((section) => section && Number.isFinite(section.barsDuration))
    .map((section) => ({
      phase: normalizePhase(section.phase),
      barsDuration: Math.max(1, Math.round(section.barsDuration)),
      density: Number.isFinite(section.density) ? clamp01(section.density) : 1,
      energyLift: Number.isFinite(section.energyLift) ? section.energyLift : 0,
      layerGainMultipliers: normalizeLayerGainMultipliers(section.layerGainMultipliers),
    }));
}

export function getArrangementCycleBars(config: MusicArrangementConfig | undefined): number {
  return normalizeSections(config).reduce((total, section) => total + section.barsDuration, 0);
}

export function resolveArrangementForBar(
  config: MusicArrangementConfig | undefined,
  barIndex: number
): MusicArrangementResolution {
  const sections = normalizeSections(config);
  const safeBarIndex = toNonNegativeInteger(barIndex);

  if (sections.length === 0) {
    return {
      phase: FALLBACK_PHASE,
      density: 1,
      energyLift: 0,
      sectionIndex: -1,
      cycleBarIndex: safeBarIndex,
    };
  }

  const cycleBars = sections.reduce((total, section) => total + section.barsDuration, 0);
  const shouldLoop = config?.loop ?? false;
  const cycleBarIndex = shouldLoop
    ? positiveModulo(safeBarIndex, cycleBars)
    : Math.min(safeBarIndex, cycleBars - 1);

  let accumulatedBars = 0;
  for (let sectionIndex = 0; sectionIndex < sections.length; sectionIndex++) {
    const section = sections[sectionIndex];
    accumulatedBars += section.barsDuration;

    if (cycleBarIndex < accumulatedBars) {
      return {
        phase: section.phase,
        density: section.density,
        energyLift: section.energyLift,
        layerGainMultipliers: section.layerGainMultipliers,
        sectionIndex,
        cycleBarIndex,
      };
    }
  }

  const fallbackSection = sections[sections.length - 1];
  return {
    phase: fallbackSection.phase,
    density: fallbackSection.density,
    energyLift: fallbackSection.energyLift,
    layerGainMultipliers: fallbackSection.layerGainMultipliers,
    sectionIndex: sections.length - 1,
    cycleBarIndex,
  };
}
