import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene';
import { PreloadScene } from './scenes/PreloadScene';
import { MenuScene } from './scenes/MenuScene';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'game-root',
  width: 1280,
  height: 720,
  transparent: false,
  backgroundColor: '#000011',
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: 0 },
      debug: false,
    },
  },
  scene: [BootScene, PreloadScene, MenuScene],
  scale: {
    mode: Phaser.Scale.RESIZE,
  },
};

const game = new Phaser.Game(config);

if (typeof window !== 'undefined') {
  let pendingScaleRefresh = false;
  const visualViewport = window.visualViewport;
  let lastViewportWidth = 0;
  let lastViewportHeight = 0;
  let queuedViewportWidth = 0;
  let queuedViewportHeight = 0;

  const getViewportSize = (): { width: number; height: number } => ({
    width: Math.max(1, Math.round(visualViewport?.width ?? window.innerWidth)),
    height: Math.max(1, Math.round(visualViewport?.height ?? window.innerHeight)),
  });

  const scheduleScaleRefresh = (): void => {
    const nextViewport = getViewportSize();
    queuedViewportWidth = nextViewport.width;
    queuedViewportHeight = nextViewport.height;

    if (!pendingScaleRefresh && nextViewport.width === lastViewportWidth && nextViewport.height === lastViewportHeight) {
      return;
    }

    if (pendingScaleRefresh) {
      return;
    }

    pendingScaleRefresh = true;

    window.requestAnimationFrame(() => {
      pendingScaleRefresh = false;

      if (queuedViewportWidth === lastViewportWidth && queuedViewportHeight === lastViewportHeight) {
        return;
      }

      lastViewportWidth = queuedViewportWidth;
      lastViewportHeight = queuedViewportHeight;
      game.scale.refresh();
      game.scale.updateBounds();
    });
  };

  const handleVisualViewportChange = (): void => {
    if (visualViewport && Math.abs(visualViewport.scale - 1) > 0.01) {
      return;
    }

    scheduleScaleRefresh();
  };

  window.addEventListener('resize', scheduleScaleRefresh, { passive: true });
  window.addEventListener('orientationchange', scheduleScaleRefresh, { passive: true });
  visualViewport?.addEventListener('resize', handleVisualViewportChange, { passive: true });
  visualViewport?.addEventListener('scroll', handleVisualViewportChange, { passive: true });

  scheduleScaleRefresh();
}
