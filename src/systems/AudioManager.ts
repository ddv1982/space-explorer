import type {
  ProceduralMusicLayerConfig,
  ProceduralMusicTrackConfig,
  ProceduralNoiseLayerConfig,
} from '../config/LevelsConfig';

type WebkitAudioWindow = Window & typeof globalThis & {
  webkitAudioContext?: typeof AudioContext;
};

const DEFAULT_TRACK: ProceduralMusicTrackConfig = {
  tempo: 112,
  rootHz: 110,
  stepsPerBeat: 4,
  masterGain: 0.95,
  bass: {
    waveform: 'triangle',
    pattern: [0, null, null, null, 7, null, null, null, 12, null, null, null, 7, null, null, null],
    gain: 0.18,
    durationSteps: 3,
  },
  pulse: {
    waveform: 'square',
    pattern: [12, null, 12, null, 7, null, 12, null, 14, null, 12, null, 7, null, 5, null],
    gain: 0.05,
    durationSteps: 1,
    octaveShift: 1,
    filterHz: 1900,
  },
  lead: {
    waveform: 'sine',
    pattern: [null, 12, null, 14, null, 12, null, 7, null, 12, null, 14, null, 19, null, 14],
    gain: 0.04,
    durationSteps: 2,
    octaveShift: 1,
  },
};

class AudioManager {
  private readonly musicScheduleLookaheadMs = 50;
  private readonly musicScheduleAheadSeconds = 0.18;
  private readonly minimumMusicIntensity = 0.2;
  private readonly maximumMusicIntensity = 1.2;

  private ctx: AudioContext | null = null;
  private musicGain: GainNode | null = null;
  private musicPlaying = false;
  private musicTimer: number | null = null;
  private masterGain: GainNode | null = null;
  private explosionBuffer: AudioBuffer | null = null;
  private activeTrack: ProceduralMusicTrackConfig | null = null;
  private musicStepIndex = 0;
  private musicNextStepTime = 0;
  private musicIntensity = 1;

