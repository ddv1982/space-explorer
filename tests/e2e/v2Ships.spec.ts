import { expect, openMenu, snapshot, startNewRun, test } from './fixtures';

test('v2 player sheet shows the level frame at rest and a banked frame while strafing', async ({
  page,
  assertNoBrowserErrors,
}) => {
  await openMenu(page);
  await startNewRun(page);
  const playerFrame = async () =>
    (await snapshot(page)).objects.find((object) => object.active && object.textureKey === 'player-ship')?.frameName;

  await expect.poll(playerFrame).toBe('4');
  await page.keyboard.down('ArrowRight');
  try {
    await expect.poll(async () => Number(await playerFrame()), { timeout: 20_000 }).toBeGreaterThanOrEqual(7);
  } finally {
    await page.keyboard.up('ArrowRight');
  }
  await expect.poll(playerFrame, { timeout: 20_000 }).toBe('4');
  await page.keyboard.down('ArrowLeft');
  try {
    await expect.poll(async () => Number(await playerFrame()), { timeout: 20_000 }).toBeLessThanOrEqual(1);
  } finally {
    await page.keyboard.up('ArrowLeft');
  }
  assertNoBrowserErrors();
});
