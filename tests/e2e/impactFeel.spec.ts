import { expect, openMenu, openMenuSettings, pinQualityTier, snapshot, startNewRun, test } from './fixtures';

test('a hull hit freezes gameplay for a moment, then play resumes', async ({ page, assertNoBrowserErrors }) => {
  await pinQualityTier(page, 'low');
  await openMenu(page);
  await startNewRun(page);
  await expect.poll(async () => (await snapshot(page)).physicsPaused).toBe(false);

  const pausedAfterHit = await page.evaluate(() => {
    const harness = window.__SPACE_EXPLORER_BROWSER_HARNESS__!;
    harness.probeAcceptedPlayerDamage(1);
    return harness.snapshot().physicsPaused;
  });
  expect(pausedAfterHit, 'physics freezes during the hit-stop').toBe(true);
  await expect.poll(async () => (await snapshot(page)).physicsPaused, { timeout: 2_000 }).toBe(false);
  assertNoBrowserErrors();
});

test('shots hold still during a hit-stop and resume without a catch-up jump', async ({
  page,
  isMobile,
  assertNoBrowserErrors,
}) => {
  test.skip(isMobile, 'keyboard autofire keeps a steady stream of player shots on desktop');
  await pinQualityTier(page, 'low');
  await page.addInitScript(() =>
    window.localStorage.setItem('space-explorer.autoFire.v1', JSON.stringify({ touch: true, keyboard: true }))
  );
  await openMenu(page);
  await startNewRun(page);
  await expect
    .poll(async () => (await snapshot(page)).objects.filter((o) => o.active && o.textureKey === 'player-bullet').length)
    .toBeGreaterThan(3);

  // Per rendered frame: whether physics is paused, and every live player shot's position.
  const frames = await page.evaluate(async () => {
    const harness = window.__SPACE_EXPLORER_BROWSER_HARNESS__!;
    const nextFrame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    const samples: Array<{ paused: boolean; shots: Array<[number, number]> }> = [];
    for (let frame = 0; frame < 40; frame += 1) {
      if (frame === 12) harness.probeAcceptedPlayerDamage(1);
      const state = harness.snapshot();
      samples.push({
        paused: state.physicsPaused === true,
        shots: state.objects.filter((o) => o.active && o.textureKey === 'player-bullet').map((o) => [o.x, o.y]),
      });
      await nextFrame();
    }
    return samples;
  });

  // How far shots moved since the previous frame: the median over shots matched by column.
  const step = (previous: Array<[number, number]>, current: Array<[number, number]>): number | null => {
    const moves = current
      .map(([x, y]) => {
        const candidates = previous.filter(([px, py]) => Math.abs(px - x) < 1 && py >= y).map(([, py]) => py - y);
        return candidates.length > 0 ? Math.min(...candidates) : null;
      })
      .filter((move): move is number => move !== null)
      .sort((a, b) => a - b);
    return moves.length > 0 ? moves[Math.floor(moves.length / 2)] : null;
  };
  const steps = frames.map((frame, index) => (index === 0 ? null : step(frames[index - 1].shots, frame.shots)));
  const frozen = frames.map((frame) => frame.paused);
  const firstFrozen = frozen.indexOf(true);
  const firstResumed = frozen.indexOf(false, firstFrozen);
  expect(firstFrozen, 'the hit froze physics').toBeGreaterThan(0);
  expect(firstResumed, 'physics resumed within the sample').toBeGreaterThan(firstFrozen);

  const normal = steps.slice(1, firstFrozen).filter((value): value is number => value !== null);
  const typicalStep = [...normal].sort((a, b) => a - b)[Math.floor(normal.length / 2)];
  for (let index = firstFrozen + 1; index < firstResumed; index += 1) {
    if (steps[index] !== null) expect(steps[index], `shots moved during the freeze (frame ${index})`).toBe(0);
  }
  const resumedSteps = steps.slice(firstResumed, firstResumed + 3).filter((value): value is number => value !== null);
  for (const value of resumedSteps) {
    expect(value, 'no catch-up jump after the freeze').toBeLessThanOrEqual(typicalStep * 2 + 1);
  }
  await test
    .info()
    .attach('hit-stop-steps.json', { body: JSON.stringify({ steps, frozen }), contentType: 'application/json' });
  assertNoBrowserErrors();
});

test('screen shake can be turned off and the choice survives a reload', async ({ page, assertNoBrowserErrors }) => {
  await openMenu(page);
  await openMenuSettings(page);
  await expect(page.getByText('SCREEN SHAKE: ON')).toBeVisible();
  const off = page.getByRole('group', { name: 'Screen shake' }).getByRole('button', { name: 'OFF', exact: true });
  await expect(off).toBeInViewport();
  await off.click();
  await expect(page.getByText('SCREEN SHAKE: OFF')).toBeVisible();
  expect(await page.evaluate(() => window.localStorage.getItem('space-explorer.motion.v1'))).toBe(
    JSON.stringify({ screenShake: false })
  );
  await page.screenshot({ path: test.info().outputPath('settings-screen-shake.png') });

  await page.reload();
  await openMenuSettings(page);
  await expect(page.getByText('SCREEN SHAKE: OFF')).toBeVisible();
  await page.evaluate(() => window.localStorage.removeItem('space-explorer.motion.v1'));
  assertNoBrowserErrors();
});
