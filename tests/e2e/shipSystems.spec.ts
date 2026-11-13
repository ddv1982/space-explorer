import { expect, openMenu, pinQualityTier, snapshot, startNewRun, test, waitForScene, type Page } from './fixtures';

/** The pause panel's SYSTEMS card for one slot, e.g. `SUPPORT SYSTEM`. */
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
  // Phaser only sees Escape if it is still held on a game frame, so hold it until the panel shows.
  if (isMobile) await page.touchscreen.tap(TOUCH_KEY_X, TOUCH_PAUSE_Y);
  else await page.keyboard.down('Escape');
  await expect(page.getByRole('dialog', { name: 'Paused' })).toBeVisible();
  if (!isMobile) await page.keyboard.up('Escape');
}

/** The keyboard's first-swap hint beside the HUD charge bar in sector 3. */
const SWAP_HINT = 'Q  SPECIAL GUN';

async function gunState(page: Page) {
  return (await snapshot(page)).gun;
}

test('clearing sector 2 explains the special guns once, with nothing to pick; sector 3 points at the swap until it is used', async ({
  page,
  isMobile,
  assertNoBrowserErrors,
}) => {
  test.setTimeout(120_000);
  await pinQualityTier(page, 'low');
  await openMenu(page);
  await startNewRun(page);
  const continueButton = page.getByRole('button', { name: /Continue to/ });
  const card = page.getByRole('dialog', { name: 'SPECIAL GUNS ONLINE' });

  // Sector 1's refit bay goes straight to the upgrades.
  await page.evaluate(() => window.__SPACE_EXPLORER_BROWSER_HARNESS__!.showPlanetIntermission(1));
  await waitForScene(page, 'PlanetIntermission');
  await expect(continueButton).toBeVisible();
  await expect(page.getByRole('dialog')).toHaveCount(0);

  // Sector 2's opens on the card: one CONTINUE, no options, the bay out of reach behind it.
  await page.evaluate(() => window.__SPACE_EXPLORER_BROWSER_HARNESS__!.showPlanetIntermission(2));
  await expect(card).toBeVisible();
  await expect(card.getByRole('button')).toHaveCount(1);
  const done = card.getByRole('button', { name: 'CONTINUE' });
  await expect(done).toBeFocused();
  await expect(card).toContainText('LANCE');
  await expect(card).toContainText(isMobile ? 'Tap the swap key' : 'Press Q');
  await expect(card).not.toContainText(isMobile ? 'Press Q' : 'Tap the swap key');
  expect(await page.locator('.refit').evaluate((element) => (element.closest('.ui-layer') as HTMLElement).inert)).toBe(
    true
  );
  await expect(page.getByRole('group', { name: 'Ship systems' })).toHaveCount(0);
  await page.screenshot({ path: test.info().outputPath('special-gun-intro.png') });

  if (isMobile) await done.tap();
  else await page.keyboard.press('Enter');
  await expect(card).toHaveCount(0);
  await expect(continueButton).toBeVisible();
  await expect(continueButton).toBeInViewport();
  // Closing the card did not carry on to the next sector.
  expect((await snapshot(page)).activeScenes).toContain('PlanetIntermission');
  await page.screenshot({ path: test.info().outputPath('refit-after-sector-2.png') });

  // Sector 3 flies Lance with a full charge, and the swap is pointed out until the first one.
  await continueButton.click();
  await waitForScene(page, 'Game');
  await expect.poll(() => gunState(page)).toEqual({ id: 'lance', charge: 1 });
  await expect.poll(() => shownTexts(page)).toContain('LANCE');
  // The keyboard gets a label by the charge bar; touch gets a pulse on the swap key instead.
  if (isMobile) expect(await shownTexts(page)).not.toContain(SWAP_HINT);
  else await expect.poll(() => shownTexts(page)).toContain(SWAP_HINT);
  await page.screenshot({ path: test.info().outputPath('sector-3-swap-hint.png') });

  if (isMobile) await page.touchscreen.tap(TOUCH_KEY_X, TOUCH_SWAP_Y);
  else await page.keyboard.press('KeyQ');
  await expect.poll(async () => (await gunState(page))?.id).toBe('scatter');
  await expect.poll(() => shownTexts(page)).not.toContain(SWAP_HINT);
  await page.screenshot({ path: test.info().outputPath('sector-3-after-swap.png') });

  // A later run that clears sector 2 again sees the card again; no other refit bay shows it.
  await page.evaluate(() => window.__SPACE_EXPLORER_BROWSER_HARNESS__!.showPlanetIntermission(2));
  await expect(card).toBeVisible();
  await card.getByRole('button', { name: 'CONTINUE' }).click();
  await expect(card).toHaveCount(0);
  await page.evaluate(() => window.__SPACE_EXPLORER_BROWSER_HARNESS__!.showPlanetIntermission(3));
  await waitForScene(page, 'PlanetIntermission');
  await expect(page.getByRole('button', { name: /Continue to/ })).toBeVisible();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  assertNoBrowserErrors();
});

