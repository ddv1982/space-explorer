import type { MusicDrumKit } from '@/config/LevelsConfig';

type DrumVoice = 'kick' | 'snare' | 'hat';

interface DrumHit {
  ctx: BaseAudioContext;
  output: AudioNode;
  noise: AudioBuffer | null;
  kit: MusicDrumKit;
  time: number;
  /** Peak level, already scaled by the pattern velocity and the track's gains. */
  gain: number;
}

const KITS: Record<
  MusicDrumKit,
  {
    kick: { from: number; to: number; seconds: number };
    snare: { toneHz: number; noiseHz: number; seconds: number };
    hat: { highpassHz: number; seconds: number };
  }
> = {
  soft: {
    kick: { from: 110, to: 46, seconds: 0.2 },
    snare: { toneHz: 240, noiseHz: 2600, seconds: 0.09 },
    hat: { highpassHz: 8000, seconds: 0.03 },
  },
  tight: {
    kick: { from: 150, to: 48, seconds: 0.18 },
    snare: { toneHz: 190, noiseHz: 1900, seconds: 0.13 },
    hat: { highpassHz: 7000, seconds: 0.04 },
  },
  heavy: {
    kick: { from: 170, to: 42, seconds: 0.3 },
    snare: { toneHz: 170, noiseHz: 1500, seconds: 0.2 },
    hat: { highpassHz: 6000, seconds: 0.05 },
  },
};

function decay(ctx: BaseAudioContext, output: AudioNode, time: number, gain: number, seconds: number): GainNode {
  const node = ctx.createGain();
  node.gain.setValueAtTime(Math.max(gain, 0.001), time);
  node.gain.exponentialRampToValueAtTime(0.001, time + seconds);
  node.connect(output);
  return node;
}

function tone(hit: DrumHit, from: number, to: number, seconds: number, gain: number): void {
  const osc = hit.ctx.createOscillator();
  osc.frequency.setValueAtTime(from, hit.time);
  osc.frequency.exponentialRampToValueAtTime(to, hit.time + seconds * 0.5);
  osc.connect(decay(hit.ctx, hit.output, hit.time, gain, seconds));
  osc.start(hit.time);
  osc.stop(hit.time + seconds + 0.02);
}

function noise(hit: DrumHit, type: BiquadFilterType, frequency: number, seconds: number, gain: number): void {
  if (!hit.noise) return;
  const source = hit.ctx.createBufferSource();
  source.buffer = hit.noise;
  const filter = hit.ctx.createBiquadFilter();
  filter.type = type;
  filter.frequency.setValueAtTime(frequency, hit.time);
  source.connect(filter);
  filter.connect(decay(hit.ctx, hit.output, hit.time, gain, seconds));
  // Each hit reads a different stretch of the buffer, so repeats are not sample-identical.
  source.start(hit.time, (hit.time * 7.3) % 1);
  source.stop(hit.time + seconds + 0.02);
}

export function scheduleDrum(voice: DrumVoice, hit: DrumHit): void {
  const kit = KITS[hit.kit];
  if (voice === 'kick') {
    tone(hit, kit.kick.from, kit.kick.to, kit.kick.seconds, hit.gain);
  } else if (voice === 'snare') {
    tone(hit, kit.snare.toneHz, kit.snare.toneHz * 0.8, kit.snare.seconds * 0.6, hit.gain * 0.5);
    noise(hit, 'bandpass', kit.snare.noiseHz, kit.snare.seconds, hit.gain);
  } else {
    noise(hit, 'highpass', kit.hat.highpassHz, kit.hat.seconds, hit.gain);
  }
}
