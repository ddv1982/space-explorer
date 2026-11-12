import Phaser from 'phaser';

/** Draw calls, shader compiles and frame times since the last reset, for performance guardrails. */
export interface RenderStats {
  frames: number;
  maxDrawCalls: number;
  /** Draw calls of the 95th-percentile frame, so one spike does not hide the typical cost. */
  p95DrawCalls: number;
  shaderCompiles: number;
  /** Frames whose gap to the previous frame exceeded 20 ms / 33 ms. */
  slowFrames: number;
  verySlowFrames: number;
  maxFrameMs: number;
}

const SLOW_FRAME_MS = 20;
const VERY_SLOW_FRAME_MS = 33;
const DRAW_METHODS = ['drawArrays', 'drawElements', 'drawArraysInstanced', 'drawElementsInstanced'] as const;

type CountedContext = WebGLRenderingContext & Partial<WebGL2RenderingContext>;

function percentile(sorted: readonly number[], fraction: number): number {
  if (sorted.length === 0) return 0;
  return sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * fraction))];
}

/**
 * Wraps the game's WebGL context so every draw and shader compile is counted, whichever Phaser code
 * issues it. Draw calls are tallied per rendered frame between PRE_RENDER and POST_RENDER.
 */
export function createRenderStatsProbe(game: Phaser.Game) {
  let drawCallsThisFrame = 0;
  let frameDrawCalls: number[] = [];
  let shaderCompiles = 0;
  let lastFrameAt: number | null = null;
  let slowFrames = 0;
  let verySlowFrames = 0;
  let maxFrameMs = 0;
  let installed = false;

  const install = (): void => {
    if (installed) return;
    const renderer = game.renderer;
    if (!(renderer instanceof Phaser.Renderer.WebGL.WebGLRenderer)) {
      throw new Error('Render stats need the WebGL renderer');
    }
    const gl = renderer.gl as CountedContext;
    for (const method of DRAW_METHODS) {
      const original = gl[method] as ((...args: unknown[]) => void) | undefined;
      if (typeof original !== 'function') continue;
      (gl as unknown as Record<string, unknown>)[method] = function (this: unknown, ...args: unknown[]) {
        drawCallsThisFrame += 1;
        return original.apply(this, args);
      };
    }
    const compileShader = gl.compileShader;
    gl.compileShader = function (this: WebGLRenderingContext, shader: WebGLShader) {
      shaderCompiles += 1;
      return compileShader.call(this, shader);
    };
    game.events.on(Phaser.Core.Events.PRE_RENDER, () => {
      drawCallsThisFrame = 0;
    });
    game.events.on(Phaser.Core.Events.POST_RENDER, () => {
      frameDrawCalls.push(drawCallsThisFrame);
      const now = performance.now();
      if (lastFrameAt !== null) {
        const gap = now - lastFrameAt;
        if (gap > SLOW_FRAME_MS) slowFrames += 1;
        if (gap > VERY_SLOW_FRAME_MS) verySlowFrames += 1;
        maxFrameMs = Math.max(maxFrameMs, gap);
      }
      lastFrameAt = now;
    });
    installed = true;
  };

  return {
    /** Starts (or restarts) counting from the next frame. */
    reset: (): void => {
      install();
      frameDrawCalls = [];
      shaderCompiles = 0;
      lastFrameAt = null;
      slowFrames = 0;
      verySlowFrames = 0;
      maxFrameMs = 0;
    },
    read: (): RenderStats => {
      const sorted = [...frameDrawCalls].sort((a, b) => a - b);
      return {
        frames: frameDrawCalls.length,
        maxDrawCalls: sorted[sorted.length - 1] ?? 0,
        p95DrawCalls: percentile(sorted, 0.95),
        shaderCompiles,
        slowFrames,
        verySlowFrames,
        maxFrameMs: Math.round(maxFrameMs * 10) / 10,
      };
    },
  };
}
