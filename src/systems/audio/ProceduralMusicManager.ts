import type { ProceduralMusicTrackConfig } from '../../config/LevelsConfig';
import { AudioContextManager } from './AudioContextManager';
import {
  disconnectMusicBus,
  recreateMusicBus,
  setMusicBusReverbGain,
  type MusicFXChain,
} from './procedural/bus';
import { getIntensityBlend } from './procedural/expression';
import {
  DEFAULT_MUSIC_RUNTIME_TUNING,
  resolveMusicRuntimeTuning,
  type MusicRuntimeTuningValues,
} from './procedural/musicRuntimeTuningProfile';
import { getMeterStepContext, resolveIntentEnergy } from './procedural/musicIntent';
import { resolveHarmonicContext } from './procedural/harmony';
import { resolveLayerRhythmScheduling } from './procedural/rhythm';
import { resolveArrangementForBar } from './procedural/arrangement';
import { scheduleLayer, scheduleNoise } from './procedural/synthesis';

export const DEFAULT_TRACK: ProceduralMusicTrackConfig = {
  tempo: 112,
  rootHz: 110,
  stepsPerBeat: 4,
  masterGain: 0.95,
  intent: {
    deterministicSeed: 'default-runtime-track',
    timeSignature: { beatsPerBar: 4, beatUnit: 4 },
    descriptors: {
      mode: 'aeolian',
      chordProgressionTags: ['fallback-loop', 'neutral-pedal'],
      rhythmicFeel: 'steady arcade pulse',
      energyProfile: { baseline: 0.45, peak: 0.72, curve: 'steady' },
      harmony: {
        steps: [
          { degree: 1, barsDuration: 1, quality: 'minor' },
          { degree: 6, barsDuration: 1, quality: 'major' },
          { degree: 3, barsDuration: 1, quality: 'major' },
          { degree: 7, barsDuration: 1, quality: 'major' },
        ],
      },
    },
  },
  bass: {
    waveform: 'triangle',
    pattern: [0, null, null, null, 7, null, null, null, 12, null, null, null, 7, null, null, null],
    gain: 0.18,
    durationSteps: 3,
    rhythm: { division: 4, phase: 0, gate: 0.9, accentAmount: 0.1, accentPattern: [0, 8] },
  },
  pulse: {
    waveform: 'square',
    pattern: [12, null, 12, null, 7, null, 12, null, 14, null, 12, null, 7, null, 5, null],
    gain: 0.05,
    durationSteps: 1,
    rhythm: { division: 8, phase: 0, gate: 0.66, accentAmount: 0.12, accentPattern: [0, 4, 8, 12] },
    octaveShift: 1,
    filterHz: 1900,
  },
  lead: {
    waveform: 'sine',
    pattern: [null, 12, null, 14, null, 12, null, 7, null, 12, null, 14, null, 19, null, 14],
    gain: 0.04,
    durationSteps: 2,
    rhythm: { division: 16, phase: 2, gate: 0.74, accentAmount: 0.09, accentPattern: [2, 10] },
    octaveShift: 1,
  },
  noise: {
    pattern: [0, 1, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0],
    gain: 0.012,
    filterHz: 1700,
    durationSteps: 1,
    rhythm: { division: 8, phase: 2, gate: 0.42, accentAmount: 0.08, accentPattern: [2, 6, 10, 14] },
  },
};

export type MusicRuntimeTuning = MusicRuntimeTuningValues;
export { DEFAULT_MUSIC_RUNTIME_TUNING };

export class ProceduralMusicManager {
  private readonly musicScheduleLookaheadMs = 50;
  private readonly musicScheduleAheadSeconds = 0.18;
  private readonly minimumMusicIntensity = 0.2;
  private readonly maximumMusicIntensity = 1.2;

  private readonly contextManager: AudioContextManager;
  private musicGain: GainNode | null = null;
  private musicFX: MusicFXChain | null = null;
  private musicPlaying = false;
  private musicTimer: number | null = null;
  private activeTrack: ProceduralMusicTrackConfig | null = null;
  private musicStepIndex = 0;
  private musicNextStepTime = 0;
  private musicIntensity = 1;
  private runtimeTuning: MusicRuntimeTuning = { ...DEFAULT_MUSIC_RUNTIME_TUNING };

  constructor(contextManager: AudioContextManager) {
    this.contextManager = contextManager;
  }

  ensureGains(): void {
    if (!this.contextManager.getCtx() || this.musicGain) {
      return;
    }

    this.recreateMusicBus();
  }

  resetNodes(): void {
    if (this.musicTimer !== null) {
      clearTimeout(this.musicTimer);
    }

    this.disconnectMusicBus();
    this.resetPlaybackState();
  }

