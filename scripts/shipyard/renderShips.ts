/// <reference types="bun" />
import { mkdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { chromium, type Page } from '@playwright/test';
import { CINEMATIC_DENSITY } from '../../src/config/cinematicAssets';
import { V2_SHIPS, type V2ShipSpec } from '../../src/config/v2Ships';

/**
 * Shipyard: renders the code-built 3D ships in headless Chromium into albedo + normal sprite
 * sheets, then encodes WebP for the game. three.js stays a build-time devDependency.
 *
 *   bun run art:shipyard           render every V2_SHIPS sheet
 *   bun run art:shipyard --probe   render the normal-convention probe and record sample pixels
 */

const SOURCE_DIRECTORY = 'assets/source/v2';
const PUBLIC_DIRECTORY = 'public/assets/v2';
const DOWNLOAD_BUDGET_BYTES = 600 * 1024;
export const PROBE_SPEC: V2ShipSpec = {
  key: 'probe',
  file: 'probe',
  width: 36,
  height: 36,
  bankFrames: 1,
  maxBankDeg: 0,
};

async function bundleRenderPage(): Promise<string> {
  const build = await Bun.build({
    entrypoints: [join(import.meta.dir, 'renderPage.ts')],
    target: 'browser',
    format: 'esm',
    minify: true,
  });
  if (!build.success) throw new Error(build.logs.map(String).join('\n'));
  return build.outputs[0]!.text();
}

async function openShipyard(page: Page): Promise<void> {
  const failures: string[] = [];
  page.on('pageerror', (error) => failures.push(error.message));
  await page.setContent('<!doctype html><html><body style="margin:0"></body></html>');
  await page.addScriptTag({ type: 'module', content: await bundleRenderPage() });
  await page
    .waitForFunction(() => window.shipyardReady === true, undefined, { timeout: 30_000 })
    .catch(() => {
      throw new Error(`Shipyard page failed to start:\n${failures.join('\n')}`);
    });
}

function decodeDataUrl(dataUrl: string): Buffer {
  return Buffer.from(dataUrl.slice(dataUrl.indexOf(',') + 1), 'base64');
}

function encodeWebp(input: string, output: string, lossless: boolean): void {
  const args = lossless
    ? ['cwebp', '-quiet', '-lossless', '-exact', input, '-o', output]
    : ['cwebp', '-quiet', '-q', '90', '-alpha_q', '100', input, '-o', output];
  const result = Bun.spawnSync(args);
  if (result.exitCode !== 0) throw new Error(result.stderr.toString() || `cwebp failed for ${input}`);
}

async function renderShips(page: Page): Promise<void> {
  mkdirSync(PUBLIC_DIRECTORY, { recursive: true });
  let totalBytes = 0;
  for (const spec of V2_SHIPS) {
    const result = await page.evaluate((request) => window.renderShipSheet(request), {
      spec,
      density: CINEMATIC_DENSITY,
    });
    if (!result.borderClear) throw new Error(`${spec.file}: a bank frame touches its 2px transparent margin`);
    for (const [suffix, dataUrl, lossless] of [
      ['', result.albedo, false],
      ['_n', result.normal, true],
    ] as const) {
      const png = join(SOURCE_DIRECTORY, `${spec.file}${suffix}.png`);
      const webp = join(PUBLIC_DIRECTORY, `${spec.file}${suffix}.webp`);
      writeFileSync(png, decodeDataUrl(dataUrl));
      encodeWebp(png, webp, lossless);
      const bytes = statSync(webp).size;
      totalBytes += bytes;
      process.stdout.write(`${webp}\t${bytes} bytes\n`);
    }
  }
  if (totalBytes > DOWNLOAD_BUDGET_BYTES) throw new Error(`v2 ship download exceeds 600 KiB: ${totalBytes} bytes`);
  process.stdout.write(`v2 ship download: ${totalBytes} bytes\n`);
}

/** Samples the hemisphere probe so tests can pin the normal-map convention Phaser expects. */
async function renderProbe(page: Page): Promise<void> {
  const result = await page.evaluate((request) => window.renderShipSheet(request), {
    spec: PROBE_SPEC,
    density: CINEMATIC_DENSITY,
  });
  writeFileSync(join(SOURCE_DIRECTORY, '_probe_n.png'), decodeDataUrl(result.normal));
  const samples = await page.evaluate(async (dataUrl) => {
    const image = new Image();
    image.src = dataUrl;
    await image.decode();
    const canvas = document.createElement('canvas');
    canvas.width = image.width;
    canvas.height = image.height;
    const context = canvas.getContext('2d')!;
    context.drawImage(image, 0, 0);
    const read = (x: number, y: number) => Array.from(context.getImageData(x, y, 1, 1).data.slice(0, 3));
    const c = image.width / 2;
    // Dome radius is 14 logical px at 4× density; sample just inside its rim.
    const rim = 14 * 4 * 0.9;
    return { centre: read(c, c), right: read(c + rim, c), top: read(c, c - rim), left: read(c - rim, c) };
  }, result.normal);
  writeFileSync(join(SOURCE_DIRECTORY, '_probe_normals.json'), `${JSON.stringify(samples, null, 2)}\n`);
  process.stdout.write(`Probe samples: ${JSON.stringify(samples)}\n`);
}

if (import.meta.main) {
  mkdirSync(SOURCE_DIRECTORY, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await openShipyard(page);
    if (process.argv.includes('--probe')) await renderProbe(page);
    else await renderShips(page);
  } finally {
    await browser.close();
  }
}
