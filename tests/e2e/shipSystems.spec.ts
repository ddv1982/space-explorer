import { expect, openMenu, pinQualityTier, snapshot, startNewRun, test, waitForScene, type Page } from './fixtures';

/** The pause panel's SYSTEMS card for one slot, e.g. `MAIN GUN`. */
function systemRow(page: Page, slotTitle: string) {
  return page.locator('.pause-system').filter({ hasText: slotTitle });
}

/** Touch keys sit on the right edge: pause, and the gun-swap key under it (see `MobileControls`). */
const TOUCH_KEY_X = 390 - 22 - 22;
const TOUCH_PAUSE_Y = 84 + 22;
const TOUCH_SWAP_Y = TOUCH_PAUSE_Y + 44 + 14;

async function startSector(page: Page, level: number, systems: string): Promise<void> {
  await pinQualityTier(page, 'low');
  await page.addInitScript(() =>
    window.localStorage.setItem('space-explorer.autoFire.v1', JSON.stringify({ touch: true, keyboard: true }))
  );
  await page.goto(`/?browserHarness=1&startLevel=${level}&systems=${systems}`);
  await waitForScene(page, 'Game');
}

async function playerShots(page: Page) {
  return (await snapshot(page)).objects.filter((object) => object.active && object.textureKey === 'player-bullet');
}

async function shownTexts(page: Page): Promise<string[]> {
  return (await snapshot(page)).texts.filter((text) => text.shown).map((text) => text.text);
}

/** Wingman's drone: a body-less `helper-ship` image (couriers share the texture but have bodies). */
async function wingmanDrones(page: Page): Promise<number> {
  return (await snapshot(page)).objects.filter(
    (object) => object.active && object.textureKey === 'helper-ship' && !object.hasBody
  ).length;
}

async function openPause(page: Page, isMobile: boolean): Promise<void> {
  if (isMobile) await page.touchscreen.tap(TOUCH_KEY_X, TOUCH_PAUSE_Y);
  else await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog', { name: 'Paused' })).toBeVisible();
}

test('a free main-gun pick is offered after sector 2, must be made, and changes how the gun fires', async ({
  page,
  isMobile,
  assertNoBrowserErrors,
}) => {
  test.setTimeout(120_000);
  await pinQualityTier(page, 'low');
  await page.addInitScript(() =>
    window.localStorage.setItem('space-explorer.autoFire.v1', JSON.stringify({ touch: true, keyboard: true }))
  );
  await openMenu(page);
  await startNewRun(page);

  // Sector 1 is part of the gentle opening: no pick yet.
  await page.evaluate(() => window.__SPACE_EXPLORER_BROWSER_HARNESS__!.showPlanetIntermission(1));
  await waitForScene(page, 'PlanetIntermission');
  await expect(page.getByRole('dialog')).toHaveCount(0);

  await page.evaluate(() => window.__SPACE_EXPLORER_BROWSER_HARNESS__!.showPlanetIntermission(2));
  const dialog = page.getByRole('dialog', { name: 'CHOOSE YOUR MAIN GUN' });
  await expect(dialog).toBeVisible();
  for (const name of ['LANCE', 'SCATTER', 'SEEKERS']) {
    await expect(dialog.getByRole('button', { name: new RegExp(`^${name}`) })).toBeInViewport({ ratio: 1 });
  }
  await page.screenshot({ path: test.info().outputPath('system-pick.png') });

  // The refit bay behind the dialog cannot be reached: Tab stays on the three options.
  for (let press = 0; press < 5; press += 1) {
    await page.keyboard.press('Tab');
    expect(await dialog.evaluate((element) => element.contains(document.activeElement))).toBe(true);
  }
  expect(await page.locator('.refit').evaluate((element) => (element.closest('.ui-layer') as HTMLElement).inert)).toBe(
    true
  );

  // The run waits for the pick: a plain key does not carry on to the next sector.
  await page.keyboard.press('KeyX');
  await page.waitForTimeout(600);
  expect((await snapshot(page)).activeScenes).toContain('PlanetIntermission');
  await expect(dialog).toBeVisible();

  await dialog.getByRole('button', { name: /^SCATTER/ }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.locator('.ui-layer')).toHaveCount(1);
  expect(await page.locator('.refit').evaluate((element) => (element.closest('.ui-layer') as HTMLElement).inert)).toBe(
    false
  );
  await page.getByRole('button', { name: /Continue to/ }).click();
  await waitForScene(page, 'Game');
  if (isMobile) await page.touchscreen.tap(195, 700);

  // Scatter fans its shots: some fly at an angle, which the standard gun never does.
  await expect
    .poll(async () =>
      (await snapshot(page)).objects.some(
        (object) => object.active && object.textureKey === 'player-bullet' && Math.abs(object.rotation) > 0.1
      )
    )
    .toBe(true);

  // The pause panel names the pick.
  if (!isMobile) {
    await page.keyboard.press('Escape');
    await page.getByRole('tab', { name: 'SYSTEMS' }).click();
    await expect(systemRow(page, 'MAIN GUN')).toContainText('SCATTER');
    await page.screenshot({ path: test.info().outputPath('pause-systems.png') });
  }
  assertNoBrowserErrors();
});

