import type Phaser from 'phaser';
import { PauseStateController } from './PauseStateController';
import { MobileViewportGuard } from '../../systems/MobileViewportGuard';
import { audioManager } from '../../systems/AudioManager';
import type { MobileControls } from '../../systems/MobileControls';

interface PauseViewportWiringContext {
  scene: Phaser.Scene;
  stopPlayerMotion: () => void;
  getMobileControls: () => MobileControls | null;
}

interface PauseViewportWiring {
  pauseStateController: PauseStateController;
  mobileViewportGuard: MobileViewportGuard;
}

export function createPauseViewportWiring(context: PauseViewportWiringContext): PauseViewportWiring {
  const pauseStateController = PauseStateController.create({
    scene: context.scene,
    stopPlayerMotion: context.stopPlayerMotion,
    setMobileControlsBlocked: (blocked) => context.getMobileControls()?.setBlocked(blocked),
    onReturnToMenu: () => {
      audioManager.stopMusic();
      context.scene.scene.start('Menu');
    },
  });

  const mobileViewportGuard = MobileViewportGuard.create(context.scene, (blocked) => {
    pauseStateController.setOrientationBlocked(blocked);
  });

  pauseStateController.setOrientationBlocked(mobileViewportGuard.isBlocked());

  return {
    pauseStateController,
    mobileViewportGuard,
  };
}
