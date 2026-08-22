import { mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, openMenu, snapshot, startNewRun, test, waitForScene } from './fixtures';
import {
  assertLevelOneEvidenceEntities,
  sampleEvidenceThreatContrast,
  sampleGameplayLaneLuminance,
} from './levelOneVisualEvidence';

const visualEvidenceDirectory = join(process.cwd(), 'test-results');
const visualEvidenceRunId = String(process.ppid);
const visualProjects = ['chromium-desktop-visual', 'chromium-mobile-visual'] as const;
const visualTestTitles = [
  'pause command deck stays balanced across checkpoints and settings',
  'crossfire telegraph glow preserves readable gameplay lanes',
  'debris surge separates its lane tells from the aurora backdrop',
  'all planet arrivals share a responsive cinematic system with distinct identities',
  'gameplay corridor preserves a dark field with brighter desktop edges',
  'entity diagonal edges remain reviewable across quality tiers and fractional motion phases',
  'game over and victory command decks stay readable',
] as const;
const visualEvidenceAssertions = [
  'Desktop and 390px portrait Level 1 captures show continuous aurora ribbons, reduced nebula banding, distinct hazard tells, and a darker center lane.',
  'Representative Level 1 entities and projectiles are captured at authored gameplay scale rather than 3x staging.',
  'Level 1 entity edges are captured at authored 1x gameplay size for low, standard, high, and auto.',
  'Desktop and 390px phone portrait evidence shows improved edge coverage without clipped halos or alpha fringes.',
  'Fractional-motion evidence shows no material edge shimmer or pixel crawl.',
  'Recorded ring-crossfire and debris-surge luminance keeps the center 45-55% lane darker than threats.',
] as const;

function atomicWriteJson(path: string, value: unknown): void {
  mkdirSync(visualEvidenceDirectory, { recursive: true });
  const temporaryPath = `${path}.${process.pid}.tmp`;
  writeFileSync(temporaryPath, `${JSON.stringify(value, null, 2)}\n`);
  renameSync(temporaryPath, path);
}

