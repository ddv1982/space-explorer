import { expect, openMenu, snapshot, startNewRun, test, waitForScene } from './fixtures';

test('visual quality is selectable, responsive, and persists without a URL setting', async ({
  page,
  assertNoBrowserErrors,
}) => {
  test.setTimeout(120_000);
  const viewports = [
    { width: 1280, height: 720 },
    { width: 390, height: 844 },
    { width: 844, height: 390 },
  ];

  for (const viewport of viewports) {
    await page.setViewportSize(viewport);
    await openMenu(page);
    const menu = await snapshot(page);
    const qualityLabel = menu.texts.find((item) => item.text === 'QUALITY: STANDARD');
    const difficultyLabel = menu.texts.find((item) => item.text === 'DIFFICULTY: NORMAL');
    const highButtons = menu.texts.filter((item) => item.text === 'HIGH');
    const highButton = highButtons.find((item) => Math.abs(item.y - (qualityLabel?.y ?? -100)) < 12);
    const difficultyHighButton = highButtons.find((item) => Math.abs(item.y - (difficultyLabel?.y ?? -100)) < 12);
    expect(qualityLabel).toBeDefined();
    expect(difficultyLabel).toBeDefined();
    expect(highButton).toBeDefined();
    expect(difficultyHighButton).toBeDefined();
    expect(highButton?.x).toBeGreaterThan(0);
    expect(highButton?.x).toBeLessThan(viewport.width);
    expect(highButton?.y).toBeGreaterThan(0);
    expect(highButton?.y).toBeLessThan(viewport.height);

    await page.mouse.click(difficultyHighButton?.x ?? 0, difficultyHighButton?.y ?? 0);
    await expect
      .poll(async () => (await snapshot(page)).texts.some((item) => item.text === 'DIFFICULTY: HIGH'))
      .toBe(true);
    expect(await page.evaluate(() => window.localStorage.getItem('space-explorer.gameplayDifficulty.v1'))).toBe('high');

    await Promise.all([page.waitForEvent('load'), page.mouse.click(highButton?.x ?? 0, highButton?.y ?? 0)]);
    await waitForScene(page, 'Menu');
    await expect
      .poll(async () => (await snapshot(page)).texts.some((item) => item.text === 'QUALITY: HIGH'))
      .toBe(true);
    expect(await page.evaluate(() => window.localStorage.getItem('space-explorer.visualQuality.v1'))).toBe('high');
    expect(new URL(page.url()).searchParams.has('visualQuality')).toBe(false);

    await page.evaluate(() => window.localStorage.removeItem('space-explorer.visualQuality.v1'));
    await page.evaluate(() => window.localStorage.removeItem('space-explorer.gameplayDifficulty.v1'));
    await page.reload();
    await waitForScene(page, 'Menu');
  }

  assertNoBrowserErrors();
});

test('resizes, pauses, resumes, restores visibility, and lazy-routes scenes', async ({
  page,
  assertNoBrowserErrors,
}) => {
  await openMenu(page);
  await startNewRun(page);

  const mobile = test.info().project.name === 'chromium-mobile';
  for (const width of [1024, 960, 1024]) {
    await page.setViewportSize({ width, height: 640 });
    await expect.poll(async () => (await snapshot(page)).gameSize).toEqual({ width, height: 640 });

    if (mobile) {
      const viewport = page.viewportSize();
      await page.touchscreen.tap((viewport?.width ?? width) - 44, 106);
    } else {
      await page.keyboard.down('Escape');
    }
    try {
      await expect.poll(async () => (await snapshot(page)).physicsPaused).toBe(true);
    } finally {
      if (!mobile) await page.keyboard.up('Escape');
    }
    if (mobile) {
      const resume = (await snapshot(page)).texts.find((item) => item.text.endsWith('\nRESUME'));
      expect(resume).toBeDefined();
      await page.touchscreen.tap(resume?.x ?? 0, resume?.y ?? 0);
    } else {
      await page.keyboard.down('Escape');
    }
    try {
      await expect.poll(async () => (await snapshot(page)).physicsPaused).toBe(false);
    } finally {
      if (!mobile) await page.keyboard.up('Escape');
    }
  }

  const session = await page.context().newCDPSession(page);
  await session.send('Page.setWebLifecycleState', { state: 'frozen' });
  await session.send('Page.setWebLifecycleState', { state: 'active' });
  await expect.poll(async () => (await snapshot(page)).activeScenes).toContain('Game');

  for (const sceneKey of ['PlanetIntermission', 'GameOver', 'Victory']) {
    await page.evaluate(async (key) => {
      const harness = window.__SPACE_EXPLORER_BROWSER_HARNESS__;
      if (!harness) throw new Error('Browser harness is not installed');
      await harness.route(key);
    }, sceneKey);
    await waitForScene(page, sceneKey);
  }
  assertNoBrowserErrors();
});

