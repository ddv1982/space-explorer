import Phaser from 'phaser';
import { Player } from '@/entities/Player';
import { InputManager } from '@/systems/InputManager';
import { LevelManager } from '@/systems/LevelManager';
import { GameplayClock } from '@/systems/GameplayClock';
import { PauseStateController } from '@/scenes/gameScene/PauseStateController';
import { GameSceneFlowController } from '@/scenes/gameScene/GameSceneFlowController';
import { getActiveSection } from '@/config/LevelsConfig';
import type { GameFeelFrame, GameFeelEventDetail } from './gameFeelRecording';

export function bindGameFeelRuntime(scene: Phaser.Scene) {
  if (
    !('player' in scene) ||
    !(scene.player instanceof Player) ||
    !('inputManager' in scene) ||
    !(scene.inputManager instanceof InputManager) ||
    !('levelManager' in scene) ||
    !(scene.levelManager instanceof LevelManager) ||
    !('gameplayClock' in scene) ||
    !(scene.gameplayClock instanceof GameplayClock) ||
    !('pauseStateController' in scene) ||
    !(scene.pauseStateController instanceof PauseStateController) ||
    !('flow' in scene) ||
    !(scene.flow instanceof GameSceneFlowController) ||
    !('lastFireTime' in scene) ||
    typeof scene.lastFireTime !== 'number' ||
    !Number.isFinite(scene.lastFireTime)
  ) {
    throw new Error('Game feel runtime adapter is unavailable');
  }
  const { player, inputManager, levelManager, gameplayClock, pauseStateController, flow } = scene;
  if (!(player.body instanceof Phaser.Physics.Arcade.Body)) throw new Error('Player physics body is unavailable');
  const body = player.body;
  return (wallMs: number, segmentId: number, deltaMs: number): GameFeelFrame => {
    const lastFireTime = scene.lastFireTime;
    if (typeof lastFireTime !== 'number' || !Number.isFinite(lastFireTime))
      throw new Error('Fire clock is unavailable');
    return {
      wallMs,
      segmentId,
      deltaMs,
      gameplayMs: gameplayClock.now,
      level: levelManager.currentLevel,
      section: getActiveSection(levelManager.getLevelConfig(), levelManager.progress)?.id.slice(0, 80) ?? null,
      progress: levelManager.progress,
      x: player.x,
      y: player.y,
      accelerationX: body.acceleration.x,
      accelerationY: body.acceleration.y,
      velocityX: body.velocity.x,
      velocityY: body.velocity.y,
      firingIntent: inputManager.isFiring(),
      lastFireGameplayMs: lastFireTime,
      hp: player.hp,
      shields: player.shields,
      alive: player.isAlive,
      manualPause: pauseStateController.isGameplayPaused(),
      physicsPause: scene.physics.world.isPaused,
      flowLock: flow.isGameplayLocked(),
      captureCostMs: 0,
    };
  };
}

export function captureGameFeelOccupancy(scene: Phaser.Scene): Extract<GameFeelEventDetail, { kind: 'occupancy' }> {
  const bodies: Extract<GameFeelEventDetail, { kind: 'occupancy' }>['bodies'] = [];
  let totalEnabledBodies = 0;
  for (const body of scene.physics.world.bodies) {
    if (!body.enable) continue;
    totalEnabledBodies += 1;
    if (bodies.length === 64) continue;
    const object = body.gameObject;
    const texture =
      object instanceof Phaser.GameObjects.Sprite || object instanceof Phaser.GameObjects.Image
        ? object.texture.key.slice(0, 80)
        : null;
    bodies.push({ texture, x: body.x, y: body.y, width: body.width, height: body.height });
  }
  return { kind: 'occupancy', totalEnabledBodies, truncated: totalEnabledBodies > bodies.length, bodies };
}
