import { expect, openMenu, snapshot, test, waitForScene } from './fixtures';

async function namedActions(page: import('@playwright/test').Page, label: string): Promise<string[]> {
  return page
    .locator(`nav[aria-label="${label}"] button`)
    .evaluateAll((buttons) => buttons.map((button) => button.textContent?.trim() ?? ''));
}

async function activateNamedAction(page: import('@playwright/test').Page, name: string): Promise<void> {
  const button = page.getByRole('button', { name });
  await button.focus();
  await expect(button).toBeFocused();
  await button.press('Enter');
}

test('exposes named menu, pause, and intermission actions without a second painted UI', async ({
  page,
  assertNoBrowserErrors,
}) => {
  await openMenu(page);

  await expect(page.locator('nav[aria-label="Command deck"]')).toHaveCount(1);
  await expect
    .poll(() => namedActions(page, 'Command deck'))
    .toEqual(
      expect.arrayContaining([
        'New run',
        'Load SLOT 1',
        'Delete SLOT 1',
        'Set difficulty low',
        'Set visual quality high',
        'Increase music volume',
      ])
    );
  await expect(page.locator('#game-root canvas')).toHaveAttribute('aria-hidden', 'true');
  await expect(page.getByRole('button', { name: 'Load SLOT 1' })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Delete SLOT 1' })).toBeDisabled();
  await activateNamedAction(page, 'Set difficulty low');
  await expect(page.getByRole('button', { name: 'Set difficulty low' })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('#accessible-action-layer-status')).toContainText('Difficulty set to LOW');

  const menu = await snapshot(page);
  const creativityLabel = menu.texts.find((item) => item.text === 'CREATIVITY');
  const creativityValue = menu.texts
    .filter((item) => item.text.endsWith('%'))
    .find((item) => Math.abs(item.y - (creativityLabel?.y ?? -100)) < 20);
  expect(creativityLabel).toBeDefined();
  expect(creativityValue).toBeDefined();
  const semanticCreativity = page.getByRole('button', { name: 'Increase creativity' });
  const descriptionId = await semanticCreativity.getAttribute('aria-describedby');
  expect(descriptionId).toBeTruthy();
  const semanticDescription = page.locator(`[id="${descriptionId}"]`);
  const descriptionBefore = await semanticDescription.textContent();
  await page.mouse.click((creativityValue?.x ?? 0) - 70, creativityLabel?.y ?? 0);
  await expect(semanticDescription).not.toHaveText(descriptionBefore ?? '');

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
    await expect
      .poll(() => namedActions(page, 'Paused'))
      .toEqual(expect.arrayContaining(['Resume', 'Main menu', 'Checkpoints', 'Settings', 'Save to SLOT 1']));
  } finally {
    if (!mobile) await page.keyboard.up('Escape');
  }
  await expect(page.getByRole('button', { name: 'Checkpoints' })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('#accessible-action-layer-status')).not.toHaveText('');
  await activateNamedAction(page, 'Settings');
  await expect(page.getByRole('button', { name: 'Settings' })).toHaveAttribute('aria-pressed', 'true');
  await expect
    .poll(() => namedActions(page, 'Paused'))
    .toEqual(expect.arrayContaining(['Set difficulty normal', 'Set visual quality standard', 'Increase creativity']));
  await activateNamedAction(page, 'Increase creativity');
  await expect(page.locator('#accessible-action-layer-status')).toContainText('creativity');
  await activateNamedAction(page, 'Resume');

  await expect.poll(async () => (await page.locator('nav[aria-label="Paused"]').count()) === 0).toBe(true);

  assertNoBrowserErrors();
});

test('announces intermission and terminal summaries with semantic continuation', async ({
  page,
  assertNoBrowserErrors,
}) => {
  await openMenu(page);

  await page.evaluate(async () => {
    const harness = window.__SPACE_EXPLORER_BROWSER_HARNESS__;
    if (!harness) throw new Error('Browser harness is not installed');
    await harness.showPlanetIntermission(1);
  });
  await waitForScene(page, 'PlanetIntermission');
  await expect(page.locator('nav[aria-label="Planet intermission"]')).toContainText('Level 1 complete');
  await expect
    .poll(() => namedActions(page, 'Planet intermission'))
    .toEqual(expect.arrayContaining(['Continue to Tideglass Shallows', 'Buy HULL ARMOR']));

  await page.evaluate(async () => {
    const harness = window.__SPACE_EXPLORER_BROWSER_HARNESS__;
    if (!harness) throw new Error('Browser harness is not installed');
    await harness.route('Victory');
  });
  await waitForScene(page, 'Victory');
  await expect(page.locator('nav[aria-label="Mission complete"]')).toContainText('Final score');
  await activateNamedAction(page, 'Continue to command deck');
  await waitForScene(page, 'Menu');

  await page.evaluate(async () => {
    const harness = window.__SPACE_EXPLORER_BROWSER_HARNESS__;
    if (!harness) throw new Error('Browser harness is not installed');
    await harness.route('GameOver');
  });
  await waitForScene(page, 'GameOver');
  await expect(page.locator('nav[aria-label="Game over"]')).toContainText('Reached level');
  await activateNamedAction(page, 'Continue to command deck');
  await waitForScene(page, 'Menu');

  assertNoBrowserErrors();
});
