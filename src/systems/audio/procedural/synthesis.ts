import type {
  MusicModulationConfig,
  MusicNoiseCharacterConfig,
  ProceduralMusicLayerConfig,
  ProceduralMusicLayerExpressionConfig,
  ProceduralMusicTrackConfig,
  ProceduralNoiseLayerConfig,
} from '../../../config/LevelsConfig';
import {
  clamp,
  getAccentScale,
  getEnvelopeShape,
  resolveLayerExpression,
  resolveNoiseExpression,
} from './expression';

interface ToneLayerArgs {
  ctx: AudioContext;
  musicGain: GainNode;
  track: ProceduralMusicTrackConfig;
  layer: ProceduralMusicLayerConfig;
  stepIndex: number;
  harmonicRootHz?: number;
  time: number;
  stepDuration: number;
  intensityBlend: number;
  creativityDrive: number;
  gainScale?: number;
}

interface NoiseLayerArgs {
  ctx: AudioContext;
  musicGain: GainNode;
  track: ProceduralMusicTrackConfig;
  noiseLayer: ProceduralNoiseLayerConfig;
  stepIndex: number;
  time: number;
  stepDuration: number;
  intensityBlend: number;
  creativityDrive: number;
  gainScale?: number;
  getNoiseBuffer: (color?: MusicNoiseCharacterConfig['color']) => AudioBuffer | null;
  getExplosionBuffer: () => AudioBuffer | null;
}

function createPanner(
  ctx: AudioContext,
  basePan: number,
  stereo: ProceduralMusicLayerExpressionConfig['stereo'],
  time: number,
  duration: number,
  intensityBlend: number,
  creativityDrive: number
): StereoPannerNode | null {
  if (!stereo || (Math.abs(basePan) < 0.001 && (stereo.width ?? 0) <= 0)) {
    return null;
  }

  const panner = ctx.createStereoPanner();
  const width = clamp((stereo.width ?? 0) * (0.62 + creativityDrive * 0.56), 0, 1);
  const phaseOffset = stereo.phaseOffset ?? 0;
  const startingPan = clamp(basePan + Math.sin(phaseOffset * Math.PI * 2) * width * 0.35, -1, 1);
  panner.pan.setValueAtTime(startingPan, time);

  if (width > 0 && (stereo.rateHz ?? 0) > 0) {
    const panLfo = ctx.createOscillator();
    const panDepth = ctx.createGain();
    panLfo.type = 'sine';
    panLfo.frequency.setValueAtTime((stereo.rateHz ?? 0) * (0.72 + intensityBlend * 0.42 + creativityDrive * 0.3), time);
    panDepth.gain.setValueAtTime(width * (0.3 + intensityBlend * 0.45), time);
    panLfo.connect(panDepth);
    panDepth.connect(panner.pan);
    panLfo.start(time);
    panLfo.stop(time + duration + 0.08);
  }

  return panner;
}

function applyModulation(
  ctx: AudioContext,
  modulation: MusicModulationConfig | undefined,
  target: AudioParam,
  baseValue: number,
  time: number,
  duration: number,
  depthScale = 1
): void {
  if (!modulation?.target || !modulation.depth || !modulation.rateHz) {
    return;
  }

  const waveform = modulation.waveform === 'random' ? 'triangle' : modulation.waveform ?? 'sine';
  const lfo = ctx.createOscillator();
  const lfoGain = ctx.createGain();

  lfo.type = waveform;
  lfo.frequency.setValueAtTime(modulation.rateHz, time);
  lfoGain.gain.setValueAtTime(modulation.depth * depthScale, time);

  target.setValueAtTime(baseValue, time);
  lfo.connect(lfoGain);
  lfoGain.connect(target);

  lfo.start(time);
  lfo.stop(time + duration + 0.08);
}

function scheduleLegacyTone(
  ctx: AudioContext,
  musicGain: GainNode,
  layer: ProceduralMusicLayerConfig,
  frequency: number,
  time: number,
  duration: number,
  trackMasterGain: number,
  gainScale = 1
): void {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  const attackTime = Math.min(0.02, duration * 0.35);
  const releaseTime = Math.max(duration * 0.85, attackTime + 0.01);
  const peakGain = layer.gain * trackMasterGain * gainScale;

  osc.type = layer.waveform;
  osc.frequency.setValueAtTime(frequency, time);

  if (layer.detune) {
    osc.detune.setValueAtTime(layer.detune, time);
  }

  gain.gain.setValueAtTime(0.001, time);
  gain.gain.linearRampToValueAtTime(peakGain, time + attackTime);
  gain.gain.exponentialRampToValueAtTime(0.001, time + releaseTime);

  if (layer.filterHz) {
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(layer.filterHz, time);
    osc.connect(filter);
    filter.connect(gain);
  } else {
    osc.connect(gain);
  }

  gain.connect(musicGain);
  osc.start(time);
  osc.stop(time + duration + 0.02);
}