test('a picked system can be kept or swapped for free at a later refit bay, and the next sector flies the swap', async ({
  page,
  isMobile,
  assertNoBrowserErrors,
}) => {
  test.setTimeout(120_000);
  await startSector(page, 6, 'magnet');
  await page.evaluate(() => window.__SPACE_EXPLORER_BROWSER_HARNESS__!.showPlanetIntermission(6));
  await waitForScene(page, 'PlanetIntermission');
  const systems = page.getByRole('group', { name: 'Ship systems' });
  await expect(systems.getByRole('button', { name: /^Swap main gun/ })).toHaveCount(0);
  const support = systems.getByRole('button', { name: /^Swap support system/ });
  await expect(support).toHaveAccessibleName('Swap support system, now MAGNET');
  await expect(support).toBeInViewport({ ratio: 1 });
  await page.screenshot({ path: test.info().outputPath('refit-systems.png') });

  // Reopening shows the same three options with the current one marked and focused. Dismissing keeps it:
  // Escape on a keyboard, the current option on touch.
  const dialog = page.getByRole('dialog', { name: 'SWAP YOUR SUPPORT SYSTEM' });
  const current = dialog.getByRole('button', { name: /^MAGNET/ });
  await support.click();
  await expect(current).toHaveAttribute('aria-pressed', 'true');
  await expect(current).toBeFocused();
  await expect(dialog.getByRole('button', { name: /^WINGMAN/ })).toHaveAttribute('aria-pressed', 'false');
  expect(await page.locator('.refit').evaluate((element) => (element.closest('.ui-layer') as HTMLElement).inert)).toBe(
    true
  );
  if (isMobile) await current.tap();
  else await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await expect(support).toHaveAccessibleName('Swap support system, now MAGNET');
  await expect(support).toBeFocused();
  // Neither opening nor closing the dialog carried on to the next sector.
  await page.waitForTimeout(600);
  expect((await snapshot(page)).activeScenes).toContain('PlanetIntermission');

  await support.click();
  await dialog.getByRole('button', { name: /^WINGMAN/ }).click();
  await expect(support).toHaveAccessibleName('Swap support system, now WINGMAN');
  await page.getByRole('button', { name: /Continue to/ }).click();
  await waitForScene(page, 'Game');
  await expect.poll(() => wingmanDrones(page)).toBe(1);
  await openPause(page, isMobile);
  await page.getByRole('tab', { name: 'SYSTEMS' }).click();
  await expect(systemRow(page, 'SUPPORT SYSTEM')).toContainText('WINGMAN');
  await expect(systemRow(page, 'MAIN GUN')).toHaveCount(0);
  await page.screenshot({ path: test.info().outputPath('pause-systems-tab.png') });
  assertNoBrowserErrors();
});

test('every ship system runs in a real sector without errors', async ({ page, isMobile, assertNoBrowserErrors }) => {
  test.skip(isMobile, 'covered once on desktop; systems do not depend on the input device');
  test.setTimeout(180_000);
  await pinQualityTier(page, 'low');
  await page.addInitScript(() =>
    window.localStorage.setItem('space-explorer.autoFire.v1', JSON.stringify({ touch: true, keyboard: true }))
  );
  for (const systems of ['magnet,overdrive', 'surgeCore,bulwark', 'wingman,salvager']) {
    await page.goto(`/?browserHarness=1&startLevel=9&systems=${systems}`);
    await waitForScene(page, 'Game');
    await expect
      .poll(async () => (await snapshot(page)).objects.some((o) => o.active && o.textureKey === 'player-bullet'))
      .toBe(true);
    // Fly a sweep with each gun: Lance, then both special guns.
    for (let sweep = 0; sweep < 6; sweep += 1) {
      if (sweep % 2 === 0 && sweep > 0) await page.keyboard.press('KeyQ');
      const key = sweep % 2 ? 'ArrowLeft' : 'ArrowRight';
      await page.keyboard.down(key);
      await page.waitForTimeout(900);
      await page.keyboard.up(key);
    }
    await openPause(page, false);
    await page.getByRole('tab', { name: 'SYSTEMS' }).click();
    const [support, late] = systems.split(',');
    const label = { surgeCore: 'SURGE CORE' }[support] ?? support.toUpperCase();
    await expect(systemRow(page, 'SUPPORT SYSTEM')).toContainText(label);
    await expect(systemRow(page, 'COMBAT DOCTRINE')).toContainText(late.toUpperCase());
    await page.screenshot({ path: test.info().outputPath(`systems-${support}.png`) });
  }
  assertNoBrowserErrors();
});

