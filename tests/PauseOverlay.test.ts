import { describe, expect, test } from 'bun:test';

const { describePauseStatus } = await import('../src/scenes/gameScene/PauseOverlay');

describe('pause status line', () => {
  test('checkpoints stay quiet until the controller reports something', () => {
    expect(describePauseStatus({ statusMessage: '', storageAvailable: true }, 'checkpoints')).toEqual({
      message: '',
      tone: 'idle',
    });
  });

  test('checkpoints report unavailable storage as an error', () => {
    expect(describePauseStatus({ statusMessage: '', storageAvailable: false }, 'checkpoints')).toEqual({
      message: 'Checkpoint storage unavailable in this browser.',
      tone: 'error',
    });
  });

  test('settings explain that quality applies after a restart', () => {
    expect(describePauseStatus({ statusMessage: '', storageAvailable: false }, 'settings')).toEqual({
      message: 'Quality applies after restart.',
      tone: 'idle',
    });
  });

  test('controller messages win over notes and carry their outcome', () => {
    const saved = { statusMessage: 'Checkpoint saved.', statusOk: true, storageAvailable: true };
    expect(describePauseStatus(saved, 'checkpoints')).toEqual({ message: 'Checkpoint saved.', tone: 'info' });
    const failed = { statusMessage: 'Save failed.', statusOk: false, storageAvailable: true };
    expect(describePauseStatus(failed, 'settings')).toEqual({ message: 'Save failed.', tone: 'error' });
  });
});
