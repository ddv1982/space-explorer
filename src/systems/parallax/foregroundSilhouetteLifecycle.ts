import Phaser from 'phaser';
import type { LevelConfig } from '../../config/LevelsConfig';

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

interface ViewportSize {
  width: number;
  height: number;
}

export function createForegroundSilhouettes(
  _scene: Phaser.Scene,
  _config: LevelConfig,
  _viewport: ViewportSize,
  _silhouettes: ForegroundSilhouetteState[]
): void {}

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
