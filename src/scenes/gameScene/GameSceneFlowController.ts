import Phaser from 'phaser';
import { audioManager } from '../../systems/AudioManager';
import {
  saveCurrentHp,
  saveRemainingLives,
  saveScoreToState,
  setRunSummary,
} from '../../systems/PlayerState';
import {
  TERMINAL_TRANSITIONS,
  type TerminalTransitionState,
} from '../../systems/GameplayFlow';
import type { Player } from '../../entities/Player';
import type { CollisionManager } from '../../systems/CollisionManager';
import type { LevelManager } from '../../systems/LevelManager';
import type { ScoreManager } from '../../systems/ScoreManager';
import type { WarpTransition } from '../../systems/WarpTransition';

const PLAYER_RESPAWN_DELAY_MS = 1000;
const PLAYER_RESPAWN_FREEZE_DELAY_MS = 240;
const PLAYER_RESPAWN_INVULNERABILITY_MS = 2000;
const PLAYER_RESPAWN_WATCHDOG_BUFFER_MS = 250;

export interface GameSceneFlowContext {
  scene: Phaser.Scene;
  registry: Phaser.Data.DataManager;
  player: Player;
  collisionManager: CollisionManager;
  levelManager: LevelManager;
  scoreManager: ScoreManager;
  warpTransition: WarpTransition;
  stopPlayerMotion: () => void;
  runBestEffort: (effect: () => void) => void;
  startScene: (key: string) => void;
  pauseScene: () => void;
  resumeScene: () => void;
}

export class GameSceneFlowController {
  private gameOver = false;
  private gameOverTransition: Phaser.Time.TimerEvent | null = null;
  private gameOverWatchdog: ReturnType<typeof setTimeout> | null = null;
  private gameOverSceneStarted = false;
  private pendingLevelCompleteTransition: Phaser.Time.TimerEvent | null = null;
  private pendingRespawn: Phaser.Time.TimerEvent | null = null;
  private pendingRespawnFreeze: Phaser.Time.TimerEvent | null = null;
  private respawnWatchdog: ReturnType<typeof setTimeout> | null = null;
  private terminalTransitionState: TerminalTransitionState = TERMINAL_TRANSITIONS.none;
  private levelCompleteQueued = false;
  private remainingLives = 0;
  private respawnInProgress = false;
  private respawnScenePaused = false;

  reset(remainingLives: number): void {
    this.clearGameOverTransitionTimers();
    this.clearPendingLevelCompleteTransition();
    this.clearPendingRespawn();

    this.gameOver = false;
    this.gameOverSceneStarted = false;
    this.terminalTransitionState = TERMINAL_TRANSITIONS.none;
    this.levelCompleteQueued = false;
    this.remainingLives = remainingLives;
    this.respawnInProgress = false;
    this.respawnScenePaused = false;
  }

  shutdown(collisionManager: CollisionManager): void {
    this.clearGameOverTransitionTimers();
    this.clearPendingLevelCompleteTransition();
    this.clearPendingRespawn();
    collisionManager.setRespawnInProgress(false);
    collisionManager.setTerminalTransitionActive(false);

    this.gameOver = false;
    this.gameOverSceneStarted = false;
    this.terminalTransitionState = TERMINAL_TRANSITIONS.none;
    this.levelCompleteQueued = false;
    this.remainingLives = 0;
    this.respawnInProgress = false;
    this.respawnScenePaused = false;
  }

  getRemainingLives(): number {
    return this.remainingLives;
  }

  isGameplayLocked(): boolean {
    return this.gameOver || this.respawnInProgress || this.terminalTransitionState !== TERMINAL_TRANSITIONS.none;
  }

  isTerminalTransitionActive(): boolean {
    return this.terminalTransitionState !== TERMINAL_TRANSITIONS.none;
  }

  isPlayerDeathTransitionActive(): boolean {
    return this.terminalTransitionState === TERMINAL_TRANSITIONS.playerDeath;
  }