function scheduleTone({
  ctx,
  musicGain,
  track,
  layer,
  frequency,
  stepIndex,
  time,
  duration,
  intensityBlend,
  creativityDrive,
  gainScale = 1,
}: ToneLayerArgs & { frequency: number; duration: number }): void {
  if (!track.expression && !layer.expression) {
    scheduleLegacyTone(ctx, musicGain, layer, frequency, time, duration, track.masterGain, gainScale);
    return;
  }

  const expression = resolveLayerExpression(track.expression, layer.expression);
  const envelope = getEnvelopeShape(duration, layer.waveform, expression?.envelope);
  const accentScale = getAccentScale(stepIndex, expression?.accent) * (0.72 + creativityDrive * 0.38);
  const noteGain = ctx.createGain();
  const voiceMix = ctx.createGain();
  const stereo = expression?.stereo;
  const basePan = clamp(stereo?.pan ?? 0, -1, 1);
  const panner = createPanner(ctx, basePan, stereo, time, duration + envelope.release, intensityBlend, creativityDrive);
  const attackPeak = layer.gain * track.masterGain * gainScale * accentScale * (0.9 + intensityBlend * 0.18);
  const sustainGain = Math.max(attackPeak * envelope.sustain, 0.001);
  const attackEnd = time + envelope.attack;
  const decayEnd = attackEnd + envelope.decay;
  const releaseStart = Math.max(decayEnd, time + Math.max(duration - envelope.release, duration * 0.45));
  const stopTime = releaseStart + envelope.release + 0.04;
  const voiceCount = frequency > 180 && intensityBlend + creativityDrive * 0.26 > 0.45 ? 2 : 1;
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
    filter = ctx.createBiquadFilter();
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
    panner.connect(musicGain);
  } else {
    noteGain.connect(musicGain);
  }

  for (let voiceIndex = 0; voiceIndex < voiceCount; voiceIndex++) {
    const osc = ctx.createOscillator();
    osc.type = layer.waveform;
    osc.frequency.setValueAtTime(frequency, time);

    const centeredIndex = voiceIndex - (voiceCount - 1) / 2;
    const detune = (layer.detune ?? 0) + centeredIndex * voiceSpread;
    if (detune !== 0) {
      osc.detune.setValueAtTime(detune, time);
    }

    osc.connect(voiceMix);

    if (expression?.modulation?.target === 'pitch') {
      applyModulation(
        ctx,
        expression.modulation,
        osc.detune,
        detune,
        time,
        duration + envelope.release,
        1 + intensityBlend * 0.15 + creativityDrive * 0.3
      );
    }

    osc.start(time);
    osc.stop(stopTime);
  }

  if (expression?.modulation?.target === 'gain') {
    applyModulation(
      ctx,
      expression.modulation,
      noteGain.gain,
      sustainGain,
      Math.max(decayEnd, time + 0.01),
      Math.max(stopTime - decayEnd, 0.05),
      attackPeak * 0.45 * (0.52 + intensityBlend * 0.46 + creativityDrive * 0.3)
    );
  }

  if (filter && expression?.modulation?.target === 'filter') {
    applyModulation(
      ctx,
      expression.modulation,
      filter.frequency,
      filter.frequency.value,
      time,
      duration + envelope.release,
      1 + intensityBlend * 0.35 + creativityDrive * 0.32
    );
  }

  if (panner && expression?.modulation?.target === 'pan') {
    applyModulation(ctx, expression.modulation, panner.pan, panner.pan.value, time, duration + envelope.release, 1);
  }
}

