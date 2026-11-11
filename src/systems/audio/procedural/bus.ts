import type { MusicSpaceConfig } from '@/config/LevelsConfig';

/**
 * The music's signal path. Voices connect to `dry` (bass, kick: kept tight) or `space` (everything
 * else: also feeds the reverb and the echo). Both run through `fade` (track changes) and `output`
 * (volume and intensity) into the shared music bus.
 */
export interface MusicBus {
  dry: GainNode;
  space: GainNode;
  fade: GainNode;
  output: GainNode;
  reverbSend: GainNode;
  delaySend: GainNode;
  delay: DelayNode;
  nodes: AudioNode[];
}

const REVERB_SECONDS = 2;
const DEFAULT_SPACE: MusicSpaceConfig = { reverb: 0.3, delay: 0.15 };

const impulseResponses = new WeakMap<BaseAudioContext, AudioBuffer>();

/** A stereo noise tail that darkens as it decays: a believable hall without loading a recording. */
function createImpulseResponse(ctx: BaseAudioContext): AudioBuffer {
  const cached = impulseResponses.get(ctx);
  if (cached) return cached;

  const length = Math.floor(ctx.sampleRate * REVERB_SECONDS);
  const impulse = ctx.createBuffer(2, length, ctx.sampleRate);
  for (let channel = 0; channel < 2; channel++) {
    const data = impulse.getChannelData(channel);
    let smoothed = 0;
    for (let i = 0; i < length; i++) {
      const progress = i / length;
      // The smoothing grows with time, so highs die first as they do in a real room.
      const smoothing = 0.15 + progress * 0.7;
      smoothed += (1 - smoothing) * (Math.random() * 2 - 1 - smoothed);
      data[i] = smoothed * Math.pow(1 - progress, 2.4);
    }
  }
  impulseResponses.set(ctx, impulse);
  return impulse;
}

export function createMusicBus(ctx: BaseAudioContext, destination: AudioNode): MusicBus {
  const dry = ctx.createGain();
  const space = ctx.createGain();
  const fade = ctx.createGain();
  const output = ctx.createGain();
  output.gain.value = 0.001;

  const reverbSend = ctx.createGain();
  const reverb = ctx.createConvolver();
  reverb.buffer = createImpulseResponse(ctx);

  const delaySend = ctx.createGain();
  const delay = ctx.createDelay(1.5);
  const feedback = ctx.createGain();
  feedback.gain.value = 0.36;
  const delayTone = ctx.createBiquadFilter();
  delayTone.type = 'lowpass';
  delayTone.frequency.value = 2400;

  dry.connect(fade);
  space.connect(fade);
  space.connect(reverbSend);
  reverbSend.connect(reverb);
  reverb.connect(fade);
  space.connect(delaySend);
  delaySend.connect(delay);
  delay.connect(delayTone);
  delayTone.connect(feedback);
  feedback.connect(delay);
  delayTone.connect(fade);
  fade.connect(output);
  output.connect(destination);

  const bus: MusicBus = {
    dry,
    space,
    fade,
    output,
    reverbSend,
    delaySend,
    delay,
    nodes: [dry, space, fade, output, reverbSend, reverb, delaySend, delay, feedback, delayTone],
  };
  applyMusicSpace(ctx, bus, undefined, 0.25, ctx.currentTime);
  return bus;
}

/** Sets a track's room: reverb and echo amounts, with the echo timed to three steps. */
export function applyMusicSpace(
  ctx: BaseAudioContext,
  bus: MusicBus,
  space: MusicSpaceConfig | undefined,
  stepSeconds: number,
  time: number
): void {
  const { reverb, delay } = space ?? DEFAULT_SPACE;
  const at = Math.max(time, ctx.currentTime);
  bus.reverbSend.gain.setTargetAtTime(reverb, at, 0.05);
  bus.delaySend.gain.setTargetAtTime(delay, at, 0.05);
  bus.delay.delayTime.setTargetAtTime(Math.min(1.4, stepSeconds * 3), at, 0.05);
}

export function disconnectMusicBus(bus: MusicBus | null): void {
  for (const node of bus?.nodes ?? []) {
    try {
      node.disconnect();
    } catch {
      // Best effort cleanup
    }
  }
}
