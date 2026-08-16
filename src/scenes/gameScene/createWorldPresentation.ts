import type Phaser from 'phaser';
import { type getActiveSection } from '@/config/LevelsConfig';
import { EffectsManager } from '@/systems/EffectsManager';
import { type LevelManager } from '@/systems/LevelManager';
import { ParallaxBackground } from '@/systems/ParallaxBackground';
import { releasePremiumBackgroundTexturesOutsideWindow } from '@/systems/parallax/premiumBackgroundLoading';
import { type getPlayerSpawnPoint } from './viewport';

type LevelConfig = ReturnType<LevelManager['getLevelConfig']>;
type InitialSection = ReturnType<typeof getActiveSection>;
type PlayerSpawnPoint = ReturnType<typeof getPlayerSpawnPoint>;

interface CreateWorldPresentationParams {
  scene: Phaser.Scene;
  levelConfig: LevelConfig;
  /** Active campaign level; used to release premium textures outside the warm window. */
  levelNumber: number;
  initialSection: InitialSection;
  initialSectionProgress: number;
  syncViewportBounds: () => void;
  getPlayerSpawnPoint: () => PlayerSpawnPoint;
  registerScaleHandlers: () => void;
  createParallax?: () => ParallaxBackground;
  createEffectsManager?: () => EffectsManager;
  releaseOutsidePremiumWindow?: (scene: Phaser.Scene, levelNumber: number) => void;
}

interface WorldPresentation {
  parallax: ParallaxBackground;
  effectsManager: EffectsManager;
  playerSpawnPoint: PlayerSpawnPoint;
}

export function createWorldPresentation({
  scene,
  levelConfig,
  levelNumber,
  initialSection,
  initialSectionProgress,
  syncViewportBounds,
  getPlayerSpawnPoint,
  registerScaleHandlers,
  createParallax = () => new ParallaxBackground(),
  createEffectsManager = () => new EffectsManager(),
  releaseOutsidePremiumWindow = releasePremiumBackgroundTexturesOutsideWindow,
}: CreateWorldPresentationParams): WorldPresentation {
  scene.cameras.main.setBackgroundColor(levelConfig.bgColor);
  syncViewportBounds();
  const playerSpawnPoint = getPlayerSpawnPoint();

  const parallax = createParallax();
  parallax.create(scene, levelConfig);
  // Release only after this scene has claimed its premium layers so outgoing
  // Menu/Game TileSprites are not left holding removed textures mid-transition.
  releaseOutsidePremiumWindow(scene, levelNumber);
  parallax.setSectionAtmosphere(initialSection, initialSectionProgress);
  registerScaleHandlers();

  const effectsManager = createEffectsManager();
  effectsManager.setup(scene);
  effectsManager.applyLevelColorGrade(levelConfig);

  return { parallax, effectsManager, playerSpawnPoint };
}
