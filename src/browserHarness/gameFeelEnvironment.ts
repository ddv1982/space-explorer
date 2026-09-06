import Phaser from 'phaser';
import { getVisualQualityTier } from '@/config/visualQuality';
import { getGameplayDifficultyTier } from '@/config/gameplayDifficulty';
import { readGameFeelLoadout, type GameFeelEnvironment } from './gameFeelRecording';

export function captureGameFeelEnvironment(game: Phaser.Game): GameFeelEnvironment {
  const gl = game.renderer instanceof Phaser.Renderer.WebGL.WebGLRenderer ? game.renderer.gl : null;
  const debug = gl?.getExtension('WEBGL_debug_renderer_info');
  const renderer: unknown = gl && debug ? gl.getParameter(debug.UNMASKED_RENDERER_WEBGL) : null;
  return {
    userAgent: navigator.userAgent.slice(0, 512),
    renderer: typeof renderer === 'string' ? renderer.slice(0, 256) : null,
    hardwareConcurrency: navigator.hardwareConcurrency,
    viewport: { width: window.innerWidth, height: window.innerHeight, devicePixelRatio: window.devicePixelRatio },
    gameSize: { width: game.scale.width, height: game.scale.height },
    quality: getVisualQualityTier(),
    difficulty: getGameplayDifficultyTier(),
    startingPersistedPlayerState: readGameFeelLoadout(game.registry),
  };
}
