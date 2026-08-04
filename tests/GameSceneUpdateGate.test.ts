import { describe, expect, mock, test } from 'bun:test';

import type { GameSceneFrameDelegate } from '../src/scenes/gameScene/updateFrame';
import type { GameSceneGameplayFrameBehavior } from '../src/scenes/gameScene/gameplayFrameBehavior';

mock.module('phaser', () => ({
  default: {
    Scene: class {},
    Physics: {
      Arcade: {
        Sprite: class {},
      },
    },
    Math: {
      Vector2: class {
        x = 0;
        y = 0;
      },
    },
    Scale: {
      Events: {
        RESIZE: 'resize',
      },
    },
  },
}));

let activeCallLog: string[] | null = null;
mock.module('../src/systems/AudioManager', () => ({
  audioManager: {
    init: () => {},
    startMusic: () => {},
    stopMusic: () => {},
    playLaser: () => {
      activeCallLog?.push('audio.playLaser');
    },
    playExplosion: () => {},
    playPlayerHit: () => {},
    playPowerUpPickup: () => {},
    setMusicIntensity: (_intensity: number) => {
      activeCallLog?.push('audio.setMusicIntensity');
    },
  },
}));

mock.module('../src/config/LevelsConfig', () => ({
  getActiveSection: () => ({ id: 'section-1' }),
  getSectionProgress: () => 0.5,
  getTotalLevels: () => 10,
  getLevelConfig: () => ({
    sections: [] as unknown[],
  }),
  isLastLevel: () => false,
}));

const { GameScene } = await import('../src/scenes/GameScene');
const { GAME_SCENE_EVENTS } = await import('../src/systems/GameplayFlow');
type GameSceneInstance = InstanceType<typeof GameScene>;

/**
 * Typed view of private GameScene fields used by the update-gate harness.
 * Prefer this over ad-hoc Record casts so field names stay checked.
 */
type GameSceneTestState = {
  updateHud: () => void;
  gameplayFrameBehavior: GameSceneGameplayFrameBehavior | null;
  updateFrameDelegate: GameSceneFrameDelegate | null;
  inputManager: {
    consumePauseToggleRequest: () => boolean;
    isFiring: () => boolean;
  };
  pauseStateController: {
    togglePauseRequest: (isGameplayLocked: boolean) => void;
    isGameplayPaused: () => boolean;
  };
  flow: {
    isGameplayLocked: () => boolean;
    sampleRespawnTransitionFrame: (delta: number) => void;
    isTerminalTransitionActive: () => boolean;
    getRemainingLives: () => number;
  };
  parallax: {
    update: (delta: number) => void;
    setSectionAtmosphere: (section: unknown, sectionProgress: number) => void;
  };
  player: {
    isAlive: boolean;
    fireRate: number;
    getFireDirection: (out: unknown) => { x: number; y: number };
    getMuzzlePosition: (distance: number, out: unknown) => { x: number; y: number };
    update: (input: unknown) => void;
  };
  lastLifeHelperWing: {
    update: (time: number) => void;
  } | null;
  picketTurrets: {
    update: (time: number) => void;
  } | null;
  grazeSurge: {
    update: () => void;
  };
  waveManager: {
    update: (time: number, delta: number, progress: number) => void;
    updateBossAdds: (time: number) => void;
  };
  levelManager: {
    progress: number;
    hasBossSpawned: () => boolean;
    isComplete: () => boolean;
    update: (delta: number) => void;
    getLevelConfig: () => { sections: unknown[]; music: { stage: string; boss: string } };
    shouldSpawnBoss: () => boolean;
  };
  hud: {
    updateBossHp: (hp: number, maxHp: number) => void;
  };
  boss: unknown;
  lastFireTime: number;
  bulletPool: {
    fire: () => void;
  };
  effectsManager: {
    createMuzzleFlash: (x: number, y: number) => void;
  };
  events: {
    emit: (eventName: string) => void;
  };
  shotDirection: { x: number; y: number };
  shotOrigin: { x: number; y: number };
  muzzleFlashOrigin: { x: number; y: number };
};

