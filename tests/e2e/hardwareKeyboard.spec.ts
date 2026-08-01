import { expect, test as base, type Page } from '@playwright/test';
import type { BrowserHarnessSnapshot } from '../../src/browserHarness';

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

const JOYSTICK_BASE_RADIUS = 62;

test.skip(({ isMobile }) => !isMobile, 'hardware keyboard behavior requires a touch device project');

test('hides the joystick and swaps controls hints once a hardware keyboard is used', async ({
  page,
  assertNoBrowserErrors,
}) => {
  await openMenu(page);
  await startNewRun(page);

  const before = await snapshot(page);
  const joystickBase = before.arcs.find((arc) => arc.radius === JOYSTICK_BASE_RADIUS);
  expect(joystickBase?.visible).toBe(true);
  expect(before.texts.some((item) => item.text === 'Use the joystick to move')).toBe(true);

  await page.keyboard.press('ArrowLeft');

  await expect
    .poll(async () => {
      const current = await snapshot(page);
      return current.arcs.find(
        (arc) => arc.radius === JOYSTICK_BASE_RADIUS && arc.x === joystickBase?.x && arc.y === joystickBase?.y
      )?.visible;
    })
    .toBe(false);

  const after = await snapshot(page);
  expect(after.texts.some((item) => item.text === 'WASD / Arrows to Move')).toBe(true);
  expect(after.texts.some((item) => item.text === 'Use the joystick to move')).toBe(false);

  assertNoBrowserErrors();
});
