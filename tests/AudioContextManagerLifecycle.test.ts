import { describe, expect, mock, test } from 'bun:test';
import { AudioManager } from '../src/systems/AudioManager';
import { AudioContextManager } from '../src/systems/audio/AudioContextManager';

function deferred(): { promise: Promise<void>; resolve: () => void; reject: () => void } {
  let resolvePromise = (): void => {};
  let rejectPromise = (): void => {};
  const promise = new Promise<void>((resolve, reject) => {
    resolvePromise = resolve;
    rejectPromise = () => reject(new Error('transition rejected'));
  });
  return { promise, resolve: resolvePromise, reject: rejectPromise };
}

async function flushTransitions(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
}

describe('AudioContextManager lifecycle control', () => {
  test('does not queue transitions when the requested state is already satisfied', () => {
    let state: AudioContextState = 'running';
    const manager = new AudioContextManager();
    (manager as unknown as { ctx: AudioContext | null }).ctx = {
      get state() {
        return state;
      },
    } as AudioContext;
    const queueStateTransition = mock(() => undefined);
    (manager as unknown as { queueStateTransition: () => void }).queueStateTransition = queueStateTransition;

    manager.resume();
    manager.resume();
    expect(queueStateTransition).not.toHaveBeenCalled();

    state = 'suspended';
    (manager as unknown as { desiredSuspended: boolean }).desiredSuspended = true;
    manager.suspend();
    manager.suspend();
    expect(queueStateTransition).not.toHaveBeenCalled();
  });

  test('serializes suspend and resume transitions', async () => {
    const suspend = mock(() => Promise.resolve());
    const resume = mock(() => Promise.resolve());
    let state: AudioContextState = 'running';
    const context = {
      get state() {
        return state;
      },
      suspend: () => {
        state = 'suspended';
        return suspend();
      },
      resume: () => {
        state = 'running';
        return resume();
      },
    } as unknown as AudioContext;
    const manager = new AudioContextManager();
    (manager as unknown as { ctx: AudioContext | null }).ctx = context;

    manager.suspend();
    await Promise.resolve();
    await Promise.resolve();
    manager.resume();
    await Promise.resolve();
    await Promise.resolve();

    expect(suspend).toHaveBeenCalledTimes(1);
    expect(resume).toHaveBeenCalledTimes(1);
  });

  test('converges on the latest state while suspend and resume are pending', async () => {
    const firstSuspend = deferred();
    const pendingResume = deferred();
    const finalSuspend = deferred();
    let state: AudioContextState = 'running';
    let suspendCalls = 0;
    const suspend = mock(() => {
      const transition = suspendCalls++ === 0 ? firstSuspend : finalSuspend;
      return transition.promise.then(() => {
        state = 'suspended';
      });
    });
    const resume = mock(() => pendingResume.promise.then(() => {
      state = 'running';
    }));
    const context = {
      get state() {
        return state;
      },
      suspend,
      resume,
    } as unknown as AudioContext;
    const manager = new AudioContextManager();
    (manager as unknown as { ctx: AudioContext | null }).ctx = context;

    manager.suspend();
    await flushTransitions();
    manager.resume();
    expect(suspend).toHaveBeenCalledTimes(1);
    expect(resume).not.toHaveBeenCalled();

    firstSuspend.resolve();
    await flushTransitions();
    expect(resume).toHaveBeenCalledTimes(1);

    manager.suspend();
    pendingResume.resolve();
    await flushTransitions();
    expect(suspend).toHaveBeenCalledTimes(2);

    finalSuspend.resolve();
    await flushTransitions();
    expect(manager.getState() as unknown).toBe('suspended');
    expect(suspend).toHaveBeenCalledTimes(2);
    expect(resume).toHaveBeenCalledTimes(1);
  });

  test('suspends a context created after suspension was requested', async () => {
    const originalWindow = globalThis.window;
    let state: AudioContextState = 'running';
    const suspend = mock(async () => {
      state = 'suspended';
    });
    class FakeAudioContext {
      sampleRate = 10;
      destination = {};
      get state(): AudioContextState {
        return state;
      }
      createGain() {
        return { gain: { value: 0 }, connect: (): void => undefined };
      }
      createBuffer(_channels: number, length: number) {
        return { getChannelData: () => new Float32Array(length) };
      }
      suspend = suspend;
    }

    try {
      Object.defineProperty(globalThis, 'window', {
        configurable: true,
        value: { AudioContext: FakeAudioContext },
      });
      const manager = new AudioContextManager();
      manager.suspend();
      await flushTransitions();

      manager.init();
      await flushTransitions();

      expect(suspend).toHaveBeenCalledTimes(1);
      expect(manager.getState()).toBe('suspended');
    } finally {
      Object.defineProperty(globalThis, 'window', {
        configurable: true,
        value: originalWindow,
      });
    }
  });

  test('recovers after a rejected transition', async () => {
    const rejectedSuspend = deferred();
    const successfulSuspend = deferred();
    let state: AudioContextState = 'running';
    let suspendCalls = 0;
    const suspend = mock(() => {
      const transition = suspendCalls++ === 0 ? rejectedSuspend : successfulSuspend;
      return transition.promise.then(() => {
        state = 'suspended';
      });
    });
    const context = {
      get state() {
        return state;
      },
      suspend,
    } as unknown as AudioContext;
    const manager = new AudioContextManager();
    (manager as unknown as { ctx: AudioContext | null }).ctx = context;

    manager.suspend();
    await flushTransitions();
    rejectedSuspend.reject();
    await flushTransitions();

    manager.suspend();
    await flushTransitions();
    expect(suspend).toHaveBeenCalledTimes(2);

    successfulSuspend.resolve();
    await flushTransitions();
    expect(manager.getState() as unknown).toBe('suspended');
  });

  test('absorbs a pending transition rejection after destroy', async () => {
    const pendingSuspend = deferred();
    const close = mock(() => Promise.reject(new Error('close rejected')));
    const context = {
      state: 'running',
      suspend: () => pendingSuspend.promise,
      close,
    } as unknown as AudioContext;
    const manager = new AudioContextManager();
    (manager as unknown as { ctx: AudioContext | null }).ctx = context;

    manager.suspend();
    await flushTransitions();
    manager.destroy();
    pendingSuspend.reject();
    await flushTransitions();

    expect(manager.getState()).toBeNull();
    expect(close).toHaveBeenCalledTimes(1);
  });

  test('does not let scheduling resume audio while any pause reason remains', () => {
    const suspend = mock(() => undefined);
    const resume = mock(() => undefined);
    const ensureContext = mock(() => true);
    const manager = new AudioManager();
    (manager as unknown as {
      contextManager: Pick<AudioContextManager, 'ensureContext' | 'suspend' | 'resume'>;
    }).contextManager = { ensureContext, suspend, resume };

    manager.setPaused('gameplay', true);
    manager.setPaused('visibility', true);
    suspend.mockClear();
    (manager as unknown as { ensureContext: () => boolean }).ensureContext();
    expect(suspend).toHaveBeenCalledTimes(1);

    manager.setPaused('visibility', false);

    expect(resume).not.toHaveBeenCalled();
    expect(manager.getPauseReasons()).toEqual(['gameplay']);

    manager.setPaused('gameplay', false);
    expect(resume).toHaveBeenCalledTimes(1);
  });
});
