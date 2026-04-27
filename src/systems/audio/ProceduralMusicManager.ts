import type {
  ProceduralMusicLayerConfig,
  ProceduralMusicTrackConfig,
  ProceduralNoiseLayerConfig,
} from '../../config/LevelsConfig';
import { AudioContextManager } from './AudioContextManager';
import { disconnectMusicBus, recreateMusicBus, type MusicFXChain } from './procedural/bus';
import { type MusicRuntimeTuningValues } from './procedural/musicRuntimeTuningProfile';
import { MusicRuntimeControl } from './procedural/runtimeControl';
import { resolveLayerRhythmScheduling } from './procedural/rhythm';
import { buildSchedulingStepPlan, type SchedulingStepPlan } from './procedural/stepSchedulingPlan';
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

const MINIMUM_MUSIC_INTENSITY = 0.2;
const MAXIMUM_MUSIC_INTENSITY = 1.2;
const MUSIC_OUTPUT_GAIN_BOOST = 2.9;

export class ProceduralMusicManager {
  private readonly musicScheduleLookaheadMs = 45;
  private readonly musicScheduleAheadSeconds = 0.22;

  private readonly contextManager: AudioContextManager;
  private musicGain: GainNode | null = null;
  private musicFX: MusicFXChain | null = null;
  private musicPlaying = false;
  private musicTimer: number | null = null;
  private activeTrack: ProceduralMusicTrackConfig | null = null;
  private musicStepIndex = 0;
  private musicNextStepTime = 0;
  private readonly runtimeControl: MusicRuntimeControl;

  constructor(contextManager: AudioContextManager) {
    this.contextManager = contextManager;
    this.runtimeControl = new MusicRuntimeControl({
      minimumMusicIntensity: MINIMUM_MUSIC_INTENSITY,
      maximumMusicIntensity: MAXIMUM_MUSIC_INTENSITY,
      musicOutputGainBoost: MUSIC_OUTPUT_GAIN_BOOST,
      getCtx: () => this.contextManager.getCtx(),
      getMusicGain: () => this.musicGain,
      getMusicFX: () => this.musicFX,
    });
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
    this.runtimeControl.resetPlaybackState();

    this.musicGain.gain.cancelScheduledValues(ctx.currentTime);
    this.musicGain.gain.setValueAtTime(0.001, ctx.currentTime);
    this.musicGain.gain.linearRampToValueAtTime(this.runtimeControl.resolveOutputGain(), ctx.currentTime + 0.08);

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
    this.runtimeControl.setMusicIntensity(intensity);
  }

  getMusicVolume(): number {
    return this.runtimeControl.getMusicVolume();
  }

  setMusicVolume(volume: number): number {
    return this.runtimeControl.setMusicVolume(volume);
  }

  getMusicRuntimeTuning(): MusicRuntimeTuning {
    return this.runtimeControl.getMusicRuntimeTuning();
  }

  setMusicRuntimeTuning(nextTuning: Partial<MusicRuntimeTuning>): MusicRuntimeTuning {
    return this.runtimeControl.setMusicRuntimeTuning(nextTuning);
  }

