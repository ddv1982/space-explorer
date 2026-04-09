import Phaser from 'phaser';

/**
 * Common utility to despawn an entity (bullet, asteroid, etc)
 * safely disabling its physics body, velocity, and visibility.
 */
export function despawnEntity(entity: Phaser.Physics.Arcade.Sprite): void {
  entity.setActive(false);
  entity.setVisible(false);
  entity.setVelocity(0, 0);
  const body = entity.body as Phaser.Physics.Arcade.Body | null;
  if (body) {
    body.stop();
    body.enable = false;
  }
}

export function spawnEntity(entity: Phaser.Physics.Arcade.Sprite, x: number, y: number): void {
  entity.setPosition(x, y);

  const body = entity.body as Phaser.Physics.Arcade.Body | null;
  if (body) {
    body.enable = true;
    body.reset(x, y);
  }

  entity.setActive(true);
  entity.setVisible(true);
}

export function isArcadeSimulationPaused(scene: Phaser.Scene): boolean {
  const world = scene.physics?.world;
  return world?.isPaused ?? false;
}
