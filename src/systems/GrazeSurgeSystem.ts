export interface GrazeSurgeBullet {
  active: boolean;
  x: number;
  y: number;
  kill(): void;
}

interface GrazeSurgePosition {
  x: number;
  y: number;
}

export interface GrazeSurgeCallbacks {
  getPlayerPosition(): GrazeSurgePosition | null;
  getEnemyBullets(): GrazeSurgeBullet[];
  onGraze(x: number, y: number): void;
  onSurgePulse(x: number, y: number, clearedBullets: number): void;
}

const GRAZE_RADIUS_SQUARED = 26 * 26;
const SURGE_GAUGE_CAPACITY = 40;
const SURGE_CLEAR_RADIUS_SQUARED = 220 * 220;
const BOSS_GRAZE_VALUE = 2;

export const SURGE_SCORE_PER_BULLET = 25;

export class GrazeSurgeSystem {
  private gauge = 0;
  private bossActive = false;
  private readonly tracked = new Set<GrazeSurgeBullet>();

  constructor(private readonly callbacks: GrazeSurgeCallbacks) {}

  setBossActive(active: boolean): void {
    this.bossActive = active;
  }

  update(): void {
    const player = this.callbacks.getPlayerPosition();
    if (!player) {
      return;
    }

    for (const bullet of this.callbacks.getEnemyBullets()) {
      if (!bullet.active) {
        this.tracked.delete(bullet);
        continue;
      }

      if (this.tracked.has(bullet)) {
        continue;
      }

      if (distanceSquared(bullet, player) > GRAZE_RADIUS_SQUARED) {
        continue;
      }

      this.tracked.add(bullet);
      this.gauge = Math.min(SURGE_GAUGE_CAPACITY, this.gauge + (this.bossActive ? BOSS_GRAZE_VALUE : 1));
      this.callbacks.onGraze(bullet.x, bullet.y);

      if (this.gauge >= SURGE_GAUGE_CAPACITY) {
        this.fireSurgePulse(player);
      }
    }
  }

  getGaugeRatio(): number {
    return this.gauge / SURGE_GAUGE_CAPACITY;
  }

  reset(): void {
    this.gauge = 0;
    this.bossActive = false;
    this.tracked.clear();
  }

  private fireSurgePulse(player: GrazeSurgePosition): void {
    this.gauge = 0;

    let clearedBullets = 0;
    for (const bullet of this.callbacks.getEnemyBullets()) {
      if (!bullet.active) {
        continue;
      }

      if (distanceSquared(bullet, player) > SURGE_CLEAR_RADIUS_SQUARED) {
        continue;
      }

      bullet.kill();
      clearedBullets += 1;
    }

    this.callbacks.onSurgePulse(player.x, player.y, clearedBullets);
  }
}

function distanceSquared(a: GrazeSurgePosition, b: GrazeSurgePosition): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return dx * dx + dy * dy;
}