test('every ship system runs in a real sector without errors', async ({ page, isMobile, assertNoBrowserErrors }) => {
  test.skip(isMobile, 'covered once on desktop; systems do not depend on the input device');
  test.setTimeout(180_000);
  await pinQualityTier(page, 'low');
  await page.addInitScript(() =>
    window.localStorage.setItem('space-explorer.autoFire.v1', JSON.stringify({ touch: true, keyboard: true }))
  );
  for (const systems of ['lance,magnet,overdrive', 'scatter,surgeCore,bulwark', 'seekers,wingman,salvager']) {
    await page.goto(`/?browserHarness=1&startLevel=5&systems=${systems}`);
    await waitForScene(page, 'Game');
    await expect
      .poll(async () => (await snapshot(page)).objects.some((o) => o.active && o.textureKey === 'player-bullet'))
      .toBe(true);
    for (let sweep = 0; sweep < 6; sweep += 1) {
      const key = sweep % 2 ? 'ArrowLeft' : 'ArrowRight';
      await page.keyboard.down(key);
      await page.waitForTimeout(900);
      await page.keyboard.up(key);
    }
    await page.keyboard.press('Escape');
    await page.getByRole('tab', { name: 'SYSTEMS' }).click();
    const [gun, support, late] = systems.split(',');
    const label = { surgeCore: 'SURGE CORE' }[support] ?? support.toUpperCase();
    await expect(systemRow(page, 'MAIN GUN')).toContainText(gun.toUpperCase());
    await expect(systemRow(page, 'SUPPORT SYSTEM')).toContainText(label);
    await expect(systemRow(page, 'COMBAT DOCTRINE')).toContainText(late.toUpperCase());
    await page.screenshot({ path: test.info().outputPath(`systems-${gun}.png`) });
  }
  assertNoBrowserErrors();
});

test('the main gun swaps mid-sector on Q or the touch key, and a second swap waits for the cooldown', async ({
  page,
  isMobile,
  assertNoBrowserErrors,
}) => {
  test.setTimeout(90_000);
  await startSector(page, 3, 'lance');
  const swap = async (): Promise<void> => {
    if (isMobile) await page.touchscreen.tap(TOUCH_KEY_X, TOUCH_SWAP_Y);
    else await page.keyboard.press('KeyQ');
  };

  // Lance fires straight ahead.
  await expect.poll(async () => (await playerShots(page)).length).toBeGreaterThan(0);
  expect((await playerShots(page)).every((shot) => Math.abs(shot.rotation) < 0.01)).toBe(true);

  await swap();
  await expect.poll(() => shownTexts(page)).toContain('SCATTER');
  await page.screenshot({ path: test.info().outputPath('swap-flash.png') });
  // A second press inside the cooldown is ignored: the gun stays Scatter.
  await swap();
  if (isMobile) await page.screenshot({ path: test.info().outputPath('swap-key-cooling.png') });
  await page.waitForTimeout(300);
  expect(await shownTexts(page)).not.toContain('SEEKERS');

  // Scatter fans its shots.
  await expect.poll(async () => (await playerShots(page)).some((shot) => Math.abs(shot.rotation) > 0.1)).toBe(true);

  await openPause(page, isMobile);
  await page.getByRole('tab', { name: 'SYSTEMS' }).click();
  await expect(systemRow(page, 'MAIN GUN')).toContainText('SCATTER');
  await page.screenshot({ path: test.info().outputPath('pause-systems-tab.png') });
  assertNoBrowserErrors();
});

