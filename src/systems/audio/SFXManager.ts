import { AudioContextManager } from './AudioContextManager';

export class SFXManager {
  constructor(private contextManager: AudioContextManager) {}

  private getAudioOutput(): { ctx: AudioContext; masterGain: GainNode } | null {
    if (!this.contextManager.ensureContext()) {
      return null;
    }

    const ctx = this.contextManager.getCtx();
    const masterGain = this.contextManager.getMasterGain();
    if (!ctx || !masterGain) {
      return null;
    }

    return { ctx, masterGain };
  }

  playLaser(): void {
    const output = this.getAudioOutput();
    if (!output) return;

    const { ctx, masterGain } = output;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const now = ctx.currentTime;

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(580, now);
    osc.frequency.exponentialRampToValueAtTime(520, now + 0.12);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.04, now + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);

    osc.connect(gain);
    gain.connect(masterGain);

    osc.start(now);
    osc.stop(now + 0.14);
  }

  playExplosion(intensity = 1): void {
    const output = this.getAudioOutput();
    if (!output) return;

    const { ctx, masterGain } = output;
    const buffer = this.contextManager.getExplosionBuffer();
    if (!buffer) return;

    const source = ctx.createBufferSource();
    source.buffer = buffer;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.25 * intensity, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3 * intensity);

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(2000 * intensity, ctx.currentTime);
    filter.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.2);

    source.connect(filter);
    filter.connect(gain);
    gain.connect(masterGain);

    source.start(ctx.currentTime);
  }

  playEnemyFire(): void {
    const output = this.getAudioOutput();
    if (!output) return;

    const { ctx, masterGain } = output;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'square';
    osc.frequency.setValueAtTime(300, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(150, ctx.currentTime + 0.1);

    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);

    osc.connect(gain);
    gain.connect(masterGain);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.12);
  }

  playPowerUp(): void {
    const output = this.getAudioOutput();
    if (!output) return;

    const { ctx, masterGain } = output;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(400, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.2);

    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.2, ctx.currentTime + 0.1);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);

    osc.connect(gain);
    gain.connect(masterGain);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.35);
  }

  playPowerUpPickup(): void {
    const output = this.getAudioOutput();
    if (!output) return;

    const { ctx, masterGain } = output;
    const notes = [600, 900, 1200];
    for (let i = 0; i < notes.length; i++) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.value = notes[i];

      const startTime = ctx.currentTime + i * 0.06;
      gain.gain.setValueAtTime(0.12, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.15);

      osc.connect(gain);
      gain.connect(masterGain);

      osc.start(startTime);
      osc.stop(startTime + 0.15);
    }
  }

  playClick(): void {
    const output = this.getAudioOutput();
    if (!output) return;

    const { ctx, masterGain } = output;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(600, ctx.currentTime);

    gain.gain.setValueAtTime(0.1, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);

    osc.connect(gain);
    gain.connect(masterGain);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.05);
  }

  playPlayerHit(): void {
    const output = this.getAudioOutput();
    if (!output) return;

    const { ctx, masterGain } = output;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(200, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + 0.15);

    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);

    osc.connect(gain);
    gain.connect(masterGain);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.2);
  }
}
