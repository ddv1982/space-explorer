import Phaser from 'phaser';
import { withGeneratedTexture } from '../generatedTexture';

export function ensurePlayerBulletTexture(scene: Phaser.Scene): string {
  return withGeneratedTexture(scene, 'player-bullet', 8, 18, (g) => {
    g.fillStyle(0x00aaff, 0.3);
    g.fillRect(1, 4, 6, 14);

    g.fillStyle(0x00ccff, 0.5);
    g.fillRect(2, 2, 4, 16);

    g.fillStyle(0x00ffff, 1);
    g.fillRect(3, 0, 2, 18);

    g.fillStyle(0xffffff, 0.9);
    g.fillRect(3, 0, 2, 5);

    g.fillStyle(0xffffff, 1);
    g.fillCircle(4, 1, 1);
  });
}

export function ensureEnemyBulletTexture(scene: Phaser.Scene): string {
  return withGeneratedTexture(scene, 'enemy-bullet', 8, 8, (g) => {
    g.fillStyle(0xff4422, 0.3);
    g.fillCircle(4, 4, 4);

    g.fillStyle(0xff6644, 0.6);
    g.fillCircle(4, 4, 3);

    g.fillStyle(0xff8866, 1);
    g.fillCircle(4, 4, 2);

    g.fillStyle(0xffccaa, 0.8);
    g.fillCircle(4, 3, 1);
  });
}

export function ensureBomberBombTexture(scene: Phaser.Scene): string {
  return withGeneratedTexture(scene, 'bomber-bomb', 14, 18, (g) => {
    g.fillStyle(0x885522, 1);
    g.beginPath();
    g.moveTo(7, 0);
    g.lineTo(12, 4);
    g.lineTo(14, 10);
    g.lineTo(12, 16);
    g.lineTo(7, 18);
    g.lineTo(2, 16);
    g.lineTo(0, 10);
    g.lineTo(2, 4);
    g.closePath();
    g.fillPath();

    g.fillStyle(0xaa7733, 1);
    g.beginPath();
    g.moveTo(7, 1);
    g.lineTo(10, 4);
    g.lineTo(11, 10);
    g.lineTo(7, 8);
    g.lineTo(4, 10);
    g.lineTo(5, 4);
    g.closePath();
    g.fillPath();

    g.fillStyle(0xffcc00, 0.7);
    g.fillRect(3, 8, 8, 3);

    g.fillStyle(0xff8800, 0.8);
    g.fillCircle(7, 2, 2);

    g.fillStyle(0xffcc44, 0.9);
    g.fillCircle(7, 1, 1);

    g.fillStyle(0x774411, 1);
    g.beginPath();
    g.moveTo(2, 14);
    g.lineTo(0, 18);
    g.lineTo(4, 16);
    g.closePath();
    g.fillPath();
    g.beginPath();
    g.moveTo(12, 14);
    g.lineTo(14, 18);
    g.lineTo(10, 16);
    g.closePath();
    g.fillPath();
  });
}
