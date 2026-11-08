import Phaser from 'phaser';
import { mountAccessibleActionLayer } from '../scenes/shared/accessibleActionLayer';
import { CINEMATIC_DENSITY, CINEMATIC_SHIPS, cinematicAssetUrl, usesCinematicArt } from '../config/cinematicAssets';
import { V2_SHIPS, sheetLayout, v2AssetUrl } from '../config/v2Ships';

export function queueCinematicAssets(scene: Phaser.Scene): void {
  if (!usesCinematicArt()) return;

  for (const asset of CINEMATIC_SHIPS) {
    if (!scene.textures.exists(asset.key)) scene.load.image(asset.key, cinematicAssetUrl(asset.file));
  }
  for (const ship of V2_SHIPS) {
    if (scene.textures.exists(ship.key)) continue;
    const layout = sheetLayout(ship, CINEMATIC_DENSITY);
    scene.load.spritesheet({
      key: ship.key,
      url: v2AssetUrl(ship.file),
      normalMap: v2AssetUrl(ship.file, true),
      frameConfig: { frameWidth: layout.frameWidth, frameHeight: layout.frameHeight },
    });
  }
}

/** Validates a v2 bank-frame sheet and maps every frame to its logical size, like the cinematic hulls. */
function registerV2ShipFrames(scene: Phaser.Scene): boolean {
  let ready = true;
  for (const ship of V2_SHIPS) {
    if (!scene.textures.exists(ship.key)) {
      ready = false;
      continue;
    }
    const texture = scene.textures.get(ship.key);
    const layout = sheetLayout(ship, CINEMATIC_DENSITY);
    const frames = Array.from({ length: ship.bankFrames }, (_, index) =>
      texture.has(String(index)) ? texture.get(index) : null
    );
    const valid =
      texture.dataSource.length > 0 &&
      frames.every((frame) => frame?.cutWidth === layout.frameWidth && frame.cutHeight === layout.frameHeight);
    if (!valid) {
      scene.textures.remove(ship.key);
      ready = false;
      continue;
    }
    for (const source of [...texture.source, ...texture.dataSource]) source.resolution = CINEMATIC_DENSITY;
    for (const frame of frames) frame!.setTrim(ship.width, ship.height, 0, 0, ship.width, ship.height);
    // Default to the level frame so an unspecified frame never shows a banked pose.
    texture.firstFrame = String((ship.bankFrames - 1) / 2);
  }
  return ready;
}

function registerCinematicFrames(scene: Phaser.Scene): boolean {
  let ready = true;
  for (const asset of CINEMATIC_SHIPS) {
    if (!scene.textures.exists(asset.key)) {
      ready = false;
      continue;
    }
    const frame = scene.textures.getFrame(asset.key);
    if (frame.cutWidth !== asset.width * CINEMATIC_DENSITY || frame.cutHeight !== asset.height * CINEMATIC_DENSITY) {
      scene.textures.remove(asset.key);
      ready = false;
      continue;
    }
    // Phaser renders the physical cut at source density, while bounds and Arcade use the logical trim dimensions.
    frame.source.resolution = CINEMATIC_DENSITY;
    frame.setTrim(asset.width, asset.height, 0, 0, asset.width, asset.height);
  }
  return ready;
}

export function finishCinematicLoading(scene: Phaser.Scene): boolean {
  if (!usesCinematicArt()) return true;
  const cinematicReady = registerCinematicFrames(scene);
  if (registerV2ShipFrames(scene) && cinematicReady) return true;

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
