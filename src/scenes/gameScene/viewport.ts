import Phaser from 'phaser';
import type { Player } from '../../entities/Player';
import { getViewportBounds } from '../../utils/layout';

export function getSceneViewportBounds(scene: Phaser.Scene): ReturnType<typeof getViewportBounds> {
  return getViewportBounds(scene);
}

export function getPlayerSpawnPoint(scene: Phaser.Scene): { x: number; y: number } {
  const viewport = getSceneViewportBounds(scene);

  return {
    x: viewport.centerX,
    y: viewport.bottom - 80,
  };
}

export function syncSceneViewport(scene: Phaser.Scene): ReturnType<typeof getViewportBounds> {
  const viewport = getSceneViewportBounds(scene);

  scene.cameras.main.setViewport(0, 0, viewport.width, viewport.height);
  scene.cameras.main.setSize(viewport.width, viewport.height);
  scene.cameras.main.setBounds(0, 0, viewport.width, viewport.height);
  scene.physics.world.setBounds(0, 0, viewport.width, viewport.height);

  return viewport;
}

export function clampPlayerToViewport(scene: Phaser.Scene, player: Player | null | undefined): void {
  if (!player?.body) {
    return;
  }

  const viewport = getSceneViewportBounds(scene);
  const halfWidth = player.displayWidth / 2;
  const halfHeight = player.displayHeight / 2;
  const clampedX = Phaser.Math.Clamp(player.x, viewport.left + halfWidth, viewport.right - halfWidth);
  const clampedY = Phaser.Math.Clamp(player.y, viewport.top + halfHeight, viewport.bottom - halfHeight);

  player.setPosition(clampedX, clampedY);
  (player.body as Phaser.Physics.Arcade.Body).updateFromGameObject();
}
