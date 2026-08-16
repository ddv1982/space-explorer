type CollisionTargetCtor<T> = abstract new (...args: never[]) => T;

/**
 * Resolve a typed game object from Phaser overlap callback values,
 * which may pass either the object itself or a wrapper with a gameObject field.
 */
export function resolveCollisionTarget<T>(ctor: CollisionTargetCtor<T>, ...values: unknown[]): T | null {
  for (const value of values) {
    if (value instanceof ctor) {
      return value;
    }

    if (!value || typeof value !== 'object' || !('gameObject' in value)) {
      continue;
    }

    const { gameObject } = value as { gameObject?: unknown };
    if (gameObject instanceof ctor) {
      return gameObject;
    }
  }

  return null;
}
