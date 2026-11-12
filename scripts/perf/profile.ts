/// <reference types="bun" />

/**
 * Plays one sector hands-free and reports frame pacing and draw calls in 5-second windows.
 *
 *   bun scripts/perf/profile.ts --level 9 --seconds 60
 *   bun scripts/perf/profile.ts --level 9 --phone --throttle 4
 *
 * Starts its own dev server (the browser harness is dev-only) and drives Chromium with keyboard
 * autofire on. Runs headed by default so frame times come from the real GPU; `--headless` is
 * fine for draw calls but its software renderer makes frame times meaningless.
 */
import { chromium, type Page } from '@playwright/test';
import { createServer } from 'vite';
import type { RenderStats } from '../../src/browserHarness';

interface Options {
  level: number;
  seconds: number;
  throttle: number;
  phone: boolean;
  headless: boolean;
}

const WINDOW_MS = 5_000;

function parseOptions(argv: readonly string[]): Options {
  const value = (flag: string, fallback: number): number => {
    const index = argv.indexOf(flag);
    const parsed = index >= 0 ? Number(argv[index + 1]) : fallback;
    if (!Number.isFinite(parsed) || parsed <= 0) throw new Error(`${flag} needs a positive number`);
    return parsed;
  };
  return {
    level: value('--level', 1),
    seconds: value('--seconds', 60),
    throttle: value('--throttle', 1),
    phone: argv.includes('--phone'),
    headless: argv.includes('--headless'),
  };
}

async function waitForGameScene(page: Page): Promise<void> {
  await page.waitForFunction(
    () => window.__SPACE_EXPLORER_BROWSER_HARNESS__?.snapshot().activeScenes.includes('Game') ?? false,
    undefined,
    { timeout: 60_000 }
  );
}

async function main(): Promise<void> {
  const options = parseOptions(process.argv.slice(2));
  const server = await createServer({ server: { host: '127.0.0.1', port: 0, hmr: false }, logLevel: 'error' });
  await server.listen();
  const address = server.httpServer?.address();
  if (!address || typeof address === 'string') throw new Error('Dev server did not report a port');

  const browser = await chromium.launch({ headless: options.headless });
  try {
    // The phone profile matches the e2e mobile project: 390x844 CSS pixels at 3x density, touch.
    const context = await browser.newContext(
      options.phone
        ? { viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true }
        : { viewport: { width: 1280, height: 720 } }
    );
    const page = await context.newPage();
    if (options.throttle > 1) {
      const cdp = await context.newCDPSession(page);
      await cdp.send('Emulation.setCPUThrottlingRate', { rate: options.throttle });
    }
    await page.addInitScript(() =>
      window.localStorage.setItem('space-explorer.autoFire.v1', JSON.stringify({ touch: true, keyboard: true }))
    );
    await page.goto(`http://127.0.0.1:${address.port}/?browserHarness=1&startLevel=${options.level}`);
    await waitForGameScene(page);
    // A touch device autofires only while touch is the active input; tap once to hand it control.
    if (options.phone) await page.touchscreen.tap(195, 700);

    const windows: Array<RenderStats & { quality: number }> = [];
    for (let elapsed = 0; elapsed < options.seconds * 1000; elapsed += WINDOW_MS) {
      await page.evaluate(() => window.__SPACE_EXPLORER_BROWSER_HARNESS__!.renderStats.reset());
      await page.waitForTimeout(WINDOW_MS);
      windows.push(
        await page.evaluate(() => {
          const harness = window.__SPACE_EXPLORER_BROWSER_HARNESS__!;
          // 0 is full effects; each step thins particles and trails (RuntimePerformanceBudget).
          return { ...harness.renderStats.read(), quality: harness.snapshot().runtimePerformance.pressureLevel };
        })
      );
    }

    const total = windows.reduce(
      (sum, window) => ({
        frames: sum.frames + window.frames,
        slow: sum.slow + window.slowFrames,
        verySlow: sum.verySlow + window.verySlowFrames,
        compiles: sum.compiles + window.shaderCompiles,
      }),
      { frames: 0, slow: 0, verySlow: 0, compiles: 0 }
    );
    const profile = `${options.phone ? 'phone 390x844@3x' : 'desktop 1280x720'}, CPU x${options.throttle}`;
    console.log(`Sector ${options.level}, ${options.seconds} s, ${profile}${options.headless ? ', headless' : ''}`);
    console.table(
      windows.map((window, index) => ({
        window: `${index * 5}-${index * 5 + 5} s`,
        fps: Math.round(window.frames / (WINDOW_MS / 1000)),
        'over 20 ms': window.slowFrames,
        'over 33 ms': window.verySlowFrames,
        'max ms': window.maxFrameMs,
        'max draws': window.maxDrawCalls,
        'p95 draws': window.p95DrawCalls,
        'effects step': window.quality,
      }))
    );
    const share = total.frames > 0 ? ((total.slow / total.frames) * 100).toFixed(2) : '0';
    console.log(
      `${total.frames} frames, ${total.slow} over 20 ms (${share}%), ${total.verySlow} over 33 ms, ${total.compiles} shader compiles`
    );
  } finally {
    await browser.close();
    await server.close();
  }
}

await main();
