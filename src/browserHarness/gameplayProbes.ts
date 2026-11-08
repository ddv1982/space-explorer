import type { PlayerDamageContext } from '@/systems/PlayerDamage';
import type Phaser from 'phaser';

function findPlayer(scene: Phaser.Scene | undefined) {
  return scene?.children.list.find((child) => {
    const candidate = child as Phaser.GameObjects.GameObject & { texture?: Phaser.Textures.Texture };
    return candidate.texture?.key === 'player-ship';
  });
}

export function createBrowserHarnessGameplayProbes(game: Phaser.Game) {
  return {
    probeArcadeOverlap: async (): Promise<boolean> => {
      const scene = game.scene.getScenes(true)[0];
      if (!scene) throw new Error('Browser harness cannot probe collisions without an active scene');
      return new Promise((resolve) => {
        const first = scene.add.zone(-20, -20, 4, 4);
        const second = scene.add.zone(-20, -20, 4, 4);
        scene.physics.add.existing(first);
        scene.physics.add.existing(second);
        let settled = false;
        let collider: Phaser.Physics.Arcade.Collider | null = null;
        let timeout: Phaser.Time.TimerEvent | null = null;
        const finish = (overlapped: boolean): void => {
          if (settled) return;
          settled = true;
          timeout?.remove(false);
          collider?.destroy();
          first.destroy();
          second.destroy();
          resolve(overlapped);
        };
        collider = scene.physics.add.overlap(first, second, () => finish(true));
        timeout = scene.time.delayedCall(250, () => finish(false));
      });
    },
    probeAcceptedPlayerDamage: (amount = 1) => {
      const scene = game.scene.getScenes(true).find((candidate) => candidate.scene.key === 'Game') as
        | (Phaser.Scene & {
            collisionManager?: { processAcceptedPlayerDamage: (options: PlayerDamageContext) => void };
          })
        | undefined;
      const player = findPlayer(scene) as
        | (Phaser.GameObjects.GameObject & {
            hp: number;
            maxHp: number;
            shields: number;
            invulnerable: boolean;
            deathStarted: boolean;
          })
        | undefined;
      if (!player || !scene?.collisionManager) {
        throw new Error('Browser harness cannot probe accepted player damage without active gameplay');
      }
      player.hp = player.maxHp;
      player.shields = 0;
      player.invulnerable = false;
      player.deathStarted = false;
      const beforeHp = player.hp;
      scene.collisionManager.processAcceptedPlayerDamage({ amount, source: 'unknown' });
      const afterHp = player.hp;
      return { beforeHp, afterHp, damage: beforeHp - afterHp };
    },
  };
}
