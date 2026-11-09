import { expect, openMenu, pinQualityTier, snapshot, startNewRun, test } from './fixtures';

test('v2 player sheet shows the level frame at rest and a banked frame while strafing', async ({
  page,
  assertNoBrowserErrors,
}) => {
  // Inertial thrust needs ~0.5 s of gameplay to bank fully and a reversal ~1 s; CI's
  // software-rendered frames can stretch that to minutes, so wait on Low with generous polls.
  test.setTimeout(360_000);
  await pinQualityTier(page, 'low');
  await openMenu(page);
  await startNewRun(page);
  const playerFrame = async () =>
    (await snapshot(page)).objects.find((object) => object.active && object.textureKey === 'player-ship')?.frameName;

  await expect.poll(playerFrame).toBe('4');
  await page.keyboard.down('ArrowRight');
  try {
    await expect.poll(async () => Number(await playerFrame()), { timeout: 90_000 }).toBeGreaterThanOrEqual(7);
    // Reverse straight into a left bank: waiting out the inertial slide back to level would leave
    // the ship exposed to the opening wave for minutes of software-rendered wall time.
    await page.keyboard.up('ArrowRight');
    await page.keyboard.down('ArrowLeft');
    await expect.poll(async () => Number(await playerFrame()), { timeout: 90_000 }).toBeLessThanOrEqual(1);
  } finally {
    await page.keyboard.up('ArrowRight');
    await page.keyboard.up('ArrowLeft');
  }
  assertNoBrowserErrors();
});
