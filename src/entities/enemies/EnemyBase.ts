import Phaser from 'phaser';
import { ACE_HP_MULTIPLIER, ACE_SCORE_MULTIPLIER, ACE_TINT } from '../../config/aceConfig';
import { GAME_SCENE_EVENTS } from '../../systems/GameplayFlow';
import { despawnEntity, isArcadeSimulationPaused, spawnEntity } from '../../utils/entityUtils';

export abstract class EnemyBase extends Phaser.Physics.Arcade.Sprite {
  hp: number = 1;
  maxHp: number = 1;
  speed: number = 100;
  scoreValue: number = 100;
  enemyType: string = 'base';
  despawnOffscreen: boolean = true;
  private visualFlashToken = 0;
  private defeatCount = 0;
  private aceMarked = false;
  private baseMaxHp: number | null = null;
  private baseScoreValue: number | null = null;
  private gameplayTime: number | null = null;

  constructor(scene: Phaser.Scene, x: number, y: number, textureKey: string) {
    super(scene, x, y, textureKey);
    scene.add.existing(this);
    scene.physics.add.existing(this);

    despawnEntity(this);
    this.setDepth(3);
  }

  takeDamage(amount: number): void {
    this.hp -= amount;
    this.flashHit();
    if (this.hp <= 0) {
      this.die();
    }
  }

  private flashHit(): void {
    const flashToken = ++this.visualFlashToken;
    this.setTint(0xffffff);
    this.setTintMode(Phaser.TintModes.FILL);
    this.scene.time.delayedCall(80, this.clearTintIfActive, [flashToken], this);
  }

  private clearTintIfActive(flashToken: number): void {
    if (this.active && flashToken === this.visualFlashToken) {
      this.restoreBaseTint();
    }
  }

  /**
   * Restores the resting tint after a flash or telegraph: aces keep their
   * gilded sheen instead of returning to an untinted sprite.
   */
  protected restoreBaseTint(): void {
    if (this.aceMarked) {
      this.setTint(ACE_TINT);
      this.setTintMode(Phaser.TintModes.MULTIPLY);
      return;
    }

    this.clearTint();
  }

  isAce(): boolean {
    return this.aceMarked;
  }

  /**
   * Gilds this enemy as a Marked Ace: ~2x HP, 4x score, guaranteed power-up
   * drop on defeat (granted by the enemy-death handler via the ace flag).
   * Base stats are captured so pooled reuse can restore them exactly.
   */
  markAsAce(): void {
    if (this.aceMarked) {
      return;
    }

    this.aceMarked = true;
    this.baseMaxHp = this.maxHp;
    this.baseScoreValue = this.scoreValue;
    this.maxHp = Math.max(1, Math.round(this.maxHp * ACE_HP_MULTIPLIER));
    this.hp = this.maxHp;
    this.scoreValue = Math.max(1, Math.round(this.scoreValue * ACE_SCORE_MULTIPLIER));
    this.restoreBaseTint();
  }

  private clearAceMark(): void {
    if (!this.aceMarked) {
      return;
    }

    this.aceMarked = false;
    if (this.baseMaxHp !== null) {
      this.maxHp = this.baseMaxHp;
    }
    if (this.baseScoreValue !== null) {
      this.scoreValue = this.baseScoreValue;
    }
    this.baseMaxHp = null;
    this.baseScoreValue = null;
  }

  protected invalidateHitFlash(): void {
    this.visualFlashToken += 1;
  }

  die(): void {
    this.defeatCount += 1;
    this.scene.events.emit(GAME_SCENE_EVENTS.enemyDeath, this.scoreValue, this.x, this.y, this.aceMarked);
    this.despawn();
  }

  /**
   * Monotonic marker used by encounter systems to distinguish a combat defeat
   * from ordinary pooling/despawning, even if this instance is reused immediately.
   */
  getDefeatCount(): number {
    return this.defeatCount;
  }

  despawn(): void {
    this.invalidateHitFlash();
    despawnEntity(this);
    this.clearAceMark();
    this.clearTint();
  }

  spawn(x: number, y: number): void {
    this.invalidateHitFlash();
    // Pooled reuse must never inherit ace tint/stats/drop state from a
    // previous life; restore base stats before hp is refilled below.
    this.clearAceMark();
    spawnEntity(this, x, y);
    this.gameplayTime = null;
    this.hp = this.maxHp;
    this.clearTint();
  }

  protected updateHorizontalSine(
    delta: number,
    startX: number,
    sineTime: number,
    amplitude: number,
    frequency: number
  ): number {
    const nextSineTime = sineTime + delta;
    this.x = startX + Math.sin(nextSineTime * frequency) * amplitude;
    return nextSineTime;
  }

  protected getGameplayTime(): number {
    return this.gameplayTime ?? this.scene.time.now;
  }

  preUpdate(time: number, delta: number): void {
    super.preUpdate(time, delta);
    if (isArcadeSimulationPaused(this.scene)) {
      return;
    }

    if (this.active) {
      if (this.despawnOffscreen && this.y > this.scene.cameras.main.height + 50) {
        this.despawn();
        return;
      }
      const gameplayDelta = Math.max(0, delta);
      this.gameplayTime = this.gameplayTime === null ? time : this.gameplayTime + gameplayDelta;
      this.updateBehavior(this.gameplayTime, gameplayDelta);
    }
  }

  abstract updateBehavior(time: number, delta: number): void;
}