  handlePlayerDeath(context: GameSceneFlowContext): void {
    if (this.remainingLives > 1) {
      this.remainingLives -= 1;
      saveRemainingLives(context.registry, this.remainingLives);
      this.beginRespawnTransition(context);
      return;
    }

    this.levelCompleteQueued = false;
    this.clearPendingLevelCompleteTransition();

    if (!this.beginTerminalTransition(context, TERMINAL_TRANSITIONS.playerDeath)) {
      return;
    }

    const finalScore = context.scoreManager.getScore();
    const level = context.levelManager.currentLevel;

    this.gameOver = true;
    this.scheduleGameOverTransition(context);

    context.runBestEffort(() => audioManager.stopMusic());
    context.runBestEffort(() => saveRemainingLives(context.registry, 0));
    context.runBestEffort(() => saveScoreToState(context.registry, finalScore));
    context.runBestEffort(() => setRunSummary(context.registry, { finalScore, levelReached: level }));
  }

  handlePlayerFatalHit(scene: Phaser.Scene): void {
    if (!this.isPlayerDeathTransitionActive()) {
      return;
    }

    scene.cameras.main.flash(120, 255, 96, 96, false);
  }

  queueLevelComplete(context: GameSceneFlowContext): void {
    if (this.levelCompleteQueued || this.respawnInProgress || this.terminalTransitionState !== TERMINAL_TRANSITIONS.none) {
      return;
    }

    this.levelCompleteQueued = true;
    this.scheduleLevelCompleteTransition(context);
  }

  private scheduleGameOverTransition(context: GameSceneFlowContext): void {
    this.clearGameOverTransitionTimers();

    this.gameOverTransition = context.scene.time.delayedCall(1500, () => {
      this.completePlayerDeathTransition(context);
    });

    this.gameOverWatchdog = setTimeout(() => {
      this.completePlayerDeathTransition(context);
    }, 2000);
  }

  private completePlayerDeathTransition(context: GameSceneFlowContext): void {
    if (this.gameOverSceneStarted || this.terminalTransitionState !== TERMINAL_TRANSITIONS.playerDeath) {
      return;
    }

    this.gameOverSceneStarted = true;
    this.clearGameOverTransitionTimers();
    context.startScene('GameOver');
  }

  private clearGameOverTransitionTimers(): void {
    if (this.gameOverTransition) {
      this.gameOverTransition.remove(false);
      this.gameOverTransition = null;
    }

    if (this.gameOverWatchdog !== null) {
      clearTimeout(this.gameOverWatchdog);
      this.gameOverWatchdog = null;
    }
  }

  private clearPendingLevelCompleteTransition(): void {
    if (this.pendingLevelCompleteTransition) {
      this.pendingLevelCompleteTransition.remove(false);
      this.pendingLevelCompleteTransition = null;
    }
  }

  private scheduleLevelCompleteTransition(context: GameSceneFlowContext): void {
    if (this.pendingLevelCompleteTransition || !this.levelCompleteQueued) {
      return;
    }

    this.pendingLevelCompleteTransition = context.scene.time.delayedCall(0, () => {
      this.pendingLevelCompleteTransition = null;
      this.flushQueuedLevelCompleteTransition(context);
    });
  }

  private flushQueuedLevelCompleteTransition(context: GameSceneFlowContext): void {
    if (
      !this.levelCompleteQueued ||
      this.respawnInProgress ||
      !context.player.isAlive ||
      this.terminalTransitionState !== TERMINAL_TRANSITIONS.none
    ) {
      return;
    }

    this.levelCompleteQueued = false;

    if (!this.beginTerminalTransition(context, TERMINAL_TRANSITIONS.levelComplete)) {
      this.levelCompleteQueued = true;
      return;
    }

    saveScoreToState(context.registry, context.scoreManager.getScore());
    saveCurrentHp(context.registry, context.player.hp);
    saveRemainingLives(context.registry, this.remainingLives);
    setRunSummary(context.registry, { finalScore: context.scoreManager.getScore() });
    context.warpTransition.play(() => {
      context.startScene('PlanetIntermission');
    });
  }

