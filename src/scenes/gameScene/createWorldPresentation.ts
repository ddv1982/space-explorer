import type Phaser from 'phaser';
import { type getActiveSection } from '../../config/LevelsConfig';
import { EffectsManager } from '../../systems/EffectsManager';
import { type LevelManager } from '../../systems/LevelManager';
import { ParallaxBackground } from '../../systems/ParallaxBackground';
import { type getPlayerSpawnPoint } from './viewport';


type LevelConfig = ReturnType<LevelManager['getLevelConfig']>;
type InitialSection = ReturnType<typeof getActiveSection>;
type PlayerSpawnPoint = ReturnType<typeof getPlayerSpawnPoint>;

interface CreateWorldPresentationParams {
  scene: Phaser.Scene;
  levelConfig: LevelConfig;
  initialSection: InitialSection;
  initialSectionProgress: number;
  syncViewportBounds: () => void;
  getPlayerSpawnPoint: () => PlayerSpawnPoint;
  registerScaleHandlers: () => void;
  createParallax?: () => ParallaxBackground;
  createEffectsManager?: () => EffectsManager;
}

interface WorldPresentation {
  parallax: ParallaxBackground;
  effectsManager: EffectsManager;
  playerSpawnPoint: PlayerSpawnPoint;
}

export function createWorldPresentation({
  scene,
  levelConfig,
  initialSection,
  initialSectionProgress,
  syncViewportBounds,
  getPlayerSpawnPoint,
  registerScaleHandlers,
  createParallax = () => new ParallaxBackground(),
  createEffectsManager = () => new EffectsManager(),
}: CreateWorldPresentationParams): WorldPresentation {
  scene.cameras.main.setBackgroundColor(levelConfig.bgColor);
  syncViewportBounds();
  const playerSpawnPoint = getPlayerSpawnPoint();

  const parallax = createParallax();
  parallax.create(scene, levelConfig);
  parallax.setSectionAtmosphere(initialSection, initialSectionProgress);
  registerScaleHandlers();

  const effectsManager = createEffectsManager();
  effectsManager.setup(scene);
  effectsManager.applyLevelColorGrade(levelConfig);

  return { parallax, effectsManager, playerSpawnPoint };
}
