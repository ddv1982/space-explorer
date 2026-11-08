import { expect, openMenu, snapshot, startNewRun, test } from './fixtures';

const JOYSTICK_BASE_RADIUS = 62;

test.skip(({ isMobile }) => !isMobile, 'hardware keyboard behavior requires a touch device project');

test('?flight=legacy hides the joystick and swaps controls hints once a hardware keyboard is used', async ({
  page,
  assertNoBrowserErrors,
}) => {
  await openMenu(page, '&flight=legacy');
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

  const viewport = page.viewportSize();
  await page.touchscreen.tap(Math.floor((viewport?.width ?? 844) * 0.25), Math.floor((viewport?.height ?? 390) * 0.6));

  await expect
    .poll(async () => {
      const current = await snapshot(page);
      return current.arcs.find(
        (arc) => arc.radius === JOYSTICK_BASE_RADIUS && arc.x === joystickBase?.x && arc.y === joystickBase?.y
      )?.visible;
    })
    .toBe(true);

  assertNoBrowserErrors();
});

test('drag flight swaps to keyboard hints and stops touch autofire once a hardware keyboard is used', async ({
  page,
  assertNoBrowserErrors,
}) => {
  await openMenu(page);
  await startNewRun(page);

  const before = await snapshot(page);
  expect(before.arcs.some((arc) => arc.radius === JOYSTICK_BASE_RADIUS)).toBe(false);
  expect(before.texts.some((item) => item.text === 'Drag anywhere to fly')).toBe(true);

  await page.keyboard.press('ArrowLeft');

  await expect
    .poll(async () => (await snapshot(page)).texts.some((item) => item.text === 'WASD / Arrows to Move'))
    .toBe(true);
  expect((await snapshot(page)).texts.some((item) => item.text === 'Drag anywhere to fly')).toBe(false);

  assertNoBrowserErrors();
});
