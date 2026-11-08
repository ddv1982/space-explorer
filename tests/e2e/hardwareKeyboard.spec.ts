import { expect, openMenu, snapshot, startNewRun, test } from './fixtures';

test.skip(({ isMobile }) => !isMobile, 'hardware keyboard behavior requires a touch device project');

test('swaps to keyboard hints once a hardware keyboard is used', async ({ page, assertNoBrowserErrors }) => {
  await openMenu(page);
  await startNewRun(page);

  const before = await snapshot(page);
  expect(before.texts.some((item) => item.text === 'Drag anywhere to fly')).toBe(true);

  await page.keyboard.press('ArrowLeft');

  await expect
    .poll(async () => (await snapshot(page)).texts.some((item) => item.text === 'WASD / Arrows to Move'))
    .toBe(true);
  expect((await snapshot(page)).texts.some((item) => item.text === 'Drag anywhere to fly')).toBe(false);

  assertNoBrowserErrors();
});
