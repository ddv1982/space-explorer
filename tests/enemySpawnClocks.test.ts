import { describe, expect, mock, test } from 'bun:test';
import { mockPhaserModule } from './helpers/phaserMock';

mockPhaserModule();

const { Fighter } = await import('../src/entities/enemies/Fighter');
const { Gunship } = await import('../src/entities/enemies/Gunship');
const { Bomber } = await import('../src/entities/enemies/Bomber');
const { Dodger } = await import('../src/entities/enemies/Dodger');
const { Sower } = await import('../src/entities/enemies/Sower');
const { EnemyBase } = await import('../src/entities/enemies/EnemyBase');
const {
  BOMBER_BOMB_COOLDOWN,
  DODGER_FIRE_RATE,
  DODGER_STRAFE_FLIP_MS,
  FIGHTER_FIRE_RATE,
  GUNSHIP_FIRE_RATE,
  SOWER_MINE_COOLDOWN,
} = await import('../src/utils/constants');

type TimedEnemy = Record<string, unknown> & {
  active: boolean;
  despawn: () => void;
  preUpdate: (time: number, delta: number) => void;
  spawn: (x: number, y: number) => void;
};

class ClockProbeEnemy extends EnemyBase {
  updateBehavior(): void {}

  readGameplayTime(): number {
    return this.getGameplayTime();
  }
}

function createEnemy(prototype: object, world = { isPaused: false }): TimedEnemy {
  const enemy = Object.create(prototype) as TimedEnemy;
  Object.assign(enemy, {
    active: false,
    body: null,
    clearTint: mock(),
    despawnOffscreen: false,
    scene: {
      physics: { world },
      cameras: { main: { height: 720 } },
      time: { now: 80_000 },
    },
    setActive(active: boolean) {
      this.active = active;
      return this;
    },
    setAlpha: mock(),
    setPosition: mock(),
    setTint: mock(),
    setVelocity: mock(),
    setVelocityX: mock(),
    setVelocityY: mock(),
    setVisible: mock(),
  });
  return enemy;
}

function expectFullFirstCooldown(
  enemy: TimedEnemy,
  cooldown: number,
  action: ReturnType<typeof mock>,
  rawSpawnTime = 50_000
): void {
  enemy.preUpdate(rawSpawnTime, 16);
  expect(action).not.toHaveBeenCalled();

  enemy.preUpdate(rawSpawnTime + cooldown - 16, cooldown - 16);
  expect(action).not.toHaveBeenCalled();

  enemy.preUpdate(rawSpawnTime + cooldown - 15, 1);
  expect(action).toHaveBeenCalled();
}

