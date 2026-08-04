import type Phaser from 'phaser';
import { BULLET_SPEED } from '@/utils/constants';
import {
  getActiveSection,
  getSectionProgress,
} from '@/config/LevelsConfig';
import type { Boss } from '@/entities/enemies/Boss';
import { audioManager } from '@/systems/AudioManager';
import { resolvePlayerFireCooldownMs } from '@/systems/chainOverdrive';
import { GAME_SCENE_EVENTS } from '@/systems/GameplayFlow';
import type { ChainState } from '@/systems/ScoreManager';
import { resolveSectionMusicIntensity } from '@/systems/sectionIdentity';

const MUSIC_INTENSITY_UPDATE_THRESHOLD = 0.01;

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
    update(inputManager: unknown, delta: number): void;
  };
  getLastLifeHelperWing(): {
    update(time: number, delta: number): void;
  } | null;
  getPicketTurrets(): {
    update(time: number): void;
  } | null;
  grazeSurge: {
    update(): void;
  };
  waveManager: {
    update(time: number, delta: number, progress: number): void;
    updateBossAdds(time: number): void;
  };
  levelManager: {
    progress: number;
    hasBossSpawned(): boolean;
    isComplete(): boolean;
    update(delta: number): void;
    getLevelConfig(): Parameters<typeof getActiveSection>[0];
    shouldSpawnBoss(): boolean;
  };
  scoreManager: {
    getChainState(time: number): ChainState;
  };
  events: {
    emit(event: string): void;
  };
  hud: {
    updateBossHp(hp: number, maxHp: number): void;
    updateBossGuard(ratio: number | null, broken: boolean): void;
  };
  bulletPool: {
    fire(x: number, y: number, velocityX: number, velocityY: number): void;
  };
  effectsManager: {
    createMuzzleFlash(x: number, y: number): void;
  };
  getBoss(): Boss | null;
  getLastFireTime(): number;
  setLastFireTime(time: number): void;
  shotDirection: Phaser.Math.Vector2;
  shotOrigin: Phaser.Math.Vector2;
  muzzleFlashOrigin: Phaser.Math.Vector2;
}

export interface GameSceneGameplayFrameBehavior {
  handlePauseInput(): void;
  isPausedOrLockedFrame(): boolean;
  updatePausedFrame(delta: number, updateHud: () => void): void;
  updateGameplayFrame(time: number, delta: number): void;
}

export function createGameSceneGameplayFrameBehavior(
  delegate: GameSceneGameplayFrameDelegate
): GameSceneGameplayFrameBehavior {
  type ActiveSection = ReturnType<typeof getActiveSection>;

  let cachedLevelConfig: Parameters<typeof getActiveSection>[0] | null = null;
  let cachedSection: ActiveSection = null;
  let lastPresentedSection: ActiveSection | undefined;
  let lastPresentedSectionProgress: number | undefined;
  let lastMusicIntensity: number | undefined;
  let lastMusicSection: ActiveSection | undefined;
  let lastBossSpawned: boolean | undefined;

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

    // Max-chain Overdrive tightens the cooldown while the chain sits at its
    // cap; the live chain read drops the benefit the moment the chain falls.
    const fireCooldown = resolvePlayerFireCooldownMs(
      delegate.player.fireRate,
      delegate.scoreManager.getChainState(time).multiplier
    );
    if (time <= delegate.getLastFireTime() + fireCooldown) {
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
    const levelConfig = delegate.levelManager.getLevelConfig();
    const progress = delegate.levelManager.progress;
    const cachedSectionStillActive = cachedLevelConfig === levelConfig && cachedSection !== null
      && progress >= cachedSection.startProgress
      && (progress < cachedSection.endProgress || (progress === 1 && cachedSection.endProgress === 1));

    if (!cachedSectionStillActive) {
      cachedLevelConfig = levelConfig;
      cachedSection = getActiveSection(levelConfig, progress);
    }

    const activeSection = cachedSection;
    const sectionProgress = activeSection
      ? getSectionProgress(activeSection, progress)
      : 0;
    const bossSpawned = delegate.levelManager.hasBossSpawned();
    const musicIntensity = bossSpawned
      ? 1.1
      : resolveSectionMusicIntensity(activeSection, sectionProgress);

    const musicContextChanged = activeSection !== lastMusicSection || bossSpawned !== lastBossSpawned;
    const musicIntensityChanged = lastMusicIntensity === undefined
      || Math.abs(musicIntensity - lastMusicIntensity) >= MUSIC_INTENSITY_UPDATE_THRESHOLD;
    if (musicContextChanged || musicIntensityChanged) {
      audioManager.setMusicIntensity(musicIntensity);
      lastMusicIntensity = musicIntensity;
      lastMusicSection = activeSection;
      lastBossSpawned = bossSpawned;
    }

    if (activeSection !== lastPresentedSection || sectionProgress !== lastPresentedSectionProgress) {
      delegate.parallax.setSectionAtmosphere(activeSection, sectionProgress);
      lastPresentedSection = activeSection;
      lastPresentedSectionProgress = sectionProgress;
    }
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
    } else if (delegate.levelManager.getLevelConfig().bossAddWaves) {
      delegate.waveManager.updateBossAdds(time);
    }

    const prevComplete = delegate.levelManager.isComplete();
    delegate.levelManager.update(delta);

    syncSectionPresentation();
    emitProgressionEvents(prevComplete);
  };

  const updateBossHudIfNeeded = (): void => {
    const boss = delegate.getBoss();

    if (boss && boss.active) {
      delegate.hud.updateBossHp(boss.hp, boss.maxHp);
      const guard = boss.getGuardState();
      delegate.hud.updateBossGuard(guard.enabled ? guard.ratio : null, guard.broken);
    }
  };

  const updateGameplayFrame = (time: number, delta: number): void => {
    delegate.parallax.update(delta);
    delegate.player.update(delegate.inputManager, delta);
    delegate.getLastLifeHelperWing()?.update(time, delta);
    delegate.getPicketTurrets()?.update(time);
    delegate.grazeSurge.update();

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
