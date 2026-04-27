import Phaser from 'phaser';
import { isPhoneSizedTouchViewport } from './device';

interface ViewportLayout {
  left: number;
  top: number;
  width: number;
  height: number;
  right: number;
  bottom: number;
  centerX: number;
  centerY: number;
}

const GAMEPLAY_WIDTH = 1280;
const GAMEPLAY_HEIGHT = 720;

export function getViewportBounds(
  scene: Phaser.Scene,
  camera?: Phaser.Cameras.Scene2D.Camera | null
): ViewportLayout {
  const viewport = camera ? scene.scale.getViewPort(camera) : scene.scale.getViewPort();
  const left = viewport.x;
  const top = viewport.y;
  const width = viewport.width;
  const height = viewport.height;

  return {
    left,
    top,
    width,
    height,
    right: left + width,
    bottom: top + height,
    centerX: left + width / 2,
    centerY: top + height / 2,
  };
}

export function getViewportLayout(
  scene: Phaser.Scene,
  camera?: Phaser.Cameras.Scene2D.Camera | null
): ViewportLayout {
  return getViewportBounds(scene, camera);
}

export function getGameplayBounds(): ViewportLayout {
  return {
    left: 0,
    top: 0,
    width: GAMEPLAY_WIDTH,
    height: GAMEPLAY_HEIGHT,
    right: GAMEPLAY_WIDTH,
    bottom: GAMEPLAY_HEIGHT,
    centerX: GAMEPLAY_WIDTH / 2,
    centerY: GAMEPLAY_HEIGHT / 2,
  };
}

export function getActiveGameplayBounds(scene: Phaser.Scene): ViewportLayout {
  return isPhoneSizedTouchViewport() ? getGameplayBounds() : getViewportBounds(scene);
}

export function centerHorizontally(layout: Pick<ViewportLayout, 'left' | 'width'>, width: number): number {
  return layout.left + (layout.width - width) / 2;
}
