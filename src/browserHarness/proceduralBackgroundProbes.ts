import Phaser from 'phaser';
import { getLevelConfig } from '../config/LevelsConfig';
import { ParallaxBackground } from '../systems/ParallaxBackground';
import { runtimePerformanceBudget } from '../systems/RuntimePerformanceBudget';

function deferShaderCompilation(game: Phaser.Game): boolean {
  const renderer = game.renderer;
  if (!(renderer instanceof Phaser.Renderer.WebGL.WebGLRenderer)) return false;
  const nativeExtension = renderer.gl.getExtension('KHR_parallel_shader_compile');
  const extension: KHR_parallel_shader_compile = nativeExtension ?? { COMPLETION_STATUS_KHR: 0x91b1 };
  renderer.parallelShaderCompileExtension = extension;
  Reflect.set(game.config, 'skipUnreadyShaders', true);
  const original = renderer.gl.getProgramParameter.bind(renderer.gl);
  const backgroundPrograms = new WeakMap<WebGLProgram, boolean>();
  let pending = 40;
  renderer.gl.getProgramParameter = (program, parameter) => {
    if (parameter === extension.COMPLETION_STATUS_KHR && pending > 0) {
      let backgroundProgram = backgroundPrograms.get(program);
      if (backgroundProgram === undefined) {
        backgroundProgram =
          renderer.gl
            .getAttachedShaders(program)
            ?.some((shader) => renderer.gl.getShaderSource(shader)?.includes('uniform float uLandmark')) ?? false;
        backgroundPrograms.set(program, backgroundProgram);
      }
      if (backgroundProgram) {
        pending -= 1;
        return false;
      }
    }
    if (!nativeExtension && parameter === extension.COMPLETION_STATUS_KHR)
      return original(program, renderer.gl.LINK_STATUS);
    if (pending === 0) renderer.gl.getProgramParameter = original;
    return original(program, parameter);
  };
  return true;
}

function measureBackgroundCost(game: Phaser.Game, current: { scene: Phaser.Scene; parallax: ParallaxBackground }) {
  const renderer = game.renderer;
  if (!(renderer instanceof Phaser.Renderer.WebGL.WebGLRenderer)) throw new Error('Expected WebGL');
  return new Promise<{ averageMs: number; p95Ms: number; samples: number[] }>((resolve, reject) => {
    let started = 0;
    let warmup = 8;
    const samples: number[] = [];
    const cleanup = () => {
      game.events.off(Phaser.Core.Events.PRE_RENDER, before);
      game.events.off(Phaser.Core.Events.POST_RENDER, after);
      current.scene.events.off(Phaser.Scenes.Events.SHUTDOWN, cancelled);
    };
    const before = () => {
      renderer.gl.finish();
      started = performance.now();
      current.parallax.update(1000 / 60);
    };
    const after = () => {
      renderer.gl.finish();
      if (warmup > 0) warmup -= 1;
      else samples.push(performance.now() - started);
      if (samples.length === 60) {
        cleanup();
        const sorted = [...samples].sort((a, b) => a - b);
        resolve({
          averageMs: samples.reduce((sum, value) => sum + value, 0) / samples.length,
          p95Ms: sorted[Math.ceil(sorted.length * 0.95) - 1],
          samples,
        });
      }
    };
    const cancelled = () => {
      cleanup();
      reject(new Error('Background measurement cancelled by scene shutdown'));
    };
    current.scene.events.once(Phaser.Scenes.Events.SHUTDOWN, cancelled);
    game.events.on(Phaser.Core.Events.PRE_RENDER, before);
    game.events.on(Phaser.Core.Events.POST_RENDER, after);
  });
}

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
        replacedLegacyKeys: game.textures.getTextureKeys().filter((key) => /^bg_level\d\d/.test(key)),
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
    stageProceduralBackground: (advanceMs = 0, shaderOnly = false) => {
      const current = activeParallax();
      if (!current) throw new Error('Expected an active background for staging');
      const { scene, parallax } = current;
      scene.scene.pause();
      for (const child of scene.children.list) {
        if (
          'depth' in child &&
          typeof child.depth === 'number' &&
          'visible' in child &&
          !(child instanceof Phaser.GameObjects.Shader)
        ) {
          const output = child instanceof Phaser.GameObjects.Image && child.texture.key.endsWith('-atmosphere');
          child.visible = child.depth < -5 && (!shaderOnly || output);
        }
      }
      for (let time = 0; time < advanceMs; time += 16) parallax.update(Math.min(16, advanceMs - time));
    },
    setProceduralSection: (landmarkAlpha: number, atmosphereAlpha: number) => {
      const current = activeParallax();
      if (!current) throw new Error('Expected a background');
      current.parallax.setSectionAtmosphere(
        { ...getLevelConfig(4).sections[0], visualModifiers: { landmarkAlpha, atmosphereAlpha } },
        0.5
      );
    },
    applyProceduralPressure: () => {
      for (let sample = 0; sample < 480; sample += 1) runtimePerformanceBudget.sampleFrame(40);
    },
    deferProceduralShaderCompilation: () => deferShaderCompilation(game),
    measureProceduralBackgroundCost: () => {
      const current = activeParallax();
      if (!current) throw new Error('Expected a background');
      return measureBackgroundCost(game, current);
    },
  };
}
