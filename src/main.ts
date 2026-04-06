import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene';
import { PreloadScene } from './scenes/PreloadScene';
import { MenuScene } from './scenes/MenuScene';
import { GameScene } from './scenes/GameScene';
import { PlanetIntermissionScene } from './scenes/PlanetIntermissionScene';
import { GameOverScene } from './scenes/GameOverScene';
import { VictoryScene } from './scenes/VictoryScene';

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
  scene: [BootScene, PreloadScene, MenuScene, GameScene, PlanetIntermissionScene, GameOverScene, VictoryScene],
  scale: {
    mode: Phaser.Scale.RESIZE,
  },
};

const game = new Phaser.Game(config);

if (typeof window !== 'undefined') {
  let pendingScaleRefresh = false;
  const visualViewport = window.visualViewport;

  const scheduleScaleRefresh = (): void => {
    if (pendingScaleRefresh) {
      return;
    }

    pendingScaleRefresh = true;

    window.requestAnimationFrame(() => {
      pendingScaleRefresh = false;
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
