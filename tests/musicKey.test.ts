import { describe, expect, test } from 'bun:test';

import type { ProceduralMusicTrackConfig } from '../src/config/LevelsConfig';
import { LEVELS } from '../src/config/levels/registry';
import { resolveHarmonicContext } from '../src/systems/audio/procedural/harmony';
import { getTrackStepsPerBar } from '../src/systems/audio/procedural/musicIntent';
import { scheduleTrackStep } from '../src/systems/audio/procedural/scheduleStep';

/** Stands in for an AudioContext and records the pitch of every audible oscillator (LFOs run below 20 Hz). */
function createRecordingContext(): { ctx: BaseAudioContext; pitches: number[] } {
  const pitches: number[] = [];
  const param = { value: 0 };
  const node = (onPitch?: (hz: number) => void): unknown =>
    new Proxy(
      {},
      {
        get: (_target, key) => {
          if (key === 'frequency' && onPitch) {
            return new Proxy(param, { get: () => (hz: number) => onPitch(hz) });
          }
          return key === 'connect' || key === 'start' || key === 'stop'
            ? () => undefined
            : new Proxy(param, { get: (target, name) => (name === 'value' ? target.value : () => undefined) });
        },
        set: () => true,
      }
    );
  const ctx = new Proxy(
    {},
    {
      get: (_target, key) => {
        if (key === 'currentTime') return 0;
        if (key === 'createOscillator') return () => node((hz) => hz >= 20 && pitches.push(hz));
        return () => node();
      },
    }
  ) as BaseAudioContext;
  return { ctx, pitches };
}

function pitchClassesOf(track: ProceduralMusicTrackConfig, bars: number): Set<number> {
  const { ctx, pitches } = createRecordingContext();
  const output = { ctx, dry: {} as AudioNode, space: {} as AudioNode, getNoiseBuffer: () => null };
  // Drums are un-pitched; without them every oscillator is a bass, arpeggio, lead or pad note.
  const pitched = { ...track, drums: undefined };
  for (let step = 0; step < bars * getTrackStepsPerBar(track); step++) {
    scheduleTrackStep(output, pitched, step, step * 0.1, 1.2);
  }

  expect(pitches.length).toBeGreaterThan(bars);
  return new Set(
    pitches.map((hz) => {
      const semitones = 12 * Math.log2(hz / track.rootHz);
      expect(Math.abs(semitones - Math.round(semitones))).toBeLessThan(1e-6);
      return ((Math.round(semitones) % 12) + 12) % 12;
    })
  );
}

const MODES: Record<string, number[]> = {
  ionian: [0, 2, 4, 5, 7, 9, 11],
  dorian: [0, 2, 3, 5, 7, 9, 10],
  phrygian: [0, 1, 3, 5, 7, 8, 10],
  lydian: [0, 2, 4, 6, 7, 9, 11],
  mixolydian: [0, 2, 4, 5, 7, 9, 10],
  aeolian: [0, 2, 3, 5, 7, 8, 10],
  locrian: [0, 1, 3, 5, 6, 8, 10],
  'phrygian-dominant': [0, 1, 4, 5, 7, 8, 10],
  ultralocrian: [0, 1, 3, 4, 6, 8, 10],
};

describe('music key', () => {
  const tracks = LEVELS.flatMap((level) => [
    [`${level.name}: stage`, level.music.stage] as const,
    [`${level.name}: boss`, level.music.boss] as const,
  ]);

  test.each(tracks)('%s plays every bass, arpeggio, lead and pad note in its own scale', (_name, track) => {
    const scale = MODES[track.intent.descriptors.mode];
    expect(scale).toBeDefined();
    for (const pitchClass of pitchClassesOf(track, 16)) {
      expect(scale).toContain(pitchClass);
    }
  });

  test('a chord tone off the scale moves to the nearest scale tone, a tie going down', () => {
    const track = LEVELS[0].music.stage;
    const tone = (bar: number, semitones: number): number =>
      Math.round(12 * Math.log2(resolveHarmonicContext(track, bar).chordToneHz(semitones) / track.rootHz));

    // Ionian, bar 0 on the tonic: scale tones stay, the minor third and tritone drop a semitone.
    expect([0, 4, 7, 12, 16].map((semitones) => tone(0, semitones))).toEqual([0, 4, 7, 12, 16]);
    expect(tone(0, 3)).toBe(2);
    expect(tone(0, 6)).toBe(5);
    expect(tone(0, -1)).toBe(-1);
    // Bar 2 sits on the sixth degree, where the scale's own third above the root is minor.
    expect(tone(2, 4)).toBe(9 + 3);
  });

  test('a pad chord is the root, fifth and tenth of its own scale, even where the third is not 3 or 4 semitones', () => {
    const track = LEVELS[LEVELS.length - 1].music.boss;
    expect(track.intent.descriptors.mode).toBe('ultralocrian');
    const harmony = resolveHarmonicContext(track, 0);
    const voicing = [0, 4, 9].map((steps) => Math.round(12 * Math.log2(harmony.scaleStepHz(steps) / track.rootHz)));

    expect(voicing).toEqual([0, 6, 15]);
  });

  test('the lead sings above the arpeggio in every key', () => {
    for (const level of LEVELS) {
      for (const track of [level.music.stage, level.music.boss]) {
        const leadRootHz = track.rootHz * Math.pow(2, track.lead?.octaveShift ?? 0);
        expect(leadRootHz).toBeGreaterThanOrEqual(330);
        expect(leadRootHz).toBeLessThan(660);
        expect(track.lead?.octaveShift ?? 0).toBeGreaterThan(track.pulse?.octaveShift ?? 0);
      }
    }
  });
});
