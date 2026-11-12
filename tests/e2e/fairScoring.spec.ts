import { expect, openMenu, pinQualityTier, snapshot, startNewRun, test, waitForScene } from './fixtures';

test('buying an upgrade spends credits, not score, and the end screen keeps a personal best', async ({
  page,
  assertNoBrowserErrors,
}) => {
  test.setTimeout(120_000);
  await pinQualityTier(page, 'low');
  await openMenu(page);
  await startNewRun(page);
  await page.evaluate(() => window.__SPACE_EXPLORER_BROWSER_HARNESS__!.showPlanetIntermission(1));
  await waitForScene(page, 'PlanetIntermission');

  // The harness grants 8,000 points; hull armour costs 500 credits.
  await expect(page.getByText('CREDITS 8000')).toBeVisible();
  await page.getByRole('button', { name: /HULL ARMOR/ }).click();
  await expect(page.getByText('CREDITS 7500')).toBeVisible();
  await page.screenshot({ path: test.info().outputPath('refit-after-purchase.png') });

  await page.getByRole('button', { name: /Continue to/ }).click();
  await waitForScene(page, 'Game');

  // Lose the run: the score that was earned is the score that is shown, and it becomes the best.
  for (let life = 0; life < 6 && !(await snapshot(page)).activeScenes.includes('GameOver'); life += 1) {
    await page
      .evaluate(() => window.__SPACE_EXPLORER_BROWSER_HARNESS__!.probeAcceptedPlayerDamage(999))
      .catch(() => undefined);
    await page.waitForTimeout(2_500);
  }
  await waitForScene(page, 'GameOver');
  const summary = page.getByRole('region', { name: 'Game over' });
  await expect(summary).toContainText('NEW BEST');
  // Touch autofire may add a few kills on top of the 8,000; the 500 spent must not be missing.
  const finalScore = Number((await summary.getByRole('status').textContent())?.match(/Final score (\d+)/)?.[1]);
  expect(finalScore).toBeGreaterThanOrEqual(8000);
  await expect(summary).toContainText(`NEXT RUN: BEAT ${finalScore}`);
  await page.screenshot({ path: test.info().outputPath('game-over-new-best.png') });
  expect(await page.evaluate(() => window.localStorage.getItem('space-explorer.personalBest.v1'))).toBe(
    JSON.stringify({ low: 0, normal: finalScore, high: 0 })
  );
  await page.evaluate(() => window.localStorage.removeItem('space-explorer.personalBest.v1'));
  assertNoBrowserErrors();
});
