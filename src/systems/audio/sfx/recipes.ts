import type { SfxLayer, SfxWave } from './render';

export interface SfxDefinition {
  layers: readonly SfxLayer[];
  /** Playback level on the effects bus. */
  gain: number;
  /** Pre-rendered takes, each with its own noise and a pitch offset within `jitter` semitones. */
  variants: number;
  jitter: number;
  /** Plays of this sound that may overlap; further requests are dropped. */
  maxVoices: number;
  /** Shortest gap between plays, for sounds that can fire many times in one frame. */
  minIntervalMs?: number;
  /** Briefly lowers the music by this fraction so the sound reads through it. */
  duck?: { depth: number; seconds: number };
}

/** A single pitched note; chimes and fanfares are built from these. */
function note(
  freq: number,
  at: number,
  decay: number,
  gain: number,
  wave: SfxWave = 'sine',
  extra: Partial<SfxLayer> = {}
): SfxLayer {
  return { source: wave, freq: [freq, freq], attack: 0.004, decay, gain, at, ...extra };
}

/** A bell-like note: sine with a fading inharmonic modulator. */
function bell(freq: number, at: number, decay: number, gain: number, ratio = 3.5, index = 1.6): SfxLayer {
  return note(freq, at, decay, gain, 'sine', { fm: { ratio, index } });
}

function burst(at: number, decay: number, gain: number, from: number, to: number): SfxLayer {
  return {
    source: 'noise',
    filter: { type: 'lowpass', freq: [from, to] },
    attack: 0.002,
    decay,
    gain,
    at,
    sweepRate: 2,
  };
}

function thump(at: number, decay: number, gain: number, from: number, to: number): SfxLayer {
  return { source: 'sine', freq: [from, to], sweepRate: 2.5, attack: 0.002, decay, gain, at, drive: 1.5 };
}

/**
 * Explosions are soft puffs of low-passed noise. Noise only, because the music's kick is a sine pitch
 * drop and a blast with a pitched thump reads as an off-beat drum hit; swelling in over several
 * milliseconds and closing the filter as it fades keeps it round, with no crack or sizzle on top.
 */
function puff(at: number, decay: number, gain: number, from: number, to: number): SfxLayer {
  return {
    source: 'noise',
    filter: { type: 'lowpass', freq: [from, to] },
    attack: 0.012,
    decay,
    gain,
    at,
    sweepRate: 1.6,
    drive: 1,
  };
}

const SOFT_LOWPASS = { type: 'lowpass', freq: [2400, 900] } as const;

