import type { BrowserHarnessFrameDeliveryProbe, BrowserHarnessFramePacingProbe } from '../../src/browserHarness';
import { expect, openMenu, snapshot, startNewRun, test } from './fixtures';

function expectConsistentFramePacingMetrics(metrics: BrowserHarnessFramePacingProbe, sampleCount: number): void {
  expect(metrics.sampleCount).toBe(sampleCount);
  expect(metrics.warmupFrames).toBeGreaterThanOrEqual(0);
  expect(metrics.syntheticUpdateWorkMs).toBeGreaterThanOrEqual(0);
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
  for (const workCost of [metrics.workCost.update, metrics.workCost.renderSubmission]) {
    expect(workCost.sampleCount).toBe(metrics.sampleCount);
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
  // A stable section may need no music-intensity request during this probe. The
  // transition contract is covered by gameplayFrameBehaviorPerformance.test.ts;
  // here we verify that request pressure stays below the sampled frame count.
  expect(metrics.runtimeLoad.musicIntensityRequestCount).toBeGreaterThanOrEqual(0);
  expect(metrics.runtimeLoad.musicIntensityRequestCount).toBeLessThan(metrics.sampleCount);
  // Music deduplication also avoids the context-resume path previously reached
  // once per frame; bound it below frame cadence to catch that regression.
  expect(metrics.runtimeLoad.audioResumeRequestCount).toBeGreaterThanOrEqual(0);
  expect(metrics.runtimeLoad.audioResumeRequestCount).toBeLessThan(metrics.sampleCount);
  expect(metrics.runtimeLoad.laserRequestCount).toBeGreaterThanOrEqual(0);
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const midpoint = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? ((sorted[midpoint - 1] ?? 0) + (sorted[midpoint] ?? 0)) / 2
    : (sorted[midpoint] ?? 0);
}

function summarizeReplicates(values: number[]) {
  const center = median(values);
  const mad = median(values.map((value) => Math.abs(value - center)));
  const average = values.reduce((total, value) => total + value, 0) / values.length;
  const variance = values.reduce((total, value) => total + (value - average) ** 2, 0) / values.length;
  return {
    values,
    min: Math.min(...values),
    max: Math.max(...values),
    median: center,
    mad,
    coefficientOfVariation: average > 0 ? Math.sqrt(variance) / average : 0,
  };
}

function expectConsistentFrameDeliveryMetrics(metrics: BrowserHarnessFrameDeliveryProbe, sampleCount: number): void {
  expect(metrics.sampleCount).toBe(sampleCount);
  expect(metrics.averageMs).toBeGreaterThan(0);
  expect(metrics.p50Ms).toBeLessThanOrEqual(metrics.p95Ms);
  expect(metrics.p95Ms).toBeLessThanOrEqual(metrics.p99Ms);
  expect(metrics.p99Ms).toBeLessThanOrEqual(metrics.maxMs);
  expect(metrics.cadenceDropThresholdMs).toBeGreaterThan(metrics.p50Ms);
  expect(metrics.cadenceDropCount).toBeGreaterThanOrEqual(0);
  expect(metrics.cadenceDropCount).toBeLessThanOrEqual(sampleCount);
  expect(metrics.cadenceDropRatio).toBe(metrics.cadenceDropCount / sampleCount);
  expect(metrics.over33_33MsCount).toBeGreaterThanOrEqual(0);
  expect(metrics.over33_33MsCount).toBeLessThanOrEqual(sampleCount);
}

test('runtime feedback remains comparable under measured low frame delivery', async ({
  page,
  assertNoBrowserErrors,
}) => {
  test.skip(!test.info().project.name.includes('desktop'), 'desktop frame-rate comparison');
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

test('characterizes a repeatable update-cost regression signal', async ({ page, assertNoBrowserErrors }) => {
  test.skip(!process.env.PERFORMANCE_CHARACTERIZE, 'explicit characterization run only');
  test.skip(!test.info().project.name.includes('desktop'), 'desktop update-cost contract');
  test.setTimeout(300_000);
  const sampleCount = Number(process.env.PERFORMANCE_SAMPLE_COUNT ?? 240);
  const warmupFrames = Number(process.env.PERFORMANCE_WARMUP_FRAMES ?? 120);
  const syntheticUpdateWorkMs = 6;
  const conditions = [
    'baseline',
    'synthetic',
    'synthetic',
    'baseline',
    'baseline',
    'synthetic',
    'baseline',
    'synthetic',
    'synthetic',
    'baseline',
  ] as const;
  const results: Array<{ condition: (typeof conditions)[number]; metrics: BrowserHarnessFramePacingProbe }> = [];

  for (const condition of conditions) {
    await openMenu(page);
    await startNewRun(page);
    await page.keyboard.down('ArrowLeft');
    await page.keyboard.down('Space');
    try {
      await expect
        .poll(async () =>
          (await snapshot(page)).objects.some((object) => object.textureKey === 'player-bullet' && object.active)
        )
        .toBe(true);
      const metrics = await page.evaluate(
        async ({ count, warmup, syntheticMs }) => {
          const harness = window.__SPACE_EXPLORER_BROWSER_HARNESS__;
          if (!harness) throw new Error('Browser harness is not installed');
          return harness.probeFramePacing(count, { warmupFrames: warmup, syntheticUpdateWorkMs: syntheticMs });
        },
        {
          count: sampleCount,
          warmup: warmupFrames,
          syntheticMs: condition === 'synthetic' ? syntheticUpdateWorkMs : 0,
        }
      );
      expectConsistentFramePacingMetrics(metrics, sampleCount);
      results.push({ condition, metrics });
    } finally {
      await page.keyboard.up('Space').catch((): void => undefined);
      await page.keyboard.up('ArrowLeft').catch((): void => undefined);
    }
  }

  const baseline = summarizeReplicates(
    results.filter((result) => result.condition === 'baseline').map((result) => result.metrics.workCost.update.p95Ms)
  );
  const synthetic = summarizeReplicates(
    results.filter((result) => result.condition === 'synthetic').map((result) => result.metrics.workCost.update.p95Ms)
  );
  const candidateThresholdMs = baseline.max + Math.max(1, baseline.mad * 3);
  const approvedThresholdMs = Math.ceil(candidateThresholdMs);
  const report = {
    environment: await page.evaluate(() => {
      const canvas = document.querySelector('canvas');
      const gl = canvas?.getContext('webgl2') ?? canvas?.getContext('webgl');
      const debugInfo = gl?.getExtension('WEBGL_debug_renderer_info');
      return {
        userAgent: navigator.userAgent,
        hardwareConcurrency: navigator.hardwareConcurrency,
        deviceMemory: (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? null,
        webglRenderer: debugInfo ? gl?.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) : null,
      };
    }),
    sampleCount,
    warmupFrames,
    replicateCount: baseline.values.length,
    syntheticUpdateWorkMs,
    primarySignal: 'workCost.update.p95Ms',
    baseline,
    synthetic,
    candidateThresholdMs,
    approvedThresholdMs,
    syntheticFailureCount: synthetic.values.filter((value) => value > approvedThresholdMs).length,
    pairedMedianDifferenceMs: synthetic.median - baseline.median,
  };
  console.log(`PERFORMANCE_GATE_CHARACTERIZATION ${JSON.stringify(report)}`);
  await test.info().attach('performance-gate-characterization.json', {
    body: JSON.stringify(report, null, 2),
    contentType: 'application/json',
  });

  expect(baseline.values.every((value) => value <= approvedThresholdMs)).toBe(true);
  expect(report.pairedMedianDifferenceMs).toBeGreaterThanOrEqual(5);
  expect(report.syntheticFailureCount).toBe(synthetic.values.length);
  assertNoBrowserErrors();
});

test('enforces the approved gameplay update-cost threshold', async ({ page, assertNoBrowserErrors }) => {
  const mode = process.env.PERFORMANCE_GATE_MODE;
  test.skip(!mode, 'explicit performance gate run only');
  test.skip(!test.info().project.name.includes('desktop-performance-gate'), 'dedicated desktop threshold project');
  if (mode !== 'normal' && mode !== 'synthetic') {
    throw new Error(`Unsupported PERFORMANCE_GATE_MODE: ${mode}`);
  }

  test.setTimeout(180_000);
  const sampleCount = 10;
  const warmupFrames = 2;
  const replicateCount = 5;
  const thresholdMs = 2;
  const syntheticUpdateWorkMs = mode === 'synthetic' ? 6 : 0;
  const updateP95Values: number[] = [];

  for (let replicate = 0; replicate < replicateCount; replicate += 1) {
    await openMenu(page);
    await startNewRun(page);
    await page.keyboard.down('ArrowLeft');
    await page.keyboard.down('Space');
    try {
      await expect
        .poll(async () =>
          (await snapshot(page)).objects.some((object) => object.textureKey === 'player-bullet' && object.active)
        )
        .toBe(true);
      const metrics = await page.evaluate(
        async ({ count, warmup, syntheticMs }) => {
          const harness = window.__SPACE_EXPLORER_BROWSER_HARNESS__;
          if (!harness) throw new Error('Browser harness is not installed');
          return harness.probeFramePacing(count, { warmupFrames: warmup, syntheticUpdateWorkMs: syntheticMs });
        },
        { count: sampleCount, warmup: warmupFrames, syntheticMs: syntheticUpdateWorkMs }
      );
      expectConsistentFramePacingMetrics(metrics, sampleCount);
      updateP95Values.push(metrics.workCost.update.p95Ms);
    } finally {
      await page.keyboard.up('Space').catch((): void => undefined);
      await page.keyboard.up('ArrowLeft').catch((): void => undefined);
    }
  }

  const report = {
    mode,
    environment: await page.evaluate(() => {
      const canvas = document.querySelector('canvas');
      const gl = canvas?.getContext('webgl2') ?? canvas?.getContext('webgl');
      const debugInfo = gl?.getExtension('WEBGL_debug_renderer_info');
      return {
        userAgent: navigator.userAgent,
        hardwareConcurrency: navigator.hardwareConcurrency,
        deviceMemory: (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? null,
        webglRenderer: debugInfo ? gl?.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) : null,
      };
    }),
    signal: 'workCost.update.p95Ms',
    thresholdMs,
    sampleCount,
    warmupFrames,
    replicateCount,
    syntheticUpdateWorkMs,
    updateP95: summarizeReplicates(updateP95Values),
    thresholdFailureCount: updateP95Values.filter((value) => value > thresholdMs).length,
    maxUpdateP95Ms: Math.max(...updateP95Values),
  };
  console.info(`PERFORMANCE_GATE_RESULT ${JSON.stringify(report)}`);
  await test.info().attach(`performance-gate-${mode}.json`, {
    body: JSON.stringify(report, null, 2),
    contentType: 'application/json',
  });

  assertNoBrowserErrors();
  if (mode === 'synthetic') {
    expect(report.thresholdFailureCount, `PERFORMANCE_GATE_SYNTHETIC_INCOMPLETE ${JSON.stringify(report)}`).toBe(
      replicateCount
    );
  }
  expect(report.maxUpdateP95Ms, `PERFORMANCE_GATE_THRESHOLD_EXCEEDED ${JSON.stringify(report)}`).toBeLessThanOrEqual(
    thresholdMs
  );
});

test('captures representative active-gameplay frame pacing with non-invasive load context', async ({
  page,
  assertNoBrowserErrors,
}) => {
  test.setTimeout(300_000);
  // CI software WebGL verifies the probe paths; local evidence runs retain the full comparison window.
  const sampleCount = process.env.CI ? 10 : 60;
  const activeTrailIntervalMs = 150;
  const mobile = test.info().project.name.includes('mobile');
  const measureScenario = async (options: {
    moving?: boolean;
    firing?: boolean;
    playerBulletTrails?: boolean;
    trailIntervals?: { playerMs: number; enemyMs: number };
    captureTrailEvidence?: boolean;
  }): Promise<BrowserHarnessFramePacingProbe> => {
    await openMenu(page);
    await startNewRun(page);
    // Authored scouts and asteroids wait on the gameplay clock. SwiftShader CI
    // can spend the default expect window before 2s of combat time elapses.
    // The player ship is live as soon as Game starts; that is enough to prove
    // the probe has an active scene. Local hardware still sees enemies well
    // before this poll expires.
    await expect
      .poll(async () =>
        (await snapshot(page)).objects.some(
          (object) => object.active && (object.textureKey === 'player-ship' || object.textureKey.endsWith('-texture'))
        )
      )
      .toBe(true);
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
        await expect
          .poll(async () =>
            (await snapshot(page)).objects.some((object) => object.textureKey === 'player-bullet' && object.active)
          )
          .toBe(true);
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
        const evidenceTarget = test.info().project.name.replace('-evidence', '');
        const evidenceName = `projectile-trails-${evidenceTarget}.png`;
        const evidencePath = process.env.VISUAL_SCREENSHOT_DIR
          ? `${process.env.VISUAL_SCREENSHOT_DIR}/${evidenceName}`
          : test.info().outputPath(evidenceName);
        await page.screenshot({ path: evidencePath });
        await test.info().attach(`projectile-trails-${evidenceTarget}`, {
          path: evidencePath,
          contentType: 'image/png',
        });
      }
      return metrics;
    } finally {
      if (session) {
        await session
          .send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
          .catch((): void => undefined);
      } else if (options.firing) {
        await page.keyboard.up('Space').catch((): void => undefined);
      }
      if (options.playerBulletTrails === false) {
        await page.evaluate(() => {
          window.__SPACE_EXPLORER_BROWSER_HARNESS__?.setPlayerBulletTrailEmissionEnabled(true);
        });
      }
      if (options.trailIntervals) {
        await page.evaluate((intervalMs) => {
          window.__SPACE_EXPLORER_BROWSER_HARNESS__?.setProjectileTrailIntervals(intervalMs, intervalMs);
        }, activeTrailIntervalMs);
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
  const legacyTrailEventsPerShot =
    legacyCadenceCombat.runtimeLoad.effectEventCount.playerBulletTrail /
    legacyCadenceCombat.runtimeLoad.laserRequestCount;
  const optimizedTrailEventsPerShot =
    activeCombat.runtimeLoad.effectEventCount.playerBulletTrail / activeCombat.runtimeLoad.laserRequestCount;
  const cadenceComparisonResolvable =
    sampleCount >= 60 && Math.max(legacyCadenceCombat.p95Ms, activeCombat.p95Ms) < activeTrailIntervalMs;
  const trailCadenceComparison = {
    activeTrailIntervalMs,
    cadenceComparisonResolvable,
    legacyTrailEventsPerShot,
    optimizedTrailEventsPerShot,
  };
  await test.info().attach(`frame-pacing-${test.info().project.name}`, {
    body: JSON.stringify(
      { baseline, movementOnly, firingWithoutPlayerTrails, legacyCadenceCombat, activeCombat, trailCadenceComparison },
      null,
      2
    ),
    contentType: 'application/json',
  });
  console.info(
    `frame pacing ${test.info().project.name}: ${JSON.stringify({ baseline, movementOnly, firingWithoutPlayerTrails, legacyCadenceCombat, activeCombat, trailCadenceComparison })}`
  );

  expect(activeCombat.runtimeLoad.effectEventCount.playerBulletTrail).toBeGreaterThan(0);
  expect(firingWithoutPlayerTrails.runtimeLoad.effectEventCount.playerBulletTrail).toBeGreaterThan(0);
  expect(activeCombat.runtimeLoad.laserRequestCount).toBeGreaterThan(0);
  expect(legacyCadenceCombat.runtimeLoad.effectEventCount.playerBulletTrail).toBeGreaterThan(0);
  if (cadenceComparisonResolvable) {
    expect(optimizedTrailEventsPerShot).toBeLessThan(legacyTrailEventsPerShot * 0.8);
  }

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
    const interruptedProbe = harness.probeFramePacing(240, { syntheticUpdateWorkMs: 6 }).then(
      () => '',
      (error) => (error instanceof Error ? error.message : String(error))
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
  await openMenu(page);
  await startNewRun(page);
  const postInterruptionProbe = await page.evaluate(async () => {
    const harness = window.__SPACE_EXPLORER_BROWSER_HARNESS__;
    if (!harness) throw new Error('Browser harness is not installed');
    return harness.probeFramePacing(2);
  });
  expect(postInterruptionProbe.workCost.update.sampleCount).toBe(2);
  expect(postInterruptionProbe.workCost.update.p95Ms).toBeLessThan(6);
  assertNoBrowserErrors();
});

test('delivers active gameplay frames without recurring refresh-cadence drops', async ({
  page,
  assertNoBrowserErrors,
}) => {
  test.skip(!test.info().project.name.includes('desktop'), 'desktop Chrome delivery regression');
  test.setTimeout(120_000);

  await openMenu(page);
  await startNewRun(page);
  // GitHub's software renderer can deliver fewer than two frames per second.
  // CI validates the probe lifecycle and metric shape; hardware-backed local
  // runs retain the full cadence sample used as the presentation gate.
  const sampleCount = process.env.CI ? 10 : 240;
  const metrics = await page.evaluate((count) => {
    const harness = window.__SPACE_EXPLORER_BROWSER_HARNESS__;
    if (!harness) throw new Error('Browser harness is not installed');
    return harness.probeFrameDelivery(count);
  }, sampleCount);

  expectConsistentFrameDeliveryMetrics(metrics, sampleCount);
  const cadenceGateResolvable = metrics.p50Ms <= 25;
  await test.info().attach(`frame-delivery-${test.info().project.name}`, {
    body: JSON.stringify({ cadenceGateResolvable, metrics }, null, 2),
    contentType: 'application/json',
  });

  // Software WebGL CI and background-throttled local browsers validate lifecycle
  // and metric structure. A real-time local run is the presentation gate that
  // catches the Chrome swap-queue regression.
  if (!process.env.CI && cadenceGateResolvable) {
    expect(metrics.p95Ms).toBeLessThanOrEqual(metrics.cadenceDropThresholdMs);
    expect(metrics.cadenceDropRatio).toBeLessThan(0.06);
  }
  assertNoBrowserErrors();
});
