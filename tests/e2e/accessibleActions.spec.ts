import { expect, openMenu, pressControl, snapshot, startNewRun, test, waitForScene, type Page } from './fixtures';

async function activateNamedAction(page: Page, name: string): Promise<void> {
  await pressControl(page.getByRole('button', { name, exact: true }));
}

test('menu and pause are native, named HTML controls with no second painted UI', async ({
  page,
  assertNoBrowserErrors,
}) => {
  test.setTimeout(120_000);
  await openMenu(page);

  await expect(page.locator('#game-root canvas')).toHaveAttribute('aria-hidden', 'true');
  await expect(page.getByRole('heading', { name: 'SPACE EXPLORER' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'NEW RUN', exact: true })).toBeEnabled();
  await expect(page.getByRole('button', { name: 'Load SLOT 1' })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Delete SLOT 1' })).toHaveCount(0);

  await pressControl(page.getByRole('button', { name: 'SETTINGS', exact: true }));
  const sheet = page.getByRole('dialog', { name: 'SETTINGS' });
  await expect(sheet).toBeVisible();
  const difficultyLow = page.getByRole('group', { name: 'Difficulty' }).getByRole('button', { name: 'LOW' });
  await pressControl(difficultyLow);
  await expect(difficultyLow).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByText('Difficulty set to LOW.')).toHaveAttribute('aria-live', 'polite');

  // Sliders answer both the keyboard and a pointer on their track.
  const volume = page.getByRole('slider', { name: 'MUSIC VOLUME' });
  const before = Number(await volume.inputValue());
  await pressControl(volume, 'ArrowLeft');
  await expect(volume).toHaveValue(String(before - 1));
  await expect(volume).toHaveAttribute('aria-valuetext', `${before - 1}%`);
  const track = await volume.boundingBox();
  await page.mouse.click((track?.x ?? 0) + 2, (track?.y ?? 0) + (track?.height ?? 0) / 2);
  await expect(volume).toHaveValue('0');

  // Escape reaches the game through a focused control and closes the sheet.
  await page.keyboard.press('Escape');
  await expect(sheet).toBeHidden();

  await pressControl(page.getByRole('button', { name: 'NEW RUN', exact: true }));
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
    await expect(page.getByRole('dialog', { name: 'Paused' })).toBeVisible();
  } finally {
    if (!mobile) await page.keyboard.up('Escape');
  }
  const checkpoints = page.getByRole('tab', { name: 'CHECKPOINTS' });
  const settings = page.getByRole('tab', { name: 'SETTINGS' });
  await expect(checkpoints).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByRole('button', { name: 'Save to SLOT 1' })).toBeEnabled();
  await expect(page.getByRole('button', { name: 'Load SLOT 1' })).toBeDisabled();

  await pressControl(settings);
  await expect(settings).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByRole('button', { name: 'Save to SLOT 1' })).toHaveCount(0);
  await expect(page.getByRole('group', { name: 'Difficulty' }).getByRole('button', { name: 'LOW' })).toHaveAttribute(
    'aria-pressed',
    'true'
  );
  await expect(page.getByText('Quality applies after restart.')).toBeVisible();
  const pauseVolume = page.getByRole('slider', { name: 'MUSIC VOLUME' });
  await pressControl(pauseVolume, 'ArrowRight');
  await expect(pauseVolume).toHaveValue('1');
  expect((await snapshot(page)).physicsPaused).toBe(true);

  await pressControl(page.getByRole('button', { name: 'RESUME', exact: true }));
  await expect(page.getByRole('dialog', { name: 'Paused' })).toBeHidden();
  await expect.poll(async () => (await snapshot(page)).physicsPaused).toBe(false);

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
  const intermission = page.getByRole('region', { name: 'Planet intermission' });
  await expect(intermission.getByRole('status')).toContainText('Level 1 complete');
  await expect(intermission.getByRole('button', { name: 'Continue to Tideglass Shallows', exact: true })).toBeEnabled();
  await expect(intermission.getByRole('button', { name: 'Buy HULL ARMOR', exact: true })).toBeEnabled();
  await expect(intermission.getByRole('button', { name: 'Buy FIRE RATE', exact: true })).toBeDisabled();
  // Only the controls take the pointer: a tap on the header text falls through to the canvas.
  await expect(intermission.getByRole('heading')).toHaveCSS('pointer-events', 'none');

  await page.evaluate(async () => {
    const harness = window.__SPACE_EXPLORER_BROWSER_HARNESS__;
    if (!harness) throw new Error('Browser harness is not installed');
    await harness.route('Victory');
  });
  await waitForScene(page, 'Victory');
  await expect(page.getByRole('region', { name: 'Mission complete' }).getByRole('status')).toContainText('Final score');
  await activateNamedAction(page, 'Continue to command deck');
  await waitForScene(page, 'Menu');

  await page.evaluate(async () => {
    const harness = window.__SPACE_EXPLORER_BROWSER_HARNESS__;
    if (!harness) throw new Error('Browser harness is not installed');
    await harness.route('GameOver');
  });
  await waitForScene(page, 'GameOver');
  await expect(page.getByRole('region', { name: 'Game over' }).getByRole('status')).toContainText('Reached level');
  await activateNamedAction(page, 'MENU');
  await waitForScene(page, 'Menu');

  assertNoBrowserErrors();
});

