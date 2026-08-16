import { describe, expect, mock, test } from 'bun:test';
import { mockPhaserModule } from './helpers/phaserMock';

mockPhaserModule();

const { updatePlanetLayerMotion } = await import('../src/systems/parallax/backgroundMotion');
const { scrollPremiumBackgroundLayers } = await import('../src/systems/parallax/premiumBackgroundLayers');

function createImage(alpha: number) {
  const sprite = {
    alpha,
    x: 0,
    y: 0,
    setAlpha: mock((nextAlpha: number) => {
      sprite.alpha = nextAlpha;
      return sprite;
    }),
  };
  return sprite;
}

describe('background motion render-property writes', () => {
  test('skips a redundant planet alpha write while preserving motion', () => {
    const sprite = createImage(0.4);

    updatePlanetLayerMotion(
      {
        sprite: sprite as never,
        baseX: 100,
        baseY: 200,
        baseAlpha: 0.5,
      },
      0,
      1,
      1
    );

    expect(sprite.x).toBe(100);
    expect(sprite.y).toBe(215);
    expect(sprite.setAlpha).not.toHaveBeenCalled();
  });

  test('applies a changed planet alpha exactly once', () => {
    const sprite = createImage(0.2);

    updatePlanetLayerMotion(
      {
        sprite: sprite as never,
        baseX: 100,
        baseY: 200,
        baseAlpha: 0.5,
      },
      0,
      1,
      1
    );

    expect(sprite.alpha).toBe(0.4);
    expect(sprite.setAlpha).toHaveBeenCalledTimes(1);
  });

  test('skips unchanged alpha writes on non-pulsing premium layers', () => {
    const sprite = createImage(0.75) as ReturnType<typeof createImage> & {
      frame: { height: number };
      tileScaleY: number;
      tilePositionY: number;
    };
    sprite.frame = { height: 1024 };
    sprite.tileScaleY = 1;
    sprite.tilePositionY = 0;

    scrollPremiumBackgroundLayers({
      premiumBackgroundLayers: [
        {
          sprite: sprite as never,
          config: { role: 'overlay', key: 'overlay', alpha: 0.75, depth: -16, scrollSpeed: 0.34 },
          baseAlpha: 0.75,
          currentAlpha: 0.75,
          scrollOffsetX: 0,
          scrollOffsetY: 0,
        },
      ],
      delta: 0,
      currentHeight: 600,
      atmosphereDrift: 1,
      atmosphereAlpha: 1,
      elapsed: 0,
    });

    expect(sprite.setAlpha).not.toHaveBeenCalled();
  });
});
