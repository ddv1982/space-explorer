import { describe, expect, mock, test } from 'bun:test';

const audioManager = {
  playExplosion: mock(),
  startMusic: mock(),
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
});
