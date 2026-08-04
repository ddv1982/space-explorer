import { describe, expect, mock, test } from 'bun:test';
import { mockPhaserModule } from './helpers/phaserMock';

mockPhaserModule();

mock.module('../src/systems/AudioManager', () => ({
  audioManager: {
    playLaser: () => {},
    setMusicIntensity: () => {},
  },
}));

const { PLAYER_CONFIG } = await import('../src/config/playerConfig');
const {
  isMaxChainMultiplier,
  OVERDRIVE_COOLDOWN_SCALE,
  resolvePlayerFireCooldownMs,
} = await import('../src/systems/chainOverdrive');
const { CHAIN_MAX_MULTIPLIER, ScoreManager } = await import('../src/systems/ScoreManager');
const { getLevelConfig } = await import('../src/config/LevelsConfig');
const { createGameSceneGameplayFrameBehavior } = await import(
  '../src/scenes/gameScene/gameplayFrameBehavior'
);

describe('resolvePlayerFireCooldownMs', () => {
  test('leaves the cooldown untouched below the max chain multiplier', () => {
    expect(resolvePlayerFireCooldownMs(150, 1)).toBe(150);
    expect(resolvePlayerFireCooldownMs(150, CHAIN_MAX_MULTIPLIER - 1)).toBe(150);
  });

  test('tightens the cooldown by about fifteen percent exactly at the x5 cap', () => {
    expect(OVERDRIVE_COOLDOWN_SCALE).toBe(0.85);
    expect(CHAIN_MAX_MULTIPLIER).toBe(5);
    expect(resolvePlayerFireCooldownMs(150, CHAIN_MAX_MULTIPLIER)).toBe(127.5);
    expect(resolvePlayerFireCooldownMs(100, CHAIN_MAX_MULTIPLIER)).toBe(85);
  });

  test('retains the existing absolute minimum safeguard at the floor', () => {
    expect(PLAYER_CONFIG.absoluteMinFireRate).toBe(40);
    expect(resolvePlayerFireCooldownMs(45, CHAIN_MAX_MULTIPLIER)).toBe(40);
    expect(resolvePlayerFireCooldownMs(40, CHAIN_MAX_MULTIPLIER)).toBe(40);
  });

  test('isMaxChainMultiplier matches the cap boundary', () => {
    expect(isMaxChainMultiplier(4)).toBe(false);
    expect(isMaxChainMultiplier(5)).toBe(true);
  });
});

describe('ScoreManager overdrive chain state', () => {
  test('reports the max multiplier that drives overdrive once the chain tops out', () => {
    const scoreManager = new ScoreManager();

    for (let i = 0; i < 32; i++) {
      scoreManager.registerKill(100, 1000 + i * 50);
    }

    const state = scoreManager.getChainState(1000 + 31 * 50);
    expect(state.multiplier).toBe(CHAIN_MAX_MULTIPLIER);
    expect(isMaxChainMultiplier(state.multiplier)).toBe(true);

    // The benefit must drop with the chain: after the window lapses the
    // multiplier falls back to one and the cooldown returns to normal.
    const decayed = scoreManager.getChainState(1000 + 31 * 50 + 2600);
    expect(decayed.multiplier).toBe(1);
    expect(isMaxChainMultiplier(decayed.multiplier)).toBe(false);
  });
});

type GameplayDelegate = Parameters<typeof createGameSceneGameplayFrameBehavior>[0];

function createFiringHarness(chainMultiplier: number) {
  const levelConfig = getLevelConfig(1);
  const firedAt: number[] = [];
  let lastFireTime = 0;

  const vector = { x: 0, y: 0 } as GameplayDelegate['shotDirection'];
  const delegate: GameplayDelegate = {
    inputManager: {
      consumePauseToggleRequest: () => false,
      isFiring: () => true,
    },
    pauseStateController: null,
    flow: {
      isGameplayLocked: () => false,
      sampleRespawnTransitionFrame: () => {},
      isTerminalTransitionActive: () => false,
    },
    parallax: {
      update: () => {},
      setSectionAtmosphere: () => {},
    },
    player: {
      isAlive: true,
      fireRate: 100,
      getFireDirection: (out) => out,
      getMuzzlePosition: (_distance, out) => out,
      update: () => {},
    },
    getLastLifeHelperWing: () => null,
    getPicketTurrets: () => null,
    grazeSurge: { update: () => {} },
    waveManager: {
      update: () => {},
      updateBossAdds: () => {},
    },
    levelManager: {
      progress: 0,
      hasBossSpawned: () => false,
      isComplete: () => false,
      update: () => {},
      getLevelConfig: () => levelConfig,
      shouldSpawnBoss: () => false,
    },
    scoreManager: {
      getChainState: () => ({ chain: 40, multiplier: chainMultiplier }),
    },
    events: { emit: () => {} },
    hud: { updateBossHp: () => {}, updateBossGuard: () => {} },
    bulletPool: {
      fire: () => {
        firedAt.push(lastFireTime);
      },
    },
    effectsManager: { createMuzzleFlash: () => {} },
    getBoss: () => null,
    getLastFireTime: () => lastFireTime,
    setLastFireTime: (nextTime) => {
      lastFireTime = nextTime;
    },
    shotDirection: vector,
    shotOrigin: { ...vector } as GameplayDelegate['shotOrigin'],
    muzzleFlashOrigin: { ...vector } as GameplayDelegate['muzzleFlashOrigin'],
  };

  return {
    behavior: createGameSceneGameplayFrameBehavior(delegate),
    firedAt,
  };
}

describe('max-chain Overdrive firing cadence', () => {
  test('fires on the tightened cooldown while the chain sits at x5', () => {
    const harness = createFiringHarness(CHAIN_MAX_MULTIPLIER);

    harness.behavior.updateGameplayFrame(101, 16);
    expect(harness.firedAt).toEqual([101]);

    // The full 100ms cooldown would still be blocking here.
    harness.behavior.updateGameplayFrame(187, 16);
    expect(harness.firedAt).toEqual([101, 187]);

    // 187 + 85 = 272 is still inside the tightened gate; the next shot lands at 273.
    harness.behavior.updateGameplayFrame(272, 16);
    expect(harness.firedAt).toEqual([101, 187]);

    harness.behavior.updateGameplayFrame(273, 16);
    expect(harness.firedAt).toEqual([101, 187, 273]);
  });

  test('keeps the standard cooldown one tier below the cap', () => {
    const harness = createFiringHarness(CHAIN_MAX_MULTIPLIER - 1);

    harness.behavior.updateGameplayFrame(101, 16);
    expect(harness.firedAt).toEqual([101]);

    harness.behavior.updateGameplayFrame(187, 16);
    expect(harness.firedAt).toEqual([101]);

    harness.behavior.updateGameplayFrame(201, 16);
    expect(harness.firedAt).toEqual([101]);

    harness.behavior.updateGameplayFrame(202, 16);
    expect(harness.firedAt).toEqual([101, 202]);
  });
});
