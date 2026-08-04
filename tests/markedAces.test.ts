import { describe, expect, mock, test } from 'bun:test';
import type { LevelConfig } from '../src/config/levels/types';
import { mockPhaserModule } from './helpers/phaserMock';

mockPhaserModule();

const {
  ACE_ELIGIBLE_TYPES,
  ACE_HP_MULTIPLIER,
  ACE_MAX_LEVEL,
  ACE_MAX_PER_LEVEL,
  ACE_MAX_PER_WAVE,
  ACE_MIN_LEVEL,
  ACE_SCORE_MULTIPLIER,
  ACE_TINT,
  isAceEligibleType,
} = await import('../src/config/aceConfig');
const { LEVELS } = await import('../src/config/levels/registry');
const { EnemyBase } = await import('../src/entities/enemies/EnemyBase');
const { Lancer } = await import('../src/entities/enemies/Lancer');
const { LANCER_FIRE_RATE, LANCER_HP, LANCER_SCORE, LANCER_TELEGRAPH_MS } = await import(
  '../src/utils/constants'
);

type EnemyStub = Record<string, unknown> & {
  hp: number;
  maxHp: number;
  scoreValue: number;
  x: number;
  y: number;
  active: boolean;
  isAce(): boolean;
  markAsAce(): void;
  spawn(x: number, y: number): void;
  despawn(): void;
  die(): void;
  takeDamage(amount: number): void;
  updateBehavior(time: number, delta: number): void;
};

function stubEnemy(prototype: object = EnemyBase.prototype): {
  enemy: EnemyStub;
  emit: ReturnType<typeof mock>;
  setTint: ReturnType<typeof mock>;
  setTintMode: ReturnType<typeof mock>;
  clearTint: ReturnType<typeof mock>;
  scheduled: Array<{ callback: (token: number) => void; args: [number]; scope: unknown }>;
} {
  const scheduled: Array<{ callback: (token: number) => void; args: [number]; scope: unknown }> = [];
  const emit = mock();
  const setTint = mock();
  const setTintMode = mock();
  const clearTint = mock();

  const enemy = Object.create(prototype) as EnemyStub;
  enemy.scene = {
    events: { emit },
    time: {
      delayedCall: (_delay: number, callback: (token: number) => void, args: [number], scope: unknown) => {
        scheduled.push({ callback, args, scope });
      },
    },
  };
  enemy.setPosition = mock();
  enemy.setActive = mock();
  enemy.setVisible = mock();
  enemy.setVelocity = mock();
  enemy.setTint = setTint;
  enemy.setTintMode = setTintMode;
  enemy.clearTint = clearTint;
  enemy.body = null;
  enemy.active = true;
  enemy.visualFlashToken = 0;
  enemy.defeatCount = 0;
  enemy.aceMarked = false;
  enemy.baseMaxHp = null;
  enemy.baseScoreValue = null;

  return { enemy, emit, setTint, setTintMode, clearTint, scheduled };
}

describe('aceConfig', () => {
  test('keeps the approved Marked Ace balance numbers', () => {
    expect(ACE_HP_MULTIPLIER).toBe(2);
    expect(ACE_SCORE_MULTIPLIER).toBe(4);
    expect(ACE_TINT).toBe(0xffd76a);
    expect(ACE_MIN_LEVEL).toBe(5);
    expect(ACE_MAX_LEVEL).toBe(10);
    expect(ACE_MAX_PER_WAVE).toBe(2);
    expect(ACE_MAX_PER_LEVEL).toBe(3);
  });

  test('limits eligibility to durable combat enemies, never popcorn or kamikaze types', () => {
    expect([...ACE_ELIGIBLE_TYPES].sort()).toEqual([
      'bomber',
      'dodger',
      'fighter',
      'gunship',
      'lancer',
      'sower',
      'splitter',
    ]);

    expect(isAceEligibleType('gunship')).toBe(true);
    expect(isAceEligibleType('scout')).toBe(false);
    expect(isAceEligibleType('swarm')).toBe(false);
    expect(isAceEligibleType('swarmling')).toBe(false);
    expect(isAceEligibleType('diver')).toBe(false);
  });
});

function countLevelAces(level: LevelConfig): number {
  return level.sections.reduce((total, section) => {
    const signatureAces = (section.signatureWaves ?? []).reduce(
      (waveTotal, wave) => waveTotal + wave.enemies.filter((enemy) => enemy.ace === true).length,
      0
    );
    const choreographedAces = (section.waves ?? []).reduce(
      (waveTotal, wave) => waveTotal + (wave.aceCount ?? 0),
      0
    );
    return total + signatureAces + choreographedAces;
  }, 0);
}

