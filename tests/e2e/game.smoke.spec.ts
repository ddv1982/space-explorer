import { expect, test as base, type Page } from '@playwright/test';
import type {
  BrowserHarnessFramePacingProbe,
  BrowserHarnessSnapshot,
} from '../../src/browserHarness';

interface BrowserErrorFixture {
  assertNoBrowserErrors: () => void;
}

const test = base.extend<BrowserErrorFixture>({
  assertNoBrowserErrors: async ({ page }, use) => {
    const errors: string[] = [];
    page.on('console', (message) => {
      if (message.type() === 'error') errors.push(`console: ${message.text()}`);
    });
    page.on('pageerror', (error) => errors.push(`page: ${error.message}`));
    page.on('requestfailed', (request) => {
      errors.push(`request: ${request.url()} (${request.failure()?.errorText ?? 'unknown failure'})`);
    });

    await use(() => expect(errors, 'unexpected browser errors').toEqual([]));
    expect(errors, 'unexpected browser errors').toEqual([]);
  },
});

async function snapshot(page: Page): Promise<BrowserHarnessSnapshot> {
  return page.evaluate(() => {
    const harness = window.__SPACE_EXPLORER_BROWSER_HARNESS__;
    if (!harness) throw new Error('Browser harness is not installed');
    return harness.snapshot();
  });
}

async function waitForScene(page: Page, sceneKey: string): Promise<void> {
  await expect.poll(() =>
    page.evaluate((key) => {
      const harness = window.__SPACE_EXPLORER_BROWSER_HARNESS__;
      return harness?.snapshot().activeScenes.includes(key) ?? false;
    }, sceneKey),
    { timeout: 15_000 },
  ).toBe(true);
}

async function openMenu(page: Page): Promise<void> {
  await page.goto('/?browserHarness=1');
  await expect(page.locator('#game-root > canvas')).toHaveCount(1);
  await expect.poll(async () => page.evaluate(() => Boolean(window.__SPACE_EXPLORER_BROWSER_HARNESS__))).toBe(true);
  await waitForScene(page, 'Menu');
}

async function startNewRun(page: Page): Promise<void> {
  const menu = await snapshot(page);
  const newRun = menu.texts.find((item) => item.text === 'NEW RUN');
  expect(newRun).toBeDefined();
  await page.mouse.click(newRun?.x ?? 0, newRun?.y ?? 0);
  await waitForScene(page, 'Game');
}

function expectConsistentFramePacingMetrics(metrics: BrowserHarnessFramePacingProbe, sampleCount: number): void {
  expect(metrics.sampleCount).toBe(sampleCount);
  expect(metrics.averageMs).toBeGreaterThan(0);
  expect(metrics.averageMs).toBeLessThanOrEqual(metrics.maxMs);
  expect(metrics.p50Ms).toBeLessThanOrEqual(metrics.p95Ms);
  expect(metrics.p95Ms).toBeLessThanOrEqual(metrics.p99Ms);
  expect(metrics.p99Ms).toBeLessThanOrEqual(metrics.maxMs);
  expect(metrics.over16_67MsCount).toBeGreaterThanOrEqual(metrics.over33_33MsCount);
  for (const count of [metrics.over16_67MsCount, metrics.over33_33MsCount]) {
    expect(count).toBeGreaterThanOrEqual(0);
    expect(count).toBeLessThanOrEqual(metrics.sampleCount);
  }
  for (const workCost of [
    metrics.workCost.update,
    metrics.workCost.renderSubmission,
    metrics.workCost.gpuSynchronizedRender,
  ]) {
    expect(workCost.sampleCount).toBeGreaterThanOrEqual(metrics.sampleCount);
    expect(workCost.averageMs).toBeGreaterThanOrEqual(0);
    expect(workCost.p95Ms).toBeGreaterThanOrEqual(0);
  }
  expect(metrics.runtimeLoad.activeTexturedObjectCount).toBeGreaterThan(0);
  expect(metrics.runtimeLoad.activePhysicsBodyCount).toBeGreaterThan(0);
  expect(metrics.runtimeLoad.activeParticleCount).toBeGreaterThanOrEqual(0);
  expect(metrics.runtimeLoad.activePlayerBulletCount).toBeGreaterThanOrEqual(0);
  expect(metrics.runtimeLoad.activeEnemyBulletCount).toBeGreaterThanOrEqual(0);
  expect(metrics.runtimeLoad.particleEmitterCount).toBeGreaterThanOrEqual(0);
  expect(metrics.runtimeLoad.tweenCount).toBeGreaterThanOrEqual(0);
  expect(metrics.runtimeLoad.effectEventCount.playerExhaust).toBeGreaterThanOrEqual(0);
  expect(metrics.runtimeLoad.effectEventCount.playerBulletTrail).toBeGreaterThanOrEqual(0);
  expect(metrics.runtimeLoad.effectEventCount.enemyBulletTrail).toBeGreaterThanOrEqual(0);
  expect(metrics.runtimeLoad.musicIntensityRequestCount).toBeGreaterThanOrEqual(metrics.sampleCount);
  expect(metrics.runtimeLoad.audioResumeRequestCount).toBeGreaterThanOrEqual(metrics.sampleCount);
  expect(metrics.runtimeLoad.laserRequestCount).toBeGreaterThanOrEqual(0);
}

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
  await page.mouse.dblclick(newRun?.x ?? 0, newRun?.y ?? 0, { delay: 20 });
  await waitForScene(page, 'Game');

  const initial = await snapshot(page);
  const player = initial.objects.find((item) => item.textureKey === 'player-ship');
  expect(player?.hasBody).toBe(true);
  expect(initial.physicsBodyCount).toBeGreaterThan(0);
  expect(initial.cameraFilterCount).toBeGreaterThan(0);
  expect(initial.particleEmitterCount).toBeGreaterThan(0);
  expect(initial.tweenCount).toBeGreaterThan(0);
  expect(await page.evaluate(() => window.__SPACE_EXPLORER_BROWSER_HARNESS__?.probeArcadeOverlap())).toBe(
    true,
  );

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
  assertNoBrowserErrors();
});