async function readPersistedRun(page: Page) {
  return page.evaluate(() => {
    const recorder = window.__SPACE_EXPLORER_BROWSER_HARNESS__?.gameFeel;
    if (!recorder) throw new Error('Missing recorder');
    const recording = recorder.start({
      scenario: 'intermission native keyboard ownership',
      source: 'automation',
      buildSha: 'test',
      deviceLabel: 'browser',
      maxFrames: 2,
    });
    recorder.stop();
    return recording?.environment?.startingPersistedPlayerState;
  });
}

async function flushKeyboardQueue(page: Page): Promise<void> {
  await page.evaluate(
    () => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())))
  );
}

test('native intermission buttons purchase only their named upgrade and continue once', async ({
  page,
  assertNoBrowserErrors,
}) => {
  await openMenu(page);
  await startNewRun(page);
  await page.evaluate(async () => window.__SPACE_EXPLORER_BROWSER_HARNESS__?.showPlanetIntermission(1));
  await waitForScene(page, 'PlanetIntermission');
  expect(await readPersistedRun(page)).toMatchObject({
    level: 1,
    score: 8000,
    upgrades: { hp: 0, damage: 0, fireRate: 0 },
  });

  await activateNamedAction(page, 'Buy WEAPONS');
  await flushKeyboardQueue(page);
  expect(await readPersistedRun(page)).toMatchObject({
    level: 1,
    score: 7200,
    upgrades: { hp: 0, damage: 1, fireRate: 0 },
  });
  await page.getByRole('button', { name: 'Buy HULL ARMOR', exact: true }).focus();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: 'Continue to Tideglass Shallows', exact: true })).toBeFocused();
  await page.getByRole('button', { name: 'Buy HULL ARMOR', exact: true }).focus();
  await page.keyboard.press('Space');
  await flushKeyboardQueue(page);
  expect(await readPersistedRun(page)).toMatchObject({
    level: 1,
    score: 6700,
    upgrades: { hp: 1, damage: 1, fireRate: 0 },
  });

  await activateNamedAction(page, 'Continue to Tideglass Shallows');
  await waitForScene(page, 'Game');
  await flushKeyboardQueue(page);
  expect(await readPersistedRun(page)).toMatchObject({
    level: 2,
    score: 6700,
    upgrades: { hp: 1, damage: 1, fireRate: 0 },
  });
  await expect(page.getByRole('region', { name: 'Planet intermission' })).toHaveCount(0);
  assertNoBrowserErrors();
});
