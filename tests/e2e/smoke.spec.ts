import { expect, openMenu, snapshot, test, waitForScene } from './fixtures';

test('boots once, enters gameplay, and exercises real rendering and Arcade bodies', async ({
  page,
  assertNoBrowserErrors,
}) => {
  await page.goto('/');
  await expect(page.locator('#game-root > canvas')).toHaveCount(1);
  expect(await page.evaluate(() => window.__SPACE_EXPLORER_BROWSER_HARNESS__)).toBeUndefined();
  await page.goto('/?browserHarness=0');
  expect(await page.evaluate(() => window.__SPACE_EXPLORER_BROWSER_HARNESS__)).toBeUndefined();

  await openMenu(page);
  await page.reload();
  await waitForScene(page, 'Menu');
  await expect(page.locator('#game-root > canvas')).toHaveCount(1);

  const menu = await snapshot(page);
  const newRun = menu.texts.find((item) => item.text === 'NEW RUN');
  expect(newRun).toBeDefined();
  const evidenceDirectory = process.env.VISUAL_SCREENSHOT_DIR;
  const menuShotName = `menu-command-deck-${test.info().project.name}.png`;
  const menuShotPath = evidenceDirectory
    ? `${evidenceDirectory}/${menuShotName}`
    : test.info().outputPath(menuShotName);
  await page.screenshot({ path: menuShotPath });
  await test.info().attach(menuShotName, { path: menuShotPath, contentType: 'image/png' });
  await page.mouse.dblclick(newRun?.x ?? 0, newRun?.y ?? 0, { delay: 20 });
  await waitForScene(page, 'Game');

  const initial = await snapshot(page);
  const player = initial.objects.find((item) => item.textureKey === 'player-ship');
  expect(player?.hasBody).toBe(true);
  expect(initial.physicsBodyCount).toBeGreaterThan(0);
  expect(initial.cameraFilterCount).toBeGreaterThan(0);
  expect(initial.particleEmitterCount).toBeGreaterThan(0);
  expect(initial.tweenCount).toBeGreaterThan(0);
  expect(initial.canvas.backingWidth).toBeGreaterThan(0);
  expect(initial.canvas.backingHeight).toBeGreaterThan(0);
  expect(initial.canvas.backingScale).toBeGreaterThanOrEqual(0.95);
  expect(initial.canvas.backingScale).toBeLessThanOrEqual(1.05);
  expect(initial.runtimePerformance).toMatchObject({ enabled: false, pressureLevel: 0 });
  expect(await page.evaluate(() => window.__SPACE_EXPLORER_BROWSER_HARNESS__?.probeArcadeOverlap())).toBe(
    true,
  );

  // Live movement and firing depend on real-time frame delivery. The isolated
  // CI SwiftShader runner validates rendering, physics, overlap, and the
  // separate pause/input scenarios; hardware-backed local runs retain these
  // control assertions.
  if (!process.env.CI) {
    await page.keyboard.down('ArrowLeft');
    try {
      await expect.poll(async () =>
        (await snapshot(page)).objects.find((item) => item.textureKey === 'player-ship')?.x,
      ).toBeLessThan(player?.x ?? Number.POSITIVE_INFINITY);
    } finally {
      await page.keyboard.up('ArrowLeft');
    }
    const afterMovement = (await snapshot(page)).objects.find((item) => item.textureKey === 'player-ship');
    expect(afterMovement?.x).toBeGreaterThanOrEqual(0);

    const hasActiveBullet = async () =>
      (await snapshot(page)).objects.some((item) => item.textureKey === 'player-bullet' && item.active);
    if (test.info().project.name === 'chromium-mobile') {
      const viewport = page.viewportSize();
      const session = await page.context().newCDPSession(page);
      await session.send('Input.dispatchTouchEvent', {
        type: 'touchStart',
        touchPoints: [{ x: (viewport?.width ?? 844) * 0.75, y: (viewport?.height ?? 390) * 0.5 }],
      });
      try {
        await expect.poll(hasActiveBullet).toBe(true);
      } finally {
        await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
      }
    } else {
      await page.keyboard.down('Space');
      try {
        await expect.poll(hasActiveBullet).toBe(true);
      } finally {
        await page.keyboard.up('Space');
      }
    }
  }
  assertNoBrowserErrors();
});

