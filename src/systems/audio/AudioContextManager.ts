import type { MusicNoiseCharacterConfig } from '../../config/LevelsConfig';

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
  private explosionBuffer: AudioBuffer | null = null;
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
      this.sfxBus.gain.setTargetAtTime(SFX_BUS_LEVEL * volume, this.ctx.currentTime, 0.02);
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
        this.getExplosionBuffer();
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
      this.getExplosionBuffer();
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

  getExplosionBuffer(): AudioBuffer | null {
    if (!this.ctx) return null;

    if (this.explosionBuffer) {
      return this.explosionBuffer;
    }

    const bufferSize = Math.floor(this.ctx.sampleRate * 0.3);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 2);
    }

    this.explosionBuffer = buffer;
    return buffer;
  }

  getNoiseBuffer(color: MusicNoiseCharacterConfig['color'] = 'white'): AudioBuffer | null {
    if (!this.ctx) return null;

    const bufferKey = color ?? 'white';
    const existingBuffer = this.noiseBuffers.get(bufferKey);
    if (existingBuffer) {
      return existingBuffer;
    }

    const bufferSize = Math.floor(this.ctx.sampleRate * 1.5);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let pinkState0 = 0;
    let pinkState1 = 0;
    let pinkState2 = 0;
    let pinkState3 = 0;
    let pinkState4 = 0;
    let pinkState5 = 0;
    let pinkState6 = 0;
    let brownState = 0;

    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;

      if (bufferKey === 'pink') {
        pinkState0 = 0.99886 * pinkState0 + white * 0.0555179;
        pinkState1 = 0.99332 * pinkState1 + white * 0.0750759;
        pinkState2 = 0.969 * pinkState2 + white * 0.153852;
        pinkState3 = 0.8665 * pinkState3 + white * 0.3104856;
        pinkState4 = 0.55 * pinkState4 + white * 0.5329522;
        pinkState5 = -0.7616 * pinkState5 - white * 0.016898;
        const pink =
          pinkState0 + pinkState1 + pinkState2 + pinkState3 + pinkState4 + pinkState5 + pinkState6 + white * 0.5362;
        pinkState6 = white * 0.115926;
        data[i] = pink * 0.11;
        continue;
      }

      if (bufferKey === 'brown') {
        brownState = (brownState + 0.02 * white) / 1.02;
        data[i] = brownState * 3.2;
        continue;
      }

      data[i] = white * 0.6;
    }

    this.noiseBuffers.set(bufferKey, buffer);
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
    if (!context || context.state !== 'suspended' || this.desiredSuspended || this.gestureResume) {
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
    this.explosionBuffer = null;
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
