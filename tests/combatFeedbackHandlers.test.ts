import { describe, expect, mock, test } from 'bun:test';

const { audioManager } = await import('../src/systems/AudioManager');
const playSfx = mock();
const startMusic = mock();
Object.assign(audioManager, {
  playSfx,
  startMusic,
  stopMusic: mock(),
});
const trySpawnRandomPowerUp = mock();
const spawnGuaranteedPowerUp = mock();
const spawnPowerUp = mock(
  (
    group: { getFirstDead?: (createIfNull: boolean) => unknown; get?: (x: number, y: number) => unknown },
    x: number,
    y: number,
    type: string
  ) => {
    const powerUp = (group.getFirstDead?.(false) ?? group.get?.(x, y)) as {
      spawn?: (spawnX: number, spawnY: number, powerUpType: string) => void;
    } | null;
    powerUp?.spawn?.(x, y, type);
  }
);
mock.module('../src/systems/GameplayFlow', () => ({
  trySpawnRandomPowerUp,
  spawnGuaranteedPowerUp,
  spawnPowerUp,
  applyPowerUpPickup: mock(),
  GAME_SCENE_EVENTS: {
    enemyDeath: 'enemy-death',
    playerDeath: 'player-death',
    playerFatalHit: 'player-fatal-hit',
    levelComplete: 'level-complete',
    bossSpawn: 'boss-spawn',
    playerHit: 'player-hit',
    playerExhaust: 'player-exhaust',
    enemySpawnWarning: 'enemy-spawn-warning',
    bossDeath: 'boss-death',
    bossPhaseChange: 'boss-phase-change',
    helperWingActivated: 'helper-wing-activated',
    helperWingDepleted: 'helper-wing-depleted',
    playerBulletTrail: 'player-bullet-trail',
    enemyBulletTrail: 'enemy-bullet-trail',
    picketOnline: 'picket-online',
  },
  TERMINAL_TRANSITIONS: {
    none: 'none',
    playerDeath: 'player-death',
    levelComplete: 'level-complete',
  },
}));
mock.module('../src/utils/layout', () => ({
  getViewportBounds: () => ({ centerX: 400 }),
  stereoPan: () => 0,
  getViewportLayout: () => ({ left: 0, width: 800, centerX: 400 }),
  getGameplayBounds: () => ({
    left: 0,
    top: 0,
    width: 1280,
    height: 720,
    right: 1280,
    bottom: 720,
    centerX: 640,
    centerY: 360,
  }),
  getActiveGameplayBounds: () => ({
    left: 0,
    top: 0,
    width: 1280,
    height: 720,
    right: 1280,
    bottom: 720,
    centerX: 640,
    centerY: 360,
  }),
  centerHorizontally: (layout: { left: number; width: number }, width: number) =>
    layout.left + (layout.width - width) / 2,
}));
mock.module('phaser', () => ({
  default: {
    Physics: {
      Arcade: {
        Body: class {},
      },
    },
  },
}));

const { createGameSceneCombatFeedbackHandlers } = await import('../src/scenes/gameScene/combatFeedbackHandlers');
const { runBestEffort } = await import('../src/utils/runBestEffort');
const { HIT_STOP_MS } = await import('../src/systems/HitStop');

describe('runBestEffort', () => {
  test('swallows effect errors', () => {
    let called = false;

    expect(() => {
      runBestEffort(() => {
        called = true;
        throw new Error('boom');
      });
    }).not.toThrow();

    expect(called).toBe(true);
  });
});

type PlayerDeathOutcome = {
  status: 'respawn-started' | 'game-over-started' | 'ignored-terminal-active';
  levelCompleteQueued: boolean;
  remainingLives: number;
};

