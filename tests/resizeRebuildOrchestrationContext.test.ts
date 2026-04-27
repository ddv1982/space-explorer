import { describe, expect, test } from 'bun:test';
import { getResizeRebuildOrchestrationContext } from '../src/systems/parallax/resizeRebuildOrchestrationContext';

describe('getResizeRebuildOrchestrationContext', () => {
  test('forwards getters, setters, and callbacks unchanged', () => {
    let width = 800;
    let height = 600;
    let pending: unknown = null;
    let layoutTileCalls = 0;
    let layoutPremiumCalls = 0;
    let layoutLevelCalls = 0;
    let rebuildPremiumArgs: unknown[] | null = null;
    let rebuildLevelArgs: unknown[] | null = null;

    const scene = { id: 'scene' };
    const levelConfig = { id: 'level' };

    const context = getResizeRebuildOrchestrationContext(
      () => scene as never,
      () => levelConfig as never,
      () => width,
      () => height,
      (nextWidth, nextHeight) => {
        width = nextWidth;
        height = nextHeight;
      },
      () => 3,
      () => pending as never,
      (event) => {
        pending = event;
      },
      () => {
        layoutTileCalls += 1;
      },
      () => {
        layoutPremiumCalls += 1;
      },
      () => {
        layoutLevelCalls += 1;
      },
      (sceneArg, configArg) => {
        rebuildPremiumArgs = [sceneArg, configArg];
      },
      (sceneArg, configArg) => {
        rebuildLevelArgs = [sceneArg, configArg];
      }
    );

    expect(context.getScene()).toBe(scene);
    expect(context.getLevelConfig()).toBe(levelConfig);
    expect(context.getCurrentWidth()).toBe(800);
    expect(context.getCurrentHeight()).toBe(600);
    expect(context.getPremiumBackgroundLayerCount()).toBe(3);
    expect(context.getPendingRebuildEvent()).toBeNull();

    context.setCurrentSize(1024, 768);
    expect(context.getCurrentWidth()).toBe(1024);
    expect(context.getCurrentHeight()).toBe(768);

    const event = { id: 'timer' };
    context.setPendingRebuildEvent(event as never);
    expect(context.getPendingRebuildEvent()).toBe(event);

    context.layoutTileSprites();
    context.layoutPremiumBackgroundLayers();
    context.layoutLevelVisualLayers();
    context.rebuildPremiumBackgroundLayers(scene as never, levelConfig as never);
    context.rebuildLevelVisualLayers(scene as never, levelConfig as never);

    expect(layoutTileCalls).toBe(1);
    expect(layoutPremiumCalls).toBe(1);
    expect(layoutLevelCalls).toBe(1);
    expect(rebuildPremiumArgs).toEqual([scene, levelConfig]);
    expect(rebuildLevelArgs).toEqual([scene, levelConfig]);
  });
});
