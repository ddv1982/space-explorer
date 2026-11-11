import type { MusicNoiseCharacterConfig } from '../../config/LevelsConfig';
import { createNoiseBuffer } from './procedural/noiseBuffer';

type WebkitAudioWindow = Window &
  typeof globalThis & {
    webkitAudioContext?: typeof AudioContext;
  };

const MUSIC_BUS_LEVEL = 0.26;
const SFX_BUS_LEVEL = 0.5;

export class AudioContextManager {
  private ctx: AudioContext | null = null;
  private musicBus: GainNode | null = null;
  private musicDuck: GainNode | null = null;
  private sfxBus: GainNode | null = null;
  private sfxVolume = 1;
  private duckDepth = 0;
  private duckUntil = 0;
  private readonly noiseBuffers = new Map<string, AudioBuffer>();
  private desiredSuspended = false;
  private stateTransition: Promise<void> = Promise.resolve();
  private gestureResume: Promise<void> | null = null;

  getCtx(): AudioContext | null {
    return this.ctx;
  }

  /** Music input. It passes through the duck gain, then shares the limiter with effects. */
  getMusicBus(): GainNode | null {
    return this.musicBus;
  }

  getSfxBus(): GainNode | null {
    return this.sfxBus;
  }

  setSfxVolume(volume: number): void {
    this.sfxVolume = volume;
    if (this.ctx && this.sfxBus) {
      // A suspended context would only start the glide after resuming, at the old level.
      if (this.ctx.state === 'running') {
        this.sfxBus.gain.setTargetAtTime(SFX_BUS_LEVEL * volume, this.ctx.currentTime, 0.02);
      } else {
        this.sfxBus.gain.value = SFX_BUS_LEVEL * volume;
      }
    }
  }

  /**
   * Dips the music by `depth` (0-1) and lets it recover over `seconds`. The dip follows the effects
   * volume, so muted effects leave the music untouched.
   */
  duckMusic(depth: number, seconds: number): void {
    depth *= this.sfxVolume;
    if (!this.ctx || !this.musicDuck || depth <= 0) return;
    const now = this.ctx.currentTime;
    // A lighter dip must not cut short a deeper one that is still recovering.
    if (now < this.duckUntil && depth < this.duckDepth) return;
    this.duckDepth = depth;
    this.duckUntil = now + seconds;
    const gain = this.musicDuck.gain;
    gain.cancelScheduledValues(now);
    gain.setTargetAtTime(1 - depth, now, 0.015);
    gain.setTargetAtTime(1, now + 0.09, seconds / 3);
  }

  getState(): AudioContextState | null {
    return this.ctx?.state ?? null;
  }

  init(): void {
    try {
      if (this.ctx?.state === 'closed') {
        this.resetNodes();
      }

      if (this.ctx) {
        this.ensureGains();
        if (this.desiredSuspended) this.queueStateTransition();
        return;
      }

      const AudioContextCtor = window.AudioContext || (window as WebkitAudioWindow).webkitAudioContext;
      if (!AudioContextCtor) {
        this.resetNodes();
        return;
      }

      this.ctx = new AudioContextCtor();
      this.ensureGains();
      if (this.desiredSuspended) this.queueStateTransition();
    } catch {
      this.resetNodes();
    }
  }

  private ensureGains(): void {
    if (!this.ctx) return;

    if (!this.musicBus) {
      // Everything meets in one limiter, so stacked explosions over full music cannot clip.
      const limiter = this.ctx.createDynamicsCompressor();
      limiter.threshold.value = -4;
      limiter.knee.value = 4;
      limiter.ratio.value = 12;
      limiter.attack.value = 0.002;
      limiter.release.value = 0.2;
      limiter.connect(this.ctx.destination);

      this.musicBus = this.ctx.createGain();
      this.musicBus.gain.value = MUSIC_BUS_LEVEL;
      this.musicDuck = this.ctx.createGain();
      this.musicBus.connect(this.musicDuck);
      this.musicDuck.connect(limiter);

      this.sfxBus = this.ctx.createGain();
      this.sfxBus.gain.value = SFX_BUS_LEVEL * this.sfxVolume;
      this.sfxBus.connect(limiter);
    }
  }

  getNoiseBuffer(color: MusicNoiseCharacterConfig['color'] = 'white'): AudioBuffer | null {
    if (!this.ctx) return null;

    let buffer = this.noiseBuffers.get(color);
    if (!buffer) {
      buffer = createNoiseBuffer(this.ctx, color);
      this.noiseBuffers.set(color, buffer);
    }
    return buffer;
  }

  ensureContext(): boolean {
    if (!this.ctx) return false;
    if (this.ctx.state === 'closed') {
      this.resetNodes();
      return false;
    }
    return true;
  }

  suspend(): void {
    if (this.desiredSuspended && (!this.ctx || this.ctx.state === 'suspended')) {
      return;
    }
    this.desiredSuspended = true;
    this.queueStateTransition();
  }

  resume(): void {
    if (!this.desiredSuspended && (!this.ctx || this.ctx.state === 'running')) {
      return;
    }
    this.desiredSuspended = false;
    this.queueStateTransition();
  }

  resumeFromUserGesture(): void {
    const context = this.ctx;
    // Anything but running or closed needs waking: Safari also reports 'interrupted'.
    const asleep = context && context.state !== 'running' && context.state !== 'closed';
    if (!context || !asleep || this.desiredSuspended || this.gestureResume) {
      return;
    }

    let resume: Promise<void>;
    try {
      // Invocation must remain in the trusted input stack; awaiting or queueing
      // this call can lose browser user activation.
      resume = context.resume();
    } catch {
      return;
    }

    const trackedResume = Promise.resolve(resume).then(
      () => {
        if (this.gestureResume === trackedResume) this.gestureResume = null;
        if (this.ctx === context) this.queueStateTransition();
      },
      () => {
        if (this.gestureResume === trackedResume) this.gestureResume = null;
      }
    );
    this.gestureResume = trackedResume;
  }

  private queueStateTransition(): void {
    this.stateTransition = this.stateTransition
      .catch((): void => undefined)
      .then(async () => {
        const context = this.ctx;
        if (!context || context.state === 'closed') return;

        while (context === this.ctx) {
          if (this.desiredSuspended && context.state === 'running') {
            await context.suspend();
            continue;
          }
          if (!this.desiredSuspended && context.state === 'suspended') {
            await context.resume();
            continue;
          }
          break;
        }
      })
      .catch((): void => undefined);
  }

  resetNodes(): void {
    this.ctx = null;
    this.musicBus = null;
    this.musicDuck = null;
    this.sfxBus = null;
    this.duckDepth = 0;
    this.duckUntil = 0;
    this.noiseBuffers.clear();
    this.desiredSuspended = false;
    this.gestureResume = null;
  }

  destroy(): void {
    const context = this.ctx;
    this.resetNodes();
    if (context) {
      void context.close().catch(() => {
        // Best effort close during shutdown.
      });
    }
  }
}
