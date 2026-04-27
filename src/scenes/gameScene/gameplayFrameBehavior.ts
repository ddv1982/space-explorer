import type Phaser from 'phaser';
import { BULLET_SPEED } from '../../utils/constants';
import {
  getActiveSection,
  getSectionProgress,
} from '../../config/LevelsConfig';
import type { Boss } from '../../entities/enemies/Boss';
import { audioManager } from '../../systems/AudioManager';
import { GAME_SCENE_EVENTS } from '../../systems/GameplayFlow';
import { resolveSectionMusicIntensity } from '../../systems/sectionIdentity';

interface GameSceneGameplayFrameDelegate {
  inputManager: {
    consumePauseToggleRequest(): boolean;
    isFiring(): boolean;
  };
  pauseStateController: {
    togglePauseRequest(isGameplayLocked: boolean): void;
    isGameplayPaused(): boolean;
  } | null;
  flow: {
    isGameplayLocked(): boolean;
    sampleRespawnTransitionFrame(delta: number): void;
    isTerminalTransitionActive(): boolean;
  };
  parallax: {
    update(delta: number): void;
    setSectionAtmosphere(section: ReturnType<typeof getActiveSection>, sectionProgress: number): void;
  };
  player: {
    isAlive: boolean;
    fireRate: number;
    getFireDirection(out: Phaser.Math.Vector2): Phaser.Math.Vector2;
    getMuzzlePosition(distance: number, out: Phaser.Math.Vector2): Phaser.Math.Vector2;
    update(inputManager: unknown): void;
  };
  lastLifeHelperWing: {
    update(time: number): void;
  } | null;
  waveManager: {
    update(time: number, delta: number, progress: number): void;
  };
  levelManager: {
    progress: number;
    hasBossSpawned(): boolean;
    isComplete(): boolean;
    update(delta: number): void;
    getLevelConfig(): Parameters<typeof getActiveSection>[0];
    shouldSpawnBoss(): boolean;
  };
  events: {
    emit(event: string): void;
  };
  hud: {
    updateBossHp(hp: number, maxHp: number): void;
  };
  bulletPool: {
    fire(x: number, y: number, velocityX: number, velocityY: number): void;
  };
  effectsManager: {
    createMuzzleFlash(x: number, y: number): void;
  };
  boss: Boss | null;
  getLastFireTime(): number;
  setLastFireTime(time: number): void;
  shotDirection: Phaser.Math.Vector2;
  shotOrigin: Phaser.Math.Vector2;
  muzzleFlashOrigin: Phaser.Math.Vector2;
}

interface GameSceneGameplayFrameBehavior {
  handlePauseInput(): void;
  isPausedOrLockedFrame(): boolean;
  updatePausedFrame(delta: number, updateHud: () => void): void;
  updateGameplayFrame(time: number, delta: number): void;
}

export function createGameSceneGameplayFrameBehavior(
  delegate: GameSceneGameplayFrameDelegate
): GameSceneGameplayFrameBehavior {
  const handlePauseInput = (): void => {
    if (delegate.inputManager.consumePauseToggleRequest()) {
      delegate.pauseStateController?.togglePauseRequest(delegate.flow.isGameplayLocked());
    }
  };

  const isPausedOrLockedFrame = (): boolean => {
    return !!delegate.pauseStateController?.isGameplayPaused() || delegate.flow.isGameplayLocked();
  };

  const updatePausedFrame = (delta: number, updateHud: () => void): void => {
    delegate.flow.sampleRespawnTransitionFrame(delta);
    updateHud();
  };

  const updatePlayerFiring = (time: number): void => {
    if (!delegate.inputManager.isFiring() || !delegate.player.isAlive) {
      return;
    }

    if (time <= delegate.getLastFireTime() + delegate.player.fireRate) {
      return;
    }

    delegate.setLastFireTime(time);

    const shotSpeed = Math.abs(BULLET_SPEED);
    const shotDirection = delegate.player.getFireDirection(delegate.shotDirection);
    const shotOrigin = delegate.player.getMuzzlePosition(20, delegate.shotOrigin);
    const muzzleFlashOrigin = delegate.player.getMuzzlePosition(24, delegate.muzzleFlashOrigin);

    delegate.bulletPool.fire(
      shotOrigin.x,
      shotOrigin.y,
      shotDirection.x * shotSpeed,
      shotDirection.y * shotSpeed
    );
    delegate.effectsManager.createMuzzleFlash(muzzleFlashOrigin.x, muzzleFlashOrigin.y);
    audioManager.playLaser();
  };

  const syncSectionPresentation = (): void => {
    const activeSection = getActiveSection(delegate.levelManager.getLevelConfig(), delegate.levelManager.progress);
    const sectionProgress = activeSection
      ? getSectionProgress(activeSection, delegate.levelManager.progress)
      : 0;
    const sectionMusicIntensity = resolveSectionMusicIntensity(activeSection, sectionProgress);

    audioManager.setMusicIntensity(delegate.levelManager.hasBossSpawned() ? 1.1 : sectionMusicIntensity);
    delegate.parallax.setSectionAtmosphere(activeSection, sectionProgress);
  };

  const emitProgressionEvents = (prevComplete: boolean): void => {
    if (delegate.levelManager.shouldSpawnBoss()) {
      delegate.events.emit(GAME_SCENE_EVENTS.bossSpawn);
    }

    if (
      !delegate.flow.isTerminalTransitionActive() &&
      delegate.levelManager.isComplete() &&
      !prevComplete
    ) {
      delegate.events.emit(GAME_SCENE_EVENTS.levelComplete);
    }
  };

  const updateEncounterAndLevelProgress = (time: number, delta: number): void => {
    if (!delegate.levelManager.hasBossSpawned()) {
      delegate.waveManager.update(time, delta, delegate.levelManager.progress);
    }

    const prevComplete = delegate.levelManager.isComplete();
    delegate.levelManager.update(delta);

    syncSectionPresentation();
    emitProgressionEvents(prevComplete);
  };

  const updateBossHudIfNeeded = (): void => {
    if (delegate.boss && delegate.boss.active) {
      delegate.hud.updateBossHp(delegate.boss.hp, delegate.boss.maxHp);
    }
  };

  const updateGameplayFrame = (time: number, delta: number): void => {
    delegate.parallax.update(delta);
    delegate.player.update(delegate.inputManager);
    delegate.lastLifeHelperWing?.update(time);

    updatePlayerFiring(time);
    updateEncounterAndLevelProgress(time, delta);
    updateBossHudIfNeeded();
  };

  return {
    handlePauseInput,
    isPausedOrLockedFrame,
    updatePausedFrame,
    updateGameplayFrame,
  };
}