test('in sector 3 the swap key borrows a special gun until the charge runs out, then Lance comes back', async ({
  page,
  isMobile,
  assertNoBrowserErrors,
}) => {
  test.setTimeout(120_000);
  await startSector(page, 3, '');
  const swap = async (): Promise<void> => {
    if (isMobile) await page.touchscreen.tap(TOUCH_KEY_X, TOUCH_SWAP_Y);
    else await page.keyboard.press('KeyQ');
  };

  // Lance fires long piercing bolts straight ahead, and the meter starts full.
  await expect.poll(async () => (await playerShots(page)).length).toBeGreaterThan(0);
  expect((await playerShots(page)).every((shot) => Math.abs(shot.rotation) < 0.01 && shot.frameName === 'lance')).toBe(
    true
  );
  expect(await gunState(page)).toEqual({ id: 'lance', charge: 1 });
  await expect.poll(() => shownTexts(page)).toContain('LANCE');
  await page.screenshot({ path: test.info().outputPath('lance-full-charge.png') });

  await swap();
  await expect.poll(async () => (await gunState(page))?.id).toBe('scatter');
  await expect.poll(() => shownTexts(page)).toContain('SCATTER');
  // Scatter fans its shots, and they are pellets; the charge drains while it is out.
  await expect
    .poll(async () =>
      (await playerShots(page)).some((shot) => Math.abs(shot.rotation) > 0.1 && shot.frameName === 'pellet')
    )
    .toBe(true);
  await expect.poll(async () => (await gunState(page))?.charge ?? 1, { timeout: 30_000 }).toBeLessThan(0.7);
  await page.screenshot({ path: test.info().outputPath('special-gun-draining.png') });

  // On to Seekers is always allowed, and the empty meter hands back Lance on its own.
  await swap();
  await expect.poll(async () => (await gunState(page))?.id).toBe('seekers');
  await expect.poll(async () => (await gunState(page))?.id, { timeout: 90_000 }).toBe('lance');
  // It comes back nearly empty and refills from there (the refusal below the threshold is unit-tested).
  expect((await gunState(page))!.charge).toBeLessThan(0.5);
  await expect.poll(() => shownTexts(page)).toContain('LANCE');
  assertNoBrowserErrors();
});

test('sectors 1-2 have no swap: Q does nothing, no meter, and the pause panel has no SYSTEMS tab', async ({
  page,
  isMobile,
  assertNoBrowserErrors,
}) => {
  await startSector(page, 2, '');
  await expect.poll(async () => (await playerShots(page)).length).toBeGreaterThan(0);
  if (!isMobile) await page.keyboard.press('KeyQ');
  await page.waitForTimeout(300);
  expect(await shownTexts(page)).not.toContain('LANCE');
  expect(await gunState(page)).toBeNull();
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
  await startSector(page, 6, 'surgeCore');
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

test('leaving the refit bay autosaves the run, picks included, until the run ends', async ({
  page,
  isMobile,
  assertNoBrowserErrors,
}) => {
  test.setTimeout(120_000);
  await pinQualityTier(page, 'low');
  await openMenu(page);
  await expect(page.getByRole('button', { name: /^Load AUTOSAVE/ })).toHaveCount(0);
  await startNewRun(page);

  await page.evaluate(() => window.__SPACE_EXPLORER_BROWSER_HARNESS__!.showPlanetIntermission(5));
  await page
    .getByRole('dialog', { name: 'CHOOSE YOUR SUPPORT SYSTEM' })
    .getByRole('button', { name: /^MAGNET/ })
    .click();
  await page.getByRole('button', { name: /Continue to/ }).click();
  await waitForScene(page, 'Game');

  // Closing the tab mid-sector keeps the run: the menu offers it as its own entry beside the slots.
  await page.reload();
  await waitForScene(page, 'Menu');
  const autosave = page.getByRole('button', { name: /^Load AUTOSAVE/ });
  await expect(autosave).toBeVisible();
  await expect(autosave).toContainText('LVL 6');
  await expect(autosave).toContainText('SYSTEMS: MAGNET');
  await page.screenshot({ path: test.info().outputPath('menu-autosave.png') });

  await autosave.click();
  await waitForScene(page, 'Game');
  await openPause(page, isMobile);
  await page.getByRole('tab', { name: 'SYSTEMS' }).click();
  await expect(systemRow(page, 'SUPPORT SYSTEM')).toContainText('MAGNET');
  // The autosave is not one of the pause panel's checkpoints.
  await expect(page.getByRole('button', { name: /AUTOSAVE/ })).toHaveCount(0);

  // A finished run is never offered again.
  await page.evaluate(() => window.__SPACE_EXPLORER_BROWSER_HARNESS__!.route('GameOver'));
  await waitForScene(page, 'GameOver');
  await page.reload();
  await waitForScene(page, 'Menu');
  await expect(page.getByRole('button', { name: /^Load AUTOSAVE/ })).toHaveCount(0);
  assertNoBrowserErrors();
});
