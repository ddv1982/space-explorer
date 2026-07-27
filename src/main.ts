import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene';
import { PreloadScene } from './scenes/PreloadScene';
import { MenuScene } from './scenes/MenuScene';
import { audioManager } from './systems/AudioManager';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.WEBGL,
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

function supportsWebGL(): boolean {
  if (typeof document === 'undefined') return true;

  try {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('webgl2') ?? canvas.getContext('webgl');
    context?.getExtension('WEBGL_lose_context')?.loseContext();
    return Boolean(context);
  } catch {
    return false;
  }
}

const game = supportsWebGL() ? new Phaser.Game(config) : null;

if (!game && typeof document !== 'undefined') {
  document.getElementById('game-shell')?.setAttribute('hidden', '');
  document.getElementById('rotate-device-overlay')?.setAttribute('hidden', '');
  document.getElementById('webgl-unsupported')?.removeAttribute('hidden');
}

if (
  game &&
  typeof window !== 'undefined' &&
  new URLSearchParams(window.location.search).get('browserHarness') === '1'
) {
  void import('./browserHarness').then(({ installBrowserHarness }) => installBrowserHarness(game));
}

if (game && typeof window !== 'undefined') {
  let pendingScaleRefresh: number | null = null;
  let destroyed = false;
  const recoveryTimeouts = new Set<number>();
  const visualViewport = window.visualViewport;
  const gameRoot = document.getElementById('game-root');
  let lastViewportWidth = 0;
  let lastViewportHeight = 0;
  let queuedViewportWidth = 0;
  let queuedViewportHeight = 0;
  let queuedForceRefresh = false;

  const getViewportSize = (): { width: number; height: number } => {
    const rootBounds = gameRoot?.getBoundingClientRect();

    if (rootBounds && rootBounds.width > 0 && rootBounds.height > 0) {
      return {
        width: Math.max(1, Math.round(rootBounds.width)),
        height: Math.max(1, Math.round(rootBounds.height)),
      };
    }

    return {
      width: Math.max(1, Math.round(visualViewport?.width ?? window.innerWidth)),
      height: Math.max(1, Math.round(visualViewport?.height ?? window.innerHeight)),
    };
  };

  const scheduleScaleRefresh = (force = false): void => {
    if (destroyed) return;
    const nextViewport = getViewportSize();
    queuedViewportWidth = nextViewport.width;
    queuedViewportHeight = nextViewport.height;
    queuedForceRefresh = queuedForceRefresh || force;

    if (!queuedForceRefresh && !pendingScaleRefresh && nextViewport.width === lastViewportWidth && nextViewport.height === lastViewportHeight) {
      return;
    }

    if (pendingScaleRefresh) {
      return;
    }

    pendingScaleRefresh = window.requestAnimationFrame(() => {
      pendingScaleRefresh = null;
      if (destroyed) return;

      const forceRefresh = queuedForceRefresh;
      queuedForceRefresh = false;

      if (!forceRefresh && queuedViewportWidth === lastViewportWidth && queuedViewportHeight === lastViewportHeight) {
        return;
      }

      lastViewportWidth = queuedViewportWidth;
      lastViewportHeight = queuedViewportHeight;
      game.scale.refresh();
    });
  };

  const handleVisualViewportChange = (): void => {
    if (visualViewport && Math.abs(visualViewport.scale - 1) > 0.01) {
      return;
    }

    scheduleScaleRefresh();
  };

  const scheduleRecoveryScaleRefresh = (): void => {
    if (destroyed) return;
    scheduleScaleRefresh(true);
    const timeout = window.setTimeout(() => {
      recoveryTimeouts.delete(timeout);
      scheduleScaleRefresh(true);
    }, 50);
    recoveryTimeouts.add(timeout);
  };

  const handleWindowResize = (): void => scheduleScaleRefresh();
  const handleVisibilityChange = (): void => {
    audioManager.setPaused('visibility', document.hidden);
    if (!document.hidden) scheduleRecoveryScaleRefresh();
  };

  window.addEventListener('resize', handleWindowResize, { passive: true });
  window.addEventListener('orientationchange', handleWindowResize, { passive: true });
  window.addEventListener('focus', scheduleRecoveryScaleRefresh, { passive: true });
  window.addEventListener('pageshow', scheduleRecoveryScaleRefresh, { passive: true });
  visualViewport?.addEventListener('resize', handleVisualViewportChange, { passive: true });
  visualViewport?.addEventListener('scroll', handleVisualViewportChange, { passive: true });

  let rootResizeObserver: ResizeObserver | null = null;
  if (typeof ResizeObserver !== 'undefined' && gameRoot) {
    rootResizeObserver = new ResizeObserver(() => scheduleScaleRefresh());
    rootResizeObserver.observe(gameRoot);
  }

  document.addEventListener('visibilitychange', handleVisibilityChange);
  audioManager.setPaused('visibility', document.hidden);

  game.events.once(Phaser.Core.Events.DESTROY, () => {
    destroyed = true;
    window.removeEventListener('resize', handleWindowResize);
    window.removeEventListener('orientationchange', handleWindowResize);
    window.removeEventListener('focus', scheduleRecoveryScaleRefresh);
    window.removeEventListener('pageshow', scheduleRecoveryScaleRefresh);
    visualViewport?.removeEventListener('resize', handleVisualViewportChange);
    visualViewport?.removeEventListener('scroll', handleVisualViewportChange);
    document.removeEventListener('visibilitychange', handleVisibilityChange);
    rootResizeObserver?.disconnect();
    if (pendingScaleRefresh !== null) window.cancelAnimationFrame(pendingScaleRefresh);
    for (const timeout of recoveryTimeouts) window.clearTimeout(timeout);
    recoveryTimeouts.clear();
    audioManager.destroy();
  });

  scheduleScaleRefresh();
}
