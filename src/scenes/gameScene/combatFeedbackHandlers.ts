import Phaser from 'phaser';
import type { BossConfig } from '@/config/LevelsConfig';
import type { Boss } from '@/entities/enemies/Boss';
import type { Player } from '@/entities/Player';
import { audioManager } from '@/systems/AudioManager';
import type { CollisionManager } from '@/systems/CollisionManager';
import type { EffectsManager } from '@/systems/EffectsManager';
import type { EnemyPool } from '@/systems/EnemyPool';
import type { GrazeSurgeSystem } from '@/systems/GrazeSurgeSystem';
import type { HUD } from '@/systems/HUD';
import type { LevelManager } from '@/systems/LevelManager';
import type { ScoreManager } from '@/systems/ScoreManager';
import type { GameSceneFlowController, GameSceneFlowContext, PlayerDeathFlowOutcome } from './GameSceneFlowController';
import { getViewportBounds } from '@/utils/layout';
import { runBestEffort } from '@/utils/runBestEffort';
import { spawnGuaranteedPowerUp, trySpawnRandomPowerUp } from '@/systems/GameplayFlow';

interface CombatFeedbackConstants {
  bossExplosionVisualIntensity: number;
  bossExplosionAudioIntensity: number;
  playerDeathExplosionVisualIntensity: number;
  playerDeathExplosionAudioIntensity: number;
  playerDeathParticleBudgetScale: number;
}

interface GameSceneCombatFeedbackDeps {
  scene: Phaser.Scene;
  player: () => Player;
  scoreManager: () => ScoreManager;
  effectsManager: () => EffectsManager;
  flow: () => GameSceneFlowController;
  getFlowContext: () => GameSceneFlowContext;
  levelManager: () => LevelManager;
  collisionManager: () => CollisionManager;
  waveManager: () => { applyDeathRelief(): void };
  grazeSurge: () => GrazeSurgeSystem | null;
  enemyPool: () => EnemyPool;
  hud: () => HUD;
  getBoss: () => Boss | null;
  setBoss: (boss: Boss | null) => void;
  getScaledBossConfig: () => BossConfig | null;
  getLastLifeHelperWing: () => { suspendForTransition(): void } | null;
  getPicketTurrets: () => { suspendForTransition(): void } | null;
  powerUpGroup: () => Phaser.Physics.Arcade.Group;
  persistHelperWingState: () => void;
  syncLastLifeHelperWingState: () => void;
  getGameplayNow: () => number;
  constants: CombatFeedbackConstants;
}

interface GameSceneCombatFeedbackHandlers {
  handleEnemyDeath: (score: number, x: number, y: number, isAce?: boolean) => void;
  handlePlayerDeath: () => void;
  handlePlayerFatalHit: () => void;
  handleLevelComplete: () => void;
  handleBossSpawn: () => void;
  clearFieldForBossIntro: () => void;
  handlePlayerHit: () => void;
  handlePlayerExhaust: (x: number, y: number, intensity: number) => void;
  handlePlayerBulletTrail: (x: number, y: number) => void;
  handleEnemyBulletTrail: (x: number, y: number) => void;
  handleEnemySpawnWarning: (x: number) => void;
  handleWormholeTelegraph: (x: number, y: number) => void;
  handleEliteWave: () => void;
  handleBossDeath: () => void;
  handleBossPhaseChange: (phase: number) => void;
  handleBossGuardBreak: () => void;
  handleHelperWingActivated: (helperCount: number) => void;
  handleHelperWingDepleted: () => void;
  handlePicketOnline: () => void;
  spawnBoss: () => void;
}

function shouldSyncHelperWingAfterPlayerDeath(outcome: PlayerDeathFlowOutcome): boolean {
  return outcome.status === 'respawn-started' && !outcome.levelCompleteQueued;
}

