import type { Page } from '@playwright/test';
import { expect, openMenu, openMenuSettings, snapshot, startNewRun, test } from './fixtures';

function toggle(page: Page, group: string, value: 'ON' | 'OFF') {
  return page.getByRole('group', { name: group }).getByRole('button', { name: value, exact: true });
}

async function playerBulletActive(page: Page): Promise<boolean> {
  return (await snapshot(page)).objects.some((object) => object.active && object.textureKey === 'player-bullet');
}

async function hintShown(page: Page, text: string): Promise<boolean> {
  return (await snapshot(page)).texts.some((item) => item.text === text);
}

test('keyboard autofire is off by default and fires on its own once enabled', async ({
  page,
  isMobile,
  assertNoBrowserErrors,
}) => {
  test.setTimeout(120_000);
  await openMenu(page);
  await openMenuSettings(page);
  const keysGroup = isMobile ? 'Keys autofire' : 'Autofire';
  if (isMobile) {
    // Without a keyboard, touch flight autofires; the row says so and can be turned off.
    await expect(page.getByText('TOUCH AUTOFIRE: ON')).toBeVisible();
    await expect(toggle(page, 'Touch autofire', 'OFF')).toBeInViewport();
    await expect(page.getByText('KEYS AUTOFIRE: OFF')).toBeVisible();
  } else {
    await expect(page.getByText('AUTOFIRE: OFF')).toBeVisible();
    await expect(page.getByRole('group', { name: 'Touch autofire' })).toHaveCount(0);
  }
  await expect(toggle(page, keysGroup, 'ON')).toBeInViewport();
  await page.screenshot({ path: test.info().outputPath('settings-default.png') });

  // Default: a keyboard player who presses nothing does not fire.
  await page.getByRole('button', { name: 'DONE', exact: true }).click();
  await startNewRun(page);
  if (isMobile) await page.keyboard.press('ArrowLeft');
  await expect.poll(() => hintShown(page, 'SPACE / Click to Fire')).toBe(true);
  await page.waitForTimeout(2_500);
  expect(await playerBulletActive(page)).toBe(false);

  // Enable keyboard autofire from the menu: stored, hinted, and the gun fires with no input held.
  await openMenu(page);
  await openMenuSettings(page);
  await toggle(page, keysGroup, 'ON').click();
  await expect(page.getByText(`${keysGroup.toUpperCase()}: ON`)).toBeVisible();
  expect(await page.evaluate(() => window.localStorage.getItem('space-explorer.autoFire.v1'))).toBe(
    JSON.stringify({ touch: true, keyboard: true })
  );
  await page.screenshot({ path: test.info().outputPath('settings-keys-on.png') });
  await page.getByRole('button', { name: 'DONE', exact: true }).click();
  if (!isMobile) await expect(page.getByText(/GUNS FIRE AUTOMATICALLY/)).toBeVisible();
  await startNewRun(page);
  if (isMobile) await page.keyboard.press('ArrowLeft');
  await expect.poll(() => hintShown(page, 'Guns fire automatically')).toBe(true);
  await expect.poll(() => playerBulletActive(page), { timeout: 15_000 }).toBe(true);

  await page.evaluate(() => window.localStorage.removeItem('space-explorer.autoFire.v1'));
  assertNoBrowserErrors();
});

test('touch autofire can be turned off so the gun fires only while touching', async ({
  page,
  isMobile,
  assertNoBrowserErrors,
}) => {
  test.skip(!isMobile, 'touch autofire applies to touch devices');
  test.setTimeout(120_000);
  await openMenu(page);
  await openMenuSettings(page);
  await toggle(page, 'Touch autofire', 'OFF').click();
  await expect(page.getByText('TOUCH AUTOFIRE: OFF')).toBeVisible();
  await page.getByRole('button', { name: 'DONE', exact: true }).click();
  await startNewRun(page);
  await expect.poll(() => hintShown(page, 'Guns fire while you touch')).toBe(true);
  await page.waitForTimeout(2_500);
  expect(await playerBulletActive(page)).toBe(false);

  const touch = await page.context().newCDPSession(page);
  const viewport = page.viewportSize();
  if (!viewport) throw new Error('Missing touch viewport');
  try {
    await touch.send('Input.dispatchTouchEvent', {
      type: 'touchStart',
      touchPoints: [{ x: viewport.width * 0.5, y: viewport.height * 0.7 }],
    });
    await expect.poll(() => playerBulletActive(page), { timeout: 15_000 }).toBe(true);
  } finally {
    await touch.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await touch.detach();
  }

  await page.evaluate(() => window.localStorage.removeItem('space-explorer.autoFire.v1'));
  assertNoBrowserErrors();
});
