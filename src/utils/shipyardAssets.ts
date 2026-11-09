import Phaser from 'phaser';
import { setLogicalFrameSize } from './generatedTexture';
import { mountAccessibleActionLayer } from '../scenes/shared/accessibleActionLayer';
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
    const valid =
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

  const width = Number(scene.scale.width);
  const height = Number(scene.scale.height);
  scene.add.rectangle(width / 2, height / 2, width, height, 0x020816).setDepth(1000);
  scene.add
    .text(width / 2, height / 2 - 42, 'Artwork could not be loaded.', {
      fontFamily: 'Share Tech Mono, monospace',
      fontSize: '18px',
      color: '#f4fdff',
      align: 'center',
      wordWrap: { width: Math.max(200, width - 40) },
    })
    .setOrigin(0.5)
    .setDepth(1001);
  const retry = scene.add
    .text(width / 2, height / 2 + 20, 'RETRY  /  ENTER', {
      fontFamily: 'Share Tech Mono, monospace',
      fontSize: '20px',
      color: '#bff6ff',
      backgroundColor: '#173140',
      padding: { x: 24, y: 18 },
    })
    .setOrigin(0.5)
    .setDepth(1001)
    .setInteractive({ useHandCursor: true });
  let restarting = false;
  const restart = (): void => {
    if (restarting) return;
    restarting = true;
    scene.scene.restart();
  };
  retry.once('pointerdown', restart);
  scene.input.keyboard?.once('keydown-ENTER', restart);
  const teardownActions = mountAccessibleActionLayer({
    label: 'Artwork loading',
    summary: 'Artwork could not be loaded. Retry to continue.',
    status: { message: 'Artwork could not be loaded.', politeness: 'assertive' },
    actions: [{ name: 'retry-artwork', label: 'Retry artwork', activate: restart }],
  });
  const cleanup = (): void => {
    teardownActions();
    scene.input.keyboard?.off('keydown-ENTER', restart);
    scene.events.off(Phaser.Scenes.Events.SHUTDOWN, cleanup);
    scene.events.off(Phaser.Scenes.Events.DESTROY, cleanup);
  };
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, cleanup);
  scene.events.once(Phaser.Scenes.Events.DESTROY, cleanup);
  return false;
}
