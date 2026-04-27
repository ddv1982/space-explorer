import { describe, expect, test } from 'bun:test';
import { deriveNoisePlan } from '../src/systems/audio/procedural/noisePlan';

describe('deriveNoisePlan', () => {
  test('derives stable defaults for smooth noise without expression', () => {
    const plan = deriveNoisePlan({
      track: {
        masterGain: 0.5,
        expression: undefined,
      } as never,
      noiseLayer: {
        gain: 0.2,
        filterHz: 1000,
        durationSteps: 2,
        expression: undefined,
      } as never,
      stepIndex: 4,
      stepDuration: 0.25,
      intensityBlend: 0.5,
      creativityDrive: 0.25,
      gainScale: 1,
    });

    expect(plan.noiseColor).toBeUndefined();
    expect(plan.duration).toBeCloseTo(0.45, 6);
    expect(plan.modulationDuration).toBeCloseTo(0.5, 6);
    expect(plan.peakGain).toBeCloseTo(0.09073850000000003, 6);
    expect(plan.playbackRate).toBeCloseTo(1.0168, 6);
    expect(plan.pannerBasePan).toBe(0);
    expect(plan.highpassHz).toBe(250);
    expect(plan.bandpassHz).toBeCloseTo(1120, 6);
    expect(plan.filterQ).toBe(0.8);
  });

  test('derives shimmer noise settings from expression values', () => {
    const plan = deriveNoisePlan({
      track: {
        masterGain: 0.75,
        expression: { stereo: { pan: 2 } },
      } as never,
      noiseLayer: {
        gain: 0.3,
        filterHz: 1200,
        durationSteps: 3,
        expression: {
          accent: { amount: 0.5, emphasisSteps: [1] },
          noiseCharacter: {
            color: 'pink',
            texture: 'shimmer',
            drift: 0.2,
            burst: 0.4,
          },
        },
      } as never,
      stepIndex: 1,
      stepDuration: 0.125,
      intensityBlend: 0.6,
      creativityDrive: 0.5,
      gainScale: 0.8,
    });

    expect(plan.noiseColor).toBe('pink');
    expect(plan.duration).toBeCloseTo(0.20625, 6);
    expect(plan.modulationDuration).toBeCloseTo(0.375, 6);
    expect(plan.peakGain).toBeCloseTo(0.36884700000000004, 6);
    expect(plan.playbackRate).toBeCloseTo(1.0456, 6);
    expect(plan.pannerBasePan).toBe(1);
    expect(plan.highpassHz).toBe(1800);
    expect(plan.bandpassHz).toBeCloseTo(1546.8447373766498, 6);
    expect(plan.filterQ).toBe(1.8);
  });
});
