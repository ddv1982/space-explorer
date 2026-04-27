import { describe, expect, mock, test } from 'bun:test';

mock.module('phaser', () => ({
  default: {
    Math: {
      Clamp: (value: number, min: number, max: number) => Math.min(max, Math.max(min, value)),
    },
  },
}));

const { drawHazardOverlayPrimitives } = await import('../src/systems/parallax/hazardOverlayRenderer');

type RecordedCall = { method: string; args: number[] };

function createGraphicsRecorder() {
  const calls: RecordedCall[] = [];

  const recorder = {
    lineStyle: (...args: number[]) => {
      calls.push({ method: 'lineStyle', args });
      return recorder;
    },
    lineBetween: (...args: number[]) => {
      calls.push({ method: 'lineBetween', args });
      return recorder;
    },
    strokeEllipse: (...args: number[]) => {
      calls.push({ method: 'strokeEllipse', args });
      return recorder;
    },
    fillStyle: (...args: number[]) => {
      calls.push({ method: 'fillStyle', args });
      return recorder;
    },
    fillEllipse: (...args: number[]) => {
      calls.push({ method: 'fillEllipse', args });
      return recorder;
    },
    beginPath: () => {
      calls.push({ method: 'beginPath', args: [] });
      return recorder;
    },
    arc: (...args: number[]) => {
      calls.push({ method: 'arc', args });
      return recorder;
    },
    strokePath: () => {
      calls.push({ method: 'strokePath', args: [] });
      return recorder;
    },
    fillCircle: (...args: number[]) => {
      calls.push({ method: 'fillCircle', args });
      return recorder;
    },
    fillTriangle: (...args: number[]) => {
      calls.push({ method: 'fillTriangle', args });
      return recorder;
    },
  };

  return { recorder, calls };
}

function countByMethod(calls: RecordedCall[], method: string): number {
  return calls.filter((call) => call.method === method).length;
}

describe('hazardOverlayRenderer', () => {
  test('does not issue draw primitives when all hazard intensities are zero', () => {
    const { recorder, calls } = createGraphicsRecorder();

    drawHazardOverlayPrimitives(recorder as never, {
      width: 800,
      height: 600,
      time: 1000,
      accentColor: 0x335577,
      overlayAlpha: 0.8,
      energyStorm: 0,
      gravityWell: 0,
      nebulaAmbush: 0,
      ringCrossfire: 0,
      debrisSurge: 0,
      minefield: 0,
      rockCorridor: 0,
    });

    expect(calls).toHaveLength(0);
  });

  test('issues the expected primitive counts across all visible hazard draw branches', () => {
    const { recorder, calls } = createGraphicsRecorder();

    drawHazardOverlayPrimitives(recorder as never, {
      width: 800,
      height: 600,
      time: 1000,
      accentColor: 0x335577,
      overlayAlpha: 0.8,
      energyStorm: 1,
      gravityWell: 1,
      nebulaAmbush: 1,
      ringCrossfire: 1,
      debrisSurge: 1,
      minefield: 1,
      rockCorridor: 1,
    });

    expect(countByMethod(calls, 'lineStyle')).toBe(7);
    expect(countByMethod(calls, 'lineBetween')).toBe(7);
    expect(countByMethod(calls, 'strokeEllipse')).toBe(2);
    expect(countByMethod(calls, 'fillStyle')).toBe(2);
    expect(countByMethod(calls, 'fillEllipse')).toBe(2);
    expect(countByMethod(calls, 'beginPath')).toBe(2);
    expect(countByMethod(calls, 'arc')).toBe(2);
    expect(countByMethod(calls, 'strokePath')).toBe(2);
    expect(countByMethod(calls, 'fillCircle')).toBe(8);
    expect(countByMethod(calls, 'fillTriangle')).toBe(0);
  });

  test('does not render additional overlay primitives for rock corridors', () => {
    const { recorder, calls } = createGraphicsRecorder();

    drawHazardOverlayPrimitives(recorder as never, {
      width: 800,
      height: 600,
      time: 1000,
      accentColor: 0x335577,
      overlayAlpha: 0.8,
      energyStorm: 0,
      gravityWell: 0,
      nebulaAmbush: 0,
      ringCrossfire: 0,
      debrisSurge: 0,
      minefield: 0,
      rockCorridor: 1,
    });

    expect(calls).toHaveLength(0);
  });
});
