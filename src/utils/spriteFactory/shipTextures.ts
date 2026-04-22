import Phaser from 'phaser';
import { withGeneratedTexture } from '../generatedTexture';

export function ensurePlayerTexture(scene: Phaser.Scene): string {
  return withGeneratedTexture(scene, 'player-ship', 36, 44, (g) => {
    g.fillStyle(0x16243b, 1);
    g.beginPath();
    g.moveTo(18, 1);
    g.lineTo(28, 10);
    g.lineTo(35, 30);
    g.lineTo(29, 37);
    g.lineTo(25, 43);
    g.lineTo(18, 39);
    g.lineTo(11, 43);
    g.lineTo(7, 37);
    g.lineTo(1, 30);
    g.lineTo(8, 10);
    g.closePath();
    g.fillPath();

    g.fillStyle(0x24466e, 1);
    g.beginPath();
    g.moveTo(8, 12);
    g.lineTo(2, 28);
    g.lineTo(7, 28);
    g.lineTo(13, 19);
    g.lineTo(12, 14);
    g.closePath();
    g.fillPath();
    g.beginPath();
    g.moveTo(28, 12);
    g.lineTo(34, 28);
    g.lineTo(29, 28);
    g.lineTo(23, 19);
    g.lineTo(24, 14);
    g.closePath();
    g.fillPath();

    g.fillStyle(0x2f5b8c, 1);
    g.beginPath();
    g.moveTo(18, 3);
    g.lineTo(23, 14);
    g.lineTo(22, 31);
    g.lineTo(18, 35);
    g.lineTo(14, 31);
    g.lineTo(13, 14);
    g.closePath();
    g.fillPath();

    g.fillStyle(0x00d4ff, 0.95);
    g.beginPath();
    g.moveTo(18, 4);
    g.lineTo(20, 11);
    g.lineTo(18, 13);
    g.lineTo(16, 11);
    g.closePath();
    g.fillPath();
    g.fillRect(17, 12, 2, 12);

    g.fillStyle(0x76efff, 0.9);
    g.beginPath();
    g.moveTo(18, 10);
    g.lineTo(21, 16);
    g.lineTo(18, 19);
    g.lineTo(15, 16);
    g.closePath();
    g.fillPath();
    g.fillStyle(0xd6ffff, 0.45);
    g.fillCircle(17.4, 12.6, 1.2);

    g.fillStyle(0x2cc4ff, 0.8);
    g.fillTriangle(2, 28, 7, 28, 8, 35);
    g.fillTriangle(34, 28, 29, 28, 28, 35);

    g.fillStyle(0x2f4052, 1);
    g.fillRect(9, 36, 5, 7);
    g.fillRect(22, 36, 5, 7);
    g.fillStyle(0x00e5ff, 0.75);
    g.fillCircle(11.5, 41.5, 2.2);
    g.fillCircle(24.5, 41.5, 2.2);
    g.fillStyle(0xffffff, 0.7);
    g.fillCircle(11.5, 41.2, 0.8);
    g.fillCircle(24.5, 41.2, 0.8);

    g.lineStyle(1, 0x4c87bf, 0.28);
    g.lineBetween(18, 6, 18, 34);
    g.lineBetween(10, 30, 15, 27);
    g.lineBetween(26, 30, 21, 27);
  });
}

export function ensureHelperShipTexture(scene: Phaser.Scene): string {
  return withGeneratedTexture(scene, 'helper-ship', 24, 30, (g) => {
    g.fillStyle(0x17283f, 1);
    g.fillRoundedRect(7, 5, 10, 16, 4);

    g.beginPath();
    g.moveTo(12, 0);
    g.lineTo(17, 7);
    g.lineTo(12, 8);
    g.lineTo(7, 7);
    g.closePath();
    g.fillPath();

    g.fillStyle(0x274a73, 1);
    g.fillRoundedRect(1, 12, 7, 7, 2);
    g.fillRoundedRect(16, 12, 7, 7, 2);
    g.fillTriangle(1, 19, 6, 17, 6, 23);
    g.fillTriangle(23, 19, 18, 17, 18, 23);

    g.fillStyle(0x4fd9ff, 0.95);
    g.fillRect(11, 5, 2, 13);
    g.fillStyle(0x9bf2ff, 0.9);
    g.fillCircle(12, 10, 2);

    g.fillStyle(0x31485e, 1);
    g.fillRect(5, 22, 4, 6);
    g.fillRect(15, 22, 4, 6);
    g.fillStyle(0x74efff, 0.82);
    g.fillCircle(7, 28, 1.7);
    g.fillCircle(17, 28, 1.7);

    g.lineStyle(1, 0x3e78a8, 0.25);
    g.lineBetween(12, 4, 12, 21);
  });
}

