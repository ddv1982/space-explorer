import Phaser from 'phaser';
import { GAME_HEIGHT } from '../utils/constants';

export type PowerUpType = 'health' | 'shield' | 'rapidfire';

export class PowerUp extends Phaser.Physics.Arcade.Sprite {
  powerUpType: PowerUpType = 'health';
  private bobTime: number = 0;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    // Generate all power-up textures on first creation
    PowerUp.ensureTextures(scene);

    super(scene, x, y, 'powerup-health');
    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setActive(false);
    this.setVisible(false);
    this.setDepth(4);
  }

  private static texturesGenerated: boolean = false;

  private static ensureTextures(scene: Phaser.Scene): void {
    if (this.texturesGenerated) return;
    this.texturesGenerated = true;

    // Health power-up: green cross
    const gh = scene.add.graphics();
    gh.fillStyle(0x00ff44, 1);
    gh.fillRect(6, 0, 4, 16);
    gh.fillRect(0, 6, 16, 4);
    gh.fillStyle(0x44ff88, 0.7);
    gh.fillRect(7, 1, 2, 14);
    gh.fillRect(1, 7, 14, 2);
    gh.generateTexture('powerup-health', 16, 16);
    gh.destroy();

    // Shield power-up: blue circle with outline
    const gs = scene.add.graphics();
    gs.fillStyle(0x4488ff, 0.8);
    gs.fillCircle(8, 8, 7);
    gs.lineStyle(2, 0x88ccff, 1);
    gs.strokeCircle(8, 8, 7);
    gs.fillStyle(0xaaddff, 0.6);
    gs.fillCircle(6, 6, 3);
    gs.generateTexture('powerup-shield', 16, 16);
    gs.destroy();

    // Rapid fire power-up: yellow bolt
    const gf = scene.add.graphics();
    gf.fillStyle(0xffcc00, 1);
    gf.beginPath();
    gf.moveTo(8, 0);
    gf.lineTo(14, 8);
    gf.lineTo(10, 8);
    gf.lineTo(12, 16);
    gf.lineTo(4, 8);
    gf.lineTo(8, 8);
    gf.closePath();
    gf.fillPath();
    gf.fillStyle(0xffff88, 0.6);
    gf.beginPath();
    gf.moveTo(8, 3);
    gf.lineTo(11, 8);
    gf.lineTo(9, 8);
    gf.lineTo(10, 13);
    gf.lineTo(6, 8);
    gf.lineTo(8, 8);
    gf.closePath();
    gf.fillPath();
    gf.generateTexture('powerup-rapidfire', 16, 16);
    gf.destroy();
  }

  spawn(x: number, y: number, type: PowerUpType): void {
    this.powerUpType = type;
    this.setTexture(`powerup-${type}`);
    (this.body as Phaser.Physics.Arcade.Body).reset(x, y);
    this.setPosition(x, y);
    this.setActive(true);
    this.setVisible(true);
    this.setVelocityY(60);
    this.bobTime = 0;

    // Add glow based on type
    if (this.preFX) {
      const colors: Record<PowerUpType, number> = {
        health: 0x00ff44,
        shield: 0x4488ff,
        rapidfire: 0xffcc00,
      };
      this.preFX.addGlow(colors[type], 2, 2, false);
    }
  }

  preUpdate(time: number, delta: number): void {
    super.preUpdate(time, delta);
    if (!this.active) return;

    // Gentle bobbing motion
    this.bobTime += delta;
    this.x += Math.sin(this.bobTime * 0.005) * 0.3;

    // Go off screen
    if (this.y > GAME_HEIGHT + 30) {
      this.kill();
    }
  }

  kill(): void {
    this.setActive(false);
    this.setVisible(false);
    this.setVelocity(0, 0);
    (this.body as Phaser.Physics.Arcade.Body).reset(0, 0);
  }
}
