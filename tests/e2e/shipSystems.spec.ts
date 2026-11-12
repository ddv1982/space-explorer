import { expect, openMenu, pinQualityTier, snapshot, startNewRun, test, waitForScene } from './fixtures';

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

  // The run waits for the pick: a plain key does not carry on to the next sector.
  await page.keyboard.press('KeyX');
  await page.waitForTimeout(600);
  expect((await snapshot(page)).activeScenes).toContain('PlanetIntermission');
  await expect(dialog).toBeVisible();

  await dialog.getByRole('button', { name: /^SCATTER/ }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
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
    await expect(page.getByText('SYSTEMS: SCATTER')).toBeVisible();
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
    const [gun, support, late] = systems.split(',');
    const label = { surgeCore: 'SURGE CORE' }[support] ?? support.toUpperCase();
    await expect(page.getByText(`SYSTEMS: ${gun.toUpperCase()} · ${label} · ${late.toUpperCase()}`)).toBeVisible();
    await page.screenshot({ path: test.info().outputPath(`systems-${gun}.png`) });
  }
  assertNoBrowserErrors();
});
