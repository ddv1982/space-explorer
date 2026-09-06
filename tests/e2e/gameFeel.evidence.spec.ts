import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { GameFeelExport } from '../../src/browserHarness/gameFeelRecording';
import { expect, openMenu, snapshot, startNewRun, test, waitForScene, type Page } from './fixtures';

const buildSha =
  execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim() +
  (execFileSync('git', ['status', '--porcelain'], { encoding: 'utf8' }).trim() ? '-dirty' : '');

async function startRecording(page: Page, maxFrames = 3600): Promise<void> {
  await page.evaluate(
    ({ sha, cap, device }) => {
      const recorder = window.__SPACE_EXPLORER_BROWSER_HARNESS__?.gameFeel;
      if (!recorder) throw new Error('Missing game feel API');
      recorder.start({
        scenario: 'automated controls, synthetic focus delivery, injected accepted damage and lifecycle',
        buildSha: sha,
        source: 'automation',
        deviceLabel: device,
        maxFrames: cap,
      });
    },
    { sha: buildSha, cap: maxFrames, device: test.info().project.name }
  );
}

async function recording(page: Page): Promise<GameFeelExport> {
  const result = await page.evaluate(() => window.__SPACE_EXPLORER_BROWSER_HARNESS__?.gameFeel.read());
  if (!result) throw new Error('Missing recording');
  return result;
}

async function saveEvidence(page: Page, name: string, value: unknown): Promise<void> {
  const directory = join('output', 'game-feel', test.info().project.name);
  mkdirSync(directory, { recursive: true });
  const jsonPath = join(directory, `${name}.json`);
  const screenshotPath = join(directory, `${name}.png`);
  writeFileSync(jsonPath, JSON.stringify(value, null, 2));
  await page.screenshot({ path: screenshotPath });
  await test.info().attach(name, { path: jsonPath, contentType: 'application/json' });
  await test.info().attach(`${name}-screenshot`, { path: screenshotPath, contentType: 'image/png' });
}

async function waitForFrames(page: Page, predicate: (result: GameFeelExport) => boolean): Promise<void> {
  await expect.poll(async () => predicate(await recording(page)), { timeout: 30_000 }).toBe(true);
}

