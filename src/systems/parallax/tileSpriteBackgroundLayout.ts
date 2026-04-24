import Phaser from 'phaser';

interface ViewportSize {
  width: number;
  height: number;
}

interface HeightCoverRepeatLayoutOptions {
  scrollOffsetY?: number;
  minTileScale?: number;
}

const DEFAULT_MIN_TILE_SCALE = 0.35;

export function layoutViewportTileSprite(
  sprite: Phaser.GameObjects.TileSprite,
  viewport: ViewportSize
): { width: number; height: number } {
  const width = Math.ceil(viewport.width);
  const height = Math.ceil(viewport.height);

  sprite.setPosition(width / 2, height / 2);
  sprite.setSize(width, height);
  sprite.setDisplaySize(width, height);

  return { width, height };
}

export function applyHeightCoverRepeatLayout(
  sprite: Phaser.GameObjects.TileSprite,
  viewport: ViewportSize,
  options: HeightCoverRepeatLayoutOptions = {}
): void {
  const size = layoutViewportTileSprite(sprite, viewport);
  const tileScale = getHeightCoverRepeatScale(sprite, size.height, options.minTileScale);

  sprite.setTileScale(tileScale, tileScale);
  sprite.setTilePosition(
    getCenteredTileOffset(sprite.frame.width, size.width, tileScale),
    getHeightCoverRepeatTilePositionY(sprite, size.height, tileScale, options.scrollOffsetY ?? 0)
  );
}

export function getHeightCoverRepeatTilePositionY(
  sprite: Phaser.GameObjects.TileSprite,
  viewportHeight: number,
  tileScale: number,
  scrollOffsetY: number
): number {
  return getCenteredTileOffset(sprite.frame.height, Math.ceil(viewportHeight), tileScale) + scrollOffsetY;
}

function getHeightCoverRepeatScale(
  sprite: Phaser.GameObjects.TileSprite,
  viewportHeight: number,
  minTileScale = DEFAULT_MIN_TILE_SCALE
): number {
  const frameHeight = Math.max(1, sprite.frame.height);

  // Phaser TileSprites are intended for seamless repeating textures. Keep the
  // GameObject viewport-sized, scale one tile to cover the height, then let the
  // texture repeat horizontally on wide or maximized screens.
  return Math.max(Math.ceil(viewportHeight) / frameHeight, minTileScale);
}

function getCenteredTileOffset(frameSize: number, viewportSize: number, tileScale: number): number {
  const safeFrameSize = Math.max(1, frameSize);
  const visibleTextureSize = viewportSize / Math.max(tileScale, 0.001);

  if (visibleTextureSize >= safeFrameSize) {
    return 0;
  }

  return (safeFrameSize - visibleTextureSize) / 2;
}
