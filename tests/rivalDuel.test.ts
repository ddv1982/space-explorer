import { describe, expect, mock, test } from 'bun:test';
import { mockPhaserModule } from './helpers/phaserMock';

mockPhaserModule();

const { Rival } = await import('../src/entities/enemies/Rival');
const { Courier } = await import('../src/entities/enemies/Courier');
const { FLIGHT_CONFIG } = await import('../src/config/flightConfig');
const { PLAYER_CONFIG } = await import('../src/config/playerConfig');
const { evaluateUpgrades } = await import('../src/config/UpgradesConfig');
const { getTotalLevels } = await import('../src/config/LevelsConfig');
const { getLaneCenterX, resolveFormationPositions } = await import('../src/systems/wave/waveChoreography');
const { createGameSceneGameplayFrameBehavior } = await import('../src/scenes/gameScene/gameplayFrameBehavior');
const {
  COURIER_WEAVE_SPEED,
  RIVAL_ACCELERATION,
  RIVAL_ATTACK_MS,
  RIVAL_FIRE_RATE,
  RIVAL_HITS_TO_DEFEAT,
  RIVAL_MAX_SPEED,
} = await import('../src/utils/constants');

type Stub = Record<string, unknown> & {
  updateBehavior: (time: number, delta: number) => void;
  setPlayerDamage: (damage: number) => void;
  die: () => void;
};

function stubShip(prototype: object, x: number): Stub {
  const ship = Object.create(prototype) as Stub;
  for (const method of ['setVelocity', 'setVelocityX', 'setVelocityY', 'setFrame', 'setTint', 'setTintMode']) {
    ship[method] = mock();
  }
  ship.scene = { cameras: { main: { width: 800, height: 600 } }, events: { emit: mock() } };
  ship.x = x;
  ship.y = 200;
  return ship;
}

function stubRival(targetX: number | null, x = 400) {
  const rival = stubShip(Rival.prototype, x);
  const bullet = { fire: mock() };
  Object.assign(rival, {
    phase: 'attack',
    phaseStart: 0,
    lastFireTime: 0,
    velocityX: 0,
    evadeSide: 1,
    bulletGroup: { getFirstDead: () => bullet, get: mock() },
    targetProvider: () => (targetX === null ? null : { x: targetX, y: 500 }),
  });
  return { rival, bullet };
}

describe('Rival', () => {
  test('flies and shoots at half the player ship strength', () => {
    expect(RIVAL_ACCELERATION).toBe(FLIGHT_CONFIG.acceleration / 2);
    expect(RIVAL_MAX_SPEED).toBe(FLIGHT_CONFIG.maxSpeed / 2);
    expect(RIVAL_FIRE_RATE).toBe(PLAYER_CONFIG.baseFireRate * 2);
  });

  test('fires on its attack run only while the player is in its sights', () => {
    const aligned = stubRival(410);
    aligned.rival.updateBehavior(RIVAL_FIRE_RATE + 1, 16);
    expect(aligned.bullet.fire).toHaveBeenCalledTimes(1);

    const wide = stubRival(700);
    wide.rival.updateBehavior(RIVAL_FIRE_RATE + 1, 16);
    expect(wide.bullet.fire).not.toHaveBeenCalled();
  });

  test('breaks away after an attack run and holds fire while dodging', () => {
    const { rival, bullet } = stubRival(400);
    rival.updateBehavior(RIVAL_ATTACK_MS + 1, 16);

    expect(rival.phase).toBe('evade');
    expect(bullet.fire).not.toHaveBeenCalled();
    // It steers away from the player's column, never faster than its thrust allows in one frame.
    expect(Math.abs(rival.velocityX as number)).toBeCloseTo(RIVAL_ACCELERATION * 0.016, 5);
  });

  test('rates its hull in hits from the player guns', () => {
    const { rival } = stubRival(400);
    rival.setPlayerDamage(3);
    expect(rival.maxHp).toBe(RIVAL_HITS_TO_DEFEAT * 3);
  });
});

describe('Courier', () => {
  test('turns back at the screen edges and always leaves a power-up', () => {
    const courier = stubShip(Courier.prototype, 10);
    courier.updateBehavior(0, 16);
    expect(courier.setVelocityX).toHaveBeenCalledWith(COURIER_WEAVE_SPEED);

    courier.x = 790;
    courier.updateBehavior(0, 16);
    expect(courier.setVelocityX).toHaveBeenLastCalledWith(-COURIER_WEAVE_SPEED);

    Object.assign(courier, { despawn: mock(), scoreValue: 800, defeatCount: 0, aceMarked: false });
    courier.die();
    const emit = (courier.scene as { events: { emit: ReturnType<typeof mock> } }).events.emit;
    expect(emit.mock.calls[0]?.[4]).toBe(true);
  });
});

