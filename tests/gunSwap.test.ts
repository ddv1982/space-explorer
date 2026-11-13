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
const { GUN_SWAP, NO_SHIP_SYSTEMS } = await import('../src/config/shipSystems');
const { getPlayerState } = await import('../src/systems/PlayerState');
const { ShipSystemsRuntime } = await import('../src/systems/ShipSystemsRuntime');
const { createGameSceneGameplayFrameBehavior } = await import('../src/scenes/gameScene/gameplayFrameBehavior');
const { GameplayClock, runGameSceneUpdateFrame } = await import('../src/scenes/gameScene/updateFrame');

type ShipSystems = typeof NO_SHIP_SYSTEMS;
type GameplayDelegate = Parameters<typeof createGameSceneGameplayFrameBehavior>[0];

function createRegistry() {
  const values = new Map<string, unknown>();
  return { get: (key: string) => values.get(key), set: (key: string, value: unknown) => values.set(key, value) };
}

function createRuntime(systems: Partial<ShipSystems>) {
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
  const runtime = new ShipSystemsRuntime(scene as never, ship, { getChildren: () => [pickup] } as never, {
    ...NO_SHIP_SYSTEMS,
    ...systems,
  });
  return { runtime, registry, drones, pickup };
}

describe('live ship-system changes', () => {
  test('a run without a main gun cannot swap and its gun is never silenced', () => {
    const { runtime } = createRuntime({});
    expect(runtime.trySwapGun(1000)).toBe('unavailable');
    expect(runtime.isGunSilenced(1000)).toBe(false);
    expect(runtime.getGunSwapCooldownRatio(1000)).toBe(0);
    expect(runtime.getSystems()).toEqual(NO_SHIP_SYSTEMS);
  });

  test('a swap cycles the gun, keeps it for the run, silences it briefly and then cools down', () => {
    const { runtime, registry } = createRuntime({ gun: 'lance' });
    expect(runtime.isGunSilenced(0)).toBe(false);

    expect(runtime.trySwapGun(1000)).toBe('swapped');
    expect(runtime.getSystems().gun).toBe('scatter');
    expect(getPlayerState(registry).systems.gun).toBe('scatter');

    expect(runtime.isGunSilenced(1000 + GUN_SWAP.fireSilenceMs - 1)).toBe(true);
    expect(runtime.isGunSilenced(1000 + GUN_SWAP.fireSilenceMs)).toBe(false);

    expect(runtime.trySwapGun(1000 + GUN_SWAP.cooldownMs - 1)).toBe('cooling');
    expect(runtime.getSystems().gun).toBe('scatter');
    expect(runtime.trySwapGun(1000 + GUN_SWAP.cooldownMs)).toBe('swapped');
    expect(runtime.getSystems().gun).toBe('seekers');
  });

  test('a gun changed from the pause panel pays the same swap cost', () => {
    const { runtime } = createRuntime({ gun: 'seekers', support: 'magnet' });
    runtime.cycleSystem('support', 500);
    expect(runtime.isGunSilenced(500)).toBe(false);
    runtime.cycleSystem('gun', 500);
    expect(runtime.getSystems().gun).toBe('lance');
    expect(runtime.isGunSilenced(500)).toBe(true);
    expect(runtime.trySwapGun(600)).toBe('cooling');
  });

  test('switching support to Wingman launches the drone and switching away removes it', () => {
    const { runtime, drones } = createRuntime({ gun: 'lance', support: 'surgeCore' });
    expect(drones).toHaveLength(0);
    runtime.cycleSystem('support', 0);
    expect(runtime.getSystems().support).toBe('wingman');
    expect(drones).toHaveLength(1);
    runtime.cycleSystem('support', 0);
    expect(runtime.getSystems().support).toBe('magnet');
    expect(drones[0].destroyed).toBe(true);
  });

  test('switching away from Magnet lets go of the pickups it was pulling', () => {
    const { runtime, pickup } = createRuntime({ support: 'magnet' });
    runtime.update();
    expect(pickup.velocity[1]).toBeGreaterThan(60);
    runtime.cycleSystem('support', 0);
    expect(pickup.velocity).toEqual([0, 60]);
  });
});

function createFrameHarness(systems: Partial<ShipSystems>) {
  const { runtime } = createRuntime(systems);
  const clock = new GameplayClock();
  const shots: number[] = [];
  const feedback: string[] = [];
  const buttonStates: Array<[boolean, number]> = [];
  let swapPressed = false;
  let paused = false;
  let realTime = 0;
  const vector = { x: 0, y: 0 } as GameplayDelegate['shotDirection'];
  const levelConfig = getLevelConfig(3);
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
    mobileControls: { setGunSwapState: (available, ratio) => buttonStates.push([available, ratio]) },
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

describe('gun swap during play', () => {
  test('swapping silences the gun for the swap delay, and a pause does not run it down', () => {
    const harness = createFrameHarness({ gun: 'lance' });
    harness.run(400);
    expect(harness.shots.length).toBeGreaterThan(0);

    harness.pressSwap();
    harness.run(16);
    const swappedAt = harness.clock.now;
    expect(harness.feedback).toEqual(['scatter']);
    const shotsBeforeSilence = harness.shots.length;

    harness.run(200);
    harness.setPaused(true);
    harness.run(5000);
    harness.setPaused(false);
    harness.run(200);
    expect(harness.shots.length).toBe(shotsBeforeSilence);

    harness.run(GUN_SWAP.fireSilenceMs);
    const firstShotAfterSwap = harness.shots[shotsBeforeSilence];
    expect(firstShotAfterSwap - swappedAt).toBeGreaterThanOrEqual(GUN_SWAP.fireSilenceMs);
  });

  test('a second press inside the cooldown is refused quietly and changes nothing', () => {
    const harness = createFrameHarness({ gun: 'scatter' });
    harness.pressSwap();
    harness.run(16);
    harness.run(GUN_SWAP.cooldownMs / 2);
    harness.pressSwap();
    harness.run(16);
    expect(harness.feedback).toEqual(['seekers', 'denied']);
    expect(harness.runtime.getSystems().gun).toBe('seekers');
    const [available, ratio] = harness.buttonStates.at(-1)!;
    expect(available).toBe(true);
    expect(ratio).toBeGreaterThan(0.4);
  });

  test('a press while paused is dropped, not saved for resume', () => {
    const harness = createFrameHarness({ gun: 'lance' });
    harness.setPaused(true);
    harness.pressSwap();
    harness.run(32);
    harness.setPaused(false);
    harness.run(32);
    expect(harness.feedback).toEqual([]);
    expect(harness.runtime.getSystems().gun).toBe('lance');
  });

  test('without a main gun the key does nothing and the touch button stays hidden', () => {
    const harness = createFrameHarness({});
    harness.pressSwap();
    harness.run(400);
    expect(harness.feedback).toEqual([]);
    expect(harness.buttonStates.every(([available]) => !available)).toBe(true);
    expect(harness.shots.length).toBeGreaterThan(0);
  });
});
