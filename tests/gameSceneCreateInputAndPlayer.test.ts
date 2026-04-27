import { describe, expect, mock, test } from 'bun:test';
import type Phaser from 'phaser';

mock.module('phaser', () => ({
  default: {
    Physics: {
      Arcade: {
        Sprite: class {},
      },
    },
  },
}));

const { createInputAndPlayer } = await import('../src/scenes/gameScene/createInputAndPlayer');

describe('createInputAndPlayer', () => {
  test('creates mobile controls, input manager, and player in the expected order', () => {
    const callLog: string[] = [];
    const scene = {} as Phaser.Scene;
    const state = { hp: 5, maxHp: 7 } as never;
    const playerSpawnPoint = { x: 120, y: 340 };

    const mobileControls = {
      create(sceneArg: Phaser.Scene) {
        callLog.push('mobileControls.create');
        expect(sceneArg).toBe(scene);
      },
    } as never;

    const inputManager = {
      create(sceneArg: Phaser.Scene, mobileControlsArg: unknown) {
        callLog.push('inputManager.create');
        expect(sceneArg).toBe(scene);
        expect(mobileControlsArg).toBe(mobileControls);
      },
    } as never;

    const player = {
      applyState(stateArg: unknown) {
        callLog.push('player.applyState');
        expect(stateArg).toBe(state);
      },
    } as never;

    const result = createInputAndPlayer({
      scene,
      state,
      playerSpawnPoint,
      createMobileControls: () => {
        callLog.push('createMobileControls');
        return mobileControls;
      },
      createInputManager: () => {
        callLog.push('createInputManager');
        return inputManager;
      },
      createPlayer: (sceneArg, x, y) => {
        callLog.push(`createPlayer:${x},${y}`);
        expect(sceneArg).toBe(scene);
        return player;
      },
    });

    expect(callLog).toEqual([
      'createMobileControls',
      'mobileControls.create',
      'createInputManager',
      'inputManager.create',
      'createPlayer:120,340',
      'player.applyState',
    ]);
    expect(result).toEqual({
      mobileControls,
      inputManager,
      player,
    });
  });
});
