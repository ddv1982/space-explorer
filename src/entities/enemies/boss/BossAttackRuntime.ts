import Phaser from 'phaser';

import type { EnemyType } from '@/config/LevelsConfig';
import { EnemyBullet } from '@/entities/EnemyBullet';
import { Player } from '@/entities/Player';
import { getViewportBounds } from '@/utils/layout';

type BossSummonHandler = (type: EnemyType, x: number, y: number) => void;

export class BossAttackRuntime {
  private bulletGroup: Phaser.Physics.Arcade.Group | null = null;
  private summonHandler: BossSummonHandler | null = null;
  private player: Player | null = null;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly getBossPosition: () => { x: number; y: number }
  ) {}

  setBulletGroup(group: Phaser.Physics.Arcade.Group): void {
    this.bulletGroup = group;
  }

  setSummonHandler(handler: BossSummonHandler): void {
    this.summonHandler = handler;
  }

  setPlayer(player: Player | null): void {
    this.player = player;
  }

  hasBulletGroup(): boolean {
    return Boolean(this.bulletGroup);
  }

  fireBullet(x: number, y: number, velocityX: number, velocityY: number): void {
    if (!this.bulletGroup) return;
    const bullet =
      (this.bulletGroup.getFirstDead(false) as EnemyBullet | null) ??
      (this.bulletGroup.get(x, y) as EnemyBullet | null);
    if (!bullet) return;
    bullet.fire(x, y);
    bullet.setVelocity(velocityX, velocityY);
  }

  summonEscorts(types: EnemyType[]): void {
    if (!this.summonHandler) return;
    const boss = this.getBossPosition();
    const viewport = getViewportBounds(this.scene);
    const padding = Math.min(50, viewport.width / 2);
    const minX = viewport.left + padding;
    const maxX = Math.max(minX, viewport.right - padding);

    types.forEach((type, index) => {
      const offset = index === 0 ? -36 : 36;
      this.summonHandler?.(type, Phaser.Math.Clamp(boss.x + offset, minX, maxX), boss.y + 10);
    });
  }

  getPlayer(): Player | null {
    if (this.player?.scene === this.scene && this.player.active) return this.player;
    const match = this.scene.children.list.find((child) => child instanceof Player && child.active);
    this.player = (match as Player | undefined) ?? null;
    return this.player;
  }

  getPlayerAimAngle(): number {
    const boss = this.getBossPosition();
    const player = this.getPlayer();
    return player ? Phaser.Math.RadToDeg(Phaser.Math.Angle.Between(boss.x, boss.y, player.x, player.y)) : 90;
  }
}