describe('authored Marked Ace placements', () => {
  test('levels 1-4 author no aces; levels 5-10 each author a sparse, eligible set', () => {
    LEVELS.forEach((level, index) => {
      const levelNumber = index + 1;
      const aceCount = countLevelAces(level);

      if (levelNumber < ACE_MIN_LEVEL) {
        expect(aceCount).toBe(0);
        return;
      }

      expect(aceCount).toBeGreaterThanOrEqual(1);
      expect(aceCount).toBeLessThanOrEqual(ACE_MAX_PER_LEVEL);
    });
  });

  test('every authored ace sits on an eligible type within the per-wave limit', () => {
    for (const level of LEVELS) {
      for (const section of level.sections) {
        for (const wave of section.signatureWaves ?? []) {
          const aces = wave.enemies.filter((enemy) => enemy.ace === true);
          expect(aces.length).toBeLessThanOrEqual(ACE_MAX_PER_WAVE);
          aces.forEach((enemy) => expect(isAceEligibleType(enemy.type)).toBe(true));
        }

        for (const wave of section.waves ?? []) {
          const aceCount = wave.aceCount ?? 0;
          expect(aceCount).toBeLessThanOrEqual(ACE_MAX_PER_WAVE);
          expect(aceCount).toBeLessThanOrEqual(wave.count);
          if (aceCount > 0) {
            expect(isAceEligibleType(wave.type)).toBe(true);
          }
        }
      }
    }
  });

  test('pins the approved per-level ace moments', () => {
    const placements = LEVELS.map((level) => ({
      name: level.name,
      signature: level.sections.flatMap((section) =>
        (section.signatureWaves ?? []).flatMap((wave) =>
          wave.enemies.filter((enemy) => enemy.ace === true).map((enemy) => `${wave.id}:${enemy.type}`)
        )
      ),
      choreographed: level.sections.flatMap((section) =>
        (section.waves ?? [])
          .filter((wave) => (wave.aceCount ?? 0) > 0)
          .map((wave) => `${wave.id}:${wave.type}x${wave.aceCount}`)
      ),
    }));

    expect(placements.slice(4)).toEqual([
      {
        name: 'Shatter Reef',
        signature: ['stalker-priority-check:splitter'],
        choreographed: ['reef-midboss-elite:gunshipx1'],
      },
      {
        name: 'Debris Gauntlet',
        signature: ['shelter-crossfire:gunship'],
        choreographed: ['bulwark-midboss-elite:gunshipx1'],
      },
      {
        name: 'Hollow Choir',
        signature: [],
        choreographed: ['lancer-duel-debut:lancerx1', 'choir-midboss-elite:gunshipx1'],
      },
      {
        name: 'Eclipse Narrows',
        signature: [],
        choreographed: ['muster-vee:fighterx1', 'ark-vanguard-elite:gunshipx1'],
      },
      {
        name: 'Swarmfront',
        signature: [],
        choreographed: ['splitter-pack-one:splitterx1', 'hive-elite-beat:fighterx1'],
      },
      {
        name: 'Eventide Engine',
        signature: ['convergence-final-read:gunship', 'convergence-final-read:gunship'],
        choreographed: ['omega-honor-guard:gunshipx1'],
      },
    ]);
  });
});

