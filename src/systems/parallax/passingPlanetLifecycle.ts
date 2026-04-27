import Phaser from 'phaser';
import type { LevelConfig } from '../../config/LevelsConfig';
import { generatePassingPlanetTextures } from './passingPlanetGenerator';

export interface PassingPlanetState {
  sprite: Phaser.GameObjects.Image;
  scrollSpeed: number;
  baseY: number;
  baseAlpha: number;
}

export function createPassingPlanetLayers(
  scene: Phaser.Scene,
  config: LevelConfig,
  currentWidth: number,
  currentHeight: number,
  passingPlanetSprites: PassingPlanetState[],
  respawnMinX: number,
  respawnMaxX: number
): void {
  if (!config.passingPlanets || config.passingPlanets.length === 0) {
    return;
  }

  const textureKeys = generatePassingPlanetTextures(scene, config.passingPlanets);

  for (let i = 0; i < config.passingPlanets.length; i++) {
    const pp = config.passingPlanets[i];
    const y = currentHeight * pp.yPosition;
    const sprite = scene.add.image(currentWidth, y, textureKeys[i]);
    sprite.setDepth(-12 - i);
    sprite.setAlpha(pp.alpha);

    passingPlanetSprites.push({
      sprite,
      scrollSpeed: pp.scrollSpeed,
      baseY: y,
      baseAlpha: pp.alpha,
    });

    resetPassingPlanetPosition(
      passingPlanetSprites[passingPlanetSprites.length - 1],
      currentWidth,
      respawnMinX,
      respawnMaxX
    );
  }
}

export function resetPassingPlanetPosition(
  planet: PassingPlanetState,
  currentWidth: number,
  respawnMinX: number,
  respawnMaxX: number
): void {
  planet.sprite.x = currentWidth + Phaser.Math.Between(respawnMinX, respawnMaxX);
  planet.sprite.y = planet.baseY;
}

export function getPassingPlanetOffscreenThreshold(
  sprite: Phaser.GameObjects.Image,
  offscreenPadding: number
): number {
  return -Math.max(offscreenPadding, sprite.displayWidth * 0.5);
}

export function destroyPassingPlanetLayers(passingPlanetSprites: PassingPlanetState[]): PassingPlanetState[] {
  for (const pp of passingPlanetSprites) {
    pp.sprite.destroy();
  }

  return [];
}
