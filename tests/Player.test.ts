import { describe, expect, mock, test } from 'bun:test';
import { mockPhaserModule } from './helpers/phaserMock';

mockPhaserModule();

const { Player } = await import('../src/entities/Player');
const { GAME_SCENE_EVENTS } = await import('../src/systems/GameplayFlow');
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

  describe('momentum flight', () => {
    let touchVelocity: { vx: number; vy: number } | null = null;
    const touchCalls: number[] = [];
    const idle = {
      isLeft: () => false,
      isRight: () => false,
      isUp: () => false,
      isDown: () => false,
      getTouchDesiredVelocity: (_x: number, _y: number, generation: number) => {
        touchCalls.push(generation);
        return touchVelocity;
      },
    };
    const right = { ...idle, isRight: () => true };

    function createMomentumPlayer() {
      const velocity = { x: 0, y: 0 };
      const player = Object.create(Player.prototype) as PlayerInstance;
      const record = player as unknown as Record<string, unknown>;
      player.isAlive = true;
      player.rotation = 0;
      player.scene = { events: { emit: mock() } } as never;
      record.body = { velocity };
      record.bank = 0;
      record.dragAnchorGeneration = 0;
      touchVelocity = null;
      touchCalls.length = 0;
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
      player.update(idle as never, 1000 / 60);
      const generationBeforeSpawn = touchCalls.at(-1);
      player.spawn(10, 20);
      expect(player.getBank()).toBe(0);
      setVelocity.mockClear();
      player.update(idle as never, 1000 / 60);
      expect(setVelocity).toHaveBeenCalledWith(0, 0);
      // A held finger must re-anchor to the respawned ship rather than steer it back.
      expect(touchCalls.at(-1)).toBe(generationBeforeSpawn! + 1);
    });

    test('emits full-intensity exhaust behind the ship while moving', () => {
      const { player } = createMomentumPlayer();
      const emit = mock();
      player.scene = { events: { emit } } as never;
      player.x = 100;
      player.y = 200;
      (player as unknown as Record<string, unknown>).exhaustTimer = 0;
      player.update({ ...right, isUp: () => true } as never, 1000 / 60);
      expect(player.isMovingUp).toBe(true);
      expect(emit).toHaveBeenCalledWith(GAME_SCENE_EVENTS.playerExhaust, 100, 220, 1);
    });

    test('opposing inputs cancel and each direction is read once per update', () => {
      const { player, setVelocity } = createMomentumPlayer();
      const input = {
        ...idle,
        isLeft: mock(() => true),
        isRight: mock(() => true),
        isUp: mock(() => true),
        isDown: mock(() => true),
      };
      player.update(input as never, 1000 / 60);
      expect(setVelocity).toHaveBeenCalledWith(0, 0);
      expect(player.isMovingUp).toBe(false);
      for (const direction of [input.isLeft, input.isRight, input.isUp, input.isDown]) {
        expect(direction).toHaveBeenCalledTimes(1);
      }
    });

    test('keyboard steering re-anchors a held touch drag so releasing the key never pulls the ship back', () => {
      const { player } = createMomentumPlayer();
      touchVelocity = { vx: 0, vy: 0 };
      player.update(idle as never, 1000 / 60);
      const anchoredGeneration = touchCalls.at(-1)!;
      for (let i = 0; i < 10; i++) player.update(right as never, 1000 / 60);
      player.update(idle as never, 1000 / 60);
      expect(touchCalls.at(-1)).not.toBe(anchoredGeneration);
    });

    test('keyboard input takes priority over touch drag steering', () => {
      const { player, velocity } = createMomentumPlayer();
      touchVelocity = { vx: -480, vy: 0 };
      player.update(right as never, 1000 / 60);
      const keyboardVx = velocity.x;
      expect(keyboardVx).toBeGreaterThan(0);
      // Inertial thrust: about 0.6 s to swing round to the drag's -480 px/s.
      for (let i = 0; i < 45; i++) player.update(idle as never, 1000 / 60);
      expect(velocity.x).toBeLessThan(-470);
    });
  });
});
