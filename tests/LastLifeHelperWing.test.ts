import { describe, expect, mock, test } from 'bun:test';

mock.module('phaser', () => ({
  default: {
    Scene: class {},
    Physics: {
      Arcade: {
        Sprite: class {},
        Group: class {},
      },
    },
  },
}));

const { LastLifeHelperWing } = await import('../src/systems/LastLifeHelperWing');
const { GAME_SCENE_EVENTS } = await import('../src/systems/GameplayFlow');
type LastLifeHelperWingInstance = InstanceType<typeof LastLifeHelperWing>;

describe('LastLifeHelperWing', () => {
  test('update emits helperWingDepleted once when no live helpers remain', () => {
    const emit = mock();
    const updateWithPlayer = mock();

    const wing = Object.create(LastLifeHelperWing.prototype) as LastLifeHelperWingInstance;
    (wing as unknown as Record<string, unknown>).activated = true;
    (wing as unknown as Record<string, unknown>).depletedAnnounced = false;
    (wing as unknown as Record<string, unknown>).helpers = [{ updateWithPlayer }];
    (wing as unknown as Record<string, unknown>).scene = { events: { emit } };
    (wing as unknown as Record<string, unknown>).player = { id: 'player' };
    (wing as unknown as Record<string, unknown>).bulletPool = { id: 'bulletPool' };
    (wing as unknown as Record<string, unknown>).effectsManager = { id: 'effectsManager' };
    (wing as unknown as Record<string, unknown>).getLiveHelperCount = () => 0;

    wing.update(1000);
    wing.update(1016);

    expect((wing as unknown as Record<string, unknown>).activated).toBe(false);
    expect((wing as unknown as Record<string, unknown>).depletedAnnounced).toBe(true);
    expect(emit).toHaveBeenCalledTimes(1);
    expect(emit).toHaveBeenCalledWith(GAME_SCENE_EVENTS.helperWingDepleted);
    expect(updateWithPlayer).not.toHaveBeenCalled();
  });

  test('update delegates to helpers when the wing is active and helpers are alive', () => {
    const helperA = { updateWithPlayer: mock() };
    const helperB = { updateWithPlayer: mock() };
    const player = { id: 'player' };
    const bulletPool = { id: 'bulletPool' };
    const effectsManager = { id: 'effectsManager' };

    const wing = Object.create(LastLifeHelperWing.prototype) as LastLifeHelperWingInstance;
    (wing as unknown as Record<string, unknown>).activated = true;
    (wing as unknown as Record<string, unknown>).helpers = [helperA, helperB];
    (wing as unknown as Record<string, unknown>).player = player;
    (wing as unknown as Record<string, unknown>).bulletPool = bulletPool;
    (wing as unknown as Record<string, unknown>).effectsManager = effectsManager;
    (wing as unknown as Record<string, unknown>).getLiveHelperCount = () => 2;

    wing.update(500);

    expect(helperA.updateWithPlayer).toHaveBeenCalledWith(player, 500, bulletPool, effectsManager);
    expect(helperB.updateWithPlayer).toHaveBeenCalledWith(player, 500, bulletPool, effectsManager);
  });

  test('destroy is idempotent when Phaser teardown has already invalidated group internals', () => {
    const colliderDestroy = mock(() => {
      throw new TypeError('already destroyed');
    });
    const helperDestroy = mock(() => {
      throw new TypeError('already destroyed');
    });
    const helperDisableBody = mock(() => {
      throw new TypeError('body already destroyed');
    });
    const helperClearTint = mock();
    const groupClear = mock(() => {
      throw new TypeError("undefined is not an object (evaluating 'n.forEach')");
    });

    const wing = Object.create(LastLifeHelperWing.prototype) as LastLifeHelperWingInstance;
    (wing as unknown as Record<string, unknown>).activated = true;
    (wing as unknown as Record<string, unknown>).depletedAnnounced = true;
    (wing as unknown as Record<string, unknown>).helpers = [
      {
        active: true,
        disableBody: helperDisableBody,
        clearTint: helperClearTint,
        destroy: helperDestroy,
      },
    ];
    (wing as unknown as Record<string, unknown>).helperGroup = { clear: groupClear };
    (wing as unknown as Record<string, unknown>).overlapColliders = [{ destroy: colliderDestroy }];
    (wing as unknown as Record<string, unknown>).maxSlots = 1;
    (wing as unknown as Record<string, unknown>).grantedSlots = 1;
    (wing as unknown as Record<string, unknown>).canAcquireInLevel = true;

    expect(() => wing.destroy()).not.toThrow();
    expect(() => wing.destroy()).not.toThrow();

    expect(colliderDestroy).toHaveBeenCalledTimes(1);
    expect(helperDisableBody).toHaveBeenCalledTimes(1);
    expect(helperClearTint).not.toHaveBeenCalled();
    expect(helperDestroy).toHaveBeenCalledTimes(1);
    expect(groupClear).toHaveBeenCalledWith(false, false);
    expect((wing as unknown as Record<string, unknown>).helpers).toEqual([]);
    expect((wing as unknown as Record<string, unknown>).helperGroup).toBeNull();
    expect((wing as unknown as Record<string, unknown>).overlapColliders).toEqual([]);
    expect((wing as unknown as Record<string, unknown>).activated).toBe(false);
    expect((wing as unknown as Record<string, unknown>).depletedAnnounced).toBe(false);
    expect((wing as unknown as Record<string, unknown>).maxSlots).toBe(0);
    expect((wing as unknown as Record<string, unknown>).grantedSlots).toBe(0);
    expect((wing as unknown as Record<string, unknown>).canAcquireInLevel).toBe(false);
  });

  test('enemy contact uses contact damage pacing while projectiles still apply direct damage', () => {
    const bulletKill = mock();
    const takeDamage = mock();
    const takeContactDamage = mock();
    const effectsManager = { id: 'effectsManager' };

    const wing = Object.create(LastLifeHelperWing.prototype) as LastLifeHelperWingInstance;
    (wing as unknown as Record<string, unknown>).scene = { time: { now: 1234 } };
    (wing as unknown as Record<string, unknown>).effectsManager = effectsManager;
    (wing as unknown as Record<string, unknown>).resolveCollisionTarget = (ctor: unknown) => {
      const ctorName = typeof ctor === 'function' ? ctor.name : '';
      if (ctorName === 'EnemyBullet') {
        return { active: true, kill: bulletKill };
      }
      if (ctorName === 'EnemyBase') {
        return { active: true };
      }
      if (ctorName === 'HelperShip') {
        return { takeDamage, takeContactDamage };
      }
      return null;
    };

    (wing as unknown as { handleEnemyBulletOverlap: (a: unknown, b: unknown) => void }).handleEnemyBulletOverlap(null, null);
    (wing as unknown as { handleEnemyContactOverlap: (a: unknown, b: unknown) => void }).handleEnemyContactOverlap(null, null);

    expect(bulletKill).toHaveBeenCalledTimes(1);
    expect(takeDamage).toHaveBeenCalledWith(1, 1234, effectsManager);
    expect(takeContactDamage).toHaveBeenCalledWith(1, 1234, effectsManager);
  });
});
