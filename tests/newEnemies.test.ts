import { describe, expect, mock, test } from 'bun:test';
import { mockPhaserModule } from './helpers/phaserMock';

mockPhaserModule();

const { Diver } = await import('../src/entities/enemies/Diver');
const { Dodger } = await import('../src/entities/enemies/Dodger');
const { Sower } = await import('../src/entities/enemies/Sower');
const { Lancer } = await import('../src/entities/enemies/Lancer');
const { Splitter } = await import('../src/entities/enemies/Splitter');
const { Swarmling } = await import('../src/entities/enemies/Swarmling');
const { Mine } = await import('../src/entities/Mine');
const {
  DIVER_DIVE_SPEED,
  DIVER_SPEED,
  DODGER_FIRE_RATE,
  DODGER_STRAFE_FLIP_MS,
  DODGER_STRAFE_SPEED,
  LANCER_FIRE_RATE,
  LANCER_TELEGRAPH_MS,
  MINE_DRIFT_SPEED,
  SOWER_MINE_COOLDOWN,
  SWARMLING_SPEED,
} = await import('../src/utils/constants');

type EntityStub = Record<string, unknown> & {
  spawn: (x: number, y: number) => void;
  updateBehavior: (time: number, delta: number) => void;
  die: () => void;
  takeDamage: (amount: number) => void;
  launch: (x: number, y: number) => void;
};

function stubEntity(prototype: object): EntityStub {
  const entity = Object.create(prototype) as EntityStub;
  entity.setPosition = mock();
  entity.setActive = mock();
  entity.setVisible = mock();
  entity.setVelocity = mock();
  entity.setVelocityX = mock();
  entity.setVelocityY = mock();
  entity.setTint = mock();
  entity.setAlpha = mock();
  entity.clearTint = mock();
  entity.body = null;
  return entity;
}

describe('Diver', () => {
  test('spawn resets to enter phase and descends at cruise speed', () => {
    const diver = stubEntity(Diver.prototype);
    diver.speed = DIVER_SPEED;

    diver.spawn(120, -40);

    expect(diver.phase).toBe('enter');
    expect(diver.startX).toBe(120);
    expect(diver.sineTime).toBe(0);
    expect(diver.diveY).toBe(140);
    expect(diver.setVelocityY).toHaveBeenCalledWith(DIVER_SPEED);
    expect(diver.setVelocityX).toHaveBeenCalledWith(0);
  });

  test('sways on a sine path while entering', () => {
    const diver = stubEntity(Diver.prototype);
    diver.phase = 'enter';
    diver.startX = 100;
    diver.sineTime = 0;
    diver.diveY = 180;
    diver.y = 100;

    diver.updateBehavior(1000, 16);

    expect(diver.phase).toBe('enter');
    expect(diver.x as number).toBeCloseTo(100 + Math.sin(16 * 0.004) * 90, 5);
    expect(diver.sineTime).toBe(16);
  });

  test('transitions to a fast dive once past the dive threshold', () => {
    const diver = stubEntity(Diver.prototype);
    diver.phase = 'enter';
    diver.startX = 100;
    diver.sineTime = 0;
    diver.diveY = 180;
    diver.y = 185;

    diver.updateBehavior(1000, 16);

    expect(diver.phase).toBe('dive');
    expect(diver.setVelocityY).toHaveBeenCalledWith(DIVER_DIVE_SPEED);
  });
});

