import type { DamageSource } from '../../src/systems/PlayerDamage';
import { evidenceRevision, saveBrowserEvidence } from './evidence';
import { expect, openMenu, snapshot, startNewRun, test, waitForScene, type Page } from './fixtures';

async function recordCombat(page: Page): Promise<void> {
  await page.evaluate(
    ({ revision, device }) => {
      const api = window.__SPACE_EXPLORER_BROWSER_HARNESS__;
      if (!api) throw new Error('Missing browser harness');
      api.gameFeel.start({
        buildSha: revision,
        scenario: 'actual pooled colliders, damage feedback and terminal retry',
        source: 'automation',
        deviceLabel: device,
        maxFrames: 12000,
      });
    },
    { revision: evidenceRevision, device: test.info().project.name }
  );
  await expect
    .poll(() => page.evaluate(() => window.__SPACE_EXPLORER_BROWSER_HARNESS__?.gameFeel.read()?.frames.length ?? 0))
    .toBeGreaterThan(0);
}

async function state(page: Page) {
  return page.evaluate(() => {
    const api = window.__SPACE_EXPLORER_BROWSER_HARNESS__;
    if (!api) throw new Error('Missing browser harness');
    return api.combatPolish.combatPolishState();
  });
}

async function setPaused(page: Page, paused: boolean, touch: boolean): Promise<void> {
  if (touch) {
    if (paused) {
      const viewport = page.viewportSize();
      if (!viewport) throw new Error('Missing touch viewport');
      await page.touchscreen.tap(viewport.width - 44, 106);
    } else {
      const resume = (await snapshot(page)).texts.find((item) => item.text.endsWith('\nRESUME'));
      if (!resume) throw new Error('Missing visible Resume action');
      await page.touchscreen.tap(resume.x, resume.y);
    }
    await expect.poll(async () => (await state(page)).paused, { timeout: 15000 }).toBe(paused);
    return;
  }
  await page.keyboard.down('Escape');
  try {
    await expect.poll(async () => (await state(page)).paused, { timeout: 15000 }).toBe(paused);
  } finally {
    await page.keyboard.up('Escape');
  }
}

async function observeBeamCycle(page: Page) {
  return page.evaluate(() => {
    const api = window.__SPACE_EXPLORER_BROWSER_HARNESS__;
    if (!api) throw new Error('Missing browser harness');
    const initial = api.combatPolish.combatPolishState();
    const startedAt = performance.now();
    let active: typeof initial | null = null;
    let completed: typeof initial | null = null;
    let last = initial;
    return new Promise<{
      outcome: 'complete' | 'watchdog' | 'scene-ended';
      initial: typeof initial;
      active: typeof initial | null;
      completed: typeof initial | null;
      last: typeof initial;
      elapsedGameplayMs: number;
      elapsedWallMs: number;
    }>((resolve) => {
      let frame = 0;
      const finish = (outcome: 'complete' | 'watchdog' | 'scene-ended') => {
        cancelAnimationFrame(frame);
        clearTimeout(timer);
        resolve({
          outcome,
          initial,
          active,
          completed,
          last,
          elapsedGameplayMs: (last.gameplayMs ?? 0) - (initial.gameplayMs ?? 0),
          elapsedWallMs: performance.now() - startedAt,
        });
      };
      const sample = () => {
        last = api.combatPolish.combatPolishState();
        if (last.level === null) return finish('scene-ended');
        if (!active && last.beams.some((beam) => beam.damaging)) active = last;
        if (active && last.beams.length === 0) {
          completed = last;
          return finish('complete');
        }
        frame = requestAnimationFrame(sample);
      };
      const timer = setTimeout(() => finish('watchdog'), 120000);
      frame = requestAnimationFrame(sample);
    });
  });
}

