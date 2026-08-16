import { expect, openMenu, snapshot, test, waitForScene } from './fixtures';

test('aegis picket is locked before level 4 and purchasable with tier names after', async ({
  page,
  assertNoBrowserErrors,
}) => {
  await openMenu(page);

  await page.evaluate(async () => {
    const harness = window.__SPACE_EXPLORER_BROWSER_HARNESS__;
    if (!harness) throw new Error('Browser harness is not installed');
    await harness.showPlanetIntermission(1);
  });
  await waitForScene(page, 'PlanetIntermission');
  await expect.poll(async () => (await snapshot(page)).texts.some((item) => item.text === 'AEGIS PICKET')).toBe(true);
  const lockedTexts = (await snapshot(page)).texts.map((item) => item.text);
  expect(lockedTexts).toContain('UNLOCK: REACH LEVEL 4');

  await page.evaluate(async () => {
    const harness = window.__SPACE_EXPLORER_BROWSER_HARNESS__;
    if (!harness) throw new Error('Browser harness is not installed');
    await harness.showPlanetIntermission(4);
  });
  await waitForScene(page, 'PlanetIntermission');
  await expect
    .poll(async () => (await snapshot(page)).texts.some((item) => item.text === 'PICKET INSTALLATION  ·  0/2'))
    .toBe(true);

  const shop = await snapshot(page);
  const picketButton = shop.texts.find((item) => item.text === 'AEGIS PICKET');
  expect(picketButton).toBeDefined();
  expect(shop.texts.map((item) => item.text)).toContain('1500 CR');
  expect(shop.texts.map((item) => item.text)).toContain('CREDITS 8000');

  await page.mouse.click(picketButton?.x ?? 0, picketButton?.y ?? 0);

  // Tier two stays progression-capped until level 5. Detail and status remain
  // separate so the cap cannot collide with the tier readout.
  await expect
    .poll(async () => (await snapshot(page)).texts.map((item) => item.text))
    .toContain('PICKET OVERCLOCK  ·  1/2');
  const purchased = (await snapshot(page)).texts.map((item) => item.text);
  expect(purchased).toContain('CAP 1');
  expect(purchased).not.toContain('PICKET OVERCLOCK  ·  1/2  ·  CAP 1');
  expect(purchased).toContain('CREDITS 6500');
  assertNoBrowserErrors();
});

test('aegis picket mounts deploy, announce, and track the viewport edges', async ({ page, assertNoBrowserErrors }) => {
  await page.goto('/?browserHarness=1&startLevel=5&upgrades=0,0,0,0,1');
  await expect(page.locator('#game-root > canvas')).toHaveCount(1);
  await waitForScene(page, 'Game');

  await expect
    .poll(
      async () =>
        (await snapshot(page)).objects.filter((object) => object.textureKey === 'picket-turret' && object.active)
          .length,
      { timeout: 10_000 }
    )
    .toBe(2);

  await expect
    .poll(async () => (await snapshot(page)).texts.some((item) => item.text === 'PICKET ONLINE'), { timeout: 12_000 })
    .toBe(true);

  await page.setViewportSize({ width: 960, height: 640 });
  await expect
    .poll(async () => {
      const mounts = (await snapshot(page)).objects.filter((object) => object.textureKey === 'picket-turret');
      return mounts.map((mount) => Math.round(mount.x)).sort((a, b) => a - b);
    })
    .toEqual([26, 934]);

  // Autonomous target-gated fire needs real-time enemy spawns; software-rendered
  // CI runners validate mounts, announcement, and relayout only.
  if (!process.env.CI) {
    await expect
      .poll(
        async () =>
          (await snapshot(page)).objects.some((object) => object.textureKey === 'picket-bolt' && object.active),
        { timeout: 30_000 }
      )
      .toBe(true);
  }
  assertNoBrowserErrors();
});
