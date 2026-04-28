import { describe, expect, mock, test } from 'bun:test';

mock.module('phaser', () => ({
  default: {
    Physics: {
      Arcade: {
        Sprite: class {},
        Body: class {},
      },
    },
    Math: {
      DegToRad: (degrees: number) => (degrees * Math.PI) / 180,
      Linear: (a: number, b: number, t: number) => a + (b - a) * t,
      Vector2: class {
        x = 0;
        y = 0;
        set(x: number, y: number) {
          this.x = x;
          this.y = y;
          return this;
        }
        rotate() {
          return this;
        }
        normalize() {
          return this;
        }
        scale() {
          return this;
        }
      },
    },
  },
}));

const { Player } = await import('../src/entities/Player');
const { GAME_SCENE_EVENTS } = await import('../src/systems/GameplayFlow');

describe('Player', () => {
  test('takeDamage consumes a shield, starts invulnerability, and does not reduce hp', () => {
    const setInvulnerable = mock();
    const flashShield = mock();
    const die = mock();

    const player = Object.create(Player.prototype) as Player;
    player.shields = 2;
    player.hp = 5;
    player.isAlive = true;
    (player as unknown as Record<string, unknown>).invulnerable = false;
    (player as unknown as Record<string, unknown>).deathStarted = false;
    (player as unknown as Record<string, unknown>).setInvulnerable = setInvulnerable;
    (player as unknown as Record<string, unknown>).flashShield = flashShield;
    (player as unknown as Record<string, unknown>).die = die;

    const outcome = player.takeDamage(3);

    expect(outcome).toBe('absorbed');
    expect(player.shields).toBe(1);
    expect(player.hp).toBe(5);
    expect(setInvulnerable).toHaveBeenCalledWith(800);
    expect(flashShield).toHaveBeenCalledTimes(1);
    expect(die).not.toHaveBeenCalled();
  });

  test('update emits playerExhaust when exhaust timer elapses and movement is active', () => {
    const emit = mock();
    const setAcceleration = mock();
    const maxVelocitySet = mock();

    const player = Object.create(Player.prototype) as Player;
    player.isAlive = true;
    player.x = 100;
    player.y = 200;
    player.rotation = 0;
    player.scene = {
      game: { loop: { delta: 16 } },
      events: { emit },
    } as never;
    player.body = { maxVelocity: { set: maxVelocitySet } } as never;
    player.setAcceleration = setAcceleration as never;
    (player as unknown as Record<string, unknown>).exhaustTimer = 0;
    (player as unknown as Record<string, unknown>).invulnerable = false;

    const inputManager = {
      isLeft: () => false,
      isRight: () => true,
      isUp: () => true,
      isDown: () => false,
    };

    player.update(inputManager as never);

    expect(setAcceleration).toHaveBeenCalled();
    expect(maxVelocitySet).toHaveBeenCalled();
    expect(player.isMovingUp).toBe(true);
    expect(emit).toHaveBeenCalledWith(GAME_SCENE_EVENTS.playerExhaust, 100, 220, 1);
  });
});
