import { mkdirSync, writeFileSync } from 'node:fs';
import { chromium } from '@playwright/test';

const directory = 'output/graphics-study/comparison';
mkdirSync(directory, { recursive: true });
const browser = await chromium.launch({ headless: !process.argv.includes('--headed') });
try {
  for (const mode of ['desktop', 'portrait'] as const) {
    const viewport = mode === 'desktop' ? { width: 1280, height: 720 } : { width: 390, height: 844 };
    for (const art of ['neon', 'cinematic'] as const) {
      const context = await browser.newContext({ viewport, hasTouch: mode === 'portrait' });
      try {
        const page = await context.newPage();
        await page.goto(`http://127.0.0.1:4173/?browserHarness=1&startLevel=1&upgrades=0&art=${art}`);
        await page.waitForFunction(() =>
          window.__SPACE_EXPLORER_BROWSER_HARNESS__?.snapshot().activeScenes.includes('Game')
        );
        const environment = await page.evaluate(() => {
          const canvas = document.querySelector<HTMLCanvasElement>('#game-root canvas');
          const gl = canvas?.getContext('webgl2') ?? canvas?.getContext('webgl');
          if (!gl) throw new Error('Expected an active WebGL renderer');
          const info = gl.getExtension('WEBGL_debug_renderer_info');
          return {
            userAgent: navigator.userAgent,
            renderer: info ? gl.getParameter(info.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER),
            canvas: window.__SPACE_EXPLORER_BROWSER_HARNESS__!.snapshot().canvas,
          };
        });
        await page.evaluate(() => window.__SPACE_EXPLORER_BROWSER_HARNESS__!.showLaneReadingPilot(false));
        await page.screenshot({ path: `${directory}/${art}-${mode}.png` });
        const renderCost = await page.evaluate(() =>
          window.__SPACE_EXPLORER_BROWSER_HARNESS__!.measureLaneReadingPilotRenderCost()
        );
        const evidence = { art, mode, environment, renderCost };
        writeFileSync(`${directory}/${art}-${mode}.json`, JSON.stringify(evidence, null, 2));
        process.stdout.write(`${art} ${mode}: ${JSON.stringify(renderCost.baseline)}\n`);
      } finally {
        await context.close();
      }
    }
  }
} finally {
  await browser.close();
}
