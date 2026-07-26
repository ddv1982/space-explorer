import { describe, expect, test } from 'bun:test';

import { resolveCollisionTarget } from '../src/utils/resolveCollisionTarget';

class Alpha {
  kind = 'alpha';
}

class Beta {
  kind = 'beta';
}

describe('resolveCollisionTarget', () => {
  test('returns a direct instanceof match', () => {
    const alpha = new Alpha();
    expect(resolveCollisionTarget(Alpha, alpha, new Beta())).toBe(alpha);
  });

  test('unwraps Phaser body-style { gameObject } wrappers', () => {
    const alpha = new Alpha();
    const wrapper = { gameObject: alpha };
    expect(resolveCollisionTarget(Alpha, wrapper, null)).toBe(alpha);
  });

  test('ignores unrelated values and mismatched wrappers', () => {
    expect(resolveCollisionTarget(Alpha, null, undefined, 12, { gameObject: new Beta() })).toBeNull();
  });

  test('prefers the first matching value in argument order', () => {
    const first = new Alpha();
    const second = new Alpha();
    expect(resolveCollisionTarget(Alpha, first, { gameObject: second })).toBe(first);
  });
});
