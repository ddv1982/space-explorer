import { LEVELS } from './registry';
import type { LevelConfig, LevelSectionConfig } from './types';

export function getLevelConfig(levelNumber: number): LevelConfig {
  const index = Math.min(levelNumber - 1, LEVELS.length - 1);
  return LEVELS[Math.max(0, index)];
}

export function getTotalLevels(): number {
  return LEVELS.length;
}

export function isLastLevel(levelNumber: number): boolean {
  return levelNumber >= LEVELS.length;
}

export function getActiveSection(levelConfig: LevelConfig, progress: number): LevelSectionConfig | null {
  const clampedProgress = Math.max(0, Math.min(progress, 1));

  return levelConfig.sections.find(
    (section) => clampedProgress >= section.startProgress && clampedProgress < section.endProgress
  ) ?? levelConfig.sections.find((section) => clampedProgress === 1 && section.endProgress === 1) ?? null;
}

export function getSectionProgress(section: LevelSectionConfig, progress: number): number {
  const clampedProgress = Math.max(0, Math.min(progress, 1));
  const sectionSpan = section.endProgress - section.startProgress;

  if (sectionSpan <= 0) {
    return 1;
  }

  return Math.max(0, Math.min((clampedProgress - section.startProgress) / sectionSpan, 1));
}
