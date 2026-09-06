import Phaser from 'phaser';
import { BulletPool } from '../../src/systems/BulletPool';
import { Bullet } from '../../src/entities/Bullet';

export function inspectPreparedBulletPool(): Promise<{
  initialCount: number;
  initiallyDormant: boolean;
  reusedFirst: boolean;
  firedState: boolean;
  reusedAfterKill: boolean;
  capacity: number;
  activeAtCapacity: number;
  rejectsOverflow: boolean;
}> {
  return new Promise((resolve, reject) => {
    class ProbeScene extends Phaser.Scene {
      create(): void {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = 8;
          canvas.height = 18;
          this.textures.addCanvas('player-bullet', canvas);
          const pool = new BulletPool();
          pool.create(this);
          const group = pool.getGroup();
          const initialCount = group.getLength();
          const first = group.getFirstDead(false);
          if (!(first instanceof Bullet) || !(first.body instanceof Phaser.Physics.Arcade.Body)) {
            throw new Error('Pool must contain a prepared Bullet with a dynamic body');
          }
          const initiallyDormant =
            !first.active && !first.visible && !first.body.enable && first.body.velocity.length() === 0;
          const shot = pool.fire(120, 200, 0, -600);
          const firedState =
            first.active &&
            first.visible &&
            first.body.enable &&
            first.x === 120 &&
            first.y === 200 &&
            first.body.velocity.y === -600;
          first.kill();
          const reusedAfterKill = pool.fire(200, 300) === first;
          for (let count = group.getLength(); count < group.maxSize; count++) pool.fire(120, 200);
          const result = {
            initialCount,
            initiallyDormant,
            reusedFirst: shot === first,
            firedState,
            reusedAfterKill,
            capacity: group.maxSize,
            activeAtCapacity: group.countActive(true),
            rejectsOverflow: pool.fire(0, 0) === null,
          };
          this.game.destroy(true);
          resolve(result);
        } catch (error) {
          this.game.destroy(true);
          reject(error);
        }
      }
    }
    new Phaser.Game({
      type: Phaser.WEBGL,
      width: 1280,
      height: 720,
      audio: { noAudio: true },
      banner: false,
      physics: { default: 'arcade', arcade: { gravity: { x: 0, y: 0 } } },
      scene: [ProbeScene],
    });
  });
}
