import type Phaser from 'phaser';

export function getUiTextResolution(devicePixelRatio: number, compactViewport: boolean): number {
  return Math.max(1, Math.min(devicePixelRatio, compactViewport ? 1.5 : 2));
}

/** Supersample canvas-backed text while keeping the gameplay framebuffer lean. */
export function sharpenSceneText(scene: Phaser.Scene): void {
  const resolution = getUiTextResolution(
    typeof window === 'undefined' ? 1 : window.devicePixelRatio || 1,
    scene.scale.width < 720
  );

  for (const child of scene.children.list) {
    if (child.type !== 'Text') continue;

    const text = child as Phaser.GameObjects.Text;
    text.setPosition(Math.round(text.x), Math.round(text.y));
    text.setResolution(resolution);
  }
}
