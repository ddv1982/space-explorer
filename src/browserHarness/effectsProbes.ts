import type Phaser from 'phaser';

export function createEffectsProbes(game: Phaser.Game) {
  return {
    /** Detonates one of each blast style across the screen so evidence can capture them mid-flight. */
    stageExplosionShowcase: (): void => {
      const scene = game.scene.getScene('Game') as Phaser.Scene & {
        effectsManager?: {
          createEnemyExplosion(x: number, y: number, type: string, intensity: number): void;
          createExplosion(x: number, y: number, intensity: number): void;
          createHitSplash(x: number, y: number): void;
          createAsteroidDebris(x: number, y: number): void;
        };
      };
      const effects = scene.effectsManager;
      if (!effects) throw new Error('Explosion showcase requires active gameplay');
      const width = Number(game.scale.width);
      const height = Number(game.scale.height);
      effects.createEnemyExplosion(width * 0.3, height * 0.4, 'fighter', 1);
      effects.createEnemyExplosion(width * 0.5, height * 0.4, 'bomber', 1.6);
      effects.createExplosion(width * 0.7, height * 0.4, 2.5);
      effects.createHitSplash(width * 0.3, height * 0.7);
      effects.createAsteroidDebris(width * 0.5, height * 0.7);
    },
  };
}
