import Phaser from 'phaser';

import type { LevelConfig } from '../../config/LevelsConfig';
import { getPremiumBackgroundManifest } from '../../systems/parallax/premiumBackgroundManifest';
import { getViewportLayout } from '../../utils/layout';
import { UI_FONT_MONO } from '../../utils/uiFonts';
import type { IntermissionLayoutMetrics } from './presentation';
import { getPlanetPortraitKey } from './planetPortraits';
import type { PlanetIntermissionProfile } from './planetProfiles';

function drawBackgroundStars(
  graphics: Phaser.GameObjects.Graphics,
  level: number,
  left: number,
  top: number,
  width: number,
  height: number,
  accent: number
): void {
  for (let index = 0; index < 54; index += 1) {
    const x = left + ((index * 137 + level * 83) % width);
    const y = top + ((index * 71 + level * 47) % height);
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

  if (manifest) {
    const backdropLayers = manifest.runtimeLayers.filter((layer) => scene.textures.exists(layer.key));
    backdropLayers.forEach((layer, index) => {
      scene.add
        .image(viewport.centerX, viewport.centerY, layer.key)
        .setDisplaySize(viewport.width, viewport.height)
        .setAlpha((layout.mode === 'desktop' ? 0.43 : 0.34) * (index === 0 ? 1 : 0.72))
        .setBlendMode(layer.blendMode ?? Phaser.BlendModes.NORMAL)
        .setDepth(-12 + index);
    });
  }

  const backdrop = scene.add.graphics().setDepth(-9);
  backdrop.fillStyle(0x01040b, layout.mode === 'portrait' ? 0.52 : 0.4);
  backdrop.fillRect(viewport.left, viewport.top, viewport.width, viewport.height);
  drawBackgroundStars(
    backdrop,
    level,
    viewport.left,
    viewport.top,
    viewport.width,
    viewport.height,
    levelConfig.planetPalette[1]
  );

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

/**
 * Compose the planet arrival cinematic around the level's authored raster
 * portrait (see planetPortraits.ts). The portrait texture is queued by the
 * boot preload and again by the intermission's own preload, so it is normally
 * cached before create runs; if the asset itself failed to load, the neon
 * chrome (halo, orbit, route, satellites, labels) still renders and the
 * planet body is skipped rather than showing a missing-texture placeholder.
 *
 * Portraits stay in the global texture cache after boot. Keeping this small,
 * fixed campaign set avoids remove/reload races when a resize restarts the scene.
 */
export function createPlanetArrivalVisual(
  scene: Phaser.Scene,
  levelConfig: LevelConfig,
  level: number,
  profile: PlanetIntermissionProfile,
  layout: IntermissionLayoutMetrics
): Phaser.GameObjects.Image | null {
  const textureKey = getPlanetPortraitKey(level);
  const hasPortrait = scene.textures.exists(textureKey);

  if (!hasPortrait) {
    console.warn(
      `[planetIntermission] Planet portrait "${textureKey}" is not loaded; rendering the arrival chrome without the planet body.`
    );
  }

  const halo = scene.add
    .ellipse(
      layout.planetX,
      layout.planetY,
      layout.planetDiameter * 1.12,
      layout.planetDiameter * 1.12,
      levelConfig.planetPalette[1],
      0.055
    )
    .setStrokeStyle(Math.max(2, layout.planetDiameter * 0.018), levelConfig.planetPalette[1], 0.16)
    .setDepth(0);
  halo.setBlendMode(Phaser.BlendModes.ADD);
  const orbit = scene.add
    .ellipse(layout.planetX, layout.planetY, layout.planetDiameter * 1.34, layout.planetDiameter * 0.52)
    .setStrokeStyle(1, levelConfig.planetPalette[1], 0.42)
    .setAngle(profile.orbitTilt)
    .setDepth(0);
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

  // Portraits use a 1024px source while preserving the historical composition
  // footprint, so large desktop presentation stays crisp without layout drift.
  const planet = hasPortrait
    ? scene.add
        .image(layout.planetX, layout.planetY, textureKey)
        .setDisplaySize(layout.planetDiameter * 1.43, layout.planetDiameter * 1.43)
        .setDepth(1)
    : null;

  if (layout.showOrbitLabels) {
    scene.add
      .text(
        layout.planetX - layout.planetDiameter * 0.52,
        layout.planetY - layout.planetDiameter * 0.63,
        profile.classification,
        {
          fontSize: layout.mode === 'desktop' ? '11px' : '9px',
          color: '#8eb2c8',
          fontFamily: UI_FONT_MONO,
        }
      )
      .setOrigin(0, 0.5)
      .setDepth(3);

    scene.add
      .text(
        layout.planetX,
        layout.planetY + layout.planetDiameter * 0.67,
        `ORBIT ${String(level).padStart(2, '0')}  ·  ${profile.approachCode}`,
        {
          fontSize: layout.mode === 'desktop' ? '11px' : '9px',
          color: '#6f93aa',
          fontFamily: UI_FONT_MONO,
        }
      )
      .setOrigin(0.5)
      .setDepth(3);
  }

  const reducedMotion =
    typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  if (!reducedMotion) {
    if (planet) {
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
    }
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
