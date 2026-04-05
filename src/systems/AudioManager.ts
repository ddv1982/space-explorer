export class AudioManager {
  private ctx: AudioContext | null = null;
  private musicGain: GainNode | null = null;
  private musicOscillators: OscillatorNode[] = [];
  private musicPlaying: boolean = false;
  private musicTimer: number | null = null;
  private masterGain: GainNode | null = null;

  init(): void {
    try {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 0.3;
      this.masterGain.connect(this.ctx.destination);

      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.value = 0.08;
      this.musicGain.connect(this.masterGain);
    } catch {
      this.ctx = null;
    }
  }

  private ensureContext(): boolean {
    if (!this.ctx) return false;
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return true;
  }

  playLaser(): void {
    if (!this.ensureContext() || !this.masterGain) return;

    const osc = this.ctx!.createOscillator();
    const gain = this.ctx!.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(880, this.ctx!.currentTime);
    osc.frequency.exponentialRampToValueAtTime(440, this.ctx!.currentTime + 0.08);

    gain.gain.setValueAtTime(0.15, this.ctx!.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx!.currentTime + 0.1);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(this.ctx!.currentTime);
    osc.stop(this.ctx!.currentTime + 0.1);
  }

  playExplosion(intensity: number = 1): void {
    if (!this.ensureContext() || !this.masterGain) return;

    const bufferSize = this.ctx!.sampleRate * 0.3;
    const buffer = this.ctx!.createBuffer(1, bufferSize, this.ctx!.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 2);
    }

    const source = this.ctx!.createBufferSource();
    source.buffer = buffer;

    const gain = this.ctx!.createGain();
    gain.gain.setValueAtTime(0.25 * intensity, this.ctx!.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx!.currentTime + 0.3 * intensity);

    const filter = this.ctx!.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(2000 * intensity, this.ctx!.currentTime);
    filter.frequency.exponentialRampToValueAtTime(200, this.ctx!.currentTime + 0.2);

    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    source.start(this.ctx!.currentTime);
  }

  playEnemyFire(): void {
    if (!this.ensureContext() || !this.masterGain) return;

    const osc = this.ctx!.createOscillator();
    const gain = this.ctx!.createGain();

    osc.type = 'square';
    osc.frequency.setValueAtTime(300, this.ctx!.currentTime);
    osc.frequency.exponentialRampToValueAtTime(150, this.ctx!.currentTime + 0.1);

    gain.gain.setValueAtTime(0.08, this.ctx!.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx!.currentTime + 0.12);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(this.ctx!.currentTime);
    osc.stop(this.ctx!.currentTime + 0.12);
  }

  playPowerUp(): void {
    if (!this.ensureContext() || !this.masterGain) return;

    const osc = this.ctx!.createOscillator();
    const gain = this.ctx!.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(400, this.ctx!.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1200, this.ctx!.currentTime + 0.2);

    gain.gain.setValueAtTime(0.15, this.ctx!.currentTime);
    gain.gain.linearRampToValueAtTime(0.2, this.ctx!.currentTime + 0.1);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx!.currentTime + 0.35);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(this.ctx!.currentTime);
    osc.stop(this.ctx!.currentTime + 0.35);
  }

  playClick(): void {
    if (!this.ensureContext() || !this.masterGain) return;

    const osc = this.ctx!.createOscillator();
    const gain = this.ctx!.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(600, this.ctx!.currentTime);

    gain.gain.setValueAtTime(0.1, this.ctx!.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx!.currentTime + 0.05);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(this.ctx!.currentTime);
    osc.stop(this.ctx!.currentTime + 0.05);
  }

  playPlayerHit(): void {
    if (!this.ensureContext() || !this.masterGain) return;

    const osc = this.ctx!.createOscillator();
    const gain = this.ctx!.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(200, this.ctx!.currentTime);
    osc.frequency.exponentialRampToValueAtTime(80, this.ctx!.currentTime + 0.15);

    gain.gain.setValueAtTime(0.2, this.ctx!.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx!.currentTime + 0.2);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(this.ctx!.currentTime);
    osc.stop(this.ctx!.currentTime + 0.2);
  }

  startMusic(): void {
    if (!this.ensureContext() || this.musicPlaying || !this.musicGain) return;
    this.musicPlaying = true;

    // Simple arpeggiated bass pattern
    const notes = [110, 130.81, 164.81, 196, 164.81, 130.81]; // A2 C3 E3 G3 E3 C3
    const noteDuration = 0.25;
    let noteIndex = 0;

    const playNote = () => {
      if (!this.ctx || !this.musicPlaying || !this.musicGain) return;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.value = notes[noteIndex % notes.length];

      gain.gain.setValueAtTime(0.15, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + noteDuration * 0.9);

      osc.connect(gain);
      gain.connect(this.musicGain);

      osc.start(this.ctx.currentTime);
      osc.stop(this.ctx.currentTime + noteDuration);

      noteIndex++;
    };

    playNote();
    this.musicTimer = window.setInterval(playNote, noteDuration * 1000);
  }

  stopMusic(): void {
    this.musicPlaying = false;
    if (this.musicTimer !== null) {
      clearInterval(this.musicTimer);
      this.musicTimer = null;
    }
    for (const osc of this.musicOscillators) {
      try { osc.stop(); } catch { /* already stopped */ }
    }
    this.musicOscillators = [];
  }

  destroy(): void {
    this.stopMusic();
    if (this.ctx) {
      this.ctx.close();
      this.ctx = null;
    }
  }
}

// Singleton instance
export const audioManager = new AudioManager();
