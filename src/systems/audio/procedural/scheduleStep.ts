import type {
  MusicNoiseCharacterConfig,
  ProceduralMusicLayerConfig,
  ProceduralMusicTrackConfig,
} from '@/config/LevelsConfig';
import { scheduleDrum } from './drums';
import { schedulePadChord } from './pad';
import { resolveLayerRhythmScheduling } from './rhythm';
import { buildSchedulingStepPlan } from './stepSchedulingPlan';
import { scheduleLayer, scheduleNoise } from './synthesis';

export const MINIMUM_MUSIC_INTENSITY = 0.2;
export const MAXIMUM_MUSIC_INTENSITY = 1.2;
/** Fixed performance character: how far expression is pushed and how brisk tracks play. */
const MUSIC_CREATIVITY_DRIVE = 1.2;
const MUSIC_TEMPO_SCALE = 1.08;

/** Intensity range over which a layer fades in below its `enterAt`. */
const ENTRY_FADE = 0.15;
const DRUM_ENTRY = { kick: 0.2, hat: 0.35, snare: 0.55 } as const;

export interface MusicStepOutput {
  ctx: BaseAudioContext;
  /** Bass and kick: straight to the mix. */
  dry: AudioNode;
  /** Everything else: also feeds the reverb and echo. */
  space: AudioNode;
  getNoiseBuffer: (color?: MusicNoiseCharacterConfig['color']) => AudioBuffer | null;
}

export function getMusicStepSeconds(track: ProceduralMusicTrackConfig): number {
  return 60 / (track.tempo * MUSIC_TEMPO_SCALE) / track.stepsPerBeat;
}

/** 0 while the music is calmer than the layer's entry point, rising to 1 at `enterAt`. */
export function getLayerPresence(intensityBlend: number, enterAt = 0): number {
  if (enterAt <= 0) return 1;
  return Math.min(1, Math.max(0, (intensityBlend - (enterAt - ENTRY_FADE)) / ENTRY_FADE));
}

/** Schedules every voice that sounds on one sequencer step. */
export function scheduleTrackStep(
  out: MusicStepOutput,
  track: ProceduralMusicTrackConfig,
  stepIndex: number,
  time: number,
  musicIntensity: number
): void {
  const plan = buildSchedulingStepPlan({
    track,
    stepIndex,
    tempoScale: MUSIC_TEMPO_SCALE,
    creativityDrive: MUSIC_CREATIVITY_DRIVE,
    musicIntensity,
    minimumMusicIntensity: MINIMUM_MUSIC_INTENSITY,
    maximumMusicIntensity: MAXIMUM_MUSIC_INTENSITY,
  });
  const { ctx } = out;
  const { meterStepContext: meter, intensityBlend, creativityDrive, stepDuration, density } = plan;

  const tones: Array<[ProceduralMusicLayerConfig | undefined, number, AudioNode]> = [
    [track.bass, plan.gainMultipliers.bass, out.dry],
    [track.pulse, plan.gainMultipliers.pulse, out.space],
    [track.lead, plan.gainMultipliers.lead, out.space],
  ];
  for (const [layer, gainMultiplier, output] of tones) {
    if (!layer) continue;
    const presence = getLayerPresence(intensityBlend, layer.enterAt);
    const rhythm = resolveLayerRhythmScheduling(layer.rhythm, meter, { density, gainMultiplier });
    if (presence <= 0 || !rhythm.shouldTrigger) continue;

    scheduleLayer({
      ctx,
      musicGain: output,
      track,
      layer,
      stepIndex: rhythm.patternStepIndex,
      chordToneHz: plan.chordToneHz,
      time,
      stepDuration,
      intensityBlend,
      creativityDrive,
      gainScale: rhythm.gainScale * presence,
    });
  }

  if (track.noise) {
    const presence = getLayerPresence(intensityBlend, track.noise.enterAt);
    const rhythm = resolveLayerRhythmScheduling(track.noise.rhythm, meter, {
      density,
      gainMultiplier: plan.gainMultipliers.noise,
    });
    if (presence > 0 && rhythm.shouldTrigger) {
      scheduleNoise({
        ctx,
        musicGain: out.space,
        track,
        noiseLayer: track.noise,
        stepIndex: rhythm.patternStepIndex,
        time,
        stepDuration,
        intensityBlend,
        creativityDrive,
        gainScale: rhythm.gainScale * presence,
        getNoiseBuffer: out.getNoiseBuffer,
      });
    }
  }

  if (track.pad && meter.stepInBar === 0) {
    schedulePadChord({
      ctx,
      output: out.space,
      pad: track.pad,
      chordToneHz: plan.chordToneHz,
      time,
      seconds: stepDuration * meter.stepsPerBar,
      gain: track.pad.gain * track.masterGain,
      brightness: intensityBlend,
    });
  }

  if (track.drums) {
    const { drums } = track;
    const noise = out.getNoiseBuffer('white');
    for (const voice of ['kick', 'snare', 'hat'] as const) {
      const pattern = drums[voice];
      const velocity = pattern.length > 0 ? pattern[meter.stepInBar % pattern.length] : 0;
      const presence = getLayerPresence(intensityBlend, DRUM_ENTRY[voice]);
      if (velocity <= 0 || presence <= 0) continue;

      scheduleDrum(voice, {
        ctx,
        output: voice === 'kick' ? out.dry : out.space,
        noise,
        kit: drums.kit,
        time,
        gain:
          drums.gain * track.masterGain * velocity * presence * (voice === 'hat' ? 0.5 : voice === 'snare' ? 0.6 : 1),
      });
    }
  }
}
