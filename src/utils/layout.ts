import Phaser from 'phaser';

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

export function getViewportLayout(scene: Phaser.Scene): ViewportLayout {
  const { x: left, y: top, width, height } = scene.cameras.main;

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

export function centerHorizontally(layout: Pick<ViewportLayout, 'left' | 'width'>, width: number): number {
  return layout.left + (layout.width - width) / 2;
}
