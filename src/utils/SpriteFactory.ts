import Phaser from 'phaser';

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
    // Main hull body (dark blue-gray base)
    g.fillStyle(0x1a2a44, 1);
    g.beginPath();
    g.moveTo(18, 0);   // nose
    g.lineTo(34, 32);
    g.lineTo(28, 40);
    g.lineTo(18, 36);
    g.lineTo(8, 40);
    g.lineTo(2, 32);
    g.closePath();
    g.fillPath();

    // Upper hull highlight
    g.fillStyle(0x2a4a6a, 1);
    g.beginPath();
    g.moveTo(18, 2);
    g.lineTo(30, 28);
    g.lineTo(18, 24);
    g.lineTo(6, 28);
    g.closePath();
    g.fillPath();

    // Center hull accent (brighter stripe)
    g.fillStyle(0x00ccff, 1);
    g.beginPath();
    g.moveTo(18, 4);
    g.lineTo(24, 26);
    g.lineTo(18, 22);
    g.lineTo(12, 26);
    g.closePath();
    g.fillPath();

    // Cockpit canopy
    g.fillStyle(0x44eeff, 0.9);
    g.beginPath();
    g.moveTo(18, 8);
    g.lineTo(21, 16);
    g.lineTo(18, 18);
    g.lineTo(15, 16);
    g.closePath();
    g.fillPath();

    // Cockpit reflection
    g.fillStyle(0xaafaff, 0.5);
    g.beginPath();
    g.moveTo(18, 9);
    g.lineTo(19, 13);
    g.lineTo(18, 14);
    g.lineTo(17, 13);
    g.closePath();
    g.fillPath();

    // Wing tip accents (port)
    g.fillStyle(0x00aaff, 0.8);
    g.beginPath();
    g.moveTo(2, 32);
    g.lineTo(6, 28);
    g.lineTo(8, 36);
    g.closePath();
    g.fillPath();

    // Wing tip accents (starboard)
    g.beginPath();
    g.moveTo(34, 32);
    g.lineTo(30, 28);
    g.lineTo(28, 36);
    g.closePath();
    g.fillPath();

    // Engine nozzle (port)
    g.fillStyle(0x334455, 1);
    g.fillRect(10, 38, 5, 6);

    // Engine nozzle (starboard)
    g.fillRect(21, 38, 5, 6);

    // Engine glow (port)
    g.fillStyle(0x00ddff, 0.7);
    g.fillCircle(12, 42, 2);

    // Engine glow (starboard)
    g.fillCircle(24, 42, 2);

    // Panel lines
    g.lineStyle(1, 0x3366aa, 0.3);
    g.beginPath();
    g.moveTo(18, 6);
    g.lineTo(18, 36);
    g.strokePath();
    g.beginPath();
    g.moveTo(10, 30);
    g.lineTo(26, 30);
    g.strokePath();

    // Outer hull rim light for higher-fidelity silhouette
    g.lineStyle(1, 0x66ddff, 0.55);
    g.beginPath();
    g.moveTo(18, 1);
    g.lineTo(32, 30);
    g.lineTo(27, 39);
    g.lineTo(18, 35);
    g.lineTo(9, 39);
    g.lineTo(4, 30);
    g.closePath();
    g.strokePath();

    // Engine plume bloom
    g.fillStyle(0x99eeff, 0.28);
    g.fillEllipse(12, 42, 8, 5);
    g.fillEllipse(24, 42, 8, 5);

    // Nose beacon highlight
    g.fillStyle(0xd8ffff, 0.7);
    g.fillCircle(18, 3, 1.2);
  });
}

