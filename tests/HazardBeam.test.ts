import { describe, expect, mock, test } from 'bun:test';
import { mockPhaserModule } from './helpers/phaserMock';

mockPhaserModule();

const { HazardBeam } = await import('../src/entities/HazardBeam');

type BeamStub = Record<string, unknown> & {
  launch: (config: Record<string, unknown>) => void;
  kill: () => void;
  preUpdate: (time: number, delta: number) => void;
  isDamageActive: () => boolean;
  getClearsBullets: () => boolean;
  getDamage: () => number;
  x: number;
  scene: {
    physics: { world: { isPaused: boolean } };
    cameras: { main: { width: number; height: number } };
    time: { delayedCall: ReturnType<typeof mock> };
  };
};

function createBeamStub(): { beam: BeamStub; body: Record<string, unknown> } {
  const body: Record<string, unknown> = {
    enable: true,
    stop: mock(),
    reset: mock(),
    setSize: mock(),
  };

  const beam = Object.create(HazardBeam.prototype) as BeamStub;
  beam.setPosition = mock();
  beam.setActive = mock();
  beam.setVisible = mock();
  beam.setVelocity = mock();
  beam.setVelocityX = mock();
  beam.setScale = mock();
  beam.setTint = mock();
  beam.setAlpha = mock();
  beam.active = true;
  beam.x = 100;
  beam.body = body;
  beam.scene = {
    physics: { world: { isPaused: false } },
    cameras: { main: { width: 800, height: 600 } },
    time: {
      delayedCall: mock(),
    },
  };

  return { beam, body };
}

const BASE_CONFIG = {
  x: 100,
  y: 300,
  width: 33,
  height: 660,
  tint: 0xffb066,
  telegraphMs: 700,
  activeMs: 2000,
  velocityX: 205,
  clearsBullets: true,
};

describe('HazardBeam', () => {
  test('launch telegraphs with a disabled body and schedules no scene-clock timers', () => {
    const { beam, body } = createBeamStub();

    beam.launch(BASE_CONFIG);

    expect(beam.setPosition).toHaveBeenCalledWith(100, 300);
    expect(beam.setScale).toHaveBeenCalledWith(33 / 32, 660 / 128);
    expect(beam.setTint).toHaveBeenCalledWith(0xffb066);
    expect(beam.setAlpha).toHaveBeenCalledWith(0.22);
    expect(beam.isDamageActive()).toBe(false);
    expect(beam.getClearsBullets()).toBe(true);
    expect(beam.getDamage()).toBe(1);
    expect(body.setSize).toHaveBeenCalledWith(32, 128);
    expect(body.enable).toBe(false);
    expect(beam.scene.time.delayedCall).not.toHaveBeenCalled();
  });

  test('activates after the telegraph window elapses in gameplay frames', () => {
    const { beam, body } = createBeamStub();
    beam.launch(BASE_CONFIG);

    beam.preUpdate(0, 699);
    expect(beam.isDamageActive()).toBe(false);
    expect(beam.setAlpha).not.toHaveBeenCalledWith(0.95);

    beam.preUpdate(699, 1);
    expect(beam.isDamageActive()).toBe(true);
    expect(beam.setAlpha).toHaveBeenCalledWith(0.95);
    expect(body.enable).toBe(true);
    expect(beam.setVelocityX).toHaveBeenCalledWith(205);
  });

  test('expires after the active window elapses', () => {
    const { beam } = createBeamStub();
    beam.launch(BASE_CONFIG);

    beam.preUpdate(0, 700);
    expect(beam.isDamageActive()).toBe(true);

    beam.preUpdate(700, 1999);
    expect(beam.isDamageActive()).toBe(true);

    beam.preUpdate(2699, 1);
    expect(beam.setActive).toHaveBeenCalledWith(false);
    expect(beam.isDamageActive()).toBe(false);
  });

  test('carries telegraph frame overshoot into the active window to preserve total duration', () => {
    const { beam } = createBeamStub();
    beam.launch(BASE_CONFIG);

    beam.preUpdate(0, 800);
    expect(beam.isDamageActive()).toBe(true);

    beam.preUpdate(800, 1899);
    expect(beam.isDamageActive()).toBe(true);

    beam.preUpdate(2699, 1);
    expect(beam.setActive).toHaveBeenCalledWith(false);
  });

  test('freezes the telegraph and active countdowns while the arcade simulation is paused', () => {
    const { beam } = createBeamStub();
    beam.launch(BASE_CONFIG);

    // The whole beam duration elapses in wall-clock time while paused: nothing happens.
    beam.scene.physics.world.isPaused = true;
    beam.preUpdate(0, 5000);
    expect(beam.isDamageActive()).toBe(false);
    expect(beam.setAlpha).not.toHaveBeenCalledWith(0.95);

    // On resume the telegraph still gets its full window.
    beam.scene.physics.world.isPaused = false;
    beam.preUpdate(5000, 699);
    expect(beam.isDamageActive()).toBe(false);
    beam.preUpdate(5699, 1);
    expect(beam.isDamageActive()).toBe(true);

    // Pausing mid-flight preserves the remaining active window too.
    beam.scene.physics.world.isPaused = true;
    beam.preUpdate(5700, 5000);
    beam.scene.physics.world.isPaused = false;
    beam.preUpdate(10700, 1999);
    expect(beam.isDamageActive()).toBe(true);
    beam.preUpdate(12699, 1);
    expect(beam.setActive).toHaveBeenCalledWith(false);
  });

  test('kills the beam when it sweeps off screen while active', () => {
    const { beam } = createBeamStub();
    beam.launch(BASE_CONFIG);

    beam.preUpdate(0, 700);
    beam.x = 2000;
    beam.preUpdate(700, 16);

    expect(beam.setActive).toHaveBeenCalledWith(false);
    expect(beam.isDamageActive()).toBe(false);
  });

  test('relaunching resets the telegraph countdown and config', () => {
    const { beam } = createBeamStub();
    beam.launch(BASE_CONFIG);
    beam.preUpdate(0, 650);

    beam.launch({ ...BASE_CONFIG, clearsBullets: false, damage: 2 });

    beam.preUpdate(650, 699);
    expect(beam.isDamageActive()).toBe(false);

    beam.preUpdate(1349, 1);
    expect(beam.isDamageActive()).toBe(true);
    expect(beam.getClearsBullets()).toBe(false);
    expect(beam.getDamage()).toBe(2);
  });
});
