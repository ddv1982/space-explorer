import Phaser from 'phaser';
import { setLogicalFrameSize } from './generatedTexture';
import { h, mountUiLayer, setStatus } from '../ui/dom';
import {
  SHIPYARD_SPRITES,
  SPRITE_DENSITY,
  restingFrame,
  sheetLayout,
  shipyardAssetUrl,
} from '../config/shipyardSprites';

export function queueShipyardAssets(scene: Phaser.Scene): void {
  for (const sprite of SHIPYARD_SPRITES) {
    if (scene.textures.exists(sprite.key)) continue;
    const layout = sheetLayout(sprite, SPRITE_DENSITY);
    scene.load.spritesheet({
      key: sprite.key,
      url: shipyardAssetUrl(sprite.file),
      normalMap: shipyardAssetUrl(sprite.file, true),
      frameConfig: { frameWidth: layout.frameWidth, frameHeight: layout.frameHeight },
    });
  }
}

/**
 * Validates every sheet and maps each frame to its logical size: Phaser renders the physical cut at
 * source density, while bounds and Arcade bodies use the logical trim dimensions.
 */
function registerShipyardFrames(scene: Phaser.Scene): boolean {
  let ready = true;
  for (const sprite of SHIPYARD_SPRITES) {
    if (!scene.textures.exists(sprite.key)) {
      ready = false;
      continue;
    }
    const texture = scene.textures.get(sprite.key);
    const layout = sheetLayout(sprite, SPRITE_DENSITY);
    const frames = Array.from({ length: sprite.frames }, (_, index) =>
      texture.has(String(index)) ? texture.get(index) : null
    );
    // A larger wrong image still slices into correctly sized frames, so check the whole sheet too.
    const source = texture.source[0];
    const valid =
      source?.width === layout.sheetWidth &&
      source.height === layout.sheetHeight &&
      texture.dataSource.length > 0 &&
      frames.every((frame) => frame?.cutWidth === layout.frameWidth && frame.cutHeight === layout.frameHeight);
    if (!valid) {
      scene.textures.remove(sprite.key);
      ready = false;
      continue;
    }
    setLogicalFrameSize(texture, SPRITE_DENSITY, sprite.width, sprite.height, frames as Phaser.Textures.Frame[]);
    // A bank sheet defaults to its level frame so an unspecified frame never shows a banked pose.
    texture.firstFrame = String(restingFrame(sprite));
  }
  return ready;
}

export function finishShipyardLoading(scene: Phaser.Scene): boolean {
  if (registerShipyardFrames(scene)) return true;

  let restarting = false;
  const restart = (): void => {
    if (restarting) return;
    restarting = true;
    scene.scene.restart();
  };
  const message = h('p', { className: 'ui-status artwork__message' });
  const retry = h(
    'button',
    { type: 'button', className: 'ui-btn ui-btn--primary', 'aria-label': 'Retry artwork' },
    'RETRY  /  ENTER'
  );
  retry.addEventListener('click', restart);
  const layer = mountUiLayer();
  layer.append(
    h(
      'div',
      { className: 'ui-modal' },
      h(
        'section',
        { className: 'ui-panel artwork', 'aria-label': 'Artwork loading' },
        h('div', { className: 'ui-frame', 'aria-hidden': 'true' }),
        message,
        retry
      )
    )
  );
  setStatus(message, 'Artwork could not be loaded.', 'error');
  scene.input.keyboard?.once('keydown-ENTER', restart);
  const cleanup = (): void => {
    layer.remove();
    scene.input.keyboard?.off('keydown-ENTER', restart);
    scene.events.off(Phaser.Scenes.Events.SHUTDOWN, cleanup);
    scene.events.off(Phaser.Scenes.Events.DESTROY, cleanup);
  };
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, cleanup);
  scene.events.once(Phaser.Scenes.Events.DESTROY, cleanup);
  return false;
}
