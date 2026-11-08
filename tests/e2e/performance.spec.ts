import { expect, openMenu, startNewRun, test } from './fixtures';

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

test('enforces the approved gameplay update-cost threshold', async ({ page, assertNoBrowserErrors }) => {
  test.setTimeout(600_000);
  const sampleCount = 10;
  const warmupFrames = 2;
  const replicateCount = 5;
  const thresholdMs = 5;
  for (const syntheticUpdateWorkMs of [0, 6]) {
    const mode = syntheticUpdateWorkMs === 0 ? 'normal' : 'synthetic';
    const updateP95Values: number[] = [];

    for (let replicate = 0; replicate < replicateCount; replicate += 1) {
      await openMenu(page);
      await startNewRun(page);
      await page.keyboard.down('ArrowLeft');
      await page.keyboard.down('Space');
      try {
        const metrics = await page.evaluate(
          async ({ count, warmup, syntheticMs }) => {
            const harness = window.__SPACE_EXPLORER_BROWSER_HARNESS__;
            if (!harness) throw new Error('Browser harness is not installed');
            return harness.probeFramePacing(count, { warmupFrames: warmup, syntheticUpdateWorkMs: syntheticMs });
          },
          { count: sampleCount, warmup: warmupFrames, syntheticMs: syntheticUpdateWorkMs }
        );
        expect(metrics.sampleCount).toBe(sampleCount);
        expect(metrics.warmupFrames).toBe(warmupFrames);
        expect(metrics.syntheticUpdateWorkMs).toBe(syntheticUpdateWorkMs);
        expect(metrics.workCost.update.sampleCount).toBe(sampleCount);
        expect(metrics.runtimeLoad.activePhysicsBodyCount).toBeGreaterThan(0);
        expect(metrics.runtimeLoad.laserRequestCount).toBeGreaterThan(0);
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
    expect(report.thresholdFailureCount, `PERFORMANCE_GATE_FAILURE_COUNT ${JSON.stringify(report)}`).toBe(
      mode === 'normal' ? 0 : replicateCount
    );
    if (mode === 'normal') {
      expect(
        report.maxUpdateP95Ms,
        `PERFORMANCE_GATE_THRESHOLD_EXCEEDED ${JSON.stringify(report)}`
      ).toBeLessThanOrEqual(thresholdMs);
    } else {
      expect(report.updateP95.min, `PERFORMANCE_GATE_SYNTHETIC_NOT_DETECTED ${JSON.stringify(report)}`).toBeGreaterThan(
        thresholdMs
      );
    }
  }
});
