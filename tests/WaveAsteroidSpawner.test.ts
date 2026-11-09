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
    getViewportBounds: () => ({ left: 0, width: 800, centerX: 400, height: 600 }),
    getViewportLayout: () => ({ left: 0, width: 800, centerX: 400 }),
    getGameplayBounds: () => ({
      width: 1280,
      centerX: 640,
      left: 0,
      top: 0,
      height: 720,
      right: 1280,
      bottom: 720,
      centerY: 360,
    }),
    getActiveGameplayBounds: () => ({
      width: 1280,
      centerX: 640,
      left: 0,
      top: 0,
      height: 720,
      right: 1280,
      bottom: 720,
      centerY: 360,
    }),
    centerHorizontally: (layout: { left: number; width: number }, width: number) =>
      layout.left + (layout.width - width) / 2,
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
    get: (): null => null,
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

    const skippedTimestamp = helper.spawnAsteroids(600, null, { asteroidInterval: 500 } as never, 200);
    expect(skippedTimestamp).toBe(200);
    expect(spawnCalls).toHaveLength(0);

    const spawnedTimestamp = helper.spawnAsteroids(1000, null, { asteroidInterval: 500 } as never, 200);

    expect(spawnedTimestamp).toBe(1000);
    expect(spawnCalls).toHaveLength(1);
    expect(spawnCalls[0]).toEqual({
      x: 20,
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

    // Both walls run from the 190 px corridor out to the screen edges with no ship-sized hole.
    const left = spawnCalls.filter((call) => call.x < 400).map((call) => call.x);
    const right = spawnCalls.filter((call) => call.x > 400).map((call) => call.x);
    expect(left.length).toBeGreaterThanOrEqual(4);
    expect(right.length).toBeGreaterThanOrEqual(4);
    expect(Math.min(...left)).toBeLessThan(40);
    expect(Math.max(...right)).toBeGreaterThan(760);
    // The corridor itself (which drifts a little each trigger) stays open.
    expect(Math.min(...right) - Math.max(...left)).toBeGreaterThanOrEqual(190 + 60);
    for (const wall of [left, right]) {
      const sorted = [...wall].sort((a, b) => a - b);
      for (let index = 1; index < sorted.length; index++) {
        // Smallest corridor rock (scale 1.7) has a 68 px round hitbox; holes stay under the ship's 24 px.
        expect(sorted[index]! - sorted[index - 1]! - 68).toBeLessThan(24);
      }
    }
    for (const call of spawnCalls) {
      expect(call.y).toBe(-50);
      expect(call.config.destroyOnPlayerImpact).toBe(false);
      expect(call.config.indestructible).toBe(true);
      expect(call.config.scoreValue).toBe(0);
      expect(call.config.collisionDamage).toBe(3);
      expect(call.config.blocksEnemyProjectiles).toBe(false);
    }
  });

  test('spawnEdgeAsteroids can mark corridor asteroids as breakable projectile-blocking cover', () => {
    const { helper, spawnCalls } = createHarness();

    helper.spawnEdgeAsteroids({
      type: 'rock-corridor',
      laneCount: 1,
      corridorWidth: 210,
      damage: 1,
      blocksEnemyProjectiles: true,
      coverHp: 5,
      coverIndestructible: false,
    });

    expect(spawnCalls.length).toBeGreaterThanOrEqual(2);
    for (const call of spawnCalls) {
      expect(call.config.blocksEnemyProjectiles).toBe(true);
      expect(call.config.hp).toBe(5);
      expect(call.config.indestructible).toBe(false);
    }
  });

  test('ring crossfire rocks angle inward and cross in the ship row', () => {
    const { helper, spawnCalls } = createHarness();

    helper.spawnMirroredAsteroids(100, 140);

    expect(spawnCalls).toHaveLength(2);
    for (const call of spawnCalls) {
      const velocityX = call.config.velocityX as number;
      // Reaches the centre line after falling to 75% of the 600 px screen.
      const secondsToRow = (600 * 0.75 + 50) / call.speed;
      expect(call.x + velocityX * secondsToRow).toBeCloseTo(400, 6);
    }
  });
});
