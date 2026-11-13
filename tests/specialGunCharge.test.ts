import { describe, expect, mock, test } from 'bun:test';

mock.module('phaser', () => ({
  default: {
    Math: {
      Vector2: class {
        x = 0;
        y = 0;
      },
    },
  },
}));

mock.module('../src/systems/AudioManager', () => ({
  audioManager: { playSfx: () => {}, setMusicIntensity: () => {} },
}));

const { getLevelConfig } = await import('../src/config/LevelsConfig');
const { NO_SHIP_SYSTEMS, SPECIAL_GUN_CHARGE } = await import('../src/config/shipSystems');
const { getPlayerState } = await import('../src/systems/PlayerState');
const { ShipSystemsRuntime } = await import('../src/systems/ShipSystemsRuntime');
const { createGameSceneGameplayFrameBehavior } = await import('../src/scenes/gameScene/gameplayFrameBehavior');
const { GameplayClock, runGameSceneUpdateFrame } = await import('../src/scenes/gameScene/updateFrame');

type ShipSystems = typeof NO_SHIP_SYSTEMS;
type GameplayDelegate = Parameters<typeof createGameSceneGameplayFrameBehavior>[0];

/** First sector with Lance and the special guns. */
const GUN_SECTOR = SPECIAL_GUN_CHARGE.fromLevel;

function createRegistry() {
  const values = new Map<string, unknown>();
  return { get: (key: string) => values.get(key), set: (key: string, value: unknown) => values.set(key, value) };
}

function createRuntime(level: number, systems: Partial<ShipSystems> = {}) {
  const registry = createRegistry();
  const drones: Array<{ destroyed: boolean }> = [];
  const pickup = {
    active: true,
    x: 0,
    y: 0,
    velocity: [0, 0],
    setVelocity(x: number, y: number) {
      pickup.velocity = [x, y];
    },
  };
  const scene = {
    registry,
    add: {
      image: () => {
        const drone = {
          destroyed: false,
          setScale: () => drone,
          setDepth: () => drone,
          destroy: () => {
            drone.destroyed = true;
          },
        };
        drones.push(drone);
        return drone;
      },
    },
  };
  const ship = { x: 0, y: 100, isAlive: true };
  const runtime = new ShipSystemsRuntime(
    scene as never,
    ship,
    { getChildren: () => [pickup] } as never,
    { ...NO_SHIP_SYSTEMS, ...systems },
    level
  );
  return { runtime, registry, drones, pickup };
}

