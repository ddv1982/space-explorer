import { describe, expect, mock, test } from 'bun:test';
import type Phaser from 'phaser';

mock.module('phaser', () => ({
  default: {
    Scale: { Events: { RESIZE: 'resize' } },
    Scenes: { Events: { SHUTDOWN: 'shutdown', DESTROY: 'destroy' } },
  },
}));

const { createGameSceneRuntimeLifecycle } = await import('../src/scenes/gameScene/runtimeLifecycle');

function countLogEntry(log: string[], entry: string): number {
  return log.filter((value) => value === entry).length;
}

function createRuntimeLifecycleHarness() {
  const log: string[] = [];
  const lifecycleHandlers: Record<string, () => void> = {};

  const bindings = [
    { event: 'enemyDeath', handler: () => {} },
    { event: 'bossDeath', handler: () => {} },
  ];

  const scene = {
    events: {
      off: (event: string) => {
        if (event === 'shutdown' || event === 'destroy') {
          return;
        }

        log.push(`off:${event}`);
      },
      on: () => {},
      once: (event: string, handler: () => void) => {
        lifecycleHandlers[event] = handler;
      },
    },
    scale: {
      off: (event: string) => {
        log.push(`scaleOff:${event}`);
      },
      on: () => {},
    },
  } as const;

  const lifecycle = createGameSceneRuntimeLifecycle({
    scene: scene as unknown as Phaser.Scene,
    sceneEventBindings: bindings,
    syncLastLifeHelperWingState: () => {
      log.push('syncLastLifeHelperWingState');
    },
    getScaleResizeContext: () => ({
      scene: scene as unknown as Phaser.Scene,
      parallax: null,
      mobileControls: null,
      hud: null,
      warpTransition: null,
      pauseStateController: null,
      clampPlayerToViewport: () => {},
    }),
    destroyMobileViewportGuard: () => {
      log.push('destroyMobileViewportGuard');
    },
    destroyPauseStateController: () => {
      log.push('destroyPauseStateController');
    },
    destroyMobileControls: () => {
      log.push('destroyMobileControls');
    },
    persistHelperWingState: () => {
      log.push('persistHelperWingState');
    },
    destroyLastLifeHelperWing: () => {
      log.push('destroyLastLifeHelperWing');
    },
    destroyParallax: () => {
      log.push('destroyParallax');
    },
    destroyEffectsManager: () => {
      log.push('destroyEffectsManager');
    },
    shutdownFlow: () => {
      log.push('shutdownFlow');
    },
    resetRuntimeStateAfterShutdown: () => {
      log.push('resetRuntimeStateAfterShutdown');
    },
  });

  return { log, lifecycle, lifecycleHandlers };
}

describe('createGameSceneRuntimeLifecycle', () => {
  test('handleSceneShutdown tears down lifecycle resources before runtime reset', () => {
    const { lifecycle, log } = createRuntimeLifecycleHarness();

    lifecycle.handleSceneShutdown();

    expect(log).toEqual([
      'off:enemyDeath',
      'off:bossDeath',
      'scaleOff:resize',
      'destroyMobileViewportGuard',
      'destroyPauseStateController',
      'destroyMobileControls',
      'persistHelperWingState',
      'destroyLastLifeHelperWing',
      'destroyParallax',
      'destroyEffectsManager',
      'shutdownFlow',
      'resetRuntimeStateAfterShutdown',
    ]);
  });

  test('shutdown followed by destroy tears down once per lifecycle and resets only on shutdown', () => {
    const { lifecycle, log } = createRuntimeLifecycleHarness();

    lifecycle.handleSceneShutdown();
    lifecycle.handleSceneDestroy();

    expect(countLogEntry(log, 'persistHelperWingState')).toBe(1);
    expect(countLogEntry(log, 'shutdownFlow')).toBe(1);
    expect(countLogEntry(log, 'resetRuntimeStateAfterShutdown')).toBe(1);
  });

  test('registerLifecycleHandlers allows one teardown for each new lifecycle', () => {
    const { lifecycle, log, lifecycleHandlers } = createRuntimeLifecycleHarness();

    lifecycle.registerLifecycleHandlers();
    lifecycleHandlers.shutdown?.();
    lifecycleHandlers.destroy?.();

    expect(countLogEntry(log, 'persistHelperWingState')).toBe(1);
    expect(countLogEntry(log, 'shutdownFlow')).toBe(1);
    expect(countLogEntry(log, 'resetRuntimeStateAfterShutdown')).toBe(1);

    lifecycle.registerLifecycleHandlers();
    lifecycleHandlers.shutdown?.();

    expect(countLogEntry(log, 'persistHelperWingState')).toBe(2);
    expect(countLogEntry(log, 'shutdownFlow')).toBe(2);
    expect(countLogEntry(log, 'resetRuntimeStateAfterShutdown')).toBe(2);
  });
});
