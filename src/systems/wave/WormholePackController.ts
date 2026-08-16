import Phaser from 'phaser';
import type { ScriptedHazardConfig } from '@/config/LevelsConfig';

interface PendingWormholePack {
  hazard: ScriptedHazardConfig;
  x: number;
  y: number;
  remainingMs: number;
}

export class WormholePackController {
  private pending: PendingWormholePack[] = [];

  reset(): void {
    this.pending = [];
  }

  schedule(
    hazard: ScriptedHazardConfig,
    viewport: { left: number; right: number; width: number },
    emitTelegraph: (x: number, y: number) => void,
  ): void {
    const portalCount = 1 + Math.round(hazard.intensity ?? 0.5);
    for (let index = 0; index < portalCount; index++) {
      const x = Phaser.Math.Between(
        Math.round(viewport.left + viewport.width * 0.2),
        Math.round(viewport.right - viewport.width * 0.2),
      );
      const y = Phaser.Math.Between(150, 280);
      emitTelegraph(x, y);
      this.pending.push({ hazard, x, y, remainingMs: 600 });
    }
  }

  update(delta: number, materialize: (hazard: ScriptedHazardConfig, x: number, y: number) => void): void {
    const elapsed = Math.max(0, delta);
    this.pending = this.pending.filter((entry) => {
      entry.remainingMs -= elapsed;
      if (entry.remainingMs > 0) return true;
      materialize(entry.hazard, entry.x, entry.y);
      return false;
    });
  }
}
