import { describe, expect, mock, test } from 'bun:test';
import { mockPhaserModule } from './helpers/phaserMock';
import type { PlayerDamageResult } from '../src/systems/PlayerDamage';

mockPhaserModule();
const { Player } = await import('../src/entities/Player');
const { GAME_SCENE_EVENTS } = await import('../src/systems/GameSceneEvents');

function createPlayer(hp: number, shields = 0) {
  const player: InstanceType<typeof Player> = Object.create(Player.prototype);
  const emitted: Array<{ event: string; result: PlayerDamageResult; alive: boolean; enabled: boolean }> = [];
  const body = { stop: mock(), enable: true };
  const callbacks: Array<() => void> = [];
  Object.assign(player, {
    hp,
    shields,
    isAlive: true,
    deathStarted: false,
    invulnerable: false,
    invulnerableTimer: 0,
    visualFlashToken: 0,
    body,
    scene: {
      events: {
        emit: (event: string, result: PlayerDamageResult) =>
          emitted.push({ event, result, alive: player.isAlive, enabled: body.enable }),
      },
      tweens: { killTweensOf: mock() },
      time: {
        delayedCall: (_delay: number, callback: (...args: unknown[]) => void, args: unknown[], scope: unknown) =>
          callbacks.push(() => callback.apply(scope, args)),
      },
    },
  });
  for (const method of [
    'setAlpha',
    'setScale',
    'setTint',
    'setTintMode',
    'setAngle',
    'setAcceleration',
    'clearTint',
  ] as const) {
    Object.assign(player, { [method]: mock(() => player) });
  }
  return { player, emitted, body, callbacks };
}

describe('player damage facts', () => {
  test('fatal context is emitted synchronously after disabling collision, with actual HP loss and no duplicate death', () => {
    const { player, emitted, body } = createPlayer(0.75);
    const result = player.takeDamage({ amount: 2.5, source: 'bomb' });
    expect(result).toEqual({ outcome: 'fatal', source: 'bomb', hullDamage: 0.75 });
    expect(emitted).toEqual([{ event: GAME_SCENE_EVENTS.playerDeath, result, alive: false, enabled: false }]);
    expect(player.takeDamage({ amount: 10, source: 'beam' })).toEqual({
      outcome: 'ignored',
      source: 'beam',
      hullDamage: 0,
    });
    expect(player.hp).toBe(0);
    expect(emitted).toHaveLength(1);
    expect(body.stop).toHaveBeenCalledTimes(1);
  });

  test('each shield absorbs the whole hit regardless of damage, retaining the 800ms window', () => {
    const { player, emitted } = createPlayer(3, 2);
    expect(player.takeDamage({ amount: 999, source: 'mine' })).toEqual({
      outcome: 'absorbed',
      source: 'mine',
      hullDamage: 0,
    });
    expect(player.shields).toBe(1);
    expect(player.hp).toBe(3);
    expect(player.takeDamage({ amount: 1, source: 'enemy-bullet' }).outcome).toBe('ignored');
    const state = player as unknown as { invulnerableTimer: number; updateInvulnerability(delta: number): void };
    expect(state.invulnerableTimer).toBe(800);
    state.updateInvulnerability(799);
    expect(player.takeDamage({ amount: 1, source: 'asteroid' }).outcome).toBe('ignored');
    state.updateInvulnerability(1);
    expect(player.takeDamage({ amount: 999, source: 'asteroid' }).outcome).toBe('absorbed');
    expect(player.shields).toBe(0);
    expect(emitted).toEqual([]);
  });

  test('fractional hull damage keeps the 1500ms window and unknown debug attribution', () => {
    const { player } = createPlayer(3);
    expect(player.takeDamage({ amount: 0.75, source: 'unknown' })).toEqual({
      outcome: 'damaged',
      source: 'unknown',
      hullDamage: 0.75,
    });
    expect(player.hp).toBe(2.25);
    expect((player as unknown as { invulnerableTimer: number }).invulnerableTimer).toBe(1500);
    expect(player.takeDamage({ amount: 1, source: 'beam' }).outcome).toBe('ignored');
  });
});