test('runtime feedback remains comparable under measured low frame delivery', async ({
  page,
  assertNoBrowserErrors,
}) => {
  test.skip(test.info().project.name !== 'chromium-desktop', 'desktop frame-rate comparison');
  test.skip(Boolean(process.env.CI), 'requires real-time frame delivery rather than CI software rendering');

  const measureMovement = async (fpsLimit: number) => {
    await openMenu(page);
    await startNewRun(page);
    await page.evaluate((limit) => {
      const harness = window.__SPACE_EXPLORER_BROWSER_HARNESS__;
      if (!harness) throw new Error('Browser harness is not installed');
      harness.setFpsLimit(limit);
      harness.resetFrameMetrics();
    }, fpsLimit);
    const initialPlayer = (await snapshot(page)).objects.find((item) => item.textureKey === 'player-ship');
    const initialProgress = (await snapshot(page)).levelProgress;
    expect(initialPlayer).toBeDefined();
    expect(initialProgress).not.toBeNull();

    await page.keyboard.down('ArrowRight');
    await page.waitForTimeout(800);
    const finalSnapshot = await snapshot(page);
    await page.keyboard.up('ArrowRight');
    const finalPlayer = finalSnapshot.objects.find((item) => item.textureKey === 'player-ship');
    expect(finalPlayer).toBeDefined();
    const metrics = await page.evaluate(() => {
      const harness = window.__SPACE_EXPLORER_BROWSER_HARNESS__;
      if (!harness) throw new Error('Browser harness is not installed');
      return harness.getFrameMetrics();
    });
    return {
      distance: (finalPlayer?.x ?? 0) - (initialPlayer?.x ?? 0),
      progress: (finalSnapshot.levelProgress ?? 0) - (initialProgress ?? 0),
      rotation: Math.abs(finalPlayer?.rotation ?? 0),
      metrics,
    };
  };

  const normal = await measureMovement(60);
  const lowFrameRate = await measureMovement(20);

  expect(normal.metrics.frameCount).toBeGreaterThan(lowFrameRate.metrics.frameCount * 2);
  expect(lowFrameRate.metrics.averageDelta).toBeGreaterThan(normal.metrics.averageDelta * 1.5);
  expect(lowFrameRate.metrics.maxDelta).toBeGreaterThan(normal.metrics.maxDelta * 1.5);
  expect(normal.distance).toBeGreaterThan(5);
  expect(lowFrameRate.distance).toBeGreaterThan(5);
  expect(lowFrameRate.progress / normal.progress).toBeGreaterThan(0.5);
  expect(lowFrameRate.progress / normal.progress).toBeLessThan(1.5);
  expect(Math.abs(lowFrameRate.rotation - normal.rotation)).toBeLessThan(0.15);

  const tintProbe = await page.evaluate(() => {
    const harness = window.__SPACE_EXPLORER_BROWSER_HARNESS__;
    if (!harness) throw new Error('Browser harness is not installed');
    return harness.probePlayerHitTint();
  });
  expect(tintProbe.duringMode).toBe(1);
  expect(tintProbe.afterMode).toBe(0);
  assertNoBrowserErrors();
});

