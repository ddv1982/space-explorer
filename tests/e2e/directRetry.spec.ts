import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, openMenu, snapshot, startNewRun, test, waitForScene, type Page } from './fixtures';

async function gameOver(page: Page): Promise<void> {
  await page.evaluate(async () => {
    await window.__SPACE_EXPLORER_BROWSER_HARNESS__?.route('GameOver');
  });
  await waitForScene(page, 'GameOver');
}

async function activate(page: Page, label: string): Promise<void> {
  const action = page.getByRole('button', { name: label });
  await action.focus();
  await action.press('Enter');
}

test('retry resets a loaded run while preserving checkpoints and settings', async ({ page, assertNoBrowserErrors }) => {
  test.setTimeout(120000);
  await openMenu(page);
  await page.evaluate(async () => {
    const storagePath = '/src/systems/SaveSlotStorage.ts';
    const { createSaveSlotRecord, writeSaveSlot } = await import(storagePath);
    writeSaveSlot(
      createSaveSlotRecord(
        'slot-1',
        {
          level: 4,
          score: 9500,
          currentHp: 9,
          remainingLives: 1,
          currentShields: 2,
          upgrades: { hp: 2, damage: 2, fireRate: 2, shield: 2, turrets: 1 },
          helperWing: { grantedSlots: 1, slots: [{ hp: 4, remainingLives: 1 }] },
        },
        { finalScore: 9500, levelReached: 4 }
      )
    );
  });
  await page.reload();
  await waitForScene(page, 'Menu');
  await Promise.all([page.waitForEvent('load'), activate(page, 'Set visual quality low')]);
  await waitForScene(page, 'Menu');
  await activate(page, 'Set difficulty low');
  await activate(page, 'Increase creativity');
  const storedBefore = await page.evaluate(() => Object.fromEntries(Object.entries(localStorage)));
  await activate(page, 'Load SLOT 1');
  await waitForScene(page, 'Game');
  await page.keyboard.down('Space');
  await page.evaluate(() => window.__SPACE_EXPLORER_BROWSER_HARNESS__?.probeAcceptedPlayerDamage(999));
  await waitForScene(page, 'GameOver');
  await page.keyboard.down('Space');
  await page.keyboard.up('Space');
  await expect(page.locator('nav[aria-label="Game over"]')).toContainText('NEXT RUN: BEAT 9500');
  await activate(page, 'Retry from level 1');
  await waitForScene(page, 'Game');
  const state = await page.evaluate(() => {
    const recorder = window.__SPACE_EXPLORER_BROWSER_HARNESS__?.gameFeel;
    if (!recorder) throw new Error('Missing recorder');
    const data = recorder.start({
      scenario: 'direct retry state',
      source: 'automation',
      buildSha: 'test',
      deviceLabel: 'browser',
      maxFrames: 2,
    });
    recorder.stop();
    return data?.environment;
  });
  expect(state?.startingPersistedPlayerState).toEqual({
    level: 1,
    score: 0,
    currentHp: 5,
    remainingLives: 3,
    currentShields: 0,
    upgrades: { hp: 0, damage: 0, fireRate: 0, shield: 0, turrets: 0 },
    helperWing: { grantedSlots: 0, slots: [] },
  });
  expect(await page.evaluate(() => Object.fromEntries(Object.entries(localStorage)))).toEqual(storedBefore);
  await gameOver(page);
  await expect(page.locator('nav[aria-label="Game over"]')).toContainText('Final score 0. Reached level 1.');
  await activate(page, 'Continue to command deck');
  await waitForScene(page, 'Menu');
  await expect(page.getByRole('button', { name: 'Load SLOT 1' })).toBeEnabled();
  await expect(page.getByRole('button', { name: 'Set difficulty low' })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('button', { name: 'Set visual quality low' })).toHaveAttribute('aria-pressed', 'true');
  assertNoBrowserErrors();
});

