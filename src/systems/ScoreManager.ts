const CHAIN_WINDOW_MS = 2500;
const CHAIN_TIER_KILLS = 8;
const CHAIN_MAX_MULTIPLIER = 5;

export interface ChainState {
  chain: number;
  multiplier: number;
}

export class ScoreManager {
  private score: number = 0;
  private chain: number = 0;
  private lastKillAt: number = Number.NEGATIVE_INFINITY;

  getScore(): number {
    return this.score;
  }

  addScore(value: number): void {
    this.score += value;
  }

  registerKill(baseScore: number, time: number): number {
    if (time - this.lastKillAt > CHAIN_WINDOW_MS) {
      this.chain = 0;
    }

    this.chain += 1;
    this.lastKillAt = time;

    const awarded = baseScore * this.getMultiplierForChain(this.chain);
    this.score += awarded;
    return awarded;
  }

  getChainState(time: number): ChainState {
    const chain = time - this.lastKillAt > CHAIN_WINDOW_MS ? 0 : this.chain;
    return { chain, multiplier: this.getMultiplierForChain(chain) };
  }

  onPlayerHit(): void {
    this.chain = Math.floor(this.chain / 2);
  }

  onPlayerDeath(): void {
    this.chain = 0;
  }

  reset(): void {
    this.score = 0;
    this.chain = 0;
    this.lastKillAt = Number.NEGATIVE_INFINITY;
  }

  private getMultiplierForChain(chain: number): number {
    return Math.min(CHAIN_MAX_MULTIPLIER, 1 + Math.floor(chain / CHAIN_TIER_KILLS));
  }
}
