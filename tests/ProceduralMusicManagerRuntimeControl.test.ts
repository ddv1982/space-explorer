import { describe, expect, test } from 'bun:test';

import { AudioContextManager } from '../src/systems/audio/AudioContextManager';
import { ProceduralMusicManager } from '../src/systems/audio/ProceduralMusicManager';
import {
  DEFAULT_MUSIC_RUNTIME_TUNING,
  resolveMusicRuntimeTuning,
} from '../src/systems/audio/procedural/musicRuntimeTuningProfile';

type AudioParamEvent = {
  method: 'cancelScheduledValues' | 'setValueAtTime' | 'linearRampToValueAtTime';
  value?: number;
  time: number;
};

function createLoggedAudioParam(initialValue: number): {
  audioParam: AudioParam;
  events: AudioParamEvent[];
} {
  const events: AudioParamEvent[] = [];
  const audioParam = {
    value: initialValue,
    cancelScheduledValues(time: number) {
      events.push({ method: 'cancelScheduledValues', time });
    },
    setValueAtTime(value: number, time: number) {
      audioParam.value = value;
      events.push({ method: 'setValueAtTime', value, time });
    },
    linearRampToValueAtTime(value: number, time: number) {
      audioParam.value = value;
      events.push({ method: 'linearRampToValueAtTime', value, time });
    },
  } as unknown as AudioParam;

  return { audioParam, events };
}

function createRuntimeControlHarness(): {
  manager: ProceduralMusicManager;
  musicGainEvents: AudioParamEvent[];
  reverbEvents: AudioParamEvent[];
  currentTime: number;
} {
  const currentTime = 12;
  const ctx = { currentTime } as AudioContext;

  const contextManager = {
    getCtx: () => ctx,
    getMasterGain: () => null,
    ensureContext: () => true,
    getNoiseBuffer: () => null,
    getExplosionBuffer: () => null,
  } as unknown as AudioContextManager;

  const manager = new ProceduralMusicManager(contextManager);

  const { audioParam: musicGainParam, events: musicGainEvents } = createLoggedAudioParam(0.4);
  const { audioParam: reverbParam, events: reverbEvents } = createLoggedAudioParam(0.12);

  (manager as unknown as { musicGain: GainNode | null }).musicGain = { gain: musicGainParam } as unknown as GainNode;
  (manager as unknown as { musicFX: { reverbGain: GainNode } | null }).musicFX = {
    reverbGain: { gain: reverbParam } as unknown as GainNode,
  };

  return { manager, musicGainEvents, reverbEvents, currentTime };
}

describe('ProceduralMusicManager runtime control delegation', () => {
  test('clamps volume/intensity and keeps runtime output at least as strong as the menu baseline', () => {
    const { manager, musicGainEvents, currentTime } = createRuntimeControlHarness();

    const clampedVolume = manager.setMusicVolume(4);
    manager.setMusicIntensity(0.1);

    expect(clampedVolume).toBe(1);
    expect(manager.getMusicVolume()).toBe(1);

    const rampEvents = musicGainEvents.filter((event) => event.method === 'linearRampToValueAtTime');
    const lastRamp = rampEvents.at(-1);

    expect(lastRamp).toBeDefined();
    expect(lastRamp?.value).toBeCloseTo(2.61, 6);
    expect(lastRamp?.time).toBeCloseTo(currentTime + 0.08, 6);
  });

  test('clamps and resets runtime tuning while applying ambience gain', () => {
    const { manager, reverbEvents, currentTime } = createRuntimeControlHarness();

    const tuning = manager.setMusicRuntimeTuning({ creativity: 2, ambience: -3 });
    expect(tuning).toEqual({
      creativity: 1,
      energy: DEFAULT_MUSIC_RUNTIME_TUNING.energy,
      ambience: 0,
    });

    const expectedClampedReverb = resolveMusicRuntimeTuning(tuning).reverbGain;
    const rampAfterSet = reverbEvents.filter((event) => event.method === 'linearRampToValueAtTime').at(-1);
    expect(rampAfterSet).toBeDefined();
    expect(rampAfterSet?.value).toBeCloseTo(expectedClampedReverb, 6);
    expect(rampAfterSet?.time).toBeCloseTo(currentTime + 0.12, 6);

    const resetTuning = manager.resetMusicRuntimeTuning();
    expect(resetTuning).toEqual(DEFAULT_MUSIC_RUNTIME_TUNING);

    const expectedResetReverb = resolveMusicRuntimeTuning(DEFAULT_MUSIC_RUNTIME_TUNING).reverbGain;
    const rampAfterReset = reverbEvents.filter((event) => event.method === 'linearRampToValueAtTime').at(-1);
    expect(rampAfterReset).toBeDefined();
    expect(rampAfterReset?.value).toBeCloseTo(expectedResetReverb, 6);
    expect(rampAfterReset?.time).toBeCloseTo(currentTime + 0.12, 6);
  });
});
