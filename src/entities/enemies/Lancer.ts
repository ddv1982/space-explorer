import Phaser from 'phaser';
import { EnemyBase } from './EnemyBase';
import { LANCER_FIRE_RATE, LANCER_HP, LANCER_SCORE, LANCER_SPEED, LANCER_TELEGRAPH_MS } from '../../utils/constants';
import { EnemyBullet } from '../EnemyBullet';
import { ensureLancerTexture } from '../../utils/SpriteFactory';

type LancerPhase = 'descend' | 'idle' | 'telegraph';
type TargetProvider = () => { x: number; y: number } | null;

export class Lancer extends EnemyBase {
  private bulletGroup: Phaser.Physics.Arcade.Group | null = null;
  private targetProvider: TargetProvider | null = null;
  private phase: LancerPhase = 'descend';
  private holdY: number = 130;
  private cycleStart: number = 0;
  private telegraphStart: number = 0;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    ensureLancerTexture(scene);

    super(scene, x, y, 'lancer-texture');
    this.maxHp = LANCER_HP;
    this.hp = LANCER_HP;
    this.speed = LANCER_SPEED;
    this.scoreValue = LANCER_SCORE;
    this.enemyType = 'lancer';
  }

  setEnemyBulletGroup(group: Phaser.Physics.Arcade.Group): void {
    this.bulletGroup = group;
  }

  setTargetProvider(provider: TargetProvider): void {
    this.targetProvider = provider;
  }

  spawn(x: number, y: number): void {
    super.spawn(x, y);
    this.phase = 'descend';
    this.holdY = Phaser.Math.Between(100, 160);
    this.cycleStart = 0;
    this.telegraphStart = 0;
    // The telegraph blink can leave a pooled instance faded; restore full opacity.
    this.setAlpha(1);
    this.setVelocityY(this.speed);
  }

  updateBehavior(time: number, _delta: number): void {
    if (this.phase === 'descend') {
      if (this.y >= this.holdY) {
        this.phase = 'idle';
        this.cycleStart = time;
        this.setVelocityY(0);
      }
      return;
    }

    if (this.phase === 'idle') {
      if (time > this.cycleStart + LANCER_FIRE_RATE) {
        this.phase = 'telegraph';
        this.telegraphStart = time;
        this.setTint(0xffd27a);
      }
      return;
    }

    this.setAlpha(time % 160 < 80 ? 0.55 : 1);
    if (time > this.telegraphStart + LANCER_TELEGRAPH_MS) {
      // Ace lancers return to their gilded sheen instead of a bare clearTint.
      this.restoreBaseTint();
      this.setAlpha(1);
      this.fireBolt();
      this.phase = 'idle';
      this.cycleStart = time;
    }
  }

  private fireBolt(): void {
    if (!this.bulletGroup) {
      return;
    }

    const bullet =
      (this.bulletGroup.getFirstDead(false) as EnemyBullet | null) ??
      (this.bulletGroup.get(this.x, this.y + 18) as EnemyBullet | null);
    if (!bullet) {
      return;
    }

    const target = this.targetProvider?.() ?? null;
    if (target) {
      bullet.fireAimed(this.x, this.y + 18, target.x, target.y);
    } else {
      bullet.fireAimed(this.x, this.y + 18, this.x, this.y + 400);
    }
  }
}
