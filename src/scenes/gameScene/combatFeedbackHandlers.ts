import Phaser from 'phaser';
import type { BossConfig } from '../../config/LevelsConfig';
import type { Boss } from '../../entities/enemies/Boss';
import type { Player } from '../../entities/Player';
import { audioManager } from '../../systems/AudioManager';
import type { CollisionManager } from '../../systems/CollisionManager';
import type { EffectsManager } from '../../systems/EffectsManager';
import type { EnemyPool } from '../../systems/EnemyPool';
import type { HUD } from '../../systems/HUD';
import type { LevelManager } from '../../systems/LevelManager';
import type { ScoreManager } from '../../systems/ScoreManager';
import type { GameSceneFlowController, GameSceneFlowContext } from './GameSceneFlowController';
import { getViewportBounds } from '../../utils/layout';
import { trySpawnRandomPowerUp } from '../../systems/GameplayFlow';

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
  enemyPool: () => EnemyPool;
  hud: () => HUD;
  getBoss: () => Boss | null;
  setBoss: (boss: Boss | null) => void;
  getScaledBossConfig: () => BossConfig | null;
  getLastLifeHelperWing: () => { suspendForTransition(): void } | null;
  powerUpGroup: () => Phaser.Physics.Arcade.Group;
  persistHelperWingState: () => void;
  syncLastLifeHelperWingState: () => void;
  constants: CombatFeedbackConstants;
}

interface GameSceneCombatFeedbackHandlers {
  handleEnemyDeath: (score: number, x: number, y: number) => void;
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
  handleBossDeath: () => void;
  handleBossPhaseChange: (phase: number) => void;
  handleHelperWingActivated: (helperCount: number) => void;
  handleHelperWingDepleted: () => void;
  spawnBoss: () => void;
}

export function runBestEffort(effect: () => void): void {
  try {
    effect();
  } catch {
    // Keep the GameOver transition alive even if optional cleanup/effects fail.
  }
}

export function createGameSceneCombatFeedbackHandlers(
  deps: GameSceneCombatFeedbackDeps
): GameSceneCombatFeedbackHandlers {
  const playPlayerDeathCue = (x: number, y: number): void => {
    deps.player().playDeathAnimation();
    audioManager.playExplosion(deps.constants.playerDeathExplosionAudioIntensity);
    deps.effectsManager().createExplosion(
      x,
      y,
      deps.constants.playerDeathExplosionVisualIntensity,
      deps.constants.playerDeathParticleBudgetScale
    );
  };

  const tryDropPowerUp = (x: number, y: number): void => {
    trySpawnRandomPowerUp(deps.powerUpGroup(), x, y);
  };

  const clearFieldForBossIntro = (): void => {
    deps.collisionManager().clearPlayerHazards();

    for (const enemy of deps.enemyPool().getAllEnemies()) {
      if (!enemy.active) {
        continue;
      }

      enemy.setActive(false);
      enemy.setVisible(false);
      enemy.clearTint();
      enemy.setVelocity(0, 0);

      const body = enemy.body as Phaser.Physics.Arcade.Body | null;
      body?.reset(0, 0);
    }
  };

  const spawnBoss = (): void => {
    const viewport = getViewportBounds(deps.scene);
    const levelConfig = deps.levelManager().getLevelConfig();
    const boss = deps.enemyPool().spawnBoss(
      viewport.centerX,
      -60,
      deps.getScaledBossConfig() ?? levelConfig.boss ?? undefined
    );

    if (!boss) {
      return;
    }

    boss.setPlayer(deps.player());
    deps.setBoss(boss);
    deps.hud().showBossBar(levelConfig.boss?.name ?? 'BOSS');
  };

  return {
    handleEnemyDeath: (score, x, y): void => {
      deps.scoreManager().addScore(score);
      deps.effectsManager().createScorePopup(x, y, score);
      audioManager.playExplosion(0.5);
      tryDropPowerUp(x, y);
    },

    handlePlayerDeath: (): void => {
      const player = deps.player();
      const deathX = player.x;
      const deathY = player.y;

      runBestEffort(() => playPlayerDeathCue(deathX, deathY));
      deps.flow().handlePlayerDeath(deps.getFlowContext());
      deps.syncLastLifeHelperWingState();
    },

    handlePlayerFatalHit: (): void => {
      if (!deps.flow().isPlayerDeathTransitionActive()) {
        return;
      }

      runBestEffort(() => deps.scene.cameras.main.flash(120, 255, 96, 96, false));
    },

    handleLevelComplete: (): void => {
      deps.persistHelperWingState();
      deps.getLastLifeHelperWing()?.suspendForTransition();
      deps.flow().queueLevelComplete(deps.getFlowContext());
    },

    handleBossSpawn: (): void => {
      deps.levelManager().markBossSpawned();
      clearFieldForBossIntro();
      deps.hud().showBossWarning();
      audioManager.startMusic(deps.levelManager().getLevelConfig().music.boss);
      spawnBoss();
    },

    clearFieldForBossIntro,

    handlePlayerHit: (): void => {
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

    handleBossDeath: (): void => {
      const boss = deps.getBoss();
      if (boss) {
        deps.effectsManager().createExplosion(
          boss.x,
          boss.y,
          deps.constants.bossExplosionVisualIntensity
        );
        audioManager.playExplosion(deps.constants.bossExplosionAudioIntensity);
        deps.hud().hideBossBar();
      }

      deps.setBoss(null);
      deps.levelManager().markBossDefeated();
      deps.persistHelperWingState();
      deps.getLastLifeHelperWing()?.suspendForTransition();
      deps.flow().queueLevelComplete(deps.getFlowContext());
    },

    handleBossPhaseChange: (phase): void => {
      if (phase < 2) {
        return;
      }

      deps.hud().showBossPhaseAnnouncement(phase);
      runBestEffort(() => deps.scene.cameras.main.flash(120, 255, 196, 96, false));
      runBestEffort(() => deps.effectsManager().pulseCameraColor({ brightness: 1.08, contrast: 0.1, saturation: 0.12 }, 220));
      runBestEffort(() => deps.effectsManager().pulseCameraColor({ brightness: 1.12, contrast: 0.14, saturation: 0.18 }, 320));
    },

    handleHelperWingActivated: (helperCount): void => {
      deps.hud().showHelperWingAnnouncement(helperCount);
      runBestEffort(() => deps.scene.cameras.main.flash(140, 96, 220, 255, false));
      runBestEffort(() => deps.effectsManager().pulseCameraColor({ brightness: 1.05, contrast: 0.06, saturation: 0.14 }, 180));
      runBestEffort(() => audioManager.playPowerUpPickup());
    },

    handleHelperWingDepleted: (): void => {
      deps.hud().showHelperWingDepletedAnnouncement();
      runBestEffort(() => deps.scene.cameras.main.shake(120, 0.006));
    },

    spawnBoss,
  };
}