// ---------------------------------------------------------------------------
// Scout — sleek dart interceptor
// ---------------------------------------------------------------------------
export function ensureScoutTexture(scene: Phaser.Scene): string {
  return ensureTexture(scene, 'scout-texture', 26, 28, (g) => {
    // Main body (dark red)
    g.fillStyle(0x881122, 1);
    g.beginPath();
    g.moveTo(13, 0);
    g.lineTo(24, 20);
    g.lineTo(20, 28);
    g.lineTo(6, 28);
    g.lineTo(2, 20);
    g.closePath();
    g.fillPath();

    // Upper hull highlight
    g.fillStyle(0xcc2244, 1);
    g.beginPath();
    g.moveTo(13, 2);
    g.lineTo(20, 18);
    g.lineTo(13, 16);
    g.lineTo(6, 18);
    g.closePath();
    g.fillPath();

    // Nose accent
    g.fillStyle(0xff4466, 1);
    g.beginPath();
    g.moveTo(13, 0);
    g.lineTo(16, 8);
    g.lineTo(13, 10);
    g.lineTo(10, 8);
    g.closePath();
    g.fillPath();

    // Eye/sensor glow
    g.fillStyle(0xff6688, 0.8);
    g.fillCircle(13, 12, 2);

    // Wing edge highlights
    g.lineStyle(1, 0xff5566, 0.5);
    g.beginPath();
    g.moveTo(2, 20);
    g.lineTo(13, 4);
    g.strokePath();
    g.beginPath();
    g.moveTo(24, 20);
    g.lineTo(13, 4);
    g.strokePath();

    // Engine glow
    g.fillStyle(0xff4444, 0.6);
    g.fillCircle(13, 26, 2);

    // Additional wing trim and depth shadow
    g.fillStyle(0x550a18, 0.45);
    g.fillTriangle(6, 24, 13, 18, 10, 26);
    g.fillTriangle(20, 24, 13, 18, 16, 26);

    g.lineStyle(1, 0xff99aa, 0.6);
    g.beginPath();
    g.moveTo(13, 1);
    g.lineTo(21, 19);
    g.lineTo(19, 27);
    g.lineTo(7, 27);
    g.lineTo(5, 19);
    g.closePath();
    g.strokePath();

    // Hot trail bloom
    g.fillStyle(0xff8866, 0.35);
    g.fillEllipse(13, 26, 7, 4);
  });
}

// ---------------------------------------------------------------------------
// Fighter — angular attack craft with swept wings
// ---------------------------------------------------------------------------
export function ensureFighterTexture(scene: Phaser.Scene): string {
  return ensureTexture(scene, 'fighter-texture', 36, 36, (g) => {
    // Main fuselage
    g.fillStyle(0x115533, 1);
    g.beginPath();
    g.moveTo(18, 0);
    g.lineTo(28, 12);
    g.lineTo(32, 28);
    g.lineTo(28, 36);
    g.lineTo(8, 36);
    g.lineTo(4, 28);
    g.lineTo(8, 12);
    g.closePath();
    g.fillPath();

    // Wings
    g.fillStyle(0x22aa55, 1);
    g.beginPath();
    g.moveTo(8, 12);
    g.lineTo(0, 28);
    g.lineTo(4, 28);
    g.lineTo(12, 18);
    g.closePath();
    g.fillPath();
    g.beginPath();
    g.moveTo(28, 12);
    g.lineTo(36, 28);
    g.lineTo(32, 28);
    g.lineTo(24, 18);
    g.closePath();
    g.fillPath();

    // Center body highlight
    g.fillStyle(0x33cc66, 1);
    g.beginPath();
    g.moveTo(18, 2);
    g.lineTo(24, 14);
    g.lineTo(22, 28);
    g.lineTo(14, 28);
    g.lineTo(12, 14);
    g.closePath();
    g.fillPath();

    // Nose accent
    g.fillStyle(0x44ff88, 1);
    g.beginPath();
    g.moveTo(18, 0);
    g.lineTo(21, 8);
    g.lineTo(18, 10);
    g.lineTo(15, 8);
    g.closePath();
    g.fillPath();

    // Cockpit
    g.fillStyle(0x88ffbb, 0.8);
    g.beginPath();
    g.moveTo(18, 10);
    g.lineTo(20, 16);
    g.lineTo(18, 18);
    g.lineTo(16, 16);
    g.closePath();
    g.fillPath();

    // Engine glows
    g.fillStyle(0x44ff88, 0.6);
    g.fillCircle(14, 34, 2);
    g.fillCircle(22, 34, 2);

    // Panel lines
    g.lineStyle(1, 0x228844, 0.3);
    g.beginPath();
    g.moveTo(18, 4);
    g.lineTo(18, 32);
    g.strokePath();

    // Hard-edge silhouette and wing energy rails
    g.lineStyle(1, 0x88ffcc, 0.55);
    g.beginPath();
    g.moveTo(18, 1);
    g.lineTo(29, 13);
    g.lineTo(33, 28);
    g.lineTo(29, 35);
    g.lineTo(7, 35);
    g.lineTo(3, 28);
    g.lineTo(7, 13);
    g.closePath();
    g.strokePath();

    g.fillStyle(0x44ffaa, 0.28);
    g.fillEllipse(11, 27, 7, 3);
    g.fillEllipse(25, 27, 7, 3);

    g.fillStyle(0xaaffdd, 0.45);
    g.fillRect(6, 24, 6, 1);
    g.fillRect(24, 24, 6, 1);
  });
}

