import Phaser from 'phaser';

import type { LevelConfig } from '../../config/LevelsConfig';
import { getPremiumBackgroundManifest } from '../../systems/parallax/premiumBackgroundManifest';
import { getViewportLayout } from '../../utils/layout';
import { UI_FONT_MONO } from '../../utils/uiFonts';
import type { IntermissionLayoutMetrics } from './presentation';
import type { PlanetIntermissionMotif, PlanetIntermissionProfile } from './planetProfiles';

function drawHexagon(
  graphics: Phaser.GameObjects.Graphics,
  centerX: number,
  centerY: number,
  radius: number
): void {
  const points = Array.from({ length: 6 }, (_, index) => {
    const angle = Math.PI / 3 * index;
    return {
      x: centerX + Math.cos(angle) * radius,
      y: centerY + Math.sin(angle) * radius,
    };
  });

  for (let index = 0; index < points.length; index += 1) {
    const from = points[index];
    const to = points[(index + 1) % points.length];
    graphics.lineBetween(from.x, from.y, to.x, to.y);
  }
}

function drawPlanetMotif(
  graphics: Phaser.GameObjects.Graphics,
  motif: PlanetIntermissionMotif,
  centerX: number,
  centerY: number,
  radius: number,
  primary: number,
  accent: number
): void {
  graphics.lineStyle(2, accent, 0.42);

  switch (motif) {
    case 'aurora':
      for (let offset = -42; offset <= 42; offset += 21) {
        graphics.lineBetween(centerX - 62, centerY + offset, centerX + 32, centerY + offset - 24);
      }
      break;
    case 'tideglass':
      for (let offset = -46; offset <= 46; offset += 19) {
        graphics.strokeEllipse(centerX - 8, centerY + offset, radius * 1.38, 13);
      }
      graphics.fillStyle(0xffffff, 0.5);
      graphics.fillCircle(centerX - 46, centerY - 36, 4);
      graphics.fillCircle(centerX + 8, centerY + 48, 2.5);
      break;
    case 'ember':
      graphics.lineStyle(3, accent, 0.5);
      for (let offset = -54; offset <= 50; offset += 22) {
        graphics.lineBetween(centerX - 58, centerY + offset + 24, centerX + 42, centerY + offset - 22);
      }
      graphics.fillStyle(0xffffff, 0.55);
      graphics.fillCircle(centerX - 38, centerY - 6, 3);
      graphics.fillCircle(centerX + 2, centerY + 28, 2);
      break;
    case 'clockwork':
      graphics.strokeCircle(centerX - 10, centerY - 5, radius * 0.55);
      graphics.strokeCircle(centerX - 10, centerY - 5, radius * 0.29);
      for (let spoke = 0; spoke < 8; spoke += 1) {
        const angle = spoke * Math.PI / 4;
        graphics.lineBetween(
          centerX - 10 + Math.cos(angle) * radius * 0.32,
          centerY - 5 + Math.sin(angle) * radius * 0.32,
          centerX - 10 + Math.cos(angle) * radius * 0.58,
          centerY - 5 + Math.sin(angle) * radius * 0.58
        );
      }
      break;
    case 'reef':
      graphics.lineStyle(4, accent, 0.44);
      for (let branch = -2; branch <= 2; branch += 1) {
        const x = centerX - 36 + branch * 21;
        graphics.lineBetween(x, centerY + 58, x + branch * 5, centerY - 24);
        graphics.lineBetween(x, centerY + 16, x - 14, centerY - 3);
        graphics.lineBetween(x + 2, centerY - 1, x + 17, centerY - 22);
      }
      break;
    case 'wreckage':
      graphics.lineStyle(2, accent, 0.46);
      graphics.strokeTriangle(centerX - 62, centerY - 22, centerX - 12, centerY - 54, centerX + 8, centerY + 2);
      graphics.strokeTriangle(centerX - 24, centerY + 18, centerX + 38, centerY - 12, centerX + 54, centerY + 42);
      graphics.lineBetween(centerX - 58, centerY + 48, centerX + 42, centerY - 48);
      break;
    case 'cathedral':
      graphics.lineStyle(2, accent, 0.4);
      for (let arch = -2; arch <= 2; arch += 1) {
        const x = centerX - 44 + arch * 22;
        graphics.lineBetween(x, centerY + 54, x, centerY - 18);
        graphics.lineBetween(x, centerY - 18, x + 11, centerY - 42);
        graphics.lineBetween(x + 11, centerY - 42, x + 22, centerY - 18);
      }
      break;
    case 'eclipse':
      graphics.lineStyle(3, accent, 0.42);
      graphics.strokeCircle(centerX - 12, centerY - 5, radius * 0.52);
      graphics.fillStyle(0x03040a, 0.72);
      graphics.fillCircle(centerX + 4, centerY - 9, radius * 0.38);
      break;
    case 'hive':
      graphics.lineStyle(2, accent, 0.38);
      for (let row = -1; row <= 1; row += 1) {
        for (let column = -2; column <= 1; column += 1) {
          drawHexagon(graphics, centerX + column * 31 + (row % 2) * 15, centerY + row * 28, 17);
        }
      }
      break;
    case 'singularity':
      graphics.lineStyle(2, accent, 0.48);
      for (let ring = 0; ring < 4; ring += 1) {
        graphics.strokeCircle(centerX - 6, centerY - 4, 25 + ring * 16);
      }
      graphics.fillStyle(0x000005, 0.92);
      graphics.fillCircle(centerX - 6, centerY - 4, 22);
      graphics.fillStyle(primary, 0.8);
      graphics.fillCircle(centerX - 13, centerY - 11, 3);
      break;
  }
}

