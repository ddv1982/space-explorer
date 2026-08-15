import Phaser from 'phaser';

import { getVisualQualityProfile } from '../config/visualQuality';

interface GeneratedTextureOptions {
  resolution?: number;
}

interface MutableFrameData {
  sourceSize: { w: number; h: number };
  spriteSourceSize: { w: number; h: number; r: number; b: number };
  radius: number;
}

function restoreLogicalFrameSize(
  scene: Phaser.Scene,
  key: string,
  width: number,
  height: number,
  resolution: number
): void {
  const texture = scene.textures.get(key);
  const frame = texture.get();
  frame.source.resolution = resolution;

  // Phaser renders high-density texture sources at cutSize / resolution, but
  // Size and Arcade Physics read Frame.realWidth/realHeight. Keep that logical
  // metadata at the authored dimensions so supersampling cannot alter bodies,
  // origins, display footprints, or any gameplay geometry.
  const data = (frame as Phaser.Textures.Frame & { data: MutableFrameData }).data;
  data.sourceSize.w = width;
  data.sourceSize.h = height;
  data.spriteSourceSize.w = width;
  data.spriteSourceSize.h = height;
  data.spriteSourceSize.r = width;
  data.spriteSourceSize.b = height;
  data.radius = 0.5 * Math.sqrt(width * width + height * height);
}

export function withGeneratedTexture(
  scene: Phaser.Scene,
  key: string,
  width: number,
  height: number,
  draw: (graphics: Phaser.GameObjects.Graphics) => void,
  options: GeneratedTextureOptions = {}
): string {
  if (scene.textures.exists(key)) {
    return key;
  }

  const resolution = Math.max(1, Math.floor(options.resolution ?? 1));
  const graphics = scene.add.graphics();
  if (resolution > 1) {
    graphics.setScale(resolution);
  }
  draw(graphics);
  graphics.generateTexture(key, width * resolution, height * resolution);
  graphics.destroy();

  if (resolution > 1) {
    restoreLogicalFrameSize(scene, key, width, height, resolution);
  }

  return key;
}

export function withGeneratedEntityTexture(
  scene: Phaser.Scene,
  key: string,
  width: number,
  height: number,
  draw: (graphics: Phaser.GameObjects.Graphics) => void
): string {
  return withGeneratedTexture(scene, key, width, height, draw, {
    resolution: getVisualQualityProfile().entityTextureResolution,
  });
}

export function withGeneratedParticleTexture(
  scene: Phaser.Scene,
  key: string,
  width: number,
  height: number,
  draw: (graphics: Phaser.GameObjects.Graphics) => void
): string {
  return withGeneratedTexture(scene, key, width, height, draw, {
    resolution: getVisualQualityProfile().particleTextureResolution,
  });
}
