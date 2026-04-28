import { describe, expect, mock, test } from 'bun:test';

let lastGraphics: Record<string, ReturnType<typeof mock>> | null = null;

const withGeneratedTexture = mock((_scene, _key, _width, _height, draw) => {
  const graphics = {
    fillStyle: mock(() => undefined),
    fillRect: mock(() => undefined),
    fillEllipse: mock(() => undefined),
    fillCircle: mock(() => undefined),
    lineStyle: mock(() => undefined),
    strokeCircle: mock(() => undefined),
    strokeRect: mock(() => undefined),
    lineBetween: mock(() => undefined),
    beginPath: mock(() => undefined),
    moveTo: mock(() => undefined),
    lineTo: mock(() => undefined),
    closePath: mock(() => undefined),
    fillPath: mock(() => undefined),
  };

  lastGraphics = graphics;
  draw(graphics as never);
  return graphics;
});

mock.module('../src/utils/generatedTexture', () => ({
  withGeneratedTexture,
}));

mock.module('phaser', () => ({
  default: {
    Math: {
      Between: (min: number, _max: number) => min,
      FloatBetween: (min: number, _max: number) => min,
      Clamp: (value: number, min: number, max: number) => Math.min(Math.max(value, min), max),
    },
  },
}));

async function loadMoonSurfaceGenerator() {
  return await import(`../src/systems/parallax/moonSurfaceGenerator?isolation=${Math.random()}`);
}

describe('moonSurfaceGenerator', () => {
  test('does not draw building/spire/light-strip prop geometry', async () => {
    withGeneratedTexture.mockClear();

    const scene = {};

    const { generateMoonSurfaceTexture } = await loadMoonSurfaceGenerator();

    generateMoonSurfaceTexture(
      scene as never,
      'moon-test',
      120,
      80,
      {
        scrollSpeed: 0.12,
        surfaceColor: 0x223344,
        accentColor: 0x55aaff,
        craterCount: 2,
        horizonGlow: 0.5,
      } as never
    );

    expect(withGeneratedTexture).toHaveBeenCalledTimes(1);
    expect(lastGraphics).not.toBeNull();
    expect(lastGraphics!.strokeRect).not.toHaveBeenCalled();
    expect(lastGraphics!.lineBetween).not.toHaveBeenCalled();
    expect(lastGraphics!.beginPath).not.toHaveBeenCalled();
    expect(lastGraphics!.moveTo).not.toHaveBeenCalled();
    expect(lastGraphics!.lineTo).not.toHaveBeenCalled();
    expect(lastGraphics!.closePath).not.toHaveBeenCalled();
    expect(lastGraphics!.fillPath).not.toHaveBeenCalled();
  });
});
