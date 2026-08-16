/**
 * Centralized escape hatch for legacy Phaser entity tests.
 * Prefer pure rule tests; use this only while behavior still lives behind a Phaser facade.
 */
export function assignPrivateState<T extends object>(target: T, state: Record<string, unknown>): T {
  Object.assign(target, state);
  return target;
}

export function readPrivateState<T>(target: object, key: string): T {
  return (target as Record<string, unknown>)[key] as T;
}