  init(): void {
    try {
      if (this.ctx?.state === 'closed') {
        this.resetNodes();
      }

      if (this.ctx) {
        this.ensureGains();
        this.getExplosionBuffer();
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

    if (!this.musicGain) {
      this.recreateMusicBus();
    }
  }

  private recreateMusicBus(): void {
    if (!this.ctx || !this.masterGain) {
      return;
    }

    if (this.musicGain) {
      try {
        this.musicGain.disconnect();
      } catch {
        // Best effort bus teardown for already-disconnected nodes.
      }
    }

    this.musicGain = this.ctx.createGain();
    this.musicGain.gain.value = 0.001;
    this.musicGain.connect(this.masterGain);
  }

  private resetNodes(): void {
    if (this.musicTimer !== null) {
      clearTimeout(this.musicTimer);
    }

    this.ctx = null;
    this.masterGain = null;
    this.musicGain = null;
    this.musicPlaying = false;
    this.musicTimer = null;
    this.explosionBuffer = null;
    this.activeTrack = null;
    this.musicStepIndex = 0;
    this.musicNextStepTime = 0;
    this.musicIntensity = 1;
  }

  private getExplosionBuffer(): AudioBuffer | null {
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

  private ensureContext(): boolean {
    if (!this.ctx) return false;
    if (this.ctx.state === 'closed') {
      this.resetNodes();
      return false;
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return true;
  }

  playLaser(): void {
    if (!this.ensureContext() || !this.masterGain) return;

    const osc = this.ctx!.createOscillator();
    const gain = this.ctx!.createGain();
    const now = this.ctx!.currentTime;

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(580, now);
    osc.frequency.exponentialRampToValueAtTime(520, now + 0.12);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.04, now + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.14);
  }

  playExplosion(intensity = 1): void {
    if (!this.ensureContext() || !this.masterGain) return;

    const buffer = this.getExplosionBuffer();
    if (!buffer) return;

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

  playPowerUpPickup(): void {
    if (!this.ensureContext() || !this.masterGain) return;

    const notes = [600, 900, 1200];
    for (let i = 0; i < notes.length; i++) {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();

      osc.type = 'sine';
      osc.frequency.value = notes[i];

      const startTime = this.ctx!.currentTime + i * 0.06;
      gain.gain.setValueAtTime(0.12, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.15);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(startTime);
      osc.stop(startTime + 0.15);
    }
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

  startMusic(track: ProceduralMusicTrackConfig = DEFAULT_TRACK): void {
    if (!this.ensureContext()) return;

    this.stopMusic();
    this.ensureGains();

    if (!this.musicGain) {
      return;
    }

    this.activeTrack = track;
    this.musicPlaying = true;
    this.musicStepIndex = 0;
    this.musicNextStepTime = this.ctx!.currentTime + 0.02;
    this.musicIntensity = 1;

    this.musicGain.gain.cancelScheduledValues(this.ctx!.currentTime);
    this.musicGain.gain.setValueAtTime(0.001, this.ctx!.currentTime);
    this.musicGain.gain.linearRampToValueAtTime(1, this.ctx!.currentTime + 0.08);

    this.scheduleMusic();
  }

  private scheduleMusic(): void {
    if (!this.ensureContext() || !this.musicPlaying || !this.activeTrack) {
      return;
    }

    while (this.musicNextStepTime < this.ctx!.currentTime + this.musicScheduleAheadSeconds) {
      this.scheduleTrackStep(this.activeTrack, this.musicStepIndex, this.musicNextStepTime);
      this.musicStepIndex += 1;
      this.musicNextStepTime += this.getStepDuration(this.activeTrack);
    }

    this.musicTimer = window.setTimeout(() => {
      this.scheduleMusic();
    }, this.musicScheduleLookaheadMs);
  }

  private scheduleTrackStep(track: ProceduralMusicTrackConfig, stepIndex: number, time: number): void {
    const stepDuration = this.getStepDuration(track);

    this.scheduleLayer(track, track.bass, stepIndex, time, stepDuration);
    if (track.pulse) {
      this.scheduleLayer(track, track.pulse, stepIndex, time, stepDuration);
    }
    if (track.lead) {
      this.scheduleLayer(track, track.lead, stepIndex, time, stepDuration);
    }
    if (track.noise) {
      this.scheduleNoise(track, track.noise, stepIndex, time, stepDuration);
    }
  }

  private scheduleLayer(
    track: ProceduralMusicTrackConfig,
    layer: ProceduralMusicLayerConfig,
    stepIndex: number,
    time: number,
    stepDuration: number
  ): void {
    const note = layer.pattern[stepIndex % layer.pattern.length];
    if (note === null) {
      return;
    }

    const octaveShift = layer.octaveShift ?? 0;
    const semitoneOffset = note + octaveShift * 12;
    const frequency = track.rootHz * Math.pow(2, semitoneOffset / 12);
    const duration = Math.max(stepDuration * layer.durationSteps * 0.92, 0.04);

    this.scheduleTone(layer, frequency, time, duration, track.masterGain);
  }

  private scheduleTone(
    layer: ProceduralMusicLayerConfig,
    frequency: number,
    time: number,
    duration: number,
    trackMasterGain: number
  ): void {
    if (!this.ctx || !this.musicGain) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const attackTime = Math.min(0.02, duration * 0.35);
    const releaseTime = Math.max(duration * 0.85, attackTime + 0.01);
    const peakGain = layer.gain * trackMasterGain;

    osc.type = layer.waveform;
    osc.frequency.setValueAtTime(frequency, time);

    if (layer.detune) {
      osc.detune.setValueAtTime(layer.detune, time);
    }

    gain.gain.setValueAtTime(0.001, time);
    gain.gain.linearRampToValueAtTime(peakGain, time + attackTime);
    gain.gain.exponentialRampToValueAtTime(0.001, time + releaseTime);

    if (layer.filterHz) {
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(layer.filterHz, time);
      osc.connect(filter);
      filter.connect(gain);
    } else {
      osc.connect(gain);
    }

    gain.connect(this.musicGain);

    osc.start(time);
    osc.stop(time + duration + 0.02);
  }

  private scheduleNoise(
    track: ProceduralMusicTrackConfig,
    noiseLayer: ProceduralNoiseLayerConfig,
    stepIndex: number,
    time: number,
    stepDuration: number
  ): void {
    if (!this.ctx || !this.musicGain) return;

    const shouldPlay = noiseLayer.pattern[stepIndex % noiseLayer.pattern.length] === 1;
    if (!shouldPlay) {
      return;
    }

    const buffer = this.getExplosionBuffer();
    if (!buffer) return;

    const source = this.ctx.createBufferSource();
    source.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(noiseLayer.filterHz, time);

    const gain = this.ctx.createGain();
    const duration = Math.max(stepDuration * noiseLayer.durationSteps * 0.75, 0.04);
    const peakGain = noiseLayer.gain * track.masterGain;

    gain.gain.setValueAtTime(0.001, time);
    gain.gain.linearRampToValueAtTime(peakGain, time + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, time + duration);

    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.musicGain);

    source.start(time);
    source.stop(time + duration + 0.02);
  }

  private getStepDuration(track: ProceduralMusicTrackConfig): number {
    return 60 / track.tempo / track.stepsPerBeat;
  }

  stopMusic(): void {
    this.musicPlaying = false;
    this.activeTrack = null;
    this.musicStepIndex = 0;
    this.musicNextStepTime = 0;
    this.musicIntensity = 1;

    if (this.musicTimer !== null) {
      clearTimeout(this.musicTimer);
      this.musicTimer = null;
    }

    if (this.musicGain) {
      try {
        this.musicGain.disconnect();
      } catch {
        // Best effort bus teardown for already-disconnected nodes.
      }
      this.musicGain = null;
    }
  }

  setMusicIntensity(intensity: number): void {
    if (!this.ctx || !this.musicGain) {
      return;
    }

    const clampedIntensity = Math.min(
      this.maximumMusicIntensity,
      Math.max(this.minimumMusicIntensity, intensity)
    );

    if (Math.abs(clampedIntensity - this.musicIntensity) < 0.01) {
      return;
    }

    this.musicIntensity = clampedIntensity;
    this.musicGain.gain.cancelScheduledValues(this.ctx.currentTime);
    this.musicGain.gain.setValueAtTime(this.musicGain.gain.value, this.ctx.currentTime);
    this.musicGain.gain.linearRampToValueAtTime(clampedIntensity, this.ctx.currentTime + 0.08);
  }

  destroy(): void {
    this.stopMusic();
    if (this.ctx) {
      this.ctx.close();
    }
    this.resetNodes();
  }
}

export const audioManager = new AudioManager();
