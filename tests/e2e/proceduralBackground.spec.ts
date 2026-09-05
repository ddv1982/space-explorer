import { mkdirSync, writeFileSync } from 'node:fs';
import { expect, openMenu, snapshot, startNewRun, test, waitForScene, type Page } from './fixtures';
import { sampleGameplayLaneLuminance } from './levelOneVisualEvidence';
import { LIVING_CAMPAIGN, LIVING_WORLD_PROFILES } from '../../src/systems/parallax/livingBackgroundProfile';

const evidenceDirectory = process.env.PROCEDURAL_EVIDENCE_DIR ?? 'output/campaign-backgrounds/verified';

async function background(page: Page) {
  return page.evaluate(() => window.__SPACE_EXPLORER_BROWSER_HARNESS__!.getProceduralBackgroundSnapshot());
}

async function stage(page: Page, milliseconds: number, shaderOnly = false): Promise<void> {
  await page.evaluate(
    ({ advance, isolated }) => window.__SPACE_EXPLORER_BROWSER_HARNESS__!.stageProceduralBackground(advance, isolated),
    { advance: milliseconds, isolated: shaderOnly }
  );
}

async function pixelDifference(page: Page, first: Buffer, second: Buffer): Promise<number> {
  return page.evaluate(
    async (images) => {
      const arrays = await Promise.all(
        images.map(async (encoded) => {
          const bytes = Uint8Array.from(atob(encoded), (character) => character.charCodeAt(0));
          const bitmap = await createImageBitmap(new Blob([bytes], { type: 'image/png' }));
          const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
          const context = canvas.getContext('2d');
          if (!context) throw new Error('Pixel comparison requires a canvas');
          context.drawImage(bitmap, 0, 0);
          bitmap.close();
          const marginWidth = Math.floor(canvas.width * 0.27);
          const top = Math.floor(canvas.height * 0.15);
          const height = Math.floor(canvas.height * 0.7);
          const left = context.getImageData(Math.floor(canvas.width * 0.01), top, marginWidth, height).data;
          const right = context.getImageData(Math.floor(canvas.width * 0.72), top, marginWidth, height).data;
          return new Uint8ClampedArray([...left, ...right]);
        })
      );
      let difference = 0;
      for (let offset = 0; offset < arrays[0].length; offset += 4) {
        for (let color = 0; color < 3; color += 1)
          difference += Math.abs(arrays[0][offset + color] - arrays[1][offset + color]);
      }
      return difference / (arrays[0].length * 0.75);
    },
    [first.toString('base64'), second.toString('base64')]
  );
}