  resetMusicRuntimeTuning(): MusicRuntimeTuning {
    return this.runtimeControl.resetMusicRuntimeTuning();
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
    this.runtimeControl.applyAmbienceFromRuntimeTuning();
    this.runtimeControl.applyMusicGainFromState(0);
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
    this.runtimeControl.resetPlaybackState();
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
      const runtimeTuning = this.runtimeControl.getResolvedRuntimeTuning();
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

    const runtimeTuning = this.runtimeControl.getResolvedRuntimeTuning();
    const stepPlan = buildSchedulingStepPlan({
      track,
      stepIndex,
      tempoScale: runtimeTuning.tempoScale,
      creativityDrive: runtimeTuning.creativityDrive,
      musicIntensity: this.runtimeControl.getMusicIntensity(),
      minimumMusicIntensity: MINIMUM_MUSIC_INTENSITY,
      maximumMusicIntensity: MAXIMUM_MUSIC_INTENSITY,
    });

    const toneLayerPasses: Array<{ layer?: ProceduralMusicLayerConfig; gainMultiplier: number }> = [
      { layer: track.bass, gainMultiplier: stepPlan.gainMultipliers.bass },
      { layer: track.pulse, gainMultiplier: stepPlan.gainMultipliers.pulse },
      { layer: track.lead, gainMultiplier: stepPlan.gainMultipliers.lead },
    ];

    for (const toneLayerPass of toneLayerPasses) {
      this.scheduleToneLayerIfTriggered({
        ctx,
        track,
        layer: toneLayerPass.layer,
        meterStepContext: stepPlan.meterStepContext,
        density: stepPlan.density,
        gainMultiplier: toneLayerPass.gainMultiplier,
        harmonicRootHz: stepPlan.harmonicRootHz,
        time,
        stepDuration: stepPlan.stepDuration,
        intensityBlend: stepPlan.intensityBlend,
        creativityDrive: stepPlan.creativityDrive,
      });
    }

    this.scheduleNoiseLayerIfTriggered({
      ctx,
      track,
      noiseLayer: track.noise,
      meterStepContext: stepPlan.meterStepContext,
      density: stepPlan.density,
      gainMultiplier: stepPlan.gainMultipliers.noise,
      time,
      stepDuration: stepPlan.stepDuration,
      intensityBlend: stepPlan.intensityBlend,
      creativityDrive: stepPlan.creativityDrive,
    });
  }

  private scheduleToneLayerIfTriggered(params: {
    ctx: AudioContext;
    track: ProceduralMusicTrackConfig;
    layer?: ProceduralMusicLayerConfig;
    meterStepContext: SchedulingStepPlan['meterStepContext'];
    density: number;
    gainMultiplier: number;
    harmonicRootHz: number;
    time: number;
    stepDuration: number;
    intensityBlend: number;
    creativityDrive: number;
  }): void {
    if (!params.layer || !this.musicGain) {
      return;
    }

    const layerRhythm = resolveLayerRhythmScheduling(params.layer.rhythm, params.meterStepContext, {
      density: params.density,
      gainMultiplier: Math.max(0, params.gainMultiplier),
    });

    if (!layerRhythm.shouldTrigger) {
      return;
    }

    scheduleLayer({
      ctx: params.ctx,
      musicGain: this.musicGain,
      track: params.track,
      layer: params.layer,
      stepIndex: layerRhythm.patternStepIndex,
      harmonicRootHz: params.harmonicRootHz,
      time: params.time,
      stepDuration: params.stepDuration,
      intensityBlend: params.intensityBlend,
      creativityDrive: params.creativityDrive,
      gainScale: layerRhythm.gainScale,
    });
  }

  private scheduleNoiseLayerIfTriggered(params: {
    ctx: AudioContext;
    track: ProceduralMusicTrackConfig;
    noiseLayer?: ProceduralNoiseLayerConfig;
    meterStepContext: SchedulingStepPlan['meterStepContext'];
    density: number;
    gainMultiplier: number;
    time: number;
    stepDuration: number;
    intensityBlend: number;
    creativityDrive: number;
  }): void {
    if (!params.noiseLayer || !this.musicGain) {
      return;
    }

    const noiseRhythm = resolveLayerRhythmScheduling(params.noiseLayer.rhythm, params.meterStepContext, {
      density: params.density,
      gainMultiplier: Math.max(0, params.gainMultiplier),
    });

    if (!noiseRhythm.shouldTrigger) {
      return;
    }

    scheduleNoise({
      ctx: params.ctx,
      musicGain: this.musicGain,
      track: params.track,
      noiseLayer: params.noiseLayer,
      stepIndex: noiseRhythm.patternStepIndex,
      time: params.time,
      stepDuration: params.stepDuration,
      intensityBlend: params.intensityBlend,
      creativityDrive: params.creativityDrive,
      gainScale: noiseRhythm.gainScale,
      getNoiseBuffer: (color) => this.contextManager.getNoiseBuffer(color),
      getExplosionBuffer: () => this.contextManager.getExplosionBuffer(),
    });
  }

  private getStepDuration(track: ProceduralMusicTrackConfig, tempoScale: number): number {
    return 60 / (track.tempo * tempoScale) / track.stepsPerBeat;
  }

}
