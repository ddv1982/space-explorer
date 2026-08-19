import { expect, openMenu, test, waitForScene } from './fixtures';

async function namedActions(page: import('@playwright/test').Page, label: string): Promise<string[]> {
  return page
    .locator(`nav[aria-label="${label}"] button`)
    .evaluateAll((buttons) => buttons.map((button) => button.textContent?.trim() ?? ''));
}

test('exposes named menu, pause, and intermission actions without a second painted UI', async ({
  page,
  assertNoBrowserErrors,
}) => {
  await openMenu(page);

  await expect(page.locator('nav[aria-label="Command deck"]')).toHaveCount(1);
  await expect
    .poll(() => namedActions(page, 'Command deck'))
    .toEqual(expect.arrayContaining(['New run', 'Load slot 1', 'Delete slot 1']));
  await expect(page.locator('#game-root canvas')).toHaveAttribute('aria-hidden', 'true');

  await page.getByRole('button', { name: 'New run' }).click();
  await waitForScene(page, 'Game');

  await page.keyboard.press('Escape');
  await expect.poll(() => namedActions(page, 'Paused')).toEqual(expect.arrayContaining(['Resume', 'Main menu']));
  await page.getByRole('button', { name: 'Resume' }).click();

  await expect.poll(async () => (await page.locator('nav[aria-label="Paused"]').count()) === 0).toBe(true);

  assertNoBrowserErrors();
});
