import type { Page } from '@playwright/test';
import { expect, pinQualityTier, snapshot, test, waitForScene } from './fixtures';

async function openLevelOne(page: Page, tier: 'low' | 'standard'): Promise<void> {
  await pinQualityTier(page, tier);
  await page.goto('/?browserHarness=1&startLevel=1&upgrades=0');
  await waitForScene(page, 'Game');
  await page.evaluate(() => window.__SPACE_EXPLORER_BROWSER_HARNESS__!.stageShipyardEncounter());
  // Let the ship finish settling from its spawn before sampling.
  await page.waitForTimeout(600);
}

/** Mean luminance of a screen region from a real screenshot of the WebGL canvas. */
async function regionLuminance(page: Page, x: number, y: number, size: number): Promise<number> {
  const png = await page.screenshot({ clip: { x: x - size / 2, y: y - size / 2, width: size, height: size } });
  return page.evaluate(async (base64) => {
    const image = new Image();
    image.src = `data:image/png;base64,${base64}`;
    await image.decode();
    const canvas = document.createElement('canvas');
    canvas.width = image.width;
    canvas.height = image.height;
    const context = canvas.getContext('2d')!;
    context.drawImage(image, 0, 0);
    const pixels = context.getImageData(0, 0, image.width, image.height).data;
    let total = 0;
    for (let offset = 0; offset < pixels.length; offset += 4) {
      total += 0.2126 * pixels[offset]! + 0.7152 * pixels[offset + 1]! + 0.0722 * pixels[offset + 2]!;
    }
    return total / (pixels.length / 4);
  }, png.toString('base64'));
}

/**
 * Compares the resting player ship's upper hull (clear of its exhaust particles) before and during a
 * long light pulse beside it. The ship idles in place without input, so the two captures line up.
 */
async function measurePulseBrightening(page: Page): Promise<number> {
  const player = (await snapshot(page)).objects.find((object) => object.active && object.textureKey === 'player-ship');
  if (!player) throw new Error('Missing player ship');
  const hullY = player.y - 8;
  const before = await regionLuminance(page, player.x, hullY, 24);
  await page.evaluate(
    ({ x, y }) => window.__SPACE_EXPLORER_BROWSER_HARNESS__!.pulseLightAt(x + 36, y - 30, 5000),
    player
  );
  await page.waitForTimeout(200);
  const after = await regionLuminance(page, player.x, hullY, 24);
  return (after - before) / before;
}

test('standard tier lights v2 ships with normal maps and an explosion pulse brightens the ship', async ({
  page,
  assertNoBrowserErrors,
}) => {
  // Lit software rendering in CI can drop to ~1 fps; screenshots and settling need room.
  test.setTimeout(180_000);
  await openLevelOne(page, 'standard');
  await expect
    .poll(() => page.evaluate(() => window.__SPACE_EXPLORER_BROWSER_HARNESS__!.getLightingSnapshot()))
    .toMatchObject({ playerLit: true, fighterLit: true });
  expect(await measurePulseBrightening(page)).toBeGreaterThan(0.1);
  assertNoBrowserErrors();
});

test('low tier keeps the baked look: no normal-map lighting and pulses change nothing', async ({
  page,
  assertNoBrowserErrors,
}) => {
  // Lit software rendering in CI can drop to ~1 fps; screenshots and settling need room.
  test.setTimeout(180_000);
  await openLevelOne(page, 'low');
  expect(await page.evaluate(() => window.__SPACE_EXPLORER_BROWSER_HARNESS__!.getLightingSnapshot())).toEqual({
    playerLit: false,
    fighterLit: false,
    lightCount: 0,
  });
  expect(Math.abs(await measurePulseBrightening(page))).toBeLessThan(0.02);
  assertNoBrowserErrors();
});
