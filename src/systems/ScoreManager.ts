export class ScoreManager {
  private score: number = 0;

  getScore(): number {
    return this.score;
  }

  addScore(value: number): void {
    this.score += value;
  }

  reset(): void {
    this.score = 0;
  }
}
