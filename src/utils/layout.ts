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

export function getViewportBounds(scene: Phaser.Scene): ViewportLayout {
  const viewport = scene.scale.getViewPort();
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

/** Stereo position for a world x: -0.7 at the left edge to 0.7 at the right, so nothing pans hard. */
export function stereoPan(scene: Phaser.Scene, x: number): number {
  const viewport = scene.scale.getViewPort();
  if (!(viewport.width > 0)) return 0;
  return Math.min(1, Math.max(-1, ((x - viewport.x) / viewport.width) * 2 - 1)) * 0.7;
}

export function getViewportLayout(scene: Phaser.Scene): ViewportLayout {
  return getViewportBounds(scene);
}

export function centerHorizontally(layout: Pick<ViewportLayout, 'left' | 'width'>, width: number): number {
  return layout.left + (layout.width - width) / 2;
}
