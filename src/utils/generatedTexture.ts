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
 * Paints same-sized frames side by side on one canvas texture, named by `frames`' keys. A sprite that
 * switches between them keeps its texture, so it keeps batching with its siblings and its size.
 */
export function withCanvasFrameStrip<Name extends string>(
  scene: Phaser.Scene,
  key: string,
  width: number,
  height: number,
  frames: Readonly<Record<Name, (context: CanvasRenderingContext2D, width: number, height: number) => void>>,
  density = 1
): string {
  if (scene.textures.exists(key)) return key;
  const names = Object.keys(frames) as Name[];
  withCanvasTexture(
    scene,
    key,
    width * names.length,
    height,
    (context) =>
      names.forEach((name, index) => {
        context.save();
        context.translate(index * width, 0);
        // A glow never bleeds into the neighbouring frame.
        context.beginPath();
        context.rect(0, 0, width, height);
        context.clip();
        frames[name](context, width, height);
        context.restore();
      }),
    density
  );
  const texture = scene.textures.get(key);
  const cuts = names.map((name, index) => {
    const frame = texture.add(name, 0, index * width * density, 0, width * density, height * density);
    if (!frame) throw new Error(`Unable to cut frame ${name} of ${key}`);
    return frame;
  });
  setLogicalFrameSize(texture, density, width, height, cuts);
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
