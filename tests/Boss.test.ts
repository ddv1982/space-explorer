import { describe, expect, mock, test } from 'bun:test';
import { mockPhaserModule } from './helpers/phaserMock';
import type { BossAttackConfig, BossConfig, EnemyType } from '../src/config/LevelsConfig';

mockPhaserModule();

const { Boss } = await import('../src/entities/enemies/Boss');
const { BossAttackSchedule, FAST_KILL_BONUS_PER_SECOND } = await import('../src/entities/enemies/boss/attackSchedule');

/** An attack that only summons `id`, so the order of attacks shows up as the order of summons. */
const marker = (id: string, cooldownMs = 1000, extra: Partial<BossAttackConfig> = {}): BossAttackConfig => ({
  cooldownMs,
  volley: [{ kind: 'summon', escorts: [id as EnemyType] }],
  ...extra,
});

const patrol = { kind: 'patrol', speed: 0, edgePadding: 0 } as const;

function createConfig(overrides: Partial<BossConfig> = {}): BossConfig {
  return {
    name: 'Test Bulwark',
    maxHp: 100,
    parSeconds: 60,
    escalatesPastPar: true,
    phaseChangePauseMs: 300,
    phases: [
      { startsAtHull: 1, style: 'bulwark', movement: patrol, attacks: [marker('a'), marker('b')] },
      { startsAtHull: 0.66, style: 'bulwark', movement: patrol, attacks: [marker('c')] },
      { startsAtHull: 0.33, style: 'maelstrom', movement: patrol, attacks: [marker('d')] },
    ],
    ...overrides,
  };
}

/** A spawned boss at the top of an 800x600 screen, with Phaser's rendering calls stubbed out. */
function createBoss(config: BossConfig = createConfig()) {
  const emit = mock();
  const summoned: string[] = [];
  const world = { isPaused: false };
  const boss = Object.create(Boss.prototype) as InstanceType<typeof Boss>;
  Object.assign(boss, {
    active: true,
    x: 400,
    y: 80,
    hp: config.maxHp,
    maxHp: config.maxHp,
    scoreValue: 2000,
    gameplayTime: 0,
    despawnOffscreen: false,
    scene: {
      events: { emit },
      physics: { world },
      scale: { getViewPort: () => ({ x: 0, y: 0, width: 800, height: 600 }) },
      time: { delayedCall: mock() },
    },
    patternUses: new Map(),
    visualRig: { update: mock(), hide: mock() },
    attackRuntime: {
      hasBulletGroup: () => true,
      getPlayer: () => null,
      getPlayerAimAngle: () => 90,
      fireBullet: mock(),
      summonEscorts: (types: string[]) => summoned.push(...types),
      launchBeam: mock(),
    },
    setTexture: mock(),
    setTint: mock(),
    setTintMode: mock(),
    clearTint: mock(),
    setVelocityY: mock(),
    flashPhaseChange: mock(),
    flashShieldImpact: mock(),
  });
  const internals = boss as unknown as { config: BossConfig; resetCombatState(): void; schedule: unknown };
  internals.config = config;
  boss.maxHp = config.maxHp;
  internals.schedule = new BossAttackSchedule(config.parSeconds * 1000, config.escalatesPastPar);
  internals.resetCombatState();
  return { boss, emit, summoned, world };
}

/** Advances the boss's own clock frame by frame, as `EnemyBase.preUpdate` does. */
function play(boss: InstanceType<typeof Boss>, fromMs: number, toMs: number, stepMs = 10): void {
  for (let time = fromMs + stepMs; time <= toMs; time += stepMs) boss.updateBehavior(time, stepMs);
}

