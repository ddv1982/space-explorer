import Phaser from 'phaser';
import type { HUD } from '../../systems/HUD';
import type { MobileControls } from '../../systems/MobileControls';
import type { ParallaxBackground } from '../../systems/ParallaxBackground';
import type { WarpTransition } from '../../systems/WarpTransition';
import { isPhoneSizedTouchViewport } from '../../utils/device';
import { getGameplayBounds, getViewportBounds } from '../../utils/layout';
import type { PauseStateController } from './PauseStateController';
import { syncSceneViewport } from './viewport';

export type ViewportScaleResizeContext = {
  scene: Phaser.Scene;
  parallax: ParallaxBackground | null | undefined;
  mobileControls: MobileControls | null | undefined;
  hud: HUD | null | undefined;
  warpTransition: WarpTransition | null | undefined;
  pauseStateController: PauseStateController | null | undefined;
  clampPlayerToViewport: () => void;
};

export function registerScaleHandlers(
  scale: Phaser.Scale.ScaleManager,
  resizeHandler: () => void,
  context: unknown
): void {
  scale.off(Phaser.Scale.Events.RESIZE, resizeHandler, context);
  scale.on(Phaser.Scale.Events.RESIZE, resizeHandler, context);
}

export function handleScaleResize(context: ViewportScaleResizeContext): void {
  const viewport = syncSceneViewport(context.scene);

  context.parallax?.resize(viewport.width, viewport.height);
  context.mobileControls?.relayout();
  context.hud?.relayout();
  context.warpTransition?.resize();
  context.pauseStateController?.relayout();
  context.clampPlayerToViewport();
}

export function syncViewportIfNeeded(scene: Phaser.Scene, resize: () => void): void {
  const viewport = getViewportBounds(scene);
  const camera = scene.cameras.main;

  if (!isPhoneSizedTouchViewport()) {
    if (
      Math.abs(camera.x) <= 1 &&
      Math.abs(camera.y) <= 1 &&
      Math.abs(camera.width - viewport.width) <= 1 &&
      Math.abs(camera.height - viewport.height) <= 1
    ) {
      return;
    }

    resize();
    return;
  }

  const gameplayBounds = getGameplayBounds();
  const scale = Math.min(viewport.width / gameplayBounds.width, viewport.height / gameplayBounds.height);
  const expectedWidth = gameplayBounds.width * scale;
  const expectedHeight = gameplayBounds.height * scale;
  const expectedX = viewport.left + (viewport.width - expectedWidth) / 2;
  const expectedY = viewport.top + (viewport.height - expectedHeight) / 2;

  if (
    Math.abs(camera.x - expectedX) <= 1 &&
    Math.abs(camera.y - expectedY) <= 1 &&
    Math.abs(camera.width - expectedWidth) <= 1 &&
    Math.abs(camera.height - expectedHeight) <= 1
  ) {
    return;
  }

  resize();
}
