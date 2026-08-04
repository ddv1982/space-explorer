import Phaser from 'phaser';
import type { HUD } from '@/systems/HUD';
import type { MobileControls } from '@/systems/MobileControls';
import type { ParallaxBackground } from '@/systems/ParallaxBackground';
import type { WarpTransition } from '@/systems/WarpTransition';
import type { PauseStateController } from './PauseStateController';
import { syncSceneViewport } from './viewport';

export type ViewportScaleResizeContext = {
  scene: Phaser.Scene;
  parallax: ParallaxBackground | null | undefined;
  mobileControls: MobileControls | null | undefined;
  hud: HUD | null | undefined;
  warpTransition: WarpTransition | null | undefined;
  pauseStateController: PauseStateController | null | undefined;
  picketTurrets: { relayout(): void } | null | undefined;
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
  context.picketTurrets?.relayout();
  context.clampPlayerToViewport();
}
