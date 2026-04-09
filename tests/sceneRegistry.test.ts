import { describe, expect, test } from 'bun:test';
import type Phaser from 'phaser';

import { ensureSceneRegistered, startRegisteredScene } from '../src/scenes/sceneRegistry';

type MockSceneState = {
  addCalls: string[];
  startCalls: string[];
  callOrder: string[];
  missingSceneStartAttempts: number;
};

function createMockScene(): { scene: Phaser.Scene; state: MockSceneState } {
  const keys: Record<string, unknown> = {};
  const state: MockSceneState = {
    addCalls: [],
    startCalls: [],
    callOrder: [],
    missingSceneStartAttempts: 0,
  };

  const scene = {
    scene: {
      manager: { keys },
      add: (key: string, sceneClass: unknown) => {
        keys[key] = sceneClass;
        state.addCalls.push(key);
        state.callOrder.push(`add:${key}`);
      },
      start: (key: string) => {
        if (!keys[key]) {
          state.missingSceneStartAttempts += 1;
        }

        state.startCalls.push(key);
        state.callOrder.push(`start:${key}`);
      },
    },
  };

  return {
    scene: scene as unknown as Phaser.Scene,
    state,
  };
}

async function flushMicrotasks(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
  await new Promise<void>((resolve) => {
    setTimeout(resolve, 0);
  });
}

describe('sceneRegistry', () => {
  test('deduplicates concurrent async registration per scene key', async () => {
    const { scene, state } = createMockScene();

    let resolveLoader: ((sceneClass: new () => Phaser.Scene) => void) | null = null;
    let loaderCalls = 0;

    const sceneLoaders = {
      TestSceneDedupe: () => {
        loaderCalls += 1;

        return new Promise<new () => Phaser.Scene>((resolve) => {
          resolveLoader = resolve;
        });
      },
    };

    const first = ensureSceneRegistered(scene, 'TestSceneDedupe', sceneLoaders);
    const second = ensureSceneRegistered(scene, 'TestSceneDedupe', sceneLoaders);

    expect(loaderCalls).toBe(1);
    expect(state.addCalls).toEqual([]);

    const SceneClass = class {} as unknown as new () => Phaser.Scene;
    resolveLoader?.(SceneClass);
    await Promise.all([first, second]);

    expect(state.addCalls).toEqual(['TestSceneDedupe']);
  });

  test('starts target scene only after registration completes', async () => {
    const { scene, state } = createMockScene();

    let resolveLoader: ((sceneClass: new () => Phaser.Scene) => void) | null = null;
    const sceneLoaders = {
      TestSceneStartOrder: () => new Promise<new () => Phaser.Scene>((resolve) => {
        resolveLoader = resolve;
      }),
    };

    startRegisteredScene(scene, 'TestSceneStartOrder', sceneLoaders);

    expect(state.callOrder).toEqual([]);

    const SceneClass = class {} as unknown as new () => Phaser.Scene;
    resolveLoader?.(SceneClass);
    await flushMicrotasks();

    expect(state.callOrder).toEqual(['add:TestSceneStartOrder', 'start:TestSceneStartOrder']);
  });

  test('avoids missing-scene start path on first-use transition', async () => {
    const { scene, state } = createMockScene();

    const sceneLoaders = {
      TestSceneFirstUse: async () => class {} as unknown as new () => Phaser.Scene,
    };

    startRegisteredScene(scene, 'TestSceneFirstUse', sceneLoaders);
    await flushMicrotasks();

    expect(state.startCalls).toEqual(['TestSceneFirstUse']);
    expect(state.missingSceneStartAttempts).toBe(0);
  });
});
