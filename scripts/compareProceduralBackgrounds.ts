import { mkdirSync, writeFileSync } from 'node:fs';
import { chromium } from '@playwright/test';
import { LIVING_CAMPAIGN } from '../src/systems/parallax/livingBackgroundProfile';

const directory = 'output/campaign-backgrounds/comparison';
mkdirSync(directory, { recursive: true });
const browser = await chromium.launch();
try {
  for (const mode of ['desktop', 'portrait'] as const) {
    for (const { level, sampling } of [
      ...LIVING_CAMPAIGN.map(({ level }) => ({ level, sampling: 'cached' })),
      { level: 1, sampling: 'live' },
    ]) {
      const viewport = mode === 'desktop' ? { width: 1280, height: 720 } : { width: 390, height: 844 };
      const page = await browser.newPage({ viewport });
      try {
        await page.goto(`http://127.0.0.1:4173/?browserHarness=1&startLevel=${level}&atmosphere=${sampling}`);
        await page.waitForFunction(() =>
          window.__SPACE_EXPLORER_BROWSER_HARNESS__?.snapshot().activeScenes.includes('Game')
        );
        await page.evaluate(() => window.__SPACE_EXPLORER_BROWSER_HARNESS__!.stageProceduralBackground(4000));
        const environment = await page.evaluate(() => {
          const canvas = document.querySelector<HTMLCanvasElement>('#game-root canvas');
          const gl = canvas?.getContext('webgl2') ?? canvas?.getContext('webgl');
          if (!gl) throw new Error('Expected WebGL');
          const debug = gl.getExtension('WEBGL_debug_renderer_info');
          return {
            userAgent: navigator.userAgent,
            renderer: debug ? gl.getParameter(debug.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER),
          };
        });
        const cost = await page.evaluate(() =>
          window.__SPACE_EXPLORER_BROWSER_HARNESS__!.measureProceduralBackgroundCost()
        );
        const state = await page.evaluate(() =>
          window.__SPACE_EXPLORER_BROWSER_HARNESS__!.getProceduralBackgroundSnapshot()
        );
        const name = `${level}-${sampling}-${mode}`;
        await page.screenshot({ path: `${directory}/${name}.png` });
        writeFileSync(
          `${directory}/${name}.json`,
          JSON.stringify({ level, sampling, viewport, environment, cost, state }, null, 2)
        );
        process.stdout.write(`${name}: average ${cost.averageMs.toFixed(3)} ms; p95 ${cost.p95Ms.toFixed(3)} ms\n`);
      } finally {
        await page.close();
      }
    }
  }
} finally {
  await browser.close();
}
