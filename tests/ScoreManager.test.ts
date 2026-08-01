import { describe, expect, test } from 'bun:test';

const { ScoreManager } = await import('../src/systems/ScoreManager');

describe('ScoreManager chain multiplier', () => {
  test('awards base score while the chain is below the first tier', () => {
    const scoreManager = new ScoreManager();

    expect(scoreManager.registerKill(100, 1000)).toBe(100);
    expect(scoreManager.getScore()).toBe(100);
    expect(scoreManager.getChainState(1000)).toEqual({ chain: 1, multiplier: 1 });
  });

  test('multiplies awards once the chain crosses a tier', () => {
    const scoreManager = new ScoreManager();

    for (let i = 0; i < 7; i++) {
      expect(scoreManager.registerKill(100, 1000 + i * 100)).toBe(100);
    }

    expect(scoreManager.registerKill(100, 1700)).toBe(200);
    expect(scoreManager.getChainState(1700)).toEqual({ chain: 8, multiplier: 2 });
    expect(scoreManager.getScore()).toBe(900);
  });

  test('decays the chain after the window and restarts at one', () => {
    const scoreManager = new ScoreManager();

    for (let i = 0; i < 8; i++) {
      scoreManager.registerKill(100, 1000 + i * 100);
    }

    expect(scoreManager.getChainState(1000 + 700 + 2501)).toEqual({ chain: 0, multiplier: 1 });
    expect(scoreManager.registerKill(100, 4300)).toBe(100);
    expect(scoreManager.getChainState(4300)).toEqual({ chain: 1, multiplier: 1 });
  });

  test('halves the chain on player hit and clears it on death', () => {
    const scoreManager = new ScoreManager();

    for (let i = 0; i < 9; i++) {
      scoreManager.registerKill(100, 1000 + i * 100);
    }

    scoreManager.onPlayerHit();
    expect(scoreManager.getChainState(1900)).toEqual({ chain: 4, multiplier: 1 });

    scoreManager.onPlayerDeath();
    expect(scoreManager.getChainState(1900)).toEqual({ chain: 0, multiplier: 1 });
  });

  test('caps the multiplier at five', () => {
    const scoreManager = new ScoreManager();

    let awarded = 0;
    for (let i = 0; i < 48; i++) {
      awarded = scoreManager.registerKill(100, 1000 + i * 50);
    }

    expect(scoreManager.getChainState(1000 + 47 * 50)).toEqual({ chain: 48, multiplier: 5 });
    expect(awarded).toBe(500);
  });

  test('reset clears score and chain', () => {
    const scoreManager = new ScoreManager();

    scoreManager.registerKill(100, 1000);
    scoreManager.reset();

    expect(scoreManager.getScore()).toBe(0);
    expect(scoreManager.getChainState(1000)).toEqual({ chain: 0, multiplier: 1 });
  });
});
