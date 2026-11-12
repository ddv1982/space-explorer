import Phaser from 'phaser';
import type { PlayerFatalResult, PlayerHitResult } from '@/systems/PlayerDamage';
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
import { getViewportBounds, stereoPan } from '@/utils/layout';
import { runBestEffort } from '@/utils/runBestEffort';
import { shakeCamera } from '@/systems/effects/cameraShake';
import { HIT_STOP_MS } from '@/systems/HitStop';
import { spawnGuaranteedPowerUp, trySpawnRandomPowerUp } from '@/systems/GameplayFlow';

interface CombatFeedbackConstants {
  bossExplosionVisualIntensity: number;
  playerDeathExplosionVisualIntensity: number;
  playerDeathParticleBudgetScale: number;
}

interface GameSceneCombatFeedbackDeps {
  scene: Phaser.Scene;
  player: Player;
  scoreManager: ScoreManager;
  effectsManager: EffectsManager;
  flow: GameSceneFlowController;
  getFlowContext: () => GameSceneFlowContext;
  levelManager: LevelManager;
  collisionManager: CollisionManager;
  waveManager: { applyDeathRelief(): void };
  grazeSurge: GrazeSurgeSystem | null;
  enemyPool: EnemyPool;
  hud: HUD;
  getBoss: () => Boss | null;
  setBoss: (boss: Boss | null) => void;
  scaledBossConfig: BossConfig | null;
  lastLifeHelperWing: { suspendForTransition(): void } | null;
  picketTurrets: { suspendForTransition(): void } | null;
  powerUpGroup: Phaser.Physics.Arcade.Group;
  persistHelperWingState: () => void;
  syncLastLifeHelperWingState: () => void;
  getGameplayNow: () => number;
  /** Briefly slows gameplay on a big impact (see `HitStop`). */
  hitStop: (durationMs: number) => void;
  constants: CombatFeedbackConstants;
}