  playMusic(track: ProceduralMusicTrackConfig = DEFAULT_TRACK): void {
    if (!this.ensureContext()) {
      return;
    }

    this.stopMusic();
    this.ensureGains();
    if (!this.musicGain) {
      return;
    }

    const ctx = this.contextManager.getCtx();
    if (!ctx) {
      return;
    }

    this.activeTrack = track;
    this.musicPlaying = true;
    this.musicStepIndex = 0;
    this.musicNextStepTime = ctx.currentTime + 0.02;
    this.musicIntensity = 1;

    this.musicGain.gain.cancelScheduledValues(ctx.currentTime);
    this.musicGain.gain.setValueAtTime(0.001, ctx.currentTime);
    this.musicGain.gain.linearRampToValueAtTime(1, ctx.currentTime + 0.08);

    this.scheduleMusic();
  }

  startMusic(track: ProceduralMusicTrackConfig = DEFAULT_TRACK): void {
    this.playMusic(track);
  }

  stopMusic(): void {
    if (this.musicTimer !== null) {
      clearTimeout(this.musicTimer);
    }

    this.disconnectMusicBus();
    this.resetPlaybackState();
  }

  setMusicIntensity(intensity: number): void {
    const ctx = this.contextManager.getCtx();
    if (!ctx || !this.musicGain) {
      return;
    }

    const clampedIntensity = Math.min(this.maximumMusicIntensity, Math.max(this.minimumMusicIntensity, intensity));
    if (Math.abs(clampedIntensity - this.musicIntensity) < 0.01) {
      return;
    }

    this.musicIntensity = clampedIntensity;
    this.musicGain.gain.cancelScheduledValues(ctx.currentTime);
    this.musicGain.gain.setValueAtTime(this.musicGain.gain.value, ctx.currentTime);
    this.musicGain.gain.linearRampToValueAtTime(clampedIntensity, ctx.currentTime + 0.08);
  }

  getMusicRuntimeTuning(): MusicRuntimeTuning {
    return { ...this.runtimeTuning };
  }

  setMusicRuntimeTuning(nextTuning: Partial<MusicRuntimeTuning>): MusicRuntimeTuning {
    this.runtimeTuning = {
      creativity: this.clamp01(nextTuning.creativity ?? this.runtimeTuning.creativity),
      energy: this.clamp01(nextTuning.energy ?? this.runtimeTuning.energy),
      ambience: this.clamp01(nextTuning.ambience ?? this.runtimeTuning.ambience),
    };

    this.applyAmbienceFromRuntimeTuning();

    return this.getMusicRuntimeTuning();
  }

  resetMusicRuntimeTuning(): MusicRuntimeTuning {
    this.runtimeTuning = { ...DEFAULT_MUSIC_RUNTIME_TUNING };
    this.applyAmbienceFromRuntimeTuning();
    return this.getMusicRuntimeTuning();
  }

  private recreateMusicBus(): void {
    const ctx = this.contextManager.getCtx();
    const masterGain = this.contextManager.getMasterGain();
    if (!ctx || !masterGain) {
      return;
    }

    const bus = recreateMusicBus(ctx, masterGain, this.musicGain, this.musicFX);
    this.musicGain = bus.musicGain;
    this.musicFX = bus.musicFX;
    this.applyAmbienceFromRuntimeTuning();
  }

  private disconnectMusicBus(): void {
    disconnectMusicBus(this.musicGain, this.musicFX);
    this.musicGain = null;
    this.musicFX = null;
  }

  private resetPlaybackState(): void {
    this.musicPlaying = false;
    this.musicTimer = null;
    this.activeTrack = null;
    this.musicStepIndex = 0;
    this.musicNextStepTime = 0;
    this.musicIntensity = 1;
  }

  private ensureContext(): boolean {
    const isReady = this.contextManager.ensureContext();
    if (!isReady) {
      this.resetNodes();
    }
    return isReady;
  }

  private scheduleMusic(): void {
    const ctx = this.contextManager.getCtx();
    if (!ctx || !this.ensureContext() || !this.musicPlaying || !this.activeTrack) {
      return;
    }

    while (this.musicNextStepTime < ctx.currentTime + this.musicScheduleAheadSeconds) {
      const runtimeTuning = resolveMusicRuntimeTuning(this.runtimeTuning);
      this.scheduleTrackStep(this.activeTrack, this.musicStepIndex, this.musicNextStepTime);
      this.musicStepIndex += 1;
      this.musicNextStepTime += this.getStepDuration(this.activeTrack, runtimeTuning.tempoScale);
    }

    this.musicTimer = window.setTimeout(() => {
      this.scheduleMusic();
    }, this.musicScheduleLookaheadMs);
  }

