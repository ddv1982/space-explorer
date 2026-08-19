import { GameplayClock } from '@/systems/GameplayClock';

export { GameplayClock };

export interface GameSceneFrameDelegate {
  handlePauseInput(): void;
  isPausedOrLockedFrame(): boolean;
  updatePausedFrame(delta: number): void;
  updateGameplayFrame(time: number, delta: number): void;
  updateHud(): void;
}

export function runGameSceneUpdateFrame(
  delegate: GameSceneFrameDelegate,
  time: number,
  delta: number,
  clock?: GameplayClock
): void {
  delegate.handlePauseInput();

  if (delegate.isPausedOrLockedFrame()) {
    delegate.updatePausedFrame(delta);
    return;
  }

  if (clock) {
    clock.advance(delta);
    delegate.updateGameplayFrame(clock.now, clock.delta);
  } else {
    delegate.updateGameplayFrame(time, delta);
  }
  delegate.updateHud();
}
