import { describe, expect, mock, test } from 'bun:test';

let screenShake = true;
mock.module('../src/config/motionSettings', () => ({ getMotionSettings: () => ({ screenShake }) }));
const { shakeCamera } = await import('../src/systems/effects/cameraShake');

describe('shakeCamera', () => {
  test('shakes the main camera when screen shake is on, and does nothing when it is off', () => {
    const shake = mock();
    const scene = { cameras: { main: { shake } } } as never;
    shakeCamera(scene, 160, 0.006);
    expect(shake).toHaveBeenCalledWith(160, 0.006);
    screenShake = false;
    shakeCamera(scene, 160, 0.006);
    expect(shake).toHaveBeenCalledTimes(1);
    screenShake = true;
  });
});