function ensurePlanetTexture(
  scene: Phaser.Scene,
  level: number,
  palette: [number, number],
  profile: PlanetIntermissionProfile
): string {
  const key = `planet-arrival-${String(level).padStart(2, '0')}-${profile.motif}`;
  if (scene.textures.exists(key)) {
    return key;
  }

  const graphics = scene.add.graphics();
  const centerX = 160;
  const centerY = 160;
  const radius = 112;

  graphics.fillStyle(palette[1], 0.035);
  graphics.fillCircle(centerX, centerY, radius + 39);
  graphics.fillStyle(palette[1], 0.065);
  graphics.fillCircle(centerX, centerY, radius + 25);
  graphics.fillStyle(palette[0], 0.1);
  graphics.fillCircle(centerX, centerY, radius + 13);

  if (profile.motif === 'eclipse' || profile.motif === 'singularity') {
    graphics.lineStyle(profile.motif === 'singularity' ? 14 : 8, palette[1], 0.28);
    graphics.strokeEllipse(centerX, centerY + 3, radius * 2.62, radius * 0.72);
    graphics.lineStyle(2, 0xffffff, 0.38);
    graphics.strokeEllipse(centerX, centerY + 3, radius * 2.6, radius * 0.68);
  }

  graphics.fillStyle(0x020711, 1);
  graphics.fillCircle(centerX, centerY, radius);
  graphics.fillStyle(palette[0], 0.82);
  graphics.fillCircle(centerX - 25, centerY - 20, radius * 0.82);
  graphics.fillStyle(palette[1], 0.34);
  graphics.fillCircle(centerX - 47, centerY - 43, radius * 0.56);
  graphics.fillStyle(0xffffff, 0.07);
  graphics.fillCircle(centerX - 59, centerY - 60, radius * 0.32);

  drawPlanetMotif(graphics, profile.motif, centerX, centerY, radius, palette[0], palette[1]);

  graphics.fillStyle(0x01040b, 0.82);
  graphics.fillCircle(centerX + 55, centerY + 24, radius * 0.82);
  graphics.lineStyle(6, palette[1], 0.12);
  graphics.strokeCircle(centerX, centerY, radius + 3);
  graphics.lineStyle(2, palette[1], 0.88);
  graphics.strokeCircle(centerX, centerY, radius);
  graphics.lineStyle(1, 0xffffff, 0.72);
  graphics.arc(centerX, centerY, radius - 2, Math.PI * 0.78, Math.PI * 1.48, false);
  graphics.fillStyle(0xffffff, 0.95);
  graphics.fillCircle(centerX - 78, centerY - 77, 3);

  graphics.generateTexture(key, 320, 320);
  graphics.destroy();
  return key;
}

function drawBackgroundStars(
  graphics: Phaser.GameObjects.Graphics,
  level: number,
  width: number,
  height: number,
  accent: number
): void {
  for (let index = 0; index < 54; index += 1) {
    const x = (index * 137 + level * 83) % width;
    const y = (index * 71 + level * 47) % height;
    const radius = index % 13 === 0 ? 1.4 : index % 5 === 0 ? 0.9 : 0.55;
    graphics.fillStyle(index % 7 === 0 ? accent : 0xd9f3ff, index % 5 === 0 ? 0.42 : 0.22);
    graphics.fillCircle(x, y, radius);
  }
}

