import { LEVELS } from './registry';
import type { LevelConfig, LevelSectionConfig } from './types';

export function normalizeAuthoredLevelNumber(levelNumber: number, fallback = 1): number {
  const total = Math.max(1, LEVELS.length);
  if (!Number.isFinite(levelNumber)) {
    return fallback;
  }

  return Math.min(total, Math.max(1, Math.floor(levelNumber)));
}

export function getLevelConfig(levelNumber: number): LevelConfig {
  const level = normalizeAuthoredLevelNumber(levelNumber);
  return LEVELS[level - 1] ?? LEVELS[0];
}

export function getTotalLevels(): number {
  return LEVELS.length;
}

export function isLastLevel(levelNumber: number): boolean {
  return normalizeAuthoredLevelNumber(levelNumber) >= LEVELS.length;
}

export function getActiveSection(levelConfig: LevelConfig, progress: number): LevelSectionConfig | null {
  const clampedProgress = Math.max(0, Math.min(progress, 1));

  return (
    levelConfig.sections.find(
      (section) => clampedProgress >= section.startProgress && clampedProgress < section.endProgress
    ) ??
    levelConfig.sections.find((section) => clampedProgress === 1 && section.endProgress === 1) ??
    null
  );
}

export function getSectionProgress(section: LevelSectionConfig, progress: number): number {
  const clampedProgress = Math.max(0, Math.min(progress, 1));
  const sectionSpan = section.endProgress - section.startProgress;

  if (sectionSpan <= 0) {
    return 1;
  }

  return Math.max(0, Math.min((clampedProgress - section.startProgress) / sectionSpan, 1));
}
