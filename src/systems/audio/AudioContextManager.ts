import type { MusicNoiseCharacterConfig } from '../../config/LevelsConfig';

type WebkitAudioWindow = Window & typeof globalThis & {
  webkitAudioContext?: typeof AudioContext;
};

export class AudioContextManager {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private explosionBuffer: AudioBuffer | null = null;
  private readonly noiseBuffers = new Map<string, AudioBuffer>();
  private desiredSuspended = false;
  private stateTransition: Promise<void> = Promise.resolve();

  getCtx(): AudioContext | null {
    return this.ctx;
  }

  getMasterGain(): GainNode | null {
    return this.masterGain;
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

    if (!this.masterGain) {
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 0.26;
      this.masterGain.connect(this.ctx.destination);
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
        const pink = pinkState0 + pinkState1 + pinkState2 + pinkState3 + pinkState4 + pinkState5 + pinkState6 + white * 0.5362;
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
    this.masterGain = null;
    this.explosionBuffer = null;
    this.noiseBuffers.clear();
    this.desiredSuspended = false;
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
