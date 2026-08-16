import { expect, openMenu, snapshot, startNewRun, test, waitForScene } from './fixtures';

async function sampleGameplayLaneLuminance(page: import('@playwright/test').Page): Promise<{
  center: number;
  edges: number;
}> {
  const screenshot = await page.screenshot();
  return page.evaluate(async (base64) => {
    const binary = atob(base64);
    const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
    const bitmap = await createImageBitmap(new Blob([bytes], { type: 'image/png' }));
    const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Screenshot sampling canvas is unavailable');
    context.drawImage(bitmap, 0, 0);
    const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
    bitmap.close();

    const average = (ranges: ReadonlyArray<readonly [number, number]>): number => {
      let luminance = 0;
      let samples = 0;
      const step = Math.max(1, Math.floor(Math.min(canvas.width, canvas.height) / 160));
      for (let y = Math.floor(canvas.height * 0.15); y < canvas.height * 0.85; y += step) {
        for (const [start, end] of ranges) {
          for (let x = Math.floor(canvas.width * start); x < canvas.width * end; x += step) {
            const offset = (y * canvas.width + x) * 4;
            luminance += pixels[offset] * 0.2126 + pixels[offset + 1] * 0.7152 + pixels[offset + 2] * 0.0722;
            samples += 1;
          }
        }
      }
      return luminance / Math.max(1, samples);
    };

    return {
      center: average([[0.38, 0.62]]),
      edges: average([
        [0.05, 0.29],
        [0.71, 0.95],
      ]),
    };
  }, screenshot.toString('base64'));
}

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

test('all planet arrivals share a responsive cinematic system with distinct identities', async ({
  page,
  assertNoBrowserErrors,
}) => {
  test.setTimeout(60_000);
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
