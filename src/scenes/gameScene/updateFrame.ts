interface GameSceneFrameDelegate {
  syncViewportIfNeeded(): void;
  handlePauseInput(): void;
  isPausedOrLockedFrame(): boolean;
  updatePausedFrame(delta: number): void;
  updateGameplayFrame(time: number, delta: number): void;
  updateHud(): void;
}

export function runGameSceneUpdateFrame(
  delegate: GameSceneFrameDelegate,
  time: number,
  delta: number
): void {
  delegate.syncViewportIfNeeded();
  delegate.handlePauseInput();

  if (delegate.isPausedOrLockedFrame()) {
    delegate.updatePausedFrame(delta);
    return;
  }

  delegate.updateGameplayFrame(time, delta);
  delegate.updateHud();
}