test('captures representative active-gameplay frame pacing with synchronized load context', async ({
  page,
  assertNoBrowserErrors,
}) => {
  test.setTimeout(180_000);
  // CI software WebGL verifies the probe paths; local evidence runs retain the full comparison window.
  const sampleCount = process.env.CI ? 10 : 60;
  const mobile = test.info().project.name === 'chromium-mobile';
  const measureScenario = async (options: {
    moving?: boolean;
    firing?: boolean;
    playerBulletTrails?: boolean;
    audioResumeRequests?: boolean;
    trailIntervals?: { playerMs: number; enemyMs: number };
    captureTrailEvidence?: boolean;
  }): Promise<BrowserHarnessFramePacingProbe> => {
    await openMenu(page);
    await startNewRun(page);
    await page.waitForTimeout(2500);
    if (options.trailIntervals) {
      await page.evaluate(({ playerMs, enemyMs }) => {
        const harness = window.__SPACE_EXPLORER_BROWSER_HARNESS__;
        if (!harness) throw new Error('Browser harness is not installed');
        harness.setProjectileTrailIntervals(playerMs, enemyMs);
      }, options.trailIntervals);
    }
    if (options.playerBulletTrails === false) {
      const emitterCount = await page.evaluate(() => {
        const harness = window.__SPACE_EXPLORER_BROWSER_HARNESS__;
        if (!harness) throw new Error('Browser harness is not installed');
        return harness.setPlayerBulletTrailEmissionEnabled(false);
      });
      expect(emitterCount).toBe(1);
    }
    if (options.audioResumeRequests === false) {
      expect((await snapshot(page)).audioContextState).toBe('running');
      await page.evaluate(() => {
        const harness = window.__SPACE_EXPLORER_BROWSER_HARNESS__;
        if (!harness) throw new Error('Browser harness is not installed');
        harness.setAudioResumeRequestsEnabled(false);
      });
    }
    if (options.moving) await page.keyboard.down('ArrowLeft');

    const session = mobile && options.firing ? await page.context().newCDPSession(page) : null;
    if (session) {
      const viewport = page.viewportSize();
      await session.send('Input.dispatchTouchEvent', {
        type: 'touchStart',
        touchPoints: [{ x: (viewport?.width ?? 844) * 0.75, y: (viewport?.height ?? 390) * 0.5 }],
      });
    } else if (options.firing) {
      await page.keyboard.down('Space');
    }

    try {
      if (options.firing) {
        await expect.poll(async () =>
          (await snapshot(page)).objects.some((object) =>
            object.textureKey === 'player-bullet' && object.active
          ),
        ).toBe(true);
      }
      const metrics = await page.evaluate(async (count) => {
        const harness = window.__SPACE_EXPLORER_BROWSER_HARNESS__;
        if (!harness) throw new Error('Browser harness is not installed');
        return harness.probeFramePacing(count);
      }, sampleCount);
      expectConsistentFramePacingMetrics(metrics, sampleCount);
      if (options.captureTrailEvidence) {
        const staged = await page.evaluate(() => {
          const harness = window.__SPACE_EXPLORER_BROWSER_HARNESS__;
          if (!harness) throw new Error('Browser harness is not installed');
          return harness.stageProjectileTrailEvidence();
        });
        expect(staged).toEqual({ playerCount: 4, enemyCount: 4 });
        await page.waitForTimeout(32);
        const evidenceName = `projectile-trails-${test.info().project.name}.png`;
        const evidencePath = process.env.VISUAL_SCREENSHOT_DIR
          ? `${process.env.VISUAL_SCREENSHOT_DIR}/${evidenceName}`
          : test.info().outputPath(evidenceName);
        await page.screenshot({ path: evidencePath });
        await test.info().attach(`projectile-trails-${test.info().project.name}`, {
          path: evidencePath,
          contentType: 'image/png',
        });
      }
      return metrics;
    } finally {
      if (session) {
        await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }).catch((): void => undefined);
      } else if (options.firing) {
        await page.keyboard.up('Space');
      }
      if (options.playerBulletTrails === false) {
        await page.evaluate(() => {
          window.__SPACE_EXPLORER_BROWSER_HARNESS__?.setPlayerBulletTrailEmissionEnabled(true);
        });
      }
      if (options.audioResumeRequests === false) {
        await page.evaluate(() => {
          window.__SPACE_EXPLORER_BROWSER_HARNESS__?.setAudioResumeRequestsEnabled(true);
        });
      }
      if (options.trailIntervals) {
        await page.evaluate(() => {
          window.__SPACE_EXPLORER_BROWSER_HARNESS__?.setProjectileTrailIntervals(150, 150);
        });
      }
      if (options.moving) await page.keyboard.up('ArrowLeft');
    }
  };

  const baseline = await measureScenario({});
  const movementOnly = await measureScenario({ moving: true });
  const firingWithoutPlayerTrails = await measureScenario({
    moving: true,
    firing: true,
    playerBulletTrails: false,
  });
  const firingWithoutAudioResumeRequests = await measureScenario({
    moving: true,
    firing: true,
    audioResumeRequests: false,
  });
  const legacyCadenceCombat = await measureScenario({
    moving: true,
    firing: true,
    trailIntervals: { playerMs: 18, enemyMs: 24 },
  });
  const activeCombat = await measureScenario({
    moving: true,
    firing: true,
    captureTrailEvidence: true,
  });
  expect(activeCombat.runtimeLoad.effectEventCount.playerBulletTrail).toBeGreaterThan(0);
  expect(firingWithoutPlayerTrails.runtimeLoad.effectEventCount.playerBulletTrail).toBeGreaterThan(0);
  expect(firingWithoutAudioResumeRequests.runtimeLoad.audioResumeRequestCount).toBeGreaterThan(0);
  expect(activeCombat.runtimeLoad.laserRequestCount).toBeGreaterThan(0);
  const legacyTrailEventsPerShot = legacyCadenceCombat.runtimeLoad.effectEventCount.playerBulletTrail
    / legacyCadenceCombat.runtimeLoad.laserRequestCount;
  const optimizedTrailEventsPerShot = activeCombat.runtimeLoad.effectEventCount.playerBulletTrail
    / activeCombat.runtimeLoad.laserRequestCount;
  if (process.env.CI) {
    expect(legacyCadenceCombat.runtimeLoad.effectEventCount.playerBulletTrail).toBeGreaterThan(0);
  } else {
    expect(optimizedTrailEventsPerShot).toBeLessThan(legacyTrailEventsPerShot * 0.8);
  }

  await test.info().attach(`frame-pacing-${test.info().project.name}`, {
    body: JSON.stringify({ baseline, movementOnly, firingWithoutPlayerTrails, firingWithoutAudioResumeRequests, legacyCadenceCombat, activeCombat }, null, 2),
    contentType: 'application/json',
  });
  console.info(
    `frame pacing ${test.info().project.name}: ${JSON.stringify({ baseline, movementOnly, firingWithoutPlayerTrails, firingWithoutAudioResumeRequests, legacyCadenceCombat, activeCombat })}`,
  );

  await openMenu(page);
  await startNewRun(page);
  const lifecycleChecks = await page.evaluate(async () => {
    const harness = window.__SPACE_EXPLORER_BROWSER_HARNESS__;
    if (!harness) throw new Error('Browser harness is not installed');
    let invalidSampleError = '';
    try {
      await harness.probeFramePacing(0);
    } catch (error) {
      invalidSampleError = error instanceof Error ? error.message : String(error);
    }
    const first = await harness.probeFramePacing(2);
    const second = await harness.probeFramePacing(2);
    const interruptedProbe = harness.probeFramePacing(240).then(
      () => '',
      (error) => error instanceof Error ? error.message : String(error),
    );
    await harness.route('Victory');
    return {
      invalidSampleError,
      firstSampleCount: first.sampleCount,
      secondSampleCount: second.sampleCount,
      interruptionError: await interruptedProbe,
    };
  });
  expect(lifecycleChecks.invalidSampleError).toContain('between 1 and 240');
  expect(lifecycleChecks.firstSampleCount).toBe(2);
  expect(lifecycleChecks.secondSampleCount).toBe(2);
  expect(lifecycleChecks.interruptionError).toContain('gameplay transition');
  assertNoBrowserErrors();
});

