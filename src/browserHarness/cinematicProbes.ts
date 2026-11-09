import Phaser from 'phaser';
import { CINEMATIC_SHIPS } from '../config/cinematicAssets';
import { V2_SHIPS } from '../config/v2Ships';
import { getLevelConfig } from '../config/LevelsConfig';
import { Boss } from '../entities/enemies/Boss';
import { Scout } from '../entities/enemies/Scout';
import { EnemyPool } from '../systems/EnemyPool';

export function createCinematicProbes(game: Phaser.Game) {
  return {
    getCinematicSnapshot: () => {
      const scene = game.scene.getScene('Game');
      const keys = new Set<string>([...CINEMATIC_SHIPS, ...V2_SHIPS].map((asset) => asset.key));
      const sprites = scene.children.list.filter(
        (child): child is Phaser.Physics.Arcade.Sprite =>
          child instanceof Phaser.Physics.Arcade.Sprite && keys.has(child.texture.key)
      );
      return {
        sprites: sprites.map((sprite) => {
          const body = sprite.body;
          return {
            key: sprite.texture.key,
            active: sprite.active,
            alive: 'isAlive' in sprite ? sprite.isAlive : sprite.active,
            phase: 'phase' in sprite && typeof sprite.phase === 'number' ? sprite.phase : null,
            width: sprite.width,
            height: sprite.height,
            displayWidth: sprite.displayWidth,
            displayHeight: sprite.displayHeight,
            scaleX: sprite.scaleX,
            scaleY: sprite.scaleY,
            sourceWidth: sprite.frame.cutWidth,
            sourceHeight: sprite.frame.cutHeight,
            resolution: sprite.frame.source.resolution,
            bodyWidth: body?.width,
            bodyHeight: body?.height,
            offsetX: body?.offset.x,
            offsetY: body?.offset.y,
          };
        }),
        textures: [...keys].map((key) => {
          const frame = game.textures.getFrame(key);
          return {
            key,
            exists: game.textures.exists(key),
            width: frame.cutWidth,
            height: frame.cutHeight,
            resolution: frame.source.resolution,
          };
        }),
      };
    },
    exerciseCinematicReuse: () => {
      const scene = game.scene.getScene('Game');
      if (!('enemyPool' in scene) || !(scene.enemyPool instanceof EnemyPool)) throw new Error('Expected enemy pool');
      const scout = scene.children.list.find((child): child is Scout => child instanceof Scout);
      const boss = scene.children.list.find((child): child is Boss => child instanceof Boss && child.active);
      if (!scout || !boss) throw new Error('Stage the cinematic encounter before testing reuse');
      scout.despawn();
      const reused = scene.enemyPool.spawnScout(Number(game.scale.width) * 0.3, 180) === scout;
      boss.takeDamage(boss.maxHp * 0.55);
      return { reused, hp: boss.hp, maxHp: boss.maxHp };
    },
    getLightingSnapshot: () => {
      const scene = game.scene.getScene('Game') as Phaser.Scene & {
        player?: Phaser.GameObjects.Sprite & { lighting?: boolean };
      };
      const lit = (key: string) =>
        scene.children.list.some(
          (child) =>
            child instanceof Phaser.GameObjects.Sprite &&
            child.active &&
            child.texture.key === key &&
            (child as Phaser.GameObjects.Sprite & { lighting?: boolean }).lighting === true
        );
      return {
        playerLit: lit('player-ship'),
        fighterLit: lit('fighter-texture'),
        lightCount: scene.lights.lights.length,
      };
    },
    pulseLightAt: (x: number, y: number, durationMs = 400): void => {
      const scene = game.scene.getScene('Game') as Phaser.Scene & {
        effectsManager?: { pulseLight(x: number, y: number, c: number, r: number, i: number, d: number): void };
      };
      scene.effectsManager?.pulseLight(x, y, 0xffb066, 150, 1.1, durationMs);
    },
    stageCinematicEncounter: (boss = false): void => {
      const scene = game.scene.getScene('Game');
      if (!('enemyPool' in scene) || !(scene.enemyPool instanceof EnemyPool)) {
        throw new Error('Cinematic evidence requires active gameplay');
      }
      const width = Number(game.scale.width);
      const height = Number(game.scale.height);
      if (boss) {
        const config = getLevelConfig(3).boss;
        if (!config) throw new Error('Pyre Herald configuration is missing');
        scene.enemyPool.spawnBoss(width / 2, height * 0.24, config);
      } else {
        scene.enemyPool.spawnScout(width * 0.3, height * 0.25);
        scene.enemyPool.spawnFighter(width * 0.65, height * 0.2);
        scene.enemyPool.spawnBomber(width * 0.5, height * 0.3);
      }
    },
  };
}