export function createIntermissionBackdrop(
  scene: Phaser.Scene,
  levelConfig: LevelConfig,
  level: number,
  layout: IntermissionLayoutMetrics
): void {
  const viewport = getViewportLayout(scene);
  const manifest = getPremiumBackgroundManifest(levelConfig.name);

  if (manifest && scene.textures.exists(manifest.compositeKey)) {
    scene.add.image(viewport.centerX, viewport.centerY, manifest.compositeKey)
      .setDisplaySize(viewport.width, viewport.height)
      .setAlpha(layout.mode === 'desktop' ? 0.43 : 0.34)
      .setDepth(-10);
  }

  const backdrop = scene.add.graphics().setDepth(-9);
  backdrop.fillStyle(0x01040b, layout.mode === 'portrait' ? 0.52 : 0.4);
  backdrop.fillRect(viewport.left, viewport.top, viewport.width, viewport.height);
  drawBackgroundStars(backdrop, level, viewport.width, viewport.height, levelConfig.planetPalette[1]);

  const frame = scene.add.graphics().setDepth(0);
  frame.lineStyle(1, levelConfig.planetPalette[1], 0.14);
  const verticalSpacing = layout.mode === 'desktop' ? 84 : 58;
  for (let y = viewport.top + verticalSpacing; y < viewport.bottom; y += verticalSpacing) {
    frame.lineBetween(viewport.left, y, viewport.right, y);
  }
  frame.lineStyle(1, levelConfig.planetPalette[0], 0.08);
  const horizontalSpacing = layout.mode === 'desktop' ? 96 : 72;
  for (let x = viewport.left + horizontalSpacing; x < viewport.right; x += horizontalSpacing) {
    frame.lineBetween(x, viewport.top, x, viewport.bottom);
  }
}

export function createPlanetArrivalVisual(
  scene: Phaser.Scene,
  levelConfig: LevelConfig,
  level: number,
  profile: PlanetIntermissionProfile,
  layout: IntermissionLayoutMetrics
): Phaser.GameObjects.Image {
  const textureKey = ensurePlanetTexture(scene, level, levelConfig.planetPalette, profile);
  const orbit = scene.add.ellipse(
    layout.planetX,
    layout.planetY,
    layout.planetDiameter * 1.34,
    layout.planetDiameter * 0.52
  ).setStrokeStyle(1, levelConfig.planetPalette[1], 0.42).setAngle(profile.orbitTilt).setDepth(0);
  orbit.setBlendMode(Phaser.BlendModes.ADD);

  const route = scene.add.graphics().setDepth(2);
  const routeStartX = layout.planetX - layout.planetDiameter * 0.58;
  const routeStartY = layout.planetY + layout.planetDiameter * 0.46;
  const routeEndX = layout.planetX - layout.planetDiameter * 0.22;
  const routeEndY = layout.planetY + layout.planetDiameter * 0.29;
  route.lineStyle(1, levelConfig.planetPalette[1], 0.55);
  route.lineBetween(routeStartX, routeStartY, routeEndX, routeEndY);
  route.fillStyle(levelConfig.planetPalette[1], 0.9);
  route.fillCircle(routeEndX, routeEndY, 3);
  route.fillStyle(0xeefcff, 0.95);
  route.fillTriangle(routeStartX - 6, routeStartY + 4, routeStartX + 8, routeStartY, routeStartX - 5, routeStartY - 5);

  for (let index = 0; index < profile.satelliteCount; index += 1) {
    const angle = (index / Math.max(1, profile.satelliteCount)) * Math.PI * 2 + level * 0.41;
    const satelliteX = layout.planetX + Math.cos(angle) * layout.planetDiameter * 0.63;
    const satelliteY = layout.planetY + Math.sin(angle) * layout.planetDiameter * 0.22;
    route.fillStyle(index === 0 ? 0xffffff : levelConfig.planetPalette[1], 0.8);
    route.fillCircle(satelliteX, satelliteY, index === 0 ? 2.5 : 1.8);
  }

  const planet = scene.add.image(layout.planetX, layout.planetY, textureKey)
    .setScale(layout.planetScale)
    .setDepth(1);

  if (layout.showOrbitLabels) {
    scene.add.text(
      layout.planetX - layout.planetDiameter * 0.52,
      layout.planetY - layout.planetDiameter * 0.63,
      profile.classification,
      {
        fontSize: layout.mode === 'desktop' ? '11px' : '9px',
        color: '#8eb2c8',
        fontFamily: UI_FONT_MONO,
      }
    ).setOrigin(0, 0.5).setDepth(3);

    scene.add.text(
      layout.planetX,
      layout.planetY + layout.planetDiameter * 0.67,
      `ORBIT ${String(level).padStart(2, '0')}  ·  ${profile.approachCode}`,
      {
        fontSize: layout.mode === 'desktop' ? '11px' : '9px',
        color: '#6f93aa',
        fontFamily: UI_FONT_MONO,
      }
    ).setOrigin(0.5).setDepth(3);
  }

  const reducedMotion = typeof window !== 'undefined'
    && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  if (!reducedMotion) {
    planet.setAlpha(0).setScale(layout.planetScale * 0.92);
    scene.tweens.add({
      targets: planet,
      alpha: 1,
      scaleX: layout.planetScale,
      scaleY: layout.planetScale,
      duration: 650,
      ease: 'Sine.Out',
    });
  }

  return planet;
}