describe('special-gun charge', () => {
  test('sectors 1-2 fly the standard gun: no swap, no meter', () => {
    for (const level of [1, 2]) {
      const { runtime } = createRuntime(level);
      expect(runtime.getGun()).toBeNull();
      expect(runtime.trySwapGun()).toBe('unavailable');
      expect(runtime.updateGunCharge(60_000)).toBe(false);
      expect(runtime.getGun()).toBeNull();
    }
  });

  test('from sector 3 the ship starts every sector on Lance with a full meter', () => {
    const { runtime } = createRuntime(GUN_SECTOR);
    expect(runtime.getGun()).toBe('lance');
    expect(runtime.getGunCharge()).toBe(1);
  });

  test('the swap key steps Lance -> Scatter -> Seekers -> Lance', () => {
    const { runtime } = createRuntime(GUN_SECTOR);
    const guns: Array<string | null> = [];
    for (let press = 0; press < 3; press += 1) {
      expect(runtime.trySwapGun()).toBe('swapped');
      guns.push(runtime.getGun());
    }
    expect(guns).toEqual(['scatter', 'seekers', 'lance']);
  });

  test('a special gun drains a full meter in drainMs and then hands back Lance', () => {
    const { runtime } = createRuntime(GUN_SECTOR);
    runtime.trySwapGun();
    expect(runtime.updateGunCharge(SPECIAL_GUN_CHARGE.drainMs / 2)).toBe(false);
    expect(runtime.getGunCharge()).toBeCloseTo(0.5);
    expect(runtime.getGun()).toBe('scatter');
    expect(runtime.updateGunCharge(SPECIAL_GUN_CHARGE.drainMs / 2 - 1)).toBe(false);
    expect(runtime.getGun()).toBe('scatter');
    expect(runtime.updateGunCharge(1)).toBe(true);
    expect(runtime.getGun()).toBe('lance');
    expect(runtime.getGunCharge()).toBe(0);
  });

  test('Lance refills an empty meter in refillMs; a special gun never refills it', () => {
    const { runtime } = createRuntime(GUN_SECTOR);
    runtime.trySwapGun();
    runtime.updateGunCharge(SPECIAL_GUN_CHARGE.drainMs);
    runtime.updateGunCharge(SPECIAL_GUN_CHARGE.refillMs / 2);
    expect(runtime.getGunCharge()).toBeCloseTo(0.5);
    runtime.updateGunCharge(SPECIAL_GUN_CHARGE.refillMs);
    expect(runtime.getGunCharge()).toBe(1);

    runtime.trySwapGun();
    runtime.updateGunCharge(1000);
    const drained = runtime.getGunCharge();
    runtime.recordKill();
    expect(runtime.getGunCharge()).toBe(drained);
  });

  test('every enemy destroyed on Lance adds perKill, up to full', () => {
    const { runtime } = createRuntime(GUN_SECTOR);
    runtime.trySwapGun();
    runtime.updateGunCharge(SPECIAL_GUN_CHARGE.drainMs);
    runtime.recordKill();
    runtime.recordKill();
    expect(runtime.getGunCharge()).toBeCloseTo(2 * SPECIAL_GUN_CHARGE.perKill);
    runtime.updateGunCharge(SPECIAL_GUN_CHARGE.refillMs);
    runtime.recordKill();
    expect(runtime.getGunCharge()).toBe(1);
  });

  test('leaving Lance needs minToLeaveLance; moving between specials or back to Lance never does', () => {
    const { runtime } = createRuntime(GUN_SECTOR);
    runtime.trySwapGun();
    runtime.updateGunCharge(SPECIAL_GUN_CHARGE.drainMs);
    expect(runtime.getGun()).toBe('lance');

    const justShort = (SPECIAL_GUN_CHARGE.minToLeaveLance - 0.01) * SPECIAL_GUN_CHARGE.refillMs;
    runtime.updateGunCharge(justShort);
    expect(runtime.trySwapGun()).toBe('low-charge');
    expect(runtime.getGun()).toBe('lance');

    runtime.updateGunCharge(0.01 * SPECIAL_GUN_CHARGE.refillMs + 1);
    expect(runtime.trySwapGun()).toBe('swapped');
    // Almost empty, but stepping on through the specials and home again is always allowed.
    runtime.updateGunCharge(SPECIAL_GUN_CHARGE.minToLeaveLance * SPECIAL_GUN_CHARGE.drainMs - 10);
    expect(runtime.trySwapGun()).toBe('swapped');
    expect(runtime.getGun()).toBe('seekers');
    expect(runtime.trySwapGun()).toBe('swapped');
    expect(runtime.getGun()).toBe('lance');
  });

  test('a respawn starts over on Lance with a full meter', () => {
    const { runtime } = createRuntime(GUN_SECTOR);
    runtime.trySwapGun();
    runtime.updateGunCharge(SPECIAL_GUN_CHARGE.drainMs / 2);
    runtime.resetGunCharge();
    expect(runtime.getGun()).toBe('lance');
    expect(runtime.getGunCharge()).toBe(1);

    const early = createRuntime(2).runtime;
    early.resetGunCharge();
    expect(early.getGun()).toBeNull();
  });

  test('the gun and its charge are never part of the saved systems', () => {
    const { runtime, registry } = createRuntime(GUN_SECTOR, { support: 'magnet' });
    runtime.trySwapGun();
    runtime.cycleSystem('support');
    expect(getPlayerState(registry).systems).toEqual({ support: 'surgeCore', late: null });
  });
});

describe('live ship-system changes', () => {
  test('switching support to Wingman launches the drone and switching away removes it', () => {
    const { runtime, drones } = createRuntime(GUN_SECTOR, { support: 'surgeCore' });
    expect(drones).toHaveLength(0);
    runtime.cycleSystem('support');
    expect(runtime.getSystems().support).toBe('wingman');
    expect(drones).toHaveLength(1);
    runtime.cycleSystem('support');
    expect(runtime.getSystems().support).toBe('magnet');
    expect(drones[0].destroyed).toBe(true);
  });

  test('switching away from Magnet lets go of the pickups it was pulling', () => {
    const { runtime, pickup } = createRuntime(GUN_SECTOR, { support: 'magnet' });
    runtime.update();
    expect(pickup.velocity[1]).toBeGreaterThan(60);
    runtime.cycleSystem('support');
    expect(pickup.velocity).toEqual([0, 60]);
  });
});

