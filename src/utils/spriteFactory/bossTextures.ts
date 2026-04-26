import Phaser from 'phaser';
import type { BossAttackStyle } from '../../config/levels/types';
import { withGeneratedTexture } from '../generatedTexture';

export function ensureBossTextureVariant(
  scene: Phaser.Scene,
  attackStyle: BossAttackStyle = 'barrage',
  bossName: string = 'boss'
): string {
  const motifVariant = Array.from(bossName).reduce((sum, char) => sum + char.charCodeAt(0), 0) % 3;
  const textureKey = `boss-texture-${attackStyle}-${motifVariant}`;

  return withGeneratedTexture(scene, textureKey, 88, 56, (g) => {
    const palette = {
      base: attackStyle === 'bulwark' ? 0x2a1e56 : attackStyle === 'carrier' ? 0x4e2a16 : attackStyle === 'pursuit' ? 0x53171d : attackStyle === 'maelstrom' ? 0x203b5a : attackStyle === 'pressure' ? 0x5a2418 : 0x661122,
      mid: attackStyle === 'bulwark' ? 0x5740a6 : attackStyle === 'carrier' ? 0x8d4f22 : attackStyle === 'pursuit' ? 0x9c2338 : attackStyle === 'maelstrom' ? 0x2b6ca3 : attackStyle === 'pressure' ? 0xb64d29 : 0x991833,
      accent: attackStyle === 'bulwark' ? 0xb49cff : attackStyle === 'carrier' ? 0xffb066 : attackStyle === 'pursuit' ? 0xff7892 : attackStyle === 'maelstrom' ? 0x8fd3ff : attackStyle === 'pressure' ? 0xff9a66 : 0xff6688,
      panel: attackStyle === 'bulwark' ? 0x3b2a77 : attackStyle === 'carrier' ? 0x6b3918 : attackStyle === 'pursuit' ? 0x781b2d : attackStyle === 'maelstrom' ? 0x22507a : attackStyle === 'pressure' ? 0x7d311d : 0x771122,
    };

    switch (attackStyle) {
      case 'pursuit':
        g.fillStyle(palette.base, 1);
        g.beginPath();
        g.moveTo(44, 0);
        g.lineTo(58, 12);
        g.lineTo(64, 30);
        g.lineTo(52, 56);
        g.lineTo(36, 56);
        g.lineTo(24, 30);
        g.lineTo(30, 12);
        g.closePath();
        g.fillPath();
        g.fillStyle(palette.mid, 1);
        g.beginPath();
        g.moveTo(44, 3);
        g.lineTo(54, 16);
        g.lineTo(50, 40);
        g.lineTo(44, 46);
        g.lineTo(38, 40);
        g.lineTo(34, 16);
        g.closePath();
        g.fillPath();
        g.fillStyle(palette.mid, 0.92);
        g.fillTriangle(30, 16, 10, 36, 28, 28);
        g.fillTriangle(58, 16, 78, 36, 60, 28);
        break;
      case 'bulwark':
        g.fillStyle(palette.base, 1);
        g.fillRoundedRect(18, 6, 52, 42, 8);
        g.fillStyle(palette.mid, 0.95);
        g.fillRoundedRect(26, 10, 36, 28, 6);
        g.fillStyle(palette.mid, 0.9);
        g.fillCircle(14, 28, 10);
        g.fillCircle(74, 28, 10);
        g.lineStyle(3, palette.accent, 0.35);
        g.strokeCircle(14, 28, 12);
        g.strokeCircle(74, 28, 12);
        break;
      case 'carrier':
        g.fillStyle(palette.base, 1);
        g.fillRoundedRect(18, 4, 52, 44, 6);
        g.fillStyle(palette.mid, 0.95);
        g.fillRoundedRect(10, 10, 18, 22, 4);
        g.fillRoundedRect(60, 10, 18, 22, 4);
        g.fillStyle(0x150b06, 0.75);
        g.fillRect(12, 16, 12, 8);
        g.fillRect(64, 16, 12, 8);
        g.fillStyle(palette.mid, 0.9);
        g.fillRoundedRect(34, 8, 20, 32, 4);
        break;
      case 'maelstrom':
        g.fillStyle(palette.base, 1);
        g.beginPath();
        g.moveTo(44, 2);
        g.lineTo(66, 10);
        g.lineTo(78, 24);
        g.lineTo(68, 50);
        g.lineTo(20, 54);
        g.lineTo(8, 34);
        g.lineTo(14, 14);
        g.closePath();
        g.fillPath();
        g.fillStyle(palette.mid, 0.95);
        g.beginPath();
        g.moveTo(44, 4);
        g.lineTo(56, 18);
        g.lineTo(50, 40);
        g.lineTo(38, 44);
        g.lineTo(28, 28);
        g.lineTo(32, 14);
        g.closePath();
        g.fillPath();
        g.lineStyle(3, palette.accent, 0.35);
        g.beginPath();
        g.arc(44, 28, 18, -0.5, 3.6);
        g.strokePath();
        break;
      case 'pressure':
        g.fillStyle(palette.base, 1);
        g.beginPath();
        g.moveTo(44, 0);
        g.lineTo(70, 14);
        g.lineTo(74, 30);
        g.lineTo(60, 52);
        g.lineTo(28, 52);
        g.lineTo(14, 30);
        g.lineTo(18, 14);
        g.closePath();
        g.fillPath();
        g.fillStyle(palette.mid, 0.95);
        g.fillTriangle(44, 4, 56, 24, 32, 24);
        g.fillStyle(palette.mid, 0.88);
        g.fillRect(8, 26, 14, 10);
        g.fillRect(66, 26, 14, 10);
        break;
      case 'barrage':
      default:
        g.fillStyle(palette.base, 1);
        g.beginPath();
        g.moveTo(44, 0);
        g.lineTo(68, 12);
        g.lineTo(76, 28);
        g.lineTo(80, 44);
        g.lineTo(72, 56);
        g.lineTo(16, 56);
        g.lineTo(8, 44);
        g.lineTo(12, 28);
        g.lineTo(20, 12);
        g.closePath();
        g.fillPath();
        g.fillStyle(palette.mid, 1);
        g.beginPath();
        g.moveTo(44, 2);
        g.lineTo(62, 12);
        g.lineTo(66, 30);
        g.lineTo(44, 28);
        g.lineTo(22, 30);
        g.lineTo(26, 12);
        g.closePath();
        g.fillPath();
        g.fillStyle(palette.mid, 0.9);
        g.fillTriangle(20, 12, 4, 36, 24, 20);
        g.fillTriangle(68, 12, 84, 36, 64, 20);
        break;
    }

    g.fillStyle(palette.accent, 0.92);
    g.fillRoundedRect(38, 6, 12, 10, 3);
    g.fillStyle(0xffffff, 0.7);
    g.fillRect(40, 8, 3, 3);
    g.fillRect(45, 8, 3, 3);

    if (motifVariant === 0) {
      g.lineStyle(2, palette.accent, 0.28);
      g.lineBetween(24, 22, 64, 22);
      g.lineBetween(30, 36, 58, 36);
    } else if (motifVariant === 1) {
      g.lineStyle(2, palette.accent, 0.28);
      g.strokeCircle(44, 28, 10);
      g.strokeCircle(44, 28, 17);
    } else {
      g.lineStyle(2, palette.accent, 0.28);
      g.lineBetween(44, 6, 44, 48);
      g.lineBetween(34, 18, 54, 30);
      g.lineBetween(54, 18, 34, 30);
    }

    g.fillStyle(motifVariant === 1 ? palette.panel : 0x1b1028, 0.9);
    g.fillRect(28, 50, 8, 6);
    g.fillRect(40, 50, 8, 6);
    g.fillRect(52, 50, 8, 6);
    g.fillStyle(palette.accent, 0.72);
    g.fillCircle(32, 54, 3);
    g.fillCircle(44, 54, 3);
    g.fillCircle(56, 54, 3);

    g.lineStyle(1, palette.panel, 0.4);
    g.lineBetween(44, 4, 44, 52);
    g.lineBetween(24, 24, 64, 24);
    g.lineBetween(28, 38, 60, 38);
  });
}
