import Phaser from 'phaser';
import { withGeneratedTexture } from '../generatedTexture';

export function ensurePowerUpTextures(scene: Phaser.Scene): void {
  withGeneratedTexture(scene, 'powerup-health', 20, 20, (g) => {
    g.fillStyle(0x00ff44, 0.15);
    g.fillCircle(10, 10, 10);

    g.fillStyle(0x003311, 0.8);
    g.fillCircle(10, 10, 8);

    g.lineStyle(1.5, 0x00ff44, 0.6);
    g.strokeCircle(10, 10, 8);

    g.fillStyle(0x00ff44, 1);
    g.fillRect(8, 3, 4, 14);
    g.fillRect(3, 8, 14, 4);

    g.fillStyle(0x44ff88, 0.7);
    g.fillRect(9, 4, 2, 12);
    g.fillRect(4, 9, 12, 2);

    g.fillStyle(0x88ffaa, 0.8);
    g.fillCircle(10, 10, 2);
  });

  withGeneratedTexture(scene, 'powerup-shield', 20, 20, (g) => {
    g.fillStyle(0x4488ff, 0.15);
    g.fillCircle(10, 10, 10);

    g.fillStyle(0x112244, 0.8);
    g.fillCircle(10, 10, 8);

    g.lineStyle(1.5, 0x4488ff, 0.6);
    g.strokeCircle(10, 10, 8);

    g.fillStyle(0x4488ff, 0.9);
    g.beginPath();
    g.moveTo(10, 2);
    g.lineTo(16, 5);
    g.lineTo(16, 11);
    g.lineTo(10, 18);
    g.lineTo(4, 11);
    g.lineTo(4, 5);
    g.closePath();
    g.fillPath();

    g.fillStyle(0x88ccff, 0.6);
    g.beginPath();
    g.moveTo(10, 3);
    g.lineTo(14, 6);
    g.lineTo(14, 10);
    g.lineTo(10, 14);
    g.lineTo(7, 10);
    g.lineTo(7, 6);
    g.closePath();
    g.fillPath();

    g.fillStyle(0xaaddff, 0.4);
    g.fillCircle(10, 9, 3);
  });

  withGeneratedTexture(scene, 'powerup-rapidfire', 20, 20, (g) => {
    g.fillStyle(0xffcc00, 0.15);
    g.fillCircle(10, 10, 10);

    g.fillStyle(0x332200, 0.8);
    g.fillCircle(10, 10, 8);

    g.lineStyle(1.5, 0xffcc00, 0.6);
    g.strokeCircle(10, 10, 8);

    g.fillStyle(0xffcc00, 1);
    g.beginPath();
    g.moveTo(11, 1);
    g.lineTo(7, 9);
    g.lineTo(10, 9);
    g.lineTo(8, 19);
    g.lineTo(14, 8);
    g.lineTo(11, 8);
    g.lineTo(13, 1);
    g.closePath();
    g.fillPath();

    g.fillStyle(0xffff88, 0.7);
    g.beginPath();
    g.moveTo(11, 2);
    g.lineTo(8, 8);
    g.lineTo(10, 8);
    g.lineTo(9, 14);
    g.lineTo(12, 9);
    g.lineTo(10, 9);
    g.closePath();
    g.fillPath();

    g.fillStyle(0xffffff, 0.5);
    g.fillCircle(11, 2, 1);
    g.fillCircle(8, 19, 1);
  });
}
