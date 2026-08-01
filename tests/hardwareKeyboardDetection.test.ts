import { afterEach, describe, expect, test } from 'bun:test';
import {
  initHardwareKeyboardDetection,
  isHardwareKeyboardDetected,
  onHardwareKeyboardDetected,
  resetHardwareKeyboardDetectionForTests,
} from '../src/systems/hardwareKeyboardDetection';

afterEach(() => {
  resetHardwareKeyboardDetectionForTests();
});

describe('hardwareKeyboardDetection', () => {
  test('starts undetected', () => {
    expect(isHardwareKeyboardDetected()).toBe(false);
  });

  test('detects the first keydown and notifies subscribers exactly once', () => {
    const target = new EventTarget();
    initHardwareKeyboardDetection(target);

    let calls = 0;
    onHardwareKeyboardDetected(() => {
      calls += 1;
    });

    target.dispatchEvent(new Event('keydown'));
    expect(isHardwareKeyboardDetected()).toBe(true);
    expect(calls).toBe(1);

    target.dispatchEvent(new Event('keydown'));
    expect(calls).toBe(1);
  });

  test('runs late subscribers immediately once already detected', () => {
    const target = new EventTarget();
    initHardwareKeyboardDetection(target);
    target.dispatchEvent(new Event('keydown'));

    let calls = 0;
    const unsubscribe = onHardwareKeyboardDetected(() => {
      calls += 1;
    });

    expect(calls).toBe(1);
    expect(typeof unsubscribe).toBe('function');
    unsubscribe();
  });

  test('unsubscribed handlers are not notified', () => {
    const target = new EventTarget();
    initHardwareKeyboardDetection(target);

    let calls = 0;
    const unsubscribe = onHardwareKeyboardDetected(() => {
      calls += 1;
    });
    unsubscribe();

    target.dispatchEvent(new Event('keydown'));
    expect(isHardwareKeyboardDetected()).toBe(true);
    expect(calls).toBe(0);
  });

  test('init arms only the first target', () => {
    const first = new EventTarget();
    const second = new EventTarget();
    initHardwareKeyboardDetection(first);
    initHardwareKeyboardDetection(second);

    second.dispatchEvent(new Event('keydown'));
    expect(isHardwareKeyboardDetected()).toBe(false);

    first.dispatchEvent(new Event('keydown'));
    expect(isHardwareKeyboardDetected()).toBe(true);
  });

  test('reset clears detection so a later session can re-arm', () => {
    const target = new EventTarget();
    initHardwareKeyboardDetection(target);
    target.dispatchEvent(new Event('keydown'));
    expect(isHardwareKeyboardDetected()).toBe(true);

    resetHardwareKeyboardDetectionForTests();
    expect(isHardwareKeyboardDetected()).toBe(false);

    initHardwareKeyboardDetection(target);
    target.dispatchEvent(new Event('keydown'));
    expect(isHardwareKeyboardDetected()).toBe(true);
  });
});
