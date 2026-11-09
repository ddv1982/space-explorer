import Phaser from 'phaser';

function cleanupWithoutMasking(cleanup: () => void, primaryOperationFailed: boolean): void {
  try {
    cleanup();
  } catch (error) {
    if (!primaryOperationFailed) throw error;
  }
}

/** Draws with a throwaway Graphics object and bakes it into a texture once per key. */
export function withGeneratedTexture(
  scene: Phaser.Scene,
  key: string,
  width: number,
  height: number,
  draw: (graphics: Phaser.GameObjects.Graphics) => void
): string {
  if (scene.textures.exists(key)) {
    return key;
  }

  const graphics = scene.add.graphics();
  let generationFailed = false;
  try {
    draw(graphics);
    graphics.generateTexture(key, width, height);
  } catch (error) {
    generationFailed = true;
    throw error;
  } finally {
    cleanupWithoutMasking(() => graphics.destroy(), generationFailed);
  }

  return key;
}

/**
 * Paints a texture with the Canvas 2D API (gradients, compositing) instead of Phaser Graphics. Used
 * for soft light — glows, fire, smoke, bolts — where stacked flat fills would band. `draw` works in
 * logical pixels; with `density` > 1 the canvas holds that many physical pixels per logical pixel and
 * the frame keeps its logical size, so small sprites stay crisp on high-DPI screens.
 *
 * The canvas is registered as a plain texture source, not a Phaser CanvasTexture: a CanvasTexture reads
 * every pixel back with getImageData, which stalls GPU-backed canvases (and software renderers) badly.
 */
export function withCanvasTexture(
  scene: Phaser.Scene,
  key: string,
  width: number,
  height: number,
  draw: (context: CanvasRenderingContext2D, width: number, height: number) => void,
  density = 1
): string {
  if (scene.textures.exists(key)) return key;
  const canvas = document.createElement('canvas');
  canvas.width = width * density;
  canvas.height = height * density;
  const context = canvas.getContext('2d');
  if (!context) throw new Error(`Unable to paint canvas texture: ${key}`);
  context.scale(density, density);
  draw(context, width, height);
  const texture = scene.textures.create(key, canvas, canvas.width, canvas.height);
  if (!texture) throw new Error(`Unable to register canvas texture: ${key}`);
  texture.add('__BASE', 0, 0, 0, canvas.width, canvas.height);
  if (density > 1) setLogicalFrameSize(texture, density, width, height);
  return key;
}

/**
 * Makes a texture authored at `density` physical pixels per logical pixel display and collide at its
 * logical size: Phaser draws the physical cut at source resolution while bounds use the trim.
 */
export function setLogicalFrameSize(
  texture: Phaser.Textures.Texture,
  density: number,
  width: number,
  height: number,
  frames: readonly Phaser.Textures.Frame[] = [texture.get()]
): void {
  for (const source of [...texture.source, ...texture.dataSource]) source.resolution = density;
  for (const frame of frames) frame.setTrim(width, height, 0, 0, width, height);
}
