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
    const highButton = menu.texts.find((item) => item.text === 'HIGH');
    expect(qualityLabel).toBeDefined();
    expect(highButton).toBeDefined();
    expect(highButton?.x).toBeGreaterThan(0);
    expect(highButton?.x).toBeLessThan(viewport.width);
    expect(highButton?.y).toBeGreaterThan(0);
    expect(highButton?.y).toBeLessThan(viewport.height);

    await Promise.all([
      page.waitForEvent('load'),
      page.mouse.click(highButton?.x ?? 0, highButton?.y ?? 0),
    ]);
    await waitForScene(page, 'Menu');
    await expect.poll(async () => (await snapshot(page)).texts.some(
      (item) => item.text === 'QUALITY: HIGH'
    )).toBe(true);
    expect(await page.evaluate(() => window.localStorage.getItem('space-explorer.visualQuality.v1')))
      .toBe('high');
    expect(new URL(page.url()).searchParams.has('visualQuality')).toBe(false);

    await page.evaluate(() => window.localStorage.removeItem('space-explorer.visualQuality.v1'));
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
  await expect
    .poll(async () => (await snapshot(page)).gameSize.width)
    .toBe(844);
  const landscape = await snapshot(page);
  expect(landscape.gameSize).toEqual({ width: 844, height: 390 });
  expect(landscape.activeScenes).toContain('Game');
  assertNoBrowserErrors();
});
