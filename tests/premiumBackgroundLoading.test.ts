import { describe, expect, mock, test } from 'bun:test';
import { mockPhaserModule } from './helpers/phaserMock';

mockPhaserModule();

const {
  ensurePremiumBackgroundAssets,
  releasePremiumBackgroundTexturesOutsideWindow,
} = await import('../src/systems/parallax/premiumBackgroundLoading');

function createGraphicsStub(generatedKeys: string[]) {
  const stub: Record<string, unknown> = {
    generateTexture: (key: string) => {
      generatedKeys.push(key);
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

  const scene = {
    textures: {
      exists: (key: string) => textures.has(key),
      remove: (key: string) => {
        textures.delete(key);
      },
    },
    add: {
      graphics: () => createGraphicsStub(generatedKeys),
    },
  };

  return {
    scene: scene as never,
    generatedKeys,
    hasTexture: (key: string) => textures.has(key),
  };
}

describe('premium background loading helpers', () => {
  test('ensure generates every layer for missing window levels and is synchronous', () => {
    const harness = createSceneHarness();
    const onReady = mock();

    ensurePremiumBackgroundAssets(harness.scene, 5, onReady);

    expect(harness.generatedKeys).toEqual([
      'bg_level05',
      'bg_level05_nebula',
      'bg_level05_mid',
      'bg_level05_near',
      'bg_level05_overlay',
      'bg_level06',
      'bg_level06_nebula',
      'bg_level06_mid',
      'bg_level06_near',
      'bg_level06_overlay',
    ]);
    expect(onReady).toHaveBeenCalledTimes(1);
  });

  test('ensure skips layers that are already generated', () => {
    const harness = createSceneHarness([
      'bg_level05',
      'bg_level05_nebula',
      'bg_level05_mid',
      'bg_level05_near',
      'bg_level05_overlay',
      'bg_level06',
      'bg_level06_nebula',
      'bg_level06_mid',
      'bg_level06_near',
      'bg_level06_overlay',
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
    expect(harness.hasTexture('bg_level04')).toBe(true);
    expect(harness.hasTexture('bg_level04_overlay')).toBe(true);
  });
});
