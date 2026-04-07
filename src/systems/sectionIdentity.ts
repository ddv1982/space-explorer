import type { LevelSectionConfig } from '../config/LevelsConfig';

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function lerp(start: number, end: number, amount: number): number {
  return start + (end - start) * amount;
}

function getArcShapeScale(tensionArc: LevelSectionConfig['tensionArc'], sectionProgress: number): number {
  const progress = clamp(sectionProgress, 0, 1);

  switch (tensionArc) {
    case 'gradualBuild':
      return lerp(0.88, 1.14, progress);
    case 'buildRelease': {
      if (progress < 0.65) {
        return lerp(0.9, 1.16, progress / 0.65);
      }

      return lerp(1.16, 0.92, (progress - 0.65) / 0.35);
    }
    case 'waves':
      return 1 + Math.sin(progress * Math.PI * 4) * 0.1;
    case 'constant':
    default:
      return 1;
  }
}

function getResolvedTensionArc(section: LevelSectionConfig): NonNullable<LevelSectionConfig['tensionArc']> {
  if (section.tensionArc) {
    return section.tensionArc;
  }

  switch (section.phase) {
    case 'build':
      return 'gradualBuild';
    case 'hazard':
      return 'waves';
    case 'climax':
      return 'buildRelease';
    case 'boss-approach':
      return 'gradualBuild';
    case 'intro':
    default:
      return 'constant';
  }
}

export function resolveSectionSpawnRateScale(
  section: LevelSectionConfig | null,
  sectionProgress: number
): number {
  if (!section) {
    return 1;
  }

  return clamp(getArcShapeScale(getResolvedTensionArc(section), sectionProgress), 0.75, 1.2);
}

export function resolveSectionMusicIntensity(
  section: LevelSectionConfig | null,
  sectionProgress: number
): number {
  const baseIntensity = section?.musicIntensity ?? 1;
  if (!section) {
    return clamp(baseIntensity, 0.2, 1.2);
  }

  const arcScale = getArcShapeScale(getResolvedTensionArc(section), sectionProgress);
  const vatTensionBias = (section.vatTarget?.tension ?? 0) * 0.08;

  return clamp(baseIntensity * arcScale + vatTensionBias, 0.2, 1.2);
}
