import Phaser from 'phaser';
import { withGeneratedTexture } from '../generatedTexture';

export function ensureAsteroidTexture(scene: Phaser.Scene): string {
  return withGeneratedTexture(scene, 'asteroid-texture', 44, 44, (g) => {
    g.fillStyle(0x665533, 1);
    g.beginPath();
    g.moveTo(22, 0);
    g.lineTo(36, 4);
    g.lineTo(42, 16);
    g.lineTo(40, 30);
    g.lineTo(32, 42);
    g.lineTo(18, 44);
    g.lineTo(4, 38);
    g.lineTo(0, 24);
    g.lineTo(2, 12);
    g.lineTo(12, 2);
    g.closePath();
    g.fillPath();

    g.fillStyle(0x887744, 1);
    g.beginPath();
    g.moveTo(22, 2);
    g.lineTo(34, 6);
    g.lineTo(36, 20);
    g.lineTo(22, 18);
    g.lineTo(10, 14);
    g.lineTo(12, 4);
    g.closePath();
    g.fillPath();

    g.fillStyle(0x443322, 0.7);
    g.fillCircle(28, 22, 6);
    g.fillCircle(14, 30, 4);

    g.lineStyle(1, 0x998855, 0.3);
    g.strokeCircle(28, 22, 6);
    g.strokeCircle(14, 30, 4);

    g.lineStyle(1, 0x554422, 0.4);
    g.beginPath();
    g.moveTo(10, 8);
    g.lineTo(18, 16);
    g.lineTo(14, 24);
    g.strokePath();
    g.beginPath();
    g.moveTo(32, 10);
    g.lineTo(38, 20);
    g.strokePath();

    g.lineStyle(1, 0x998866, 0.2);
    g.beginPath();
    g.moveTo(22, 0);
    g.lineTo(36, 4);
    g.lineTo(42, 16);
    g.strokePath();
  });
}