function stateOf(scene: GameSceneInstance): GameSceneTestState {
  return scene as unknown as GameSceneTestState;
}

const GAMEPLAY_SYSTEM_CALLS = [
  'parallax.update',
  'player.update',
  'lastLifeHelperWing.update',
  'picketTurrets.update',
  'grazeSurge.update',
  'waveManager.update',
  'levelManager.update',
] as const;

function expectGameplaySystemsSkipped(calls: string[]): void {
  for (const name of GAMEPLAY_SYSTEM_CALLS) {
    expect(calls).not.toContain(name);
  }
}

type UpdateHarness = {
  scene: GameSceneInstance;
  state: GameSceneTestState;
  calls: string[];
  setPaused: (paused: boolean) => void;
  setLocked: (locked: boolean) => void;
  setConsumePauseToggle: (consume: boolean) => void;
  setBossSpawned: (spawned: boolean) => void;
  setShouldSpawnBoss: (shouldSpawn: boolean) => void;
  setLevelComplete: (complete: boolean) => void;
  setBossAddWaves: (enabled: boolean) => void;
};

function createUpdateHarness(): UpdateHarness {
  const scene = Object.create(GameScene.prototype) as GameSceneInstance;
  const state = stateOf(scene);
  const calls: string[] = [];
  activeCallLog = calls;

  let paused = false;
  let locked = false;
  let consumePauseToggle = false;
  let bossSpawned = false;
  let shouldSpawnBoss = false;
  let levelComplete = false;
  let bossAddWaves = false;


  state.updateHud = () => {
    calls.push('updateHud');
  };

  state.inputManager = {
    consumePauseToggleRequest: () => {
      calls.push('consumePauseToggleRequest');
      return consumePauseToggle;
    },
    isFiring: () => false,
  };

  state.pauseStateController = {
    togglePauseRequest: (isGameplayLocked: boolean) => {
      calls.push(`togglePauseRequest:${String(isGameplayLocked)}`);
    },
    isGameplayPaused: () => {
      calls.push('isGameplayPaused');
      return paused;
    },
  };

  state.flow = {
    isGameplayLocked: () => {
      calls.push('isGameplayLocked');
      return locked;
    },
    sampleRespawnTransitionFrame: (_delta: number) => {
      calls.push('sampleRespawnTransitionFrame');
    },
    isTerminalTransitionActive: () => false,
    getRemainingLives: () => 2,
  };

  state.parallax = {
    update: (_delta: number) => {
      calls.push('parallax.update');
    },
    setSectionAtmosphere: (_section: unknown, _sectionProgress: number) => {
      calls.push('parallax.setSectionAtmosphere');
    },
  };

  state.player = {
    isAlive: true,
    fireRate: 100,
    getFireDirection: (_out: unknown) => ({ x: 0, y: -1 }),
    getMuzzlePosition: (_distance: number, _out: unknown) => ({ x: 0, y: 0 }),
    update: (_input: unknown) => {
      calls.push('player.update');
    },
  };

  state.lastLifeHelperWing = {
    update: (_time: number) => {
      calls.push('lastLifeHelperWing.update');
    },
  };

  state.picketTurrets = {
    update: (_time: number) => {
      calls.push('picketTurrets.update');
    },
  };

  state.grazeSurge = {
    update: () => {
      calls.push('grazeSurge.update');
    },
  };

  state.waveManager = {
    update: (_time: number, _delta: number, _progress: number) => {
      calls.push('waveManager.update');
    },
    updateBossAdds: (_time: number) => {
      calls.push('waveManager.updateBossAdds');
    },
  };

  state.levelManager = {
    progress: 0.25,
    hasBossSpawned: () => bossSpawned,
    isComplete: () => levelComplete,
    update: (_delta: number) => {
      calls.push('levelManager.update');
      levelComplete = true;
    },
    getLevelConfig: () => ({
      sections: [],
      music: { stage: 'stage-track', boss: 'boss-track' },
      bossAddWaves,
    }),
    shouldSpawnBoss: () => shouldSpawnBoss,
  };

  state.hud = {
    updateBossHp: (_hp: number, _maxHp: number) => {
      calls.push('hud.updateBossHp');
    },
  };

  state.boss = null;
  state.lastFireTime = 0;
  state.bulletPool = {
    fire: () => {
      calls.push('bulletPool.fire');
    },
  };
  state.effectsManager = {
    createMuzzleFlash: (_x: number, _y: number) => {
      calls.push('effectsManager.createMuzzleFlash');
    },
  };

  state.events = {
    emit: (eventName: string) => {
      calls.push(`emit:${eventName}`);
    },
  };

  // createGameplayFrameBehavior closes over these vectors.
  state.shotDirection = { x: 0, y: 0 };
  state.shotOrigin = { x: 0, y: 0 };
  state.muzzleFlashOrigin = { x: 0, y: 0 };

  return {
    scene,
    state,
    calls,
    setPaused: (nextPaused: boolean) => {
      paused = nextPaused;
    },
    setLocked: (nextLocked: boolean) => {
      locked = nextLocked;
    },
    setConsumePauseToggle: (nextConsume: boolean) => {
      consumePauseToggle = nextConsume;
    },
    setBossSpawned: (nextSpawned: boolean) => {
      bossSpawned = nextSpawned;
    },
    setShouldSpawnBoss: (nextShouldSpawn: boolean) => {
      shouldSpawnBoss = nextShouldSpawn;
    },
    setLevelComplete: (nextComplete: boolean) => {
      levelComplete = nextComplete;
    },
    setBossAddWaves: (enabled: boolean) => {
      bossAddWaves = enabled;
    },
  };
}

