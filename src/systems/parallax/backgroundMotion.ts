import Phaser from 'phaser';
import { SCROLL_SPEED } from '../../utils/constants';

interface TileSpriteScrollConfig {
  scrollSpeed: number;
}

interface ScenicMotionState {
  sprite: Phaser.GameObjects.Image;
  baseX: number;
  baseY: number;
  baseAlpha: number;
  driftX: number;
  driftY: number;
  speed: number;
  phase: number;
}

interface PlanetMotionState {
  sprite: Phaser.GameObjects.Image;
  baseX: number;
  baseY: number;
  baseAlpha: number;
}

interface DebrisMotionState {
  sprite: Phaser.GameObjects.Image;
  baseX: number;
  baseY: number;
  baseAlpha: number;
  speed: number;
  driftX: number;
  driftY: number;
  phase: number;
  rotSpeed: number;
}

interface TwinkleMotionState {
  sprite: Phaser.GameObjects.Image;
  phase: number;
  speed: number;
  baseMinAlpha: number;
  baseMaxAlpha: number;
}

interface MoonSurfaceMotionState {
  sprite: Phaser.GameObjects.Image;
  baseX: number;
  baseY: number;
  baseAlpha: number;
  motionSpeed: number;
  motionAmplitude: number;
}

interface PassingPlanetMotionState {
  sprite: Phaser.GameObjects.Image;
  scrollSpeed: number;
  baseY: number;
  baseAlpha: number;
}

interface ForegroundSilhouetteMotionState {
  sprite: Phaser.GameObjects.Image;
  baseX: number;
  baseY: number;
  driftX: number;
  driftY: number;
  phase: number;
  alpha: number;
}

export function scrollStarLayers(
  tileSprites: Phaser.GameObjects.TileSprite[],
  layerConfigs: TileSpriteScrollConfig[],
  delta: number
): void {
  for (let i = 0; i < tileSprites.length; i++) {
    const speed = layerConfigs[i].scrollSpeed * SCROLL_SPEED * delta / 16;
    tileSprites[i].tilePositionY += speed;
  }
}

export function updateScenicLayerMotion(
  layers: ScenicMotionState[],
  elapsed: number,
  atmosphereDrift: number,
  atmosphereAlpha: number
): void {
  for (let i = 0; i < layers.length; i++) {
    const layer = layers[i];
    const phase = elapsed * layer.speed * atmosphereDrift + layer.phase;
    layer.sprite.x = layer.baseX + Math.sin(phase) * layer.driftX * atmosphereDrift;
    layer.sprite.y = layer.baseY + Math.cos(phase * 0.85) * layer.driftY * atmosphereDrift;
    layer.sprite.setAlpha(Phaser.Math.Clamp(layer.baseAlpha * atmosphereAlpha, 0.16, 0.95));
  }
}

export function updatePlanetLayerMotion(
  planetLayer: PlanetMotionState | null,
  elapsed: number,
  atmosphereAlpha: number,
  landmarkAlpha: number
): void {
  if (!planetLayer) {
    return;
  }

  const phase = elapsed * 0.00004;
  planetLayer.sprite.x = planetLayer.baseX + Math.sin(phase) * 30;
  planetLayer.sprite.y = planetLayer.baseY + Math.cos(phase * 0.6) * 15;
  planetLayer.sprite.setAlpha(
    Phaser.Math.Clamp(planetLayer.baseAlpha * (0.92 + (atmosphereAlpha - 1) * 0.6) * landmarkAlpha, 0.12, 0.4)
  );
}

export function updateDebrisMoteMotion(
  motes: DebrisMotionState[],
  elapsed: number,
  delta: number,
  atmosphereAlpha: number
): void {
  for (let i = 0; i < motes.length; i++) {
    const mote = motes[i];
    const phase = elapsed * mote.speed + mote.phase;
    mote.sprite.x = mote.baseX + Math.sin(phase) * mote.driftX;
    mote.sprite.y = mote.baseY + Math.cos(phase * 0.7) * mote.driftY;
    mote.sprite.angle += mote.rotSpeed * delta / 16;
    mote.sprite.setAlpha(Phaser.Math.Clamp(mote.baseAlpha * atmosphereAlpha, 0.08, 0.45));
  }
}

export function updateTwinkleMotion(
  twinkles: TwinkleMotionState[],
  elapsed: number,
  atmosphereTwinkle: number
): void {
  for (let i = 0; i < twinkles.length; i++) {
    const twinkle = twinkles[i];
    const t = Math.sin(elapsed * twinkle.speed + twinkle.phase);
    const normalizedT = (t + 1) / 2;
    const minAlpha = twinkle.baseMinAlpha * atmosphereTwinkle;
    const maxAlpha = twinkle.baseMaxAlpha * atmosphereTwinkle;
    twinkle.sprite.setAlpha(minAlpha + normalizedT * (maxAlpha - minAlpha));
  }
}

export function updateMoonSurfaceMotion(
  moonSurface: MoonSurfaceMotionState | null,
  elapsed: number,
  atmosphereAlpha: number,
  landmarkAlpha: number
): void {
  if (!moonSurface) {
    return;
  }

  const phase = elapsed * moonSurface.motionSpeed;
  const scrollOffset = Math.sin(phase) * moonSurface.motionAmplitude;
  moonSurface.sprite.x = moonSurface.baseX + scrollOffset;
  moonSurface.sprite.y = moonSurface.baseY;
  moonSurface.sprite.setAlpha(
    Phaser.Math.Clamp(moonSurface.baseAlpha * (0.94 + (atmosphereAlpha - 1) * 0.5) * landmarkAlpha, 0.24, 0.62)
  );
}

export function updatePassingPlanetMotion(
  planets: PassingPlanetMotionState[],
  delta: number,
  atmosphereAlpha: number,
  landmarkAlpha: number,
  getOffscreenThreshold: (sprite: Phaser.GameObjects.Image) => number,
  resetPosition: (planet: PassingPlanetMotionState) => void
): void {
  for (let i = 0; i < planets.length; i++) {
    const planet = planets[i];
    planet.sprite.x -= planet.scrollSpeed * SCROLL_SPEED * delta / 16;
    planet.sprite.setAlpha(Phaser.Math.Clamp(planet.baseAlpha * atmosphereAlpha * landmarkAlpha, 0.05, 0.28));
    if (planet.sprite.x < getOffscreenThreshold(planet.sprite)) {
      resetPosition(planet);
    }
  }
}

export function updateForegroundSilhouetteMotion(
  silhouettes: ForegroundSilhouetteMotionState[],
  elapsed: number,
  landmarkAlpha: number
): void {
  for (let i = 0; i < silhouettes.length; i++) {
    const silhouette = silhouettes[i];
    const phase = elapsed * 0.00022 + silhouette.phase;
    silhouette.sprite.x = silhouette.baseX + Math.sin(phase) * silhouette.driftX;
    silhouette.sprite.y = silhouette.baseY + Math.cos(phase * 0.7) * silhouette.driftY;
    silhouette.sprite.setAlpha(Phaser.Math.Clamp(silhouette.alpha * landmarkAlpha, 0.04, 0.14));
  }
}