  private scheduleTrackStep(track: ProceduralMusicTrackConfig, stepIndex: number, time: number): void {
    const ctx = this.contextManager.getCtx();
    if (!ctx || !this.musicGain) {
      return;
    }

    const runtimeTuning = resolveMusicRuntimeTuning(this.runtimeTuning);
    const meterStepContext = getMeterStepContext(track, stepIndex);
    const harmonicContext = resolveHarmonicContext(track, meterStepContext.barIndex);
    const arrangement = resolveArrangementForBar(track.intent.descriptors.arrangement, meterStepContext.barIndex);
    const stepDuration = this.getStepDuration(track, runtimeTuning.tempoScale);
    const intentEnergy = resolveIntentEnergy(
      track.intent.descriptors.energyProfile,
      meterStepContext.barProgress,
      meterStepContext.deterministicPulse
    );
    const arrangementEnergy = this.clamp01(intentEnergy * (1 + (arrangement.density - 1) * 0.35) + arrangement.energyLift);
    const shapedIntensity = Math.min(
      this.maximumMusicIntensity,
      Math.max(this.minimumMusicIntensity, this.musicIntensity * (0.78 + arrangementEnergy * 0.44))
    );
    const intensityBlend = getIntensityBlend(shapedIntensity, this.minimumMusicIntensity, this.maximumMusicIntensity);
    const creativityDrive = runtimeTuning.creativityDrive * (0.9 + meterStepContext.deterministicPulse * 0.2);
    const bassGainMultiplier = Math.max(0, arrangement.layerGainMultipliers?.bass ?? 1);
    const bassRhythm = resolveLayerRhythmScheduling(track.bass.rhythm, meterStepContext, {
      density: this.clamp01(arrangement.density),
      gainMultiplier: bassGainMultiplier,
    });
    if (bassRhythm.shouldTrigger) {
      scheduleLayer({
        ctx,
        musicGain: this.musicGain,
        track,
        layer: track.bass,
        stepIndex: bassRhythm.patternStepIndex,
        harmonicRootHz: harmonicContext.harmonicRootHz,
        time,
        stepDuration,
        intensityBlend,
        creativityDrive,
        gainScale: bassRhythm.gainScale,
      });
    }

    if (track.pulse) {
      const pulseGainMultiplier = Math.max(0, arrangement.layerGainMultipliers?.pulse ?? 1);
      const pulseRhythm = resolveLayerRhythmScheduling(track.pulse.rhythm, meterStepContext, {
        density: this.clamp01(arrangement.density),
        gainMultiplier: pulseGainMultiplier,
      });
      if (pulseRhythm.shouldTrigger) {
        scheduleLayer({
          ctx,
          musicGain: this.musicGain,
          track,
          layer: track.pulse,
          stepIndex: pulseRhythm.patternStepIndex,
          harmonicRootHz: harmonicContext.harmonicRootHz,
          time,
          stepDuration,
          intensityBlend,
          creativityDrive,
          gainScale: pulseRhythm.gainScale,
        });
      }
    }

    if (track.lead) {
      const leadGainMultiplier = Math.max(0, arrangement.layerGainMultipliers?.lead ?? 1);
      const leadRhythm = resolveLayerRhythmScheduling(track.lead.rhythm, meterStepContext, {
        density: this.clamp01(arrangement.density),
        gainMultiplier: leadGainMultiplier,
      });
      if (leadRhythm.shouldTrigger) {
        scheduleLayer({
          ctx,
          musicGain: this.musicGain,
          track,
          layer: track.lead,
          stepIndex: leadRhythm.patternStepIndex,
          harmonicRootHz: harmonicContext.harmonicRootHz,
          time,
          stepDuration,
          intensityBlend,
          creativityDrive,
          gainScale: leadRhythm.gainScale,
        });
      }
    }

    if (track.noise) {
      const noiseGainMultiplier = Math.max(0, arrangement.layerGainMultipliers?.noise ?? 1);
      const noiseRhythm = resolveLayerRhythmScheduling(track.noise.rhythm, meterStepContext, {
        density: this.clamp01(arrangement.density),
        gainMultiplier: noiseGainMultiplier,
      });
      if (noiseRhythm.shouldTrigger) {
        scheduleNoise({
          ctx,
          musicGain: this.musicGain,
          track,
          noiseLayer: track.noise,
          stepIndex: noiseRhythm.patternStepIndex,
          time,
          stepDuration,
          intensityBlend,
          creativityDrive,
          gainScale: noiseRhythm.gainScale,
          getNoiseBuffer: (color) => this.contextManager.getNoiseBuffer(color),
          getExplosionBuffer: () => this.contextManager.getExplosionBuffer(),
        });
      }
    }
  }

  private getStepDuration(track: ProceduralMusicTrackConfig, tempoScale: number): number {
    return 60 / (track.tempo * tempoScale) / track.stepsPerBeat;
  }

  private applyAmbienceFromRuntimeTuning(): void {
    const ctx = this.contextManager.getCtx();
    if (!ctx || !this.musicFX) {
      return;
    }

    setMusicBusReverbGain(ctx, this.musicFX, resolveMusicRuntimeTuning(this.runtimeTuning).reverbGain);
  }

  private clamp01(value: number): number {
    return Math.min(1, Math.max(0, value));
  }
}
