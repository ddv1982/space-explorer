import { loadAudioVolumes, saveAudioVolumes, type AudioVolumes } from '../config/audioSettings';
import type { ProceduralMusicTrackConfig } from '../config/LevelsConfig';
import { AudioContextManager } from './audio/AudioContextManager';
import { ProceduralMusicManager, DEFAULT_TRACK } from './audio/ProceduralMusicManager';
import { SfxPlayer } from './audio/SfxPlayer';
import type { SfxId } from './audio/sfx/recipes';

export type AudioPauseReason = 'gameplay' | 'visibility';

export class AudioManager {
  private contextManager = new AudioContextManager();
  private sfxPlayer = new SfxPlayer(this.contextManager);
  private musicManager = new ProceduralMusicManager(this.contextManager);
  private pauseReasons = new Set<AudioPauseReason>();
  private volumes: AudioVolumes | null = null;

  init(): void {
    this.contextManager.init();
    this.musicManager.ensureGains();
    this.applyVolumes();
    this.sfxPlayer.prewarm();
  }

  private getStoredVolumes(): AudioVolumes {
    this.volumes ??= loadAudioVolumes();
    return this.volumes;
  }

  private applyVolumes(): void {
    const volumes = this.getStoredVolumes();
    this.contextManager.setSfxVolume(volumes.effects);
    this.musicManager.setMusicVolume(volumes.music);
  }

  private ensureContext(): boolean {
    const isReady = this.contextManager.ensureContext();
    if (!isReady) {
      this.musicManager.resetNodes();
      this.contextManager.resetNodes();
      return false;
    }

    if (this.pauseReasons.size > 0) {
      this.contextManager.suspend();
    } else {
      this.contextManager.resume();
    }
    return true;
  }

  /** `pan` runs from -1 (left edge) to 1 (right edge). */
  playSfx(id: SfxId, pan = 0): void {
    this.sfxPlayer.play(id, pan);
  }

  /** Menu and button feedback: the press may be the page's first gesture, so audio resumes first. */
  playUi(id: 'uiClick' | 'uiConfirm' = 'uiClick'): void {
    this.resumeFromUserGesture();
    this.sfxPlayer.play(id);
  }

  resumeFromUserGesture(): void {
    if (this.pauseReasons.size === 0) this.contextManager.resumeFromUserGesture();
  }

  startMusic(track: ProceduralMusicTrackConfig = DEFAULT_TRACK): void {
    if (!this.ensureContext()) return;
    this.musicManager.playMusic(track);
  }

  stopMusic(): void {
    this.musicManager.stopMusic();
  }

  setPaused(reason: AudioPauseReason, paused: boolean): void {
    if (paused) {
      this.pauseReasons.add(reason);
    } else {
      this.pauseReasons.delete(reason);
    }

    if (this.pauseReasons.size > 0) {
      this.contextManager.suspend();
    } else {
      this.contextManager.resume();
    }
  }

  getPauseReasons(): readonly AudioPauseReason[] {
    return [...this.pauseReasons].sort();
  }

  getContextState(): AudioContextState | null {
    return this.contextManager.getState();
  }

  setMusicIntensity(intensity: number): void {
    if (!this.ensureContext()) return;
    this.musicManager.setMusicIntensity(intensity);
  }

  getVolumes(): AudioVolumes {
    return { ...this.getStoredVolumes() };
  }

  /** Applies and remembers one volume (0-1); returns the clamped values now in effect. */
  setVolume(channel: keyof AudioVolumes, volume: number): AudioVolumes {
    const volumes = this.getStoredVolumes();
    volumes[channel] = Math.min(1, Math.max(0, volume));
    this.ensureContext();
    this.applyVolumes();
    saveAudioVolumes(volumes);
    return this.getVolumes();
  }

  destroy(): void {
    this.pauseReasons.clear();
    this.musicManager.resetNodes();
    this.contextManager.destroy();
  }
}

export const audioManager = new AudioManager();
