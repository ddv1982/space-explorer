import { describe, expect, mock, test } from 'bun:test';

const { audioManager } = await import('../src/systems/AudioManager');
const playExplosion = mock();
const startMusic = mock();
Object.assign(audioManager, {
  playExplosion,
  startMusic,
  stopMusic: mock(),
  playPlayerHit: mock(),
  playPowerUpPickup: mock(),
});
const trySpawnRandomPowerUp = mock();
const spawnGuaranteedPowerUp = mock();
const spawnPowerUp = mock((group: { getFirstDead?: (createIfNull: boolean) => unknown; get?: (x: number, y: number) => unknown }, x: number, y: number, type: string) => {
  const powerUp = (group.getFirstDead?.(false) ?? group.get?.(x, y)) as { spawn?: (spawnX: number, spawnY: number, powerUpType: string) => void } | null;
  powerUp?.spawn?.(x, y, type);
});
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

const { createGameSceneCombatFeedbackHandlers } = await import('../src/scenes/gameScene/combatFeedbackHandlers');
const { runBestEffort } = await import('../src/utils/runBestEffort');

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
  suspendPicketsForTransition?: () => void;
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
  const createWormholeTelegraph = mock();
  const showEliteWaveAnnouncement = mock();
  const hideBossBar = mock();
  const markBossDefeated = mock();
  const setBoss = mock();
  const persistHelperWingState = mock(() => options.persistHelperWingState?.());
  const suspendForTransition = mock(() => options.suspendForTransition?.());
  const suspendPicketsForTransition = mock(() => options.suspendPicketsForTransition?.());
  const showPicketOnlineAnnouncement = mock();
  const syncLastLifeHelperWingState = mock();

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
    player: () => player as never,
    scoreManager: () => ({
      addScore: mock(),
      registerKill: mock((score: number) => score),
      onPlayerHit: mock(),
      onPlayerDeath: mock(),
    } as never),
    effectsManager: () => ({
      createScorePopup: mock(),
      createExplosion,
      createSurgePulse: mock(),
      createWormholeTelegraph,
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
    waveManager: () => ({ applyDeathRelief: mock() } as never),
    grazeSurge: () => null,
    enemyPool: () => ({ getAllEnemies: (): never[] => [], spawnBoss: mock() } as never),
    hud: () => ({
      showBossWarning: mock(),
      showBossBar: mock(),
      hideBossBar,
      showBossPhaseAnnouncement: mock(),
      showHelperWingAnnouncement: mock(),
      showHelperWingDepletedAnnouncement: mock(),
      showEliteWaveAnnouncement,
      showPicketOnlineAnnouncement,
    } as never),
    getBoss: () => (options.boss ?? null) as never,
    setBoss,
    getScaledBossConfig: () => null,
    getLastLifeHelperWing: () => ({ suspendForTransition } as never),
    getPicketTurrets: () => ({ suspendForTransition: suspendPicketsForTransition } as never),
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
    createWormholeTelegraph,
    showEliteWaveAnnouncement,
    hideBossBar,
    markBossDefeated,
    setBoss,
    persistHelperWingState,
    suspendForTransition,
    suspendPicketsForTransition,
    showPicketOnlineAnnouncement,
    syncLastLifeHelperWingState,
  };
}

