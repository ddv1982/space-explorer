import Phaser from 'phaser';
import { ParallaxBackground } from '../systems/ParallaxBackground';

export function createProceduralBackgroundProbes(game: Phaser.Game) {
  const activeParallax = () => {
    const scenes = [
      ...game.scene.getScenes(true),
      ...game.scene.getScenes(false).filter((scene) => scene.sys.isPaused()),
    ];
    const scene = scenes.find((candidate) => 'parallax' in candidate);
    if (!scene || !('parallax' in scene) || !(scene.parallax instanceof ParallaxBackground)) return null;
    return { scene, parallax: scene.parallax };
  };
  return {
    getProceduralBackgroundSnapshot: () => {
      const current = activeParallax();
      const renderer = game.renderer;
      if (!(renderer instanceof Phaser.Renderer.WebGL.WebGLRenderer)) throw new Error('Expected WebGL');
      return {
        scene: current?.scene.sys.settings.key ?? null,
        background: current?.parallax.getLivingBackgroundSnapshot() ?? null,
        textureKeys: game.textures.getTextureKeys().filter((key) => key.startsWith('living-')),
        buffers: renderer.glBufferWrappers.length,
        vaos: renderer.glVAOWrappers.length,
        backgroundPrograms: renderer.glProgramWrappers.filter((program) =>
          program.fragmentSource.includes('uniform float uLandmark')
        ).length,
        backgroundVaos: renderer.glVAOWrappers.filter((vao) =>
          vao.program.fragmentSource.includes('uniform float uLandmark')
        ).length,
        glTextures: renderer.glTextureWrappers.length,
      };
    },
  };
}
