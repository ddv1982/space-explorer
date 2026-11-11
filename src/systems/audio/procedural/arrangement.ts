import type { MusicArrangementConfig, MusicArrangementSectionConfig } from '@/config/LevelsConfig';

const NO_ARRANGEMENT: MusicArrangementSectionConfig = { phase: 'intro', barsDuration: 1, density: 1, energyLift: 0 };

/**
 * The arrangement section a bar falls in. A looping arrangement wraps; otherwise the last section
 * holds once the arrangement has played through.
 */
export function resolveArrangementForBar(
  config: MusicArrangementConfig | undefined,
  barIndex: number
): MusicArrangementSectionConfig {
  const sections = config?.sections ?? [];
  if (sections.length === 0) {
    return NO_ARRANGEMENT;
  }

  const cycleBars = sections.reduce((total, section) => total + section.barsDuration, 0);
  const bar = Math.max(0, Math.floor(barIndex));
  let remaining = config?.loop ? bar % cycleBars : Math.min(bar, cycleBars - 1);
  for (const section of sections) {
    if (remaining < section.barsDuration) {
      return section;
    }
    remaining -= section.barsDuration;
  }

  return sections[sections.length - 1];
}
