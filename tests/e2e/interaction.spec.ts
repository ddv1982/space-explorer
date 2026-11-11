import {
  expect,
  openMenu,
  openMenuSettings,
  pressControl,
  snapshot,
  startNewRun,
  test,
  waitForScene,
  type Page,
} from './fixtures';

function tierButton(page: Page, group: 'Difficulty' | 'Quality', tier: string) {
  return page.getByRole('group', { name: group }).getByRole('button', { name: tier, exact: true });
}

// Check settings persistence from a fresh default state in each responsive profile.
for (const viewport of [
  { width: 1280, height: 720 },
  { width: 390, height: 844 },
  { width: 844, height: 390 },
]) {
  test(`visual quality is selectable and persists at ${viewport.width}x${viewport.height}`, async ({
    page,
    assertNoBrowserErrors,
  }) => {
    test.setTimeout(120_000);
    await page.setViewportSize(viewport);
    await openMenu(page);
    await openMenuSettings(page);
    await expect(page.getByText('QUALITY: AUTO')).toBeVisible();
    await expect(page.getByText('DIFFICULTY: NORMAL')).toBeVisible();
    await expect(tierButton(page, 'Quality', 'LOW')).toBeInViewport();
    await expect(page.getByRole('group', { name: 'Quality' }).getByRole('button')).toHaveText(['AUTO', 'LOW']);
    await expect(tierButton(page, 'Difficulty', 'HIGH')).toBeInViewport();

    await tierButton(page, 'Difficulty', 'HIGH').click();
    await expect(page.getByText('DIFFICULTY: HIGH')).toBeVisible();
    await expect(tierButton(page, 'Difficulty', 'HIGH')).toHaveAttribute('aria-pressed', 'true');
    expect(await page.evaluate(() => window.localStorage.getItem('space-explorer.gameplayDifficulty.v1'))).toBe('high');

    await Promise.all([page.waitForEvent('load'), tierButton(page, 'Quality', 'LOW').click()]);
    await waitForScene(page, 'Menu');
    await openMenuSettings(page);
    await expect(page.getByText('QUALITY: LOW')).toBeVisible();
    await expect(tierButton(page, 'Quality', 'LOW')).toHaveAttribute('aria-pressed', 'true');
    expect(await page.evaluate(() => window.localStorage.getItem('space-explorer.visualQuality.v1'))).toBe('low');
    expect(new URL(page.url()).searchParams.has('visualQuality')).toBe(false);

    await page.evaluate(() => window.localStorage.removeItem('space-explorer.visualQuality.v1'));
    await page.evaluate(() => window.localStorage.removeItem('space-explorer.gameplayDifficulty.v1'));
    await page.reload();
    await waitForScene(page, 'Menu');
    assertNoBrowserErrors();
  });
}

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
      await page.getByRole('button', { name: 'RESUME', exact: true }).tap();
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

  await page.getByRole('tab', { name: 'SETTINGS' }).click();
  await expect(page.getByRole('tab', { name: 'SETTINGS' })).toHaveAttribute('aria-selected', 'true');

  await page.setViewportSize({ width: 844, height: 390 });
  await expect.poll(async () => (await snapshot(page)).gameSize).toEqual({ width: 844, height: 390 });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect.poll(async () => (await snapshot(page)).gameSize).toEqual({ width: 390, height: 844 });
  await expect(page.getByText(/^DIFFICULTY: /)).toBeInViewport();
  await expect(page.getByText(/^QUALITY: /)).toBeInViewport();

  const urlBefore = page.url();
  await tierButton(page, 'Difficulty', 'LOW').click();
  await expect
    .poll(async () => page.evaluate(() => localStorage.getItem('space-explorer.gameplayDifficulty.v1')))
    .toBe('low');
  await tierButton(page, 'Quality', 'LOW').click();
  await expect
    .poll(async () => page.evaluate(() => localStorage.getItem('space-explorer.visualQuality.v1')))
    .toBe('low');
  const after = await snapshot(page);
  expect(after.physicsPaused).toBe(true);
  expect(after.activeScenes).toContain('Game');
  expect(page.url()).toBe(urlBefore);
  await expect(page.getByText(/Restart required/)).toBeVisible();

  await page.getByRole('button', { name: 'RESUME', exact: true }).click();
  await expect.poll(async () => (await snapshot(page)).physicsPaused).toBe(false);
  const damage = await page.evaluate(() => window.__SPACE_EXPLORER_BROWSER_HARNESS__?.probeAcceptedPlayerDamage(1));
  expect(damage).toEqual({ beforeHp: 5, afterHp: 4.25, damage: 0.75 });
  assertNoBrowserErrors();
});