describe('wall and echelon formations', () => {
  test('a wall fills every lane but the gap lane', () => {
    const gapX = getLaneCenterX(2, 390);
    const wall = resolveFormationPositions('wall', 18, gapX, 390);
    expect(wall).toHaveLength(6);
    expect(wall.every((position) => Math.abs(position.x - gapX) > 40)).toBe(true);
  });

  test('a wall doubles up per lane on a wide screen and still leaves the gap lane clear', () => {
    const gapX = getLaneCenterX(3, 1280);
    const laneWidth = getLaneCenterX(1, 1280) - getLaneCenterX(0, 1280);
    const wall = resolveFormationPositions('wall', 18, gapX, 1280);
    expect(wall).toHaveLength(12);
    expect(wall.every((position) => Math.abs(position.x - gapX) > laneWidth / 2)).toBe(true);
  });

  test('an echelon steps away from the nearer screen edge', () => {
    const fromLeft = resolveFormationPositions('echelon', 3, 100, 800);
    expect(fromLeft.map((position) => position.x)).toEqual([100, 156, 212]);
    expect(fromLeft.map((position) => position.y)).toEqual([-60, -116, -172]);
    expect(resolveFormationPositions('echelon', 2, 700, 800).map((position) => position.x)).toEqual([700, 644]);
  });
});

describe('rival duel hold', () => {
  test('the sector holds and shows the rival hull until the duel is won', () => {
    let duel: { hp: number; maxHp: number } | null = { hp: 30, maxHp: 30 };
    const waveUpdate = mock();
    const levelUpdate = mock();
    const hud = { showBossBar: mock(), hideBossBar: mock(), updateBossHp: mock(), setSwapHint: mock() };
    const emit = mock();
    const noop = (): void => {};
    const behavior = createGameSceneGameplayFrameBehavior({
      inputManager: {
        consumePauseToggleRequest: () => false,
        consumeGunSwapRequest: () => false,
        isFiring: () => false,
      },
      pauseStateController: null,
      parallax: { update: noop, setSectionAtmosphere: noop },
      player: { update: noop },
      getLastLifeHelperWing: () => null,
      getPicketTurrets: () => null,
      grazeSurge: { update: noop },
      shipSystems: {
        update: noop,
        getSystems: () => ({}),
        getGun: () => null,
        updateGunCharge: () => false,
        isSwapHintPending: () => false,
      },
      mobileControls: null,
      waveManager: { update: waveUpdate, updateBossAdds: noop, getDuelHull: () => duel },
      levelManager: {
        progress: 0.5,
        hasBossSpawned: () => false,
        isComplete: () => false,
        update: levelUpdate,
        getLevelConfig: () => ({ sections: [] }),
        shouldSpawnBoss: () => false,
      },
      flow: { isTerminalTransitionActive: () => false },
      events: { emit },
      hud,
      effectsManager: { updateLighting: noop },
      getBoss: () => null,
    } as unknown as Parameters<typeof createGameSceneGameplayFrameBehavior>[0]);

    behavior.updateGameplayFrame(0, 16);
    duel = { hp: 12, maxHp: 30 };
    behavior.updateGameplayFrame(16, 16);

    expect(waveUpdate).not.toHaveBeenCalled();
    expect(levelUpdate).not.toHaveBeenCalled();
    expect(hud.showBossBar).toHaveBeenCalledTimes(1);
    expect(emit).toHaveBeenCalledTimes(1);
    expect(hud.updateBossHp).toHaveBeenLastCalledWith(12, 30);

    duel = null;
    behavior.updateGameplayFrame(32, 16);

    expect(hud.hideBossBar).toHaveBeenCalledTimes(1);
    expect(waveUpdate).toHaveBeenCalledTimes(1);
    expect(levelUpdate).toHaveBeenCalledTimes(1);
  });
});

describe('upgrade progression', () => {
  const stock = { hp: 0, damage: 0, fireRate: 0, shield: 0, turrets: 0 };
  const tiersOpenAfter = (sector: number): number =>
    evaluateUpgrades(sector, 0, stock).reduce((total, entry) => total + entry.progressionLimit, 0);

  test('tiers keep opening through the whole campaign instead of stopping halfway', () => {
    const lastShop = getTotalLevels() - 1;
    const limits = Array.from({ length: lastShop }, (_, index) => tiersOpenAfter(index + 1));
    expect(limits).toEqual([...limits].sort((a, b) => a - b));
    expect(tiersOpenAfter(5)).toBeLessThan(tiersOpenAfter(lastShop - 1));
    const maxTiers = evaluateUpgrades(lastShop, 0, stock).reduce((total, entry) => total + entry.upgrade.maxLevel, 0);
    expect(tiersOpenAfter(lastShop)).toBe(maxTiers);
  });
});
