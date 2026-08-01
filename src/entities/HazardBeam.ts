import Phaser from 'phaser';
import { despawnEntity, isArcadeSimulationPaused, spawnEntity } from '../utils/entityUtils';
import { ensureBeamTexture } from '../utils/SpriteFactory';

const BEAM_TEXTURE_WIDTH = 32;
const BEAM_TEXTURE_HEIGHT = 128;

export type HazardBeamLaunchConfig = {
  x: number;
  y: number;
  width: number;
  height: number;
  tint: number;
  telegraphMs: number;
  activeMs: number;
  velocityX?: number;
  clearsBullets?: boolean;
  damage?: number;
};

type BeamPhase = 'idle' | 'telegraph' | 'active';

export class HazardBeam extends Phaser.Physics.Arcade.Sprite {
  private phase: BeamPhase = 'idle';
  private telegraphRemainingMs: number = 0;
  private activeRemainingMs: number = 0;
  private launchConfig: HazardBeamLaunchConfig | null = null;
  private damageActive: boolean = false;
  private clearsBulletsFlag: boolean = false;
  private beamDamage: number = 1;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    ensureBeamTexture(scene);

    super(scene, x, y, 'hazard-beam');
    scene.add.existing(this);
    scene.physics.add.existing(this);

    despawnEntity(this);
    this.setDepth(5);
    this.setBlendMode(Phaser.BlendModes.ADD);
  }

  launch(config: HazardBeamLaunchConfig): void {
    spawnEntity(this, config.x, config.y);
    this.setScale(config.width / BEAM_TEXTURE_WIDTH, config.height / BEAM_TEXTURE_HEIGHT);
    this.setTint(config.tint);
    this.setAlpha(0.22);
    this.setVelocity(0, 0);
    this.damageActive = false;
    this.clearsBulletsFlag = config.clearsBullets ?? false;
    this.beamDamage = config.damage ?? 1;

    const body = this.body as Phaser.Physics.Arcade.Body | null;
    if (body) {
      body.setSize(BEAM_TEXTURE_WIDTH, BEAM_TEXTURE_HEIGHT);
      body.enable = false;
    }

    // The telegraph/active windows count down in preUpdate rather than via
    // scene.time.delayedCall, because the scene clock keeps running while the
    // game is paused; counting gameplay delta keeps the full beam duration
    // on the other side of a pause instead of letting it expire for free.
    this.launchConfig = config;
    this.telegraphRemainingMs = config.telegraphMs;
    this.activeRemainingMs = config.activeMs;
    this.phase = 'telegraph';
  }

  private activate(): void {
    const config = this.launchConfig;
    if (!this.active || !config) {
      return;
    }

    this.phase = 'active';
    this.setAlpha(0.95);
    this.damageActive = true;

    const body = this.body as Phaser.Physics.Arcade.Body | null;
    if (body) {
      body.enable = true;
    }

    this.setVelocityX(config.velocityX ?? 0);
  }

  isDamageActive(): boolean {
    return this.damageActive;
  }

  getClearsBullets(): boolean {
    return this.clearsBulletsFlag;
  }

  getDamage(): number {
    return this.beamDamage;
  }

  kill(): void {
    this.phase = 'idle';
    this.launchConfig = null;
    this.damageActive = false;
    despawnEntity(this);
  }

  preUpdate(time: number, delta: number): void {
    super.preUpdate(time, delta);
    if (isArcadeSimulationPaused(this.scene)) {
      return;
    }

    if (!this.active) {
      return;
    }

    if (this.phase === 'telegraph') {
      this.telegraphRemainingMs -= delta;
      if (this.telegraphRemainingMs <= 0) {
        // Carry frame overshoot into the active window to preserve total beam duration.
        this.activeRemainingMs += this.telegraphRemainingMs;
        this.activate();
      }
      return;
    }

    if (this.phase !== 'active') {
      return;
    }

    this.activeRemainingMs -= delta;
    if (this.activeRemainingMs <= 0) {
      this.kill();
      return;
    }

    const width = this.scene.cameras.main.width;
    if (this.x < -160 || this.x > width + 160) {
      this.kill();
    }
  }
}