function createCombatFeedbackHarness(
  options: {
    late?: 'overdrive' | 'bulwark' | 'salvager';
    playerDeathOutcome?: PlayerDeathOutcome;
    boss?: { x: number; y: number } | null;
    persistHelperWingState?: () => void;
    suspendForTransition?: () => void;
    suspendPicketsForTransition?: () => void;
    queueLevelComplete?: () => void;
    registerKill?: (score: number) => number;
    enemies?: unknown[];
    spawnedBoss?: unknown;
  } = {}
) {
  const onPlayerHit = mock();
  const player = {
    x: 24,
    y: 48,
    playDeathAnimation: mock(),
  };
  const clearBulletsAround = mock(() => 3);
  const flowContext = { id: 'flow-context' };
  const handlePlayerDeath = mock(
    () =>
      options.playerDeathOutcome ?? {
        status: 'respawn-started',
        levelCompleteQueued: false,
        remainingLives: 1,
      }
  );
  const queueLevelComplete = mock(() => options.queueLevelComplete?.());
  const createExplosion = mock();
  const createScorePopup = mock();
  const createFastKillPopup = mock();
  const addScore = mock();
  const registerKill = mock(options.registerKill ?? ((score: number) => score));
  const hideBossBar = mock();
  const markBossDefeated = mock();
  const setBoss = mock();
  const persistHelperWingState = mock(() => options.persistHelperWingState?.());
  const suspendForTransition = mock(() => options.suspendForTransition?.());
  const suspendPicketsForTransition = mock(() => options.suspendPicketsForTransition?.());
  const syncLastLifeHelperWingState = mock();
  const markBossSpawned = mock();
  const clearPlayerHazards = mock();
  const showBossWarning = mock();
  const showBossBar = mock();
  const hitStop = mock();

  const handlers = createGameSceneCombatFeedbackHandlers({
    scene: {
      cameras: {
        main: {
          flash: mock(),
          shake: mock(),
        },
      },
      time: { now: 1000 },
    } as never,
    player: player as never,
    getShipSystems: () => ({ gun: null, support: null, late: options.late ?? null }),
    scoreManager: {
      addScore,
      registerKill,
      onPlayerHit,
      onPlayerDeath: mock(),
    } as never,
    effectsManager: {
      createScorePopup,
      createFastKillPopup,
      createExplosion,
      createSurgePulse: mock(),
      pulseCameraColor: mock(),
    } as never,
    flow: {
      handlePlayerDeath,
      isPlayerDeathTransitionActive: mock(() => false),
      queueLevelComplete,
    } as never,
    getFlowContext: () => flowContext as never,
    levelManager: {
      markBossDefeated,
      markBossSpawned,
      getLevelConfig: () => ({ boss: { name: 'Dreadnova' }, music: { boss: 'boss-track' } }),
    } as never,
    collisionManager: { clearPlayerHazards } as never,
    waveManager: { applyDeathRelief: mock() } as never,
    grazeSurge: { clearBulletsAround, setBossActive: mock() } as never,
    enemyPool: { getAllEnemies: () => options.enemies ?? [], spawnBoss: mock(() => options.spawnedBoss) } as never,
    hud: {
      showBossWarning,
      showBossBar,
      hideBossBar,
      showBossPhaseAnnouncement: mock(),
      showHelperWingAnnouncement: mock(),
      showHelperWingDepletedAnnouncement: mock(),
    } as never,
    getBoss: () => (options.boss ?? null) as never,
    setBoss,
    lastLifeHelperWing: { suspendForTransition } as never,
    picketTurrets: { suspendForTransition: suspendPicketsForTransition } as never,
    powerUpGroup: { id: 'powerups' } as never,
    persistHelperWingState,
    syncLastLifeHelperWingState,
    getGameplayNow: () => 1000,
    hitStop,
    constants: {
      bossExplosionVisualIntensity: 3,
      playerDeathExplosionVisualIntensity: 2.2,
      playerDeathParticleBudgetScale: 0.6,
    },
  });

  return {
    hitStop,
    clearBulletsAround,
    handlers,
    onPlayerHit,
    player,
    flowContext,
    handlePlayerDeath,
    queueLevelComplete,
    createExplosion,
    createScorePopup,
    createFastKillPopup,
    addScore,
    registerKill,
    hideBossBar,
    markBossDefeated,
    setBoss,
    persistHelperWingState,
    suspendForTransition,
    suspendPicketsForTransition,
    syncLastLifeHelperWingState,
    markBossSpawned,
    clearPlayerHazards,
    showBossWarning,
    showBossBar,
  };
}

