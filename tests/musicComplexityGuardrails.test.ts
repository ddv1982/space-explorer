import { describe, expect, test } from 'bun:test';

import type { MusicArrangementPhase, MusicLayerRhythmConfig, ProceduralMusicTrackConfig } from '../src/config/LevelsConfig';
import { CORE_CAMPAIGN } from '../src/config/levels/definitions/coreCampaign';
import { EXPANSION_CAMPAIGN } from '../src/config/levels/definitions/expansionCampaign';

const MAX_UNIQUE_DIVISIONS_PER_TRACK = 3;
const MAX_PHASE_SCATTER_PER_TRACK = 3;
const MAX_ACCENT_PATTERN_LENGTH = 6;
const STANDARD_PHASE_ARC: MusicArrangementPhase[] = ['intro', 'build', 'peak', 'release'];

function getAllTracks(): Array<{ levelName: string; trackName: 'stage' | 'boss'; track: ProceduralMusicTrackConfig }> {
  const levels = [...CORE_CAMPAIGN.levels, ...EXPANSION_CAMPAIGN.levels];

  return levels.flatMap((level) => [
    { levelName: level.name, trackName: 'stage' as const, track: level.music.stage },
    { levelName: level.name, trackName: 'boss' as const, track: level.music.boss },
  ]);
}

function getRhythms(track: ProceduralMusicTrackConfig): MusicLayerRhythmConfig[] {
  return [track.bass.rhythm, track.pulse?.rhythm, track.lead?.rhythm, track.noise?.rhythm].filter(
    (rhythm): rhythm is MusicLayerRhythmConfig => Boolean(rhythm)
  );
}

describe('music complexity guardrails', () => {
  test('keeps rhythm complexity budgets across campaign tracks', () => {
    const violations: string[] = [];

    for (const { levelName, trackName, track } of getAllTracks()) {
      const rhythms = getRhythms(track);
      const divisions = new Set(rhythms.map((rhythm) => rhythm.division).filter((division): division is number => Boolean(division)));
      const phases = rhythms.map((rhythm) => rhythm.phase ?? 0);
      const phaseScatter = phases.length > 0 ? Math.max(...phases) - Math.min(...phases) : 0;

      if (divisions.size > MAX_UNIQUE_DIVISIONS_PER_TRACK || phaseScatter > MAX_PHASE_SCATTER_PER_TRACK) {
        violations.push(`${levelName} (${trackName}) complexity budget: divisions=${[...divisions].join(',')}, phaseScatter=${phaseScatter}`);
      }

      for (const rhythm of rhythms) {
        if ((rhythm.accentPattern ?? []).length > MAX_ACCENT_PATTERN_LENGTH) {
          violations.push(
            `${levelName} (${trackName}) accent pattern too long: ${(rhythm.accentPattern ?? []).length} > ${MAX_ACCENT_PATTERN_LENGTH}`
          );
        }
      }
    }

    if (violations.length > 0) {
      throw new Error(violations.join('\n'));
    }

    expect(violations).toHaveLength(0);
  });

  test('odd-meter tracks stay meter-aligned to beatsPerBar subdivisions', () => {
    const violations: string[] = [];

    for (const { levelName, trackName, track } of getAllTracks()) {
      const { beatsPerBar } = track.intent.timeSignature;
      if (beatsPerBar % 2 === 0) {
        continue;
      }

      const allowed = new Set([beatsPerBar, beatsPerBar * 2]);
      for (const rhythm of getRhythms(track)) {
        const division = rhythm.division ?? beatsPerBar;
        if (!allowed.has(division)) {
          violations.push(`${levelName} (${trackName}) odd-meter division ${division} is not in allowed ${[...allowed].join(',')}`);
        }
      }
    }

    if (violations.length > 0) {
      throw new Error(violations.join('\n'));
    }

    expect(violations).toHaveLength(0);
  });

  test('arrangement sections keep standard intro-build-peak-release arc', () => {
    const violations: string[] = [];

    for (const { levelName, trackName, track } of getAllTracks()) {
      const arrangement = track.intent.descriptors.arrangement;
      const phases = arrangement?.sections.map((section) => section.phase) ?? [];
      if (phases.join('|') !== STANDARD_PHASE_ARC.join('|')) {
        violations.push(`${levelName} (${trackName}) arrangement arc mismatch: ${phases.join(',')}`);
      }
    }

    if (violations.length > 0) {
      throw new Error(violations.join('\n'));
    }

    expect(violations).toHaveLength(0);
  });
});