  private scheduleRespawn(context: GameSceneFlowContext): void {
    this.clearPendingRespawn();

    this.pendingRespawn = context.scene.time.delayedCall(PLAYER_RESPAWN_DELAY_MS, () => {
      this.completeRespawnTransition(context);
    });

    this.pendingRespawnFreeze = context.scene.time.delayedCall(PLAYER_RESPAWN_FREEZE_DELAY_MS, () => {
      this.pendingRespawnFreeze = null;
      this.pauseSceneForRespawn(context);
    });

    this.respawnWatchdog = setTimeout(() => {
      this.completeRespawnTransition(context);
    }, PLAYER_RESPAWN_DELAY_MS + PLAYER_RESPAWN_WATCHDOG_BUFFER_MS);
  }

  private clearPendingRespawn(): void {
    if (this.pendingRespawn) {
      this.pendingRespawn.remove(false);
      this.pendingRespawn = null;
    }

    if (this.pendingRespawnFreeze) {
      this.pendingRespawnFreeze.remove(false);
      this.pendingRespawnFreeze = null;
    }

    if (this.respawnWatchdog !== null) {
      clearTimeout(this.respawnWatchdog);
      this.respawnWatchdog = null;
    }
  }

  private beginRespawnTransition(context: GameSceneFlowContext): void {
    if (this.respawnInProgress || this.terminalTransitionState !== TERMINAL_TRANSITIONS.none) {
      return;
    }

    this.respawnInProgress = true;
    this.clearPendingLevelCompleteTransition();
    context.stopPlayerMotion();
    context.collisionManager.setRespawnInProgress(true);
    context.collisionManager.clearPlayerHazards();
    this.scheduleRespawn(context);
  }

  private pauseSceneForRespawn(context: GameSceneFlowContext): void {
    if (!this.respawnInProgress || this.respawnScenePaused) {
      return;
    }

    context.collisionManager.clearPlayerHazards();
    context.player.prepareForRespawn();
    this.respawnScenePaused = true;
    context.pauseScene();
  }

  private resumeSceneAfterRespawnPause(context: GameSceneFlowContext): void {
    if (!this.respawnScenePaused) {
      return;
    }

    this.respawnScenePaused = false;
    context.resumeScene();
  }

  private completeRespawnTransition(context: GameSceneFlowContext): void {
    if (!this.respawnInProgress) {
      return;
    }

    this.clearPendingRespawn();
    this.resumeSceneAfterRespawnPause(context);

    if (this.terminalTransitionState !== TERMINAL_TRANSITIONS.none || context.player.isAlive) {
      this.respawnInProgress = false;
      context.collisionManager.setRespawnInProgress(false);
      return;
    }

    context.collisionManager.clearPlayerHazards();
    context.player.spawn(400, 520, {
      hp: context.player.maxHp,
      invulnerabilityDuration: PLAYER_RESPAWN_INVULNERABILITY_MS,
    });
    this.respawnInProgress = false;
    context.collisionManager.setRespawnInProgress(false);
    this.flushQueuedLevelCompleteTransition(context);
  }

  private beginTerminalTransition(
    context: GameSceneFlowContext,
    state: Exclude<TerminalTransitionState, 'none'>
  ): boolean {
    if (state === TERMINAL_TRANSITIONS.playerDeath) {
      this.clearPendingLevelCompleteTransition();
    }

    if (
      state === TERMINAL_TRANSITIONS.playerDeath &&
      this.terminalTransitionState === TERMINAL_TRANSITIONS.levelComplete
    ) {
      this.cancelLevelCompleteTransition(context);
    }

    if (this.terminalTransitionState !== TERMINAL_TRANSITIONS.none) {
      return false;
    }

    this.terminalTransitionState = state;
    context.stopPlayerMotion();
    context.collisionManager.setTerminalTransitionActive(true);
    return true;
  }

  private cancelLevelCompleteTransition(context: GameSceneFlowContext): void {
    if (this.terminalTransitionState !== TERMINAL_TRANSITIONS.levelComplete) {
      return;
    }

    context.warpTransition.cancel();
    this.terminalTransitionState = TERMINAL_TRANSITIONS.none;
    context.collisionManager.setTerminalTransitionActive(false);
  }
}