test('records delivered controls, applied movement, fire attempts and a separate pause clock', async ({
  page,
  isMobile,
  assertNoBrowserErrors,
}) => {
  test.setTimeout(120_000);
  await openMenu(page);
  await startRecording(page);
  await startNewRun(page);
  await waitForFrames(page, (result) => result.frames.length > 1);
  const session = isMobile ? await page.context().newCDPSession(page) : null;
  if (session) {
    const joystick = (await snapshot(page)).arcs.find((arc) => arc.radius === 62);
    if (!joystick) throw new Error('Missing touch joystick');
    const viewport = page.viewportSize();
    if (!viewport) throw new Error('Missing viewport');
    const fire = { x: viewport.width * 0.77, y: viewport.height * 0.5, id: 2 };
    await session.send('Input.dispatchTouchEvent', {
      type: 'touchStart',
      touchPoints: [{ x: joystick.x, y: joystick.y, id: 1 }, fire],
    });
    await session.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: [{ x: joystick.x + 48, y: joystick.y, id: 1 }, fire],
    });
  } else {
    await page.keyboard.down('ArrowRight');
    await page.keyboard.down('Space');
  }
  await waitForFrames(page, (result) =>
    result.frames.some((frame) => frame.accelerationX > 0 && frame.firingIntent && frame.lastFireGameplayMs > 0)
  );
  await waitForFrames(page, (result) => result.frames.some((frame) => frame.velocityX > 0));
  if (session) await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  else {
    await page.keyboard.up('ArrowRight');
    await page.keyboard.up('Space');
  }
  await waitForFrames(
    page,
    (result) => result.frames.at(-1)?.accelerationX === 0 && result.frames.at(-1)?.firingIntent === false
  );
  await page.keyboard.down('Escape');
  await waitForFrames(page, (result) => result.frames.at(-1)?.manualPause === true);
  await page.keyboard.up('Escape');
  const paused = (await recording(page)).frames.at(-1);
  if (!paused) throw new Error('Missing paused frame');
  await waitForFrames(page, (result) => (result.frames.at(-1)?.wallMs ?? 0) > paused.wallMs + 250);
  expect((await recording(page)).frames.at(-1)?.gameplayMs).toBe(paused.gameplayMs);
  await page.keyboard.down('Escape');
  await waitForFrames(page, (result) => (result.frames.at(-1)?.gameplayMs ?? 0) > paused.gameplayMs);
  await page.keyboard.up('Escape');
  await page.keyboard.press('z');
  await page.evaluate(() => {
    window.dispatchEvent(new Event('blur'));
    window.dispatchEvent(new Event('focus'));
  });
  await page.evaluate(() => window.__SPACE_EXPLORER_BROWSER_HARNESS__?.probeAcceptedPlayerDamage(1));
  await waitForFrames(page, (result) => result.events.some((event) => event.kind === 'player-hit'));
  await page.evaluate(() => window.__SPACE_EXPLORER_BROWSER_HARNESS__?.probeAcceptedPlayerDamage(999));
  await waitForFrames(page, (result) => result.events.some((event) => event.kind === 'player-death'));
  const exported = await page.evaluate(() => window.__SPACE_EXPLORER_BROWSER_HARNESS__?.gameFeel.stop());
  if (!exported) throw new Error('Missing stopped recording');
  expect(exported.status.kind).toBe('stopped');
  expect(exported.metadata.source).toBe('automation');
  expect(exported.events.some((event) => event.kind === 'focus' && event.delivered === 'blur' && !event.trusted)).toBe(
    true
  );
  expect(
    exported.events.some(
      (event) =>
        event.kind === 'player-hit' && event.cause === 'unknown' && event.outcome === 'damaged' && event.hullDamage > 0
    )
  ).toBe(true);
  expect(
    exported.events.some(
      (event) =>
        event.kind === 'player-death' && event.cause === 'unknown' && event.outcome === 'fatal' && event.hullDamage > 0
    )
  ).toBe(true);
  const occupancy = exported.events.filter((event) => event.kind === 'occupancy');
  expect(occupancy.length).toBeGreaterThan(0);
  expect(occupancy.every((event) => event.bodies.length <= exported.limits.maxOccupancyBodies)).toBe(true);
  expect(exported.environment?.renderer).toBeTruthy();
  expect(exported.events.some((event) => event.kind === 'key' && event.code === 'KeyZ')).toBe(false);
  expect(exported.events.some((event) => event.kind === (isMobile ? 'pointer' : 'key'))).toBe(true);
  if (isMobile)
    expect(exported.events.some((event) => event.kind === 'pointer' && event.pointerType === 'touch')).toBe(true);
  expect(exported.frames.every((frame) => Number.isFinite(frame.captureCostMs))).toBe(true);
  expect(
    exported.events
      .filter((event) => event.kind === 'scene' && event.action === 'entered')
      .map((event) => event.segmentId)
  ).toEqual([1, 2]);
  await saveEvidence(page, 'controls-pause', exported);
  const retained = await recording(page);
  await page.keyboard.press('ArrowLeft');
  await page.waitForTimeout(100);
  expect(await recording(page)).toEqual(retained);
  assertNoBrowserErrors();
});

