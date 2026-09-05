import { mkdirSync, writeFileSync } from 'node:fs';
import { test as loaderTest } from '@playwright/test';
import { expect, snapshot, test, waitForScene } from './fixtures';

const dimensions = {
  'player-ship': [36, 44, 24, 32],
  'scout-texture': [26, 28, 26, 28],
  'fighter-texture': [36, 36, 36, 36],
  'bomber-texture': [44, 38, 44, 38],
  'cinematic-pyre-herald': [88, 56, 88, 56],
} as const;

test('cinematic ships retain their logical geometry during real combat', async ({ page, assertNoBrowserErrors }) => {
  test.setTimeout(process.env.CI ? 180_000 : 60_000);
  const mobile = test.info().project.name.includes('mobile');
  await page.setViewportSize(mobile ? { width: 390, height: 844 } : { width: 1280, height: 720 });
  await page.goto('/?browserHarness=1&startLevel=1&upgrades=0');
  await waitForScene(page, 'Game');
  await page.evaluate(() => {
    window.__SPACE_EXPLORER_BROWSER_HARNESS__?.stageCinematicEncounter();
    window.__SPACE_EXPLORER_BROWSER_HARNESS__?.stageCinematicEncounter(true);
  });
  const evidence = await page.evaluate(() => window.__SPACE_EXPLORER_BROWSER_HARNESS__!.getCinematicSnapshot());
  for (const [key, [width, height, bodyWidth, bodyHeight]] of Object.entries(dimensions)) {
    const sprite = evidence.sprites.find((candidate) => candidate.key === key && candidate.active);
    expect(sprite, key).toMatchObject({
      width,
      height,
      displayWidth: width,
      displayHeight: height,
      scaleX: 1,
      scaleY: 1,
      sourceWidth: width * 4,
      sourceHeight: height * 4,
      resolution: 4,
      bodyWidth,
      bodyHeight,
    });
  }
  const player = evidence.sprites.find((sprite) => sprite.key === 'player-ship');
  expect(player).toMatchObject({ offsetX: 6, offsetY: 6 });
  await page.keyboard.down('Space');
  await page.keyboard.down('ArrowLeft');
  await expect
    .poll(
      async () => (await snapshot(page)).objects.find((object) => object.textureKey === 'player-ship')?.rotation ?? 0
    )
    .not.toBe(0);
  await page.keyboard.up('ArrowLeft');
  await expect
    .poll(async () =>
      (await snapshot(page)).objects.some((object) => object.textureKey === 'player-bullet' && object.active)
    )
    .toBe(true);
  const mode = mobile ? 'portrait' : 'desktop';
  const directory = process.env.VISUAL_SCREENSHOT_DIR ?? test.info().outputDir;
  mkdirSync(directory, { recursive: true });
  await page.screenshot({ path: `${directory}/cinematic-combat-${mode}.png` });
  writeFileSync(`${directory}/cinematic-geometry-${mode}.json`, JSON.stringify(evidence, null, 2));
  const progress = (await snapshot(page)).levelProgress ?? 0;
  await expect
    .poll(async () => (await snapshot(page)).levelProgress, { timeout: process.env.CI ? 60_000 : 15_000 })
    .toBeGreaterThan(progress);
  await page.keyboard.up('Space');
  assertNoBrowserErrors();
});

test('cinematic frames survive pooling, boss phases, respawn, resize, and level handoff', async ({
  page,
  assertNoBrowserErrors,
}) => {
  test.setTimeout(process.env.CI ? 180_000 : 90_000);
  await page.goto('/?browserHarness=1&startLevel=1&upgrades=0');
  await waitForScene(page, 'Game');
  const reuse = await page.evaluate(() => {
    const harness = window.__SPACE_EXPLORER_BROWSER_HARNESS__!;
    harness.stageCinematicEncounter();
    harness.stageCinematicEncounter(true);
    return harness.exerciseCinematicReuse();
  });
  expect(reuse.reused).toBe(true);
  expect(reuse.hp).toBeLessThan(reuse.maxHp * 0.5);
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          window
            .__SPACE_EXPLORER_BROWSER_HARNESS__!.getCinematicSnapshot()
            .sprites.find((sprite) => sprite.key === 'cinematic-pyre-herald')?.phase
      )
    )
    .toBeGreaterThan(1);
  await page.evaluate(() => window.__SPACE_EXPLORER_BROWSER_HARNESS__!.probeAcceptedPlayerDamage(999));
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          window
            .__SPACE_EXPLORER_BROWSER_HARNESS__!.getCinematicSnapshot()
            .sprites.find((sprite) => sprite.key === 'player-ship')?.alive
      )
    )
    .toBe(false);
  await expect
    .poll(
      () =>
        page.evaluate(
          () =>
            window
              .__SPACE_EXPLORER_BROWSER_HARNESS__!.getCinematicSnapshot()
              .sprites.find((sprite) => sprite.key === 'player-ship')?.alive
        ),
      { timeout: process.env.CI ? 60_000 : 20_000 }
    )
    .toBe(true);
  await page.setViewportSize({ width: 844, height: 390 });
  const restored = await page.evaluate(() => window.__SPACE_EXPLORER_BROWSER_HARNESS__!.getCinematicSnapshot());
  expect(restored.sprites.find((sprite) => sprite.key === 'player-ship')).toMatchObject({
    scaleX: 1,
    scaleY: 1,
    displayWidth: 36,
    displayHeight: 44,
    bodyWidth: 24,
    bodyHeight: 32,
  });
  await page.evaluate(() => window.__SPACE_EXPLORER_BROWSER_HARNESS__!.showPlanetIntermission(1));
  await waitForScene(page, 'PlanetIntermission');
  await page.getByRole('button', { name: 'Continue to Tideglass Shallows', exact: true }).focus();
  await page.keyboard.press('Enter');
  await waitForScene(page, 'Game');
  expect(
    (await page.evaluate(() => window.__SPACE_EXPLORER_BROWSER_HARNESS__!.getProceduralBackgroundSnapshot())).background
      ?.world
  ).toBe('tideglass');
  const retained = await page.evaluate(() => window.__SPACE_EXPLORER_BROWSER_HARNESS__!.getCinematicSnapshot());
  expect(retained.textures.every((texture) => texture.exists)).toBe(true);
  expect(retained.textures).toHaveLength(5);
  assertNoBrowserErrors();
});

