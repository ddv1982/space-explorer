import { describe, expect, mock, test } from 'bun:test';

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
    sections: [],
  }),
  isLastLevel: () => false,
}));
const { GameScene } = await import('../src/scenes/GameScene');
const { GAME_SCENE_EVENTS } = await import('../src/systems/GameplayFlow');

type UpdateHarness = {
  scene: GameScene;
  calls: string[];
  setPaused: (paused: boolean) => void;
  setLocked: (locked: boolean) => void;
  setConsumePauseToggle: (consume: boolean) => void;
  setBossSpawned: (spawned: boolean) => void;
  setShouldSpawnBoss: (shouldSpawn: boolean) => void;
  setLevelComplete: (complete: boolean) => void;
};

function createUpdateHarness(): UpdateHarness {
  const scene = Object.create(GameScene.prototype) as GameScene;
  const calls: string[] = [];
  activeCallLog = calls;

  let paused = false;
  let locked = false;
  let consumePauseToggle = false;
  let bossSpawned = false;
  let shouldSpawnBoss = false;
  let levelComplete = false;

  (scene as unknown as Record<string, unknown>).syncViewportIfNeeded = () => {
    calls.push('syncViewportIfNeeded');
  };

  (scene as unknown as Record<string, unknown>).updateHud = () => {
    calls.push('updateHud');
  };

  (scene as unknown as Record<string, unknown>).inputManager = {
    consumePauseToggleRequest: () => {
      calls.push('consumePauseToggleRequest');
      return consumePauseToggle;
    },
    isFiring: () => false,
  };

  (scene as unknown as Record<string, unknown>).pauseStateController = {
    togglePauseRequest: (isGameplayLocked: boolean) => {
      calls.push(`togglePauseRequest:${String(isGameplayLocked)}`);
    },
    isGameplayPaused: () => {
      calls.push('isGameplayPaused');
      return paused;
    },
  };

  (scene as unknown as Record<string, unknown>).flow = {
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

  (scene as unknown as Record<string, unknown>).parallax = {
    update: (_delta: number) => {
      calls.push('parallax.update');
    },
    setSectionAtmosphere: (_section: unknown, _sectionProgress: number) => {
      calls.push('parallax.setSectionAtmosphere');
    },
  };

  (scene as unknown as Record<string, unknown>).player = {
    isAlive: true,
    fireRate: 100,
    getFireDirection: (_out: unknown) => ({ x: 0, y: -1 }),
    getMuzzlePosition: (_distance: number, _out: unknown) => ({ x: 0, y: 0 }),
    update: (_input: unknown) => {
      calls.push('player.update');
    },
  };

  (scene as unknown as Record<string, unknown>).lastLifeHelperWing = {
    update: (_time: number) => {
      calls.push('lastLifeHelperWing.update');
    },
  };

  (scene as unknown as Record<string, unknown>).waveManager = {
    update: (_time: number, _delta: number, _progress: number) => {
      calls.push('waveManager.update');
    },
  };

  (scene as unknown as Record<string, unknown>).levelManager = {
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
    }),
    shouldSpawnBoss: () => shouldSpawnBoss,
  };

  (scene as unknown as Record<string, unknown>).hud = {
    updateBossHp: (_hp: number, _maxHp: number) => {
      calls.push('hud.updateBossHp');
    },
  };

  (scene as unknown as Record<string, unknown>).boss = null;
  (scene as unknown as Record<string, unknown>).lastFireTime = 0;
  (scene as unknown as Record<string, unknown>).bulletPool = {
    fire: () => {
      calls.push('bulletPool.fire');
    },
  };
  (scene as unknown as Record<string, unknown>).effectsManager = {
    createMuzzleFlash: (_x: number, _y: number) => {
      calls.push('effectsManager.createMuzzleFlash');
    },
  };

  (scene as unknown as Record<string, unknown>).events = {
    emit: (eventName: string) => {
      calls.push(`emit:${eventName}`);
    },
  };

  return {
    scene,
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
  };
}

describe('GameScene update gate regression coverage', () => {
  test('runs viewport sync before pause handling and pause toggle before pause/lock gating', () => {
    const harness = createUpdateHarness();
    harness.setConsumePauseToggle(true);
    harness.setPaused(true);

    harness.scene.update(1000, 16);

    expect(harness.calls.slice(0, 5)).toEqual([
      'syncViewportIfNeeded',
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
    expect(harness.calls).not.toContain('parallax.update');
    expect(harness.calls).not.toContain('player.update');
    expect(harness.calls).not.toContain('lastLifeHelperWing.update');
    expect(harness.calls).not.toContain('waveManager.update');
    expect(harness.calls).not.toContain('levelManager.update');
  });

  test('locked frame uses same early-return path as paused frames', () => {
    const harness = createUpdateHarness();
    harness.setLocked(true);

    harness.scene.update(1000, 16);

    expect(harness.calls).toContain('sampleRespawnTransitionFrame');
    expect(harness.calls).toContain('updateHud');
    expect(harness.calls).not.toContain('parallax.update');
    expect(harness.calls).not.toContain('player.update');
    expect(harness.calls).not.toContain('waveManager.update');
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

  test('wave update is skipped after boss has spawned', () => {
    const harness = createUpdateHarness();
    harness.setBossSpawned(true);

    harness.scene.update(2000, 16);

    expect(harness.calls).not.toContain('waveManager.update');
    expect(harness.calls).toContain('levelManager.update');
    expect(harness.calls).toContain('updateHud');
  });
});
