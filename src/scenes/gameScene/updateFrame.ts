import { GameplayClock } from '@/systems/GameplayClock';
import type { HitStop } from '@/systems/HitStop';

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
  clock?: GameplayClock,
  hitStop?: HitStop
): void {
  delegate.handlePauseInput();

  // A hit-stop freezes gameplay like a pause does; presentation keeps running through either.
  const otherHoldActive = delegate.isPausedOrLockedFrame();
  const hitStopFreezing = hitStop?.advance(delta, otherHoldActive) ?? false;
  if (otherHoldActive || hitStopFreezing) {
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
