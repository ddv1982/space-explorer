import type Phaser from 'phaser';
import { getMotionSettings } from '../../config/motionSettings';

/** Shakes the main camera unless the player turned screen shake off. Every gameplay shake goes through here. */
export function shakeCamera(scene: Phaser.Scene, durationMs: number, intensity: number): void {
  if (!getMotionSettings().screenShake) return;
  scene.cameras.main.shake(durationMs, intensity);
}
