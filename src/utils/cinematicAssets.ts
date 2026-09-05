import Phaser from 'phaser';
import { mountAccessibleActionLayer } from '../scenes/shared/accessibleActionLayer';
import { CINEMATIC_DENSITY, CINEMATIC_SHIPS, cinematicAssetUrl, usesCinematicArt } from '../config/cinematicAssets';

export function queueCinematicAssets(scene: Phaser.Scene): void {
  if (!usesCinematicArt()) return;

  for (const asset of CINEMATIC_SHIPS) {
    if (!scene.textures.exists(asset.key)) scene.load.image(asset.key, cinematicAssetUrl(asset.file));
  }
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
  if (!usesCinematicArt() || registerCinematicFrames(scene)) return true;

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
