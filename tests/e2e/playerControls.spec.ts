import { evidenceRevision, saveBrowserEvidence } from './evidence';
import { expect, openMenu, snapshot, startNewRun, test } from './fixtures';

test('compares real Arcade control profiles at 60 and 120 Hz', async ({ page, assertNoBrowserErrors }) => {
  await page.route('**/controls-probe', (route) => route.fulfill({ contentType: 'text/html', body: '<html></html>' }));
  await page.goto('/controls-probe');
  const result = await page.evaluate(async () => {
    const modulePath = '/tests/e2e/playerControlsPhysics.ts';
    const probe: typeof import('./playerControlsPhysics') = await import(modulePath);
    return probe.measurePlayerControls();
  });
  await saveBrowserEvidence(page, 'physics-comparison', result);
  const native = result.filter((item) => item.profile === 'native');
  expect(native).toHaveLength(3);
  for (const item of native) {
    expect(item.releaseDistance).toBeLessThanOrEqual(40);
    expect(item.reversalMs).toBeLessThanOrEqual(350);
    expect(item.cardinalSpeed).toBeCloseTo(480);
    expect(item.diagonalSpeed / item.cardinalSpeed).toBeCloseTo(1, 2);
    expect([item.bodyWidth, item.bodyHeight]).toEqual([24, 32]);
    expect([item.fireX, item.fireY, item.muzzleX, item.muzzleY]).toEqual([0, -1, 0, -20]);
    expect(item.rotation).toBeGreaterThan(0.2);
  }
  const baseline = result.find((item) => item.profile === 'baseline' && item.updateHz === 60);
  expect(baseline?.releaseDistance).toBeGreaterThan(700);
  expect(baseline?.diagonalSpeed).toBeGreaterThan(1100);
  assertNoBrowserErrors();
});

test('keyboard and touch steer diagonally, stop after release, and fire straight while banking', async ({
  page,
  isMobile,
  assertNoBrowserErrors,
}) => {
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
      const joystick = (await snapshot(page)).arcs.find((arc) => arc.radius === 62);
      const viewport = page.viewportSize();
      if (!joystick || !viewport) throw new Error('Missing touch controls');
      const fire = { x: viewport.width * 0.77, y: viewport.height * 0.5, id: 2 };
      await touch.send('Input.dispatchTouchEvent', {
        type: 'touchStart',
        touchPoints: [{ x: joystick.x, y: joystick.y, id: 1 }, fire],
      });
      touchActive = true;
      await touch.send('Input.dispatchTouchEvent', {
        type: 'touchMove',
        touchPoints: [{ x: joystick.x + 40, y: joystick.y - 40, id: 1 }, fire],
      });
    } else {
      await page.keyboard.down('ArrowRight');
      await page.keyboard.down('ArrowUp');
      await page.keyboard.down('Space');
    }
    const read = () => page.evaluate(() => window.__SPACE_EXPLORER_BROWSER_HARNESS__?.gameFeel.read());
    await expect
      .poll(async () =>
        (await read())?.frames.some(
          (frame) =>
            frame.accelerationX > 0 &&
            frame.accelerationY < 0 &&
            Math.hypot(frame.velocityX, frame.velocityY) >= 475 &&
            frame.lastFireGameplayMs > 0
        )
      )
      .toBe(true);
    const moving = await snapshot(page);
    const ship = moving.objects.find((object) => object.active && object.textureKey === 'player-ship');
    expect(ship?.rotation).toBeGreaterThan(0);
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
    await expect
      .poll(async () =>
        (await read())?.frames
          .slice(beforeRelease)
          .some(
            (frame) =>
              frame.accelerationX === 0 && frame.accelerationY === 0 && frame.velocityX === 0 && frame.velocityY === 0
          )
      )
      .toBe(true);
    const captured = await page.evaluate(() => window.__SPACE_EXPLORER_BROWSER_HARNESS__?.gameFeel.stop());
    if (!captured) throw new Error('Missing controls recording');
    const released = captured.frames
      .slice(beforeRelease)
      .filter((frame) => frame.accelerationX === 0 && frame.accelerationY === 0);
    const first = released[0];
    const stopped = released.find((frame) => frame.velocityX === 0 && frame.velocityY === 0);
    if (!first || !stopped) throw new Error('Missing release samples');
    expect(stopped.gameplayMs - first.gameplayMs).toBeLessThanOrEqual(200);
    expect(Math.hypot(stopped.x - first.x, stopped.y - first.y)).toBeLessThanOrEqual(40);
    expect(captured.frames.every((frame) => Math.hypot(frame.velocityX, frame.velocityY) <= 480.01)).toBe(true);
    await saveBrowserEvidence(page, 'delivered-controls', captured);
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