describe('Dodger', () => {
  test('flips strafe direction after the flip window elapses', () => {
    const dodger = stubEntity(Dodger.prototype);
    dodger.strafeDirection = 1;
    dodger.lastStrafeFlip = 0;
    dodger.lastFireTime = 0;
    dodger.bulletGroup = null;

    dodger.updateBehavior(DODGER_STRAFE_FLIP_MS + 1, 16);

    expect(dodger.strafeDirection).toBe(-1);
    expect(dodger.lastStrafeFlip).toBe(DODGER_STRAFE_FLIP_MS + 1);
    expect(dodger.setVelocityX).toHaveBeenCalledWith(-DODGER_STRAFE_SPEED);
  });

  test('fires a bullet once the fire cooldown elapses', () => {
    const dodger = stubEntity(Dodger.prototype);
    const bullet = { fire: mock() };
    dodger.bulletGroup = {
      getFirstDead: () => bullet,
      get: mock(),
    };
    dodger.strafeDirection = 1;
    dodger.lastStrafeFlip = 0;
    dodger.lastFireTime = 0;
    dodger.x = 50;
    dodger.y = 60;

    dodger.updateBehavior(DODGER_FIRE_RATE + 1, 16);

    expect(bullet.fire).toHaveBeenCalledWith(50, 74);
    expect(dodger.lastFireTime).toBe(DODGER_FIRE_RATE + 1);
  });

  test('holds fire while the cooldown is still running', () => {
    const dodger = stubEntity(Dodger.prototype);
    const bullet = { fire: mock() };
    dodger.bulletGroup = {
      getFirstDead: () => bullet,
      get: mock(),
    };
    dodger.strafeDirection = 1;
    dodger.lastStrafeFlip = 0;
    dodger.lastFireTime = 0;

    dodger.updateBehavior(100, 16);

    expect(bullet.fire).not.toHaveBeenCalled();
  });
});

describe('Sower', () => {
  test('launches a mine once the mine cooldown elapses', () => {
    const sower = stubEntity(Sower.prototype);
    const mine = { launch: mock() };
    sower.mineGroup = {
      getFirstDead: () => mine,
      get: mock(),
    };
    sower.lastMineTime = 0;
    sower.x = 70;
    sower.y = 80;

    sower.updateBehavior(SOWER_MINE_COOLDOWN + 1, 16);

    expect(mine.launch).toHaveBeenCalledWith(70, 94);
    expect(sower.lastMineTime).toBe(SOWER_MINE_COOLDOWN + 1);
  });

  test('does not lay mines without a mine group or during cooldown', () => {
    const sower = stubEntity(Sower.prototype);
    const mine = { launch: mock() };

    sower.mineGroup = null;
    sower.lastMineTime = 0;
    sower.updateBehavior(SOWER_MINE_COOLDOWN + 1, 16);
    expect(mine.launch).not.toHaveBeenCalled();

    sower.mineGroup = {
      getFirstDead: () => mine,
      get: mock(),
    };
    sower.updateBehavior(100, 16);
    expect(mine.launch).not.toHaveBeenCalled();
  });
});

describe('Lancer', () => {
  test('spawn resets the telegraph blink alpha so pooled reuse is fully opaque', () => {
    const lancer = stubEntity(Lancer.prototype);
    lancer.maxHp = 3;
    lancer.speed = 100;

    lancer.spawn(120, -40);

    expect(lancer.phase).toBe('descend');
    expect(lancer.setAlpha).toHaveBeenCalledWith(1);
    expect(lancer.setVelocityY).toHaveBeenCalledWith(100);
  });

  test('stops descending and idles once it reaches its hold position', () => {
    const lancer = stubEntity(Lancer.prototype);
    lancer.phase = 'descend';
    lancer.holdY = 130;
    lancer.y = 140;

    lancer.updateBehavior(500, 16);

    expect(lancer.phase).toBe('idle');
    expect(lancer.cycleStart).toBe(500);
    expect(lancer.setVelocityY).toHaveBeenCalledWith(0);
  });

  test('telegraphs after the fire cycle and clears the telegraph after firing', () => {
    const lancer = stubEntity(Lancer.prototype);
    const bullet = { fireAimed: mock() };
    lancer.bulletGroup = {
      getFirstDead: () => bullet,
      get: mock(),
    };
    lancer.targetProvider = () => ({ x: 200, y: 500 });
    lancer.phase = 'idle';
    lancer.cycleStart = 0;
    lancer.x = 80;
    lancer.y = 120;

    const telegraphAt = LANCER_FIRE_RATE + 1;
    lancer.updateBehavior(telegraphAt, 16);

    expect(lancer.phase).toBe('telegraph');
    expect(lancer.telegraphStart).toBe(telegraphAt);
    expect(lancer.setTint).toHaveBeenCalledWith(0xffd27a);

    const fireAt = telegraphAt + LANCER_TELEGRAPH_MS + 1;
    lancer.updateBehavior(fireAt, 16);

    expect(bullet.fireAimed).toHaveBeenCalledWith(80, 138, 200, 500);
    expect(lancer.clearTint).toHaveBeenCalled();
    expect(lancer.setAlpha).toHaveBeenLastCalledWith(1);
    expect(lancer.phase).toBe('idle');
    expect(lancer.cycleStart).toBe(fireAt);
  });

  test('fires straight down when no target provider is available', () => {
    const lancer = stubEntity(Lancer.prototype);
    const bullet = { fireAimed: mock() };
    lancer.bulletGroup = {
      getFirstDead: () => bullet,
      get: mock(),
    };
    lancer.targetProvider = null;
    lancer.phase = 'telegraph';
    lancer.telegraphStart = 0;
    lancer.x = 80;
    lancer.y = 120;

    lancer.updateBehavior(LANCER_TELEGRAPH_MS + 1, 16);

    expect(bullet.fireAimed).toHaveBeenCalledWith(80, 138, 80, 520);
  });
});

