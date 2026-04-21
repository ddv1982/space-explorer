import Phaser from 'phaser';
import type { BossAttackStyle } from '../config/levels/types';

/**
 * Centralized procedural sprite generation for Space Explorer.
 * All textures are generated via Phaser.Graphics and cached by key.
 * Call the appropriate ensure* function from entity constructors.
 */

function ensureTexture(
  scene: Phaser.Scene,
  key: string,
  width: number,
  height: number,
  draw: (g: Phaser.GameObjects.Graphics) => void
): string {
  if (!scene.textures.exists(key)) {
    const g = scene.add.graphics();
    draw(g);
    g.generateTexture(key, width, height);
    g.destroy();
  }
  return key;
}

// ---------------------------------------------------------------------------
// Player Ship — sleek arrow-head fighter with cockpit and engine detail
// ---------------------------------------------------------------------------
export function ensurePlayerTexture(scene: Phaser.Scene): string {
  return ensureTexture(scene, 'player-ship', 36, 44, (g) => {
    // Main guardian-lancer hull
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

    // Shoulder wings for clearer silhouette
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

    // Dorsal spine and inner fuselage
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

    // Split nose notch / forward accent
    g.fillStyle(0x00d4ff, 0.95);
    g.beginPath();
    g.moveTo(18, 4);
    g.lineTo(20, 11);
    g.lineTo(18, 13);
    g.lineTo(16, 11);
    g.closePath();
    g.fillPath();
    g.fillRect(17, 12, 2, 12);

    // Cockpit canopy
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

    // Wing tip accents
    g.fillStyle(0x2cc4ff, 0.8);
    g.fillTriangle(2, 28, 7, 28, 8, 35);
    g.fillTriangle(34, 28, 29, 28, 28, 35);

    // Engine nacelles and glow
    g.fillStyle(0x2f4052, 1);
    g.fillRect(9, 36, 5, 7);
    g.fillRect(22, 36, 5, 7);
    g.fillStyle(0x00e5ff, 0.75);
    g.fillCircle(11.5, 41.5, 2.2);
    g.fillCircle(24.5, 41.5, 2.2);
    g.fillStyle(0xffffff, 0.7);
    g.fillCircle(11.5, 41.2, 0.8);
    g.fillCircle(24.5, 41.2, 0.8);

    // Panel rhythm
    g.lineStyle(1, 0x4c87bf, 0.28);
    g.lineBetween(18, 6, 18, 34);
    g.lineBetween(10, 30, 15, 27);
    g.lineBetween(26, 30, 21, 27);
  });
}

// ---------------------------------------------------------------------------
// Helper Ship — compact allied support craft
// ---------------------------------------------------------------------------
export function ensureHelperShipTexture(scene: Phaser.Scene): string {
  return ensureTexture(scene, 'helper-ship', 24, 30, (g) => {
    // Escort drone body
    g.fillStyle(0x17283f, 1);
    g.fillRoundedRect(7, 5, 10, 16, 4);

    // Forward lancer nose
    g.beginPath();
    g.moveTo(12, 0);
    g.lineTo(17, 7);
    g.lineTo(12, 8);
    g.lineTo(7, 7);
    g.closePath();
    g.fillPath();

    // Outriggers / stabilizers
    g.fillStyle(0x274a73, 1);
    g.fillRoundedRect(1, 12, 7, 7, 2);
    g.fillRoundedRect(16, 12, 7, 7, 2);
    g.fillTriangle(1, 19, 6, 17, 6, 23);
    g.fillTriangle(23, 19, 18, 17, 18, 23);

    // Inner accent band
    g.fillStyle(0x4fd9ff, 0.95);
    g.fillRect(11, 5, 2, 13);
    g.fillStyle(0x9bf2ff, 0.9);
    g.fillCircle(12, 10, 2);

    // Twin thrusters
    g.fillStyle(0x31485e, 1);
    g.fillRect(5, 22, 4, 6);
    g.fillRect(15, 22, 4, 6);
    g.fillStyle(0x74efff, 0.82);
    g.fillCircle(7, 28, 1.7);
    g.fillCircle(17, 28, 1.7);

    // Visual rest / panel hints
    g.lineStyle(1, 0x3e78a8, 0.25);
    g.lineBetween(12, 4, 12, 21);
  });
}