export function createGameSceneCombatFeedbackHandlers(
  deps: GameSceneCombatFeedbackDeps
): GameSceneCombatFeedbackHandlers {
  const queueLevelCompleteTransition = (): void => {
    deps.persistHelperWingState();
    deps.getLastLifeHelperWing()?.suspendForTransition();
    deps.getPicketTurrets()?.suspendForTransition();
    deps.flow().queueLevelComplete(deps.getFlowContext());
  };

  const playPlayerDeathCue = (x: number, y: number): void => {
    deps.player().playDeathAnimation();
    audioManager.playExplosion(deps.constants.playerDeathExplosionAudioIntensity);
    deps
      .effectsManager()
      .createExplosion(
        x,
        y,
        deps.constants.playerDeathExplosionVisualIntensity,
        deps.constants.playerDeathParticleBudgetScale
      );
  };

  const tryDropPowerUp = (x: number, y: number): void => {
    trySpawnRandomPowerUp(deps.powerUpGroup(), x, y);
  };

  const dropGuaranteedPowerUp = (x: number, y: number): void => {
    spawnGuaranteedPowerUp(deps.powerUpGroup(), x, y);
  };

  const clearFieldForBossIntro = (): void => {
    deps.collisionManager().clearPlayerHazards();

    for (const enemy of deps.enemyPool().getAllEnemies()) {
      const pooled = enemy as typeof enemy & { despawn?: () => void };
      if (!pooled.active || typeof pooled.despawn !== 'function') {
        continue;
      }

      pooled.despawn();
    }
  };

  const getBossSpawnConfig = (): BossConfig | undefined => {
    const levelConfig = deps.levelManager().getLevelConfig();
    return deps.getScaledBossConfig() ?? levelConfig.boss ?? undefined;
  };

  const spawnBoss = (): void => {
    const viewport = getViewportBounds(deps.scene);
    const levelConfig = deps.levelManager().getLevelConfig();
    const boss = deps.enemyPool().spawnBoss(viewport.centerX, -60, getBossSpawnConfig());

    if (!boss) {
      return;
    }

    boss.setPlayer(deps.player());
    deps.setBoss(boss);
    deps.hud().showBossBar(levelConfig.boss?.name ?? 'BOSS');
  };

  const playBossPhaseChangeEffects = (): void => {
    runBestEffort(() => deps.scene.cameras.main.flash(120, 255, 196, 96, false));
    runBestEffort(() => deps.scene.cameras.main.shake(160, 0.006));
    runBestEffort(() =>
      deps.effectsManager().pulseCameraColor({ brightness: 1.08, contrast: 0.1, saturation: 0.12 }, 220)
    );
    runBestEffort(() =>
      deps.effectsManager().pulseCameraColor({ brightness: 1.12, contrast: 0.14, saturation: 0.18 }, 320)
    );
  };

  const playHelperWingActivatedEffects = (): void => {
    runBestEffort(() => deps.scene.cameras.main.flash(140, 96, 220, 255, false));
    runBestEffort(() =>
      deps.effectsManager().pulseCameraColor({ brightness: 1.05, contrast: 0.06, saturation: 0.14 }, 180)
    );
    runBestEffort(() => audioManager.playPowerUpPickup());
  };

  const handleBossDefeatCleanup = (boss: Boss | null): void => {
    if (boss) {
      deps.effectsManager().createExplosion(boss.x, boss.y, deps.constants.bossExplosionVisualIntensity);
      runBestEffort(() => deps.effectsManager().createSurgePulse(boss.x, boss.y));
      runBestEffort(() => deps.scene.cameras.main.flash(260, 255, 255, 255, false));
      runBestEffort(() => deps.scene.cameras.main.shake(320, 0.012));
      audioManager.playExplosion(deps.constants.bossExplosionAudioIntensity);
      deps.hud().hideBossBar();
    }

    deps.setBoss(null);
    deps.grazeSurge()?.setBossActive(false);
    deps.levelManager().markBossDefeated();
    queueLevelCompleteTransition();
  };

  return {
    handleEnemyDeath: (score, x, y, isAce): void => {
      const awarded = deps.scoreManager().registerKill(score, deps.getGameplayNow());
      deps.effectsManager().createScorePopup(x, y, awarded);
      audioManager.playExplosion(0.5);
      // Aces always drop exactly one power-up; the normal roll is skipped so
      // it can never duplicate the guaranteed reward.
      if (isAce) {
        dropGuaranteedPowerUp(x, y);
      } else {
        tryDropPowerUp(x, y);
      }
    },

    handlePlayerDeath: (): void => {
      const player = deps.player();
      const deathX = player.x;
      const deathY = player.y;
      const outcome = deps.flow().handlePlayerDeath(deps.getFlowContext());

      if (outcome.status !== 'ignored-terminal-active') {
        runBestEffort(() => playPlayerDeathCue(deathX, deathY));
      }

      if (outcome.status === 'respawn-started') {
        deps.scoreManager().onPlayerDeath();
        deps.collisionManager().clearPlayerHazards();
        deps.waveManager().applyDeathRelief();
      }

      if (shouldSyncHelperWingAfterPlayerDeath(outcome)) {
        deps.syncLastLifeHelperWingState();
      }
    },

    handlePlayerFatalHit: (): void => {
      if (!deps.flow().isPlayerDeathTransitionActive()) {
        return;
      }

      runBestEffort(() => deps.scene.cameras.main.flash(120, 255, 96, 96, false));
    },

    handleLevelComplete: (): void => {
      queueLevelCompleteTransition();
    },

    handleBossSpawn: (): void => {
      deps.levelManager().markBossSpawned();
      clearFieldForBossIntro();
      deps.grazeSurge()?.setBossActive(true);
      deps.hud().showBossWarning();
      audioManager.startMusic(deps.levelManager().getLevelConfig().music.boss);
      spawnBoss();
    },

    clearFieldForBossIntro,

    handlePlayerHit: (): void => {
      deps.scoreManager().onPlayerHit();
      runBestEffort(() => audioManager.playPlayerHit());
    },

    handlePlayerExhaust: (x, y, intensity): void => {
      deps.effectsManager().createEngineExhaust(x, y, intensity);
    },

    handlePlayerBulletTrail: (x, y): void => {
      deps.effectsManager().createBulletTrail(x, y);
    },

    handleEnemyBulletTrail: (x, y): void => {
      deps.effectsManager().createEnemyBulletTrail(x, y);
    },

    handleEnemySpawnWarning: (x): void => {
      deps.effectsManager().createSpawnWarning(x);
    },

    handleWormholeTelegraph: (x, y): void => {
      deps.effectsManager().createWormholeTelegraph(x, y);
    },

    handleEliteWave: (): void => {
      deps.hud().showEliteWaveAnnouncement();
      runBestEffort(() => deps.scene.cameras.main.flash(120, 178, 132, 255, false));
      runBestEffort(() =>
        deps.effectsManager().pulseCameraColor({ brightness: 1.06, contrast: 0.08, saturation: 0.16 }, 200)
      );
    },

    handleBossDeath: (): void => {
      handleBossDefeatCleanup(deps.getBoss());
    },

    handleBossPhaseChange: (phase): void => {
      if (phase < 2) {
        return;
      }

      deps.hud().showBossPhaseAnnouncement(phase);
      playBossPhaseChangeEffects();
    },

    handleBossGuardBreak: (): void => {
      deps.hud().showBossGuardBreakAnnouncement();
      runBestEffort(() => deps.scene.cameras.main.flash(100, 255, 215, 106, false));
      runBestEffort(() => deps.scene.cameras.main.shake(120, 0.005));
      runBestEffort(() => audioManager.playPowerUpPickup());
    },

    handleHelperWingActivated: (helperCount): void => {
      deps.hud().showHelperWingAnnouncement(helperCount);
      playHelperWingActivatedEffects();
    },

    handleHelperWingDepleted: (): void => {
      deps.hud().showHelperWingDepletedAnnouncement();
      runBestEffort(() => deps.scene.cameras.main.shake(120, 0.006));
    },

    handlePicketOnline: (): void => {
      deps.hud().showPicketOnlineAnnouncement();
    },

    spawnBoss,
  };
}
