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
import { RespawnFrameProbe } from './respawnFrameProbe';

const PLAYER_RESPAWN_DELAY_MS = 1000;
const PLAYER_RESPAWN_FREEZE_DELAY_MS = 240;
const PLAYER_RESPAWN_INVULNERABILITY_MS = 2000;

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
  getPlayerRespawnPosition: () => { x: number; y: number };
}

export class GameSceneFlowController {
  private gameOver = false;
  private gameOverTransition: Phaser.Time.TimerEvent | null = null;
  private gameOverWatchdog: ReturnType<typeof setTimeout> | null = null;
  private gameOverSceneStarted = false;
  private pendingLevelCompleteTransition: Phaser.Time.TimerEvent | null = null;
  private pendingRespawn: Phaser.Time.TimerEvent | null = null;
  private pendingRespawnFreeze: Phaser.Time.TimerEvent | null = null;
  private terminalTransitionState: TerminalTransitionState = TERMINAL_TRANSITIONS.none;
  private levelCompleteQueued = false;
  private remainingLives = 0;
  private respawnInProgress = false;
  private respawnScenePaused = false;
  private readonly respawnFrameProbe = new RespawnFrameProbe();

  setRespawnFrameProbeEnabled(enabled: boolean): void {
    this.respawnFrameProbe.setEnabled(enabled);
  }

  sampleRespawnTransitionFrame(deltaMs: number): void {
    this.respawnFrameProbe.sampleFrame(deltaMs);
  }

  reset(remainingLives: number): void {
    this.clearPendingTransitions();
    this.resetFlowState(remainingLives);
  }

  shutdown(collisionManager: CollisionManager): void {
    this.clearPendingTransitions();
    collisionManager.setRespawnInProgress(false);
    collisionManager.setTerminalTransitionActive(false);
    this.resetFlowState(0);
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
    this.persistGameOverState(context, finalScore, level);
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
    if (!this.canFlushLevelCompleteTransition(context)) {
      return;
    }

    this.levelCompleteQueued = false;

    if (!this.beginTerminalTransition(context, TERMINAL_TRANSITIONS.levelComplete)) {
      this.levelCompleteQueued = true;
      return;
    }

    this.persistLevelCompleteState(context);
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

  }

  private clearPendingTransitions(): void {
    this.clearGameOverTransitionTimers();
    this.clearPendingLevelCompleteTransition();
    this.clearPendingRespawn();
  }

  private resetFlowState(remainingLives: number): void {
    this.gameOver = false;
    this.gameOverSceneStarted = false;
    this.terminalTransitionState = TERMINAL_TRANSITIONS.none;
    this.levelCompleteQueued = false;
    this.remainingLives = remainingLives;
    this.respawnInProgress = false;
    this.respawnScenePaused = false;
    this.respawnFrameProbe.abort();
  }

  private persistGameOverState(
    context: GameSceneFlowContext,
    finalScore: number,
    level: number
  ): void {
    context.runBestEffort(() => audioManager.stopMusic());
    context.runBestEffort(() => saveRemainingLives(context.registry, 0));
    context.runBestEffort(() => saveScoreToState(context.registry, finalScore));
    context.runBestEffort(() => setRunSummary(context.registry, { finalScore, levelReached: level }));
  }

  private canFlushLevelCompleteTransition(context: GameSceneFlowContext): boolean {
    return (
      this.levelCompleteQueued &&
      !this.respawnInProgress &&
      context.player.isAlive &&
      this.terminalTransitionState === TERMINAL_TRANSITIONS.none
    );
  }

  private persistLevelCompleteState(context: GameSceneFlowContext): void {
    const finalScore = context.scoreManager.getScore();
    saveScoreToState(context.registry, finalScore);
    saveCurrentHp(context.registry, context.player.hp);
    saveRemainingLives(context.registry, this.remainingLives);
    setRunSummary(context.registry, { finalScore });
  }

  private beginRespawnTransition(context: GameSceneFlowContext): void {
    if (this.respawnInProgress || this.terminalTransitionState !== TERMINAL_TRANSITIONS.none) {
      return;
    }

    this.respawnInProgress = true;
    this.respawnFrameProbe.begin(context.scene.time.now);
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
      this.cancelRespawnTransition(context);
      return;
    }

    this.respawnPlayer(context);
    this.finishRespawnTransition(context, 'respawned');
    this.flushQueuedLevelCompleteTransition(context);
  }

  private cancelRespawnTransition(context: GameSceneFlowContext): void {
    this.finishRespawnTransition(context, 'cancelled');
  }

  private respawnPlayer(context: GameSceneFlowContext): void {
    context.collisionManager.clearPlayerHazards();
    const respawnPosition = context.getPlayerRespawnPosition();
    context.player.spawn(respawnPosition.x, respawnPosition.y, {
      hp: context.player.maxHp,
      invulnerabilityDuration: PLAYER_RESPAWN_INVULNERABILITY_MS,
    });
  }

  private finishRespawnTransition(
    context: GameSceneFlowContext,
    outcome: 'cancelled' | 'respawned'
  ): void {
    this.respawnInProgress = false;
    context.collisionManager.setRespawnInProgress(false);
    this.respawnFrameProbe.finish(outcome, context.scene.time.now);
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
