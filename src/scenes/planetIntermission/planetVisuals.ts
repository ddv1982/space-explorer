import Phaser from 'phaser';

import type { LevelConfig } from '../../config/LevelsConfig';
import { getViewportLayout } from '../../utils/layout';
import { colorToHexString, mixColor } from '../../utils/colorUtils';
import { withCanvasTexture } from '../../utils/generatedTexture';
import { scaleUiGlowAlpha } from '../../utils/renderingCompat';
import { neonLabelStyle, prefersReducedMotion } from '../shared/neonUiTheme';
import type { IntermissionLayoutMetrics } from './layout';
import { getPlanetPortraitKey } from './planetPortraits';
import type { PlanetIntermissionProfile } from './planetProfiles';

const ATMOSPHERE_TEXTURE_KEY = 'intermission-atmosphere';
/** Share of the atmosphere texture's radius that the planet's limb sits at. */
const ATMOSPHERE_LIMB = 0.44;

/**
 * White radial falloff, painted once and tinted per world: brightest where it meets the planet's limb,
 * fading to nothing, so the portrait sits in scattered light instead of on flat black.
 */
function ensureAtmosphereTexture(scene: Phaser.Scene): string {
  return withCanvasTexture(scene, ATMOSPHERE_TEXTURE_KEY, 256, 256, (context, width, height) => {
    const gradient = context.createRadialGradient(width / 2, height / 2, 0, width / 2, height / 2, width / 2);
    gradient.addColorStop(0, 'rgba(255,255,255,0.55)');
    gradient.addColorStop(ATMOSPHERE_LIMB, 'rgba(255,255,255,0.55)');
    gradient.addColorStop(0.58, 'rgba(255,255,255,0.2)');
    gradient.addColorStop(0.78, 'rgba(255,255,255,0.06)');
    gradient.addColorStop(1, 'rgba(255,255,255,0)');
    context.fillStyle = gradient;
    context.fillRect(0, 0, width, height);
  });
}

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
  frame.lineStyle(1, levelConfig.planetPalette[1], 0.07);
  const verticalSpacing = layout.mode === 'desktop' ? 84 : 58;
  for (let y = viewport.top + verticalSpacing; y < viewport.bottom; y += verticalSpacing) {
    frame.lineBetween(viewport.left, y, viewport.right, y);
  }
  frame.lineStyle(1, levelConfig.planetPalette[0], 0.045);
  const horizontalSpacing = layout.mode === 'desktop' ? 96 : 72;
  for (let x = viewport.left + horizontalSpacing; x < viewport.right; x += horizontalSpacing) {
    frame.lineBetween(x, viewport.top, x, viewport.bottom);
  }
}

/** Classification tag above the planet and the orbit caption below it. */
function addOrbitLabels(
  scene: Phaser.Scene,
  marks: Phaser.GameObjects.Graphics,
  level: number,
  profile: PlanetIntermissionProfile,
  layout: IntermissionLayoutMetrics,
  accent: number
): void {
  const desktop = layout.mode === 'desktop';
  const labelX = layout.planetX - layout.planetDiameter * 0.52;
  const labelY = layout.planetY - layout.planetDiameter * 0.66;
  marks.fillStyle(accent, 0.9);
  marks.fillRect(labelX - 10, labelY - 6, 3, 12);
  scene.add
    .text(
      labelX,
      labelY,
      profile.classification,
      neonLabelStyle(desktop ? 13 : 11, colorToHexString(mixColor(accent, 0xffffff, 0.45)), desktop ? 2.2 : 1.4)
    )
    .setOrigin(0, 0.5)
    .setDepth(3);

  scene.add
    .text(
      layout.planetX,
      layout.planetY + layout.planetDiameter * 0.7,
      `ORBIT ${String(level).padStart(2, '0')}  ·  ${profile.approachCode}`,
      neonLabelStyle(desktop ? 13 : 11, '#86a8be', desktop ? 2.2 : 1.4)
    )
    .setOrigin(0.5)
    .setDepth(3);
}

interface ArrivalParts {
  planet: Phaser.GameObjects.Image | null;
  atmosphere: Phaser.GameObjects.Image;
  halo: Phaser.GameObjects.Ellipse;
  orbits: Phaser.GameObjects.Ellipse[];
}

/** Planet eases in once; atmosphere, halo and orbits breathe for as long as the scene lives. */
function animateArrival(scene: Phaser.Scene, level: number, { planet, atmosphere, halo, orbits }: ArrivalParts): void {
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
    targets: atmosphere,
    alpha: { from: atmosphere.alpha * 0.72, to: atmosphere.alpha },
    duration: 4200 + level * 90,
    ease: 'Sine.InOut',
    yoyo: true,
    repeat: -1,
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
    targets: orbits,
    alpha: { from: 0.52, to: 0.9 },
    duration: 5200 + level * 70,
    ease: 'Sine.InOut',
    yoyo: true,
    repeat: -1,
  });
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

  const accent = levelConfig.planetPalette[1];
  const atmosphere = scene.add
    .image(layout.planetX, layout.planetY, ensureAtmosphereTexture(scene))
    .setDisplaySize(layout.planetDiameter / ATMOSPHERE_LIMB, layout.planetDiameter / ATMOSPHERE_LIMB)
    .setTint(accent)
    .setBlendMode(Phaser.BlendModes.ADD)
    .setAlpha(scaleUiGlowAlpha(0.7))
    .setDepth(0);
  const halo = scene.add
    .ellipse(layout.planetX, layout.planetY, layout.planetDiameter * 1.12, layout.planetDiameter * 1.12)
    .setStrokeStyle(Math.max(1.5, layout.planetDiameter * 0.008), accent, 0.3)
    .setDepth(0);
  halo.setBlendMode(Phaser.BlendModes.ADD);
  const orbit = scene.add
    .ellipse(layout.planetX, layout.planetY, layout.planetDiameter * 1.34, layout.planetDiameter * 0.52)
    .setStrokeStyle(1.5, accent, 0.5)
    .setAngle(profile.orbitTilt)
    .setDepth(0);
  orbit.setBlendMode(Phaser.BlendModes.ADD);
  const outerOrbit = scene.add
    .ellipse(layout.planetX, layout.planetY, layout.planetDiameter * 1.62, layout.planetDiameter * 0.66)
    .setStrokeStyle(1, accent, 0.2)
    .setAngle(profile.orbitTilt)
    .setDepth(0);
  outerOrbit.setBlendMode(Phaser.BlendModes.ADD);

  const route = scene.add.graphics().setDepth(2);
  const routeStartX = layout.planetX - layout.planetDiameter * 0.58;
  const routeStartY = layout.planetY + layout.planetDiameter * 0.46;
  const routeEndX = layout.planetX - layout.planetDiameter * 0.22;
  const routeEndY = layout.planetY + layout.planetDiameter * 0.29;
  route.lineStyle(1, accent, 0.55);
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

  if (layout.showOrbitLabels) addOrbitLabels(scene, route, level, profile, layout, accent);
  if (!prefersReducedMotion()) animateArrival(scene, level, { planet, atmosphere, halo, orbits: [orbit, outerOrbit] });

  return planet;
}
