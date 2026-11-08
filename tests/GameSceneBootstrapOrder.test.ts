import { EventEmitter } from 'node:events';
import { describe, expect, mock, test } from 'bun:test';
import { mockPhaserModule } from './helpers/phaserMock';
import type { GameSceneBootstrapRuntime } from '../src/scenes/gameScene/runGameSceneCreateBootstrap';

mockPhaserModule();
mock.module('../src/utils/cinematicAssets', () => ({
  finishCinematicLoading: () => true,
  queueCinematicAssets: () => {},
}));
let currentRuntime: GameSceneBootstrapRuntime;
mock.module('../src/scenes/gameScene/runGameSceneCreateBootstrap', () => ({
  runGameSceneCreateBootstrap: (host: { resetRuntimeState(): void }) => {
    host.resetRuntimeState();
    return currentRuntime;
  },
}));
mock.module('../src/systems/AudioManager', () => ({ audioManager: {} }));
const { GameScene } = await import('../src/scenes/GameScene');
const { GAME_SCENE_EVENTS } = await import('../src/systems/GameplayFlow');

describe('GameScene create bootstrap order', () => {
  test('installs current run dependencies and binds feedback before activating its helper wing', () => {
    const scene = new GameScene();
    const events = new EventEmitter();
    const announcements: number[] = [];
    const lives: number[] = [];
    const flow = { getRemainingLives: () => 1 };
    const hud = { showHelperWingAnnouncement: (count: number) => announcements.push(count) };
    const helper = {
      updateLastLifeState: (remainingLives: number) => {
        lives.push(remainingLives);
        events.emit(GAME_SCENE_EVENTS.helperWingActivated, 2);
      },
    };
    currentRuntime = { hud, lastLifeHelperWing: helper } as unknown as GameSceneBootstrapRuntime;
    Object.assign(scene, {
      events,
      flow,
      runtimeLifecycle: {
        removeSceneEventHandlers: () => {
          const state = scene as unknown as {
            sceneEventBindings: Array<{ event: string; handler: (...args: unknown[]) => void }>;
          };
          for (const { event, handler } of state.sceneEventBindings) events.off(event, handler);
        },
        registerSceneEventHandlers: () => {
          const state = scene as unknown as {
            sceneEventBindings: Array<{ event: string; handler: (...args: unknown[]) => void }>;
          };
          for (const { event, handler } of state.sceneEventBindings) events.on(event, handler);
        },
      },
    });
    scene.create();
    expect(lives).toEqual([1]);
    expect(announcements).toEqual([2]);
    expect(events.listenerCount(GAME_SCENE_EVENTS.helperWingActivated)).toBe(1);
    const restartedAnnouncements: number[] = [];
    currentRuntime = {
      hud: { showHelperWingAnnouncement: (count: number) => restartedAnnouncements.push(count) },
      lastLifeHelperWing: helper,
    } as unknown as GameSceneBootstrapRuntime;
    scene.create();
    expect(lives).toEqual([1, 1]);
    expect(announcements).toEqual([2]);
    expect(restartedAnnouncements).toEqual([2]);
    expect(events.listenerCount(GAME_SCENE_EVENTS.helperWingActivated)).toBe(1);
  });
});