export const SFX = {
  playerShot: {
    layers: [
      {
        source: 'saw',
        freq: [1500, 430],
        sweepRate: 2,
        filter: { type: 'lowpass', freq: [5200, 1400] },
        attack: 0.002,
        decay: 0.11,
        gain: 0.5,
      },
      { source: 'sine', freq: [260, 120], attack: 0.002, decay: 0.07, gain: 0.45 },
      { source: 'noise', filter: { type: 'highpass', freq: [3200, 3200] }, attack: 0.001, decay: 0.025, gain: 0.3 },
    ],
    gain: 0.1,
    variants: 4,
    jitter: 0.5,
    maxVoices: 4,
    minIntervalMs: 45,
  },
  helperShot: {
    layers: [
      { source: 'triangle', freq: [1250, 720], sweepRate: 2, attack: 0.002, decay: 0.07, gain: 0.6 },
      { source: 'noise', filter: { type: 'highpass', freq: [4000, 4000] }, attack: 0.001, decay: 0.02, gain: 0.2 },
    ],
    gain: 0.07,
    variants: 3,
    jitter: 0.8,
    maxVoices: 3,
    minIntervalMs: 80,
  },
  picketShot: {
    layers: [
      {
        source: 'square',
        freq: [760, 380],
        sweepRate: 2,
        filter: { type: 'lowpass', freq: [2600, 1100] },
        attack: 0.002,
        decay: 0.08,
        gain: 0.5,
      },
      { source: 'sine', freq: [190, 110], attack: 0.002, decay: 0.05, gain: 0.4 },
    ],
    gain: 0.09,
    variants: 3,
    jitter: 0.6,
    maxVoices: 3,
    minIntervalMs: 60,
  },
  enemyShot: {
    layers: [
      {
        source: 'square',
        freq: [520, 170],
        sweepRate: 1.6,
        filter: { type: 'lowpass', freq: [1900, 700] },
        attack: 0.003,
        decay: 0.13,
        gain: 0.55,
      },
      {
        source: 'noise',
        filter: { type: 'bandpass', freq: [1400, 600], q: 1.2 },
        attack: 0.002,
        decay: 0.06,
        gain: 0.3,
      },
    ],
    gain: 0.08,
    variants: 4,
    jitter: 1.5,
    maxVoices: 3,
    minIntervalMs: 90,
  },
  explosionSmall: {
    layers: [puff(0, 0.2, 0.9, 1500, 320), puff(0.01, 0.32, 0.6, 560, 130)],
    gain: 0.14,
    variants: 5,
    jitter: 3,
    maxVoices: 5,
    minIntervalMs: 30,
  },
  explosionLarge: {
    layers: [puff(0, 0.5, 0.9, 1300, 240), puff(0, 0.85, 0.8, 420, 70), puff(0.13, 0.4, 0.4, 1000, 280)],
    gain: 0.36,
    variants: 2,
    jitter: 1,
    maxVoices: 2,
    duck: { depth: 0.3, seconds: 0.6 },
  },
  explosionBoss: {
    layers: [
      puff(0, 1.4, 0.8, 1200, 180),
      puff(0, 1.9, 0.9, 380, 55),
      puff(0.18, 0.6, 0.5, 1400, 300),
      puff(0.42, 0.7, 0.5, 1100, 240),
      puff(0.74, 1, 0.45, 900, 160),
    ],
    gain: 0.55,
    variants: 1,
    jitter: 0,
    maxVoices: 1,
    duck: { depth: 0.5, seconds: 1.4 },
  },
  hitShield: {
    layers: [
      bell(1320, 0, 0.28, 0.5, 1.5, 1.2),
      note(1980, 0, 0.18, 0.25),
      {
        source: 'noise',
        filter: { type: 'bandpass', freq: [3400, 1800], q: 2 },
        attack: 0.002,
        decay: 0.09,
        gain: 0.3,
      },
    ],
    gain: 0.3,
    variants: 3,
    jitter: 1,
    maxVoices: 2,
    minIntervalMs: 60,
  },
  hitHull: {
    layers: [
      {
        source: 'saw',
        freq: [170, 58],
        sweepRate: 2,
        filter: SOFT_LOWPASS,
        attack: 0.002,
        decay: 0.24,
        gain: 0.7,
        drive: 3,
      },
      burst(0, 0.16, 0.6, 2200, 300),
      thump(0, 0.18, 0.6, 120, 48),
    ],
    gain: 0.5,
    variants: 3,
    jitter: 1.2,
    maxVoices: 2,
    minIntervalMs: 60,
    duck: { depth: 0.3, seconds: 0.35 },
  },
  powerUpPickup: {
    layers: [
      bell(660, 0, 0.2, 0.5, 2, 0.8),
      bell(880, 0.055, 0.2, 0.5, 2, 0.8),
      bell(1320, 0.11, 0.34, 0.55, 2, 0.8),
      note(2640, 0.11, 0.2, 0.12),
    ],
    gain: 0.34,
    variants: 1,
    jitter: 0,
    maxVoices: 2,
  },
  surgePulse: {
    layers: [
      { source: 'noise', filter: { type: 'bandpass', freq: [500, 4200], q: 1.5 }, attack: 0.05, decay: 0.4, gain: 0.5 },
      { source: 'sine', freq: [180, 720], attack: 0.03, decay: 0.42, gain: 0.5, fm: { ratio: 0.5, index: 2 } },
      thump(0, 0.3, 0.6, 130, 46),
    ],
    gain: 0.42,
    variants: 1,
    jitter: 0,
    maxVoices: 1,
    duck: { depth: 0.3, seconds: 0.4 },
  },
  graze: {
    layers: [bell(1760, 0, 0.07, 0.6, 2, 0.6)],
    gain: 0.07,
    variants: 3,
    jitter: 2,
    maxVoices: 2,
    minIntervalMs: 70,
  },
  spawnWarning: {
    layers: [note(1480, 0, 0.06, 0.6, 'triangle'), note(1480, 0.09, 0.08, 0.6, 'triangle')],
    gain: 0.09,
    variants: 1,
    jitter: 0,
    maxVoices: 1,
    minIntervalMs: 220,
  },
  wormhole: {
    layers: [
      { source: 'sine', freq: [190, 880], attack: 0.04, decay: 0.5, gain: 0.55, fm: { ratio: 0.5, index: 3 } },
      { source: 'noise', filter: { type: 'bandpass', freq: [600, 2600], q: 3 }, attack: 0.06, decay: 0.45, gain: 0.35 },
    ],
    gain: 0.22,
    variants: 2,
    jitter: 2,
    maxVoices: 2,
    minIntervalMs: 200,
  },
  eliteWave: {
    layers: [
      {
        source: 'saw',
        freq: [146.8, 146.8],
        filter: { type: 'lowpass', freq: [1500, 500] },
        attack: 0.03,
        decay: 0.7,
        gain: 0.5,
      },
      {
        source: 'saw',
        freq: [220, 220],
        filter: { type: 'lowpass', freq: [1500, 500] },
        attack: 0.03,
        decay: 0.7,
        gain: 0.4,
      },
      {
        source: 'saw',
        freq: [174.6, 174.6],
        filter: { type: 'lowpass', freq: [1300, 450] },
        attack: 0.03,
        decay: 0.8,
        gain: 0.4,
        at: 0.24,
      },
      thump(0, 0.3, 0.5, 90, 40),
    ],
    gain: 0.4,
    variants: 1,
    jitter: 0,
    maxVoices: 1,
    duck: { depth: 0.35, seconds: 0.7 },
  },
  bossWarning: {
    layers: [
      {
        source: 'saw',
        freq: [196, 185],
        filter: { type: 'lowpass', freq: [1100, 700] },
        attack: 0.02,
        hold: 0.2,
        decay: 0.2,
        gain: 0.6,
      },
      {
        source: 'saw',
        freq: [196, 185],
        filter: { type: 'lowpass', freq: [1100, 700] },
        attack: 0.02,
        hold: 0.2,
        decay: 0.2,
        gain: 0.6,
        at: 0.5,
      },
      {
        source: 'saw',
        freq: [196, 175],
        filter: { type: 'lowpass', freq: [1100, 500] },
        attack: 0.02,
        hold: 0.25,
        decay: 0.5,
        gain: 0.6,
        at: 1,
      },
      { source: 'sine', freq: [49, 46], attack: 0.02, hold: 1.2, decay: 0.5, gain: 0.5 },
    ],
    gain: 0.42,
    variants: 1,
    jitter: 0,
    maxVoices: 1,
    duck: { depth: 0.4, seconds: 1.5 },
  },
  bossPhase: {
    layers: [
      { source: 'noise', filter: { type: 'bandpass', freq: [350, 3200], q: 2 }, attack: 0.3, decay: 0.08, gain: 0.5 },
      burst(0.32, 0.6, 0.7, 2600, 160),
      thump(0.32, 0.5, 0.9, 100, 34),
      bell(220, 0.32, 0.7, 0.35, 2.76, 2.2),
    ],
    gain: 0.55,
    variants: 1,
    jitter: 0,
    maxVoices: 1,
    duck: { depth: 0.5, seconds: 0.9 },
  },
  helperWingArrive: {
    layers: [
      note(392, 0, 0.3, 0.45, 'triangle'),
      note(523.3, 0.07, 0.3, 0.45, 'triangle'),
      note(659.3, 0.14, 0.3, 0.45, 'triangle'),
      note(784, 0.21, 0.6, 0.5, 'triangle'),
      bell(1568, 0.21, 0.5, 0.2, 2, 0.6),
      {
        source: 'noise',
        filter: { type: 'highpass', freq: [5000, 7000] },
        attack: 0.1,
        decay: 0.4,
        gain: 0.08,
        at: 0.1,
      },
    ],
    gain: 0.4,
    variants: 1,
    jitter: 0,
    maxVoices: 1,
    duck: { depth: 0.3, seconds: 0.6 },
  },
  helperWingDepleted: {
    layers: [
      note(659.3, 0, 0.26, 0.5, 'triangle'),
      note(493.9, 0.12, 0.26, 0.5, 'triangle'),
      note(370, 0.24, 0.5, 0.55, 'triangle'),
    ],
    gain: 0.32,
    variants: 1,
    jitter: 0,
    maxVoices: 1,
  },
  picketOnline: {
    layers: [
      note(587.3, 0, 0.12, 0.5, 'square', { filter: SOFT_LOWPASS }),
      note(880, 0.09, 0.2, 0.5, 'square', { filter: SOFT_LOWPASS }),
    ],
    gain: 0.26,
    variants: 1,
    jitter: 0,
    maxVoices: 1,
  },
  warpJump: {
    layers: [
      // The drive spools up...
      { source: 'sine', freq: [90, 760], attack: 0.55, decay: 0.3, gain: 0.5, fm: { ratio: 0.5, index: 2.5 } },
      { source: 'noise', filter: { type: 'bandpass', freq: [260, 5200], q: 2 }, attack: 0.7, decay: 0.12, gain: 0.4 },
      // ...and the ship punches through.
      puff(0.8, 0.7, 0.7, 2600, 320),
      puff(0.8, 1.2, 0.9, 400, 60),
      {
        source: 'noise',
        filter: { type: 'highpass', freq: [5200, 1400] },
        attack: 0.02,
        decay: 1.1,
        gain: 0.3,
        at: 0.8,
      },
    ],
    gain: 0.5,
    variants: 1,
    jitter: 0,
    maxVoices: 1,
    duck: { depth: 0.5, seconds: 1.8 },
  },
  levelComplete: {
    layers: [
      note(523.3, 0, 0.3, 0.4, 'triangle'),
      note(659.3, 0.11, 0.3, 0.4, 'triangle'),
      note(784, 0.22, 0.3, 0.4, 'triangle'),
      note(1046.5, 0.33, 0.9, 0.45, 'triangle'),
      note(784, 0.33, 0.9, 0.25),
      note(523.3, 0.33, 0.9, 0.25),
      bell(2093, 0.33, 0.7, 0.14, 2, 0.6),
    ],
    gain: 0.42,
    variants: 1,
    jitter: 0,
    maxVoices: 1,
    duck: { depth: 0.45, seconds: 1 },
  },
  victory: {
    layers: [
      note(392, 0, 0.3, 0.4, 'triangle'),
      note(523.3, 0.14, 0.3, 0.4, 'triangle'),
      note(659.3, 0.28, 0.3, 0.4, 'triangle'),
      note(784, 0.42, 0.34, 0.4, 'triangle'),
      note(1046.5, 0.6, 1.6, 0.42, 'triangle'),
      note(783.99, 0.6, 1.6, 0.26),
      note(659.3, 0.6, 1.6, 0.26),
      note(261.6, 0.6, 1.6, 0.3),
      bell(2093, 0.6, 1.2, 0.14, 2, 0.6),
      bell(3136, 0.78, 1, 0.08, 2, 0.6),
    ],
    gain: 0.45,
    variants: 1,
    jitter: 0,
    maxVoices: 1,
  },
  gameOver: {
    layers: [
      note(440, 0, 0.5, 0.45, 'saw', { filter: { type: 'lowpass', freq: [1200, 500] } }),
      note(349.2, 0.24, 0.5, 0.45, 'saw', { filter: { type: 'lowpass', freq: [1100, 450] } }),
      note(293.7, 0.48, 0.5, 0.45, 'saw', { filter: { type: 'lowpass', freq: [1000, 400] } }),
      note(220, 0.72, 1.3, 0.5, 'saw', { filter: { type: 'lowpass', freq: [900, 260] } }),
      note(110, 0.72, 1.3, 0.4),
    ],
    gain: 0.4,
    variants: 1,
    jitter: 0,
    maxVoices: 1,
  },
  /**
   * Changing the main gun: a dry unlatch tick, a short rising whir and a higher lock-in tick. Mechanical
   * rather than chimed so it never reads as a menu sound, and quiet because it plays mid-fight.
   */
  gunSwap: {
    layers: [
      {
        source: 'noise',
        filter: { type: 'bandpass', freq: [2600, 1800], q: 3 },
        attack: 0.001,
        decay: 0.03,
        gain: 0.5,
      },
      { source: 'square', freq: [220, 660], filter: SOFT_LOWPASS, attack: 0.02, decay: 0.12, gain: 0.35, at: 0.03 },
      {
        source: 'noise',
        filter: { type: 'bandpass', freq: [4200, 3000], q: 3 },
        attack: 0.001,
        decay: 0.03,
        gain: 0.5,
        at: 0.15,
      },
      note(1318.5, 0.15, 0.08, 0.25, 'triangle'),
    ],
    gain: 0.2,
    variants: 1,
    jitter: 0,
    maxVoices: 1,
  },
  uiClick: {
    layers: [
      note(920, 0, 0.045, 0.6, 'sine', { freq: [920, 700] }),
      { source: 'noise', filter: { type: 'highpass', freq: [3000, 3000] }, attack: 0.001, decay: 0.012, gain: 0.25 },
    ],
    gain: 0.22,
    variants: 1,
    jitter: 0,
    maxVoices: 2,
  },
  uiConfirm: {
    layers: [bell(523.3, 0, 0.16, 0.5, 2, 0.7), bell(784, 0.07, 0.3, 0.5, 2, 0.7), note(1568, 0.07, 0.2, 0.12)],
    gain: 0.3,
    variants: 1,
    jitter: 0,
    maxVoices: 2,
  },
} as const satisfies Record<string, SfxDefinition>;

export type SfxId = keyof typeof SFX;
