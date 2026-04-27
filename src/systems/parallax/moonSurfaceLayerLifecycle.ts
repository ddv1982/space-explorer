import Phaser from 'phaser';
import type { LevelConfig } from '../../config/LevelsConfig';
import { generateMoonSurfaceTexture } from './moonSurfaceGenerator';

const MOON_SURFACE_MIN_MOTION_SPEED = 0.00005;
const MOON_SURFACE_MOTION_SPEED_SCALE = 0.0015;
const MOON_SURFACE_BASE_AMPLITUDE = 10;
const MOON_SURFACE_AMPLITUDE_SCALE = 80;

export interface MoonSurfaceState {
  sprite: Phaser.GameObjects.Image;
  textureKey: string;
  baseX: number;
  baseY: number;
  baseAlpha: number;
  motionSpeed: number;
  motionAmplitude: number;
}

export function createMoonSurfaceLayer(
  scene: Phaser.Scene,
  config: LevelConfig,
  viewport: { width: number; height: number }
): MoonSurfaceState | null {
  if (!config.moonSurface) {
    return null;
  }

  const moonSurfaceConfig = config.moonSurface;
  const width = Math.ceil(viewport.width + 300);
  const height = Math.ceil(viewport.height + 100);
  const textureKey = `moon-surface-${moonSurfaceConfig.surfaceColor.toString(16)}-${moonSurfaceConfig.accentColor.toString(16)}-${width}x${height}-v1`;

  if (!scene.textures.exists(textureKey)) {
    generateMoonSurfaceTexture(scene, textureKey, width, height, moonSurfaceConfig);
  }

  const centerX = viewport.width / 2;
  const baseY = viewport.height * 0.75;
  const sprite = scene.add.image(centerX, baseY, textureKey);
  sprite.setDepth(-3);
  sprite.setAlpha(0.45);

  return {
    sprite,
    textureKey,
    baseX: centerX,
    baseY,
    baseAlpha: 0.45,
    motionSpeed: Math.max(
      MOON_SURFACE_MIN_MOTION_SPEED,
      moonSurfaceConfig.scrollSpeed * MOON_SURFACE_MOTION_SPEED_SCALE
    ),
    motionAmplitude:
      MOON_SURFACE_BASE_AMPLITUDE + moonSurfaceConfig.scrollSpeed * MOON_SURFACE_AMPLITUDE_SCALE,
  };
}

export function layoutMoonSurfaceLayer(
  moonSurface: MoonSurfaceState | null,
  viewport: { width: number; height: number }
): void {
  if (!moonSurface) {
    return;
  }

  const centerX = viewport.width / 2;
  const baseY = viewport.height * 0.75;
  moonSurface.baseX = centerX;
  moonSurface.baseY = baseY;
  moonSurface.sprite.setPosition(centerX, baseY);
}

export function destroyMoonSurfaceLayer(
  scene: Phaser.Scene | null,
  moonSurface: MoonSurfaceState | null
): MoonSurfaceState | null {
  if (!moonSurface) {
    return null;
  }

  moonSurface.sprite.destroy();

  if (scene?.textures.exists(moonSurface.textureKey)) {
    scene.textures.remove(moonSurface.textureKey);
  }

  return null;
}
