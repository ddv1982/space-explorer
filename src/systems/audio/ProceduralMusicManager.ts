import type { ProceduralMusicTrackConfig } from '../../config/LevelsConfig';
import { AudioContextManager } from './AudioContextManager';
import { applyMusicSpace, createMusicBus, disconnectMusicBus, type MusicBus } from './procedural/bus';
import {
  getMusicStepSeconds,
  MAXIMUM_MUSIC_INTENSITY,
  MINIMUM_MUSIC_INTENSITY,
  scheduleTrackStep,
} from './procedural/scheduleStep';

/** Loudness barely follows intensity: layers entering and leaving carry the dynamics instead. */
const MINIMUM_OUTPUT_INTENSITY = 0.9;
const MUSIC_OUTPUT_GAIN_BOOST = 2.9;
const SCHEDULE_INTERVAL_MS = 45;
const SCHEDULE_AHEAD_SECONDS = 0.22;
/** A track change fades the old track out, then brings the new one in from its first bar. */
const CROSSFADE_OUT_SECONDS = 0.45;
const CROSSFADE_IN_SECONDS = 0.35;

export class ProceduralMusicManager {
  private bus: MusicBus | null = null;
  private timer: number | null = null;
  private activeTrack: ProceduralMusicTrackConfig | null = null;
  private pendingSwitch: { track: ProceduralMusicTrackConfig; time: number } | null = null;
  private stepIndex = 0;
  private nextStepTime = 0;
  private intensity = 1;
  private volume = 1;

  constructor(private readonly contextManager: AudioContextManager) {}

  ensureGains(): void {
    const ctx = this.contextManager.getCtx();
    const destination = this.contextManager.getMusicBus();
    if (!ctx || !destination || this.bus) return;

    this.bus = createMusicBus(ctx, destination);
    this.applyOutputGain(0);
  }

  resetNodes(): void {
    this.stopMusic();
  }

  /**
   * Starts a track, fading in over `fadeInSeconds`. If music is already playing it crossfades to
   * the new track; asking for the track that is already playing (or queued) changes nothing.
   */
  playMusic(track: ProceduralMusicTrackConfig, fadeInSeconds = 0.08): void {
    const ctx = this.contextManager.getCtx();
    if (!ctx || !this.contextManager.ensureContext()) {
      this.resetNodes();
      return;
    }
    if ((this.pendingSwitch?.track ?? this.activeTrack) === track) return;

    this.ensureGains();
    if (!this.bus) return;

    const now = ctx.currentTime;
    const fade = this.bus.fade.gain;
    if (this.activeTrack) {
      fade.cancelScheduledValues(now);
      fade.setValueAtTime(fade.value, now);
      fade.linearRampToValueAtTime(0.001, now + CROSSFADE_OUT_SECONDS);
      this.pendingSwitch = { track, time: now + CROSSFADE_OUT_SECONDS };
      return;
    }

    this.beginTrack(track, now + 0.02, fadeInSeconds);
    this.applyOutputGain(0);
    this.schedule();
  }

  stopMusic(): void {
    if (this.timer !== null) {
      clearTimeout(this.timer);
    }
    disconnectMusicBus(this.bus);
    this.bus = null;
    this.timer = null;
    this.activeTrack = null;
    this.pendingSwitch = null;
    this.intensity = 1;
  }

  setMusicIntensity(intensity: number): void {
    const clamped = Math.min(MAXIMUM_MUSIC_INTENSITY, Math.max(MINIMUM_MUSIC_INTENSITY, intensity));
    if (Math.abs(clamped - this.intensity) < 0.01) return;
    this.intensity = clamped;
    this.applyOutputGain();
  }

  setMusicVolume(volume: number): void {
    this.volume = Math.min(1, Math.max(0, volume));
    this.applyOutputGain();
  }

  private beginTrack(track: ProceduralMusicTrackConfig, time: number, fadeInSeconds: number): void {
    const ctx = this.contextManager.getCtx();
    if (!ctx || !this.bus) return;

    this.activeTrack = track;
    this.pendingSwitch = null;
    this.stepIndex = 0;
    this.nextStepTime = time;
    applyMusicSpace(ctx, this.bus, track.space, getMusicStepSeconds(track), time);

    const fade = this.bus.fade.gain;
    fade.cancelScheduledValues(time);
    fade.setValueAtTime(0.001, time);
    fade.linearRampToValueAtTime(1, time + Math.max(0.02, fadeInSeconds));
  }

  private applyOutputGain(rampSeconds = 0.08): void {
    const ctx = this.contextManager.getCtx();
    if (!ctx || !this.bus) return;

    const target = Math.max(MINIMUM_OUTPUT_INTENSITY, this.intensity) * this.volume * MUSIC_OUTPUT_GAIN_BOOST;
    const gain = this.bus.output.gain;
    gain.cancelScheduledValues(ctx.currentTime);
    gain.setValueAtTime(rampSeconds > 0 ? gain.value : target, ctx.currentTime);
    if (rampSeconds > 0) {
      gain.linearRampToValueAtTime(target, ctx.currentTime + rampSeconds);
    }
  }

  private schedule(): void {
    const ctx = this.contextManager.getCtx();
    if (!ctx || !this.contextManager.ensureContext() || !this.bus || !this.activeTrack) {
      return;
    }

    const output = {
      ctx,
      dry: this.bus.dry,
      space: this.bus.space,
      getNoiseBuffer: (color?: Parameters<AudioContextManager['getNoiseBuffer']>[0]) =>
        this.contextManager.getNoiseBuffer(color),
    };
    while (this.nextStepTime < ctx.currentTime + SCHEDULE_AHEAD_SECONDS) {
      if (this.pendingSwitch && this.nextStepTime >= this.pendingSwitch.time) {
        this.beginTrack(this.pendingSwitch.track, this.nextStepTime, CROSSFADE_IN_SECONDS);
      }
      scheduleTrackStep(output, this.activeTrack, this.stepIndex, this.nextStepTime, this.intensity);
      this.stepIndex += 1;
      this.nextStepTime += getMusicStepSeconds(this.activeTrack);
    }

    this.timer = window.setTimeout(() => this.schedule(), SCHEDULE_INTERVAL_MS);
  }
}