test('sectors 1-2 have no swap: Q does nothing and the pause panel has no SYSTEMS tab', async ({
  page,
  isMobile,
  assertNoBrowserErrors,
}) => {
  await startSector(page, 2, '');
  await expect.poll(async () => (await playerShots(page)).length).toBeGreaterThan(0);
  if (!isMobile) await page.keyboard.press('KeyQ');
  await page.waitForTimeout(300);
  expect(await shownTexts(page)).not.toContain('LANCE');
  if (isMobile) await page.screenshot({ path: test.info().outputPath('no-swap-key.png') });
  await openPause(page, isMobile);
  await expect(page.getByRole('tab', { name: 'SYSTEMS' })).toBeHidden();
  assertNoBrowserErrors();
});

test('switching support to Wingman from the pause panel launches the drone; switching away removes it', async ({
  page,
  isMobile,
  assertNoBrowserErrors,
}) => {
  test.setTimeout(90_000);
  await startSector(page, 6, 'lance,surgeCore');
  await expect.poll(async () => (await playerShots(page)).length).toBeGreaterThan(0);
  expect(await wingmanDrones(page)).toBe(0);

  const swapSupport = async (expected: string): Promise<void> => {
    await openPause(page, isMobile);
    await page.getByRole('tab', { name: 'SYSTEMS' }).click();
    const support = systemRow(page, 'SUPPORT SYSTEM');
    await support.getByRole('button', { name: /^Swap support system/ }).click();
    await expect(support).toContainText(expected);
    await page.screenshot({ path: test.info().outputPath(`pause-support-${expected.toLowerCase()}.png`) });
    await page.getByRole('button', { name: 'RESUME' }).click();
    await expect(page.getByRole('dialog', { name: 'Paused' })).toBeHidden();
  };

  await swapSupport('WINGMAN');
  await expect.poll(() => wingmanDrones(page)).toBe(1);
  await swapSupport('MAGNET');
  await expect.poll(() => wingmanDrones(page)).toBe(0);
  assertNoBrowserErrors();
});

test('a swapped gun carries into the next sector and is what a checkpoint stores @desktop-only', async ({
  page,
  assertNoBrowserErrors,
}) => {
  test.setTimeout(120_000);
  await startSector(page, 3, 'lance');
  await expect.poll(async () => (await playerShots(page)).length).toBeGreaterThan(0);
  await page.keyboard.press('KeyQ');
  await expect.poll(() => shownTexts(page)).toContain('SCATTER');

  // Checkpoint with Scatter, then fly on to the next sector.
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Save to SLOT 1' }).click();
  await expect(page.getByText(/checkpoint to slot 1/)).toBeVisible();
  await page.getByRole('button', { name: 'RESUME' }).click();
  await page.evaluate(() => window.__SPACE_EXPLORER_BROWSER_HARNESS__!.showPlanetIntermission(3));
  await page.getByRole('button', { name: /Continue to/ }).click();
  await waitForScene(page, 'Game');

  await page.keyboard.press('Escape');
  await page.getByRole('tab', { name: 'SYSTEMS' }).click();
  await expect(systemRow(page, 'MAIN GUN')).toContainText('SCATTER');
  await page.getByRole('button', { name: 'RESUME' }).click();

  // Swap on to Seekers, then load the checkpoint: it brings back the Scatter it stored.
  await page.waitForTimeout(300);
  await page.keyboard.press('KeyQ');
  await expect.poll(() => shownTexts(page)).toContain('SEEKERS');
  await page.keyboard.press('Escape');
  await page
    .getByRole('button', { name: /^Load / })
    .first()
    .click();
  await waitForScene(page, 'Game');
  await expect.poll(async () => (await playerShots(page)).length).toBeGreaterThan(0);
  await page.keyboard.press('Escape');
  await page.getByRole('tab', { name: 'SYSTEMS' }).click();
  await expect(systemRow(page, 'MAIN GUN')).toContainText('SCATTER');
  assertNoBrowserErrors();
});