describe('createGameSceneCombatFeedbackHandlers', () => {
  test('handleEnemyDeath adds score, shows popup, plays explosion, and tries dropping a power-up', () => {
    playExplosion.mockClear();
    trySpawnRandomPowerUp.mockClear();
    const addScore = mock((score: number) => score);
    const createScorePopup = mock();

    const handlers = createGameSceneCombatFeedbackHandlers({
      scene: { cameras: { main: {} }, time: { now: 1000 } } as never,
      player: () => ({ x: 0, y: 0 } as never),
      scoreManager: () => ({ registerKill: addScore } as never),
      effectsManager: () => ({ createScorePopup } as never),
      flow: () => ({
        handlePlayerDeath: mock(),
        isPlayerDeathTransitionActive: mock(() => false),
        queueLevelComplete: mock(),
      } as never),
      getFlowContext: () => ({}) as never,
      levelManager: () => ({ getLevelConfig: () => ({ music: { boss: 'boss-track' } }) } as never),
      collisionManager: () => ({ clearPlayerHazards: mock() } as never),
      waveManager: () => ({ applyDeathRelief: mock() } as never),
      grazeSurge: () => null,
      enemyPool: () => ({ getAllEnemies: (): never[] => [] } as never),
      hud: () => ({ showBossWarning: mock(), hideBossBar: mock() } as never),
      getBoss: () => null,
      setBoss: mock(),
      getScaledBossConfig: () => null,
      getLastLifeHelperWing: () => null,
      getPicketTurrets: () => null,
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

    expect(addScore).toHaveBeenCalledWith(500, 1000);
    expect(createScorePopup).toHaveBeenCalledWith(12, 34, 500);
    expect(playExplosion).toHaveBeenCalledWith(0.5);
    expect(trySpawnRandomPowerUp).toHaveBeenCalledWith({ id: 'powerups' }, 12, 34);
    expect(spawnGuaranteedPowerUp).not.toHaveBeenCalled();
  });

  test('handleEnemyDeath grants a marked ace exactly one guaranteed drop and skips the random roll', () => {
    playExplosion.mockClear();
    trySpawnRandomPowerUp.mockClear();
    spawnGuaranteedPowerUp.mockClear();
    const registerKill = mock((score: number) => score * 4);
    const createScorePopup = mock();

    const handlers = createGameSceneCombatFeedbackHandlers({
      scene: { cameras: { main: {} }, time: { now: 1000 } } as never,
      player: () => ({ x: 0, y: 0 } as never),
      scoreManager: () => ({ registerKill } as never),
      effectsManager: () => ({ createScorePopup } as never),
      flow: () => ({
        handlePlayerDeath: mock(),
        isPlayerDeathTransitionActive: mock(() => false),
        queueLevelComplete: mock(),
      } as never),
      getFlowContext: () => ({}) as never,
      levelManager: () => ({ getLevelConfig: () => ({ music: { boss: 'boss-track' } }) } as never),
      collisionManager: () => ({ clearPlayerHazards: mock() } as never),
      waveManager: () => ({ applyDeathRelief: mock() } as never),
      grazeSurge: () => null,
      enemyPool: () => ({ getAllEnemies: (): never[] => [] } as never),
      hud: () => ({ showBossWarning: mock(), hideBossBar: mock() } as never),
      getBoss: () => null,
      setBoss: mock(),
      getScaledBossConfig: () => null,
      getLastLifeHelperWing: () => null,
      getPicketTurrets: () => null,
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

    handlers.handleEnemyDeath(1000, 12, 34, true);

    expect(registerKill).toHaveBeenCalledWith(1000, 1000);
    expect(createScorePopup).toHaveBeenCalledWith(12, 34, 4000);
    expect(spawnGuaranteedPowerUp).toHaveBeenCalledTimes(1);
    expect(spawnGuaranteedPowerUp).toHaveBeenCalledWith({ id: 'powerups' }, 12, 34);
    expect(trySpawnRandomPowerUp).not.toHaveBeenCalled();
  });

  test('handlePlayerDeath syncs helper wing after an ordinary gameplay respawn starts', () => {
    playExplosion.mockClear();
    const harness = createCombatFeedbackHarness({
      playerDeathOutcome: {
        status: 'respawn-started',
        levelCompleteQueued: false,
        remainingLives: 1,
      },
    });

    harness.handlers.handlePlayerDeath();

    expect(harness.player.playDeathAnimation).toHaveBeenCalledTimes(1);
    expect(playExplosion).toHaveBeenCalledWith(1.4);
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
    playExplosion.mockClear();
    terminalHarness.handlers.handlePlayerDeath();

    expect(gameOverHarness.syncLastLifeHelperWingState).not.toHaveBeenCalled();
    expect(terminalHarness.syncLastLifeHelperWingState).not.toHaveBeenCalled();
    expect(terminalHarness.handlePlayerDeath).toHaveBeenCalledWith(terminalHarness.flowContext);
    expect(terminalHarness.player.playDeathAnimation).not.toHaveBeenCalled();
    expect(terminalHarness.createExplosion).not.toHaveBeenCalled();
    expect(playExplosion).not.toHaveBeenCalled();
  });

  test('handleBossDeath persists, suspends, then queues level completion', () => {
    playExplosion.mockClear();
    const order: string[] = [];
    const harness = createCombatFeedbackHarness({
      boss: { x: 320, y: 96 },
      persistHelperWingState: () => order.push('persist'),
      suspendForTransition: () => order.push('suspend'),
      suspendPicketsForTransition: () => order.push('suspend-pickets'),
      queueLevelComplete: () => order.push('queue'),
    });

    harness.handlers.handleBossDeath();

    expect(harness.createExplosion).toHaveBeenCalledWith(320, 96, 3);
    expect(playExplosion).toHaveBeenCalledWith(2);
    expect(harness.hideBossBar).toHaveBeenCalledTimes(1);
    expect(harness.setBoss).toHaveBeenCalledWith(null);
    expect(harness.markBossDefeated).toHaveBeenCalledTimes(1);
    expect(order).toEqual(['persist', 'suspend', 'suspend-pickets', 'queue']);
    expect(harness.persistHelperWingState).toHaveBeenCalledTimes(1);
    expect(harness.suspendForTransition).toHaveBeenCalledTimes(1);
    expect(harness.suspendPicketsForTransition).toHaveBeenCalledTimes(1);
    expect(harness.queueLevelComplete).toHaveBeenCalledWith(harness.flowContext);
  });

  test('handleBossSpawn clears hazards, hides active enemies, starts boss music, and shows the boss bar', () => {
    startMusic.mockClear();

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
      waveManager: () => ({ applyDeathRelief: mock() } as never),
      grazeSurge: () => null,
      enemyPool: () => ({
        getAllEnemies: () => [activeEnemy, inactiveEnemy],
        spawnBoss: mock(() => boss),
      } as never),
      hud: () => ({ showBossWarning, showBossBar, hideBossBar: mock() } as never),
      getBoss: () => null,
      setBoss,
      getScaledBossConfig: () => ({ name: 'Scaled Boss' } as never),
      getLastLifeHelperWing: () => null,
      getPicketTurrets: () => null,
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
    expect(startMusic).toHaveBeenCalledWith('boss-track');
    expect(boss.setPlayer).toHaveBeenCalledWith(player);
    expect(setBoss).toHaveBeenCalledWith(boss);
    expect(showBossBar).toHaveBeenCalledWith('Dreadnova');
  });

  test('handleWormholeTelegraph renders the wormhole telegraph VFX at the portal position', () => {
    const harness = createCombatFeedbackHarness({});

    harness.handlers.handleWormholeTelegraph(180, 240);

    expect(harness.createWormholeTelegraph).toHaveBeenCalledTimes(1);
    expect(harness.createWormholeTelegraph).toHaveBeenCalledWith(180, 240);
  });

  test('handleEliteWave shows the elite wave announcement with a camera beat', () => {
    const harness = createCombatFeedbackHarness({});

    harness.handlers.handleEliteWave();

    expect(harness.showEliteWaveAnnouncement).toHaveBeenCalledTimes(1);
  });

  test('handlePicketOnline shows the picket announcement', () => {
    const harness = createCombatFeedbackHarness({});

    harness.handlers.handlePicketOnline();

    expect(harness.showPicketOnlineAnnouncement).toHaveBeenCalledTimes(1);
  });
});
