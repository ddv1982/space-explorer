import Phaser from 'phaser';
import { Asteroid } from '@/entities/Asteroid';
import { BomberBomb } from '@/entities/BomberBomb';
import { EnemyBullet } from '@/entities/EnemyBullet';
import { Mine } from '@/entities/Mine';

export function clearHazardGroup(group: Phaser.Physics.Arcade.Group): void {
  let children: Phaser.GameObjects.GameObject[];
  try {
    children = group.getChildren();
  } catch {
    return;
  }

  children.forEach((child) => {
    if (!(child instanceof Phaser.GameObjects.GameObject)) return;
    if ('kill' in child && typeof child.kill === 'function') {
      const sprite = child as EnemyBullet | BomberBomb | Mine;
      if (sprite.active) sprite.kill();
    } else if (child instanceof Asteroid && child.active) {
      child.clear();
    }
  });
}
