import type { RenderStats } from '../../src/browserHarness';
import { expect, test, waitForScene } from './fixtures';

/**
 * Draw-call and shader-compile guardrails (see "Draw-call budget" in docs/architecture-guidelines.md).
 * Busy fights measured 35-43 draw calls per frame after v1.29.1; every extra batch flush costs GPU
 * time on phones, and a shader compiled mid-fight freezes the game for 50-180 ms.
 */
const MAX_DRAW_CALLS_PER_FRAME = 55;
const SAMPLE_MS = 25_000;

for (const level of [5, 9]) {
  test(`sector ${level} stays within the draw-call budget and compiles no shaders in play`, async ({
    page,
    assertNoBrowserErrors,
  }) => {
    test.setTimeout(150_000);
    // Keyboard autofire keeps shots, hits, explosions and score popups on screen without input.
    await page.addInitScript(() =>
      window.localStorage.setItem('space-explorer.autoFire.v1', JSON.stringify({ touch: true, keyboard: true }))
    );
    await page.goto(`/?browserHarness=1&startLevel=${level}`);
    await waitForScene(page, 'Game');
    await page.evaluate(() => window.__SPACE_EXPLORER_BROWSER_HARNESS__!.renderStats.reset());
    await page.waitForTimeout(SAMPLE_MS);
    const stats: RenderStats = await page.evaluate(() => window.__SPACE_EXPLORER_BROWSER_HARNESS__!.renderStats.read());
    await test
      .info()
      .attach('render-stats.json', { body: JSON.stringify(stats, null, 2), contentType: 'application/json' });

    expect(stats.frames, 'the game must render while sampling').toBeGreaterThan(30);
    expect(stats.shaderCompiles, 'every gameplay shader must compile behind the loading screen').toBe(0);
    expect(stats.maxDrawCalls, `a frame drew ${stats.maxDrawCalls} times`).toBeLessThanOrEqual(
      MAX_DRAW_CALLS_PER_FRAME
    );
    assertNoBrowserErrors();
  });
}