test('first trusted menu action recovers policy-suspended audio without overriding pause reasons', async ({
  page,
  assertNoBrowserErrors,
}) => {
  await openMenu(page);
  await openMenuSettings(page);
  // The SETTINGS press resumes audio asynchronously; suspending before it lands would be undone.
  await expect.poll(async () => (await snapshot(page)).audioContextState).toBe('running');
  await page.evaluate(async () => {
    const harness = window.__SPACE_EXPLORER_BROWSER_HARNESS__;
    if (!harness) throw new Error('Browser harness is not installed');
    await harness.suspendAudioContextForPolicyTest();
  });
  await expect.poll(async () => (await snapshot(page)).audioContextState).toBe('suspended');
  expect((await snapshot(page)).audioPauseReasons).toEqual([]);

  await pressControl(page.getByRole('slider', { name: 'SFX VOLUME' }), 'ArrowLeft');
  await expect.poll(async () => (await snapshot(page)).audioContextState).toBe('running');
  expect((await snapshot(page)).audioPauseReasons).toEqual([]);
  await pressControl(page.getByRole('button', { name: 'DONE', exact: true }));

  await startNewRun(page);
  const mobile = test.info().project.name === 'chromium-mobile';
  if (mobile) {
    const viewport = page.viewportSize();
    await page.touchscreen.tap((viewport?.width ?? 844) - 44, 106);
  } else {
    await page.keyboard.down('Escape');
  }
  try {
    await expect.poll(async () => (await snapshot(page)).physicsPaused).toBe(true);
  } finally {
    if (!mobile) await page.keyboard.up('Escape');
  }
  await expect.poll(async () => (await snapshot(page)).audioContextState).toBe('suspended');
  expect((await snapshot(page)).audioPauseReasons).toEqual(['gameplay']);

  await pressControl(page.getByRole('button', { name: 'Save to SLOT 1' }));
  expect((await snapshot(page)).physicsPaused).toBe(true);
  expect((await snapshot(page)).audioPauseReasons).toEqual(['gameplay']);
  expect((await snapshot(page)).audioContextState).toBe('suspended');
  assertNoBrowserErrors();
});

test('returning to the menu does not replay a preview URL level jump', async ({ page, assertNoBrowserErrors }) => {
  await page.goto('/?browserHarness=1&startLevel=9&upgrades=0');
  await waitForScene(page, 'Game');
  await page.keyboard.down('Escape');
  try {
    await expect.poll(async () => (await snapshot(page)).physicsPaused).toBe(true);
  } finally {
    await page.keyboard.up('Escape');
  }
  await pressControl(page.getByRole('button', { name: 'MAIN MENU', exact: true }));
  await waitForScene(page, 'Menu');
  await page.setViewportSize({ width: 1024, height: 768 });
  await expect.poll(async () => (await snapshot(page)).gameSize.width).toBe(1024);
  await expect(page.getByRole('button', { name: 'NEW RUN', exact: true })).toBeEnabled();
  await startNewRun(page);
  expect((await snapshot(page)).texts.some((item) => item.text === 'Aurora Threshold')).toBe(true);
  await page.reload();
  await waitForScene(page, 'Game');
  expect((await snapshot(page)).texts.some((item) => item.text === 'Swarmfront')).toBe(true);
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