describe('createGameSceneCombatFeedbackHandlers', () => {
  test('shield and hull cues differ while both preserve the existing score penalty', () => {
    const harness = createCombatFeedbackHarness();
    harness.handlers.handlePlayerHit({ outcome: 'absorbed', source: 'mine', hullDamage: 0 });
    expect(playSfx).toHaveBeenLastCalledWith('hitShield');
    // A shield block keeps the flow; a hull hit holds for a moment.
    expect(harness.hitStop).not.toHaveBeenCalled();
    harness.handlers.handlePlayerHit({ outcome: 'damaged', source: 'beam', hullDamage: 1.25 });
    expect(playSfx).toHaveBeenLastCalledWith('hitHull');
    expect(harness.hitStop).toHaveBeenCalledWith(HIT_STOP_MS.playerHullHit);
    expect(harness.onPlayerHit).toHaveBeenCalledTimes(2);
  });

  test('handleEnemyDeath adds score, shows popup, plays explosion, and tries dropping a power-up', () => {
    playSfx.mockClear();
    trySpawnRandomPowerUp.mockClear();
    spawnGuaranteedPowerUp.mockClear();
    const harness = createCombatFeedbackHarness();

    harness.handlers.handleEnemyDeath(500, 12, 34);

    expect(harness.registerKill).toHaveBeenCalledWith(500, 1000);
    expect(harness.createScorePopup).toHaveBeenCalledWith(12, 34, 500);
    expect(playSfx).toHaveBeenCalledWith('explosionSmall', expect.any(Number));
    expect(trySpawnRandomPowerUp).toHaveBeenCalledWith({ id: 'powerups' }, 12, 34);
    expect(spawnGuaranteedPowerUp).not.toHaveBeenCalled();
    expect(harness.hitStop).not.toHaveBeenCalled();
  });

  test('handleEnemyDeath grants a marked ace exactly one guaranteed drop and skips the random roll', () => {
    trySpawnRandomPowerUp.mockClear();
    spawnGuaranteedPowerUp.mockClear();
    const harness = createCombatFeedbackHarness({ registerKill: (score) => score * 4 });

    harness.handlers.handleEnemyDeath(1000, 12, 34, true);

    expect(harness.registerKill).toHaveBeenCalledWith(1000, 1000);
    expect(harness.createScorePopup).toHaveBeenCalledWith(12, 34, 4000);
    expect(spawnGuaranteedPowerUp).toHaveBeenCalledTimes(1);
    expect(spawnGuaranteedPowerUp).toHaveBeenCalledWith({ id: 'powerups' }, 12, 34);
    expect(trySpawnRandomPowerUp).not.toHaveBeenCalled();
    expect(harness.hitStop).toHaveBeenCalledWith(HIT_STOP_MS.aceKill);
  });

  test('handlePlayerDeath syncs helper wing after an ordinary gameplay respawn starts', () => {
    playSfx.mockClear();
    const harness = createCombatFeedbackHarness({
      playerDeathOutcome: {
        status: 'respawn-started',
        levelCompleteQueued: false,
        remainingLives: 1,
      },
    });

    harness.handlers.handlePlayerDeath({ outcome: 'fatal', source: 'unknown', hullDamage: 1 });

    expect(harness.player.playDeathAnimation).toHaveBeenCalledTimes(1);
    expect(playSfx).toHaveBeenCalledWith('explosionLarge', expect.any(Number));
    expect(harness.createExplosion).toHaveBeenCalledWith(24, 48, 2.2, 0.6);
    expect(harness.handlePlayerDeath).toHaveBeenCalledWith(harness.flowContext, 'unknown');
    expect(harness.syncLastLifeHelperWingState).toHaveBeenCalledTimes(1);
  });

  test('handlePlayerDeath suppresses helper wing sync when level completion remains queued', () => {
    const harness = createCombatFeedbackHarness({
      playerDeathOutcome: {
        status: 'respawn-started',
        levelCompleteQueued: true,
        remainingLives: 1,
      },
    });

    harness.handlers.handlePlayerDeath({ outcome: 'fatal', source: 'unknown', hullDamage: 1 });

    expect(harness.handlePlayerDeath).toHaveBeenCalledWith(harness.flowContext, 'unknown');
    expect(harness.syncLastLifeHelperWingState).not.toHaveBeenCalled();
  });

  test('handlePlayerDeath suppresses helper wing sync for game-over and active-terminal outcomes', () => {
    const gameOverHarness = createCombatFeedbackHarness({
      playerDeathOutcome: {
        status: 'game-over-started',
        levelCompleteQueued: false,
        remainingLives: 0,
      },
    });
    const terminalHarness = createCombatFeedbackHarness({
      playerDeathOutcome: {
        status: 'ignored-terminal-active',
        levelCompleteQueued: false,
        remainingLives: 1,
      },
    });

    gameOverHarness.handlers.handlePlayerDeath({ outcome: 'fatal', source: 'unknown', hullDamage: 1 });
    playSfx.mockClear();
    terminalHarness.handlers.handlePlayerDeath({ outcome: 'fatal', source: 'unknown', hullDamage: 1 });

    expect(gameOverHarness.syncLastLifeHelperWingState).not.toHaveBeenCalled();
    expect(terminalHarness.syncLastLifeHelperWingState).not.toHaveBeenCalled();
    expect(terminalHarness.handlePlayerDeath).toHaveBeenCalledWith(terminalHarness.flowContext, 'unknown');
    expect(terminalHarness.player.playDeathAnimation).not.toHaveBeenCalled();
    expect(terminalHarness.createExplosion).not.toHaveBeenCalled();
    expect(playSfx).not.toHaveBeenCalled();
  });

  test('handleBossDeath persists, suspends, then queues level completion', () => {
    playSfx.mockClear();
    const order: string[] = [];
    const harness = createCombatFeedbackHarness({
      boss: { x: 320, y: 96 },
      persistHelperWingState: () => order.push('persist'),
      suspendForTransition: () => order.push('suspend'),
      suspendPicketsForTransition: () => order.push('suspend-pickets'),
      queueLevelComplete: () => order.push('queue'),
    });

    harness.handlers.handleBossDeath(2000, 320, 96, 0);

    expect(harness.createExplosion).toHaveBeenCalledWith(320, 96, 3);
    expect(playSfx).toHaveBeenCalledWith('explosionBoss', expect.any(Number));
    expect(harness.hideBossBar).toHaveBeenCalledTimes(1);
    expect(harness.setBoss).toHaveBeenCalledWith(null);
    expect(harness.markBossDefeated).toHaveBeenCalledTimes(1);
    expect(order).toEqual(['persist', 'suspend', 'suspend-pickets', 'queue']);
    expect(harness.persistHelperWingState).toHaveBeenCalledTimes(1);
    expect(harness.suspendForTransition).toHaveBeenCalledTimes(1);
    expect(harness.suspendPicketsForTransition).toHaveBeenCalledTimes(1);
    expect(harness.queueLevelComplete).toHaveBeenCalledWith(harness.flowContext);
    expect(harness.addScore).not.toHaveBeenCalled();
    expect(harness.createFastKillPopup).not.toHaveBeenCalled();
  });

  test('a boss killed under par adds its fast-kill bonus to the score and shows it', () => {
    const harness = createCombatFeedbackHarness({ boss: { x: 320, y: 96 } });

    harness.handlers.handleBossDeath(2000, 320, 96, 1800);

    expect(harness.addScore).toHaveBeenCalledWith(1800);
    expect(harness.createFastKillPopup).toHaveBeenCalledWith(320, 130, 1800);
  });

  test('handleBossSpawn clears hazards, hides active enemies, starts boss music, and shows the boss bar', () => {
    startMusic.mockClear();
    const boss = { setPlayer: mock() };
    const activeEnemy = {
      active: true,
      body: { enable: true },
      despawn() {
        this.active = false;
        this.body.enable = false;
      },
    };
    const inactiveEnemy = { active: false, body: { enable: false }, despawn: mock() };
    const harness = createCombatFeedbackHarness({ enemies: [activeEnemy, inactiveEnemy], spawnedBoss: boss });

    harness.handlers.handleBossSpawn();

    expect(harness.markBossSpawned).toHaveBeenCalledTimes(1);
    expect(harness.clearPlayerHazards).toHaveBeenCalledTimes(1);
    expect(activeEnemy.active).toBe(false);
    expect(activeEnemy.body.enable).toBe(false);
    expect(inactiveEnemy.despawn).not.toHaveBeenCalled();
    expect(inactiveEnemy.active).toBe(false);
    expect(inactiveEnemy.body.enable).toBe(false);
    expect(harness.showBossWarning).toHaveBeenCalledTimes(1);
    expect(startMusic).toHaveBeenCalledWith('boss-track');
    expect(boss.setPlayer).toHaveBeenCalledWith(harness.player);
    expect(harness.setBoss).toHaveBeenCalledWith(boss);
    expect(harness.showBossBar).toHaveBeenCalledWith('Dreadnova');
  });

  test('Bulwark clears nearby shots when a shield absorbs a hit, and only then', () => {
    const plain = createCombatFeedbackHarness();
    plain.handlers.handlePlayerHit({ outcome: 'absorbed', source: 'mine', hullDamage: 0 });
    expect(plain.clearBulletsAround).not.toHaveBeenCalled();

    const bulwark = createCombatFeedbackHarness({ late: 'bulwark' });
    bulwark.handlers.handlePlayerHit({ outcome: 'damaged', source: 'beam', hullDamage: 1 });
    expect(bulwark.clearBulletsAround).not.toHaveBeenCalled();
    bulwark.handlers.handlePlayerHit({ outcome: 'absorbed', source: 'mine', hullDamage: 0 });
    expect(bulwark.clearBulletsAround).toHaveBeenCalledTimes(1);
  });

  test('Salvager makes an ace drop two pickups', () => {
    spawnGuaranteedPowerUp.mockClear();
    const harness = createCombatFeedbackHarness({ late: 'salvager' });
    harness.handlers.handleEnemyDeath(1000, 12, 34, true);
    expect(spawnGuaranteedPowerUp).toHaveBeenCalledTimes(2);
  });
});
