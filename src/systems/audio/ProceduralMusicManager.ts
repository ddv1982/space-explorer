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
/**
 * A track change fades the old track out on its own bus, tails included, while the new track comes
 * in from its first bar on a fresh one.
 */
const CROSSFADE_OUT_SECONDS = 0.45;
const CROSSFADE_IN_SECONDS = 0.35;
const CROSSFADE_OVERLAP_SECONDS = 0.25;

export class ProceduralMusicManager {
  private bus: MusicBus | null = null;
  private timer: number | null = null;
  private activeTrack: ProceduralMusicTrackConfig | null = null;
  private retiringBuses = new Map<MusicBus, number>();
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

  /** Fades the current bus out with everything still sounding on it, then disconnects it. */
  private retireBus(ctx: AudioContext): void {
    const bus = this.bus;
    if (!bus) return;
    this.bus = null;

    const now = ctx.currentTime;
    bus.fade.gain.cancelScheduledValues(now);
    bus.fade.gain.setValueAtTime(bus.fade.gain.value, now);
    bus.fade.gain.linearRampToValueAtTime(0.001, now + CROSSFADE_OUT_SECONDS);
    const timer = window.setTimeout(
      () => {
        this.retiringBuses.delete(bus);
        disconnectMusicBus(bus);
      },
      (CROSSFADE_OUT_SECONDS + 0.1) * 1000
    );
    this.retiringBuses.set(bus, timer);
  }

  resetNodes(): void {
    this.stopMusic();
  }

  /**
   * Starts a track, fading in over `fadeInSeconds`. If music is already playing it crossfades to
   * the new track; asking for the track that is already playing changes nothing.
   */
  playMusic(track: ProceduralMusicTrackConfig, fadeInSeconds = 0.08): void {
    const ctx = this.contextManager.getCtx();
    if (!ctx || !this.contextManager.ensureContext()) {
      this.resetNodes();
      return;
    }
    if (this.activeTrack === track) return;

    const crossfading = this.activeTrack !== null;
    if (crossfading) this.retireBus(ctx);
    this.ensureGains();
    if (!this.bus) return;

    this.activeTrack = track;
    this.stepIndex = 0;
    this.nextStepTime = ctx.currentTime + (crossfading ? CROSSFADE_OVERLAP_SECONDS : 0.02);
    applyMusicSpace(ctx, this.bus, track.space, getMusicStepSeconds(track), ctx.currentTime);
    const fade = this.bus.fade.gain;
    fade.setValueAtTime(0.001, ctx.currentTime);
    fade.setValueAtTime(0.001, this.nextStepTime);
    fade.linearRampToValueAtTime(1, this.nextStepTime + (crossfading ? CROSSFADE_IN_SECONDS : fadeInSeconds));

    if (this.timer !== null) clearTimeout(this.timer);
    this.schedule();
  }

  stopMusic(): void {
    if (this.timer !== null) {
      clearTimeout(this.timer);
    }
    disconnectMusicBus(this.bus);
    for (const [bus, timer] of this.retiringBuses) {
      clearTimeout(timer);
      disconnectMusicBus(bus);
    }
    this.retiringBuses.clear();
    this.bus = null;
    this.timer = null;
    this.activeTrack = null;
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
      scheduleTrackStep(output, this.activeTrack, this.stepIndex, this.nextStepTime, this.intensity);
      this.stepIndex += 1;
      this.nextStepTime += getMusicStepSeconds(this.activeTrack);
    }

    this.timer = window.setTimeout(() => this.schedule(), SCHEDULE_INTERVAL_MS);
  }
}
