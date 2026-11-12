import { expect, openMenu, pinQualityTier, snapshot, startNewRun, test, waitForScene, type Page } from './fixtures';

async function readRunSeed(page: Page): Promise<number> {
  return page.evaluate(() => {
    const recorder = window.__SPACE_EXPLORER_BROWSER_HARNESS__!.gameFeel;
    const recording = recorder.start({
      scenario: 'run seed',
      source: 'automation',
      buildSha: 'test',
      deviceLabel: 'browser',
      maxFrames: 2,
    });
    recorder.stop();
    return (recording?.environment?.startingPersistedPlayerState as { runSeed: number }).runSeed;
  });
}

async function loseTheRun(page: Page): Promise<void> {
  for (let life = 0; life < 6 && !(await snapshot(page)).activeScenes.includes('GameOver'); life += 1) {
    await page
      .evaluate(() => window.__SPACE_EXPLORER_BROWSER_HARNESS__!.probeAcceptedPlayerDamage(999))
      .catch(() => undefined);
    await page.waitForTimeout(2_500);
  }
  await waitForScene(page, 'GameOver');
}

test('RETRY replays the same run seed and NEW RUN starts a different one', async ({ page, assertNoBrowserErrors }) => {
  test.setTimeout(120_000);
  await pinQualityTier(page, 'low');
  await openMenu(page);
  await startNewRun(page);
  const firstSeed = await readRunSeed(page);
  expect(firstSeed).toBeGreaterThan(0);

  await loseTheRun(page);
  // The button is plain RETRY: no seed or code is shown to the player.
  await expect(page.getByRole('region', { name: 'Game over' })).not.toContainText(/seed/i);
  await page.getByRole('button', { name: 'RETRY', exact: true }).click();
  await waitForScene(page, 'Game');
  expect(await readRunSeed(page)).toBe(firstSeed);

  await loseTheRun(page);
  await page.getByRole('button', { name: 'MENU', exact: true }).click();
  await waitForScene(page, 'Menu');
  await startNewRun(page);
  expect(await readRunSeed(page)).not.toBe(firstSeed);
  assertNoBrowserErrors();
});

test('the same seed draws the same sky, and another seed a different one', async ({
  page,
  isMobile,
  assertNoBrowserErrors,
}) => {
  test.skip(isMobile, 'the sky does not depend on the input device');
  test.setTimeout(120_000);
  // Stars as the snapshot reports them are not enough: compare what is actually drawn in a corner
  // of the sky that ships and the HUD do not reach in the first moments of sector 2.
  const skyCorner = async (seed: number): Promise<string> => {
    await page.goto(`/?browserHarness=1&startLevel=2&seed=${seed}`);
    await waitForScene(page, 'Game');
    await page.evaluate(() => window.__SPACE_EXPLORER_BROWSER_HARNESS__!.waitForRender());
    const shot = await page.screenshot({ clip: { x: 40, y: 560, width: 320, height: 140 } });
    return shot.toString('base64');
  };
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const first = await skyCorner(11);
  expect(await skyCorner(11)).toBe(first);
  expect(await skyCorner(12)).not.toBe(first);
  assertNoBrowserErrors();
});
