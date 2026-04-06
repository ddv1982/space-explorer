import Phaser from 'phaser';
import { EnemyBase } from './EnemyBase';
import { EnemyBullet } from '../EnemyBullet';
import { ENEMY_BULLET_SPEED, GAME_WIDTH } from '../../utils/constants';
import { GAME_SCENE_EVENTS } from '../../systems/GameplayFlow';

export class Boss extends EnemyBase {
  phase: number = 1;
  private targetY: number = 80;
  private moveDir: number = 1;
  private moveSpeed: number = 80;
  private lastFireTime: number = 0;
  private phase1Cooldown: number = 1500;
  private phase2Cooldown: number = 800;
  private bulletGroup: Phaser.Physics.Arcade.Group | null = null;
  private arrived: boolean = false;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    const key = 'boss-texture';
    if (!scene.textures.exists(key)) {
      const g = scene.add.graphics();

      // Main hull
      g.fillStyle(0xcc2244, 1);
      g.fillRect(16, 8, 48, 32);
      g.fillStyle(0xaa1133, 1);
      g.fillRect(0, 20, 16, 16);
      g.fillRect(64, 20, 16, 16);

      // Wings
      g.fillStyle(0xdd3355, 1);
      g.beginPath();
      g.moveTo(0, 36);
      g.lineTo(16, 20);
      g.lineTo(16, 40);
      g.closePath();
      g.fillPath();
      g.beginPath();
      g.moveTo(80, 36);
      g.lineTo(64, 20);
      g.lineTo(64, 40);
      g.closePath();
      g.fillPath();

      // Core
      g.fillStyle(0xff6688, 1);
      g.fillCircle(40, 24, 8);

      // Cannons
      g.fillStyle(0x881122, 1);
      g.fillRect(20, 40, 8, 8);
      g.fillRect(36, 40, 8, 8);
      g.fillRect(52, 40, 8, 8);

      g.generateTexture(key, 80, 48);
      g.destroy();
    }

    super(scene, x, y, key);
    this.maxHp = 30;
    this.hp = 30;
    this.speed = 0;
    this.scoreValue = 2000;
    this.enemyType = 'boss';
  }

  setEnemyBulletGroup(group: Phaser.Physics.Arcade.Group): void {
    this.bulletGroup = group;
  }

  spawn(x: number, y: number): void {
    super.spawn(x, y);
    this.phase = 1;
    this.arrived = false;
    this.lastFireTime = 0;
    this.moveDir = 1;
    this.setVelocityY(60);
  }

  updateBehavior(time: number, delta: number): void {
    if (!this.arrived) {
      if (this.y >= this.targetY) {
        this.arrived = true;
        this.setVelocityY(0);
      }
      return;
    }

    // Horizontal movement
    this.x += this.moveSpeed * this.moveDir * delta / 1000;
    if (this.x > GAME_WIDTH - 60) this.moveDir = -1;
    if (this.x < 60) this.moveDir = 1;

    // Phase check
    const hpPercent = this.hp / this.maxHp;
    if (hpPercent <= 0.5 && this.phase === 1) {
      this.phase = 2;
      this.moveSpeed = 130;
      this.flashPhaseChange();
    }

    // Attack based on phase
    const cooldown = this.phase === 1 ? this.phase1Cooldown : this.phase2Cooldown;
    if (this.bulletGroup && time > this.lastFireTime + cooldown) {
      this.lastFireTime = time;
      if (this.phase === 1) {
        this.fireSpread();
      } else {
        this.fireSpiral(time);
      }
    }
  }

  private fireSpread(): void {
    if (!this.bulletGroup) return;
    const angles = [-30, -15, 0, 15, 30];
    for (const angleDeg of angles) {
      const bullet =
        (this.bulletGroup.getFirstDead(false) as EnemyBullet | null) ??
        (this.bulletGroup.get(this.x, this.y + 30) as EnemyBullet | null);
      if (bullet) {
        const rad = Phaser.Math.DegToRad(angleDeg + 90);
        bullet.fire(this.x, this.y + 30);
        bullet.setVelocity(
          Math.cos(rad) * ENEMY_BULLET_SPEED * 0.8,
          Math.sin(rad) * ENEMY_BULLET_SPEED * 0.8
        );
      }
    }
  }

  private fireSpiral(time: number): void {
    if (!this.bulletGroup) return;
    const baseAngle = (time / 500) * 60;
    for (let i = 0; i < 3; i++) {
      const bullet =
        (this.bulletGroup.getFirstDead(false) as EnemyBullet | null) ??
        (this.bulletGroup.get(this.x, this.y + 30) as EnemyBullet | null);
      if (bullet) {
        const angleDeg = baseAngle + i * 120;
        const rad = Phaser.Math.DegToRad(angleDeg);
        bullet.fire(this.x, this.y + 30);
        bullet.setVelocity(
          Math.cos(rad) * ENEMY_BULLET_SPEED * 0.9,
          Math.sin(rad) * ENEMY_BULLET_SPEED * 0.9
        );
      }
    }
  }

  private flashPhaseChange(): void {
    this.setTint(0xff0000);
    this.scene.cameras.main.shake(300, 0.02);
    this.scene.time.delayedCall(300, () => {
      if (this.active) this.clearTint();
    });
  }

  die(): void {
    this.scene.events.emit(GAME_SCENE_EVENTS.bossDeath, this.scoreValue, this.x, this.y);
    this.scene.events.emit(GAME_SCENE_EVENTS.enemyDeath, this.scoreValue, this.x, this.y);
    this.setActive(false);
    this.setVisible(false);
    this.setVelocity(0, 0);
    (this.body as Phaser.Physics.Arcade.Body).reset(0, 0);
  }
}
