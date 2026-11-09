import { evidenceRevision, saveBrowserEvidence } from './evidence';
import { expect, openMenu, pinQualityTier, snapshot, startNewRun, test } from './fixtures';

test('brief Escape presses pause once even when released between gameplay updates', async ({
  page,
  assertNoBrowserErrors,
}) => {
  await openMenu(page);
  await startNewRun(page);
  for (const paused of [true, false, true, false]) {
    await page.keyboard.press('Escape');
    await expect.poll(async () => (await snapshot(page)).physicsPaused).toBe(paused);
  }
  await saveBrowserEvidence('brief-pause-input', await snapshot(page));
  assertNoBrowserErrors();
});

async function measureControls(page: import('@playwright/test').Page) {
  await page.route('**/controls-probe*', (route) => route.fulfill({ contentType: 'text/html', body: '<html></html>' }));
  await page.goto('/controls-probe');
  return page.evaluate(async () => {
    const modulePath = '/tests/e2e/playerControlsPhysics.ts';
    const probe: typeof import('./playerControlsPhysics') = await import(modulePath);
    return probe.measurePlayerControls();
  });
}

test('inertial flight slides to rest and stays normalized at 60 and 120 Hz', async ({
  page,
  assertNoBrowserErrors,
}) => {
  const result = await measureControls(page);
  expect(result).toHaveLength(3);
  for (const item of result) {
    expect(item.cardinalSpeed).toBeCloseTo(800);
    expect(item.diagonalSpeed / item.cardinalSpeed).toBeCloseTo(1, 2);
    expect([item.bodyWidth, item.bodyHeight]).toEqual([24, 32]);
    expect([item.fireX, item.fireY, item.muzzleX, item.muzzleY]).toEqual([0, -1, 0, -20]);
    expect(item.rotation).toBeGreaterThan(0);
    // 400 px/s² drag from 800 px/s: a ~2 s, ~800 px slide, as in v1.19.
    expect(item.releaseDistance).toBeGreaterThan(760);
    expect(item.releaseDistance).toBeLessThan(840);
    expect(item.releaseMs).toBeGreaterThan(1900);
    expect(item.releaseMs).toBeLessThan(2100);
    // Reversing to 90% of full speed the other way takes 1,520 px/s at 1600 px/s².
    expect(item.reversalMs).toBeGreaterThan(900);
    expect(item.reversalMs).toBeLessThan(1000);
  }
  assertNoBrowserErrors();
});

test('keyboard and touch steer diagonally, glide to rest after release, and fire straight while banking', async ({
  page,
  isMobile,
  assertNoBrowserErrors,
}) => {
  // Reaching cruise speed and gliding to rest need ~1s of gameplay (~60 frames). CI desktop runners
  // have recorded ~700 ms per frame even on Low, so the waits and test budget are sized for that.
  test.setTimeout(300_000);
  await pinQualityTier(page, 'low');
  await openMenu(page);
  await startNewRun(page);
  await page.evaluate((revision) => {
    window.__SPACE_EXPLORER_BROWSER_HARNESS__?.gameFeel.start({
      scenario: 'P1 delivered diagonal movement, release and straight fire',
      buildSha: revision,
      source: 'automation',
      deviceLabel: 'emulated input',
      maxFrames: 3600,
    });
  }, evidenceRevision);
  const touch = isMobile ? await page.context().newCDPSession(page) : null;
  let touchActive = false;
  try {
    if (touch) {
      // Momentum flight on touch: drag anywhere, the ship follows the finger's movement and autofires.
      const viewport = page.viewportSize();
      if (!viewport) throw new Error('Missing viewport');
      // Keep the finger inside the viewport: Chrome drops touch moves outside it.
      const start = { x: viewport.width * 0.2, y: viewport.height * 0.85, id: 1 };
      const reach = Math.min(250, viewport.width * 0.6, viewport.height * 0.6);
      await touch.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [start] });
      touchActive = true;
      await touch.send('Input.dispatchTouchEvent', {
        type: 'touchMove',
        touchPoints: [{ x: start.x + reach, y: start.y - reach, id: 1 }],
      });
    } else {
      await page.keyboard.down('ArrowRight');
      await page.keyboard.down('ArrowUp');
      await page.keyboard.down('Space');
    }
    const read = () => page.evaluate(() => window.__SPACE_EXPLORER_BROWSER_HARNESS__?.gameFeel.read());
    await expect
      .poll(
        async () =>
          (await read())?.frames.some(
            (frame) =>
              frame.velocityX > 0 &&
              frame.velocityY < 0 &&
              // A drag eases into its target, so touch need not reach full cruise speed.
              Math.hypot(frame.velocityX, frame.velocityY) >= (touch ? 300 : 475) &&
              frame.lastFireGameplayMs > 0
          ),
        // Inertial thrust needs ~0.6s of gameplay time to pass 475 px/s.
        { timeout: 60_000 }
      )
      .toBe(true);
    const moving = await snapshot(page);
    const ship = moving.objects.find((object) => object.active && object.textureKey === 'player-ship');
    // A drag can already have settled at its target, so only held keys guarantee an active bank here.
    if (!touch) expect(ship?.rotation).toBeGreaterThan(0);
    const bullets = moving.objects.filter((object) => object.active && object.textureKey === 'player-bullet');
    expect(bullets.length).toBeGreaterThan(0);
    expect(bullets.every((bullet) => Math.abs(bullet.rotation) < 0.00001)).toBe(true);
    const beforeRelease = (await read())?.frames.length ?? 0;
    if (touch) {
      await touch.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
      touchActive = false;
    } else {
      await page.keyboard.up('ArrowRight');
      await page.keyboard.up('ArrowUp');
      await page.keyboard.up('Space');
    }
    const isAtRest = (frame: { velocityX: number; velocityY: number }) =>
      Math.hypot(frame.velocityX, frame.velocityY) < 5;
    // The slide spans up to ~2s of gameplay time; loaded CI browsers can run far slower than wall time.
    await expect
      .poll(async () => (await read())?.frames.slice(beforeRelease).some(isAtRest), { timeout: 120_000 })
      .toBe(true);
    const captured = await page.evaluate(() => window.__SPACE_EXPLORER_BROWSER_HARNESS__?.gameFeel.stop());
    if (!captured) throw new Error('Missing controls recording');
    const released = captured.frames.slice(beforeRelease);
    const first = released[0];
    const stopped = released.find(isAtRest);
    if (!first || !stopped) throw new Error('Missing release samples');
    // It slides rather than stopping dead (unless a screen edge stops it first), and settles within
    // the 2 s a full-speed slide takes, plus a few frames of key-release latency from the harness.
    expect(stopped.gameplayMs - first.gameplayMs).toBeLessThanOrEqual(2300);
    expect(captured.frames.every((frame) => Math.hypot(frame.velocityX, frame.velocityY) <= 800.01)).toBe(true);
    await saveBrowserEvidence('delivered-controls', captured);
  } finally {
    if (touch) {
      if (touchActive) await touch.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
      await touch.detach();
    } else {
      await page.keyboard.up('ArrowRight');
      await page.keyboard.up('ArrowUp');
      await page.keyboard.up('Space');
    }
  }
  assertNoBrowserErrors();
});