test('command deck menu stays readable at desktop and phone-portrait', async ({
  page,
  assertNoBrowserErrors,
}) => {
  for (const viewport of [
    { width: 984, height: 768 },
    { width: 390, height: 844 },
  ]) {
    await page.setViewportSize(viewport);
    await openMenu(page);
    const menu = await snapshot(page);
    const newRun = menu.texts.find((item) => item.text === 'NEW RUN');
    expect(newRun).toBeDefined();
    expect(newRun?.x ?? 0).toBeGreaterThan(0);
    expect(newRun?.y ?? 0).toBeGreaterThan(0);
    const shotName = `menu-command-deck-${viewport.width}x${viewport.height}.png`;
    const evidenceDirectory = process.env.VISUAL_SCREENSHOT_DIR;
    const shotPath = evidenceDirectory
      ? `${evidenceDirectory}/${shotName}`
      : test.info().outputPath(shotName);
    await page.screenshot({ path: shotPath });
    await test.info().attach(shotName, { path: shotPath, contentType: 'image/png' });
  }
  assertNoBrowserErrors();
});

test('preload feedback remains visible until startup font loading completes', async ({
  page,
  assertNoBrowserErrors,
}) => {
  let releaseFonts = (): void => {};
  let markRequestStarted = (): void => {};
  const fontRelease = new Promise<void>((resolve) => {
    releaseFonts = resolve;
  });
  const requestStarted = new Promise<void>((resolve) => {
    markRequestStarted = resolve;
  });
  await page.route('**/fonts/*.woff2', async (route) => {
    markRequestStarted();
    await fontRelease;
    await route.continue();
  });

  await page.goto('/?browserHarness=1', { waitUntil: 'domcontentloaded' });
  await requestStarted;
  await expect.poll(async () => page.evaluate(() => Boolean(window.__SPACE_EXPLORER_BROWSER_HARNESS__))).toBe(true);

  const loadingSnapshot = await snapshot(page);
  expect(loadingSnapshot.preload?.texts[0] ?? '').toContain('LOADING...');
  expect(loadingSnapshot.activeScenes).not.toContain('Menu');

  releaseFonts();
  await waitForScene(page, 'Menu');
  assertNoBrowserErrors();
});

test('shows a clear unsupported state when WebGL is unavailable', async ({
  page,
  assertNoBrowserErrors,
}) => {
  if (test.info().project.name === 'chromium-mobile') {
    await page.setViewportSize({ width: 390, height: 844 });
  }

  await page.addInitScript(() => {
    const getContext = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, contextId, options) {
      if (contextId === 'webgl' || contextId === 'webgl2' || contextId === 'experimental-webgl') {
        return null;
      }
      return getContext.call(this, contextId, options);
    } as typeof HTMLCanvasElement.prototype.getContext;
  });

  await page.goto('/');
  await expect(page.getByRole('alert')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'WebGL Required' })).toBeVisible();
  await expect(page.locator('#game-root > canvas')).toHaveCount(0);
  assertNoBrowserErrors();
});

test('teardown cancels queued viewport recovery callbacks', async ({ page, assertNoBrowserErrors }) => {
  await openMenu(page);
  await page.evaluate(() => {
    window.dispatchEvent(new Event('resize'));
    window.dispatchEvent(new Event('focus'));
    window.__SPACE_EXPLORER_BROWSER_HARNESS__?.destroyGame();
  });
  await page.waitForTimeout(100);
  await expect(page.locator('#game-root > canvas')).toHaveCount(0);
  assertNoBrowserErrors();
});

test('initial hidden state establishes the visibility audio pause reason', async ({
  page,
  assertNoBrowserErrors,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
  });
  await page.goto('/?browserHarness=1');
  await expect.poll(async () => page.evaluate(() => Boolean(window.__SPACE_EXPLORER_BROWSER_HARNESS__))).toBe(
    true,
  );
  expect((await snapshot(page)).audioPauseReasons).toContain('visibility');
  await expect.poll(async () => (await snapshot(page)).audioContextState).toBe('suspended');
  assertNoBrowserErrors();
});
