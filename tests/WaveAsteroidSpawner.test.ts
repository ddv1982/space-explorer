import { describe, expect, mock, test } from 'bun:test';

mock.module('phaser', () => {
  return {
    default: {
      Math: {
        Between: (min: number, _max: number) => min,
        Clamp: (value: number, min: number, max: number) => Math.max(min, Math.min(max, value)),
      },
    },
  };
});

mock.module('../src/utils/layout', () => {
  return {
    getViewportBounds: () => ({ width: 800, centerX: 400 }),
    getViewportLayout: () => ({ left: 0, width: 800, centerX: 400 }),
    getGameplayBounds: () => ({ width: 1280, centerX: 640, left: 0, top: 0, height: 720, right: 1280, bottom: 720, centerY: 360 }),
    getActiveGameplayBounds: () => ({ width: 1280, centerX: 640, left: 0, top: 0, height: 720, right: 1280, bottom: 720, centerY: 360 }),
    centerHorizontally: (layout: { left: number; width: number }, width: number) => layout.left + (layout.width - width) / 2,
  };
});

const { WaveAsteroidSpawner } = await import('../src/systems/wave/WaveAsteroidSpawner');

type SpawnCall = {
  x: number;
  y: number;
  speed: number;
  config: Record<string, unknown>;
};

function createHarness() {
  const spawnCalls: SpawnCall[] = [];
  const pooledAsteroid = {
    spawn: (x: number, y: number, speed: number, config: Record<string, unknown>) => {
      spawnCalls.push({ x, y, speed, config });
    },
  };

  const group = {
    getFirstDead: () => pooledAsteroid,
    get: () => null,
  };

  const helper = new WaveAsteroidSpawner({} as never, group as never);

  return {
    helper,
    spawnCalls,
  };
}

describe('WaveAsteroidSpawner', () => {
  test('spawnAsteroids keeps interval gating and returns updated timestamp', () => {
    const { helper, spawnCalls } = createHarness();

    const skippedTimestamp = helper.spawnAsteroids(
      600,
      null,
      { asteroidInterval: 500 } as never,
      200
    );
    expect(skippedTimestamp).toBe(200);
    expect(spawnCalls).toHaveLength(0);

    const spawnedTimestamp = helper.spawnAsteroids(
      1000,
      null,
      { asteroidInterval: 500 } as never,
      200
    );

    expect(spawnedTimestamp).toBe(1000);
    expect(spawnCalls).toHaveLength(1);
    expect(spawnCalls[0]).toEqual({
      x: 50,
      y: -50,
      speed: 60,
      config: {},
    });
  });

  test('spawnEdgeAsteroids applies corridor asteroid config', () => {
    const { helper, spawnCalls } = createHarness();

    helper.spawnEdgeAsteroids({
      type: 'rock-corridor',
      laneCount: 2,
      corridorWidth: 190,
      damage: 3,
    });

    expect(spawnCalls).toHaveLength(4);
    for (const call of spawnCalls) {
      expect(call.y).toBe(-50);
      expect(call.config.destroyOnPlayerImpact).toBe(false);
      expect(call.config.indestructible).toBe(true);
      expect(call.config.scoreValue).toBe(0);
      expect(call.config.collisionDamage).toBe(3);
    }
  });
});
