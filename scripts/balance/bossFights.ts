/// <reference types="bun" />

/**
 * Fights every boss with a scripted bot and reports how long each fight took and what it cost.
 *
 *   bun run balance:bosses
 *   bun run balance:bosses --sectors 6 --port 4302
 *   bun run balance:bosses --invulnerable      # time to kill even where the bot would die
 *
 * Starts its own dev server (the browser harness is dev-only), jumps straight to each boss with the
 * sector's representative ship, and lets `startBossFight` in the browser harness fly a fixed bot: it
 * holds a low line under the boss and steps away from shots that will cross it. Every boss sector flies
 * Lance; the bot never spends the special-gun charge. Fights run in real
 * time on the gameplay clock (no speed-up), several at once in separate pages; `seconds` is gameplay
 * time from the boss alarm to the kill, so pauses and hit-stops do not count.
 */
import { chromium, type Browser } from '@playwright/test';
import { createServer } from 'vite';
import type { BossFightReport } from '../../src/browserHarness';
import { getUpgradeByKey, getUpgradeProgressionLimit, type UpgradeKey } from '../../src/config/UpgradesConfig';

const BOSS_SECTORS = [3, 4, 5, 6, 7, 8, 9, 10];

interface Options {
  sectors: number[];
  parallel: number;
  limitSeconds: number;
  invulnerable: boolean;
  port: number;
  headed: boolean;
}

function parseOptions(argv: readonly string[]): Options {
  const flag = (name: string): string | undefined => {
    const index = argv.indexOf(name);
    return index >= 0 ? argv[index + 1] : undefined;
  };
  const list = (name: string): string[] | undefined =>
    flag(name)
      ?.split(',')
      .map((part) => part.trim());
  return {
    sectors: list('--sectors')?.map(Number) ?? BOSS_SECTORS,
    parallel: Number(flag('--parallel') ?? 4),
    limitSeconds: Number(flag('--limit') ?? 240),
    invulnerable: argv.includes('--invulnerable'),
    port: Number(flag('--port') ?? 0),
    headed: argv.includes('--headed'),
  };
}

/**
 * The ship a player plausibly flies into sector N: every weapons and fire-rate tier the refit bay has
 * offered after clearing sector N-1 (offense is what players buy first), hull and shield one tier
 * behind that, no picket (it never targets bosses) and no support or doctrine systems.
 */
function representativeUpgrades(sector: number): string {
  const cap = (key: UpgradeKey): number => getUpgradeProgressionLimit(getUpgradeByKey(key), sector - 1);
  const levels = [Math.max(0, cap('hp') - 1), cap('damage'), cap('fireRate'), Math.max(0, cap('shield') - 1), 0];
  return levels.join(',');
}

interface FightResult extends BossFightReport {
  sector: number;
  /** Frames per second the page held; the bot needs a real frame rate to dodge like a player. */
  fps: number;
}

async function fight(browser: Browser, baseUrl: string, sector: number, options: Options) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const page = await context.newPage();
  try {
    await page.addInitScript(() => {
      window.localStorage.setItem('space-explorer.autoFire.v1', JSON.stringify({ touch: true, keyboard: true }));
      // Low effects keep several pages at full frame rate; quality never changes the simulation.
      window.localStorage.setItem('space-explorer.visualQuality.v1', 'low');
    });
    const upgrades = representativeUpgrades(sector);
    await page.goto(`${baseUrl}/?browserHarness=1&startLevel=${sector}&upgrades=${upgrades}&seed=1`);
    await page.waitForFunction(
      () => window.__SPACE_EXPLORER_BROWSER_HARNESS__?.snapshot().activeScenes.includes('Game') ?? false,
      undefined,
      { timeout: 60_000 }
    );
    await page.waitForTimeout(1_000);
    await page.evaluate((invulnerable) => {
      const harness = window.__SPACE_EXPLORER_BROWSER_HARNESS__!;
      harness.renderStats.reset();
      harness.startBossFight({ bot: true, invulnerable });
    }, options.invulnerable);
    const startedAt = Date.now();
    const deadline = Date.now() + (options.limitSeconds + 30) * 1000;
    let report: BossFightReport | null = null;
    while (Date.now() < deadline) {
      await page.waitForTimeout(1_000);
      report = await page
        .evaluate(() => window.__SPACE_EXPLORER_BROWSER_HARNESS__?.readBossFight() ?? null)
        .catch(() => report);
      const gameOver = await page
        .evaluate(() => window.__SPACE_EXPLORER_BROWSER_HARNESS__?.snapshot().activeScenes.includes('GameOver'))
        .catch(() => false);
      if (!report || report.killed || gameOver || report.seconds > options.limitSeconds) break;
    }
    if (!report) throw new Error(`Sector ${sector}: no fight report`);
    const frames = await page.evaluate(() => window.__SPACE_EXPLORER_BROWSER_HARNESS__!.renderStats.read().frames);
    const fps = frames / ((Date.now() - startedAt) / 1000);
    return { ...report, sector, fps } satisfies FightResult;
  } finally {
    await context.close();
  }
}

async function main(): Promise<void> {
  const options = parseOptions(process.argv.slice(2));
  const server = await createServer({
    server: { host: '127.0.0.1', port: options.port, strictPort: options.port > 0, hmr: false },
    logLevel: 'error',
  });
  await server.listen();
  const address = server.httpServer?.address();
  if (!address || typeof address === 'string') throw new Error('Dev server did not report a port');
  const baseUrl = `http://127.0.0.1:${address.port}`;

  const queue = [...options.sectors];
  const results: FightResult[] = [];
  // Without the GPU, headless Chromium renders the game at about 10 fps and the bot reacts too late.
  const browser = await chromium.launch({
    headless: !options.headed,
    args: ['--enable-gpu', '--use-angle=metal', '--ignore-gpu-blocklist'],
  });
  try {
    const workers = Array.from({ length: Math.max(1, options.parallel) }, async () => {
      for (let sector = queue.shift(); sector !== undefined; sector = queue.shift()) {
        const result = await fight(browser, baseUrl, sector, options);
        console.error(`sector ${result.sector}: ${result.seconds.toFixed(1)} s`);
        results.push(result);
      }
    });
    await Promise.all(workers);
  } finally {
    await browser.close();
    await server.close();
  }

  results.sort((a, b) => a.sector - b.sector);
  console.log(`Boss fights${options.invulnerable ? ' (invulnerable bot)' : ''}`);
  console.table(
    results.map((result) => ({
      sector: result.sector,
      upgrades: representativeUpgrades(result.sector),
      'kill s': result.killed ? Number(result.seconds.toFixed(1)) : `- (${Math.round(result.seconds)})`,
      'boss hp': result.killed ? 0 : `${Math.round(result.bossHp)}/${result.bossMaxHp}`,
      'max hp': result.bossMaxHp,
      'hull hits': result.hullHits,
      'shield hits': result.shieldHits,
      deaths: result.deaths,
      phases: result.phases.join(' '),
      'peak shots': result.peakShots,
      hits: Object.entries(result.hitsBySource)
        .map(([source, count]) => `${source} ${count}`)
        .join(', '),
      fps: Math.round(result.fps),
    }))
  );
  console.log(JSON.stringify(results));
}

await main();