// ---------------------------------------------------------------------------
// Scout — sleek dart interceptor
// ---------------------------------------------------------------------------
export function ensureScoutTexture(scene: Phaser.Scene): string {
  return ensureTexture(scene, 'scout-texture', 26, 28, (g) => {
    // Stiletto body
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

    // Needle fins
    g.fillStyle(0xb81d32, 1);
    g.fillTriangle(8, 10, 2, 20, 8, 19);
    g.fillTriangle(18, 10, 24, 20, 18, 19);

    // Forward hot blade
    g.fillStyle(0xff4665, 1);
    g.fillTriangle(13, 1, 15, 8, 11, 8);

    // Single sensor eye
    g.fillStyle(0xff8fa0, 0.9);
    g.fillCircle(13, 11.5, 1.8);
    g.fillStyle(0xffffff, 0.6);
    g.fillCircle(12.5, 11, 0.6);

    // Tail flare
    g.fillStyle(0xff4a3d, 0.7);
    g.fillEllipse(13, 25, 3.2, 5.5);

    g.lineStyle(1, 0xff6b7f, 0.35);
    g.lineBetween(13, 4, 13, 22);
  });
}

// ---------------------------------------------------------------------------
// Fighter — angular attack craft with swept wings
// ---------------------------------------------------------------------------
export function ensureFighterTexture(scene: Phaser.Scene): string {
  return ensureTexture(scene, 'fighter-texture', 36, 36, (g) => {
    // Attack-bird body
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

    // Scythe wings
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

    // Inner fuselage
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

    // Weapon roots
    g.fillStyle(0x52f28e, 0.85);
    g.fillRect(8, 18, 5, 2);
    g.fillRect(23, 18, 5, 2);

    // Cockpit + nose
    g.fillStyle(0x9affc3, 0.8);
    g.fillEllipse(18, 12, 4.5, 6.5);
    g.fillStyle(0x4aff87, 1);
    g.fillTriangle(18, 1, 20, 7, 16, 7);

    // Split chevron exhaust
    g.fillStyle(0x67ff9f, 0.72);
    g.fillCircle(14, 33, 1.9);
    g.fillCircle(22, 33, 1.9);

    g.lineStyle(1, 0x58d38b, 0.3);
    g.lineBetween(18, 4, 18, 30);
  });
}

// ---------------------------------------------------------------------------
// Bomber — heavy rounded bomber with armor plating
// ---------------------------------------------------------------------------
export function ensureBomberTexture(scene: Phaser.Scene): string {
  return ensureTexture(scene, 'bomber-texture', 44, 38, (g) => {
    // Coffin-beetle hull
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

    // Heavy belly / bomb bay mass
    g.fillStyle(0xa85320, 1);
    g.fillRoundedRect(11, 12, 22, 20, 6);
    g.fillStyle(0xe77e3a, 0.95);
    g.fillRoundedRect(17, 5, 10, 18, 4);

    // Furnace nacelles
    g.fillStyle(0x8f461f, 1);
    g.fillRoundedRect(1, 16, 8, 13, 3);
    g.fillRoundedRect(35, 16, 8, 13, 3);
    g.fillStyle(0xffb14b, 0.78);
    g.fillCircle(5, 25, 3);
    g.fillCircle(39, 25, 3);

    // Cockpit visor
    g.fillStyle(0xffd27b, 0.82);
    g.fillRoundedRect(17, 8, 10, 4, 2);

    // Bomb bay seams
    g.lineStyle(2, 0x5e2a0e, 0.55);
    g.lineBetween(14, 24, 30, 24);
    g.lineBetween(14, 24, 14, 33);
    g.lineBetween(30, 24, 30, 33);

    // Warning blocks
    g.fillStyle(0xffc500, 0.42);
    g.fillRect(15, 30, 5, 2);
    g.fillRect(24, 30, 5, 2);
  });
}

