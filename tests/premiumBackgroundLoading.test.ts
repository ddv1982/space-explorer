import { describe, expect, mock, test } from 'bun:test';
import { mockPhaserModule } from './helpers/phaserMock';

mockPhaserModule();

const {
  ensurePremiumBackgroundAssets,
  releasePremiumBackgroundTexturesOutsideWindow,
} = await import('../src/systems/parallax/premiumBackgroundLoading');

function createGraphicsStub(generatedKeys: string[], textures: Set<string>) {
  const stub: Record<string, unknown> = {
    generateTexture: (key: string) => {
      generatedKeys.push(key);
      textures.add(key);
    },
    destroy: (): void => undefined,
  };

  // Every drawing call is a chainable no-op; generation correctness is keyed
  // off generateTexture, not pixel output.
  for (const method of [
    'fillStyle',
    'fillRect',
    'fillCircle',
    'fillEllipse',
    'fillTriangle',
    'lineStyle',
    'lineBetween',
    'beginPath',
    'moveTo',
    'lineTo',
    'closePath',
    'fillPath',
    'strokePath',
    'arc',
    'strokeCircle',
  ]) {
    stub[method] = () => stub;
  }

  return stub;
}

function createSceneHarness(existingKeys: string[] = []) {
  const textures = new Set(existingKeys);
  const generatedKeys: string[] = [];
  const compositeDraws: Array<{ source: string; alpha: number; operation: string }> = [];
  let compositeRefreshCount = 0;
  const sourceImages = new Map<string, { key: string }>();

  const scene = {
    textures: {
      exists: (key: string) => textures.has(key),
      get: (key: string) => ({
        getSourceImage: () => sourceImages.get(key) ?? { key },
      }),
      remove: (key: string) => {
        textures.delete(key);
      },
      createCanvas: (key: string) => {
        textures.add(key);
        const context = {
          globalAlpha: 1,
          globalCompositeOperation: 'source-over',
          clearRect: (): void => undefined,
          drawImage: (source: { key: string }): void => {
            compositeDraws.push({
              source: source.key,
              alpha: context.globalAlpha,
              operation: context.globalCompositeOperation,
            });
          },
        };
        return {
          context,
          refresh: (): void => {
            compositeRefreshCount += 1;
          },
        };
      },
    },
    add: {
      graphics: () => createGraphicsStub(generatedKeys, textures),
    },
  };

  return {
    scene: scene as never,
    generatedKeys,
    compositeDraws,
    getCompositeRefreshCount: () => compositeRefreshCount,
    hasTexture: (key: string) => textures.has(key),
  };
}

describe('premium background loading helpers', () => {
  test('ensure generates every active-level layer and is synchronous', () => {
    const harness = createSceneHarness();
    const onReady = mock();

    ensurePremiumBackgroundAssets(harness.scene, 5, onReady);

    expect(harness.generatedKeys).toEqual([
      'bg_level05',
      'bg_level05_nebula',
      'bg_level05_mid',
      'bg_level05_near',
      'bg_level05_overlay',
    ]);
    expect(onReady).toHaveBeenCalledTimes(1);
    expect(harness.compositeDraws).toEqual([
      { source: 'bg_level05', alpha: 1, operation: 'source-over' },
      { source: 'bg_level05_nebula', alpha: 0.9, operation: 'source-over' },
      { source: 'bg_level05_mid', alpha: 0.85, operation: 'source-over' },
      { source: 'bg_level05_near', alpha: 0.9, operation: 'source-over' },
      { source: 'bg_level05_overlay', alpha: 0.75, operation: 'lighter' },
    ]);
    expect(harness.getCompositeRefreshCount()).toBe(3);
    expect(harness.hasTexture('bg_level05_composite')).toBe(true);
    expect(harness.hasTexture('bg_level05_motif')).toBe(true);
    expect(harness.hasTexture('bg_level05_atmosphere')).toBe(true);
    expect(harness.hasTexture('bg_level05_overlay')).toBe(false);
    expect(harness.hasTexture('bg_level05')).toBe(false);
    expect(harness.hasTexture('bg_level05_nebula')).toBe(false);
  });

  test('ensure skips layers that are already generated', () => {
    const harness = createSceneHarness([
      'bg_level05',
      'bg_level05_nebula',
      'bg_level05_mid',
      'bg_level05_near',
      'bg_level05_overlay',
    ]);
    const onReady = mock();

    ensurePremiumBackgroundAssets(harness.scene, 5, onReady);

    expect(harness.generatedKeys).toEqual([]);
    expect(onReady).toHaveBeenCalledTimes(1);
    expect(harness.hasTexture('bg_level01')).toBe(false);
  });

  test('ensure keeps outside-window textures by default (outgoing scene may still use them)', () => {
    const harness = createSceneHarness(['bg_level01', 'bg_level02_overlay']);
    const onReady = mock();

    ensurePremiumBackgroundAssets(harness.scene, 3, onReady);

    expect(onReady).toHaveBeenCalledTimes(1);
    expect(harness.hasTexture('bg_level01')).toBe(true);
    expect(harness.hasTexture('bg_level02_overlay')).toBe(true);
  });

  test('ensure can still release when explicitly requested', () => {
    const harness = createSceneHarness(['bg_level01', 'bg_level02_nebula']);
    const onReady = mock();

    ensurePremiumBackgroundAssets(harness.scene, 3, onReady, {
      releaseOutsideWindow: true,
    });

    expect(onReady).toHaveBeenCalledTimes(1);
    expect(harness.hasTexture('bg_level01')).toBe(false);
    expect(harness.hasTexture('bg_level02_nebula')).toBe(false);
  });

  test('release removes only textures outside the active window', () => {
    const harness = createSceneHarness([
      'bg_level01',
      'bg_level02_mid',
      'bg_level03',
      'bg_level03_near',
      'bg_level04',
      'bg_level04_overlay',
    ]);

    releasePremiumBackgroundTexturesOutsideWindow(harness.scene, 3);

    expect(harness.hasTexture('bg_level01')).toBe(false);
    expect(harness.hasTexture('bg_level02_mid')).toBe(false);
    expect(harness.hasTexture('bg_level03')).toBe(true);
    expect(harness.hasTexture('bg_level03_near')).toBe(true);
    expect(harness.hasTexture('bg_level04')).toBe(false);
    expect(harness.hasTexture('bg_level04_overlay')).toBe(false);
  });
});
