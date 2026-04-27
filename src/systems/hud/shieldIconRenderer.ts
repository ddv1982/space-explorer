import Phaser from 'phaser';
import type { HudLayoutMetrics } from './statusBarLayout';

export class HudShieldIconRenderer {
  private shieldIcons: Phaser.GameObjects.Graphics[] = [];
  private currentShields: number | null = null;

  resetShields(): void {
    this.currentShields = null;
  }

  updateShields(shields: number, renderShieldIcons: () => void): void {
    if (this.currentShields === shields) {
      return;
    }

    this.currentShields = shields;
    renderShieldIcons();
  }

  clearShieldIcons(): void {
    for (const icon of this.shieldIcons) {
      icon.destroy();
    }
    this.shieldIcons = [];
  }

  renderShieldIcons(params: {
    scene: Phaser.Scene | undefined;
    hpBarHeight: number;
    layout: HudLayoutMetrics;
  }): void {
    this.clearShieldIcons();

    const { scene, hpBarHeight, layout } = params;

    if (!scene || !this.currentShields || this.currentShields <= 0) {
      return;
    }

    for (let i = 0; i < this.currentShields; i++) {
      const icon = scene.add.graphics();
      icon.setDepth(100).setScrollFactor(0);

      const ix = layout.hpBarX + i * 20;
      const iy = layout.hpBarY + hpBarHeight + 4;

      icon.fillStyle(0x4488ff, 0.3);
      icon.fillCircle(ix + 8, iy + 8, 9);

      icon.fillStyle(0x4488ff, 0.8);
      icon.beginPath();
      icon.moveTo(ix + 8, iy + 1);
      icon.lineTo(ix + 14, iy + 4);
      icon.lineTo(ix + 14, iy + 10);
      icon.lineTo(ix + 8, iy + 16);
      icon.lineTo(ix + 2, iy + 10);
      icon.lineTo(ix + 2, iy + 4);
      icon.closePath();
      icon.fillPath();

      icon.fillStyle(0x88ccff, 0.5);
      icon.beginPath();
      icon.moveTo(ix + 8, iy + 3);
      icon.lineTo(ix + 12, iy + 5);
      icon.lineTo(ix + 12, iy + 9);
      icon.lineTo(ix + 8, iy + 13);
      icon.lineTo(ix + 5, iy + 9);
      icon.lineTo(ix + 5, iy + 5);
      icon.closePath();
      icon.fillPath();

      icon.fillStyle(0xaaddff, 0.6);
      icon.fillCircle(ix + 8, iy + 8, 3);

      icon.lineStyle(1, 0x88ccff, 0.6);
      icon.beginPath();
      icon.moveTo(ix + 8, iy + 1);
      icon.lineTo(ix + 14, iy + 4);
      icon.lineTo(ix + 14, iy + 10);
      icon.lineTo(ix + 8, iy + 16);
      icon.lineTo(ix + 2, iy + 10);
      icon.lineTo(ix + 2, iy + 4);
      icon.closePath();
      icon.strokePath();

      this.shieldIcons.push(icon);
    }
  }
}
