import { describe, expect, mock, test } from 'bun:test';
import { mockPhaserModule } from './helpers/phaserMock';

mockPhaserModule();

const { createSpawnWarning } = await import('../src/systems/effects/ephemeralOverlayTweens');

function createScene() {
  const image = {
    setDepth: mock(() => image),
    setScrollFactor: mock(() => image),
  };
  return {
    image,
    scene: {
      // The chevron texture is painted once; later warnings reuse it.
      textures: { exists: mock(() => true) },
      add: { image: mock((_x: number, _y: number, _key: string) => image), graphics: mock() },
      tweens: { add: mock() },
    },
  };
}

describe('spawn warning', () => {
  test('every warning is a sprite of one shared texture, so a whole wave draws as a single batch', () => {
    const { scene, image } = createScene();

    createSpawnWarning(scene as never, 120);
    createSpawnWarning(scene as never, 480);

    // Vector strokes cost a draw call each: twelve chevrons at once halved the frame rate.
    expect(scene.add.graphics).not.toHaveBeenCalled();
    expect(scene.add.image.mock.calls).toEqual([
      [120, 30, 'spawn-warning'],
      [480, 30, 'spawn-warning'],
    ]);
    expect(image.setScrollFactor).toHaveBeenCalledWith(0);
    expect(scene.tweens.add).toHaveBeenCalledTimes(2);
  });
});
