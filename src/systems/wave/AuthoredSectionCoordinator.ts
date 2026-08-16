import type { LevelSectionConfig, RecoveryDropConfig, SignatureWaveConfig } from '@/config/LevelsConfig';

import { AuthoredEventTracker } from './AuthoredEventTracker';

interface AuthoredSectionActions {
  spawnWave: (wave: SignatureWaveConfig) => void;
  spawnDrop: (drop: RecoveryDropConfig) => void;
}

export class AuthoredSectionCoordinator {
  private readonly events = new AuthoredEventTracker();

  reset(): void {
    this.events.reset();
  }

  update(section: LevelSectionConfig | null, progress: number, actions: AuthoredSectionActions): void {
    if (!section) return;

    for (const wave of section.signatureWaves ?? []) {
      if (this.events.claim(section.id, 'wave', wave.id, wave.triggerProgress, progress)) {
        actions.spawnWave(wave);
      }
    }
    for (const drop of section.recoveryDrops ?? []) {
      if (this.events.claim(section.id, 'drop', drop.id, drop.triggerProgress, progress)) {
        actions.spawnDrop(drop);
      }
    }
  }
}
