import { LEVEL_DISTANCE, SCROLL_SPEED } from '../utils/constants';
import { getLevelConfig, LevelConfig } from '../config/LevelsConfig';

export class LevelManager {
  distance: number = 0;
  progress: number = 0;
  currentLevel: number = 1;
  private scrollSpeed: number = SCROLL_SPEED;
  private levelConfig!: LevelConfig;
  private levelDistance: number = LEVEL_DISTANCE;
  private bossSpawned: boolean = false;
  private bossDefeated: boolean = false;

  init(levelNumber: number): void {
    this.currentLevel = levelNumber;
    this.levelConfig = getLevelConfig(levelNumber);
    this.levelDistance = this.levelConfig.levelDistance;
    this.distance = 0;
    this.progress = 0;
    this.bossSpawned = false;
    this.bossDefeated = false;
  }

  update(delta: number): void {
    this.distance += this.scrollSpeed * delta / 16;
    this.progress = this.distance / this.levelDistance;
    if (this.progress >= 1.0 && !this.levelConfig.hasBoss) {
      this.progress = 1.0;
    }
  }

  isComplete(): boolean {
    if (this.levelConfig.hasBoss) {
      return this.bossDefeated;
    }
    return this.progress >= 1.0;
  }

  shouldSpawnBoss(): boolean {
    if (!this.levelConfig.hasBoss || this.bossSpawned) return false;
    return this.progress >= this.levelConfig.bossTriggerProgress;
  }

  getEncounterProgress(): number {
    const encounterGoal = this.levelConfig.hasBoss
      ? this.levelConfig.bossTriggerProgress
      : 1.0;

    if (encounterGoal <= 0) {
      return 1.0;
    }

    return Math.min(Math.max(this.progress / encounterGoal, 0), 1);
  }

  hasBossSpawned(): boolean {
    return this.bossSpawned;
  }

  markBossSpawned(): void {
    this.bossSpawned = true;
  }

  markBossDefeated(): void {
    this.bossDefeated = true;
    this.progress = 1.0;
  }

  getLevelConfig(): LevelConfig {
    return this.levelConfig;
  }

  reset(): void {
    this.distance = 0;
    this.progress = 0;
    this.bossSpawned = false;
    this.bossDefeated = false;
  }
}