test('preload feedback remains visible until a real asset request completes', async ({
  page,
  assertNoBrowserErrors,
}) => {
  let releaseAsset = (): void => {};
  let markRequestStarted = (): void => {};
  const assetRelease = new Promise<void>((resolve) => {
    releaseAsset = resolve;
  });
  const requestStarted = new Promise<void>((resolve) => {
    markRequestStarted = resolve;
  });
  await page.route('**/bg_level01.png', async (route) => {
    markRequestStarted();
    await assetRelease;
    await route.continue();
  });

  await page.goto('/?browserHarness=1', { waitUntil: 'domcontentloaded' });
  await requestStarted;
  await expect.poll(async () => page.evaluate(() => Boolean(window.__SPACE_EXPLORER_BROWSER_HARNESS__))).toBe(true);
  await expect.poll(async () => (await snapshot(page)).preload?.progress ?? 1).toBeLessThan(1);
  await expect.poll(async () => (await snapshot(page)).preload?.texts[0] ?? '').toContain('LOADING...');
  const loadingSnapshot = await snapshot(page);
  const loadingProgress = loadingSnapshot.preload?.progress ?? 1;
  expect(loadingSnapshot.preload?.texts).toContain(`LOADING... ${Math.round(loadingProgress * 100)}%`);
  expect(loadingSnapshot.activeScenes).not.toContain('Menu');
  releaseAsset();
  await waitForScene(page, 'Menu');
  assertNoBrowserErrors();
});