export function ensureScoutTexture(scene: Phaser.Scene): string {
  return withGeneratedTexture(scene, 'scout-texture', 26, 28, (g) => {
    g.fillStyle(0x6d0d1d, 1);
    g.beginPath();
    g.moveTo(13, 0);
    g.lineTo(18, 10);
    g.lineTo(17, 22);
    g.lineTo(13, 28);
    g.lineTo(9, 22);
    g.lineTo(8, 10);
    g.closePath();
    g.fillPath();

    g.fillStyle(0xb81d32, 1);
    g.fillTriangle(8, 10, 2, 20, 8, 19);
    g.fillTriangle(18, 10, 24, 20, 18, 19);

    g.fillStyle(0xff4665, 1);
    g.fillTriangle(13, 1, 15, 8, 11, 8);

    g.fillStyle(0xff8fa0, 0.9);
    g.fillCircle(13, 11.5, 1.8);
    g.fillStyle(0xffffff, 0.6);
    g.fillCircle(12.5, 11, 0.6);

    g.fillStyle(0xff4a3d, 0.7);
    g.fillEllipse(13, 25, 3.2, 5.5);

    g.lineStyle(1, 0xff6b7f, 0.35);
    g.lineBetween(13, 4, 13, 22);
  });
}

export function ensureFighterTexture(scene: Phaser.Scene): string {
  return withGeneratedTexture(scene, 'fighter-texture', 36, 36, (g) => {
    g.fillStyle(0x123e29, 1);
    g.beginPath();
    g.moveTo(18, 0);
    g.lineTo(25, 9);
    g.lineTo(31, 28);
    g.lineTo(25, 35);
    g.lineTo(18, 32);
    g.lineTo(11, 35);
    g.lineTo(5, 28);
    g.lineTo(11, 9);
    g.closePath();
    g.fillPath();

    g.fillStyle(0x1fa253, 1);
    g.beginPath();
    g.moveTo(11, 10);
    g.lineTo(0, 26);
    g.lineTo(4, 30);
    g.lineTo(13, 18);
    g.lineTo(16, 14);
    g.closePath();
    g.fillPath();
    g.beginPath();
    g.moveTo(25, 10);
    g.lineTo(36, 26);
    g.lineTo(32, 30);
    g.lineTo(23, 18);
    g.lineTo(20, 14);
    g.closePath();
    g.fillPath();

    g.fillStyle(0x35cf70, 1);
    g.beginPath();
    g.moveTo(18, 3);
    g.lineTo(22, 13);
    g.lineTo(21, 28);
    g.lineTo(18, 30);
    g.lineTo(15, 28);
    g.lineTo(14, 13);
    g.closePath();
    g.fillPath();

    g.fillStyle(0x52f28e, 0.85);
    g.fillRect(8, 18, 5, 2);
    g.fillRect(23, 18, 5, 2);

    g.fillStyle(0x9affc3, 0.8);
    g.fillEllipse(18, 12, 4.5, 6.5);
    g.fillStyle(0x4aff87, 1);
    g.fillTriangle(18, 1, 20, 7, 16, 7);

    g.fillStyle(0x67ff9f, 0.72);
    g.fillCircle(14, 33, 1.9);
    g.fillCircle(22, 33, 1.9);

    g.lineStyle(1, 0x58d38b, 0.3);
    g.lineBetween(18, 4, 18, 30);
  });
}

