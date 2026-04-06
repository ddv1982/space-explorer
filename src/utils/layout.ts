import Phaser from 'phaser';

export interface ViewportLayout {
  left: number;
  top: number;
  width: number;
  height: number;
  right: number;
  bottom: number;
  centerX: number;
  centerY: number;
}

export function getViewportBounds(scene: Phaser.Scene): ViewportLayout {
  const { x: left, y: top } = scene.cameras.main;
  const { width, height } = scene.scale.gameSize;

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

export function getViewportLayout(scene: Phaser.Scene): ViewportLayout {
  return getViewportBounds(scene);
}

export function centerHorizontally(layout: Pick<ViewportLayout, 'left' | 'width'>, width: number): number {
  return layout.left + (layout.width - width) / 2;
}
