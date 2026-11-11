import type { MusicPadConfig } from '@/config/LevelsConfig';

interface PadChord {
  ctx: BaseAudioContext;
  output: AudioNode;
  pad: MusicPadConfig;
  chordToneHz: (semitones: number) => number;
  time: number;
  /** Length of the bar the chord covers; it swells in, then overlaps the next bar as it releases. */
  seconds: number;
  gain: number;
  /** 0-1: opens the filter as the music intensifies. */
  brightness: number;
}

/** Root, fifth and tenth. The chord tones snap to the level's scale, so the third is always the right one. */
const VOICING = [0, 7, 16];
/** How far a chord rings into the next bar, as a share of the bar: enough to join them, not to smear. */
const RELEASE_SHARE = 0.25;
const DETUNE_CENTS = [-7, 7];

export function schedulePadChord({ ctx, output, pad, chordToneHz, time, seconds, gain, brightness }: PadChord): void {
  const release = seconds * RELEASE_SHARE;
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

  const octave = Math.pow(2, pad.octaveShift ?? 1);
  for (const semitones of VOICING) {
    for (const cents of DETUNE_CENTS) {
      const osc = ctx.createOscillator();
      osc.type = pad.waveform;
      osc.frequency.setValueAtTime(chordToneHz(semitones) * octave, time);
      osc.detune.setValueAtTime(cents, time);
      osc.connect(filter);
      osc.start(time);
      osc.stop(end + 0.02);
    }
  }
}