function scheduleLegacyNoise(
  ctx: AudioContext,
  musicGain: GainNode,
  getExplosionBuffer: () => AudioBuffer | null,
  track: ProceduralMusicTrackConfig,
  noiseLayer: ProceduralNoiseLayerConfig,
  time: number,
  stepDuration: number,
  gainScale = 1
): void {
  const buffer = getExplosionBuffer();
  if (!buffer) {
    return;
  }

  const source = ctx.createBufferSource();
  source.buffer = buffer;

  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.setValueAtTime(noiseLayer.filterHz, time);

  const gain = ctx.createGain();
  const duration = Math.max(stepDuration * noiseLayer.durationSteps * 0.75, 0.04);
  const peakGain = noiseLayer.gain * track.masterGain * gainScale;

  gain.gain.setValueAtTime(0.001, time);
  gain.gain.linearRampToValueAtTime(peakGain, time + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.001, time + duration);

  source.connect(filter);
  filter.connect(gain);
  gain.connect(musicGain);

  source.start(time);
  source.stop(time + duration + 0.02);
}

export function scheduleLayer(args: ToneLayerArgs): void {
  const note = args.layer.pattern[args.stepIndex % args.layer.pattern.length];
  if (note === null) {
    return;
  }

  const octaveShift = args.layer.octaveShift ?? 0;
  const semitoneOffset = note + octaveShift * 12;
  const baseRootHz = args.harmonicRootHz ?? args.track.rootHz;
  const frequency = baseRootHz * Math.pow(2, semitoneOffset / 12);
  const duration = Math.max(args.stepDuration * args.layer.durationSteps * 0.92, 0.04);

  scheduleTone({ ...args, frequency, duration });
}

export function scheduleNoise({
  ctx,
  musicGain,
  track,
  noiseLayer,
  stepIndex,
  time,
  stepDuration,
  intensityBlend,
  creativityDrive,
  gainScale = 1,
  getNoiseBuffer,
  getExplosionBuffer,
}: NoiseLayerArgs): void {
  const shouldPlay = noiseLayer.pattern[stepIndex % noiseLayer.pattern.length] === 1;
  if (!shouldPlay) {
    return;
  }

  if (!track.expression && !noiseLayer.expression) {
    scheduleLegacyNoise(ctx, musicGain, getExplosionBuffer, track, noiseLayer, time, stepDuration, gainScale);
    return;
  }

  const expression = resolveNoiseExpression(track.expression, noiseLayer.expression);
  const noiseCharacter = expression?.noiseCharacter;
  const buffer = getNoiseBuffer(noiseCharacter?.color);
  if (!buffer) {
    return;
  }

  const source = ctx.createBufferSource();
  source.buffer = buffer;

  const highpass = ctx.createBiquadFilter();
  highpass.type = 'highpass';

  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.setValueAtTime(noiseLayer.filterHz * (0.9 + intensityBlend * 0.3), time);
  filter.Q.setValueAtTime(0.5, time);

  const gain = ctx.createGain();
  const panner = createPanner(
    ctx,
    clamp(expression?.stereo?.pan ?? 0, -1, 1),
    expression?.stereo,
    time,
    stepDuration * noiseLayer.durationSteps,
    intensityBlend,
    creativityDrive
  );
  const accentScale = getAccentScale(stepIndex, expression?.accent) * (0.78 + creativityDrive * 0.34);
  const texture = noiseCharacter?.texture ?? 'smooth';
  const burst = (noiseCharacter?.burst ?? 0) + creativityDrive * 0.12;
  const drift = noiseCharacter?.drift ?? 0;
  const durationMultiplier = texture === 'shimmer' ? 0.55 : texture === 'grainy' ? 0.68 : 0.9;
  const duration = Math.max(stepDuration * noiseLayer.durationSteps * durationMultiplier, 0.04);
  const peakGain =
    noiseLayer.gain * track.masterGain * gainScale * accentScale * (0.8 + intensityBlend * 0.45 + burst * 0.8);
  const highpassHz = texture === 'shimmer' ? 1800 : texture === 'grainy' ? 900 : 250;
  const bandpassHz = noiseLayer.filterHz * (1 + drift * Math.sin(stepIndex * 0.65) + intensityBlend * 0.18 + creativityDrive * 0.12);

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
    panner.connect(musicGain);
  } else {
    gain.connect(musicGain);
  }

  if (expression?.modulation?.target === 'filter') {
    applyModulation(
      ctx,
      expression.modulation,
      filter.frequency,
      filter.frequency.value,
      time,
      duration,
      1 + intensityBlend * 0.35 + creativityDrive * 0.32
    );
  }

  if (panner && expression?.modulation?.target === 'pan') {
    applyModulation(ctx, expression.modulation, panner.pan, panner.pan.value, time, duration, 1);
  }

  source.start(time);
  source.stop(time + duration + 0.02);
}
