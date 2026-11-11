import type { MusicPadConfig } from '@/config/LevelsConfig';

interface PadChord {
  ctx: BaseAudioContext;
  output: AudioNode;
  pad: MusicPadConfig;
  rootHz: number;
  time: number;
  /** Length of the bar the chord covers; it swells in, then overlaps the next bar as it releases. */
  seconds: number;
  gain: number;
  /** 0-1: opens the filter as the music intensifies. */
  brightness: number;
}

/** Root, fifth and octave: an open voicing that sits under any of the level's melodic patterns. */
const OPEN_VOICING = [0, 7, 12];
const DETUNE_CENTS = [-7, 7];

export function schedulePadChord({ ctx, output, pad, rootHz, time, seconds, gain, brightness }: PadChord): void {
  const release = seconds * 0.45;
  const end = time + seconds + release;

  const envelope = ctx.createGain();
  envelope.gain.setValueAtTime(0.001, time);
  envelope.gain.linearRampToValueAtTime(gain, time + seconds * 0.4);
  envelope.gain.setValueAtTime(gain, time + seconds);
  envelope.gain.exponentialRampToValueAtTime(0.001, end);

  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(pad.filterHz * (0.75 + brightness * 0.6), time);
  filter.connect(envelope);
  envelope.connect(output);

  const baseHz = rootHz * Math.pow(2, pad.octaveShift ?? 1);
  for (const semitones of OPEN_VOICING) {
    for (const cents of DETUNE_CENTS) {
      const osc = ctx.createOscillator();
      osc.type = pad.waveform;
      osc.frequency.setValueAtTime(baseHz * Math.pow(2, semitones / 12), time);
      osc.detune.setValueAtTime(cents, time);
      osc.connect(filter);
      osc.start(time);
      osc.stop(end + 0.02);
    }
  }
}