test('cinematic image alpha and later-level entry remain valid', async ({ page, assertNoBrowserErrors }) => {
  await page.goto('/?browserHarness=1&startLevel=9');
  await waitForScene(page, 'Game');
  const alpha = await page.evaluate(async () => {
    return Promise.all(
      ['player', 'scout', 'fighter', 'bomber', 'boss'].map(async (file) => {
        const image = new Image();
        image.src = `assets/cinematic/${file}.webp`;
        await image.decode();
        const canvas = document.createElement('canvas');
        canvas.width = image.width;
        canvas.height = image.height;
        const context = canvas.getContext('2d');
        if (!context) throw new Error('Alpha inspection requires a canvas');
        context.drawImage(image, 0, 0);
        const pixels = context.getImageData(0, 0, image.width, image.height).data;
        let transparent = 0;
        let opaque = 0;
        for (let offset = 3; offset < pixels.length; offset += 4) {
          if (pixels[offset] === 0) transparent += 1;
          if (pixels[offset] >= 240) opaque += 1;
        }
        return { file, transparent: transparent / (pixels.length / 4), opaque: opaque / (pixels.length / 4) };
      })
    );
  });
  for (const asset of alpha) {
    expect(asset.transparent, asset.file).toBeGreaterThan(0.1);
    expect(asset.opaque, asset.file).toBeGreaterThan(0.2);
  }
  const shot = await snapshot(page);
  expect(
    (await page.evaluate(() => window.__SPACE_EXPLORER_BROWSER_HARNESS__!.getProceduralBackgroundSnapshot())).background
      ?.world
  ).toBe('hive');
  expect(shot.objects.some((object) => object.textureKey === 'cinematic-aurora')).toBe(false);
  assertNoBrowserErrors();
});

loaderTest('missing cinematic artwork blocks gameplay and retries successfully', async ({ page }) => {
  await page.route('**/assets/cinematic/player.webp', (route) => route.abort());
  await page.goto('/?browserHarness=1&startLevel=1');
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          window.__SPACE_EXPLORER_BROWSER_HARNESS__?.snapshot().texts.some((item) => item.text === 'RETRY  /  ENTER') ??
          false
      )
    )
    .toBe(true);
  expect((await snapshot(page)).activeScenes).not.toContain('Game');
  await page.unroute('**/assets/cinematic/player.webp');
  await expect(page.getByRole('button', { name: 'Retry artwork', exact: true })).toBeEnabled();
  await page.getByRole('button', { name: 'Retry artwork', exact: true }).focus();
  await page.keyboard.press('Enter');
  await waitForScene(page, 'Game');
  await expect(page.getByRole('navigation', { name: 'Artwork loading' })).toHaveCount(0);
  expect(
    await page.evaluate(() => window.__SPACE_EXPLORER_BROWSER_HARNESS__!.getCinematicSnapshot().sprites[0]?.resolution)
  ).toBe(4);
});

loaderTest('invalid hull dimensions require a successful retry', async ({ page }) => {
  await page.route('**/assets/cinematic/scout.webp', (route) =>
    route.fulfill({ path: 'public/assets/cinematic/fighter.webp', contentType: 'image/webp' })
  );
  await page.goto('/?browserHarness=1&startLevel=1');
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          window.__SPACE_EXPLORER_BROWSER_HARNESS__?.snapshot().texts.some((item) => item.text === 'RETRY  /  ENTER') ??
          false
      )
    )
    .toBe(true);
  expect((await snapshot(page)).activeScenes).not.toContain('Game');
  await page.unroute('**/assets/cinematic/scout.webp');
  await page.keyboard.press('Enter');
  await waitForScene(page, 'Game');
});

test('development neon comparison stays available after reload', async ({ page, assertNoBrowserErrors }) => {
  const requests: string[] = [];
  page.on('request', (request) => {
    if (request.url().includes('/assets/cinematic/')) requests.push(request.url());
  });
  await page.goto('/?browserHarness=1&startLevel=1&art=neon');
  await waitForScene(page, 'Game');
  expect(requests).toEqual([]);
  expect((await snapshot(page)).objects.some((object) => object.textureKey === 'bg_level01_composite')).toBe(true);
  assertNoBrowserErrors();
});
