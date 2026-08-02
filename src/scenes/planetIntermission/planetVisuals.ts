import Phaser from 'phaser';

import type { LevelConfig } from '../../config/LevelsConfig';
import { getPremiumBackgroundManifest } from '../../systems/parallax/premiumBackgroundManifest';
import { drawSoftCircle } from '../../systems/parallax/textureUtils';
import { getViewportLayout } from '../../utils/layout';
import { UI_FONT_MONO } from '../../utils/uiFonts';
import type { IntermissionLayoutMetrics } from './presentation';
import type { PlanetIntermissionMotif, PlanetIntermissionProfile } from './planetProfiles';

const PLANET_TEXTURE_SIZE = 512;
const PLANET_TEXTURE_CENTER = PLANET_TEXTURE_SIZE / 2;
const PLANET_RADIUS = 180;

function mixColor(from: number, to: number, amount: number): number {
  const channel = (shift: number) => Math.round(
    ((from >> shift) & 0xff) * (1 - amount) + ((to >> shift) & 0xff) * amount
  );
  return channel(16) << 16 | channel(8) << 8 | channel(0);
}

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

function drawCurvedBand(
  graphics: Phaser.GameObjects.Graphics,
  points: readonly { x: number; y: number }[],
  curve: number
): void {
  const segmentsPerEdge = 5;
  for (let edge = 0; edge < points.length - 1; edge += 1) {
    const from = points[edge];
    const to = points[edge + 1];
    for (let segment = 0; segment < segmentsPerEdge; segment += 1) {
      const t0 = segment / segmentsPerEdge;
      const t1 = (segment + 1) / segmentsPerEdge;
      const bend = (t: number) => Math.sin(t * Math.PI) * curve;
      graphics.lineBetween(
        Phaser.Math.Linear(from.x, to.x, t0),
        Phaser.Math.Linear(from.y, to.y, t0) + bend(t0),
        Phaser.Math.Linear(from.x, to.x, t1),
        Phaser.Math.Linear(from.y, to.y, t1) + bend(t1)
      );
    }
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
  const x = (fraction: number) => centerX + radius * fraction;
  const y = (fraction: number) => centerY + radius * fraction;
  graphics.lineStyle(Math.max(2, radius * 0.015), accent, 0.5);

  switch (motif) {
    case 'aurora':
      for (let band = -2; band <= 2; band += 1) {
        const bandY = y(band * 0.19);
        drawCurvedBand(graphics, [
          { x: x(-0.72), y: bandY + radius * 0.12 },
          { x: x(-0.3), y: bandY - radius * 0.08 },
          { x: x(0.18), y: bandY + radius * 0.02 },
          { x: x(0.55), y: bandY - radius * 0.14 },
        ], radius * (band % 2 === 0 ? 0.045 : -0.045));
      }
      break;
    case 'tideglass':
      for (let band = -3; band <= 3; band += 1) {
        const latitude = band * 0.16;
        const width = radius * 1.48 * Math.sqrt(Math.max(0.2, 1 - latitude * latitude));
        graphics.strokeEllipse(x(-0.05), y(latitude), width, radius * 0.075);
      }
      graphics.fillStyle(0xffffff, 0.5);
      graphics.fillCircle(x(-0.42), y(-0.32), radius * 0.03);
      graphics.fillCircle(x(0.08), y(0.43), radius * 0.018);
      break;
    case 'ember':
      graphics.lineStyle(radius * 0.022, accent, 0.58);
      for (let band = -3; band <= 3; band += 1) {
        drawCurvedBand(graphics, [
          { x: x(-0.62), y: y(band * 0.17 + 0.16) },
          { x: x(-0.1), y: y(band * 0.17 - 0.08) },
          { x: x(0.38), y: y(band * 0.17 - 0.18) },
        ], radius * 0.055);
      }
      graphics.fillStyle(0xffffff, 0.55);
      graphics.fillCircle(x(-0.34), y(-0.05), radius * 0.025);
      graphics.fillCircle(x(0.02), y(0.25), radius * 0.018);
      break;
    case 'clockwork':
      graphics.strokeEllipse(x(-0.08), y(-0.04), radius * 1.02, radius * 0.72);
      graphics.strokeEllipse(x(-0.08), y(-0.04), radius * 0.52, radius * 0.36);
      for (let spoke = 0; spoke < 8; spoke += 1) {
        const angle = spoke * Math.PI / 4;
        graphics.lineBetween(
          x(-0.08) + Math.cos(angle) * radius * 0.29,
          y(-0.04) + Math.sin(angle) * radius * 0.2,
          x(-0.08) + Math.cos(angle) * radius * 0.57,
          y(-0.04) + Math.sin(angle) * radius * 0.4
        );
      }
      break;
    case 'reef':
      graphics.lineStyle(radius * 0.025, accent, 0.52);
      for (let branch = -2; branch <= 2; branch += 1) {
        const branchX = x(branch * 0.2 - 0.08);
        graphics.lineBetween(branchX, y(0.66), branchX + branch * radius * 0.035, y(-0.3));
        graphics.lineBetween(branchX, y(0.16), branchX - radius * 0.13, y(-0.03));
        graphics.lineBetween(branchX, y(-0.04), branchX + radius * 0.15, y(-0.29));
      }
      break;
    case 'wreckage':
      graphics.strokeTriangle(x(-0.62), y(-0.22), x(-0.12), y(-0.55), x(0.08), y(0.02));
      graphics.strokeTriangle(x(-0.24), y(0.18), x(0.38), y(-0.12), x(0.54), y(0.42));
      graphics.lineBetween(x(-0.58), y(0.48), x(0.42), y(-0.48));
      break;
    case 'cathedral':
      graphics.lineStyle(radius * 0.015, accent, 0.5);
      for (let arch = -2; arch <= 2; arch += 1) {
        const archX = x(-0.48 + arch * 0.23);
        graphics.lineBetween(archX, y(0.58), archX, y(-0.18));
        graphics.lineBetween(archX, y(-0.18), archX + radius * 0.115, y(-0.46));
        graphics.lineBetween(archX + radius * 0.115, y(-0.46), archX + radius * 0.23, y(-0.18));
      }
      break;
    case 'eclipse':
      graphics.lineStyle(radius * 0.02, accent, 0.54);
      graphics.strokeEllipse(x(-0.1), y(-0.04), radius * 1.02, radius * 0.78);
      graphics.fillStyle(0x03040a, 0.72);
      graphics.fillCircle(x(0.08), y(-0.08), radius * 0.38);
      break;
    case 'hive':
      graphics.lineStyle(radius * 0.014, accent, 0.48);
      for (let row = -1; row <= 1; row += 1) {
        for (let column = -2; column <= 1; column += 1) {
          drawHexagon(graphics, x(column * 0.25 + (row % 2) * 0.12), y(row * 0.23), radius * 0.14);
        }
      }
      break;
    case 'singularity':
      graphics.lineStyle(radius * 0.014, accent, 0.56);
      for (let ring = 0; ring < 4; ring += 1) {
        graphics.strokeEllipse(x(-0.05), y(-0.03), radius * (0.3 + ring * 0.25), radius * (0.22 + ring * 0.18));
      }
      graphics.fillStyle(0x000005, 0.92);
      graphics.fillCircle(x(-0.05), y(-0.03), radius * 0.19);
      graphics.fillStyle(primary, 0.8);
      graphics.fillCircle(x(-0.11), y(-0.09), radius * 0.025);
      break;
  }
}

function drawOrbitalRingHalf(
  graphics: Phaser.GameObjects.Graphics,
  centerX: number,
  centerY: number,
  radius: number,
  color: number,
  front: boolean,
  singularity: boolean
): void {
  const start = front ? 0 : Math.PI;
  const end = front ? Math.PI : Math.PI * 2;
  const drawArc = (widthScale: number, heightScale: number): void => {
    const segments = 28;
    for (let index = 0; index < segments; index += 1) {
      const from = start + (end - start) * index / segments;
      const to = start + (end - start) * (index + 1) / segments;
      graphics.lineBetween(
        centerX + Math.cos(from) * radius * widthScale,
        centerY + radius * 0.03 + Math.sin(from) * radius * heightScale,
        centerX + Math.cos(to) * radius * widthScale,
        centerY + radius * 0.03 + Math.sin(to) * radius * heightScale
      );
    }
  };
  graphics.lineStyle(singularity ? radius * 0.07 : radius * 0.045, color, front ? 0.58 : 0.22);
  drawArc(1.31, 0.36);
  graphics.lineStyle(Math.max(1, radius * 0.012), 0xffffff, front ? 0.54 : 0.18);
  drawArc(1.3, 0.34);
}

function drawNightLights(
  graphics: Phaser.GameObjects.Graphics,
  level: number,
  centerX: number,
  centerY: number,
  radius: number,
  accent: number,
  motif: PlanetIntermissionMotif
): void {
  if (!['clockwork', 'wreckage', 'cathedral', 'hive', 'singularity'].includes(motif)) return;
  for (let index = 0; index < 8; index += 1) {
    const px = centerX + radius * (0.28 + ((index * 37 + level * 11) % 42) / 100);
    const py = centerY + radius * (-0.48 + ((index * 53 + level * 17) % 88) / 100);
    const dx = px - centerX;
    const dy = py - centerY;
    if (dx * dx + dy * dy > radius * radius * 0.78) continue;
    drawSoftCircle(graphics, px, py, radius * 0.035, accent, 0.18, 2);
    graphics.fillStyle(index % 3 === 0 ? 0xffffff : accent, 0.82);
    graphics.fillCircle(px, py, radius * (index % 3 === 0 ? 0.011 : 0.008));
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
  const centerX = PLANET_TEXTURE_CENTER;
  const centerY = PLANET_TEXTURE_CENTER;
  const radius = PLANET_RADIUS;

  drawSoftCircle(graphics, centerX, centerY, radius + 62, palette[1], 0.035, 10);
  drawSoftCircle(graphics, centerX, centerY, radius + 25, palette[0], 0.055, 9);

  if (profile.motif === 'eclipse' || profile.motif === 'singularity') {
    drawOrbitalRingHalf(graphics, centerX, centerY, radius, palette[1], false, profile.motif === 'singularity');
  }

  const shadowColor = mixColor(palette[0], 0x01040b, 0.78);
  const bodyColor = mixColor(palette[0], 0x07111d, 0.28);
  graphics.fillStyle(shadowColor, 1);
  graphics.fillCircle(centerX, centerY, radius);
  drawSoftCircle(graphics, centerX - radius * 0.24, centerY - radius * 0.18, radius * 0.93, bodyColor, 0.11, 8);
  drawSoftCircle(graphics, centerX - radius * 0.43, centerY - radius * 0.4, radius * 0.66, palette[0], 0.12, 7);
  drawSoftCircle(graphics, centerX - radius * 0.52, centerY - radius * 0.52, radius * 0.35, mixColor(palette[1], 0xffffff, 0.35), 0.055, 5);

  drawPlanetMotif(graphics, profile.motif, centerX, centerY, radius, palette[0], palette[1]);

  // Reapply a soft terminator over the surface marks so authored geography
  // inherits the sphere's light instead of reading as a screen-space decal.
  drawSoftCircle(
    graphics,
    centerX + radius * 0.72,
    centerY + radius * 0.2,
    radius * 0.78,
    shadowColor,
    0.055,
    9
  );

  drawNightLights(graphics, level, centerX, centerY, radius, palette[1], profile.motif);
  graphics.lineStyle(radius * 0.045, palette[1], 0.1);
  graphics.strokeCircle(centerX, centerY, radius + 3);
  const rimSegments = [
    { start: 0.72, end: 0.98, alpha: 0.22, width: 0.014 },
    { start: 0.96, end: 1.22, alpha: 0.58, width: 0.02 },
    { start: 1.2, end: 1.48, alpha: 0.92, width: 0.028 },
    { start: 1.46, end: 1.68, alpha: 0.36, width: 0.016 },
  ];
  for (const segment of rimSegments) {
    graphics.lineStyle(radius * segment.width, palette[1], segment.alpha);
    graphics.arc(centerX, centerY, radius, Math.PI * segment.start, Math.PI * segment.end, false);
  }
  graphics.lineStyle(Math.max(1, radius * 0.009), 0xffffff, 0.7);
  graphics.arc(centerX, centerY, radius - 2, Math.PI * 0.83, Math.PI * 1.34, false);
  graphics.fillStyle(0xffffff, 0.95);
  graphics.fillCircle(centerX - radius * 0.69, centerY - radius * 0.69, radius * 0.018);

  if (profile.motif === 'eclipse' || profile.motif === 'singularity') {
    drawOrbitalRingHalf(graphics, centerX, centerY, radius, palette[1], true, profile.motif === 'singularity');
  }

  graphics.generateTexture(key, PLANET_TEXTURE_SIZE, PLANET_TEXTURE_SIZE);
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
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
    if (scene.textures.exists(textureKey)) scene.textures.remove(textureKey);
  });
  const halo = scene.add.ellipse(
    layout.planetX,
    layout.planetY,
    layout.planetDiameter * 1.12,
    layout.planetDiameter * 1.12,
    levelConfig.planetPalette[1],
    0.055
  ).setStrokeStyle(Math.max(2, layout.planetDiameter * 0.018), levelConfig.planetPalette[1], 0.16).setDepth(0);
  halo.setBlendMode(Phaser.BlendModes.ADD);
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
    .setDisplaySize(layout.planetDiameter * 1.43, layout.planetDiameter * 1.43)
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
    const targetScaleX = planet.scaleX;
    const targetScaleY = planet.scaleY;
    planet.setAlpha(0).setScale(targetScaleX * 0.92, targetScaleY * 0.92);
    scene.tweens.add({
      targets: planet,
      alpha: 1,
      scaleX: targetScaleX,
      scaleY: targetScaleY,
      duration: 650,
      ease: 'Sine.Out',
    });
    scene.tweens.add({
      targets: halo,
      alpha: { from: 0.55, to: 1 },
      scaleX: { from: 0.96, to: 1.035 },
      scaleY: { from: 0.96, to: 1.035 },
      duration: 4200 + level * 90,
      ease: 'Sine.InOut',
      yoyo: true,
      repeat: -1,
    });
    scene.tweens.add({
      targets: orbit,
      alpha: { from: 0.52, to: 0.9 },
      duration: 5200 + level * 70,
      ease: 'Sine.InOut',
      yoyo: true,
      repeat: -1,
    });
  }

  return planet;
}