export function ensureBomberTexture(scene: Phaser.Scene): string {
  return withGeneratedTexture(scene, 'bomber-texture', 44, 38, (g) => {
    g.fillStyle(0x713513, 1);
    g.beginPath();
    g.moveTo(22, 1);
    g.lineTo(33, 6);
    g.lineTo(39, 16);
    g.lineTo(40, 28);
    g.lineTo(34, 36);
    g.lineTo(10, 36);
    g.lineTo(4, 28);
    g.lineTo(5, 16);
    g.lineTo(11, 6);
    g.closePath();
    g.fillPath();

    g.fillStyle(0xa85320, 1);
    g.fillRoundedRect(11, 12, 22, 20, 6);
    g.fillStyle(0xe77e3a, 0.95);
    g.fillRoundedRect(17, 5, 10, 18, 4);

    g.fillStyle(0x8f461f, 1);
    g.fillRoundedRect(1, 16, 8, 13, 3);
    g.fillRoundedRect(35, 16, 8, 13, 3);
    g.fillStyle(0xffb14b, 0.78);
    g.fillCircle(5, 25, 3);
    g.fillCircle(39, 25, 3);

    g.fillStyle(0xffd27b, 0.82);
    g.fillRoundedRect(17, 8, 10, 4, 2);

    g.lineStyle(2, 0x5e2a0e, 0.55);
    g.lineBetween(14, 24, 30, 24);
    g.lineBetween(14, 24, 14, 33);
    g.lineBetween(30, 24, 30, 33);

    g.fillStyle(0xffc500, 0.42);
    g.fillRect(15, 30, 5, 2);
    g.fillRect(24, 30, 5, 2);
  });
}

export function ensureGunshipTexture(scene: Phaser.Scene): string {
  return withGeneratedTexture(scene, 'gunship-texture', 40, 40, (g) => {
    g.fillStyle(0x132b56, 1);
    g.fillRoundedRect(10, 6, 20, 28, 4);
    g.fillRect(2, 11, 36, 10);

    g.fillStyle(0x24519e, 1);
    g.fillRoundedRect(14, 4, 12, 26, 3);
    g.fillStyle(0x3f7fda, 1);
    g.fillRoundedRect(16, 7, 8, 18, 3);

    g.fillStyle(0x1d3f84, 1);
    g.fillRect(0, 14, 9, 7);
    g.fillRect(31, 14, 9, 7);
    g.fillStyle(0x63a4ff, 0.75);
    g.fillCircle(4, 17.5, 2);
    g.fillCircle(36, 17.5, 2);

    g.fillStyle(0x4e90ff, 1);
    g.fillRect(16, 0, 8, 6);
    g.fillRect(18, 0, 4, 3);

    g.fillStyle(0x8ed6ff, 0.8);
    g.fillRoundedRect(17, 10, 6, 5, 2);

    g.fillStyle(0x304364, 1);
    g.fillRect(12, 34, 5, 5);
    g.fillRect(18, 35, 4, 5);
    g.fillRect(23, 34, 5, 5);
    g.fillStyle(0x67a3ff, 0.72);
    g.fillCircle(14.5, 38, 1.8);
    g.fillCircle(20, 39, 1.6);
    g.fillCircle(25.5, 38, 1.8);

    g.lineStyle(1, 0x4e79b9, 0.28);
    g.lineBetween(10, 21, 30, 21);
    g.lineBetween(20, 5, 20, 34);
  });
}

export function ensureSwarmTexture(scene: Phaser.Scene): string {
  return withGeneratedTexture(scene, 'swarm-texture', 20, 20, (g) => {
    g.fillStyle(0x847600, 1);
    g.beginPath();
    g.moveTo(10, 1);
    g.lineTo(16, 6);
    g.lineTo(18, 12);
    g.lineTo(15, 18);
    g.lineTo(11, 20);
    g.lineTo(6, 18);
    g.lineTo(4, 12);
    g.lineTo(6, 5);
    g.closePath();
    g.fillPath();

    g.fillStyle(0xe3d63a, 0.45);
    g.fillEllipse(4.5, 9, 8, 12);
    g.fillEllipse(15.5, 9, 8, 12);

    g.fillStyle(0xb9a400, 0.95);
    g.fillEllipse(10, 10, 8, 11);
    g.fillStyle(0xffb000, 0.8);
    g.fillTriangle(8, 17, 10, 20, 9, 16);
    g.fillTriangle(12, 17, 10, 20, 11, 16);

    g.fillStyle(0xffff5d, 0.9);
    g.fillCircle(7.2, 7, 1.6);
    g.fillCircle(12.8, 7, 1.6);
    g.fillStyle(0xffffff, 0.55);
    g.fillCircle(7, 6.4, 0.6);
    g.fillCircle(12.6, 6.4, 0.6);
  });
}
