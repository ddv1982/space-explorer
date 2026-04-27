import { describe, expect, mock, test } from 'bun:test';

mock.module('phaser', () => ({ default: {} }));

const callLog: string[] = [];
let parallaxCreateArgs: { scene: unknown; levelConfig: unknown } | null = null;
let parallaxAtmosphereArgs: { section: unknown; progress: number } | null = null;
let effectsSetupScene: unknown = null;
let effectsColorGradeConfig: unknown = null;

const { createWorldPresentation } = await import('../src/scenes/gameScene/createWorldPresentation');

describe('createWorldPresentation', () => {
  test('configures scene presentation and returns spawn point', () => {
    callLog.length = 0;
    parallaxCreateArgs = null;
    parallaxAtmosphereArgs = null;
    effectsSetupScene = null;
    effectsColorGradeConfig = null;

    const scene = {
      cameras: {
        main: {
          setBackgroundColor: (_color: string) => {
            callLog.push('camera.setBackgroundColor');
          },
        },
      },
    };

    const levelConfig = { bgColor: '#112233' };
    const initialSection = { id: 'opening' };

    const result = createWorldPresentation({
      createParallax: () => ({
        create(scene: unknown, levelConfig: unknown): void {
          callLog.push('parallax.create');
          parallaxCreateArgs = { scene, levelConfig };
        },
        setSectionAtmosphere(section: unknown, progress: number): void {
          callLog.push('parallax.setSectionAtmosphere');
          parallaxAtmosphereArgs = { section, progress };
        },
      }) as never,
      createEffectsManager: () => ({
        setup(scene: unknown): void {
          callLog.push('effects.setup');
          effectsSetupScene = scene;
        },
        applyLevelColorGrade(levelConfig: unknown): void {
          callLog.push('effects.applyLevelColorGrade');
          effectsColorGradeConfig = levelConfig;
        },
      }) as never,
      scene: scene as Parameters<typeof createWorldPresentation>[0]['scene'],
      levelConfig: levelConfig as Parameters<typeof createWorldPresentation>[0]['levelConfig'],
      initialSection: initialSection as Parameters<typeof createWorldPresentation>[0]['initialSection'],
      initialSectionProgress: 0.4,
      syncViewportBounds: () => {
        callLog.push('syncViewportBounds');
      },
      getPlayerSpawnPoint: () => {
        callLog.push('getPlayerSpawnPoint');
        return { x: 120, y: 340 };
      },
      registerScaleHandlers: () => {
        callLog.push('registerScaleHandlers');
      },
    });

    expect(callLog).toEqual([
      'camera.setBackgroundColor',
      'syncViewportBounds',
      'getPlayerSpawnPoint',
      'parallax.create',
      'parallax.setSectionAtmosphere',
      'registerScaleHandlers',
      'effects.setup',
      'effects.applyLevelColorGrade',
    ]);
    expect(parallaxCreateArgs).toEqual({ scene, levelConfig });
    expect(parallaxAtmosphereArgs).toEqual({ section: initialSection, progress: 0.4 });
    expect(effectsSetupScene).toBe(scene);
    expect(effectsColorGradeConfig).toBe(levelConfig);
    expect(result.playerSpawnPoint).toEqual({ x: 120, y: 340 });
    expect(result.parallax).toBeDefined();
    expect(result.effectsManager).toBeDefined();
  });
});
