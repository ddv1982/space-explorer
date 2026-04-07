import Phaser from 'phaser';

/**
 * Common utility to despawn an entity (bullet, asteroid, etc)
 * safely disabling its physics body, velocity, and visibility.
 */
export function despawnEntity(entity: Phaser.Physics.Arcade.Sprite): void {
  entity.setActive(false);
  entity.setVisible(false);
  entity.setVelocity(0, 0);
  if (entity.body) {
    (entity.body as Phaser.Physics.Arcade.Body).reset(0, 0);
  }
}

export function isArcadeSimulationPaused(scene: Phaser.Scene): boolean {
  const world = scene.physics?.world;
  return world?.isPaused ?? false;
}
