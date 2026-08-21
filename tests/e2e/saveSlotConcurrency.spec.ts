import { expect, test } from './fixtures';

const ENTRY_KEY_PREFIX = 'space-explorer.saveSlot.v2.';

test('different-slot updates remain visible across same-origin pages', async ({
  page,
  context,
  assertNoBrowserErrors,
}) => {
  const peer = await context.newPage();
  await page.goto('/');
  await peer.goto('/');

  await page.evaluate((prefix) => {
    const target = window as Window & { __SAVE_SLOT_STORAGE_EVENTS__?: string[] };
    target.__SAVE_SLOT_STORAGE_EVENTS__ = [];
    window.addEventListener('storage', (event) => {
      if (event.key?.startsWith(prefix)) target.__SAVE_SLOT_STORAGE_EVENTS__?.push(event.key);
    });
  }, ENTRY_KEY_PREFIX);

  const writeSlot = async (target: typeof page, id: 'slot-1' | 'slot-2', score: number) =>
    target.evaluate(
      async ({ slotId, slotScore }) => {
        const modulePath = '/src/systems/SaveSlotStorage.ts';
        const storage = await import(modulePath);
        const record = storage.createSaveSlotRecord(
          slotId,
          {
            level: 2,
            score: slotScore,
            currentHp: 5,
            currentShields: 0,
            remainingLives: 3,
            upgrades: { hp: 0, damage: 0, fireRate: 0, shield: 0, turrets: 0 },
            helperWing: { grantedSlots: 0, slots: [] },
          },
          { finalScore: slotScore, levelReached: 2 }
        );
        return storage.writeSaveSlot(record)?.id ?? null;
      },
      { slotId: id, slotScore: score }
    );

  expect(await writeSlot(page, 'slot-1', 100)).toBe('slot-1');
  expect(await writeSlot(peer, 'slot-2', 200)).toBe('slot-2');

  await expect
    .poll(() =>
      page.evaluate(async () => {
        const modulePath = '/src/systems/SaveSlotStorage.ts';
        const storage = await import(modulePath);
        const slots = storage.listSaveSlots() as Array<{ id: string; occupied: boolean }>;
        return slots.filter((slot) => slot.occupied).map((slot) => slot.id);
      })
    )
    .toEqual(['slot-1', 'slot-2']);
  await expect
    .poll(() =>
      page.evaluate(
        () => (window as Window & { __SAVE_SLOT_STORAGE_EVENTS__?: string[] }).__SAVE_SLOT_STORAGE_EVENTS__ ?? []
      )
    )
    .toContain(`${ENTRY_KEY_PREFIX}slot-2`);

  expect(
    await peer.evaluate(async () => {
      const modulePath = '/src/systems/SaveSlotStorage.ts';
      const storage = await import(modulePath);
      return storage.deleteSaveSlot('slot-1');
    })
  ).toBe(true);
  await expect
    .poll(() =>
      page.evaluate(async () => {
        const modulePath = '/src/systems/SaveSlotStorage.ts';
        const storage = await import(modulePath);
        return storage.readSaveSlot('slot-1');
      })
    )
    .toBeNull();

  await peer.close();
  assertNoBrowserErrors();
});