describe('EnemyBase Marked Ace state', () => {
  test('markAsAce doubles durability, quadruples score, and applies the gilded multiply tint', () => {
    const { enemy, setTint, setTintMode } = stubEnemy();
    enemy.maxHp = 5;
    enemy.hp = 5;
    enemy.scoreValue = 400;

    enemy.markAsAce();

    expect(enemy.isAce()).toBe(true);
    expect(enemy.maxHp).toBe(10);
    expect(enemy.hp).toBe(10);
    expect(enemy.scoreValue).toBe(1600);
    expect(setTint).toHaveBeenCalledWith(ACE_TINT);
    expect(setTintMode).toHaveBeenCalledWith(0);
  });

  test('markAsAce is idempotent so repeated flags never compound stats', () => {
    const { enemy, setTint } = stubEnemy();
    enemy.maxHp = 2;
    enemy.hp = 2;
    enemy.scoreValue = 250;

    enemy.markAsAce();
    enemy.markAsAce();

    expect(enemy.maxHp).toBe(4);
    expect(enemy.hp).toBe(4);
    expect(enemy.scoreValue).toBe(1000);
    expect(setTint).toHaveBeenCalledTimes(1);
  });

  test('die emits the ace flag with the quadrupled score value', () => {
    const { enemy, emit } = stubEnemy();
    enemy.maxHp = 2;
    enemy.hp = 2;
    enemy.scoreValue = 250;
    enemy.x = 33;
    enemy.y = 44;
    enemy.markAsAce();

    enemy.die();

    expect(emit).toHaveBeenCalledTimes(1);
    expect(emit.mock.calls[0]?.[1]).toBe(1000);
    expect(emit.mock.calls[0]?.[2]).toBe(33);
    expect(emit.mock.calls[0]?.[3]).toBe(44);
    expect(emit.mock.calls[0]?.[4]).toBe(true);
  });

  test('die without an ace mark emits a false ace flag at base score', () => {
    const { enemy, emit } = stubEnemy();
    enemy.scoreValue = 100;
    enemy.x = 1;
    enemy.y = 2;

    enemy.die();

    expect(emit.mock.calls[0]?.[1]).toBe(100);
    expect(emit.mock.calls[0]?.[4]).toBe(false);
  });

  test('spawn restores base stats and clears the ace tint so pooled reuse never leaks', () => {
    const { enemy, clearTint, setTint } = stubEnemy();
    enemy.maxHp = 5;
    enemy.hp = 5;
    enemy.scoreValue = 400;
    enemy.markAsAce();
    enemy.die();

    setTint.mockClear();
    clearTint.mockClear();

    enemy.spawn(120, -40);

    expect(enemy.isAce()).toBe(false);
    expect(enemy.maxHp).toBe(5);
    expect(enemy.hp).toBe(5);
    expect(enemy.scoreValue).toBe(400);
    expect(setTint).not.toHaveBeenCalled();
    expect(clearTint).toHaveBeenCalled();
  });

  test('despawn clears ace state even without a defeat', () => {
    const { enemy, clearTint } = stubEnemy();
    enemy.maxHp = 2;
    enemy.hp = 2;
    enemy.scoreValue = 250;
    enemy.markAsAce();

    enemy.despawn();

    expect(enemy.isAce()).toBe(false);
    expect(enemy.maxHp).toBe(2);
    expect(enemy.scoreValue).toBe(250);
    expect(clearTint).toHaveBeenCalled();
  });

  test('a hit flash on an ace restores the gilded tint instead of clearing it', () => {
    const { enemy, setTint, setTintMode, clearTint, scheduled } = stubEnemy();
    enemy.maxHp = 4;
    enemy.hp = 4;
    enemy.scoreValue = 300;
    enemy.markAsAce();
    setTint.mockClear();

    enemy.takeDamage(1);

    expect(enemy.hp).toBe(7);
    expect(setTint).toHaveBeenCalledWith(0xffffff);
    expect(setTintMode).toHaveBeenCalledWith(1);

    scheduled[0].callback.apply(scheduled[0].scope, scheduled[0].args);

    expect(setTint).toHaveBeenCalledWith(ACE_TINT);
    expect(clearTint).not.toHaveBeenCalled();
  });

  test('a hit flash on a plain enemy still clears the tint', () => {
    const { enemy, setTintMode, clearTint, scheduled } = stubEnemy();
    enemy.hp = 4;

    enemy.takeDamage(1);
    scheduled[0].callback.apply(scheduled[0].scope, scheduled[0].args);

    expect(setTintMode).toHaveBeenCalledWith(1);
    expect(clearTint).toHaveBeenCalledTimes(1);
  });
});

describe('Lancer ace interaction', () => {
  test('an ace lancer returns to its gilded tint after the telegraph instead of clearing it', () => {
    const { enemy, setTint, clearTint } = stubEnemy(Lancer.prototype);
    enemy.maxHp = LANCER_HP;
    enemy.hp = LANCER_HP;
    enemy.scoreValue = LANCER_SCORE;
    enemy.bulletGroup = null;
    enemy.targetProvider = null;
    enemy.phase = 'telegraph';
    enemy.telegraphStart = 0;
    enemy.x = 80;
    enemy.y = 120;
    enemy.setAlpha = mock();
    enemy.markAsAce();
    setTint.mockClear();
    clearTint.mockClear();

    enemy.updateBehavior(LANCER_FIRE_RATE + LANCER_TELEGRAPH_MS + 1, 16);

    expect(setTint).toHaveBeenCalledWith(ACE_TINT);
    expect(clearTint).not.toHaveBeenCalled();
    expect(enemy.phase).toBe('idle');
  });
});
