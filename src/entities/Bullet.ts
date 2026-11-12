import Phaser from 'phaser';
import { BULLET_SPEED } from '../utils/constants';
import { despawnEntity, isArcadeSimulationPaused, spawnEntity } from '../utils/entityUtils';
import { GAME_SCENE_EVENTS } from '../systems/GameplayFlow';
import { ensurePlayerBulletTexture } from '../utils/SpriteFactory';
import { getRuntimeTrailInterval } from '../systems/RuntimePerformanceBudget';

/** Where a seeking shot should steer: the nearest live target, or null to fly straight. */
export type BulletTargetFinder = (x: number, y: number) => { x: number; y: number } | null;

export interface BulletBehaviour {
  /** Pierces: passes through ships, damaging each one once. */
  pierce?: boolean;
  /** Seeks: turns toward the target `findTarget` returns, at this many degrees per second. */
  seekDegreesPerSecond?: number;
  findTarget?: BulletTargetFinder;
}

export class Bullet extends Phaser.Physics.Arcade.Sprite {
  private static readonly trailIntervalMs = 150;
  private lastTrailTime = 0;
  private pierce = false;
  private seekRadiansPerMs = 0;
  private findTarget: BulletTargetFinder | null = null;
  private readonly piercedTargets = new Set<object>();

  constructor(scene: Phaser.Scene, x: number, y: number) {
    ensurePlayerBulletTexture(scene);

    super(scene, x, y, 'player-bullet');
    scene.add.existing(this);
    scene.physics.add.existing(this);

    despawnEntity(this);
    this.setDepth(4);
    this.setBlendMode(Phaser.BlendModes.ADD);
    // The texture carries a glow halo; the hitbox stays the original 8x18 bolt.
    (this.body as Phaser.Physics.Arcade.Body | null)?.setSize(8, 18);
  }

  fire(x: number, y: number, velocityX: number = 0, velocityY?: number, behaviour: BulletBehaviour = {}): void {
    const resolvedVelocityY = velocityY ?? BULLET_SPEED;

    spawnEntity(this, x, y);
    this.lastTrailTime = 0;
    this.pierce = behaviour.pierce === true;
    this.seekRadiansPerMs = Phaser.Math.DegToRad(behaviour.seekDegreesPerSecond ?? 0) / 1000;
    this.findTarget = behaviour.findTarget ?? null;
    this.piercedTargets.clear();
    this.setVelocity(velocityX, resolvedVelocityY);
    this.setRotation(Phaser.Math.Angle.Between(0, 0, velocityX, resolvedVelocityY) + Phaser.Math.DegToRad(90));
  }

  /**
   * Called when the shot overlaps a ship. Returns whether the hit counts: a piercing shot damages each
   * ship once and flies on; any other shot is spent on its first hit.
   */
  registerHit(target: object): boolean {
    if (!this.pierce) {
      this.kill();
      return true;
    }
    if (this.piercedTargets.has(target)) return false;
    this.piercedTargets.add(target);
    return true;
  }

  kill(): void {
    despawnEntity(this);
    this.lastTrailTime = 0;
    this.piercedTargets.clear();
    this.findTarget = null;
    this.setRotation(0);
  }

  private steerTowardTarget(delta: number): void {
    const target = this.findTarget?.(this.x, this.y);
    const body = this.body as Phaser.Physics.Arcade.Body | null;
    if (!target || !body) return;
    const heading = Math.atan2(body.velocity.y, body.velocity.x);
    const wanted = Math.atan2(target.y - this.y, target.x - this.x);
    const maxTurn = this.seekRadiansPerMs * delta;
    const next = heading + Phaser.Math.Clamp(Phaser.Math.Angle.Wrap(wanted - heading), -maxTurn, maxTurn);
    const speed = body.velocity.length();
    this.setVelocity(Math.cos(next) * speed, Math.sin(next) * speed);
    this.setRotation(next + Phaser.Math.DegToRad(90));
  }

  preUpdate(time: number, delta: number): void {
    super.preUpdate(time, delta);
    if (isArcadeSimulationPaused(this.scene)) {
      return;
    }

    if (this.active && this.seekRadiansPerMs > 0) this.steerTowardTarget(delta);

    if (this.active && time >= this.lastTrailTime + getRuntimeTrailInterval(Bullet.trailIntervalMs)) {
      this.lastTrailTime = time;
      this.scene.events.emit(GAME_SCENE_EVENTS.playerBulletTrail, this.x, this.y + 6);
    }

    const { width, height } = this.scene.cameras.main;
    if (this.x < -20 || this.x > width + 20 || this.y < -20 || this.y > height + 20) {
      this.kill();
    }
  }
}