test('pause settings persist quality without reloading or leaving the active run', async ({
  page,
  assertNoBrowserErrors,
}) => {
  await openMenu(page);
  await startNewRun(page);
  await page.keyboard.down('Escape');
  try {
    await expect.poll(async () => (await snapshot(page)).physicsPaused).toBe(true);
  } finally {
    await page.keyboard.up('Escape');
  }

  const paused = await snapshot(page);
  const settingsTab = paused.texts.find((item) => item.text === 'SETTINGS');
  expect(settingsTab).toBeDefined();
  await page.mouse.click(settingsTab?.x ?? 0, settingsTab?.y ?? 0);

  await page.setViewportSize({ width: 844, height: 390 });
  await expect.poll(async () => (await snapshot(page)).gameSize).toEqual({ width: 844, height: 390 });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect.poll(async () => (await snapshot(page)).gameSize).toEqual({ width: 390, height: 844 });

  const settings = await snapshot(page);
  const difficulty = settings.texts.find((item) => item.text.startsWith('DIFFICULTY:'));
  const quality = settings.texts.find((item) => item.text.startsWith('QUALITY:'));
  const difficultyLow = settings.texts
    .filter((item) => item.text === 'LOW')
    .find((item) => Math.abs(item.y - (difficulty?.y ?? -100)) < 12);
  const qualityLow = settings.texts
    .filter((item) => item.text === 'LOW')
    .find((item) => Math.abs(item.y - (quality?.y ?? -100)) < 12);
  expect(difficulty).toBeDefined();
  expect(quality).toBeDefined();
  expect(difficultyLow).toBeDefined();
  expect(qualityLow).toBeDefined();

  const urlBefore = page.url();
  await page.mouse.click(difficultyLow?.x ?? 0, difficultyLow?.y ?? 0);
  await expect
    .poll(async () => page.evaluate(() => localStorage.getItem('space-explorer.gameplayDifficulty.v1')))
    .toBe('low');
  await page.mouse.click(qualityLow?.x ?? 0, qualityLow?.y ?? 0);
  await expect
    .poll(async () => page.evaluate(() => localStorage.getItem('space-explorer.visualQuality.v1')))
    .toBe('low');
  const after = await snapshot(page);
  expect(after.physicsPaused).toBe(true);
  expect(after.activeScenes).toContain('Game');
  expect(page.url()).toBe(urlBefore);
  expect(after.texts.some((item) => item.text.includes('Restart required'))).toBe(true);

  const resume = after.texts.find((item) => item.text.endsWith('\nRESUME'));
  expect(resume).toBeDefined();
  await page.mouse.click(resume?.x ?? 0, resume?.y ?? 0);
  await expect.poll(async () => (await snapshot(page)).physicsPaused).toBe(false);
  const damage = await page.evaluate(() => window.__SPACE_EXPLORER_BROWSER_HARNESS__?.probeAcceptedPlayerDamage(1));
  expect(damage).toEqual({ beforeHp: 5, afterHp: 4.25, damage: 0.75 });
  assertNoBrowserErrors();
});

test('mobile portrait plays without a rotate block and rotates freely', async ({ page, assertNoBrowserErrors }) => {
  test.skip(test.info().project.name !== 'chromium-mobile', 'mobile-only orientation scenario');

  await page.setViewportSize({ width: 390, height: 844 });
  await openMenu(page);
  await expect(page.locator('#game-root > canvas')).toBeVisible();
  await expect(page.locator('#rotate-device-overlay')).toHaveCount(0);

  await startNewRun(page);
  const portrait = await snapshot(page);
  expect(portrait.gameSize).toEqual({ width: 390, height: 844 });
  expect(portrait.physicsBodyCount).toBeGreaterThan(0);

  await page.setViewportSize({ width: 844, height: 390 });
  await expect.poll(async () => (await snapshot(page)).gameSize.width).toBe(844);
  const landscape = await snapshot(page);
  expect(landscape.gameSize).toEqual({ width: 844, height: 390 });
  expect(landscape.activeScenes).toContain('Game');
  assertNoBrowserErrors();
});
