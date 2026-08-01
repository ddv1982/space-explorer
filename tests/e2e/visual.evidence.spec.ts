import { expect, openMenu, startNewRun, test } from './fixtures';

test('crossfire telegraph glow preserves readable gameplay lanes', async ({
  page,
  assertNoBrowserErrors,
}) => {
  test.setTimeout(60_000);
  await openMenu(page);
  await startNewRun(page);
  const evidenceTarget = test.info().project.name.replace('-evidence', '');
  const baselinePilot = await page.evaluate(() => {
    const harness = window.__SPACE_EXPLORER_BROWSER_HARNESS__;
    if (!harness) throw new Error('Browser harness is not installed');
    return harness.showLaneReadingPilot(false);
  });

  expect(baselinePilot.sectionId).toBe('slipstream-prism-cross');
  expect(baselinePilot.filterCount).toBe(1);
  const evidenceDirectory = process.env.VISUAL_SCREENSHOT_DIR;
  const baselineName = `crossfire-baseline-${evidenceTarget}.png`;
  const baselinePath = evidenceDirectory
    ? `${evidenceDirectory}/${baselineName}`
    : test.info().outputPath(baselineName);
  await page.screenshot({ path: baselinePath });
  await test.info().attach(`crossfire-baseline-${evidenceTarget}`, {
    path: baselinePath,
    contentType: 'image/png',
  });

  const pilot = await page.evaluate(() => {
    const harness = window.__SPACE_EXPLORER_BROWSER_HARNESS__;
    if (!harness) throw new Error('Browser harness is not installed');
    return harness.showLaneReadingPilot(true);
  });
  expect(pilot.filterCount).toBe(1);
  const pilotName = `crossfire-pilot-${evidenceTarget}.png`;
  const pilotPath = evidenceDirectory
    ? `${evidenceDirectory}/${pilotName}`
    : test.info().outputPath(pilotName);
  await page.screenshot({ path: pilotPath });
  await test.info().attach(`crossfire-pilot-${evidenceTarget}`, {
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