test('crossfire telegraph glow preserves readable gameplay lanes', async ({
  page,
  assertNoBrowserErrors,
}) => {
  test.setTimeout(60_000);
  await openMenu(page);
  await startNewRun(page);
  await page.waitForTimeout(1200);
  const baselinePilot = await page.evaluate(() => {
    const harness = window.__SPACE_EXPLORER_BROWSER_HARNESS__;
    if (!harness) throw new Error('Browser harness is not installed');
    return harness.showLaneReadingPilot(false);
  });

  expect(baselinePilot.sectionId).toBe('slipstream-prism-cross');
  expect(baselinePilot.filterCount).toBe(1);
  const evidenceDirectory = process.env.VISUAL_SCREENSHOT_DIR;
  const baselineName = `crossfire-baseline-${test.info().project.name}.png`;
  const baselinePath = evidenceDirectory
    ? `${evidenceDirectory}/${baselineName}`
    : test.info().outputPath(baselineName);
  await page.screenshot({ path: baselinePath });
  await test.info().attach(`crossfire-baseline-${test.info().project.name}`, {
    path: baselinePath,
    contentType: 'image/png',
  });

  const pilot = await page.evaluate(() => {
    const harness = window.__SPACE_EXPLORER_BROWSER_HARNESS__;
    if (!harness) throw new Error('Browser harness is not installed');
    return harness.showLaneReadingPilot(true);
  });
  expect(pilot.filterCount).toBe(1);
  const pilotName = `crossfire-pilot-${test.info().project.name}.png`;
  const pilotPath = evidenceDirectory
    ? `${evidenceDirectory}/${pilotName}`
    : test.info().outputPath(pilotName);
  await page.screenshot({ path: pilotPath });
  await test.info().attach(`crossfire-pilot-${test.info().project.name}`, {
    path: pilotPath,
    contentType: 'image/png',
  });

  if (!process.env.CI) {
    const renderCost = await page.evaluate(async () => {
      const harness = window.__SPACE_EXPLORER_BROWSER_HARNESS__;
      if (!harness) throw new Error('Browser harness is not installed');
      return harness.measureLaneReadingPilotRenderCost();
    });
    expect(renderCost.baseline.sampleCount).toBe(90);
    expect(renderCost.glow.sampleCount).toBe(90);
    expect(renderCost.averageRegressionMs).toBeLessThanOrEqual(1);
    expect(renderCost.p95RegressionMs).toBeLessThanOrEqual(2);
    await test.info().attach(`crossfire-render-cost-${test.info().project.name}`, {
      body: JSON.stringify(renderCost, null, 2),
      contentType: 'application/json',
    });
    console.info(`crossfire render cost ${test.info().project.name}: ${JSON.stringify(renderCost)}`);
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

test('mobile portrait guard recovers to landscape gameplay', async ({ page, assertNoBrowserErrors }) => {
  test.skip(test.info().project.name !== 'chromium-mobile', 'mobile-only orientation scenario');

  await openMenu(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator('#rotate-device-overlay')).toBeVisible();
  await expect(page.locator('#game-root > canvas')).toBeHidden();

  await page.setViewportSize({ width: 844, height: 390 });
  await expect(page.locator('#rotate-device-overlay')).toBeHidden();
  await expect(page.locator('#game-root > canvas')).toBeVisible();
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
  await expect(page.locator('#rotate-device-overlay')).toBeHidden();
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
