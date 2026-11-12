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

  if (delegate.isPausedOrLockedFrame()) {
    delegate.updatePausedFrame(delta);
    return;
  }

  if (clock) {
    // A hit-stop slows gameplay time only; paused frames above never consume it.
    clock.advance(hitStop ? hitStop.scaleDelta(delta) : delta);
    delegate.updateGameplayFrame(clock.now, clock.delta);
  } else {
    delegate.updateGameplayFrame(time, delta);
  }
  delegate.updateHud();
}