describe('GameScene update gate regression coverage', () => {
  test('runs pause toggle before pause/lock gating', () => {
    const harness = createUpdateHarness();
    harness.setConsumePauseToggle(true);
    harness.setPaused(true);

    harness.scene.update(1000, 16);

    expect(harness.calls.slice(0, 4)).toEqual([
      'consumePauseToggleRequest',
      'isGameplayLocked',
      'togglePauseRequest:false',
      'isGameplayPaused',
    ]);
  });

  test('paused frame samples respawn + updates HUD and skips gameplay systems', () => {
    const harness = createUpdateHarness();
    harness.setPaused(true);

    harness.scene.update(1000, 16);

    expect(harness.calls).toContain('sampleRespawnTransitionFrame');
    expect(harness.calls).toContain('updateHud');
    expectGameplaySystemsSkipped(harness.calls);
  });

  test('locked frame uses same early-return path as paused frames', () => {
    const harness = createUpdateHarness();
    harness.setLocked(true);

    harness.scene.update(1000, 16);

    expect(harness.calls).toContain('sampleRespawnTransitionFrame');
    expect(harness.calls).toContain('updateHud');
    expectGameplaySystemsSkipped(harness.calls);
  });

  test('active gameplay frame preserves update ordering and progression event timing', () => {
    const harness = createUpdateHarness();
    harness.setPaused(false);
    harness.setLocked(false);
    harness.setBossSpawned(false);
    harness.setShouldSpawnBoss(true);
    harness.setLevelComplete(false);

    harness.scene.update(2000, 16);

    expect(harness.calls.indexOf('parallax.update')).toBeLessThan(harness.calls.indexOf('player.update'));
    expect(harness.calls.indexOf('player.update')).toBeLessThan(harness.calls.indexOf('lastLifeHelperWing.update'));
    expect(harness.calls.indexOf('lastLifeHelperWing.update')).toBeLessThan(harness.calls.indexOf('picketTurrets.update'));
    expect(harness.calls).toContain('waveManager.update');

    const levelUpdateIndex = harness.calls.indexOf('levelManager.update');
    const setMusicIntensityIndex = harness.calls.indexOf('audio.setMusicIntensity');
    const setAtmosphereIndex = harness.calls.indexOf('parallax.setSectionAtmosphere');
    const bossEmitIndex = harness.calls.indexOf(`emit:${GAME_SCENE_EVENTS.bossSpawn}`);
    const levelCompleteEmitIndex = harness.calls.indexOf(`emit:${GAME_SCENE_EVENTS.levelComplete}`);
    const hudIndex = harness.calls.lastIndexOf('updateHud');

    expect(setMusicIntensityIndex).toBeGreaterThan(levelUpdateIndex);
    expect(setAtmosphereIndex).toBeGreaterThan(setMusicIntensityIndex);
    expect(bossEmitIndex).toBeGreaterThan(setAtmosphereIndex);
    expect(levelCompleteEmitIndex).toBeGreaterThan(setAtmosphereIndex);
    expect(hudIndex).toBe(harness.calls.length - 1);
  });

  test('reuses a stable update-frame delegate across consecutive frames', () => {
    const harness = createUpdateHarness();

    harness.scene.update(1000, 16);
    const firstDelegate = harness.state.updateFrameDelegate;
    const firstBehavior = harness.state.gameplayFrameBehavior;

    harness.scene.update(1016, 16);
    const secondDelegate = harness.state.updateFrameDelegate;
    const secondBehavior = harness.state.gameplayFrameBehavior;

    expect(firstDelegate).not.toBeNull();
    expect(firstBehavior).not.toBeNull();
    expect(secondDelegate).toBe(firstDelegate);
    expect(secondBehavior).toBe(firstBehavior);
  });

  test('re-materializes gameplay frame behavior when only the outer delegate remains', () => {
    const harness = createUpdateHarness();

    harness.scene.update(1000, 16);
    const cachedDelegate = harness.state.updateFrameDelegate;
    expect(cachedDelegate).not.toBeNull();

    harness.state.gameplayFrameBehavior = null;
    harness.scene.update(1016, 16);

    expect(harness.state.updateFrameDelegate).toBe(cachedDelegate);
    expect(harness.state.gameplayFrameBehavior).not.toBeNull();
    expect(harness.calls).toContain('parallax.update');
  });

  test('reads lastLifeHelperWing live so mid-run replacement is visible to a cached behavior', () => {
    const harness = createUpdateHarness();

    harness.scene.update(1000, 16);
    expect(harness.calls).toContain('lastLifeHelperWing.update');

    const replacementCalls: string[] = [];
    harness.state.lastLifeHelperWing = {
      update: (_time: number) => {
        replacementCalls.push('replacementHelperWing.update');
      },
    };

    harness.calls.length = 0;
    harness.scene.update(1016, 16);

    expect(harness.calls).not.toContain('lastLifeHelperWing.update');
    expect(replacementCalls).toEqual(['replacementHelperWing.update']);
  });

  test('wave update is skipped after boss has spawned', () => {
    const harness = createUpdateHarness();
    harness.setBossSpawned(true);

    harness.scene.update(2000, 16);

    expect(harness.calls).not.toContain('waveManager.update');
    expect(harness.calls).not.toContain('waveManager.updateBossAdds');
    expect(harness.calls).toContain('levelManager.update');
    expect(harness.calls).toContain('updateHud');
  });

  test('boss add-waves tick after boss spawn when the level enables them', () => {
    const harness = createUpdateHarness();
    harness.setBossSpawned(true);
    harness.setBossAddWaves(true);

    harness.scene.update(2000, 16);

    expect(harness.calls).not.toContain('waveManager.update');
    expect(harness.calls).toContain('waveManager.updateBossAdds');
  });
});