for (const { level, world } of LIVING_CAMPAIGN) {
  test(`procedural ${world} evolves and resizes without a raster backdrop`, async ({ page, assertNoBrowserErrors }) => {
    const mobile = test.info().project.name.includes('mobile');
    const mode = mobile ? 'portrait' : 'desktop';
    await page.setViewportSize(mobile ? { width: 390, height: 844 } : { width: 1280, height: 720 });
    const rasterRequests: string[] = [];
    page.on('request', (request) => {
      const url = request.url();
      if (/\/assets\/.*\.(png|jpe?g|webp|avif)/.test(url) && !/\/assets\/(cinematic|planets)\//.test(url))
        rasterRequests.push(url);
    });
    await page.goto(`/?browserHarness=1&startLevel=${level}`);
    await waitForScene(page, 'Game');
    expect((await background(page)).background?.world).toBe(world);
    expect((await background(page)).textureKeys).toHaveLength(
      LIVING_WORLD_PROFILES[world].landmark.kind === 'none' ? 3 : 4
    );
    expect((await background(page)).replacedLegacyKeys).toEqual([]);
    await stage(page, 4000);
    mkdirSync(evidenceDirectory, { recursive: true });
    const before = await page.screenshot({ path: `${evidenceDirectory}/${world}-${mode}-before.png` });
    await stage(page, 3000);
    const after = await page.screenshot({ path: `${evidenceDirectory}/${world}-${mode}.png` });
    const difference = await pixelDifference(page, before, after);
    expect(difference).toBeGreaterThan(0.05);
    await stage(page, 0, true);
    const shaderBefore = await page.screenshot();
    await stage(page, 3000, true);
    const shaderDifference = await pixelDifference(page, shaderBefore, await page.screenshot());
    expect(shaderDifference).toBeGreaterThan(0.01);
    await stage(page, 0);
    expect(rasterRequests).toEqual([]);
    await page.setViewportSize(mobile ? { width: 844, height: 390 } : { width: 390, height: 844 });
    await expect
      .poll(async () => (await background(page)).background?.targetHeight)
      .toBe(mobile ? Math.round((390 * 480) / 844) : 480);
    await page.screenshot({ path: `${evidenceDirectory}/${world}-${mode}-resized.png` });
    writeFileSync(
      `${evidenceDirectory}/${world}-${mode}.json`,
      JSON.stringify({ difference, ...(await background(page)) }, null, 2)
    );
    assertNoBrowserErrors();
  });
}

for (const { level, world } of LIVING_CAMPAIGN.filter(({ level }) => [1, 3, 5].includes(level))) {
  test(`reduced motion freezes ${world} and restores after WebGL loss`, async ({ page, assertNoBrowserErrors }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(`/?browserHarness=1&startLevel=${level}`);
    await waitForScene(page, 'Game');
    await stage(page, 4000, true);
    const first = await page.screenshot();
    const original = await background(page);
    await stage(page, 3000, true);
    expect(await pixelDifference(page, first, await page.screenshot())).toBeLessThan(0.005);
    expect((await background(page)).background?.elapsed).toBe(original.background?.elapsed);
    await page.evaluate(async () => {
      const canvas = document.querySelector<HTMLCanvasElement>('#game-root canvas');
      const gl = canvas?.getContext('webgl2') ?? canvas?.getContext('webgl');
      const extension = gl?.getExtension('WEBGL_lose_context');
      if (!canvas || !extension) throw new Error('Context-loss verification is unavailable');
      await new Promise<void>((resolve) => {
        canvas.addEventListener('webglcontextlost', () => setTimeout(() => extension.restoreContext(), 80), {
          once: true,
        });
        canvas.addEventListener('webglcontextrestored', () => resolve(), { once: true });
        extension.loseContext();
      });
    });
    await expect
      .poll(async () => (await background(page)).background?.renderCount)
      .toBeGreaterThan(original.background?.renderCount ?? 0);
    expect(await pixelDifference(page, first, await page.screenshot())).toBeLessThan(0.05);
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await stage(page, 3000, true);
    expect(await pixelDifference(page, first, await page.screenshot())).toBeGreaterThan(0.05);
    assertNoBrowserErrors();
  });
}

test('low and auto quality bound procedural work without reallocating on pressure', async ({
  page,
  assertNoBrowserErrors,
}) => {
  await page.addInitScript(() => {
    const tier = new URLSearchParams(location.search).get('qualityTest');
    if (tier) localStorage.setItem('space-explorer.visualQuality.v1', tier);
  });
  for (const tier of ['low', 'auto']) {
    await page.goto(`/?browserHarness=1&startLevel=4&qualityTest=${tier}`);
    await waitForScene(page, 'Game');
    await stage(page, 2000);
    const before = await background(page);
    const cap = tier === 'low' ? 320 : 640;
    expect(
      Math.max(before.background?.targetWidth ?? Infinity, before.background?.targetHeight ?? Infinity)
    ).toBeLessThanOrEqual(cap);
    if (tier === 'low') expect(before.background?.elapsed).toBe(0);
    else {
      await page.evaluate(() => window.__SPACE_EXPLORER_BROWSER_HARNESS__!.applyProceduralPressure());
      const after = await background(page);
      expect(after.background?.pressure).toBe(3);
      expect(after.buffers).toBe(before.buffers);
      expect(after.vaos).toBe(before.vaos);
      expect(after.textureKeys).toEqual(before.textureKeys);
    }
  }
  assertNoBrowserErrors();
});

test('low backgrounds become visible after delayed shader compilation', async ({ page, assertNoBrowserErrors }) => {
  test.setTimeout(180_000);
  await page.addInitScript(() => localStorage.setItem('space-explorer.visualQuality.v1', 'low'));
  for (const { level } of LIVING_CAMPAIGN) {
    let unblock = () => {};
    const blocked = new Promise<void>((resolve) => {
      unblock = resolve;
    });
    await page.route('**/assets/cinematic/player.webp', async (route) => {
      await blocked;
      await route.continue();
    });
    await page.goto(`/?browserHarness=1&startLevel=${level}`, { waitUntil: 'domcontentloaded' });
    await expect.poll(() => page.evaluate(() => Boolean(window.__SPACE_EXPLORER_BROWSER_HARNESS__))).toBe(true);
    const supported = await page.evaluate(() =>
      window.__SPACE_EXPLORER_BROWSER_HARNESS__!.deferProceduralShaderCompilation()
    );
    unblock();
    test.skip(!supported, 'WebGL instrumentation is unavailable');
    await waitForScene(page, 'Game');
    await expect.poll(async () => (await background(page)).background?.ready, { timeout: 15_000 }).toBe(true);
    await stage(page, 4000, true);
    const light = await sampleGameplayLaneLuminance(page);
    expect(light.edges).toBeGreaterThan(light.center + 0.5);
    expect((await background(page)).background?.elapsed).toBe(0);
    await page.unroute('**/assets/cinematic/player.webp');
  }
  assertNoBrowserErrors();
});

test('section controls adjust landmark intensity independently from atmosphere', async ({
  page,
  assertNoBrowserErrors,
}) => {
  await page.goto('/?browserHarness=1&startLevel=4');
  await waitForScene(page, 'Game');
  await stage(page, 0);
  await page.evaluate(() => window.__SPACE_EXPLORER_BROWSER_HARNESS__!.setProceduralSection(0.5, 1));
  await stage(page, 4000);
  const dim = (await background(page)).background;
  await page.evaluate(() => window.__SPACE_EXPLORER_BROWSER_HARNESS__!.setProceduralSection(1.2, 1));
  await stage(page, 4000);
  const bright = (await background(page)).background;
  expect(dim?.landmarkAlpha).toBeLessThan(0.9);
  expect(bright?.landmarkAlpha).toBeGreaterThan(1.1);
  expect(bright?.atmosphereAlpha).toBe(dim?.atmosphereAlpha);
  expect(bright?.landmarkAlphas[0]).toBeGreaterThan(dim?.landmarkAlphas[0] ?? 0);
  assertNoBrowserErrors();
});

test('procedural GPU resources remain bounded across menu and game ownership', async ({
  page,
  assertNoBrowserErrors,
}) => {
  test.setTimeout(90_000);
  await openMenu(page);
  const samples: Array<{ buffers: number; vaos: number }> = [];
  for (let cycle = 0; cycle < 4; cycle += 1) {
    await startNewRun(page);
    await page.keyboard.down('Escape');
    try {
      await expect.poll(async () => (await snapshot(page)).physicsPaused).toBe(true);
    } finally {
      await page.keyboard.up('Escape');
    }
    const button = page.getByRole('button', { name: 'Main menu', exact: true });
    await button.focus();
    await button.press('Enter');
    await waitForScene(page, 'Menu');
    const current = await background(page);
    expect(current.textureKeys).toHaveLength(3);
    samples.push({ buffers: current.buffers, vaos: current.vaos });
  }
  expect(samples[3]).toEqual(samples[1]);
  assertNoBrowserErrors();
});

test('campaign transitions release each world and reuse warmed GPU allocations', async ({
  page,
  assertNoBrowserErrors,
}) => {
  test.setTimeout(180_000);
  await openMenu(page);
  const tours: Array<Array<{ world: string; buffers: number; vaos: number; textures: number }>> = [];
  const menus: Array<{ buffers: number; backgroundVaos: number; backgroundPrograms: number }> = [];
  for (let tour = 0; tour < 2; tour += 1) {
    await startNewRun(page);
    const samples = [];
    for (const { level, world, name } of LIVING_CAMPAIGN) {
      if (level > 1) {
        await page.evaluate(
          (completed) => window.__SPACE_EXPLORER_BROWSER_HARNESS__!.showPlanetIntermission(completed),
          level - 1
        );
        await waitForScene(page, 'PlanetIntermission');
        await page.getByRole('button', { name: `Continue to ${name}`, exact: true }).press('Enter');
        await waitForScene(page, 'Game');
      }
      await expect.poll(async () => (await background(page)).background?.ready).toBe(true);
      const current = await background(page);
      expect(current.background?.world).toBe(world);
      expect(current.backgroundVaos).toBe(1);
      expect(current.textureKeys).toHaveLength(LIVING_WORLD_PROFILES[world].landmark.kind === 'none' ? 3 : 4);
      expect(current.replacedLegacyKeys).toEqual([]);
      samples.push({ world, buffers: current.buffers, vaos: current.vaos, textures: current.glTextures });
    }
    tours.push(samples);
    await page.keyboard.down('Escape');
    try {
      await expect.poll(async () => (await snapshot(page)).physicsPaused).toBe(true);
    } finally {
      await page.keyboard.up('Escape');
    }
    await page.getByRole('button', { name: 'Main menu', exact: true }).press('Enter');
    await waitForScene(page, 'Menu');
    const menu = await background(page);
    expect(menu.textureKeys).toHaveLength(3);
    expect(menu.backgroundPrograms).toBeGreaterThanOrEqual(LIVING_CAMPAIGN.length);
    menus.push({
      buffers: menu.buffers,
      backgroundVaos: menu.backgroundVaos,
      backgroundPrograms: menu.backgroundPrograms,
    });
  }
  mkdirSync(evidenceDirectory, { recursive: true });
  writeFileSync(
    `${evidenceDirectory}/campaign-lifecycle-${test.info().project.name}.json`,
    JSON.stringify({ tours, menus }, null, 2)
  );
  expect(menus[1]).toEqual(menus[0]);
  assertNoBrowserErrors();
});
