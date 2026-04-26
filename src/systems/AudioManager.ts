import type { ProceduralMusicTrackConfig } from '../config/LevelsConfig';
import { AudioContextManager } from './audio/AudioContextManager';
import { SFXManager } from './audio/SFXManager';
import {
  ProceduralMusicManager,
  DEFAULT_TRACK,
  type MusicRuntimeTuning,
} from './audio/ProceduralMusicManager';

class AudioManager {
  private contextManager = new AudioContextManager();
  private sfxManager = new SFXManager(this.contextManager);
  private musicManager = new ProceduralMusicManager(this.contextManager);

  init(): void {
    this.contextManager.init();
    this.musicManager.ensureGains();
  }

  private resetNodes(): void {
    this.musicManager.resetNodes();
    this.contextManager.resetNodes();
  }

  private ensureContext(): boolean {
    const isReady = this.contextManager.ensureContext();
    if (!isReady) {
      this.resetNodes();
    }
    return isReady;
  }

  playLaser(): void {
    this.sfxManager.playLaser();
  }

  playExplosion(intensity = 1): void {
    this.sfxManager.playExplosion(intensity);
  }

  playEnemyFire(): void {
    this.sfxManager.playEnemyFire();
  }

  playPowerUp(): void {
    this.sfxManager.playPowerUp();
  }

  playPowerUpPickup(): void {
    this.sfxManager.playPowerUpPickup();
  }

  playClick(): void {
    this.sfxManager.playClick();
  }

  playPlayerHit(): void {
    this.sfxManager.playPlayerHit();
  }

  playMusic(track: ProceduralMusicTrackConfig = DEFAULT_TRACK): void {
    if (!this.ensureContext()) return;
    this.musicManager.playMusic(track);
  }

  startMusic(track: ProceduralMusicTrackConfig = DEFAULT_TRACK): void {
    if (!this.ensureContext()) return;
    this.musicManager.startMusic(track);
  }

  stopMusic(): void {
    this.musicManager.stopMusic();
  }

  setMusicIntensity(intensity: number): void {
    if (!this.ensureContext()) return;
    this.musicManager.setMusicIntensity(intensity);
  }

  getMusicVolume(): number {
    return this.musicManager.getMusicVolume();
  }

  setMusicVolume(volume: number): number {
    this.ensureContext();
    return this.musicManager.setMusicVolume(volume);
  }

  getMusicRuntimeTuning(): MusicRuntimeTuning {
    return this.musicManager.getMusicRuntimeTuning();
  }

  setMusicRuntimeTuning(nextTuning: Partial<MusicRuntimeTuning>): MusicRuntimeTuning {
    this.ensureContext();
    return this.musicManager.setMusicRuntimeTuning(nextTuning);
  }

  resetMusicRuntimeTuning(): MusicRuntimeTuning {
    this.ensureContext();
    return this.musicManager.resetMusicRuntimeTuning();
  }

  destroy(): void {
    this.musicManager.resetNodes();
    this.contextManager.destroy();
  }
}

export type { MusicRuntimeTuning };
export const audioManager = new AudioManager();