// ---------------------------------------------------------------------------
// Bomber — heavy rounded bomber with armor plating
// ---------------------------------------------------------------------------
export function ensureBomberTexture(scene: Phaser.Scene): string {
  return ensureTexture(scene, 'bomber-texture', 44, 38, (g) => {
    // Main hull (heavy body)
    g.fillStyle(0x884411, 1);
    g.beginPath();
    g.moveTo(22, 0);
    g.lineTo(36, 8);
    g.lineTo(40, 20);
    g.lineTo(38, 32);
    g.lineTo(30, 38);
    g.lineTo(14, 38);
    g.lineTo(6, 32);
    g.lineTo(4, 20);
    g.lineTo(8, 8);
    g.closePath();
    g.fillPath();

    // Armor plating (upper)
    g.fillStyle(0xcc6622, 1);
    g.beginPath();
    g.moveTo(22, 2);
    g.lineTo(32, 10);
    g.lineTo(34, 22);
    g.lineTo(22, 20);
    g.lineTo(10, 22);
    g.lineTo(12, 10);
    g.closePath();
    g.fillPath();

    // Center ridge
    g.fillStyle(0xff8844, 1);
    g.beginPath();
    g.moveTo(22, 2);
    g.lineTo(26, 14);
    g.lineTo(24, 26);
    g.lineTo(20, 26);
    g.lineTo(18, 14);
    g.closePath();
    g.fillPath();

    // Bomb bay door line
    g.lineStyle(2, 0x663311, 0.6);
    g.beginPath();
    g.moveTo(14, 24);
    g.lineTo(30, 24);
    g.strokePath();
    g.beginPath();
    g.moveTo(14, 24);
    g.lineTo(14, 34);
    g.strokePath();
    g.beginPath();
    g.moveTo(30, 24);
    g.lineTo(30, 34);
    g.strokePath();

    // Side engine pods
    g.fillStyle(0xaa5522, 1);
    g.fillRect(2, 18, 6, 12);
    g.fillRect(36, 18, 6, 12);

    // Engine glows
    g.fillStyle(0xffaa44, 0.7);
    g.fillCircle(5, 26, 3);
    g.fillCircle(39, 26, 3);

    // Cockpit windows
    g.fillStyle(0xffcc66, 0.8);
    g.fillRect(18, 8, 8, 4);
    g.fillStyle(0xffdd88, 0.5);
    g.fillRect(19, 9, 6, 2);

    // Warning markings
    g.fillStyle(0xffcc00, 0.4);
    g.fillRect(16, 30, 4, 2);
    g.fillRect(24, 30, 4, 2);

    // Armor edge definition
    g.lineStyle(1, 0xffb777, 0.5);
    g.beginPath();
    g.moveTo(22, 1);
    g.lineTo(35, 9);
    g.lineTo(39, 20);
    g.lineTo(37, 31);
    g.lineTo(29, 37);
    g.lineTo(15, 37);
    g.lineTo(7, 31);
    g.lineTo(5, 20);
    g.lineTo(9, 9);
    g.closePath();
    g.strokePath();

    // Heavy engine heat haze
    g.fillStyle(0xffcc66, 0.28);
    g.fillEllipse(5, 26, 10, 6);
    g.fillEllipse(39, 26, 10, 6);
  });
}

