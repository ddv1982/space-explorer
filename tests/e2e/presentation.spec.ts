import { expect, openMenu, snapshot, startNewRun, test, waitForScene } from './fixtures';
import {
  assertLevelOneEvidenceEntities,
  sampleEvidenceThreatContrast,
  sampleGameplayLaneLuminance,
} from './levelOneVisualEvidence';

for (const variant of ['crossfire', 'debris-surge'] as const) {
  test(`${variant} telegraph preserves readable gameplay lanes`, async ({ page, assertNoBrowserErrors }) => {
    const mobile = test.info().project.name.includes('mobile');
    await page.setViewportSize(mobile ? { width: 390, height: 844 } : { width: 984, height: 768 });
    await openMenu(page);
    await startNewRun(page);
    const pilot = await page.evaluate((mode) => {
      const harness = window.__SPACE_EXPLORER_BROWSER_HARNESS__;
      if (!harness) throw new Error('Browser harness is not installed');
      return mode === 'crossfire' ? harness.showLaneReadingPilot(true) : harness.showLaneReadingPilot(false, mode);
    }, variant);
    expect(pilot.sectionId).toBe(variant === 'crossfire' ? 'slipstream-prism-cross' : 'slipstream-debris-ribbon');
    expect(pilot.filterCount).toBe(1);
    assertLevelOneEvidenceEntities(pilot.entities);
    await page.waitForTimeout(32);
    const contrast = await sampleEvidenceThreatContrast(page, pilot.entities);
    expect(contrast.center45To55).toBeLessThan(contrast.threats);
    if (variant === 'debris-surge') {
      const luminance = await sampleGameplayLaneLuminance(page);
      expect(luminance.center).toBeLessThan(45);
      expect(luminance.edges).toBeLessThan(45);
    }
    assertNoBrowserErrors();
  });
}

test('all planet arrivals share a responsive cinematic system with distinct identities', async ({
  page,
  assertNoBrowserErrors,
}) => {
  test.setTimeout(120_000);
  await openMenu(page);

  const levels = test.info().project.name.includes('mobile')
    ? [5]
    : Array.from({ length: 10 }, (_, index) => index + 1);
  for (const level of levels) {
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
  }

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
    expect(title).toBeDefined();
    expect(title?.x ?? -1).toBeGreaterThan(0);
    expect(title?.x ?? Infinity).toBeLessThan(shot.gameSize.width);
    expect(title?.y ?? -1).toBeGreaterThan(0);
    expect(title?.y ?? Infinity).toBeLessThan(shot.gameSize.height);
    if (sceneKey === 'GameOver') {
      const goal = shot.texts.find((text) => text.text.startsWith('NEXT RUN:'));
      expect(goal).toBeDefined();
      for (const label of ['RETRY', 'MENU']) {
        const action = shot.texts.find((text) => text.text === label);
        expect(action).toBeDefined();
        expect(action?.y ?? 0).toBeGreaterThan(goal?.y ?? Infinity);
        expect((action?.x ?? 0) - (action?.width ?? 0) / 2).toBeGreaterThan(0);
        expect((action?.x ?? Infinity) + (action?.width ?? 0) / 2).toBeLessThan(shot.gameSize.width);
      }
    } else {
      const eyebrow = shot.texts.find((text) => text.text === 'COMMAND DECK');
      expect(eyebrow).toBeDefined();
      expect((title?.y ?? 0) - (eyebrow?.y ?? 0)).toBeGreaterThanOrEqual(28);
    }
  }
  assertNoBrowserErrors();
});