async function observeBossSpawn(page: Page) {
  return page.evaluate(() => {
    const api = window.__SPACE_EXPLORER_BROWSER_HARNESS__;
    if (!api) throw new Error('Missing browser harness');
    const initial = api.combatPolish.combatPolishState();
    const startedAt = performance.now();
    let last = initial;
    return new Promise<{
      outcome: 'complete' | 'watchdog' | 'scene-ended';
      initial: typeof initial;
      last: typeof initial;
      elapsedGameplayMs: number;
      elapsedWallMs: number;
    }>((resolve) => {
      let frame = 0;
      const finish = (outcome: 'complete' | 'watchdog' | 'scene-ended') => {
        cancelAnimationFrame(frame);
        clearTimeout(timer);
        resolve({
          outcome,
          initial,
          last,
          elapsedGameplayMs: (last.gameplayMs ?? 0) - (initial.gameplayMs ?? 0),
          elapsedWallMs: performance.now() - startedAt,
        });
      };
      const sample = () => {
        last = api.combatPolish.combatPolishState();
        if (last.level !== initial.level) return finish('scene-ended');
        if (last.bosses.length > 0) return finish('complete');
        frame = requestAnimationFrame(sample);
      };
      const timer = setTimeout(() => finish('watchdog'), 120000);
      frame = requestAnimationFrame(sample);
    });
  });
}

const causes = [
  ['enemy-bullet', 'LOST TO HOSTILE FIRE'],
  ['bomb', 'LOST TO A BOMB'],
  ['mine', 'LOST TO A MINE'],
  ['beam', 'LOST TO A HAZARD BEAM'],
  ['enemy-contact', 'LOST TO AN ENEMY COLLISION'],
  ['asteroid', 'LOST TO DEBRIS'],
] as const satisfies ReadonlyArray<readonly [Exclude<DamageSource, 'unknown'>, string]>;

test('real pooled collisions distinguish shield absorption from hull damage', async ({
  page,
  assertNoBrowserErrors,
}) => {
  test.setTimeout(120000);
  await openMenu(page);
  await startNewRun(page);
  await recordCombat(page);
  const shield = await page.evaluate(() =>
    window.__SPACE_EXPLORER_BROWSER_HARNESS__!.combatPolish.stageCollision('enemy-bullet', 'shield')
  );
  expect(shield.result).toEqual({ outcome: 'absorbed', source: 'enemy-bullet', hullDamage: 0 });
  expect(shield.afterHp).toBe(shield.beforeHp);
  expect(shield.shields).toBe(0);
  expect(shield.playerTint).toBe(0x44aaff);
  expect(shield.blueShieldRings).toBeGreaterThan(0);
  await saveBrowserEvidence(page, 'real-shield-impact', shield);
  // Separate accepted hit feedback by more than its existing 75ms presentation cooldown.
  await page.waitForTimeout(100);
  const hull = await page.evaluate(() =>
    window.__SPACE_EXPLORER_BROWSER_HARNESS__!.combatPolish.stageCollision('bomb', 'hull')
  );
  expect(hull.result.outcome).toBe('damaged');
  expect(hull.result.source).toBe('bomb');
  expect(hull.beforeHp - hull.afterHp).toBe(hull.result.hullDamage);
  expect(hull.result.hullDamage).toBeGreaterThan(0);
  expect(hull.playerTint).toBe(0xffffff);
  await saveBrowserEvidence(page, 'real-hull-impact', hull);

  assertNoBrowserErrors();
});