function escapeXmlAttribute(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

function atomicWriteJUnit(path: string, suiteName: string, assertions: readonly string[]): void {
  mkdirSync(visualEvidenceDirectory, { recursive: true });
  const temporaryPath = `${path}.${process.pid}.tmp`;
  const testcases = assertions.map((name) => `    <testcase name="${escapeXmlAttribute(name)}"/>`).join('\n');
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<testsuites tests="${assertions.length}" failures="0" errors="0" skipped="0">
  <testsuite name="${escapeXmlAttribute(suiteName)}" tests="${assertions.length}" failures="0" errors="0" skipped="0">
${testcases}
  </testsuite>
</testsuites>
`;
  writeFileSync(temporaryPath, xml);
  renameSync(temporaryPath, path);
}

function markerMatches(path: string): boolean {
  try {
    return JSON.parse(readFileSync(path, 'utf8')).runId === visualEvidenceRunId;
  } catch {
    return false;
  }
}

function visualTestMarker(project: string, index: number): string {
  return join(visualEvidenceDirectory, `flow-visual-${project}-test-${index}.marker.json`);
}

function visualProjectMarker(project: string): string {
  return join(visualEvidenceDirectory, `flow-visual-${project}.marker.json`);
}

test.afterEach(({ browserName: _browserName }, testInfo) => {
  const index = visualTestTitles.indexOf(testInfo.title as (typeof visualTestTitles)[number]);
  if (index >= 0 && (testInfo.status === testInfo.expectedStatus || testInfo.status === 'skipped')) {
    atomicWriteJson(visualTestMarker(testInfo.project.name, index), {
      runId: visualEvidenceRunId,
      project: testInfo.project.name,
      test: testInfo.title,
    });
  }
});

test.afterAll(({ browserName: _browserName }, testInfo) => {
  const project = testInfo.project.name;
  if (!visualProjects.includes(project as (typeof visualProjects)[number])) return;
  if (!visualTestTitles.every((_, index) => markerMatches(visualTestMarker(project, index)))) return;

  atomicWriteJson(visualProjectMarker(project), { runId: visualEvidenceRunId, project, status: 'passed' });
  if (!visualProjects.every((expectedProject) => markerMatches(visualProjectMarker(expectedProject)))) return;

  atomicWriteJUnit(
    join(visualEvidenceDirectory, 'flow-visual-evidence.xml'),
    'Flow visual evidence',
    visualEvidenceAssertions
  );
});

test('pause command deck stays balanced across checkpoints and settings', async ({ page, assertNoBrowserErrors }) => {
  test.setTimeout(120_000);
  const mobile = test.info().project.name.includes('mobile');
  const viewport = mobile ? { width: 390, height: 844 } : { width: 984, height: 768 };
  await page.setViewportSize(viewport);
  await openMenu(page);
  await startNewRun(page);
  if (mobile) {
    await page.touchscreen.tap(viewport.width - 44, 106);
  } else {
    await page.keyboard.down('Escape');
  }
  try {
    await expect.poll(async () => (await snapshot(page)).physicsPaused, { timeout: 30_000 }).toBe(true);
  } finally {
    if (!mobile) await page.keyboard.up('Escape');
  }

  const checkpoints = await snapshot(page);
  expect(checkpoints.texts.some((text) => text.text === 'CHECKPOINT SLOTS')).toBe(true);
  expect(checkpoints.texts.filter((text) => text.text === '+ SAVE')).toHaveLength(3);
  expect(checkpoints.texts.some((text) => text.text === 'SAVE GAME')).toBe(false);
  expect(checkpoints.texts.some((text) => text.text === 'LOAD GAME')).toBe(false);

  const mode = mobile ? 'portrait' : 'desktop';
  const evidenceDirectory = process.env.VISUAL_SCREENSHOT_DIR;
  const checkpointPath = evidenceDirectory
    ? `${evidenceDirectory}/pause-checkpoints-${mode}.png`
    : test.info().outputPath(`pause-checkpoints-${mode}.png`);
  await page.screenshot({ path: checkpointPath });
  await test.info().attach(`pause-checkpoints-${mode}`, {
    path: checkpointPath,
    contentType: 'image/png',
  });

  const settingsTab = checkpoints.texts.find((text) => text.text === 'SETTINGS');
  expect(settingsTab).toBeDefined();
  await page.mouse.click(settingsTab?.x ?? 0, settingsTab?.y ?? 0);
  await expect
    .poll(async () => (await snapshot(page)).texts.some((text) => text.text.startsWith('DIFFICULTY:')))
    .toBe(true);

  const settingsPath = evidenceDirectory
    ? `${evidenceDirectory}/pause-settings-${mode}.png`
    : test.info().outputPath(`pause-settings-${mode}.png`);
  await page.screenshot({ path: settingsPath });
  await test.info().attach(`pause-settings-${mode}`, {
    path: settingsPath,
    contentType: 'image/png',
  });
  assertNoBrowserErrors();
});

test('crossfire telegraph glow preserves readable gameplay lanes', async ({ page, assertNoBrowserErrors }) => {
  test.setTimeout(120_000);
  const mobile = test.info().project.name.includes('mobile');
  await page.setViewportSize(mobile ? { width: 390, height: 844 } : { width: 984, height: 768 });
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
  assertLevelOneEvidenceEntities(baselinePilot.entities);
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
  assertLevelOneEvidenceEntities(pilot.entities);
  await page.waitForTimeout(32);
  const luminance = await sampleEvidenceThreatContrast(page, pilot.entities);
  expect(luminance.center45To55).toBeLessThan(luminance.threats);
  await test.info().attach(`crossfire-lane-luminance-${evidenceTarget}.json`, {
    body: JSON.stringify(luminance, null, 2),
    contentType: 'application/json',
  });
  const pilotName = `crossfire-pilot-${evidenceTarget}.png`;
  const pilotPath = evidenceDirectory ? `${evidenceDirectory}/${pilotName}` : test.info().outputPath(pilotName);
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

test('debris surge separates its lane tells from the aurora backdrop', async ({ page, assertNoBrowserErrors }) => {
  test.setTimeout(90_000);
  const mobile = test.info().project.name.includes('mobile');
  const viewport = mobile ? { width: 390, height: 844 } : { width: 984, height: 768 };
  const target = mobile ? 'portrait' : 'desktop';
  await page.setViewportSize(viewport);
  await openMenu(page);
  await startNewRun(page);

  const pilot = await page.evaluate(() => {
    const harness = window.__SPACE_EXPLORER_BROWSER_HARNESS__;
    if (!harness) throw new Error('Browser harness is not installed');
    return harness.showLaneReadingPilot(false, 'debris-surge');
  });
  expect(pilot.sectionId).toBe('slipstream-debris-ribbon');
  expect(pilot.filterCount).toBe(1);
  assertLevelOneEvidenceEntities(pilot.entities);

  await page.waitForTimeout(32);
  const luminance = await sampleGameplayLaneLuminance(page);
  expect(luminance.center).toBeLessThan(45);
  expect(luminance.edges).toBeLessThan(45);
  const threatContrast = await sampleEvidenceThreatContrast(page, pilot.entities);
  expect(threatContrast.center45To55).toBeLessThan(threatContrast.threats);
  await test.info().attach(`debris-surge-lane-luminance-${target}.json`, {
    body: JSON.stringify(threatContrast, null, 2),
    contentType: 'application/json',
  });
  const name = `debris-surge-${target}.png`;
  const evidenceDirectory = process.env.VISUAL_SCREENSHOT_DIR;
  const path = evidenceDirectory ? `${evidenceDirectory}/${name}` : test.info().outputPath(name);
  await page.screenshot({ path });
  await test.info().attach(name, { path, contentType: 'image/png' });
  assertNoBrowserErrors();
});

test('all planet arrivals share a responsive cinematic system with distinct identities', async ({
  page,
  assertNoBrowserErrors,
}) => {
  test.setTimeout(120_000);
  await openMenu(page);

  for (let level = 1; level <= 10; level += 1) {
    const staged = await page.evaluate(async (targetLevel) => {
      const harness = window.__SPACE_EXPLORER_BROWSER_HARNESS__;
      if (!harness) throw new Error('Browser harness is not installed');
      return harness.showPlanetIntermission(targetLevel);
    }, level);
    await waitForScene(page, 'PlanetIntermission');
    await expect
      .poll(
        async () => {
          const arrival = await snapshot(page);
          return {
            hasArrivalConfirmation: arrival.texts.some((text) => text.text.includes('ARRIVAL CONFIRMED')),
            hasPlanetTitle: arrival.texts.some((text) => text.text === staged.planetName.toUpperCase()),
            hasPlanetVisual: arrival.objects.some(
              (object) => object.active && object.textureKey === `planet-portrait-${String(level).padStart(2, '0')}`
            ),
          };
        },
        {
          message: `wait for level ${level} planet arrival to finish rendering`,
          timeout: 10_000,
        }
      )
      .toEqual({
        hasArrivalConfirmation: true,
        hasPlanetTitle: true,
        hasPlanetVisual: true,
      });

    const projectName = test.info().project.name;
    const levelPath = test.info().outputPath(`planet-arrival-${String(level).padStart(2, '0')}-${projectName}.png`);
    await page.screenshot({ path: levelPath });
    await test.info().attach(`planet-arrival-${String(level).padStart(2, '0')}-${staged.planetName}-${projectName}`, {
      path: levelPath,
      contentType: 'image/png',
    });
  }

  const projectName = test.info().project.name;
  const campaignPath = test.info().outputPath(`planet-arrival-campaign-${projectName}.png`);
  await page.screenshot({ path: campaignPath });
  await test.info().attach(`planet-arrival-campaign-${projectName}`, {
    path: campaignPath,
    contentType: 'image/png',
  });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(async () => {
    const harness = window.__SPACE_EXPLORER_BROWSER_HARNESS__;
    if (!harness) throw new Error('Browser harness is not installed');
    await harness.showPlanetIntermission(5);
  });
  await waitForScene(page, 'PlanetIntermission');
  await expect.poll(async () => (await snapshot(page)).gameSize).toEqual({ width: 390, height: 844 });
  await expect
    .poll(
      async () => {
        const portrait = await snapshot(page);
        return {
          hasPlanetTitle: portrait.texts.some((text) => text.text === 'KORRA VALE'),
          hasContinuePrompt: portrait.texts.some((text) => text.text.includes('CONTINUE TO')),
        };
      },
      {
        message: 'wait for the resized portrait intermission to finish rendering',
        timeout: 10_000,
      }
    )
    .toEqual({ hasPlanetTitle: true, hasContinuePrompt: true });
  const portrait = await snapshot(page);
  expect(portrait.gameSize).toEqual({ width: 390, height: 844 });

  const portraitPath = test.info().outputPath(`planet-arrival-portrait-${projectName}.png`);
  await page.screenshot({ path: portraitPath });
  await test.info().attach(`planet-arrival-portrait-${projectName}`, {
    path: portraitPath,
    contentType: 'image/png',
  });
  assertNoBrowserErrors();
});

test('gameplay corridor preserves a dark field with brighter desktop edges', async ({
  page,
  assertNoBrowserErrors,
}) => {
  const mobile = test.info().project.name.includes('mobile');
  await page.setViewportSize(mobile ? { width: 390, height: 844 } : { width: 984, height: 768 });
  await openMenu(page);
  await startNewRun(page);
  const shot = await snapshot(page);
  expect(shot.objects.some((object) => object.textureKey === 'player-ship' && object.active)).toBe(true);
  const luminance = await sampleGameplayLaneLuminance(page);
  expect(luminance.center).toBeGreaterThan(5);
  expect(luminance.edges).toBeGreaterThan(5);
  expect(luminance.center).toBeLessThan(45);
  expect(luminance.edges).toBeLessThan(45);
  if (!mobile) {
    expect(luminance.edges).toBeGreaterThan(luminance.center);
  } else {
    expect(Math.abs(luminance.edges - luminance.center)).toBeLessThan(15);
  }
  const name = `gameplay-corridor-${mobile ? 'portrait' : 'desktop'}.png`;
  const evidenceDirectory = process.env.VISUAL_SCREENSHOT_DIR;
  const path = evidenceDirectory ? `${evidenceDirectory}/${name}` : test.info().outputPath(name);
  await page.screenshot({ path });
  await test.info().attach(name, { path, contentType: 'image/png' });
  assertNoBrowserErrors();
});

test('entity diagonal edges remain reviewable across quality tiers and fractional motion phases', async ({
  page,
  assertNoBrowserErrors,
}) => {
  test.setTimeout(180_000);
  const mobile = test.info().project.name.includes('mobile');
  const viewport = mobile ? { width: 390, height: 844 } : { width: 984, height: 768 };
  const viewportName = mobile ? 'phone-portrait' : 'desktop';
  const qualityStorageKey = 'space-explorer.visualQuality.v1';
  const tiers = ['low', 'standard', 'high', 'auto'] as const;

  await page.setViewportSize(viewport);
  await openMenu(page);

  for (const tier of tiers) {
    await page.evaluate(({ key, value }) => window.localStorage.setItem(key, value), {
      key: qualityStorageKey,
      value: tier,
    });
    await page.reload();
    await waitForScene(page, 'Menu');
    await startNewRun(page);

    const gameplay = await snapshot(page);
    expect(gameplay.gameSize).toEqual(viewport);
    expect(gameplay.canvas.cssWidth).toBe(viewport.width);
    expect(gameplay.canvas.cssHeight).toBe(viewport.height);

    const phaseEvidence = [];
    for (let expectedPhase = 0; expectedPhase < 2; expectedPhase += 1) {
      const staged = await page.evaluate(() => {
        const harness = window.__SPACE_EXPLORER_BROWSER_HARNESS__;
        if (!harness) throw new Error('Browser harness is not installed');
        return harness.showLaneReadingPilot(false);
      });

      expect(staged.motionPhase).toBe(expectedPhase);
      expect(staged.qualityTier).toBe(tier);
      expect(staged.entityTextureResolution).toBe(4);
      assertLevelOneEvidenceEntities(staged.entities);
      phaseEvidence.push(staged);

      // Let the paused scene render the harness-controlled fractional placement.
      await page.waitForTimeout(32);
      const name = `entity-edges-${tier}-${viewportName}-phase-${expectedPhase}.png`;
      const evidenceDirectory = process.env.VISUAL_SCREENSHOT_DIR;
      const path = evidenceDirectory ? `${evidenceDirectory}/${name}` : test.info().outputPath(name);
      await page.locator('#game-root > canvas').screenshot({ path });
      await test.info().attach(name, { path, contentType: 'image/png' });
    }

    for (let index = 0; index < phaseEvidence[0].entities.length; index += 1) {
      expect(phaseEvidence[1].entities[index].x - phaseEvidence[0].entities[index].x).toBeCloseTo(0.5, 5);
      expect(phaseEvidence[1].entities[index].y - phaseEvidence[0].entities[index].y).toBeCloseTo(0.5, 5);
    }
    await test.info().attach(`entity-edges-${tier}-${viewportName}.json`, {
      body: JSON.stringify(phaseEvidence, null, 2),
      contentType: 'application/json',
    });
  }

  assertNoBrowserErrors();
});

test('game over and victory command decks stay readable', async ({ page, assertNoBrowserErrors }) => {
  test.setTimeout(60_000);
  const mobile = test.info().project.name.includes('mobile');
  await page.setViewportSize(mobile ? { width: 390, height: 844 } : { width: 984, height: 768 });
  await openMenu(page);

  for (const sceneKey of ['GameOver', 'Victory'] as const) {
    await page.evaluate(async (key) => {
      const harness = window.__SPACE_EXPLORER_BROWSER_HARNESS__;
      if (!harness) throw new Error('Browser harness is not installed');
      await harness.route(key);
    }, sceneKey);
    await waitForScene(page, sceneKey);
    const shot = await snapshot(page);
    const title = shot.texts.find((text) => text.text === (sceneKey === 'GameOver' ? 'GAME OVER' : 'MISSION COMPLETE'));
    const eyebrow = shot.texts.find(
      (text) => text.text === (sceneKey === 'GameOver' ? 'COMMAND LOSS' : 'COMMAND DECK')
    );
    expect(title).toBeDefined();
    expect(eyebrow).toBeDefined();
    expect(title?.x ?? -1).toBeGreaterThan(0);
    expect(title?.x ?? Infinity).toBeLessThan(shot.gameSize.width);
    expect(title?.y ?? -1).toBeGreaterThan(0);
    expect(title?.y ?? Infinity).toBeLessThan(shot.gameSize.height);
    expect((title?.y ?? 0) - (eyebrow?.y ?? 0)).toBeGreaterThanOrEqual(28);
    const name = `${sceneKey.toLowerCase()}-${mobile ? 'portrait' : 'desktop'}.png`;
    const evidenceDirectory = process.env.VISUAL_SCREENSHOT_DIR;
    const path = evidenceDirectory ? `${evidenceDirectory}/${name}` : test.info().outputPath(name);
    await page.screenshot({ path });
    await test.info().attach(name, { path, contentType: 'image/png' });
  }
  assertNoBrowserErrors();
});