// ---------------------------------------------------------------------------
// Gunship — heavy angular gun platform
// ---------------------------------------------------------------------------
export function ensureGunshipTexture(scene: Phaser.Scene): string {
  return ensureTexture(scene, 'gunship-texture', 40, 40, (g) => {
    // Hammerhead hull
    g.fillStyle(0x132b56, 1);
    g.fillRoundedRect(10, 6, 20, 28, 4);
    g.fillRect(2, 11, 36, 10);

    // Center chassis
    g.fillStyle(0x24519e, 1);
    g.fillRoundedRect(14, 4, 12, 26, 3);
    g.fillStyle(0x3f7fda, 1);
    g.fillRoundedRect(16, 7, 8, 18, 3);

    // Battery pods / broadside edges
    g.fillStyle(0x1d3f84, 1);
    g.fillRect(0, 14, 9, 7);
    g.fillRect(31, 14, 9, 7);
    g.fillStyle(0x63a4ff, 0.75);
    g.fillCircle(4, 17.5, 2);
    g.fillCircle(36, 17.5, 2);

    // Forward turret block
    g.fillStyle(0x4e90ff, 1);
    g.fillRect(16, 0, 8, 6);
    g.fillRect(18, 0, 4, 3);

    // Cockpit slit
    g.fillStyle(0x8ed6ff, 0.8);
    g.fillRoundedRect(17, 10, 6, 5, 2);

    // Rear engine bank
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

// ---------------------------------------------------------------------------
// Swarm — small fast organic-looking insectoid
// ---------------------------------------------------------------------------
export function ensureSwarmTexture(scene: Phaser.Scene): string {
  return ensureTexture(scene, 'swarm-texture', 20, 20, (g) => {
    // Organic crescent body
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

    // Wide translucent wing flare
    g.fillStyle(0xe3d63a, 0.45);
    g.fillEllipse(4.5, 9, 8, 12);
    g.fillEllipse(15.5, 9, 8, 12);

    // Core abdomen and forked tail
    g.fillStyle(0xb9a400, 0.95);
    g.fillEllipse(10, 10, 8, 11);
    g.fillStyle(0xffb000, 0.8);
    g.fillTriangle(8, 17, 10, 20, 9, 16);
    g.fillTriangle(12, 17, 10, 20, 11, 16);

    // Eyes
    g.fillStyle(0xffff5d, 0.9);
    g.fillCircle(7.2, 7, 1.6);
    g.fillCircle(12.8, 7, 1.6);
    g.fillStyle(0xffffff, 0.55);
    g.fillCircle(7, 6.4, 0.6);
    g.fillCircle(12.6, 6.4, 0.6);
  });
}

// ---------------------------------------------------------------------------
// Boss — imposing capital warship
// ---------------------------------------------------------------------------
export function ensureBossTexture(scene: Phaser.Scene): string {
  return ensureBossTextureVariant(scene, 'barrage', 'boss');
}

export function ensureBossTextureVariant(
  scene: Phaser.Scene,
  attackStyle: BossAttackStyle = 'barrage',
  bossName: string = 'boss'
): string {
  const motifVariant = Array.from(bossName).reduce((sum, char) => sum + char.charCodeAt(0), 0) % 3;
  const textureKey = `boss-texture-${attackStyle}-${motifVariant}`;

  return ensureTexture(scene, textureKey, 88, 56, (g) => {
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

    // Shared spine / bridge
    g.fillStyle(palette.accent, 0.92);
    g.fillRoundedRect(38, 6, 12, 10, 3);
    g.fillStyle(0xffffff, 0.7);
    g.fillRect(40, 8, 3, 3);
    g.fillRect(45, 8, 3, 3);

    // Name-hash crest accents
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

    // Engine bank
    g.fillStyle(motifVariant === 1 ? palette.panel : 0x1b1028, 0.9);
    g.fillRect(28, 50, 8, 6);
    g.fillRect(40, 50, 8, 6);
    g.fillRect(52, 50, 8, 6);
    g.fillStyle(palette.accent, 0.72);
    g.fillCircle(32, 54, 3);
    g.fillCircle(44, 54, 3);
    g.fillCircle(56, 54, 3);

    // Panel lines
    g.lineStyle(1, palette.panel, 0.4);
    g.lineBetween(44, 4, 44, 52);
    g.lineBetween(24, 24, 64, 24);
    g.lineBetween(28, 38, 60, 38);
  });
}

// ---------------------------------------------------------------------------
// Asteroid — irregular rocky body with craters
// ---------------------------------------------------------------------------
export function ensureAsteroidTexture(scene: Phaser.Scene): string {
  return ensureTexture(scene, 'asteroid-texture', 44, 44, (g) => {
    // Base rock shape (irregular)
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

    // Light face (upper-left lit area)
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

    // Dark crater 1
    g.fillStyle(0x443322, 0.7);
    g.fillCircle(28, 22, 6);

    // Dark crater 2
    g.fillCircle(14, 30, 4);

    // Crater rim highlight
    g.lineStyle(1, 0x998855, 0.3);
    g.strokeCircle(28, 22, 6);
    g.strokeCircle(14, 30, 4);

    // Surface cracks
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

    // Edge highlight
    g.lineStyle(1, 0x998866, 0.2);
    g.beginPath();
    g.moveTo(22, 0);
    g.lineTo(36, 4);
    g.lineTo(42, 16);
    g.strokePath();
  });
}

// ---------------------------------------------------------------------------
// Player Bullet — energy bolt with trailing glow
// ---------------------------------------------------------------------------
export function ensurePlayerBulletTexture(scene: Phaser.Scene): string {
  return ensureTexture(scene, 'player-bullet', 8, 18, (g) => {
    // Outer glow trail
    g.fillStyle(0x00aaff, 0.3);
    g.fillRect(1, 4, 6, 14);

    // Mid glow
    g.fillStyle(0x00ccff, 0.5);
    g.fillRect(2, 2, 4, 16);

    // Core bright bolt
    g.fillStyle(0x00ffff, 1);
    g.fillRect(3, 0, 2, 18);

    // Bright tip
    g.fillStyle(0xffffff, 0.9);
    g.fillRect(3, 0, 2, 5);

    // Tip highlight dot
    g.fillStyle(0xffffff, 1);
    g.fillCircle(4, 1, 1);
  });
}

// ---------------------------------------------------------------------------
// Enemy Bullet — red/orange energy orb
// ---------------------------------------------------------------------------
export function ensureEnemyBulletTexture(scene: Phaser.Scene): string {
  return ensureTexture(scene, 'enemy-bullet', 8, 8, (g) => {
    // Outer glow
    g.fillStyle(0xff4422, 0.3);
    g.fillCircle(4, 4, 4);

    // Mid glow
    g.fillStyle(0xff6644, 0.6);
    g.fillCircle(4, 4, 3);

    // Core
    g.fillStyle(0xff8866, 1);
    g.fillCircle(4, 4, 2);

    // Hot center
    g.fillStyle(0xffccaa, 0.8);
    g.fillCircle(4, 3, 1);
  });
}

// ---------------------------------------------------------------------------
// Bomber Bomb — teardrop bomb with warning detail
// ---------------------------------------------------------------------------
export function ensureBomberBombTexture(scene: Phaser.Scene): string {
  return ensureTexture(scene, 'bomber-bomb', 14, 18, (g) => {
    // Bomb body
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

    // Highlight
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

    // Warning stripe
    g.fillStyle(0xffcc00, 0.7);
    g.fillRect(3, 8, 8, 3);

    // Fuse glow
    g.fillStyle(0xff8800, 0.8);
    g.fillCircle(7, 2, 2);

    // Fuse spark
    g.fillStyle(0xffcc44, 0.9);
    g.fillCircle(7, 1, 1);

    // Tail fins
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

// ---------------------------------------------------------------------------
// Power-Ups — enhanced icons with glow
// ---------------------------------------------------------------------------
export function ensurePowerUpTextures(scene: Phaser.Scene): void {
  // Health: green cross with glow aura
  ensureTexture(scene, 'powerup-health', 20, 20, (g) => {
    // Glow aura
    g.fillStyle(0x00ff44, 0.15);
    g.fillCircle(10, 10, 10);

    // Background circle
    g.fillStyle(0x003311, 0.8);
    g.fillCircle(10, 10, 8);

    // Border ring
    g.lineStyle(1.5, 0x00ff44, 0.6);
    g.strokeCircle(10, 10, 8);

    // Cross (vertical)
    g.fillStyle(0x00ff44, 1);
    g.fillRect(8, 3, 4, 14);

    // Cross (horizontal)
    g.fillRect(3, 8, 14, 4);

    // Cross highlight
    g.fillStyle(0x44ff88, 0.7);
    g.fillRect(9, 4, 2, 12);
    g.fillRect(4, 9, 12, 2);

    // Center dot
    g.fillStyle(0x88ffaa, 0.8);
    g.fillCircle(10, 10, 2);
  });

  // Shield: blue hexagonal shield
  ensureTexture(scene, 'powerup-shield', 20, 20, (g) => {
    // Glow aura
    g.fillStyle(0x4488ff, 0.15);
    g.fillCircle(10, 10, 10);

    // Background circle
    g.fillStyle(0x112244, 0.8);
    g.fillCircle(10, 10, 8);

    // Border ring
    g.lineStyle(1.5, 0x4488ff, 0.6);
    g.strokeCircle(10, 10, 8);

    // Shield shape
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

    // Shield highlight
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

    // Inner glow
    g.fillStyle(0xaaddff, 0.4);
    g.fillCircle(10, 9, 3);
  });

  // Rapid Fire: yellow lightning bolt
  ensureTexture(scene, 'powerup-rapidfire', 20, 20, (g) => {
    // Glow aura
    g.fillStyle(0xffcc00, 0.15);
    g.fillCircle(10, 10, 10);

    // Background circle
    g.fillStyle(0x332200, 0.8);
    g.fillCircle(10, 10, 8);

    // Border ring
    g.lineStyle(1.5, 0xffcc00, 0.6);
    g.strokeCircle(10, 10, 8);

    // Lightning bolt
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

    // Bolt highlight
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

    // Spark points
    g.fillStyle(0xffffff, 0.5);
    g.fillCircle(11, 2, 1);
    g.fillCircle(8, 19, 1);
  });
}