test('cleans up across caps, clear, scene restarts and game destruction', async ({ page, assertNoBrowserErrors }) => {
  test.setTimeout(120_000);
  await openMenu(page);
  await startNewRun(page);
  await startRecording(page, 2);
  await waitForFrames(page, (result) => result.status.kind === 'stopped');
  expect((await recording(page)).status).toMatchObject({ reason: 'frame-cap' });
  const capped = await recording(page);
  await page.keyboard.press('ArrowLeft');
  await page.waitForTimeout(100);
  expect(await recording(page)).toEqual(capped);
  await startRecording(page);
  for (let index = 0; index < 3; index += 1) {
    await page.evaluate(async () => {
      await window.__SPACE_EXPLORER_BROWSER_HARNESS__?.route('GameOver');
    });
    await waitForScene(page, 'GameOver');
    await page.keyboard.press('Enter');
    await waitForScene(page, 'Menu');
    await startNewRun(page);
    await waitForFrames(page, (result) => result.frames.at(-1)?.segmentId === 4 + index * 3);
  }
  const segments = await recording(page);
  const enters = segments.events.filter((event) => event.kind === 'scene' && event.action === 'entered');
  expect(new Set(enters.map((event) => event.segmentId)).size).toBe(enters.length);
  expect(segments.events.filter((event) => event.kind === 'scene' && event.action === 'shutdown')).toHaveLength(9);
  await saveEvidence(page, 'scene-segments', segments);
  await page.evaluate(() => window.__SPACE_EXPLORER_BROWSER_HARNESS__?.gameFeel.clear());
  await page.keyboard.press('Space');
  expect(await page.evaluate(() => window.__SPACE_EXPLORER_BROWSER_HARNESS__?.gameFeel.read())).toBeNull();
  await startRecording(page);
  await waitForFrames(page, (result) => result.frames.length > 0);
  await page.evaluate(() => window.__SPACE_EXPLORER_BROWSER_HARNESS__?.destroyGame());
  await waitForFrames(page, (result) => result.status.kind === 'stopped' && result.status.reason === 'game-destroyed');
  const destroyed = await recording(page);
  await page.keyboard.press('ArrowRight');
  expect(await recording(page)).toEqual(destroyed);
  assertNoBrowserErrors();
});

test('measures recording overhead with five interleaved off and on replicates', async ({
  page,
  assertNoBrowserErrors,
}) => {
  test.setTimeout(300_000);
  const results = [];
  for (const enabled of [false, true, true, false, false, true, true, false, false, true]) {
    await openMenu(page);
    await startNewRun(page);
    if (enabled) await startRecording(page);
    await page.keyboard.down('ArrowRight');
    await page.keyboard.down('Space');
    const metrics = await page.evaluate(() => {
      const harness = window.__SPACE_EXPLORER_BROWSER_HARNESS__;
      if (!harness) throw new Error('Missing harness');
      return harness.probeFramePacing(10, { warmupFrames: 2 });
    });
    await page.keyboard.up('ArrowRight');
    await page.keyboard.up('Space');
    const captured = enabled
      ? await page.evaluate(() => window.__SPACE_EXPLORER_BROWSER_HARNESS__?.gameFeel.stop())
      : null;
    expect(metrics.runtimeLoad.laserRequestCount).toBeGreaterThan(0);
    results.push({ enabled, metrics, recording: captured });
  }
  const p95 = (values: number[]) =>
    [...values].sort((a, b) => a - b)[Math.max(0, Math.ceil(values.length * 0.95) - 1)] ?? 0;
  const off = results.filter((result) => !result.enabled).map((result) => result.metrics.workCost.update.p95Ms);
  const on = results.filter((result) => result.enabled).map((result) => result.metrics.workCost.update.p95Ms);
  const observerP95 = results
    .filter((result) => result.enabled)
    .map((result) => p95(result.recording?.frames.map((frame) => frame.captureCostMs) ?? []));
  const report = {
    buildSha,
    conditions:
      'same head, keyboard right + fire, 10 measured frames/2 warmup, software renderer results are diagnostic only',
    off,
    on,
    observerP95,
    results,
  };
  await saveEvidence(page, 'recording-overhead', report);
  expect(off).toHaveLength(5);
  expect(on).toHaveLength(5);
  expect(observerP95.every(Number.isFinite)).toBe(true);
  assertNoBrowserErrors();
});