// ---------------------------------------------------------------------------
// Gunship — heavy angular gun platform
// ---------------------------------------------------------------------------
export function ensureGunshipTexture(scene: Phaser.Scene): string {
  return ensureTexture(scene, 'gunship-texture', 40, 40, (g) => {
    // Main hull
    g.fillStyle(0x113366, 1);
    g.beginPath();
    g.moveTo(20, 0);
    g.lineTo(34, 12);
    g.lineTo(36, 30);
    g.lineTo(30, 40);
    g.lineTo(10, 40);
    g.lineTo(4, 30);
    g.lineTo(6, 12);
    g.closePath();
    g.fillPath();

    // Upper hull
    g.fillStyle(0x2255aa, 1);
    g.beginPath();
    g.moveTo(20, 2);
    g.lineTo(30, 12);
    g.lineTo(30, 26);
    g.lineTo(20, 24);
    g.lineTo(10, 26);
    g.lineTo(10, 12);
    g.closePath();
    g.fillPath();

    // Center accent
    g.fillStyle(0x3377cc, 1);
    g.beginPath();
    g.moveTo(20, 4);
    g.lineTo(26, 16);
    g.lineTo(24, 28);
    g.lineTo(16, 28);
    g.lineTo(14, 16);
    g.closePath();
    g.fillPath();

    // Gun turret (top)
    g.fillStyle(0x4488ff, 1);
    g.fillRect(16, 0, 8, 6);
    g.fillStyle(0x66aaff, 0.8);
    g.fillRect(18, 0, 4, 4);

    // Side gun pods
    g.fillStyle(0x2244aa, 1);
    g.fillRect(0, 16, 8, 8);
    g.fillRect(32, 16, 8, 8);

    // Gun pod muzzles
    g.fillStyle(0x4488ff, 0.7);
    g.fillCircle(4, 20, 2);
    g.fillCircle(36, 20, 2);

    // Cockpit
    g.fillStyle(0x66bbff, 0.7);
    g.fillRect(17, 10, 6, 6);
    g.fillStyle(0x88ddff, 0.4);
    g.fillRect(18, 11, 4, 4);

    // Engine glows
    g.fillStyle(0x4488ff, 0.6);
    g.fillCircle(14, 38, 2);
    g.fillCircle(26, 38, 2);

    // Armor panel lines
    g.lineStyle(1, 0x2255aa, 0.3);
    g.beginPath();
    g.moveTo(10, 20);
    g.lineTo(30, 20);
    g.strokePath();
    g.beginPath();
    g.moveTo(20, 4);
    g.lineTo(20, 36);
    g.strokePath();

    // Hull contour line for clearer silhouette
    g.lineStyle(1, 0x88ccff, 0.52);
    g.beginPath();
    g.moveTo(20, 1);
    g.lineTo(33, 12);
    g.lineTo(35, 30);
    g.lineTo(29, 39);
    g.lineTo(11, 39);
    g.lineTo(5, 30);
    g.lineTo(7, 12);
    g.closePath();
    g.strokePath();

    // Muzzle light strips and vent glows
    g.fillStyle(0x99cfff, 0.45);
    g.fillRect(2, 19, 4, 2);
    g.fillRect(34, 19, 4, 2);

    g.fillStyle(0x66bbff, 0.22);
    g.fillEllipse(14, 38, 8, 4);
    g.fillEllipse(26, 38, 8, 4);
  });
}

