import { expect, mock, test } from 'bun:test';
import { suspendEncounterSpawning } from '../src/browserHarness/suspendEncounterSpawning';

function createWaves() {
  return {
    update: mock((_time: number, _delta: number, _progress: number) => {}),
    updateBossAdds: mock((_delta: number) => {}),
  };
}

test('beam fixture suppresses both spawning owners and restores their original methods', () => {
  const waves = createWaves();
  const { update, updateBossAdds } = waves;
  const restore = suspendEncounterSpawning(waves);
  waves.update(1000, 16, 0.1);
  waves.updateBossAdds(16);
  expect(update).not.toHaveBeenCalled();
  expect(updateBossAdds).not.toHaveBeenCalled();
  restore();
  restore();
  expect(waves.update).toBe(update);
  expect(waves.updateBossAdds).toBe(updateBossAdds);
  waves.update(1000, 16, 0.1);
  waves.updateBossAdds(16);
  expect(update).toHaveBeenCalledTimes(1);
  expect(updateBossAdds).toHaveBeenCalledTimes(1);
});

test('restaging never captures a suppressed method and an old cleanup cannot release a newer fixture', () => {
  const waves = createWaves();
  const original = waves.update;
  const first = suspendEncounterSpawning(waves);
  const second = suspendEncounterSpawning(waves);
  first();
  waves.update(1000, 16, 0.1);
  expect(original).not.toHaveBeenCalled();
  second();
  expect(waves.update).toBe(original);
});

test('fixture cleanup leaves another scene owner isolated', () => {
  const first = createWaves();
  const second = createWaves();
  const secondUpdate = second.update;
  const restoreFirst = suspendEncounterSpawning(first);
  const restoreSecond = suspendEncounterSpawning(second);
  restoreFirst();
  second.update(1000, 16, 0.1);
  expect(secondUpdate).not.toHaveBeenCalled();
  restoreSecond();
  expect(second.update).toBe(secondUpdate);
});
