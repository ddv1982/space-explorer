import { expect, openMenu, test, waitForScene } from './fixtures';

async function namedActions(page: import('@playwright/test').Page, label: string): Promise<string[]> {
  return page
    .locator(`nav[aria-label="${label}"] button`)
    .evaluateAll((buttons) => buttons.map((button) => button.textContent?.trim() ?? ''));
}

async function activateNamedAction(page: import('@playwright/test').Page, name: string): Promise<void> {
  // The layer is visually hidden under the canvas. A pointer click hits the
  // canvas, not the named control. DOM activation is what a keyboard or AT
  // user actually does.
  await page.getByRole('button', { name }).evaluate((button) => {
    (button as HTMLButtonElement).click();
  });
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

  await activateNamedAction(page, 'New run');
  await waitForScene(page, 'Game');

  // Phaser JustDown only sees Escape if it is still held on a game frame.
  // A Playwright press() is down+up between frames, so the toggle never
  // fires. Mobile pause is the HUD tap, same as the other browser specs.
  const mobile = test.info().project.name.includes('mobile');
  if (mobile) {
    const viewport = page.viewportSize();
    await page.touchscreen.tap((viewport?.width ?? 844) - 44, 106);
  } else {
    await page.keyboard.down('Escape');
  }
  try {
    await expect.poll(() => namedActions(page, 'Paused')).toEqual(expect.arrayContaining(['Resume', 'Main menu']));
  } finally {
    if (!mobile) {
      await page.keyboard.up('Escape');
    }
  }
  await activateNamedAction(page, 'Resume');

  await expect.poll(async () => (await page.locator('nav[aria-label="Paused"]').count()) === 0).toBe(true);

  assertNoBrowserErrors();
});