function createFrameHarness(level: number) {
  const { runtime } = createRuntime(level);
  const clock = new GameplayClock();
  const shots: number[] = [];
  const feedback: string[] = [];
  const buttonStates: Array<[string | null, number]> = [];
  let swapPressed = false;
  let paused = false;
  let realTime = 0;
  const vector = { x: 0, y: 0 } as GameplayDelegate['shotDirection'];
  const levelConfig = getLevelConfig(level);
  const behavior = createGameSceneGameplayFrameBehavior({
    inputManager: {
      consumePauseToggleRequest: () => false,
      consumeGunSwapRequest: () => {
        const pressed = swapPressed;
        swapPressed = false;
        return pressed;
      },
      isFiring: () => true,
    },
    pauseStateController: { togglePauseRequest: () => {}, isGameplayPaused: () => paused },
    flow: {
      isGameplayLocked: () => false,
      sampleRespawnTransitionFrame: () => {},
      isTerminalTransitionActive: () => false,
    },
    parallax: { update: () => {}, setSectionAtmosphere: () => {} },
    player: {
      isAlive: true,
      fireRate: 150,
      getFireDirection: (out) => out,
      getMuzzlePosition: (_distance, out) => out,
      update: () => {},
    },
    getLastLifeHelperWing: () => null,
    getPicketTurrets: () => null,
    shipSystems: runtime,
    gunSwapFeedback: {
      swapped: (gun) => feedback.push(gun),
      denied: () => feedback.push('denied'),
    },
    mobileControls: { setGunChargeState: (gun, charge) => buttonStates.push([gun, charge]) },
    grazeSurge: { update: () => {} },
    waveManager: { update: () => {}, updateBossAdds: () => {}, getDuelHull: () => null },
    levelManager: {
      progress: 0,
      hasBossSpawned: () => false,
      isComplete: () => false,
      update: () => {},
      getLevelConfig: () => levelConfig,
      shouldSpawnBoss: () => false,
    },
    scoreManager: { getChainState: () => ({ chain: 0, multiplier: 1 }) },
    events: { emit: () => {} },
    hud: { showBossBar: () => {}, hideBossBar: () => {}, updateBossHp: () => {} },
    bulletPool: { fire: () => shots.push(clock.now) },
    findBulletTarget: () => null,
    effectsManager: { createMuzzleFlash: () => {}, updateLighting: () => {} },
    getBoss: () => null,
    updateHud: () => {},
    shotDirection: vector,
    shotOrigin: { ...vector } as GameplayDelegate['shotOrigin'],
    muzzleFlashOrigin: { ...vector } as GameplayDelegate['muzzleFlashOrigin'],
  });

  /** Runs real frames of 16 ms; gameplay time only moves while unpaused. */
  const run = (ms: number): void => {
    for (let elapsed = 0; elapsed < ms; elapsed += 16) {
      realTime += 16;
      runGameSceneUpdateFrame(behavior, realTime, 16, clock);
    }
  };

  return {
    runtime,
    clock,
    shots,
    feedback,
    buttonStates,
    run,
    pressSwap: () => {
      swapPressed = true;
    },
    setPaused: (next: boolean) => {
      paused = next;
    },
  };
}

describe('special guns during play', () => {
  test('a swap fires at once, with no silence after the change', () => {
    const harness = createFrameHarness(GUN_SECTOR);
    harness.run(400);
    harness.pressSwap();
    harness.run(16);
    expect(harness.feedback).toEqual(['scatter']);
    const shotsAtSwap = harness.shots.length;
    harness.run(300);
    expect(harness.shots.length).toBeGreaterThan(shotsAtSwap);
  });

  test('the meter drains on the gameplay clock only, then flashes Lance back', () => {
    const harness = createFrameHarness(GUN_SECTOR);
    harness.pressSwap();
    harness.run(16);
    harness.setPaused(true);
    harness.run(SPECIAL_GUN_CHARGE.drainMs * 2);
    harness.setPaused(false);
    expect(harness.runtime.getGun()).toBe('scatter');
    expect(harness.runtime.getGunCharge()).toBeGreaterThan(0.99);

    harness.run(SPECIAL_GUN_CHARGE.drainMs + 32);
    expect(harness.runtime.getGun()).toBe('lance');
    expect(harness.feedback).toEqual(['scatter', 'lance']);
    const [gun, charge] = harness.buttonStates.at(-1)!;
    expect(gun).toBe('lance');
    expect(charge).toBeLessThan(0.01);
  });

  test('leaving Lance on a low meter is refused with the quiet cue and changes nothing', () => {
    const harness = createFrameHarness(GUN_SECTOR);
    harness.pressSwap();
    harness.run(SPECIAL_GUN_CHARGE.drainMs + 32);
    harness.pressSwap();
    harness.run(16);
    expect(harness.feedback).toEqual(['scatter', 'lance', 'denied']);
    expect(harness.runtime.getGun()).toBe('lance');
  });

  test('a press while paused is dropped, not saved for resume', () => {
    const harness = createFrameHarness(GUN_SECTOR);
    harness.setPaused(true);
    harness.pressSwap();
    harness.run(32);
    harness.setPaused(false);
    harness.run(32);
    expect(harness.feedback).toEqual([]);
    expect(harness.runtime.getGun()).toBe('lance');
  });

  test('in sectors 1-2 the key does nothing and the touch button stays hidden', () => {
    const harness = createFrameHarness(2);
    harness.pressSwap();
    harness.run(400);
    expect(harness.feedback).toEqual([]);
    expect(harness.buttonStates.every(([gun]) => gun === null)).toBe(true);
    expect(harness.shots.length).toBeGreaterThan(0);
  });
});