describe('Splitter', () => {
  test('die triggers the split handler with its position before despawning', () => {
    const splitter = stubEntity(Splitter.prototype);
    const emit = mock();
    const splitHandler = mock();
    splitter.scene = { events: { emit } };
    splitter.active = true;
    splitter.scoreValue = 250;
    splitter.splitHandler = splitHandler;
    splitter.x = 33;
    splitter.y = 44;

    splitter.die();

    expect(splitHandler).toHaveBeenCalledWith(33, 44);
    expect(emit).toHaveBeenCalledTimes(1);
    expect(emit.mock.calls[0]?.[1]).toBe(250);
    expect(emit.mock.calls[0]?.[2]).toBe(33);
    expect(emit.mock.calls[0]?.[3]).toBe(44);
    expect(splitter.setActive).toHaveBeenCalledWith(false);
  });

  test('does not split again once already inactive', () => {
    const splitter = stubEntity(Splitter.prototype);
    const splitHandler = mock();
    splitter.scene = { events: { emit: mock() } };
    splitter.active = false;
    splitter.scoreValue = 250;
    splitter.splitHandler = splitHandler;
    splitter.x = 33;
    splitter.y = 44;

    splitter.die();

    expect(splitHandler).not.toHaveBeenCalled();
  });
});

describe('Swarmling', () => {
  test('spawn rushes downward at swarmling speed', () => {
    const swarmling = stubEntity(Swarmling.prototype);
    swarmling.speed = SWARMLING_SPEED;

    swarmling.spawn(60, -20);

    expect(swarmling.wobbleAngle).toBe(0);
    expect(swarmling.angularSpeed).toBe(-4);
    expect(swarmling.setVelocityY).toHaveBeenCalledWith(SWARMLING_SPEED);
  });

  test('wobbles sideways while keeping its dive speed', () => {
    const swarmling = stubEntity(Swarmling.prototype);
    swarmling.speed = SWARMLING_SPEED;
    swarmling.angularSpeed = 4;
    swarmling.wobbleAngle = 0;

    swarmling.updateBehavior(1000, 16);

    expect(swarmling.wobbleAngle as number).toBeCloseTo(0.064, 5);
    expect(swarmling.setVelocityY).toHaveBeenCalledWith(SWARMLING_SPEED);
    expect(swarmling.setVelocityX).toHaveBeenCalledWith(Math.sin(0.064) * 140);
  });
});

describe('Mine', () => {
  test('launch resets hp and starts the downward drift', () => {
    const mine = stubEntity(Mine.prototype);

    mine.launch(10, 20);

    expect(mine.hp).toBe(1);
    expect(mine.driftPhase).toBe(0);
    expect(mine.setPosition).toHaveBeenCalledWith(10, 20);
    expect(mine.setVelocityY).toHaveBeenCalledWith(MINE_DRIFT_SPEED);
  });

  test('takeDamage destroys the mine at zero hp', () => {
    const mine = stubEntity(Mine.prototype);
    mine.hp = 1;

    mine.takeDamage(1);

    expect(mine.hp).toBe(0);
    expect(mine.setActive).toHaveBeenCalledWith(false);
    expect(mine.setVisible).toHaveBeenCalledWith(false);
  });

  test('takeDamage above zero hp keeps the mine alive', () => {
    const mine = stubEntity(Mine.prototype);
    mine.hp = 2;

    mine.takeDamage(1);

    expect(mine.hp).toBe(1);
    expect(mine.setActive).not.toHaveBeenCalled();
  });
});
