import Phaser from 'phaser';
import type { Player } from '../../entities/Player';
import { isPhoneSizedTouchViewport } from '../../utils/device';
import { getActiveGameplayBounds, getGameplayBounds, getViewportBounds } from '../../utils/layout';

function getGameplayViewportRect(scene: Phaser.Scene): ReturnType<typeof getViewportBounds> {
  const viewport = getViewportBounds(scene);
  const gameplayBounds = getGameplayBounds();
  const scale = Math.min(viewport.width / gameplayBounds.width, viewport.height / gameplayBounds.height);
  const width = Math.round(gameplayBounds.width * scale);
  const height = Math.round(gameplayBounds.height * scale);
  const left = Math.round(viewport.left + (viewport.width - width) / 2);
  const top = Math.round(viewport.top + (viewport.height - height) / 2);

  return {
    left,
    top,
    width,
    height,
    right: left + width,
    bottom: top + height,
    centerX: left + width / 2,
    centerY: top + height / 2,
  };
}

export function getPlayerSpawnPoint(scene: Phaser.Scene): { x: number; y: number } {
  const viewport = getActiveGameplayBounds(scene);
  return {
    x: viewport.centerX,
    y: viewport.bottom - 80,
  };
}

export function syncSceneViewport(scene: Phaser.Scene): ReturnType<typeof getViewportBounds> {
  const camera = scene.cameras.main;

  if (!isPhoneSizedTouchViewport()) {
    const viewport = getViewportBounds(scene);
    camera.setViewport(0, 0, viewport.width, viewport.height);
    camera.setSize(viewport.width, viewport.height);
    camera.setBounds(0, 0, viewport.width, viewport.height);
    camera.setZoom(1);
    scene.physics.world.setBounds(0, 0, viewport.width, viewport.height);

    return viewport;
  }

  const gameplayViewport = getGameplayViewportRect(scene);
  const gameplayBounds = getGameplayBounds();
  const zoom = gameplayViewport.width / gameplayBounds.width;

  camera.setViewport(gameplayViewport.left, gameplayViewport.top, gameplayViewport.width, gameplayViewport.height);
  camera.setSize(gameplayViewport.width, gameplayViewport.height);
  camera.setBounds(gameplayBounds.left, gameplayBounds.top, gameplayBounds.width, gameplayBounds.height);
  camera.setZoom(zoom);
  camera.centerOn(gameplayBounds.centerX, gameplayBounds.centerY);
  scene.physics.world.setBounds(gameplayBounds.left, gameplayBounds.top, gameplayBounds.width, gameplayBounds.height);

  return gameplayBounds;
}

export function clampPlayerToViewport(scene: Phaser.Scene, player: Player | null | undefined): void {
  if (!player?.body) {
    return;
  }

  const viewport = getActiveGameplayBounds(scene);
  const halfWidth = player.displayWidth / 2;
  const halfHeight = player.displayHeight / 2;
  const clampedX = Phaser.Math.Clamp(player.x, viewport.left + halfWidth, viewport.right - halfWidth);
  const clampedY = Phaser.Math.Clamp(player.y, viewport.top + halfHeight, viewport.bottom - halfHeight);

  player.setPosition(clampedX, clampedY);
  (player.body as Phaser.Physics.Arcade.Body).updateFromGameObject();
}
