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

    expect(countByMethod(calls, 'lineStyle')).toBe(9);
    expect(countByMethod(calls, 'lineBetween')).toBe(11);
    expect(countByMethod(calls, 'strokeEllipse')).toBe(2);
    expect(countByMethod(calls, 'fillStyle')).toBe(2);
    expect(countByMethod(calls, 'fillEllipse')).toBe(2);
    expect(countByMethod(calls, 'beginPath')).toBe(4);
    expect(countByMethod(calls, 'arc')).toBe(4);
    expect(countByMethod(calls, 'strokePath')).toBe(4);
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

  test('keeps mirrored crossfire lane arcs legible without double intensity attenuation', () => {
    const { recorder, calls } = createGraphicsRecorder();

    drawHazardOverlayPrimitives(recorder as never, {
      width: 800,
      height: 600,
      time: 1000,
      accentColor: 0x335577,
      overlayAlpha: 0.1,
      energyStorm: 0,
      gravityWell: 0,
      nebulaAmbush: 0,
      ringCrossfire: 0.44,
      debrisSurge: 0,
      minefield: 0,
      rockCorridor: 0,
    });

    const lineStyles = calls.filter((call) => call.method === 'lineStyle');
    expect(lineStyles.map((call) => call.args[0])).toEqual([7, 2]);
    expect(lineStyles[0].args[2]).toBeCloseTo(0.022, 6);
    expect(lineStyles[1].args[2]).toBeCloseTo(0.095, 6);
    const arcs = calls.filter((call) => call.method === 'arc');
    expect(arcs).toHaveLength(4);
    expect(arcs.slice(0, 2).map((call) => call.args)).toEqual([
      [128, 156, 128, -0.35, 0.55],
      [672, 156, 128, 2.59, 3.49],
    ]);
    expect(arcs[2].args).toEqual(arcs[0].args);
    expect(arcs[3].args).toEqual(arcs[1].args);
  });

  test('renders debris surge with a visible core and matching halo geometry', () => {
    const { recorder, calls } = createGraphicsRecorder();

    drawHazardOverlayPrimitives(recorder as never, {
      width: 800,
      height: 600,
      time: 1000,
      accentColor: 0x335577,
      overlayAlpha: 0.06,
      energyStorm: 0,
      gravityWell: 0,
      nebulaAmbush: 0,
      ringCrossfire: 0,
      debrisSurge: 0.33,
      minefield: 0,
      rockCorridor: 0,
    });

    const lineStyles = calls.filter((call) => call.method === 'lineStyle');
    expect(lineStyles.map((call) => call.args[0])).toEqual([7, 2.25]);
    expect(lineStyles[0].args[2]).toBeCloseTo(0.0336, 6);
    expect(lineStyles[1].args[2]).toBeCloseTo(0.084, 6);
    const streaks = calls.filter((call) => call.method === 'lineBetween');
    expect(streaks).toHaveLength(8);
    expect(streaks.slice(0, 4).map((call) => call.args)).toEqual([
      [76, 108, 114, 204.00000000000003],
      [204.00000000000003, 108, 242.00000000000003, 204.00000000000003],
      [556, 108, 594, 204.00000000000003],
      [684, 108, 722, 204.00000000000003],
    ]);
    expect(streaks.slice(4).map((call) => call.args)).toEqual(streaks.slice(0, 4).map((call) => call.args));
  });
});
