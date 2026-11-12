import { expect, openMenu, openMenuSettings, pinQualityTier, snapshot, startNewRun, test } from './fixtures';

test('a hull hit holds gameplay for a moment, then real time resumes', async ({ page, assertNoBrowserErrors }) => {
  await pinQualityTier(page, 'low');
  await openMenu(page);
  await startNewRun(page);
  await expect.poll(async () => (await snapshot(page)).physicsTimeScale).toBe(1);

  const timeScaleAfterHit = await page.evaluate(() => {
    const harness = window.__SPACE_EXPLORER_BROWSER_HARNESS__!;
    harness.probeAcceptedPlayerDamage(1);
    return harness.snapshot().physicsTimeScale;
  });
  expect(timeScaleAfterHit, 'physics runs slower during the hit-stop').toBeGreaterThan(1);
  await expect.poll(async () => (await snapshot(page)).physicsTimeScale, { timeout: 2_000 }).toBe(1);
  assertNoBrowserErrors();
});

test('screen shake can be turned off and the choice survives a reload', async ({ page, assertNoBrowserErrors }) => {
  await openMenu(page);
  await openMenuSettings(page);
  await expect(page.getByText('SCREEN SHAKE: ON')).toBeVisible();
  const off = page.getByRole('group', { name: 'Screen shake' }).getByRole('button', { name: 'OFF', exact: true });
  await expect(off).toBeInViewport();
  await off.click();
  await expect(page.getByText('SCREEN SHAKE: OFF')).toBeVisible();
  expect(await page.evaluate(() => window.localStorage.getItem('space-explorer.motion.v1'))).toBe(
    JSON.stringify({ screenShake: false })
  );
  await page.screenshot({ path: test.info().outputPath('settings-screen-shake.png') });

  await page.reload();
  await openMenuSettings(page);
  await expect(page.getByText('SCREEN SHAKE: OFF')).toBeVisible();
  await page.evaluate(() => window.localStorage.removeItem('space-explorer.motion.v1'));
  assertNoBrowserErrors();
});