describe('Boss fight engine', () => {
  test('waits a full wind-up after arriving before its first volley', () => {
    const { boss, summoned } = createBoss();
    play(boss, 0, 5000);
    // Arrived on the first frame (y is already on the arrival line), so the first volley is one
    // cooldown in, and the rotation then continues in order.
    expect(summoned).toEqual(['a', 'b', 'a', 'b', 'a']);
  });

  test('a late arrival still gets the whole wind-up before the first volley', () => {
    const { boss, summoned } = createBoss();
    boss.y = -60;
    play(boss, 0, 2000);
    expect(summoned).toEqual([]);
    boss.y = 80;
    boss.updateBehavior(2010, 10);
    play(boss, 2010, 2400);
    expect(summoned).toEqual([]);
    play(boss, 2400, 2420);
    expect(summoned).toEqual(['a']);
  });

  test('announces every phase change in order and restarts the rotation after the firing pause', () => {
    const { boss, emit, summoned } = createBoss();
    play(boss, 0, 1000);
    expect(summoned).toEqual(['a']);

    boss.hp = 60;
    play(boss, 1000, 1010);
    expect(boss.phase).toBe(2);
    expect(emit).toHaveBeenLastCalledWith('boss-phase-change', 2);
    // Next volley: 300 ms pause plus the new phase's 1000 ms cooldown.
    play(boss, 1010, 2300);
    expect(summoned).toEqual(['a']);
    play(boss, 2300, 2320);
    expect(summoned).toEqual(['a', 'c']);

    boss.hp = 20;
    play(boss, 2320, 2330);
    expect(boss.phase).toBe(3);
    expect(emit).toHaveBeenLastCalledWith('boss-phase-change', 3);
    expect(boss.setTexture).toHaveBeenLastCalledWith('boss-maelstrom');
  });

  test('the shield is up while a shielded attack charges and drops the moment it fires', () => {
    const config = createConfig({
      phases: [
        {
          startsAtHull: 1,
          style: 'bulwark',
          movement: patrol,
          attacks: [marker('open'), marker('wall', 1000, { shielded: true })],
        },
      ],
    });
    const { boss, summoned } = createBoss(config);
    play(boss, 0, 1000);
    expect(summoned).toEqual(['open']);

    play(boss, 1000, 1500);
    boss.takeDamage(10);
    expect(boss.hp).toBe(100);

    play(boss, 1500, 2010);
    expect(summoned).toEqual(['open', 'wall']);
    boss.takeDamage(10);
    expect(boss.hp).toBe(90);
  });

  test('flies to an anchored attack and only charges once it is there', () => {
    const config = createConfig({
      phases: [
        {
          startsAtHull: 1,
          style: 'bulwark',
          movement: patrol,
          attacks: [marker('flank', 500, { anchor: { x: 0.1, y: 140 } })],
        },
      ],
    });
    const { boss, summoned } = createBoss(config);
    // 320 px to the left and 60 down: about 1.3 s at 260 px/s, then a full 300 ms wind-up.
    play(boss, 0, 1200);
    expect(summoned).toEqual([]);
    play(boss, 1200, 2000);
    expect(summoned).toEqual(['flank']);
    expect(boss.x).toBe(80);
    expect(boss.y).toBe(140);
  });

  test('pause and hit-stop do not advance the fight clock', () => {
    const { boss, world, summoned } = createBoss();
    const step = (time: number, delta: number): void => boss.preUpdate(time, delta);

    step(16, 16);
    world.isPaused = true;
    step(60_000, 59_984);
    world.isPaused = false;
    step(60_016, 16);

    expect((boss as unknown as { gameplayTime: number }).gameplayTime).toBe(32);
    expect(summoned).toEqual([]);
  });

  test('a kill under par reports a bonus for every whole second left', () => {
    const { boss, emit } = createBoss();
    Object.assign(boss, { despawn: mock(), gameplayTime: 41_500 });
    boss.die();
    expect(emit).toHaveBeenCalledWith('boss-death', 2000, 400, 80, 18 * FAST_KILL_BONUS_PER_SECOND);
  });

  test('a kill past par pays nothing extra', () => {
    const { boss, emit } = createBoss();
    Object.assign(boss, { despawn: mock(), gameplayTime: 75_000 });
    boss.die();
    expect(emit).toHaveBeenCalledWith('boss-death', 2000, 400, 80, 0);
  });
});
