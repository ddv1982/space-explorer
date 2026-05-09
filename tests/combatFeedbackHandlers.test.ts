import { describe, expect, mock, test } from 'bun:test';

const audioManager = {
  playExplosion: mock(),
  startMusic: mock(),
  stopMusic: mock(),
  playPlayerHit: mock(),
  playPowerUpPickup: mock(),
};
mock.module('../src/systems/AudioManager', () => ({ audioManager }));
const trySpawnRandomPowerUp = mock();
mock.module('../src/systems/GameplayFlow', () => ({
  trySpawnRandomPowerUp,
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
  },
  TERMINAL_TRANSITIONS: {
    none: 'none',
    playerDeath: 'player-death',
    levelComplete: 'level-complete',
  },
}));
mock.module('../src/utils/layout', () => ({
  getViewportBounds: () => ({ centerX: 400 }),
  getViewportLayout: () => ({ left: 0, width: 800, centerX: 400 }),
  getGameplayBounds: () => ({ left: 0, top: 0, width: 1280, height: 720, right: 1280, bottom: 720, centerX: 640, centerY: 360 }),
  getActiveGameplayBounds: () => ({ left: 0, top: 0, width: 1280, height: 720, right: 1280, bottom: 720, centerX: 640, centerY: 360 }),
  centerHorizontally: (layout: { left: number; width: number }, width: number) => layout.left + (layout.width - width) / 2,
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

const { createGameSceneCombatFeedbackHandlers, runBestEffort } = await import('../src/scenes/gameScene/combatFeedbackHandlers');

describe('runBestEffort', () => {
  test('runs the provided effect', () => {
    let called = false;

    runBestEffort(() => {
      called = true;
    });

    expect(called).toBe(true);
  });

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

function createCombatFeedbackHarness(options: {
  playerDeathOutcome?: PlayerDeathOutcome;
  boss?: { x: number; y: number } | null;
  persistHelperWingState?: () => void;
  suspendForTransition?: () => void;
  queueLevelComplete?: () => void;
} = {}) {
  const player = {
    x: 24,
    y: 48,
    playDeathAnimation: mock(),
  };
  const flowContext = { id: 'flow-context' };
  const handlePlayerDeath = mock(() =>
    options.playerDeathOutcome ?? {
      status: 'respawn-started',
      levelCompleteQueued: false,
      remainingLives: 1,
    }
  );
  const queueLevelComplete = mock(() => options.queueLevelComplete?.());
  const createExplosion = mock();
  const hideBossBar = mock();
  const markBossDefeated = mock();
  const setBoss = mock();
  const persistHelperWingState = mock(() => options.persistHelperWingState?.());
  const suspendForTransition = mock(() => options.suspendForTransition?.());
  const syncLastLifeHelperWingState = mock();

  const handlers = createGameSceneCombatFeedbackHandlers({
    scene: {
      cameras: {
        main: {
          flash: mock(),
          shake: mock(),
        },
      },
    } as never,
    player: () => player as never,
    scoreManager: () => ({ addScore: mock() } as never),
    effectsManager: () => ({
      createScorePopup: mock(),
      createExplosion,
      pulseCameraColor: mock(),
    } as never),
    flow: () => ({
      handlePlayerDeath,
      isPlayerDeathTransitionActive: mock(() => false),
      queueLevelComplete,
    } as never),
    getFlowContext: () => flowContext as never,
    levelManager: () => ({
      markBossDefeated,
      getLevelConfig: () => ({ music: { boss: 'boss-track' } }),
    } as never),
    collisionManager: () => ({ clearPlayerHazards: mock() } as never),
    enemyPool: () => ({ getAllEnemies: () => [], spawnBoss: mock() } as never),
    hud: () => ({
      showBossWarning: mock(),
      showBossBar: mock(),
      hideBossBar,
      showBossPhaseAnnouncement: mock(),
      showHelperWingAnnouncement: mock(),
      showHelperWingDepletedAnnouncement: mock(),
    } as never),
    getBoss: () => (options.boss ?? null) as never,
    setBoss,
    getScaledBossConfig: () => null,
    getLastLifeHelperWing: () => ({ suspendForTransition } as never),
    powerUpGroup: () => ({ id: 'powerups' } as never),
    persistHelperWingState,
    syncLastLifeHelperWingState,
    constants: {
      bossExplosionVisualIntensity: 3,
      bossExplosionAudioIntensity: 2,
      playerDeathExplosionVisualIntensity: 2.2,
      playerDeathExplosionAudioIntensity: 1.4,
      playerDeathParticleBudgetScale: 0.6,
    },
  });

  return {
    handlers,
    player,
    flowContext,
    handlePlayerDeath,
    queueLevelComplete,
    createExplosion,
    hideBossBar,
    markBossDefeated,
    setBoss,
    persistHelperWingState,
    suspendForTransition,
    syncLastLifeHelperWingState,
  };
}

describe('createGameSceneCombatFeedbackHandlers', () => {
  test('handleEnemyDeath adds score, shows popup, plays explosion, and tries dropping a power-up', () => {
    audioManager.playExplosion.mockClear();
    trySpawnRandomPowerUp.mockClear();
    const addScore = mock();
    const createScorePopup = mock();

    const handlers = createGameSceneCombatFeedbackHandlers({
      scene: { cameras: { main: {} } } as never,
      player: () => ({ x: 0, y: 0 } as never),
      scoreManager: () => ({ addScore } as never),
      effectsManager: () => ({ createScorePopup } as never),
      flow: () => ({
        handlePlayerDeath: mock(),
        isPlayerDeathTransitionActive: mock(() => false),
        queueLevelComplete: mock(),
      } as never),
      getFlowContext: () => ({}) as never,
      levelManager: () => ({ getLevelConfig: () => ({ music: { boss: 'boss-track' } }) } as never),
      collisionManager: () => ({ clearPlayerHazards: mock() } as never),
      enemyPool: () => ({ getAllEnemies: () => [] } as never),
      hud: () => ({ showBossWarning: mock(), hideBossBar: mock() } as never),
      getBoss: () => null,
      setBoss: mock(),
      getScaledBossConfig: () => null,
      getLastLifeHelperWing: () => null,
      powerUpGroup: () => ({ id: 'powerups' } as never),
      persistHelperWingState: mock(),
      syncLastLifeHelperWingState: mock(),
      constants: {
        bossExplosionVisualIntensity: 3,
        bossExplosionAudioIntensity: 2,
        playerDeathExplosionVisualIntensity: 2.2,
        playerDeathExplosionAudioIntensity: 1.4,
        playerDeathParticleBudgetScale: 0.6,
      },
    });

    handlers.handleEnemyDeath(500, 12, 34);

    expect(addScore).toHaveBeenCalledWith(500);
    expect(createScorePopup).toHaveBeenCalledWith(12, 34, 500);
    expect(audioManager.playExplosion).toHaveBeenCalledWith(0.5);
    expect(trySpawnRandomPowerUp).toHaveBeenCalledWith({ id: 'powerups' }, 12, 34);
  });

  test('handlePlayerDeath syncs helper wing after an ordinary gameplay respawn starts', () => {
    audioManager.playExplosion.mockClear();
    const harness = createCombatFeedbackHarness({
      playerDeathOutcome: {
        status: 'respawn-started',
        levelCompleteQueued: false,
        remainingLives: 1,
      },
    });

    harness.handlers.handlePlayerDeath();

    expect(harness.player.playDeathAnimation).toHaveBeenCalledTimes(1);
    expect(audioManager.playExplosion).toHaveBeenCalledWith(1.4);
    expect(harness.createExplosion).toHaveBeenCalledWith(24, 48, 2.2, 0.6);
    expect(harness.handlePlayerDeath).toHaveBeenCalledWith(harness.flowContext);
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

    harness.handlers.handlePlayerDeath();

    expect(harness.handlePlayerDeath).toHaveBeenCalledWith(harness.flowContext);
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

    gameOverHarness.handlers.handlePlayerDeath();
    audioManager.playExplosion.mockClear();
    terminalHarness.handlers.handlePlayerDeath();

    expect(gameOverHarness.syncLastLifeHelperWingState).not.toHaveBeenCalled();
    expect(terminalHarness.syncLastLifeHelperWingState).not.toHaveBeenCalled();
    expect(terminalHarness.handlePlayerDeath).toHaveBeenCalledWith(terminalHarness.flowContext);
    expect(terminalHarness.player.playDeathAnimation).not.toHaveBeenCalled();
    expect(terminalHarness.createExplosion).not.toHaveBeenCalled();
    expect(audioManager.playExplosion).not.toHaveBeenCalled();
  });

  test('handleBossDeath persists, suspends, then queues level completion', () => {
    audioManager.playExplosion.mockClear();
    const order: string[] = [];
    const harness = createCombatFeedbackHarness({
      boss: { x: 320, y: 96 },
      persistHelperWingState: () => order.push('persist'),
      suspendForTransition: () => order.push('suspend'),
      queueLevelComplete: () => order.push('queue'),
    });

    harness.handlers.handleBossDeath();

    expect(harness.createExplosion).toHaveBeenCalledWith(320, 96, 3);
    expect(audioManager.playExplosion).toHaveBeenCalledWith(2);
    expect(harness.hideBossBar).toHaveBeenCalledTimes(1);
    expect(harness.setBoss).toHaveBeenCalledWith(null);
    expect(harness.markBossDefeated).toHaveBeenCalledTimes(1);
    expect(order).toEqual(['persist', 'suspend', 'queue']);
    expect(harness.persistHelperWingState).toHaveBeenCalledTimes(1);
    expect(harness.suspendForTransition).toHaveBeenCalledTimes(1);
    expect(harness.queueLevelComplete).toHaveBeenCalledWith(harness.flowContext);
  });

  test('handleBossSpawn clears hazards, hides active enemies, starts boss music, and shows the boss bar', () => {
    audioManager.startMusic.mockClear();

    const clearPlayerHazards = mock();
    const markBossSpawned = mock();
    const showBossWarning = mock();
    const showBossBar = mock();
    const boss = { setPlayer: mock() };
    const activeBody = { reset: mock() };
    const activeEnemy = {
      active: true,
      setActive: mock(),
      setVisible: mock(),
      clearTint: mock(),
      setVelocity: mock(),
      body: activeBody,
    };
    const inactiveEnemy = {
      active: false,
      setActive: mock(),
      setVisible: mock(),
      clearTint: mock(),
      setVelocity: mock(),
      body: { reset: mock() },
    };
    const setBoss = mock();
    const player = { id: 'player' };

    const handlers = createGameSceneCombatFeedbackHandlers({
      scene: { cameras: { main: {} } } as never,
      player: () => player as never,
      scoreManager: () => ({ addScore: mock() } as never),
      effectsManager: () => ({ createScorePopup: mock() } as never),
      flow: () => ({
        handlePlayerDeath: mock(),
        isPlayerDeathTransitionActive: mock(() => false),
        queueLevelComplete: mock(),
      } as never),
      getFlowContext: () => ({}) as never,
      levelManager: () => ({
        markBossSpawned,
        getLevelConfig: () => ({
          boss: { name: 'Dreadnova' },
          music: { boss: 'boss-track' },
        }),
      } as never),
      collisionManager: () => ({ clearPlayerHazards } as never),
      enemyPool: () => ({
        getAllEnemies: () => [activeEnemy, inactiveEnemy],
        spawnBoss: mock(() => boss),
      } as never),
      hud: () => ({ showBossWarning, showBossBar, hideBossBar: mock() } as never),
      getBoss: () => null,
      setBoss,
      getScaledBossConfig: () => ({ name: 'Scaled Boss' } as never),
      getLastLifeHelperWing: () => null,
      powerUpGroup: () => ({ id: 'powerups' } as never),
      persistHelperWingState: mock(),
      syncLastLifeHelperWingState: mock(),
      constants: {
        bossExplosionVisualIntensity: 3,
        bossExplosionAudioIntensity: 2,
        playerDeathExplosionVisualIntensity: 2.2,
        playerDeathExplosionAudioIntensity: 1.4,
        playerDeathParticleBudgetScale: 0.6,
      },
    });

    handlers.handleBossSpawn();

    expect(markBossSpawned).toHaveBeenCalledTimes(1);
    expect(clearPlayerHazards).toHaveBeenCalledTimes(1);
    expect(activeEnemy.setActive).toHaveBeenCalledWith(false);
    expect(activeEnemy.setVisible).toHaveBeenCalledWith(false);
    expect(activeEnemy.clearTint).toHaveBeenCalledTimes(1);
    expect(activeEnemy.setVelocity).toHaveBeenCalledWith(0, 0);
    expect(activeBody.reset).toHaveBeenCalledWith(0, 0);
    expect(inactiveEnemy.setActive).not.toHaveBeenCalled();
    expect(showBossWarning).toHaveBeenCalledTimes(1);
    expect(audioManager.startMusic).toHaveBeenCalledWith('boss-track');
    expect(boss.setPlayer).toHaveBeenCalledWith(player);
    expect(setBoss).toHaveBeenCalledWith(boss);
    expect(showBossBar).toHaveBeenCalledWith('Dreadnova');
  });
});