test('held fire, arbitrary taps and repeated keys do not retry; fresh shortcuts survive resize', async ({
  page,
  assertNoBrowserErrors,
}) => {
  test.setTimeout(180000);
  await openMenu(page);
  await startNewRun(page);
  await page.keyboard.down('Space');
  await page.mouse.move(20, 20);
  await page.mouse.down();
  await gameOver(page);
  await page.keyboard.down('Space');
  await page.mouse.up();
  await page.keyboard.up('Space');
  await page.mouse.click(20, 20);
  await page.evaluate(() => window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Enter', repeat: true })));
  await page.waitForTimeout(200);
  expect((await snapshot(page)).activeScenes).toEqual(['GameOver']);

  for (const viewport of [
    { width: 390, height: 844 },
    { width: 844, height: 390 },
    { width: 390, height: 844 },
  ]) {
    await page.setViewportSize(viewport);
    await expect.poll(async () => (await snapshot(page)).gameSize).toEqual(viewport);
    await expect
      .poll(
        async () => {
          const resized = await snapshot(page);
          return ['RETRY', 'MENU'].every((label) => {
            const text = resized.texts.find((entry) => entry.text === label);
            return text && text.x - text.width / 2 >= 0 && text.y + text.height / 2 <= viewport.height;
          });
        },
        { timeout: 30000 }
      )
      .toBe(true);
    await expect(page.locator('nav[aria-label="Game over"]')).toHaveCount(1);
    const frame = await snapshot(page);
    for (const label of ['RETRY', 'MENU']) {
      const text = frame.texts.find((entry) => entry.text === label);
      if (!text) throw new Error(`Missing ${label}`);
      expect(text.x - text.width / 2).toBeGreaterThanOrEqual(0);
      expect(text.y + text.height / 2).toBeLessThanOrEqual(viewport.height);
    }
    await page.screenshot({ path: test.info().outputPath(`retry-${viewport.width}x${viewport.height}.png`) });
  }
  await page.keyboard.press('r');
  await waitForScene(page, 'Game');
  await gameOver(page);
  await page.keyboard.press('Escape');
  await waitForScene(page, 'Menu');
  await page.keyboard.press('r');
  await page.waitForTimeout(100);
  expect((await snapshot(page)).activeScenes).toEqual(['Menu']);
  await gameOver(page);
  await page.keyboard.press('Enter');
  await waitForScene(page, 'Game');
  await gameOver(page);
  await page.keyboard.press('m');
  await waitForScene(page, 'Menu');
  assertNoBrowserErrors();
});

test('visible retry and menu hit areas activate independently', async ({ page, isMobile, assertNoBrowserErrors }) => {
  await openMenu(page);
  for (const label of ['MENU', 'RETRY']) {
    await gameOver(page);
    const button = (await snapshot(page)).texts.find((item) => item.text === label);
    if (!button) throw new Error(`Missing ${label}`);
    if (isMobile) await page.touchscreen.tap(button.x, button.y);
    else await page.mouse.click(button.x, button.y);
    await waitForScene(page, label === 'MENU' ? 'Menu' : 'Game');
  }
  assertNoBrowserErrors();
});

test('ten direct retries retain one terminal action layer and one gameplay segment per activation', async ({
  page,
  assertNoBrowserErrors,
}) => {
  test.setTimeout(120_000);
  await page.addInitScript(() => {
    const listeners = new Set<unknown>();
    const add = window.addEventListener.bind(window);
    const remove = window.removeEventListener.bind(window);
    window.addEventListener = (
      type: string,
      listener: EventListenerOrEventListenerObject,
      options?: boolean | AddEventListenerOptions
    ) => {
      if (type === 'keydown') listeners.add(listener);
      add(type, listener, options);
    };
    window.removeEventListener = (
      type: string,
      listener: EventListenerOrEventListenerObject,
      options?: boolean | EventListenerOptions
    ) => {
      if (type === 'keydown') listeners.delete(listener);
      remove(type, listener, options);
    };
    Object.defineProperty(window, '__retryKeyListenerCount', { get: () => listeners.size });
  });
  await openMenu(page);
  await startNewRun(page);
  await page.evaluate(() =>
    window.__SPACE_EXPLORER_BROWSER_HARNESS__?.gameFeel.start({
      scenario: 'ten direct retries',
      source: 'automation',
      buildSha: 'test',
      deviceLabel: 'browser',
      maxFrames: 10000,
    })
  );
  let keyListenerCount: unknown;
  for (let index = 0; index < 10; index += 1) {
    await gameOver(page);
    await expect(page.locator('nav[aria-label="Game over"] button')).toHaveCount(2);
    await page.keyboard.press('r');
    await waitForScene(page, 'Game');
    await expect(page.locator('nav[aria-label="Game over"]')).toHaveCount(0);
    const activeKeyListeners: unknown = await page.evaluate(() => Reflect.get(window, '__retryKeyListenerCount'));
    if (index === 0) keyListenerCount = activeKeyListeners;
    else expect(activeKeyListeners).toBe(keyListenerCount);
    await expect
      .poll(() =>
        page.evaluate(
          () =>
            window.__SPACE_EXPLORER_BROWSER_HARNESS__?.gameFeel
              .read()
              ?.events.filter((event) => event.kind === 'scene' && event.action === 'entered' && event.scene === 'Game')
              .length
        )
      )
      .toBe(index + 2);
  }
  const recording = await page.evaluate(() => window.__SPACE_EXPLORER_BROWSER_HARNESS__?.gameFeel.stop());
  expect(
    recording?.events.filter(
      (event) => event.kind === 'scene' && event.action === 'entered' && event.scene === 'GameOver'
    )
  ).toHaveLength(10);
  const evidenceDirectory = join('output', 'direct-retry', test.info().project.name);
  mkdirSync(evidenceDirectory, { recursive: true });
  const evidencePath = join(evidenceDirectory, 'ten-retry-segments.json');
  writeFileSync(evidencePath, JSON.stringify(recording, null, 2));
  await test.info().attach('ten-retry-segments', { path: evidencePath, contentType: 'application/json' });
  assertNoBrowserErrors();
});
