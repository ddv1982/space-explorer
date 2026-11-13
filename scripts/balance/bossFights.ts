/// <reference types="bun" />

/**
 * Fights every boss with a scripted bot and reports how long each fight took and what it cost.
 *
 *   bun run balance:bosses
 *   bun run balance:bosses --sectors 6 --port 4302
 *   bun run balance:bosses --guns scatter --runs 3
 *   bun run balance:bosses --invulnerable      # time to kill even where the bot would die
 *
 * Starts its own dev server (the browser harness is dev-only), jumps straight to each boss with the
 * sector's representative ship, and lets `startBossFight` in the browser harness fly a fixed bot: it
 * holds a low line under the boss and steps away from shots that will cross it. Every boss sector flies
 * Lance, and each fight follows one gun policy (`--guns`, all three by default):
 * - `lance` never presses swap, the floor a player who ignores the special guns meets.
 * - `scatter` / `seekers` spend the charge the way a decent player would: once the boss has taken its
 *   first hit, every time the meter is full on Lance, press swap until that gun is up (Seekers is two
 *   presses away) and ride it until the empty meter hands Lance back.
 * The bot reads the meter from the harness snapshot and presses Q like a player, a few times a second.
 * Fights run in real time on the gameplay clock (no speed-up), several at once in separate pages;
 * `seconds` is gameplay time from the boss alarm to the kill, so pauses and hit-stops do not count.
 */
import { chromium, type Browser } from '@playwright/test';
import { createServer } from 'vite';
import type { BossFightReport } from '../../src/browserHarness';
import { getLevelConfig } from '../../src/config/LevelsConfig';
import { getUpgradeByKey, getUpgradeProgressionLimit, type UpgradeKey } from '../../src/config/UpgradesConfig';

const BOSS_SECTORS = [3, 4, 5, 6, 7, 8, 9, 10];
const GUN_POLICIES = ['lance', 'scatter', 'seekers'] as const;
type GunPolicy = (typeof GUN_POLICIES)[number];
/** How often the bot looks at the meter: a player glancing at the HUD, not a frame-perfect script. */
const POLICY_POLL_MS = 250;

interface Options {
  sectors: number[];
  guns: GunPolicy[];
  runs: number;
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
    guns: (list('--guns') ?? [...GUN_POLICIES]).map((gun) => {
      if (!GUN_POLICIES.includes(gun as GunPolicy)) throw new Error(`--guns: unknown policy ${gun}`);
      return gun as GunPolicy;
    }),
    runs: Number(flag('--runs') ?? 1),
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

/** Whether the policy presses swap now, given the gun and meter the HUD shows. */
function wantsSwap(policy: GunPolicy, gun: { id: string; charge: number }): boolean {
  if (policy === 'lance') return false;
  if (gun.id === 'lance') return gun.charge >= 1;
  // On the way to Seekers the swap passes Scatter; once on the policy's gun, ride it out.
  return gun.id !== policy;
}

interface FightResult extends BossFightReport {
  sector: number;
  gun: GunPolicy;
  /** Frames per second the page held; the bot needs a real frame rate to dodge like a player. */
  fps: number;
}

async function fight(browser: Browser, baseUrl: string, sector: number, gun: GunPolicy, options: Options) {
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
      await page.waitForTimeout(POLICY_POLL_MS);
      const state = await page
        .evaluate(() => {
          const harness = window.__SPACE_EXPLORER_BROWSER_HARNESS__!;
          const snapshot = harness.snapshot();
          return {
            report: harness.readBossFight(),
            gun: snapshot.gun,
            gameOver: snapshot.activeScenes.includes('GameOver'),
          };
        })
        .catch(() => null);
      if (state) report = state.report;
      if (!state || !report || report.killed || state.gameOver || report.seconds > options.limitSeconds) break;
      const bossHit = report.bossMaxHp > 0 && report.bossHp < report.bossMaxHp;
      if (bossHit && state.gun && wantsSwap(gun, state.gun)) await page.keyboard.press('KeyQ');
    }
    if (!report) throw new Error(`Sector ${sector}: no fight report`);
    const frames = await page.evaluate(() => window.__SPACE_EXPLORER_BROWSER_HARNESS__!.renderStats.read().frames);
    const fps = frames / ((Date.now() - startedAt) / 1000);
    return { ...report, sector, gun, fps } satisfies FightResult;
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