interface GameSceneCombatFeedbackHandlers {
  handleEnemyDeath: (score: number, x: number, y: number, isAce?: boolean) => void;
  handlePlayerDeath: (result: PlayerFatalResult) => void;
  handlePlayerFatalHit: () => void;
  handleLevelComplete: () => void;
  handleBossSpawn: () => void;
  clearFieldForBossIntro: () => void;
  handlePlayerHit: (result: PlayerHitResult) => void;
  handlePlayerExhaust: (x: number, y: number, intensity: number) => void;
  handlePlayerBulletTrail: (x: number, y: number) => void;
  handleEnemyBulletTrail: (x: number, y: number) => void;
  handleEnemySpawnWarning: (x: number) => void;
  handleWormholeTelegraph: (x: number, y: number) => void;
  handleEliteWave: (title?: string) => void;
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
    deps.lastLifeHelperWing?.suspendForTransition();
    deps.picketTurrets?.suspendForTransition();
    deps.flow.queueLevelComplete(deps.getFlowContext());
  };

  const playPlayerDeathCue = (x: number, y: number): void => {
    deps.player.playDeathAnimation();
    audioManager.playSfx('explosionLarge', stereoPan(deps.scene, x));
    deps.effectsManager.createExplosion(
      x,
      y,
      deps.constants.playerDeathExplosionVisualIntensity,
      deps.constants.playerDeathParticleBudgetScale
    );
  };

  const tryDropPowerUp = (x: number, y: number): void => {
    trySpawnRandomPowerUp(deps.powerUpGroup, x, y);
  };

  const dropGuaranteedPowerUp = (x: number, y: number): void => {
    spawnGuaranteedPowerUp(deps.powerUpGroup, x, y);
  };

  const clearFieldForBossIntro = (): void => {
    deps.collisionManager.clearPlayerHazards();

    for (const enemy of deps.enemyPool.getAllEnemies()) {
      const pooled = enemy as typeof enemy & { despawn?: () => void };
      if (!pooled.active || typeof pooled.despawn !== 'function') {
        continue;
      }

      pooled.despawn();
    }
  };

  const getBossSpawnConfig = (): BossConfig | undefined => {
    const levelConfig = deps.levelManager.getLevelConfig();
    return deps.scaledBossConfig ?? levelConfig.boss ?? undefined;
  };

  const spawnBoss = (): void => {
    const viewport = getViewportBounds(deps.scene);
    const levelConfig = deps.levelManager.getLevelConfig();
    const boss = deps.enemyPool.spawnBoss(viewport.centerX, -60, getBossSpawnConfig());

    if (!boss) {
      return;
    }

    boss.setPlayer(deps.player);
    deps.setBoss(boss);
    deps.hud.showBossBar(levelConfig.boss?.name ?? 'BOSS');
  };

  const playBossPhaseChangeEffects = (): void => {
    runBestEffort(() => deps.scene.cameras.main.flash(120, 255, 196, 96, false));
    runBestEffort(() => shakeCamera(deps.scene, 160, 0.006));
    runBestEffort(() =>
      deps.effectsManager.pulseCameraColor({ brightness: 1.08, contrast: 0.1, saturation: 0.12 }, 220)
    );
    runBestEffort(() =>
      deps.effectsManager.pulseCameraColor({ brightness: 1.12, contrast: 0.14, saturation: 0.18 }, 320)
    );
  };

  const playHelperWingActivatedEffects = (): void => {
    runBestEffort(() => deps.scene.cameras.main.flash(140, 96, 220, 255, false));
    runBestEffort(() =>
      deps.effectsManager.pulseCameraColor({ brightness: 1.05, contrast: 0.06, saturation: 0.14 }, 180)
    );
    runBestEffort(() => audioManager.playSfx('helperWingArrive'));
  };

  const handleBossDefeatCleanup = (boss: Boss | null): void => {
    if (boss) {
      deps.hitStop(HIT_STOP_MS.bossDefeat);
      deps.effectsManager.createExplosion(boss.x, boss.y, deps.constants.bossExplosionVisualIntensity);
      runBestEffort(() => deps.effectsManager.createSurgePulse(boss.x, boss.y));
      runBestEffort(() => deps.scene.cameras.main.flash(260, 255, 255, 255, false));
      runBestEffort(() => shakeCamera(deps.scene, 320, 0.012));
      runBestEffort(() => audioManager.playSfx('explosionBoss', stereoPan(deps.scene, boss.x)));
      deps.hud.hideBossBar();
    }

    deps.setBoss(null);
    deps.grazeSurge?.setBossActive(false);
    deps.levelManager.markBossDefeated();
    queueLevelCompleteTransition();
  };

  return {
    handleEnemyDeath: (score, x, y, isAce): void => {
      const awarded = deps.scoreManager.registerKill(score, deps.getGameplayNow());
      deps.effectsManager.createScorePopup(x, y, awarded);
      runBestEffort(() => audioManager.playSfx('explosionSmall', stereoPan(deps.scene, x)));
      if (isAce) {
        deps.hitStop(HIT_STOP_MS.aceKill);
        dropGuaranteedPowerUp(x, y);
      } else {
        tryDropPowerUp(x, y);
      }
    },

    handlePlayerDeath: (result): void => {
      const player = deps.player;
      const deathX = player.x;
      const deathY = player.y;
      const outcome = deps.flow.handlePlayerDeath(deps.getFlowContext(), result.source);

      if (outcome.status !== 'ignored-terminal-active') {
        runBestEffort(() => playPlayerDeathCue(deathX, deathY));
      }

      if (outcome.status === 'respawn-started') {
        deps.scoreManager.onPlayerDeath();
        deps.collisionManager.clearPlayerHazards();
        deps.waveManager.applyDeathRelief();
      }

      if (shouldSyncHelperWingAfterPlayerDeath(outcome)) {
        deps.syncLastLifeHelperWingState();
      }
    },

    handlePlayerFatalHit: (): void => {
      if (!deps.flow.isPlayerDeathTransitionActive()) {
        return;
      }

      runBestEffort(() => deps.scene.cameras.main.flash(120, 255, 96, 96, false));
    },

    handleLevelComplete: (): void => {
      queueLevelCompleteTransition();
    },

    handleBossSpawn: (): void => {
      deps.levelManager.markBossSpawned();
      clearFieldForBossIntro();
      deps.grazeSurge?.setBossActive(true);
      deps.hud.showBossWarning();
      runBestEffort(() => audioManager.playSfx('bossWarning'));
      audioManager.startMusic(deps.levelManager.getLevelConfig().music.boss);
      spawnBoss();
    },

    clearFieldForBossIntro,

    handlePlayerHit: (result): void => {
      deps.scoreManager.onPlayerHit();
      if (result.outcome !== 'absorbed') deps.hitStop(HIT_STOP_MS.playerHullHit);
      runBestEffort(() => audioManager.playSfx(result.outcome === 'absorbed' ? 'hitShield' : 'hitHull'));
    },

    handlePlayerExhaust: (x, y, intensity): void => {
      deps.effectsManager.createEngineExhaust(x, y, intensity);
    },

    handlePlayerBulletTrail: (x, y): void => {
      deps.effectsManager.createBulletTrail(x, y);
    },

    handleEnemyBulletTrail: (x, y): void => {
      deps.effectsManager.createEnemyBulletTrail(x, y);
    },

    handleEnemySpawnWarning: (x): void => {
      deps.effectsManager.createSpawnWarning(x);
      runBestEffort(() => audioManager.playSfx('spawnWarning', stereoPan(deps.scene, x)));
    },

    handleWormholeTelegraph: (x, y): void => {
      deps.effectsManager.createWormholeTelegraph(x, y);
      runBestEffort(() => audioManager.playSfx('wormhole', stereoPan(deps.scene, x)));
    },

    handleEliteWave: (title): void => {
      deps.hud.showEliteWaveAnnouncement(title);
      runBestEffort(() => audioManager.playSfx('eliteWave'));
      runBestEffort(() => deps.scene.cameras.main.flash(120, 178, 132, 255, false));
      runBestEffort(() =>
        deps.effectsManager.pulseCameraColor({ brightness: 1.06, contrast: 0.08, saturation: 0.16 }, 200)
      );
    },

    handleBossDeath: (): void => {
      handleBossDefeatCleanup(deps.getBoss());
    },

    handleBossPhaseChange: (phase): void => {
      if (phase < 2) {
        return;
      }

      deps.hud.showBossPhaseAnnouncement(phase);
      deps.hitStop(HIT_STOP_MS.bossPhaseChange);
      playBossPhaseChangeEffects();
      runBestEffort(() => audioManager.playSfx('bossPhase'));
    },

    handleBossGuardBreak: (): void => {
      deps.hud.showBossGuardBreakAnnouncement();
      deps.hitStop(HIT_STOP_MS.bossGuardBreak);
      runBestEffort(() => deps.scene.cameras.main.flash(100, 255, 215, 106, false));
      runBestEffort(() => shakeCamera(deps.scene, 120, 0.005));
      runBestEffort(() => audioManager.playSfx('bossGuardBreak'));
    },

    handleHelperWingActivated: (helperCount): void => {
      deps.hud.showHelperWingAnnouncement(helperCount);
      playHelperWingActivatedEffects();
    },

    handleHelperWingDepleted: (): void => {
      deps.hud.showHelperWingDepletedAnnouncement();
      runBestEffort(() => audioManager.playSfx('helperWingDepleted'));
      runBestEffort(() => shakeCamera(deps.scene, 120, 0.006));
    },

    handlePicketOnline: (): void => {
      deps.hud.showPicketOnlineAnnouncement();
      runBestEffort(() => audioManager.playSfx('picketOnline'));
    },

    spawnBoss,
  };
}
