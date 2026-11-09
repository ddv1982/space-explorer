import { describe, expect, mock, test } from 'bun:test';

const bloomDestroy = mock();
const addBloom = mock(() => [{ parallelFilters: { destroy: bloomDestroy } }]);

mock.module('phaser', () => ({
  default: {
    Scenes: { Events: { ADDED_TO_SCENE: 'addedtoscene' } },
    Actions: { AddEffectBloom: addBloom },
  },
}));

const { LightingRig } = await import('../src/systems/lighting/LightingRig');
const { resolveLightingBudget } = await import('../src/systems/lighting/lightingBudget');
const { getVisualQualityProfile } = await import('../src/config/visualQuality');

class FakeLight {
  x = 0;
  y = 0;
  radius = 0;
  color = 0;
  intensity = 0;
  setPosition(x: number, y: number) {
    this.x = x;
    this.y = y;
    return this;
  }
  setRadius(radius: number) {
    this.radius = radius;
    return this;
  }
  setColor(color: number) {
    this.color = color;
    return this;
  }
  setIntensity(intensity: number) {
    this.intensity = intensity;
    return this;
  }
}

function litSprite(hasNormalMap: boolean) {
  return { texture: { dataSource: hasNormalMap ? [{}] : [] }, setLighting: mock() };
}

function createScene(children: unknown[] = []) {
  const lights: FakeLight[] = [];
  const handlers = new Map<string, (object: unknown) => void>();
  const scene = {
    lights: {
      enable: mock(),
      setAmbientColor: mock(),
      addLight: () => {
        const light = new FakeLight();
        lights.push(light);
        return light;
      },
      removeLight: (light: FakeLight) => lights.splice(lights.indexOf(light), 1),
    },
    events: {
      on: (event: string, handler: (object: unknown) => void) => handlers.set(event, handler),
      off: (event: string) => handlers.delete(event),
    },
    children: { list: children },
    cameras: { main: {} },
  };
  return { scene, lights, handlers };
}

const storage = (tier: string) => ({ getItem: () => tier, setItem: () => {} });
const desktop = { touchDevice: false, pressureLevel: 0, reducedMotion: false };
const budgetFor = (tier: string, environment = desktop) =>
  resolveLightingBudget(getVisualQualityProfile(storage(tier)), environment);

describe('lighting budget', () => {
  test('tier values', () => {
    expect(budgetFor('low')).toEqual({ lights: 0, normalMapLighting: false, bloom: 'off' });
    expect(budgetFor('standard')).toEqual({ lights: 4, normalMapLighting: true, bloom: 'soft' });
    expect(budgetFor('high')).toEqual({ lights: 8, normalMapLighting: true, bloom: 'full' });
  });

  test('auto starts phones on the standard budget and sheds bloom, then lights, under pressure', () => {
    expect(budgetFor('auto', { ...desktop, touchDevice: true })).toEqual({
      lights: 4,
      normalMapLighting: true,
      bloom: 'soft',
    });
    expect(budgetFor('auto', { ...desktop, pressureLevel: 1 }).bloom).toBe('soft');
    expect(budgetFor('auto', { ...desktop, pressureLevel: 2 })).toMatchObject({ lights: 4, bloom: 'off' });
    expect(budgetFor('auto', { ...desktop, pressureLevel: 3 }).lights).toBe(0);
  });

  test('reduced motion keeps lights but drops bloom', () => {
    expect(budgetFor('high', { ...desktop, reducedMotion: true })).toEqual({
      lights: 8,
      normalMapLighting: true,
      bloom: 'off',
    });
  });
});

describe('LightingRig', () => {
  test('low tier lights nothing and creates no lights or bloom', () => {
    addBloom.mockClear();
    const sprite = litSprite(true);
    const { scene, lights } = createScene([sprite]);
    const rig = new LightingRig(scene as never, budgetFor('low'));
    rig.pulse(10, 10, 0xffffff, 100, 2, 300);
    rig.follow({ x: 0, y: 0 }, 0x00ffff, 80, 1);
    expect(sprite.setLighting).not.toHaveBeenCalled();
    expect(lights).toHaveLength(0);
    expect(addBloom).not.toHaveBeenCalled();
  });

  test('lights only sprites that carry a normal map, including ones added later', () => {
    const existing = litSprite(true);
    const flat = litSprite(false);
    const { scene, handlers } = createScene([existing, flat]);
    new LightingRig(scene as never, budgetFor('standard'));
    const later = litSprite(true);
    handlers.get('addedtoscene')!(later);
    expect(existing.setLighting).toHaveBeenCalledWith(true);
    expect(later.setLighting).toHaveBeenCalledWith(true);
    expect(flat.setLighting).not.toHaveBeenCalled();
  });

  test('a pulse reuses the oldest pulse when the pool is full, never the engine follower', () => {
    const { scene, lights } = createScene();
    const rig = new LightingRig(scene as never, budgetFor('standard'));
    const ship = { x: 50, y: 60, visible: true };
    rig.follow(ship, 0x5ff2ff, 70, 0.8);
    for (let index = 0; index < 4; index += 1) rig.pulse(index * 100, 0, 0xffb066, 140, 2, 400);
    expect(lights).toHaveLength(4);
    expect(lights.some((light) => light.x === 50 && light.y === 60)).toBe(true);
    // The first pulse (x=0) was the oldest and got replaced by the newest (x=300).
    expect(lights.map((light) => light.x).sort((a, b) => a - b)).toEqual([50, 100, 200, 300]);
  });

  test('pulses fade by gameplay delta and freeze at delta 0', () => {
    const { scene, lights } = createScene();
    const rig = new LightingRig(scene as never, budgetFor('standard'));
    rig.pulse(0, 0, 0xffb066, 140, 2, 400);
    rig.update(200);
    const halfway = lights[0]!.intensity;
    expect(halfway).toBeCloseTo(0.5, 6);
    rig.update(0);
    expect(lights[0]!.intensity).toBe(halfway);
    rig.update(250);
    expect(lights[0]!.intensity).toBe(0);
  });

  test('the engine light follows its ship and goes dark while the ship is hidden', () => {
    const { scene, lights } = createScene();
    const rig = new LightingRig(scene as never, budgetFor('standard'));
    const ship = { x: 10, y: 20, visible: true };
    const release = rig.follow(ship, 0x5ff2ff, 70, 0.8);
    ship.x = 30;
    rig.update(16);
    expect(lights[0]).toMatchObject({ x: 30, y: 20, intensity: 0.8 });
    ship.visible = false;
    rig.update(16);
    expect(lights[0]!.intensity).toBe(0);
    release();
    ship.visible = true;
    rig.update(16);
    expect(lights[0]!.intensity).toBe(0);
  });

  test('destroy removes every light and the bloom filter', () => {
    bloomDestroy.mockClear();
    const { scene, lights, handlers } = createScene();
    const rig = new LightingRig(scene as never, budgetFor('high'));
    rig.pulse(0, 0, 0xffffff, 100, 1, 100);
    rig.follow({ x: 0, y: 0 }, 0xffffff, 100, 1);
    rig.destroy();
    expect(lights).toHaveLength(0);
    expect(bloomDestroy).toHaveBeenCalledTimes(1);
    expect(handlers.has('addedtoscene')).toBe(false);
  });
});