describe('spawn-relative enemy clocks', () => {
  test('starts at zero before first update and ignores invalid deltas', () => {
    const enemy = createEnemy(ClockProbeEnemy.prototype) as TimedEnemy & {
      readGameplayTime: () => number;
    };
    enemy.maxHp = 1;
    enemy.spawn(80, -40);

    expect(enemy.readGameplayTime()).toBe(0);
    enemy.preUpdate(80_000, Number.NaN);
    enemy.preUpdate(90_000, -20);
    expect(enemy.readGameplayTime()).toBe(0);
    enemy.preUpdate(100_000, 16);
    expect(enemy.readGameplayTime()).toBe(16);
  });

  test('late-spawned Fighter waits its full first fire cooldown', () => {
    const enemy = createEnemy(Fighter.prototype);
    const fire = mock();
    enemy.bulletGroup = { getFirstDead: () => ({ fire }), get: mock() };
    enemy.fireCooldown = FIGHTER_FIRE_RATE;
    enemy.maxHp = 2;
    enemy.speed = 110;

    enemy.spawn(80, -40);
    expectFullFirstCooldown(enemy, FIGHTER_FIRE_RATE, fire);
  });

  test('late-spawned Gunship waits its full first spread cooldown', () => {
    const enemy = createEnemy(Gunship.prototype);
    const fire = mock();
    enemy.bulletGroup = { getFirstDead: () => ({ fire, setVelocity: mock() }), get: mock() };
    enemy.fireCooldown = GUNSHIP_FIRE_RATE;
    enemy.maxHp = 5;
    enemy.speed = 65;

    enemy.spawn(80, -40);
    expectFullFirstCooldown(enemy, GUNSHIP_FIRE_RATE, fire);
  });

  test('late-spawned Bomber waits its full first bomb cooldown', () => {
    const enemy = createEnemy(Bomber.prototype);
    const drop = mock();
    enemy.bombGroup = { getFirstDead: () => ({ drop }), get: mock() };
    enemy.bombCooldown = BOMBER_BOMB_COOLDOWN;
    enemy.maxHp = 3;
    enemy.speed = 80;

    enemy.spawn(80, -40);
    expectFullFirstCooldown(enemy, BOMBER_BOMB_COOLDOWN, drop);
  });

  test('late-spawned Sower waits its full first mine cooldown', () => {
    const enemy = createEnemy(Sower.prototype);
    const launch = mock();
    enemy.mineGroup = { getFirstDead: () => ({ launch }), get: mock() };
    enemy.maxHp = 4;
    enemy.speed = 72;

    enemy.spawn(80, -40);
    expectFullFirstCooldown(enemy, SOWER_MINE_COOLDOWN, launch);
  });

  test('Dodger preserves both initial strafe and fire read windows', () => {
    const enemy = createEnemy(Dodger.prototype);
    const fire = mock();
    const setVelocityX = enemy.setVelocityX as ReturnType<typeof mock>;
    enemy.bulletGroup = { getFirstDead: () => ({ fire }), get: mock() };
    enemy.maxHp = 2;
    enemy.speed = 135;

    enemy.spawn(80, -40);
    const initialDirection = enemy.strafeDirection;
    setVelocityX.mockClear();
    enemy.preUpdate(50_000, 16);
    enemy.preUpdate(50_000 + DODGER_STRAFE_FLIP_MS, DODGER_STRAFE_FLIP_MS - 16);
    expect(enemy.strafeDirection).toBe(initialDirection);
    expect(setVelocityX).not.toHaveBeenCalled();

    enemy.preUpdate(50_001 + DODGER_STRAFE_FLIP_MS, 1);
    expect(enemy.strafeDirection).toBe(-(initialDirection as number));
    expect(fire).not.toHaveBeenCalled();

    enemy.preUpdate(50_000 + DODGER_FIRE_RATE, DODGER_FIRE_RATE - DODGER_STRAFE_FLIP_MS - 1);
    expect(fire).not.toHaveBeenCalled();
    enemy.preUpdate(50_001 + DODGER_FIRE_RATE, 1);
    expect(fire).toHaveBeenCalledTimes(1);
  });

  test('pause before the first update cannot consume a Fighter cooldown', () => {
    const world = { isPaused: false };
    const enemy = createEnemy(Fighter.prototype, world);
    const fire = mock();
    enemy.bulletGroup = { getFirstDead: () => ({ fire }), get: mock() };
    enemy.fireCooldown = FIGHTER_FIRE_RATE;
    enemy.maxHp = 2;
    enemy.speed = 110;
    enemy.spawn(80, -40);

    world.isPaused = true;
    enemy.preUpdate(90_000, 90_000);
    world.isPaused = false;
    enemy.preUpdate(90_000 + FIGHTER_FIRE_RATE, FIGHTER_FIRE_RATE);
    expect(fire).not.toHaveBeenCalled();
    enemy.preUpdate(90_001 + FIGHTER_FIRE_RATE, 1);
    expect(fire).toHaveBeenCalledTimes(1);
  });

  test('pause during a Sower cooldown cannot consume the remaining window', () => {
    const world = { isPaused: false };
    const enemy = createEnemy(Sower.prototype, world);
    const launch = mock();
    enemy.mineGroup = { getFirstDead: () => ({ launch }), get: mock() };
    enemy.maxHp = 4;
    enemy.speed = 72;
    enemy.spawn(80, -40);

    enemy.preUpdate(10_000, SOWER_MINE_COOLDOWN - 1);
    world.isPaused = true;
    enemy.preUpdate(80_000, 70_000);
    world.isPaused = false;
    enemy.preUpdate(80_001, 1);
    expect(launch).not.toHaveBeenCalled();
    enemy.preUpdate(80_002, 1);
    expect(launch).toHaveBeenCalledTimes(1);
  });

  test('pooled Fighter reuse restarts the complete first-fire window', () => {
    const enemy = createEnemy(Fighter.prototype);
    const fire = mock();
    enemy.bulletGroup = { getFirstDead: () => ({ fire }), get: mock() };
    enemy.fireCooldown = FIGHTER_FIRE_RATE;
    enemy.maxHp = 2;
    enemy.speed = 110;
    enemy.spawn(80, -40);
    enemy.preUpdate(10_000, FIGHTER_FIRE_RATE + 1);
    expect(fire).toHaveBeenCalledTimes(1);

    enemy.despawn();
    enemy.spawn(120, -40);
    fire.mockClear();
    expectFullFirstCooldown(enemy, FIGHTER_FIRE_RATE, fire, 100_000);
    expect(fire).toHaveBeenCalledTimes(1);
  });
});
