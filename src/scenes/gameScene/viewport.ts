import Phaser from 'phaser';
import type { Player } from '../../entities/Player';
import { getViewportBounds } from '../../utils/layout';

export function getPlayerSpawnPoint(scene: Phaser.Scene): { x: number; y: number } {
  const viewport = getViewportBounds(scene);
  return {
    x: viewport.centerX,
    y: viewport.bottom - 80,
  };
}

export function syncSceneViewport(scene: Phaser.Scene): ReturnType<typeof getViewportBounds> {
  const viewport = getViewportBounds(scene);
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

  const viewport = getViewportBounds(scene);
  const halfWidth = player.displayWidth / 2;
  const halfHeight = player.displayHeight / 2;
  const clampedX = Phaser.Math.Clamp(player.x, viewport.left + halfWidth, viewport.right - halfWidth);
  const clampedY = Phaser.Math.Clamp(player.y, viewport.top + halfHeight, viewport.bottom - halfHeight);

  player.setPosition(clampedX, clampedY);
  (player.body as Phaser.Physics.Arcade.Body).updateFromGameObject();
}
