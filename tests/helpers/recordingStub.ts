export interface RecordedCall {
  method: string;
  args: unknown[];
}

/**
 * Chainable stand-in for a Phaser game object: every method call is recorded and returns the stub,
 * and plain property reads come from `props`.
 */
export function createRecordingStub<T>(props: Record<string, unknown> = {}): { stub: T; calls: RecordedCall[] } {
  const calls: RecordedCall[] = [];
  const stub: unknown = new Proxy(props, {
    get(target, key) {
      if (typeof key !== 'string') return undefined;
      if (key in target) return target[key];
      return (...args: unknown[]) => {
        calls.push({ method: key, args });
        return stub;
      };
    },
    set(target, key, value) {
      if (typeof key === 'string') target[key] = value;
      return true;
    },
  });
  return { stub: stub as T, calls };
}

export function callsTo(calls: RecordedCall[], method: string): unknown[][] {
  return calls.filter((call) => call.method === method).map((call) => call.args);
}