for (const [source, label] of causes) {
  test(`real ${source} fatal attribution survives GameOver and retry`, async ({ page, assertNoBrowserErrors }) => {
    test.setTimeout(120000);
    await openMenu(page);
    await startNewRun(page);
    await recordCombat(page);
    const fatal = await page.evaluate(
      (cause) => window.__SPACE_EXPLORER_BROWSER_HARNESS__!.combatPolish.stageCollision(cause, 'fatal'),
      source
    );
    expect(fatal.result).toEqual({ outcome: 'fatal', source, hullDamage: 0.25 });
    await waitForScene(page, 'GameOver');
    expect((await state(page)).summary.deathCause).toBe(source);
    if (source === 'enemy-contact') expect((await state(page)).summary.finalScore).toBeGreaterThan(0);
    expect((await snapshot(page)).texts.some((text) => text.text === label)).toBe(true);
    const recording = await page.evaluate(() => window.__SPACE_EXPLORER_BROWSER_HARNESS__!.gameFeel.read());
    expect(
      recording?.events.some(
        (event) =>
          event.kind === 'player-death' &&
          event.cause === source &&
          event.outcome === 'fatal' &&
          event.hullDamage === 0.25
      )
    ).toBe(true);
    await saveBrowserEvidence(page, `fatal-${source}`, { fatal, state: await state(page), recording });
    await page.getByRole('button', { name: 'Retry from level 1' }).focus();
    await page.keyboard.press('Enter');
    await waitForScene(page, 'Game');
    await expect.poll(async () => (await state(page)).summary.deathCause).toBeNull();
    expect((await state(page)).level).toBe(1);
    await expect
      .poll(() => page.evaluate(() => window.__SPACE_EXPLORER_BROWSER_HARNESS__!.gameFeel.read()?.frames.at(-1)?.alive))
      .toBe(true);
    await saveBrowserEvidence(page, `retry-${source}-complete`, {
      state: await state(page),
      recording: await page.evaluate(() => window.__SPACE_EXPLORER_BROWSER_HARNESS__!.gameFeel.stop()),
    });
    assertNoBrowserErrors();
  });
}

for (const pattern of ['flare', 'lattice'] as const) {
  test(`authored ${pattern} escape region stays safe and telegraph survives pause`, async ({
    page,
    isMobile,
    assertNoBrowserErrors,
  }) => {
    test.setTimeout(180000);
    await openMenu(page);
    await startNewRun(page);
    await setPaused(page, true, isMobile);
    const staged = await page.evaluate(
      (value) => window.__SPACE_EXPLORER_BROWSER_HARNESS__!.combatPolish.stageBeamPattern(value),
      pattern
    );
    const beforePause = await state(page);
    expect(beforePause.beams.length).toBe(pattern === 'flare' ? 1 : 3);
    expect(beforePause.beams.every((beam) => !beam.damaging)).toBe(true);
    await page.waitForTimeout(900);
    const paused = await state(page);
    expect(paused.beams).toEqual(beforePause.beams);
    expect(paused.gameplayMs).toBe(beforePause.gameplayMs);
    await saveBrowserEvidence(page, `${pattern}-paused-telegraph`, { staged, beforePause, paused });
    const observed = observeBeamCycle(page);
    await setPaused(page, false, isMobile);
    const receipt = await observed;
    await saveBrowserEvidence(page, `${pattern}-beam-cycle`, receipt);
    expect(receipt.outcome, JSON.stringify(receipt)).toBe('complete');
    expect(receipt.active).not.toBeNull();
    if (!receipt.active) throw new Error('Missing active beam observation');
    expect(receipt.active.player?.hp).toBe(staged.hp);
    expect(receipt.completed?.player?.hp).toBe(staged.hp);
    expect(receipt.completed?.beams).toEqual([]);
    expect(receipt.elapsedGameplayMs).toBeGreaterThan(pattern === 'flare' ? 700 : 800);
    assertNoBrowserErrors();
  });
}

