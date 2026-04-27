import Phaser from 'phaser';
import type { LevelConfig } from '../../config/LevelsConfig';
import { mixColor } from '../../utils/colorUtils';

export interface ForegroundSilhouetteState {
  sprite: Phaser.GameObjects.Image;
  textureKey: string;
  ownsTexture: boolean;
  baseX: number;
  baseY: number;
  driftX: number;
  driftY: number;
  phase: number;
  alpha: number;
}

interface ForegroundSilhouetteSpec {
  edge: 'left' | 'right';
  w: number;
  h: number;
  y: number;
}

interface ViewportSize {
  width: number;
  height: number;
}

export function createForegroundSilhouettes(
  scene: Phaser.Scene,
  config: LevelConfig,
  viewport: ViewportSize,
  silhouettes: ForegroundSilhouetteState[]
): void {
  const silhouetteColor = mixColor(config.accentColor, 0x000000, 0.82);
  const { width, height } = viewport;
  const specs: ForegroundSilhouetteSpec[] = [
    { edge: 'left', w: 110, h: height * 0.62, y: height * 0.56 },
    { edge: 'right', w: 128, h: height * 0.68, y: height * 0.54 },
  ];

  for (const spec of specs) {
    const textureKey = `foreground-silhouette-${spec.edge}-${Math.round(spec.w)}x${Math.round(spec.h)}-${config.accentColor.toString(16)}`;

    const textureExists = scene.textures.exists(textureKey);

    if (!textureExists) {
      const g = scene.add.graphics();
      g.fillStyle(silhouetteColor, 1);

      if (spec.edge === 'left') {
        g.beginPath();
        g.moveTo(0, spec.h);
        g.lineTo(spec.w * 0.22, spec.h * 0.12);
        g.lineTo(spec.w * 0.48, spec.h * 0.34);
        g.lineTo(spec.w * 0.65, spec.h * 0.18);
        g.lineTo(spec.w * 0.82, spec.h * 0.42);
        g.lineTo(spec.w, spec.h * 0.5);
        g.lineTo(spec.w, spec.h);
        g.closePath();
        g.fillPath();
      } else {
        g.beginPath();
        g.moveTo(0, spec.h * 0.5);
        g.lineTo(spec.w * 0.18, spec.h * 0.42);
        g.lineTo(spec.w * 0.35, spec.h * 0.14);
        g.lineTo(spec.w * 0.58, spec.h * 0.3);
        g.lineTo(spec.w * 0.82, spec.h * 0.08);
        g.lineTo(spec.w, spec.h);
        g.lineTo(0, spec.h);
        g.closePath();
        g.fillPath();
      }

      g.generateTexture(textureKey, Math.ceil(spec.w), Math.ceil(spec.h));
      g.destroy();
    }

    const x = spec.edge === 'left' ? spec.w * 0.5 : width - spec.w * 0.5;
    const sprite = scene.add.image(x, spec.y, textureKey);
    sprite.setDepth(-1);
    sprite.setAlpha(0.09);
    silhouettes.push({
      sprite,
      textureKey,
      ownsTexture: !textureExists,
      baseX: x,
      baseY: spec.y,
      driftX: spec.edge === 'left' ? 6 : -8,
      driftY: 4,
      phase: Phaser.Math.FloatBetween(0, Math.PI * 2),
      alpha: 0.09,
    });
  }
}

export function destroyForegroundSilhouettes(
  scene: Phaser.Scene | null,
  silhouettes: ForegroundSilhouetteState[]
): void {
  for (const silhouette of silhouettes) {
    silhouette.sprite.destroy();

    if (silhouette.ownsTexture && scene?.textures.exists(silhouette.textureKey)) {
      scene.textures.remove(silhouette.textureKey);
    }
  }
  silhouettes.length = 0;
}