// ---------------------------------------------------------------------------
// Swarm — small fast organic-looking insectoid
// ---------------------------------------------------------------------------
export function ensureSwarmTexture(scene: Phaser.Scene): string {
  return ensureTexture(scene, 'swarm-texture', 20, 20, (g) => {
    // Body core
    g.fillStyle(0x998800, 1);
    g.beginPath();
    g.moveTo(10, 0);
    g.lineTo(16, 6);
    g.lineTo(18, 14);
    g.lineTo(14, 20);
    g.lineTo(6, 20);
    g.lineTo(2, 14);
    g.lineTo(4, 6);
    g.closePath();
    g.fillPath();

    // Wings (port)
    g.fillStyle(0xddcc22, 0.6);
    g.beginPath();
    g.moveTo(4, 6);
    g.lineTo(0, 2);
    g.lineTo(0, 12);
    g.lineTo(4, 10);
    g.closePath();
    g.fillPath();

    // Wings (starboard)
    g.beginPath();
    g.moveTo(16, 6);
    g.lineTo(20, 2);
    g.lineTo(20, 12);
    g.lineTo(16, 10);
    g.closePath();
    g.fillPath();

    // Eye glow (twin)
    g.fillStyle(0xffff44, 0.9);
    g.fillCircle(7, 6, 2);
    g.fillCircle(13, 6, 2);

    // Eye highlight
    g.fillStyle(0xffffff, 0.5);
    g.fillCircle(7, 5, 1);
    g.fillCircle(13, 5, 1);

    // Stinger/tail
    g.fillStyle(0xffaa00, 0.8);
    g.beginPath();
    g.moveTo(8, 18);
    g.lineTo(10, 20);
    g.lineTo(12, 18);
    g.closePath();
    g.fillPath();
  });
}

// ---------------------------------------------------------------------------
// Boss — imposing capital warship
// ---------------------------------------------------------------------------
export function ensureBossTexture(scene: Phaser.Scene): string {
  return ensureTexture(scene, 'boss-texture', 88, 56, (g) => {
    // Main hull
    g.fillStyle(0x661122, 1);
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

    // Upper hull plating
    g.fillStyle(0x991833, 1);
    g.beginPath();
    g.moveTo(44, 2);
    g.lineTo(62, 12);
    g.lineTo(66, 30);
    g.lineTo(44, 28);
    g.lineTo(22, 30);
    g.lineTo(26, 12);
    g.closePath();
    g.fillPath();

    // Center spine
    g.fillStyle(0xcc2244, 1);
    g.beginPath();
    g.moveTo(44, 2);
    g.lineTo(52, 20);
    g.lineTo(48, 38);
    g.lineTo(40, 38);
    g.lineTo(36, 20);
    g.closePath();
    g.fillPath();

    // Bridge section
    g.fillStyle(0xff4466, 1);
    g.fillRect(38, 6, 12, 10);

    // Bridge windows
    g.fillStyle(0xff8888, 0.8);
    g.fillRect(40, 8, 3, 3);
    g.fillRect(45, 8, 3, 3);
    g.fillStyle(0xffaaaa, 0.5);
    g.fillRect(41, 9, 1, 1);
    g.fillRect(46, 9, 1, 1);

    // Weapon hardpoints (port wing)
    g.fillStyle(0x881122, 1);
    g.beginPath();
    g.moveTo(20, 12);
    g.lineTo(4, 36);
    g.lineTo(8, 38);
    g.lineTo(24, 18);
    g.closePath();
    g.fillPath();

    // Weapon hardpoints (starboard wing)
    g.beginPath();
    g.moveTo(68, 12);
    g.lineTo(84, 36);
    g.lineTo(80, 38);
    g.lineTo(64, 18);
    g.closePath();
    g.fillPath();

    // Gun turrets on wings
    g.fillStyle(0xdd3355, 1);
    g.fillRect(6, 34, 8, 4);
    g.fillRect(74, 34, 8, 4);

    // Turret muzzles
    g.fillStyle(0xff6688, 0.7);
    g.fillCircle(10, 36, 2);
    g.fillCircle(78, 36, 2);

    // Engine bank (3 engines)
    g.fillStyle(0x550011, 1);
    g.fillRect(28, 50, 8, 6);
    g.fillRect(40, 50, 8, 6);
    g.fillRect(52, 50, 8, 6);

    // Engine glow
    g.fillStyle(0xff4466, 0.7);
    g.fillCircle(32, 54, 3);
    g.fillCircle(44, 54, 3);
    g.fillCircle(56, 54, 3);

    // Armor panel lines
    g.lineStyle(1, 0x771122, 0.4);
    g.beginPath();
    g.moveTo(44, 4);
    g.lineTo(44, 52);
    g.strokePath();
    g.beginPath();
    g.moveTo(24, 24);
    g.lineTo(64, 24);
    g.strokePath();
    g.beginPath();
    g.moveTo(28, 38);
    g.lineTo(60, 38);
    g.strokePath();
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
