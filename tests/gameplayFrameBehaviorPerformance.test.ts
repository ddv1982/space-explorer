import { describe, expect, mock, test } from 'bun:test';

const musicIntensities: number[] = [];

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
  audioManager: {
    playLaser: () => {},
    setMusicIntensity: (intensity: number) => {
      musicIntensities.push(intensity);
    },
  },
}));

const { getLevelConfig } = await import('../src/config/LevelsConfig');
const { createGameSceneGameplayFrameBehavior } = await import(
  '../src/scenes/gameScene/gameplayFrameBehavior'
);

type GameplayDelegate = Parameters<typeof createGameSceneGameplayFrameBehavior>[0];

function createHarness(level = 1): {
  behavior: ReturnType<typeof createGameSceneGameplayFrameBehavior>;
  atmosphereCalls: Array<{ sectionId: string | null; progress: number }>;
  setProgress(progress: number): void;
  setBossSpawned(spawned: boolean): void;
} {
  const levelConfig = getLevelConfig(level);
  const atmosphereCalls: Array<{ sectionId: string | null; progress: number }> = [];
  let progress = 0;
  let bossSpawned = false;

  const vector = { x: 0, y: 0 } as GameplayDelegate['shotDirection'];
  const delegate: GameplayDelegate = {
    inputManager: {
      consumePauseToggleRequest: () => false,
      isFiring: () => false,
    },
    pauseStateController: null,
    flow: {
      isGameplayLocked: () => false,
      sampleRespawnTransitionFrame: () => {},
      isTerminalTransitionActive: () => false,
    },
    parallax: {
      update: () => {},
      setSectionAtmosphere: (section, sectionProgress) => {
        atmosphereCalls.push({ sectionId: section?.id ?? null, progress: sectionProgress });
      },
    },
    player: {
      isAlive: true,
      fireRate: 100,
      getFireDirection: (out) => out,
      getMuzzlePosition: (_distance, out) => out,
      update: () => {},
    },
    getLastLifeHelperWing: () => null,
    grazeSurge: { update: () => {} },
    waveManager: {
      update: () => {},
      updateBossAdds: () => {},
    },
    levelManager: {
      get progress() {
        return progress;
      },
      hasBossSpawned: () => bossSpawned,
      isComplete: () => false,
      update: () => {},
      getLevelConfig: () => levelConfig,
      shouldSpawnBoss: () => false,
    },
    events: { emit: () => {} },
    hud: { updateBossHp: () => {} },
    bulletPool: { fire: () => {} },
    effectsManager: { createMuzzleFlash: () => {} },
    getBoss: () => null,
    getLastFireTime: () => 0,
    setLastFireTime: () => {},
    shotDirection: vector,
    shotOrigin: { ...vector } as GameplayDelegate['shotOrigin'],
    muzzleFlashOrigin: { ...vector } as GameplayDelegate['muzzleFlashOrigin'],
  };

  return {
    behavior: createGameSceneGameplayFrameBehavior(delegate),
    atmosphereCalls,
    setProgress: (nextProgress) => {
      progress = nextProgress;
    },
    setBossSpawned: (nextBossSpawned) => {
      bossSpawned = nextBossSpawned;
    },
  };
}

describe('gameplay frame presentation deduplication', () => {
  test('skips exact duplicate presentation work but preserves continuous progress updates', () => {
    musicIntensities.length = 0;
    const harness = createHarness();

    harness.behavior.updateGameplayFrame(0, 16);
    harness.behavior.updateGameplayFrame(16, 16);

    expect(harness.atmosphereCalls).toHaveLength(1);
    expect(musicIntensities).toHaveLength(1);

    harness.setProgress(0.01);
    harness.behavior.updateGameplayFrame(32, 16);

    expect(harness.atmosphereCalls).toHaveLength(2);
    expect(harness.atmosphereCalls[1].progress).toBeGreaterThan(0);
    // The intro's authored tension arc is constant, so its effective music
    // intensity remains unchanged even while its atmosphere progresses.
    expect(musicIntensities).toHaveLength(1);
  });

  test('updates atmosphere across section boundaries and music across boss transitions', () => {
    musicIntensities.length = 0;
    const harness = createHarness();

    harness.behavior.updateGameplayFrame(0, 16);
    const firstSectionId = harness.atmosphereCalls[0].sectionId;

    harness.setProgress(0.3);
    harness.behavior.updateGameplayFrame(16, 16);

    expect(harness.atmosphereCalls.at(-1)?.sectionId).not.toBe(firstSectionId);

    const intensityAtSectionEntry = musicIntensities.at(-1);
    harness.setProgress(0.34);
    harness.behavior.updateGameplayFrame(24, 16);
    expect(musicIntensities.at(-1)).not.toBe(intensityAtSectionEntry);

    harness.setBossSpawned(true);
    harness.behavior.updateGameplayFrame(32, 16);
    harness.behavior.updateGameplayFrame(48, 16);

    expect(musicIntensities.at(-1)).toBe(1.1);
    expect(musicIntensities.filter((intensity) => intensity === 1.1)).toHaveLength(1);

    harness.setBossSpawned(false);
    harness.behavior.updateGameplayFrame(64, 16);

    expect(musicIntensities.at(-1)).not.toBe(1.1);
  });

  test('bounds gradual action-scene music requests while preserving continuous atmosphere', () => {
    musicIntensities.length = 0;
    const harness = createHarness(9);

    for (let frame = 0; frame < 240; frame += 1) {
      harness.setProgress(0.14 + frame * 0.00025);
      harness.behavior.updateGameplayFrame(frame * 16, 16);
    }

    expect(harness.atmosphereCalls).toHaveLength(240);
    expect(musicIntensities.length).toBeGreaterThan(1);
    expect(musicIntensities.length).toBeLessThan(12);
  });
});