  const queue = options.sectors.flatMap((sector) =>
    options.guns.flatMap((gun) => Array.from({ length: options.runs }, () => ({ sector, gun })))
  );
  const results: FightResult[] = [];
  // Without the GPU, headless Chromium renders the game at about 10 fps and the bot reacts too late.
  const browser = await chromium.launch({
    headless: !options.headed,
    args: ['--enable-gpu', '--use-angle=metal', '--ignore-gpu-blocklist'],
  });
  try {
    const workers = Array.from({ length: Math.max(1, options.parallel) }, async () => {
      for (let next = queue.shift(); next !== undefined; next = queue.shift()) {
        const result = await fight(browser, baseUrl, next.sector, next.gun, options);
        console.error(`sector ${result.sector} ${result.gun}: ${result.seconds.toFixed(1)} s`);
        results.push(result);
      }
    });
    await Promise.all(workers);
  } finally {
    await browser.close();
    await server.close();
  }

  results.sort((a, b) => a.sector - b.sector || GUN_POLICIES.indexOf(a.gun) - GUN_POLICIES.indexOf(b.gun));
  console.log(`Boss fights${options.invulnerable ? ' (invulnerable bot)' : ''}`);
  console.table(
    results.map((result) => ({
      sector: result.sector,
      gun: result.gun,
      upgrades: representativeUpgrades(result.sector),
      'kill s': result.killed ? Number(result.seconds.toFixed(1)) : `- (${Math.round(result.seconds)})`,
      'boss hp': result.killed ? 0 : `${Math.round(result.bossHp)}/${result.bossMaxHp}`,
      'max hp': result.bossMaxHp,
      'hull hits': result.hullHits,
      'shield hits': result.shieldHits,
      deaths: result.deaths,
      special: `${Math.round(specialShare(result) * 100)}%`,
      phases: result.phases.join(' '),
      'peak shots': result.peakShots,
      hits: Object.entries(result.hitsBySource)
        .map(([source, count]) => `${source} ${count}`)
        .join(', '),
      fps: Math.round(result.fps),
    }))
  );
  console.log('Per sector and gun policy (kill times of killed fights only)');
  console.table(summarize(results));
  console.log(JSON.stringify(results));
}

function specialShare(result: FightResult): number {
  return result.seconds > 0 ? result.specialGunSeconds / result.seconds : 0;
}

/** Mean kill time against par, its run-to-run spread, deaths and time on a special gun. */
function summarize(results: readonly FightResult[]) {
  const groups = new Map<string, FightResult[]>();
  for (const result of results) {
    const key = `${result.sector} ${result.gun}`;
    groups.set(key, [...(groups.get(key) ?? []), result]);
  }
  return [...groups.values()].map((group) => {
    const { sector, gun } = group[0]!;
    const par = getLevelConfig(sector).boss!.parSeconds;
    const kills = group.filter((result) => result.killed).map((result) => result.seconds);
    const mean = kills.length > 0 ? kills.reduce((sum, seconds) => sum + seconds, 0) / kills.length : NaN;
    const share = group.reduce((sum, result) => sum + specialShare(result), 0) / group.length;
    return {
      sector,
      gun,
      runs: group.length,
      killed: kills.length,
      'mean kill s': Number(mean.toFixed(1)),
      spread: kills.length > 0 ? `${Math.min(...kills).toFixed(1)}-${Math.max(...kills).toFixed(1)}` : '-',
      par,
      '% of par': Math.round((mean / par) * 100),
      deaths: group.reduce((sum, result) => sum + result.deaths, 0),
      special: `${Math.round(share * 100)}%`,
    };
  });
}

await main();
