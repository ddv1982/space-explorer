import { describe, expect, mock, test } from 'bun:test';
import { mockPhaserModule } from './helpers/phaserMock';

mockPhaserModule();

const { Player } = await import('../src/entities/Player');
const { GAME_SCENE_EVENTS } = await import('../src/systems/GameplayFlow');
const { PLAYER_CONFIG } = await import('../src/config/playerConfig');
type PlayerInstance = InstanceType<typeof Player>;

describe('Player', () => {
  test('takeDamage consumes a shield, starts invulnerability, and does not reduce hp', () => {
    const setInvulnerable = mock();
    const flashShield = mock();
    const die = mock();

    const player = Object.create(Player.prototype) as PlayerInstance;
    player.shields = 2;
    player.hp = 5;
    player.isAlive = true;
    (player as unknown as Record<string, unknown>).invulnerable = false;
    (player as unknown as Record<string, unknown>).deathStarted = false;
    (player as unknown as Record<string, unknown>).setInvulnerable = setInvulnerable;
    (player as unknown as Record<string, unknown>).flashShield = flashShield;
    (player as unknown as Record<string, unknown>).die = die;

    const outcome = player.takeDamage({ amount: 3, source: 'bomb' });

    expect(outcome).toEqual({ outcome: 'absorbed', source: 'bomb', hullDamage: 0 });
    expect(player.shields).toBe(1);
    expect(player.hp).toBe(5);
    expect(setInvulnerable).toHaveBeenCalledWith(800);
    expect(flashShield).toHaveBeenCalledTimes(1);
    expect(die).not.toHaveBeenCalled();
  });

  test('legacy update emits playerExhaust when exhaust timer elapses and movement is active', () => {
    const emit = mock();
    const setAcceleration = mock();

    const player = Object.create(Player.prototype) as PlayerInstance;
    player.isAlive = true;
    player.x = 100;
    player.y = 200;
    player.rotation = 0;
    player.scene = { events: { emit } } as never;
    player.setAcceleration = setAcceleration as never;
    (player as unknown as Record<string, unknown>).flightMode = 'legacy';
    (player as unknown as Record<string, unknown>).exhaustTimer = 0;
    (player as unknown as Record<string, unknown>).invulnerable = false;

    const inputManager = {
      isLeft: () => false,
      isRight: () => true,
      isUp: () => true,
      isDown: () => false,
    };

    player.update(inputManager as never, 1000 / 60);

    expect(setAcceleration).toHaveBeenCalledWith(
      PLAYER_CONFIG.acceleration * Math.SQRT1_2,
      -PLAYER_CONFIG.acceleration * Math.SQRT1_2
    );
    expect(player.isMovingUp).toBe(true);
    expect(emit).toHaveBeenCalledWith(GAME_SCENE_EVENTS.playerExhaust, 100, 220, 1);
  });

  test('legacy opposing inputs cancel and each direction is consumed once', () => {
    const player = Object.create(Player.prototype) as PlayerInstance;
    player.isAlive = true;
    player.rotation = 0;
    player.scene = { events: { emit: mock() } } as never;
    const setAcceleration = mock();
    player.setAcceleration = setAcceleration as never;
    (player as unknown as Record<string, unknown>).flightMode = 'legacy';
    const input = {
      isLeft: mock(() => true),
      isRight: mock(() => true),
      isUp: mock(() => true),
      isDown: mock(() => true),
    };

    player.update(input as never, 1000 / 60);

    expect(setAcceleration).toHaveBeenCalledWith(0, 0);
    expect(player.isMovingUp).toBe(false);
    for (const direction of Object.values(input)) expect(direction).toHaveBeenCalledTimes(1);
  });

  test('legacy rotation damping is equivalent across frame rates and bounded for long deltas', () => {
    const createPlayer = () => {
      const player = Object.create(Player.prototype) as PlayerInstance;
      player.isAlive = true;
      player.rotation = 0;
      player.scene = { events: { emit: mock() } } as never;
      player.setAcceleration = mock() as never;
      (player as unknown as Record<string, unknown>).flightMode = 'legacy';
      (player as unknown as Record<string, unknown>).exhaustTimer = 10000;
      (player as unknown as Record<string, unknown>).invulnerable = false;
      return player;
    };
    const input = {
      isLeft: () => false,
      isRight: () => true,
      isUp: () => false,
      isDown: () => false,
    };
    const at30 = createPlayer();
    const at120 = createPlayer();

    for (let i = 0; i < 30; i++) at30.update(input as never, 1000 / 30);
    for (let i = 0; i < 120; i++) at120.update(input as never, 1000 / 120);

    expect(at30.rotation).toBeCloseTo(at120.rotation, 10);

    const throttled = createPlayer();
    throttled.update(input as never, 60_000);
    expect(throttled.rotation).toBeGreaterThanOrEqual(0);
    expect(throttled.rotation).toBeLessThanOrEqual(Math.PI / 12);
  });

  describe('momentum flight', () => {
    const idle = { isLeft: () => false, isRight: () => false, isUp: () => false, isDown: () => false };
    const right = { ...idle, isRight: () => true };

    function createMomentumPlayer() {
      const velocity = { x: 0, y: 0 };
      const player = Object.create(Player.prototype) as PlayerInstance;
      const record = player as unknown as Record<string, unknown>;
      player.isAlive = true;
      player.rotation = 0;
      player.scene = { events: { emit: mock() } } as never;
      record.body = { velocity };
      record.flightMode = 'momentum';
      record.bank = 0;
      record.desiredVelocityOverride = null;
      record.exhaustTimer = 10000;
      record.invulnerable = false;
      const setAcceleration = mock();
      const setVelocity = mock((x: number, y: number) => {
        velocity.x = x;
        velocity.y = y;
      });
      player.setAcceleration = setAcceleration as never;
      player.setVelocity = setVelocity as never;
      return { player, velocity, setAcceleration, setVelocity };
    }

    test('sets body velocity from the flight model with zero acceleration', () => {
      const { player, setAcceleration, setVelocity } = createMomentumPlayer();
      player.update(right as never, 1000 / 60);
      expect(setAcceleration).toHaveBeenCalledWith(0, 0);
      const [vx, vy] = setVelocity.mock.calls[0]!;
      expect(vx).toBeGreaterThan(0);
      expect(vx).toBeLessThan(480);
      expect(vy).toBe(0);
      expect(player.getBank()).toBeGreaterThan(0);
    });

    test('glides after release instead of stopping dead', () => {
      const { player, velocity } = createMomentumPlayer();
      for (let i = 0; i < 60; i++) player.update(right as never, 1000 / 60);
      player.update(idle as never, 1000 / 60);
      expect(velocity.x).toBeGreaterThan(300);
    });

    test('paused update with delta 0 leaves velocity and bank unchanged', () => {
      const { player, velocity } = createMomentumPlayer();
      for (let i = 0; i < 10; i++) player.update(right as never, 1000 / 60);
      const before = { vx: velocity.x, vy: velocity.y, bank: player.getBank() };
      player.update(idle as never, 0);
      expect({ vx: velocity.x, vy: velocity.y, bank: player.getBank() }).toEqual(before);
    });

    test('spawn resets bank and drag override so the new ship starts at rest', () => {
      const { player, velocity, setVelocity } = createMomentumPlayer();
      for (let i = 0; i < 30; i++) player.update(right as never, 1000 / 60);
      player.setDesiredVelocityOverride({ vx: 480, vy: 0 });
      const record = player as unknown as Record<string, unknown>;
      record.enableBody = mock();
      record.setVisible = mock();
      record.setAlpha = mock();
      record.setScale = mock();
      record.setAngle = mock();
      record.clearTint = mock();
      (record.body as Record<string, unknown>).stop = () => {
        velocity.x = 0;
        velocity.y = 0;
      };
      player.spawn(10, 20);
      expect(player.getBank()).toBe(0);
      setVelocity.mockClear();
      player.update(idle as never, 1000 / 60);
      expect(setVelocity).toHaveBeenCalledWith(0, 0);
    });

    test('keyboard input takes priority over a touch drag override', () => {
      const { player, velocity } = createMomentumPlayer();
      player.setDesiredVelocityOverride({ vx: -480, vy: 0 });
      player.update(right as never, 1000 / 60);
      const keyboardVx = velocity.x;
      expect(keyboardVx).toBeGreaterThan(0);
      for (let i = 0; i < 30; i++) player.update(idle as never, 1000 / 60);
      expect(velocity.x).toBeLessThan(-400);
    });
  });
});
