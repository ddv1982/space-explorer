import { describe, expect, test } from 'bun:test';
import { deriveToneVoicePlan } from '../src/systems/audio/procedural/toneVoicePlan';

describe('deriveToneVoicePlan', () => {
  test('derives stable defaults for a simple sine layer without expression', () => {
    const plan = deriveToneVoicePlan({
      track: {
        masterGain: 0.5,
        expression: undefined,
      } as never,
      layer: {
        waveform: 'sine',
        gain: 0.2,
      } as never,
      frequency: 100,
      stepIndex: 3,
      time: 10,
      duration: 0.25,
      intensityBlend: 0.5,
      creativityDrive: 0.25,
      gainScale: 1,
    });

    expect(plan.expression).toBeUndefined();
    expect(plan.envelope).toEqual({
      attack: 0.02,
      decay: 0.055,
      sustain: 0.84,
      release: 0.085,
      curve: 'soft',
    });
    expect(plan.accentScale).toBeCloseTo(0.815, 6);
    expect(plan.basePan).toBe(0);
    expect(plan.attackPeak).toBeCloseTo(0.080685, 6);
    expect(plan.sustainGain).toBeCloseTo(0.0677754, 6);
    expect(plan.attackEnd).toBeCloseTo(10.02, 6);
    expect(plan.decayEnd).toBeCloseTo(10.075, 6);
    expect(plan.releaseStart).toBeCloseTo(10.165, 6);
    expect(plan.stopTime).toBeCloseTo(10.29, 6);
    expect(plan.voiceCount).toBe(1);
    expect(plan.voiceSpread).toBe(0);
    expect(plan.modulationDuration).toBeCloseTo(0.335, 6);
    expect(plan.needsFilter).toBe(false);
    expect(plan.filterHz).toBeCloseTo(949.5, 6);
    expect(plan.filterQ).toBeCloseTo(1.4, 6);
  });

  test('derives filtered stereo plan for expressive square layer', () => {
    const plan = deriveToneVoicePlan({
      track: {
        masterGain: 0.75,
        expression: {
          stereo: { pan: 2 },
          modulation: { target: 'filter', depth: 1, rateHz: 2 },
          accent: { amount: 0.5, emphasisSteps: [1], patternBias: 0.2 },
        },
      } as never,
      layer: {
        waveform: 'square',
        gain: 0.3,
        filterHz: 1000,
        expression: {
          envelope: { attack: 0.05, sustain: 0.5, release: 0.1, curve: 'hard' },
        },
      } as never,
      frequency: 200,
      stepIndex: 1,
      time: 5,
      duration: 0.4,
      intensityBlend: 0.5,
      creativityDrive: 0.5,
      gainScale: 0.8,
    });

    expect(plan.basePan).toBe(1);
    expect(plan.envelope).toEqual({
      attack: 0.05,
      decay: 0.08800000000000001,
      sustain: 0.5,
      release: 0.1,
      curve: 'hard',
    });
    expect(plan.accentScale).toBeCloseTo(1.365, 6);
    expect(plan.attackPeak).toBeCloseTo(0.243243, 6);
    expect(plan.sustainGain).toBeCloseTo(0.1216215, 6);
    expect(plan.attackEnd).toBeCloseTo(5.05, 6);
    expect(plan.decayEnd).toBeCloseTo(5.138, 6);
    expect(plan.releaseStart).toBeCloseTo(5.3, 6);
    expect(plan.stopTime).toBeCloseTo(5.44, 6);
    expect(plan.voiceCount).toBe(2);
    expect(plan.voiceSpread).toBeCloseTo(7.5, 6);
    expect(plan.modulationDuration).toBeCloseTo(0.5, 6);
    expect(plan.needsFilter).toBe(true);
    expect(plan.filterHz).toBeCloseTo(1055, 6);
    expect(plan.filterQ).toBeCloseTo(1.4, 6);
  });
});
