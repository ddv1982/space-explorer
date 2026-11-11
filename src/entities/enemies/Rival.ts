import Phaser from 'phaser';
import { EnemyBase } from './EnemyBase';
import { bankToFrame, PLAYER_SPRITE } from '../../config/shipyardSprites';
import {
  RIVAL_ACCELERATION,
  RIVAL_ATTACK_MS,
  RIVAL_EVADE_MS,
  RIVAL_EVADE_OFFSET,
  RIVAL_FIRE_RATE,
  RIVAL_HITS_TO_DEFEAT,
  RIVAL_MAX_SPEED,
  RIVAL_SCORE,
  RIVAL_TINT,
} from '../../utils/constants';
import { EnemyBullet } from '../EnemyBullet';

type RivalPhase = 'enter' | 'attack' | 'evade';
type TargetProvider = () => { x: number; y: number } | null;

const ENTER_SPEED = 150;
/** The rival only shoots when it has the player roughly in its sights. */
const AIM_WINDOW = 70;
const EDGE_MARGIN = 40;

/**
 * A duel against the player's own hull flown at half strength: half the thrust and top speed, half
 * the fire rate, half-speed bolts. It lines up on the player to shoot, then breaks away to dodge
 * the return fire, and stays in the fight until one of the two ships is gone.
 */
export class Rival extends EnemyBase {
  private bulletGroup: Phaser.Physics.Arcade.Group | null = null;
  private targetProvider: TargetProvider | null = null;
  private phase: RivalPhase = 'enter';
  private phaseStart = 0;
  private lastFireTime = 0;
  private evadeSide = 1;
  private velocityX = 0;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, PLAYER_SPRITE.key);
    this.setFlipY(true);
    this.maxHp = RIVAL_HITS_TO_DEFEAT;
    this.hp = this.maxHp;
    this.scoreValue = RIVAL_SCORE;
    this.enemyType = 'rival';
    this.despawnOffscreen = false;
  }

  setEnemyBulletGroup(group: Phaser.Physics.Arcade.Group): void {
    this.bulletGroup = group;
  }

  setTargetProvider(provider: TargetProvider): void {
    this.targetProvider = provider;
  }

  /** The hull is rated in hits from the player's current guns, so the duel lasts as long at any tier. */
  setPlayerDamage(damage: number): void {
    this.maxHp = RIVAL_HITS_TO_DEFEAT * Math.max(1, damage);
  }

  protected alwaysDropsPowerUp(): boolean {
    return true;
  }

  spawn(x: number, y: number): void {
    super.spawn(x, y);
    this.phase = 'enter';
    this.phaseStart = 0;
    this.lastFireTime = 0;
    this.velocityX = 0;
    this.evadeSide = x < this.scene.cameras.main.width / 2 ? 1 : -1;
    this.setVelocity(0, ENTER_SPEED);
    this.restoreBaseTint();
  }

  protected restoreBaseTint(): void {
    if (this.isAce()) {
      super.restoreBaseTint();
      return;
    }
    this.setTint(RIVAL_TINT);
    this.setTintMode(Phaser.TintModes.MULTIPLY);
  }

  updateBehavior(time: number, delta: number): void {
    const { width, height } = this.scene.cameras.main;
    if (this.phase === 'enter') {
      if (this.y < Math.max(110, height * 0.18)) return;
      this.setVelocityY(0);
      this.startPhase('attack', time);
    }

    const target = this.targetProvider?.() ?? null;
    const phaseMs = this.phase === 'attack' ? RIVAL_ATTACK_MS : RIVAL_EVADE_MS;
    if (time > this.phaseStart + phaseMs) {
      if (this.phase === 'attack') this.evadeSide = -this.evadeSide;
      this.startPhase(this.phase === 'attack' ? 'evade' : 'attack', time);
    }

    const aimX = target?.x ?? width / 2;
    const goalX = this.phase === 'attack' ? aimX : aimX + this.evadeSide * RIVAL_EVADE_OFFSET;
    this.steerToward(Phaser.Math.Clamp(goalX, EDGE_MARGIN, width - EDGE_MARGIN), delta);

    const aligned = target !== null && Math.abs(target.x - this.x) < AIM_WINDOW;
    if (this.phase === 'attack' && aligned && time > this.lastFireTime + RIVAL_FIRE_RATE) {
      this.lastFireTime = time;
      this.fire();
    }
  }

  private startPhase(phase: RivalPhase, time: number): void {
    this.phase = phase;
    this.phaseStart = time;
  }

  /** Thrust toward the goal and brake into it, the way the player's ship flies. */
  private steerToward(goalX: number, delta: number): void {
    const wanted = Phaser.Math.Clamp((goalX - this.x) * 4, -RIVAL_MAX_SPEED, RIVAL_MAX_SPEED);
    const step = RIVAL_ACCELERATION * (delta / 1000);
    this.velocityX += Phaser.Math.Clamp(wanted - this.velocityX, -step, step);
    this.setVelocityX(this.velocityX);
    this.setFrame(String(bankToFrame(this.velocityX / RIVAL_MAX_SPEED, PLAYER_SPRITE.frames)));
  }

  private fire(): void {
    const bullet =
      (this.bulletGroup?.getFirstDead(false) as EnemyBullet | null) ??
      (this.bulletGroup?.get(this.x, this.y + 24) as EnemyBullet | null);
    bullet?.fire(this.x, this.y + 24);
  }
}
