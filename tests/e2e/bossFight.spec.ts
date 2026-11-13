import { expect, pinQualityTier, test, waitForScene } from './fixtures';

test('Bastion Bulwark fights through all three phases and pays a fast-kill bonus', async ({
  page,
  assertNoBrowserErrors,
}) => {
  test.setTimeout(process.env.CI ? 240_000 : 90_000);
  await pinQualityTier(page, 'low');
  await page.goto('/?browserHarness=1&startLevel=6&seed=1');
  await waitForScene(page, 'Game');
  await page.evaluate(() => window.__SPACE_EXPLORER_BROWSER_HARNESS__!.startBossFight({ invulnerable: true }));

  // The bonus popup floats for about a second before the sector hands off, so watch for it every frame.
  await page.evaluate(() => {
    const watch = (): void => {
      const texts = window.__SPACE_EXPLORER_BROWSER_HARNESS__?.snapshot().texts ?? [];
      const seen = texts.some((text) => text.text.startsWith('FAST KILL'));
      (window as { sawFastKill?: boolean }).sawFastKill = seen;
      if (!seen) requestAnimationFrame(watch);
    };
    requestAnimationFrame(watch);
  });

  const read = () => page.evaluate(() => window.__SPACE_EXPLORER_BROWSER_HARNESS__!.readBossFight()!);
  await expect.poll(async () => (await read()).bossMaxHp, { timeout: 30_000 }).toBeGreaterThan(0);

  // Wear the hull down in small bites; a shielded boss shrugs some of them off, so keep going until each
  // phase has been announced and the boss is dead.
  const deadline = Date.now() + (process.env.CI ? 180_000 : 60_000);
  let fight = await read();
  while (!fight.killed && Date.now() < deadline) {
    await page.evaluate(
      (amount) => window.__SPACE_EXPLORER_BROWSER_HARNESS__!.damageBoss(amount),
      Math.ceil(fight.bossMaxHp * 0.04)
    );
    await page.waitForTimeout(250);
    fight = await read();
  }

  expect(fight.phases).toEqual([2, 3]);
  expect(fight.killed).toBe(true);
  // The kill came well under the 60 s par, so the bonus popup shows.
  expect(fight.fastKillBonus).toBeGreaterThan(0);
  expect(await page.evaluate(() => (window as { sawFastKill?: boolean }).sawFastKill)).toBe(true);
  assertNoBrowserErrors();
});
