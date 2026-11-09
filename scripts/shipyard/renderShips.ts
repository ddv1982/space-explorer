/// <reference types="bun" />
import { mkdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { chromium, type Page } from '@playwright/test';
import { SHIPYARD_SPRITES, SPRITE_DENSITY, type ShipyardSpriteSpec } from '../../src/config/shipyardSprites';

/**
 * Shipyard: renders the code-built 3D models in headless Chromium into albedo + normal sprite
 * sheets, then encodes WebP for the game. three.js stays a build-time devDependency.
 *
 *   bun run art:shipyard                 render every SHIPYARD_SPRITES sheet
 *   bun run art:shipyard --only a,b      render only the named sheet files (no budget check)
 *   bun run art:shipyard --probe         render the normal-convention probe and record sample pixels
 *
 * Every run also writes `_preview.png` (or `_preview-<files>.png` with --only): the rendered albedo
 * frames at 2× on a dark backdrop.
 */

const SOURCE_DIRECTORY = 'assets/source/shipyard';
const PUBLIC_DIRECTORY = 'public/assets/shipyard';
const DOWNLOAD_BUDGET_BYTES = 1200 * 1024;
export const PROBE_SPEC: ShipyardSpriteSpec = {
  key: 'probe',
  file: 'probe',
  width: 36,
  height: 36,
  frames: 1,
  pose: 'bank',
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

async function writePreview(page: Page, albedos: string[], name: string): Promise<void> {
  const dataUrl = await page.evaluate(async (urls) => {
    const images = await Promise.all(
      urls.map(async (url) => {
        const image = new Image();
        image.src = url;
        await image.decode();
        return image;
      })
    );
    const gap = 16;
    const width = Math.max(...images.map((image) => image.width * 2)) + gap * 2;
    const height = images.reduce((sum, image) => sum + image.height * 2 + gap, gap);
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d')!;
    context.fillStyle = '#0a0f18';
    context.fillRect(0, 0, width, height);
    let y = gap;
    for (const image of images) {
      context.drawImage(image, gap, y, image.width * 2, image.height * 2);
      y += image.height * 2 + gap;
    }
    return canvas.toDataURL('image/png');
  }, albedos);
  writeFileSync(join(SOURCE_DIRECTORY, name), decodeDataUrl(dataUrl));
}

async function renderShips(page: Page, only: Set<string> | null): Promise<void> {
  mkdirSync(PUBLIC_DIRECTORY, { recursive: true });
  let totalBytes = 0;
  const albedos: string[] = [];
  for (const spec of SHIPYARD_SPRITES) {
    if (only && !only.has(spec.file)) continue;
    const result = await page.evaluate((request) => window.renderShipSheet(request), {
      spec,
      density: SPRITE_DENSITY,
    });
    if (!result.borderClear) throw new Error(`${spec.file}: a frame touches its 2px transparent margin`);
    albedos.push(result.albedo);
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
  await writePreview(page, albedos, only ? `_preview-${[...only].join('-')}.png` : '_preview.png');
  if (!only && totalBytes > DOWNLOAD_BUDGET_BYTES) {
    throw new Error(`Shipyard download exceeds ${DOWNLOAD_BUDGET_BYTES / 1024} KiB: ${totalBytes} bytes`);
  }
  process.stdout.write(`Shipyard download: ${totalBytes} bytes\n`);
}

/** Samples the hemisphere probe so tests can pin the normal-map convention Phaser expects. */
async function renderProbe(page: Page): Promise<void> {
  const result = await page.evaluate((request) => window.renderShipSheet(request), {
    spec: PROBE_SPEC,
    density: SPRITE_DENSITY,
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
    const onlyIndex = process.argv.indexOf('--only');
    const only = onlyIndex >= 0 ? new Set((process.argv[onlyIndex + 1] ?? '').split(',').filter(Boolean)) : null;
    if (process.argv.includes('--probe')) await renderProbe(page);
    else await renderShips(page, only);
  } finally {
    await browser.close();
  }
}