test('delivered eight-direction input escapes overlapping beam danger before activation', async ({
  page,
  assertNoBrowserErrors,
}) => {
  test.setTimeout(120000);
  await openMenu(page);
  await startNewRun(page);
  await recordCombat(page);
  await page.keyboard.press('Escape');
  await expect.poll(async () => (await state(page)).paused).toBe(true);
  const staged = await page.evaluate(() =>
    window.__SPACE_EXPLORER_BROWSER_HARNESS__!.combatPolish.stageBeamEscapeRoute()
  );
  expect(staged.start.y).toBeLessThan(staged.goal.y);
  await saveBrowserEvidence(page, 'escape-danger-start', { staged, state: await state(page) });
  await page.keyboard.press('Escape');
  await expect.poll(async () => (await state(page)).paused).toBe(false);
  const startedAt = (await state(page)).gameplayMs;
  if (startedAt === null) throw new Error('Missing gameplay clock');
  await page.waitForFunction((start) => {
    const now = window.__SPACE_EXPLORER_BROWSER_HARNESS__!.combatPolish.combatPolishState().gameplayMs;
    return now !== null && now >= start + 250;
  }, startedAt);
  try {
    await page.keyboard.down('ArrowRight');
    await page.keyboard.down('ArrowDown');
    await page.waitForFunction(
      (goal) => (window.__SPACE_EXPLORER_BROWSER_HARNESS__!.combatPolish.combatPolishState().player?.x ?? 0) >= goal,
      staged.goal.x
    );
    await page.keyboard.up('ArrowRight');
    await page.waitForFunction(
      (goal) => (window.__SPACE_EXPLORER_BROWSER_HARNESS__!.combatPolish.combatPolishState().player?.y ?? 0) >= goal,
      staged.goal.y
    );
    await page.keyboard.up('ArrowDown');
    await page.waitForFunction(() => {
      const beams = window.__SPACE_EXPLORER_BROWSER_HARNESS__!.combatPolish.combatPolishState().beams;
      return beams.length === 4 && beams.every((beam) => beam.damaging);
    });
    const escaped = await state(page);
    expect(escaped.player?.hp).toBe(staged.hp);
    const recording = await page.evaluate(() => window.__SPACE_EXPLORER_BROWSER_HARNESS__!.gameFeel.stop());
    expect(recording?.events.some((event) => event.kind === 'key' && event.code === 'ArrowDown')).toBe(true);
    await saveBrowserEvidence(page, 'delivered-beam-escape', { staged, escaped, recording });
  } finally {
    await page.keyboard.up('ArrowRight');
    await page.keyboard.up('ArrowDown');
  }
  assertNoBrowserErrors();
});

test('minimum-quality shield feedback remains visible without expansion under reduced motion', async ({
  page,
  assertNoBrowserErrors,
}) => {
  test.skip(!test.info().project.name.includes('portrait'), 'minimum-width preference coverage');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await openMenu(page);
  const low = page.getByRole('button', { name: 'Set visual quality low', exact: true });
  await low.focus();
  await Promise.all([page.waitForEvent('load'), page.keyboard.press('Enter')]);
  await waitForScene(page, 'Menu');
  await startNewRun(page);
  const shield = await page.evaluate(() =>
    window.__SPACE_EXPLORER_BROWSER_HARNESS__!.combatPolish.stageCollision('enemy-bullet', 'shield')
  );
  expect(shield.result.outcome).toBe('absorbed');
  expect(shield.afterHp).toBe(shield.beforeHp);
  expect(shield.shieldRingScales).toEqual([1]);
  expect(shield.playerTint).toBe(0x44aaff);
  await saveBrowserEvidence(page, 'reduced-motion-shield', shield);
  assertNoBrowserErrors();
});

for (let level = 1; level <= 10; level++) {
  test(`direct level ${level} initializes and reaches its authored boss trigger`, async ({
    page,
    assertNoBrowserErrors,
  }) => {
    test.setTimeout(180000);
    await openMenu(page);
    const staged = await page.evaluate(
      (value) => window.__SPACE_EXPLORER_BROWSER_HARNESS__!.combatPolish.stageLevel(value),
      level
    );
    await waitForScene(page, 'Game');
    await expect.poll(async () => (await state(page)).level).toBe(level);
    await page.waitForTimeout(200);
    expect((await state(page)).player?.alive).toBe(true);
    const trigger = await page.evaluate(() =>
      window.__SPACE_EXPLORER_BROWSER_HARNESS__!.combatPolish.stageBossThreshold()
    );
    if (trigger.hasBoss) {
      const receipt = await observeBossSpawn(page);
      await saveBrowserEvidence(page, `level-${level}-boss-observation`, receipt);
      expect(receipt.outcome, JSON.stringify(receipt)).toBe('complete');
      expect(receipt.last.bosses).toHaveLength(1);
    }
    await saveBrowserEvidence(page, `direct-level-${level}-boss-smoke`, {
      staged,
      trigger,
      state: await state(page),
      scope: 'Direct level and progress staging; verifies initialization and boss spawn, not complete campaign play.',
    });
    assertNoBrowserErrors();
  });
}
