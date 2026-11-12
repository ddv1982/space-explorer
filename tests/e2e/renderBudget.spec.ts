import type { RenderStats } from '../../src/browserHarness';
import { expect, test, waitForScene } from './fixtures';

/**
 * Draw-call and shader-compile guardrails (see "Draw-call budget" in docs/architecture-guidelines.md).
 * Busy fights measured 35-43 draw calls per frame after v1.29.1; every extra batch flush costs GPU
 * time on phones, and a shader compiled mid-fight freezes the game for 50-180 ms.
 */
const MAX_DRAW_CALLS_PER_FRAME = 55;
/**
 * At least 20 s of play and 200 frames, so a slow runner still covers enough fighting. CI's software
 * WebGL renders about 4-5 frames per second, so 200 frames take about 45 s there, well inside the cap.
 */
const SAMPLE_MIN_MS = 20_000;
const SAMPLE_FRAMES = 200;
const SAMPLE_TIMEOUT_MS = 100_000;

for (const level of [5, 9]) {
  test(`sector ${level} stays within the draw-call budget and compiles no shaders in play`, async ({
    page,
    assertNoBrowserErrors,
  }) => {
    test.setTimeout(180_000);
    // Keyboard autofire keeps shots, hits, explosions and score popups on screen without input.
    await page.addInitScript(() =>
      window.localStorage.setItem('space-explorer.autoFire.v1', JSON.stringify({ touch: true, keyboard: true }))
    );
    await page.goto(`/?browserHarness=1&startLevel=${level}`);
    await waitForScene(page, 'Game');
    await page.evaluate(() => window.__SPACE_EXPLORER_BROWSER_HARNESS__!.renderStats.reset());
    await page.waitForTimeout(SAMPLE_MIN_MS);
    await expect
      .poll(() => page.evaluate(() => window.__SPACE_EXPLORER_BROWSER_HARNESS__!.renderStats.read().frames), {
        timeout: SAMPLE_TIMEOUT_MS,
        intervals: [1_000],
      })
      .toBeGreaterThanOrEqual(SAMPLE_FRAMES);
    const stats: RenderStats = await page.evaluate(() => window.__SPACE_EXPLORER_BROWSER_HARNESS__!.renderStats.read());
    // Recorded in the JUnit report, so CI's software-renderer frame rate stays visible over time.
    test.info().annotations.push({ type: 'render-stats', description: JSON.stringify(stats) });

    expect(stats.shaderCompiles, 'every gameplay shader must compile behind the loading screen').toBe(0);
    expect(stats.maxDrawCalls, `a frame drew ${stats.maxDrawCalls} times`).toBeLessThanOrEqual(
      MAX_DRAW_CALLS_PER_FRAME
    );
    assertNoBrowserErrors();
  });
}
