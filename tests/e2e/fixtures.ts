import { expect, test as base, type Page } from '@playwright/test';
import type { BrowserHarnessSnapshot } from '../../src/browserHarness';

interface BrowserErrorFixture {
  assertNoBrowserErrors: () => void;
}

export const test = base.extend<BrowserErrorFixture>({
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

export { expect } from '@playwright/test';
export type { Page } from '@playwright/test';

export async function snapshot(page: Page): Promise<BrowserHarnessSnapshot> {
  return page.evaluate(() => {
    const harness = window.__SPACE_EXPLORER_BROWSER_HARNESS__;
    if (!harness) throw new Error('Browser harness is not installed');
    return harness.snapshot();
  });
}

async function waitForHarness(page: Page): Promise<void> {
  await expect.poll(() => page.evaluate(() => Boolean(window.__SPACE_EXPLORER_BROWSER_HARNESS__))).toBe(true);
}

export async function waitForScene(page: Page, sceneKey: string): Promise<void> {
  await expect
    .poll(
      () =>
        page.evaluate((key) => {
          const harness = window.__SPACE_EXPLORER_BROWSER_HARNESS__;
          return harness?.snapshot().activeScenes.includes(key) ?? false;
        }, sceneKey),
      { timeout: 15_000 }
    )
    .toBe(true);
}

export async function openMenu(page: Page): Promise<void> {
  await page.goto('/?browserHarness=1');
  await expect(page.locator('#game-root > canvas')).toHaveCount(1);
  await waitForHarness(page);
  await waitForScene(page, 'Menu');
}

export async function startNewRun(page: Page): Promise<void> {
  const menu = await snapshot(page);
  const newRun = menu.texts.find((item) => item.text === 'NEW RUN');
  expect(newRun).toBeDefined();
  await page.mouse.click(newRun?.x ?? 0, newRun?.y ?? 0);
  await waitForScene(page, 'Game');
}
