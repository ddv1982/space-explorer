import type {
  MusicAccentConfig,
  MusicEnvelopeShapeConfig,
  MusicModulationConfig,
  MusicNoiseCharacterConfig,
  ProceduralMusicLayerConfig,
  ProceduralMusicLayerExpressionConfig,
  ProceduralMusicTrackConfig,
  ProceduralMusicTrackExpressionConfig,
  ProceduralNoiseLayerConfig,
  ProceduralNoiseLayerExpressionConfig,
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
  private readonly noiseBuffers = new Map<string, AudioBuffer>();
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
    this.noiseBuffers.clear();
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

  private getNoiseBuffer(color: MusicNoiseCharacterConfig['color'] = 'white'): AudioBuffer | null {
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

  private getIntensityBlend(): number {
    return this.clamp(
      (this.musicIntensity - this.minimumMusicIntensity) /
        (this.maximumMusicIntensity - this.minimumMusicIntensity),
      0,
      1
    );
  }

  private clamp(value: number, min: number, max: number): number {
    return Math.min(max, Math.max(min, value));
  }

  private resolveLayerExpression(
    trackExpression?: ProceduralMusicTrackExpressionConfig,
    layerExpression?: ProceduralMusicLayerExpressionConfig
  ): ProceduralMusicLayerExpressionConfig | undefined {
    const envelope = layerExpression?.envelope;
    const stereo = trackExpression?.stereo || layerExpression?.stereo
      ? { ...trackExpression?.stereo, ...layerExpression?.stereo }
      : undefined;
    const modulation = trackExpression?.modulation || layerExpression?.modulation
      ? { ...trackExpression?.modulation, ...layerExpression?.modulation }
      : undefined;
    const accent = trackExpression?.accent || layerExpression?.accent
      ? { ...trackExpression?.accent, ...layerExpression?.accent }
      : undefined;

    if (!envelope && !stereo && !modulation && !accent) {
      return undefined;
    }

    return { envelope, stereo, modulation, accent };
  }

  private resolveNoiseExpression(
    trackExpression?: ProceduralMusicTrackExpressionConfig,
    noiseExpression?: ProceduralNoiseLayerExpressionConfig
  ): ProceduralNoiseLayerExpressionConfig | undefined {
    const expression = this.resolveLayerExpression(trackExpression, noiseExpression);
    if (!expression && !noiseExpression?.noiseCharacter) {
      return undefined;
    }

    return {
      ...expression,
      noiseCharacter: noiseExpression?.noiseCharacter,
    };
  }

  private getAccentScale(stepIndex: number, accent?: MusicAccentConfig): number {
    if (!accent?.amount) {
      return 1;
    }

    const emphasisSteps = accent.emphasisSteps ?? [];
    const isEmphasisStep = emphasisSteps.includes(stepIndex % 16);
    const pulseBias = accent.patternBias ?? 0;
    const patternAccent = stepIndex % 4 === 0 ? pulseBias : stepIndex % 2 === 0 ? pulseBias * 0.5 : 0;
    const accentWeight = this.clamp((isEmphasisStep ? 1 : 0.35) + patternAccent, 0, 1.5);

    return 1 + accent.amount * accentWeight;
  }

  private getEnvelopeShape(
    duration: number,
    waveform: ProceduralMusicLayerConfig['waveform'],
    envelope?: MusicEnvelopeShapeConfig
  ): Required<MusicEnvelopeShapeConfig> {
    const defaultAttack = waveform === 'sawtooth' || waveform === 'square' ? 0.012 : 0.02;
    const defaultDecay = Math.min(duration * 0.22, 0.12);
    const defaultSustain = waveform === 'sine' ? 0.84 : 0.72;
    const defaultRelease = Math.max(duration * 0.34, 0.06);
    const curve = envelope?.curve ?? 'soft';
    const attack = this.clamp(envelope?.attack ?? defaultAttack, 0.004, Math.max(duration * 0.45, 0.01));
    const decay = this.clamp(envelope?.decay ?? defaultDecay, 0, Math.max(duration * 0.45, 0.01));
    const sustain = this.clamp(envelope?.sustain ?? defaultSustain, 0.15, 1);
    const release = this.clamp(envelope?.release ?? defaultRelease, 0.03, Math.max(duration * 0.9, 0.05));

    return { attack, decay, sustain, release, curve };
  }

  private createPanner(
    basePan: number,
    stereo: ProceduralMusicLayerExpressionConfig['stereo'],
    time: number,
    duration: number,
    intensityBlend: number
  ): StereoPannerNode | null {
    if (!this.ctx || !this.musicGain) return null;
    if (!stereo || (Math.abs(basePan) < 0.001 && (stereo.width ?? 0) <= 0)) {
      return null;
    }

    const panner = this.ctx.createStereoPanner();
    const width = this.clamp(stereo?.width ?? 0, 0, 1);
    const phaseOffset = stereo?.phaseOffset ?? 0;
    const startingPan = this.clamp(basePan + Math.sin(phaseOffset * Math.PI * 2) * width * 0.35, -1, 1);
    panner.pan.setValueAtTime(startingPan, time);

    if (width > 0 && (stereo?.rateHz ?? 0) > 0) {
      const panLfo = this.ctx.createOscillator();
      const panDepth = this.ctx.createGain();
      panLfo.type = 'sine';
      panLfo.frequency.setValueAtTime((stereo?.rateHz ?? 0) * (0.85 + intensityBlend * 0.45), time);
      panDepth.gain.setValueAtTime(width * (0.3 + intensityBlend * 0.45), time);
      panLfo.connect(panDepth);
      panDepth.connect(panner.pan);
      panLfo.start(time);
      panLfo.stop(time + duration + 0.08);
    }

    return panner;
  }

  private applyModulation(
    modulation: MusicModulationConfig | undefined,
    target: AudioParam,
    baseValue: number,
    time: number,
    duration: number,
    depthScale = 1
  ): void {
    if (!this.ctx || !modulation?.target || !modulation.depth || !modulation.rateHz) {
      return;
    }

    const waveform = modulation.waveform === 'random' ? 'triangle' : modulation.waveform ?? 'sine';
    const lfo = this.ctx.createOscillator();
    const lfoGain = this.ctx.createGain();

    lfo.type = waveform;
    lfo.frequency.setValueAtTime(modulation.rateHz, time);
    lfoGain.gain.setValueAtTime(modulation.depth * depthScale, time);

    target.setValueAtTime(baseValue, time);
    lfo.connect(lfoGain);
    lfoGain.connect(target);

    lfo.start(time);
    lfo.stop(time + duration + 0.08);
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

    this.scheduleTone(track, layer, frequency, stepIndex, time, duration);
  }

  private scheduleTone(
    track: ProceduralMusicTrackConfig,
    layer: ProceduralMusicLayerConfig,
    frequency: number,
    stepIndex: number,
    time: number,
    duration: number
  ): void {
    if (!this.ctx || !this.musicGain) return;

    if (!track.expression && !layer.expression) {
      this.scheduleLegacyTone(layer, frequency, time, duration, track.masterGain);
      return;
    }

    const intensityBlend = this.getIntensityBlend();
    const expression = this.resolveLayerExpression(track.expression, layer.expression);
    const envelope = this.getEnvelopeShape(duration, layer.waveform, expression?.envelope);
    const accentScale = this.getAccentScale(stepIndex, expression?.accent);
    const noteGain = this.ctx.createGain();
    const voiceMix = this.ctx.createGain();
    const stereo = expression?.stereo;
    const basePan = this.clamp(stereo?.pan ?? 0, -1, 1);
    const panner = this.createPanner(basePan, stereo, time, duration + envelope.release, intensityBlend);
    const attackPeak = layer.gain * track.masterGain * accentScale * (0.9 + intensityBlend * 0.18);
    const sustainGain = Math.max(attackPeak * envelope.sustain, 0.001);
    const attackEnd = time + envelope.attack;
    const decayEnd = attackEnd + envelope.decay;
    const releaseStart = Math.max(decayEnd, time + Math.max(duration - envelope.release, duration * 0.45));
    const stopTime = releaseStart + envelope.release + 0.04;
    const voiceCount = frequency > 180 && intensityBlend > 0.45 ? 2 : 1;
    const voiceSpread = (voiceCount - 1) * (5 + intensityBlend * 5);

    noteGain.gain.setValueAtTime(0.001, time);
    if (envelope.curve === 'hard') {
      noteGain.gain.linearRampToValueAtTime(attackPeak, attackEnd);
    } else {
      noteGain.gain.exponentialRampToValueAtTime(Math.max(attackPeak, 0.001), attackEnd);
    }
    noteGain.gain.linearRampToValueAtTime(sustainGain, decayEnd);
    noteGain.gain.setValueAtTime(sustainGain, releaseStart);
    noteGain.gain.exponentialRampToValueAtTime(0.001, releaseStart + envelope.release);

    let targetNode: AudioNode = voiceMix;
    let filter: BiquadFilterNode | null = null;
    const needsFilter = Boolean(layer.filterHz) || expression?.modulation?.target === 'filter';
    if (needsFilter) {
      filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      const baseFilterHz = layer.filterHz ?? Math.max(frequency * 4, 900);
      const filterHz = baseFilterHz * (0.88 + intensityBlend * 0.35);
      filter.frequency.setValueAtTime(filterHz, time);
      filter.Q.setValueAtTime(0.7 + intensityBlend * 1.4, time);
      targetNode.connect(filter);
      targetNode = filter;
    }

    targetNode.connect(noteGain);
    if (panner) {
      noteGain.connect(panner);
      panner.connect(this.musicGain);
    } else {
      noteGain.connect(this.musicGain);
    }

    for (let voiceIndex = 0; voiceIndex < voiceCount; voiceIndex++) {
      const osc = this.ctx.createOscillator();
      osc.type = layer.waveform;
      osc.frequency.setValueAtTime(frequency, time);

      const centeredIndex = voiceIndex - (voiceCount - 1) / 2;
      const detune = (layer.detune ?? 0) + centeredIndex * voiceSpread;
      if (detune !== 0) {
        osc.detune.setValueAtTime(detune, time);
      }

      osc.connect(voiceMix);

      if (expression?.modulation?.target === 'pitch') {
        this.applyModulation(
          expression.modulation,
          osc.detune,
          detune,
          time,
          duration + envelope.release,
          1 + intensityBlend * 0.15
        );
      }

      osc.start(time);
      osc.stop(stopTime);
    }

    if (expression?.modulation?.target === 'gain') {
      this.applyModulation(
        expression.modulation,
        noteGain.gain,
        sustainGain,
        Math.max(decayEnd, time + 0.01),
        Math.max(stopTime - decayEnd, 0.05),
        attackPeak * 0.45 * (0.6 + intensityBlend * 0.5)
      );
    }

    if (filter && expression?.modulation?.target === 'filter') {
      const baseFilterHz = filter.frequency.value;
      this.applyModulation(
        expression.modulation,
        filter.frequency,
        baseFilterHz,
        time,
        duration + envelope.release,
        1 + intensityBlend * 0.35
      );
    }

    if (panner && expression?.modulation?.target === 'pan') {
      this.applyModulation(
        expression.modulation,
        panner.pan,
        panner.pan.value,
        time,
        duration + envelope.release,
        1
      );
    }
  }

  private scheduleLegacyTone(
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

    if (!track.expression && !noiseLayer.expression) {
      this.scheduleLegacyNoise(track, noiseLayer, time, stepDuration);
      return;
    }

    const intensityBlend = this.getIntensityBlend();
    const expression = this.resolveNoiseExpression(track.expression, noiseLayer.expression);
    const noiseCharacter = expression?.noiseCharacter;
    const buffer = this.getNoiseBuffer(noiseCharacter?.color);
    if (!buffer) return;

    const source = this.ctx.createBufferSource();
    source.buffer = buffer;

    const highpass = this.ctx.createBiquadFilter();
    highpass.type = 'highpass';

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(noiseLayer.filterHz * (0.9 + intensityBlend * 0.3), time);
    filter.Q.setValueAtTime(0.5, time);

    const gain = this.ctx.createGain();
    const panner = this.createPanner(
      this.clamp(expression?.stereo?.pan ?? 0, -1, 1),
      expression?.stereo,
      time,
      stepDuration * noiseLayer.durationSteps,
      intensityBlend
    );
    const accentScale = this.getAccentScale(stepIndex, expression?.accent);
    const texture = noiseCharacter?.texture ?? 'smooth';
    const burst = noiseCharacter?.burst ?? 0;
    const drift = noiseCharacter?.drift ?? 0;
    const durationMultiplier = texture === 'shimmer' ? 0.55 : texture === 'grainy' ? 0.68 : 0.9;
    const duration = Math.max(stepDuration * noiseLayer.durationSteps * durationMultiplier, 0.04);
    const peakGain = noiseLayer.gain * track.masterGain * accentScale * (0.8 + intensityBlend * 0.45 + burst * 0.8);
    const highpassHz = texture === 'shimmer' ? 1800 : texture === 'grainy' ? 900 : 250;
    const bandpassHz = noiseLayer.filterHz * (1 + drift * Math.sin(stepIndex * 0.65) + intensityBlend * 0.18);

    source.playbackRate.setValueAtTime(1 + burst * 0.06 + intensityBlend * 0.03, time);
    highpass.frequency.setValueAtTime(highpassHz, time);
    filter.frequency.setValueAtTime(Math.max(bandpassHz, highpassHz + 40), time);
    filter.Q.setValueAtTime(texture === 'shimmer' ? 1.8 : texture === 'grainy' ? 1.2 : 0.8, time);

    gain.gain.setValueAtTime(0.001, time);
    gain.gain.linearRampToValueAtTime(peakGain, time + Math.min(0.02, duration * 0.35));
    gain.gain.exponentialRampToValueAtTime(0.001, time + duration);

    source.connect(highpass);
    highpass.connect(filter);
    filter.connect(gain);
    if (panner) {
      gain.connect(panner);
      panner.connect(this.musicGain);
    } else {
      gain.connect(this.musicGain);
    }

    if (expression?.modulation?.target === 'filter') {
      this.applyModulation(
        expression.modulation,
        filter.frequency,
        filter.frequency.value,
        time,
        duration,
        1 + intensityBlend * 0.35
      );
    }

    if (panner && expression?.modulation?.target === 'pan') {
      this.applyModulation(
        expression.modulation,
        panner.pan,
        panner.pan.value,
        time,
        duration,
        1
      );
    }

    source.start(time);
    source.stop(time + duration + 0.02);
  }

  private scheduleLegacyNoise(
    track: ProceduralMusicTrackConfig,
    noiseLayer: ProceduralNoiseLayerConfig,
    time: number,
    stepDuration: number
  ): void {
    if (!this.ctx || !this.musicGain) return;

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
