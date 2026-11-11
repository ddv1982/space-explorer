import type {
  MusicNoiseCharacterConfig,
  ProceduralMusicLayerConfig,
  ProceduralMusicTrackConfig,
  ProceduralNoiseLayerConfig,
} from '@/config/LevelsConfig';
import { createPanner } from './createPanner';
import { applyModulation } from './modulationLfo';
import { deriveNoisePlan } from './noisePlan';
import { deriveToneVoicePlan } from './toneVoicePlan';

interface ToneLayerArgs {
  ctx: BaseAudioContext;
  musicGain: AudioNode;
  track: ProceduralMusicTrackConfig;
  layer: ProceduralMusicLayerConfig;
  stepIndex: number;
  chordToneHz: (semitones: number) => number;
  time: number;
  stepDuration: number;
  intensityBlend: number;
  creativityDrive: number;
  gainScale?: number;
}

interface NoiseLayerArgs {
  ctx: BaseAudioContext;
  musicGain: AudioNode;
  track: ProceduralMusicTrackConfig;
  noiseLayer: ProceduralNoiseLayerConfig;
  stepIndex: number;
  time: number;
  stepDuration: number;
  intensityBlend: number;
  creativityDrive: number;
  gainScale?: number;
  getNoiseBuffer: (color?: MusicNoiseCharacterConfig['color']) => AudioBuffer | null;
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
  const tonePlan = deriveToneVoicePlan({
    track,
    layer,
    frequency,
    stepIndex,
    time,
    duration,
    intensityBlend,
    creativityDrive,
    gainScale,
  });
  const noteGain = ctx.createGain();
  const voiceMix = ctx.createGain();
  const panner = createPanner(
    ctx,
    tonePlan.basePan,
    tonePlan.expression?.stereo,
    time,
    tonePlan.modulationDuration,
    intensityBlend,
    creativityDrive
  );

  noteGain.gain.setValueAtTime(0.001, time);
  if (tonePlan.envelope.curve === 'hard') {
    noteGain.gain.linearRampToValueAtTime(tonePlan.attackPeak, tonePlan.attackEnd);
  } else {
    noteGain.gain.exponentialRampToValueAtTime(Math.max(tonePlan.attackPeak, 0.001), tonePlan.attackEnd);
  }
  noteGain.gain.linearRampToValueAtTime(tonePlan.sustainGain, tonePlan.decayEnd);
  noteGain.gain.setValueAtTime(tonePlan.sustainGain, tonePlan.releaseStart);
  noteGain.gain.exponentialRampToValueAtTime(0.001, tonePlan.releaseStart + tonePlan.envelope.release);

  let targetNode: AudioNode = voiceMix;
  let filter: BiquadFilterNode | null = null;
  if (tonePlan.needsFilter) {
    filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(tonePlan.filterHz, time);
    filter.Q.setValueAtTime(tonePlan.filterQ, time);
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

  for (let voiceIndex = 0; voiceIndex < tonePlan.voiceCount; voiceIndex++) {
    const osc = ctx.createOscillator();
    osc.type = layer.waveform;
    osc.frequency.setValueAtTime(frequency, time);

    const centeredIndex = voiceIndex - (tonePlan.voiceCount - 1) / 2;
    const detune = (layer.detune ?? 0) + centeredIndex * tonePlan.voiceSpread;
    if (detune !== 0) {
      osc.detune.setValueAtTime(detune, time);
    }

    osc.connect(voiceMix);

    if (tonePlan.expression?.modulation?.target === 'pitch') {
      applyModulation(
        ctx,
        tonePlan.expression.modulation,
        osc.detune,
        detune,
        time,
        tonePlan.modulationDuration,
        1 + intensityBlend * 0.15 + creativityDrive * 0.3
      );
    }

    osc.start(time);
    osc.stop(tonePlan.stopTime);
  }

  if (tonePlan.expression?.modulation?.target === 'gain') {
    applyModulation(
      ctx,
      tonePlan.expression.modulation,
      noteGain.gain,
      tonePlan.sustainGain,
      Math.max(tonePlan.decayEnd, time + 0.01),
      Math.max(tonePlan.stopTime - tonePlan.decayEnd, 0.05),
      tonePlan.attackPeak * 0.45 * (0.52 + intensityBlend * 0.46 + creativityDrive * 0.3)
    );
  }

  if (filter && tonePlan.expression?.modulation?.target === 'filter') {
    applyModulation(
      ctx,
      tonePlan.expression.modulation,
      filter.frequency,
      filter.frequency.value,
      time,
      tonePlan.modulationDuration,
      1 + intensityBlend * 0.35 + creativityDrive * 0.32
    );
  }

  if (panner && tonePlan.expression?.modulation?.target === 'pan') {
    applyModulation(
      ctx,
      tonePlan.expression.modulation,
      panner.pan,
      panner.pan.value,
      time,
      tonePlan.modulationDuration,
      1
    );
  }
}

export function scheduleLayer(args: ToneLayerArgs): void {
  const note = args.layer.pattern[args.stepIndex % args.layer.pattern.length];
  if (note === null) {
    return;
  }

  const frequency = args.chordToneHz(note) * Math.pow(2, args.layer.octaveShift ?? 0);
  const duration = Math.max(args.stepDuration * args.layer.durationSteps * 0.96, 0.04);

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
}: NoiseLayerArgs): void {
  const shouldPlay = noiseLayer.pattern[stepIndex % noiseLayer.pattern.length] === 1;
  if (!shouldPlay) {
    return;
  }

  const noisePlan = deriveNoisePlan({
    track,
    noiseLayer,
    stepIndex,
    stepDuration,
    intensityBlend,
    creativityDrive,
    gainScale,
  });
  const expression = noisePlan.expression;
  const buffer = getNoiseBuffer(noisePlan.noiseColor);
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
    noisePlan.pannerBasePan,
    expression?.stereo,
    time,
    noisePlan.modulationDuration,
    intensityBlend,
    creativityDrive
  );

  source.playbackRate.setValueAtTime(noisePlan.playbackRate, time);
  highpass.frequency.setValueAtTime(noisePlan.highpassHz, time);
  filter.frequency.setValueAtTime(Math.max(noisePlan.bandpassHz, noisePlan.highpassHz + 40), time);
  filter.Q.setValueAtTime(noisePlan.filterQ, time);

  // Closed until the burst starts, for the same reason as the drums.
  gain.gain.value = 0;
  gain.gain.setValueAtTime(0.001, time);
  gain.gain.linearRampToValueAtTime(noisePlan.peakGain, time + Math.min(0.02, noisePlan.duration * 0.35));
  gain.gain.exponentialRampToValueAtTime(0.001, time + noisePlan.duration);

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
      noisePlan.duration,
      1 + intensityBlend * 0.35 + creativityDrive * 0.32
    );
  }

  if (panner && expression?.modulation?.target === 'pan') {
    applyModulation(ctx, expression.modulation, panner.pan, panner.pan.value, time, noisePlan.duration, 1);
  }

  source.start(time);
  source.stop(time + noisePlan.duration + 0.02);
}
