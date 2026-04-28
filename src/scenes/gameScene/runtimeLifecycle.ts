import Phaser from 'phaser';
import { rebindSceneLifecycleHandlers } from '@/utils/sceneLifecycle';
import { rebindSceneEventHandlers, unbindSceneEventHandlers, type SceneEventBinding } from './sceneEvents';
import {
  handleScaleResize as handleGameSceneScaleResize,
  registerScaleHandlers as registerGameSceneScaleHandlers,
  syncViewportIfNeeded as syncGameSceneViewportIfNeeded,
  type ViewportScaleResizeContext,
} from './viewportScaleRegistration';

interface GameSceneRuntimeLifecycleHandlers {
  registerRuntimeHandlers(): void;
  registerLifecycleHandlers(): void;
  registerSceneEventHandlers(): void;
  registerScaleHandlers(): void;
  removeSceneEventHandlers(): void;
  handleSceneShutdown(): void;
  handleSceneDestroy(): void;
  teardownSceneResources(): void;
  handleScaleResize(): void;
  syncViewportIfNeeded(): void;
}

interface CreateGameSceneRuntimeLifecycleOptions {
  scene: Phaser.Scene;
  sceneEventBindings: SceneEventBinding[];
  syncLastLifeHelperWingState: () => void;
  getScaleResizeContext: () => ViewportScaleResizeContext;
  destroyMobileViewportGuard: () => void;
  destroyPauseStateController: () => void;
  destroyMobileControls: () => void;
  persistHelperWingState: () => void;
  destroyLastLifeHelperWing: () => void;
  destroyParallax: () => void;
  destroyEffectsManager: () => void;
  shutdownFlow: () => void;
  resetRuntimeStateAfterShutdown: () => void;
}

export function createGameSceneRuntimeLifecycle(
  options: CreateGameSceneRuntimeLifecycleOptions
): GameSceneRuntimeLifecycleHandlers {
  const scene = options.scene;
  let didTeardownCurrentLifecycle = false;

  const registerSceneEventHandlers = (): void => {
    rebindSceneEventHandlers({
      events: scene.events,
      bindings: options.sceneEventBindings,
      context: scene,
    });
  };

  const removeSceneEventHandlers = (): void => {
    unbindSceneEventHandlers({
      events: scene.events,
      bindings: options.sceneEventBindings,
      context: scene,
    });
  };

  const handleScaleResize = (): void => {
    handleGameSceneScaleResize(options.getScaleResizeContext());
  };

  const registerScaleHandlers = (): void => {
    registerGameSceneScaleHandlers(scene.scale, handleScaleResize, scene);
  };

  const teardownSceneResources = (): void => {
    if (didTeardownCurrentLifecycle) {
      return;
    }

    didTeardownCurrentLifecycle = true;
    removeSceneEventHandlers();
    scene.scale.off(Phaser.Scale.Events.RESIZE, handleScaleResize, scene);
    options.destroyMobileViewportGuard();
    options.destroyPauseStateController();
    options.destroyMobileControls();
    options.persistHelperWingState();
    options.destroyLastLifeHelperWing();
    options.destroyParallax();
    options.destroyEffectsManager();
    options.shutdownFlow();
  };

  const handleSceneShutdown = (): void => {
    if (didTeardownCurrentLifecycle) {
      return;
    }

    teardownSceneResources();
    options.resetRuntimeStateAfterShutdown();
  };

  const handleSceneDestroy = (): void => {
    teardownSceneResources();
  };

  const registerLifecycleHandlers = (): void => {
    didTeardownCurrentLifecycle = false;
    rebindSceneLifecycleHandlers(scene, {
      onShutdown: handleSceneShutdown,
      onDestroy: handleSceneDestroy,
      context: scene,
    });
  };

  const registerRuntimeHandlers = (): void => {
    registerSceneEventHandlers();
    options.syncLastLifeHelperWingState();
  };

  const syncViewportIfNeeded = (): void => {
    syncGameSceneViewportIfNeeded(scene, handleScaleResize);
  };

  return {
    registerRuntimeHandlers,
    registerLifecycleHandlers,
    registerSceneEventHandlers,
    registerScaleHandlers,
    removeSceneEventHandlers,
    handleSceneShutdown,
    handleSceneDestroy,
    teardownSceneResources,
    handleScaleResize,
    syncViewportIfNeeded,
  };
}
