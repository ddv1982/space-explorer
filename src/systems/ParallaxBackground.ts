import Phaser from 'phaser';
import type { LevelConfig, LevelSectionConfig, ScriptedHazardConfig } from '../config/LevelsConfig';
import { applyHazardTelegraphGlow } from '../utils/renderingCompat';
import { resolveSectionAtmosphereTargets } from './parallax/atmosphereProfile';
import {
  scrollStarLayers,
  updateDebrisMoteMotion,
  updatePassingPlanetMotion,
  updatePlanetLayerMotion,
  updateTwinkleMotion,
} from './parallax/backgroundMotion';
import {
  createStarfieldTileSprites,
  destroyStarfieldTileSprites,
  layoutStarfieldTileSprites,
  STARFIELD_LAYER_CONFIGS,
  STARFIELD_TILE_DEPTHS,
} from './parallax/starfieldTileSpriteLifecycle';
import {
  createPremiumBackgroundLayers as createPremiumBackgroundLayersHelper,
  destroyPremiumBackgroundLayers as destroyPremiumBackgroundLayersHelper,
  layoutPremiumBackgroundLayers as layoutPremiumBackgroundLayersHelper,
  rebuildPremiumBackgroundLayers as rebuildPremiumBackgroundLayersHelper,
  scrollPremiumBackgroundLayers as scrollPremiumBackgroundLayersHelper,
  type PremiumBackgroundLayerState,
} from './parallax/premiumBackgroundLayers';
import { updateHazardOverlay as updateHazardOverlayRuntime } from './parallax/hazardOverlayRuntime';
import {
  getPassingPlanetOffscreenThreshold,
  resetPassingPlanetPosition,
  type PassingPlanetState,
} from './parallax/passingPlanetLifecycle';
import {
  createPlanetLayer as createPlanetLayerHelper,
  destroyPlanetLayer as destroyPlanetLayerHelper,
  layoutPlanetLayer as layoutPlanetLayerHelper,
  type PlanetLayerState,
} from './parallax/distantPlanetLayerLifecycle';
import { type TwinkleState } from './parallax/starTwinkleLifecycle';
import {
  createDebrisMotes as createDebrisMotesHelper,
  destroyDebrisMotes as destroyDebrisMotesHelper,
  type DebrisMoteState,
} from './parallax/debrisMoteLifecycle';
import {
  resizeParallaxBackground,
  type ResizeRebuildOrchestrationContext,
} from './parallax/resizeRebuildOrchestration';
import {
  createLevelVisualLayers,
  destroyLevelVisualLayers,
  rebuildLevelVisualLayers,
  type LevelVisualLayerLifecycleContext,
} from './parallax/levelVisualLayerLifecycle';

const PASSING_PLANET_RESPAWN_MIN_X = 100;
const PASSING_PLANET_RESPAWN_MAX_X = 400;
const PASSING_PLANET_OFFSCREEN_PADDING = 220;

export class ParallaxBackground {
  private scene: Phaser.Scene | null = null;
  private levelConfig?: LevelConfig;
  private tileSprites: Phaser.GameObjects.TileSprite[] = [];
  private planetLayer: PlanetLayerState | null = null;
  private debrisMotes: DebrisMoteState[] = [];
  private twinkles: TwinkleState[] = [];
  private passingPlanetSprites: PassingPlanetState[] = [];
  private elapsed = 0;
  private currentWidth = 0;
  private currentHeight = 0;
  private pendingRebuildEvent: Phaser.Time.TimerEvent | null = null;
  private atmosphereAlpha = 1;
  private targetAtmosphereAlpha = 1;
  private atmosphereDrift = 1;
  private targetAtmosphereDrift = 1;
  private atmosphereTwinkle = 1;
  private targetAtmosphereTwinkle = 1;
  private landmarkAlpha = 1;
  private targetLandmarkAlpha = 1;
  private hazardOverlayAlpha = 0;
  private targetHazardOverlayAlpha = 0;
  private activeHazards: ScriptedHazardConfig[] = [];
  private hazardOverlay: Phaser.GameObjects.Graphics | null = null;
  private premiumBackgroundLayers: PremiumBackgroundLayerState[] = [];

  create(scene: Phaser.Scene, levelConfig?: LevelConfig): void {
    this.destroy();
    this.initializeSceneState(scene, levelConfig);
    this.createSceneLayers(scene, levelConfig);
    this.createHazardOverlay(scene, levelConfig?.accentColor ?? 0x88c8ff);
    this.layoutSceneLayers();

    // The seamless image backgrounds are a low-depth art backplate. The normal
    // committed Phaser background stack remains in front of it.
  }

  private initializeSceneState(scene: Phaser.Scene, levelConfig?: LevelConfig): void {
    this.scene = scene;
    this.levelConfig = levelConfig;
    this.tileSprites = [];
    this.debrisMotes = [];
    this.resetRuntimeFieldState(scene.cameras.main.width, scene.cameras.main.height);
  }

  private createSceneLayers(scene: Phaser.Scene, levelConfig?: LevelConfig): void {
    const hasPremiumBackgroundLayers = levelConfig
      ? this.createPremiumBackgroundLayers(scene, levelConfig)
      : false;

    this.tileSprites = hasPremiumBackgroundLayers
      ? []
      : createStarfieldTileSprites(
          scene,
          levelConfig,
          this.currentWidth,
          this.currentHeight
        );

    if (levelConfig) {
      this.createLevelVisualLayers(scene, levelConfig);
    }
  }

  private createHazardOverlay(scene: Phaser.Scene, accentColor: number): void {
    this.hazardOverlay = scene.add.graphics();
    this.hazardOverlay.setDepth(-5);
    // Keep authored hazard tells legible over detailed backplates without adding
    // new danger geometry or changing their lane information.
    applyHazardTelegraphGlow(this.hazardOverlay, accentColor);
  }

  private layoutSceneLayers(): void {
    this.layoutTileSprites();
    this.layoutPremiumBackgroundLayers();
  }

  private getViewportSize(): { width: number; height: number } {
    return {
      width: this.currentWidth,
      height: this.currentHeight,
    };
  }

  private createPremiumBackgroundLayers(scene: Phaser.Scene, config: LevelConfig): boolean {
    return createPremiumBackgroundLayersHelper(
      scene,
      config,
      this.getViewportSize(),
      this.premiumBackgroundLayers
    );
  }

  private destroyPremiumBackgroundLayers(): void {
    destroyPremiumBackgroundLayersHelper(this.premiumBackgroundLayers);
  }

  private rebuildPremiumBackgroundLayers(scene: Phaser.Scene, config: LevelConfig): void {
    rebuildPremiumBackgroundLayersHelper({
      scene,
      config,
      viewport: this.getViewportSize(),
      premiumBackgroundLayers: this.premiumBackgroundLayers,
      layoutPremiumBackgroundLayers: () => this.layoutPremiumBackgroundLayers(),
    });
  }

  private setPassingPlanetSprites(states: PassingPlanetState[]): void {
    this.passingPlanetSprites = states;
  }

  private setTwinkles(states: TwinkleState[]): void {
    this.twinkles = states;
  }

  private getLevelVisualLayerLifecycleContext(): LevelVisualLayerLifecycleContext {
    return {
      scene: this.scene,
      currentWidth: this.currentWidth,
      currentHeight: this.currentHeight,
      passingPlanetSprites: this.passingPlanetSprites,
      twinkles: this.twinkles,
      passingPlanetRespawnMinX: PASSING_PLANET_RESPAWN_MIN_X,
      passingPlanetRespawnMaxX: PASSING_PLANET_RESPAWN_MAX_X,
      starfieldTileDepths: STARFIELD_TILE_DEPTHS,
      createPlanetLayer: this.createPlanetLayer.bind(this),
      createDebrisMotes: this.createDebrisMotes.bind(this),
      destroyPlanetLayer: this.destroyPlanetLayer.bind(this),
      destroyDebrisMotes: this.destroyDebrisMotes.bind(this),
      setPassingPlanetSprites: (states) => this.setPassingPlanetSprites(states),
      setTwinkles: (states) => this.setTwinkles(states),
    };
  }

  private createLevelVisualLayers(scene: Phaser.Scene, config: LevelConfig): void {
    createLevelVisualLayers(this.getLevelVisualLayerLifecycleContext(), scene, config);
  }

  private destroyLevelVisualLayers(): void {
    destroyLevelVisualLayers(this.getLevelVisualLayerLifecycleContext());
  }

  private rebuildLevelVisualLayers(scene: Phaser.Scene, config: LevelConfig): void {
    rebuildLevelVisualLayers(this.getLevelVisualLayerLifecycleContext(), scene, config);
  }

  resize(width: number, height: number): void {
    resizeParallaxBackground(this.getResizeRebuildOrchestrationContext(), width, height);
  }

  private getResizeRebuildOrchestrationContext(): ResizeRebuildOrchestrationContext {
    return {
      getScene: () => this.scene,
      getLevelConfig: () => this.levelConfig,
      getCurrentWidth: () => this.currentWidth,
      getCurrentHeight: () => this.currentHeight,
      setCurrentSize: (width, height) => {
        this.currentWidth = width;
        this.currentHeight = height;
      },
      getPremiumBackgroundLayerCount: () => this.premiumBackgroundLayers.length,
      getPendingRebuildEvent: () => this.pendingRebuildEvent,
      setPendingRebuildEvent: (event) => {
        this.pendingRebuildEvent = event;
      },
      layoutTileSprites: () => this.layoutTileSprites(),
      layoutPremiumBackgroundLayers: () => this.layoutPremiumBackgroundLayers(),
      layoutLevelVisualLayers: () => this.layoutLevelVisualLayers(),
      rebuildPremiumBackgroundLayers: (scene, config) => this.rebuildPremiumBackgroundLayers(scene, config),
      rebuildLevelVisualLayers: (scene, config) => this.rebuildLevelVisualLayers(scene, config),
    };
  }

  destroy(): void {
    this.clearPendingRebuildEvent();
    this.destroyLevelVisualLayers();
    this.destroyPremiumBackgroundLayers();
    this.tileSprites = destroyStarfieldTileSprites(this.tileSprites);
    this.scene = null;
    this.levelConfig = undefined;
    this.resetRuntimeFieldState(0, 0);
    this.hazardOverlay?.destroy();
    this.hazardOverlay = null;
  }

  private clearPendingRebuildEvent(): void {
    if (!this.pendingRebuildEvent) {
      return;
    }

    this.pendingRebuildEvent.remove(false);
    this.pendingRebuildEvent = null;
  }

  setSectionAtmosphere(section: LevelSectionConfig | null, sectionProgress: number): void {
    const targets = resolveSectionAtmosphereTargets(section, sectionProgress);

    this.targetAtmosphereAlpha = targets.atmosphereAlpha;
    this.targetAtmosphereDrift = targets.atmosphereDrift;
    this.targetAtmosphereTwinkle = targets.atmosphereTwinkle;
    this.targetLandmarkAlpha = targets.landmarkAlpha;
    this.targetHazardOverlayAlpha = targets.hazardOverlayAlpha;
    this.activeHazards = targets.activeHazards;
  }

  private resetRuntimeFieldState(width: number, height: number): void {
    this.elapsed = 0;
    this.currentWidth = width;
    this.currentHeight = height;
    this.atmosphereAlpha = 1;
    this.targetAtmosphereAlpha = 1;
    this.atmosphereDrift = 1;
    this.targetAtmosphereDrift = 1;
    this.atmosphereTwinkle = 1;
    this.targetAtmosphereTwinkle = 1;
    this.landmarkAlpha = 1;
    this.targetLandmarkAlpha = 1;
    this.hazardOverlayAlpha = 0;
    this.targetHazardOverlayAlpha = 0;
    this.activeHazards = [];
  }

  // ---------------------------------------------------------------------------
  // Distant planet layer
  // ---------------------------------------------------------------------------

  private createPlanetLayer(scene: Phaser.Scene, config: LevelConfig): void {
    this.planetLayer = createPlanetLayerHelper(scene, config, this.getViewportSize());
  }

  // ---------------------------------------------------------------------------
  // Debris motes (small floating particles)
  // ---------------------------------------------------------------------------

  private createDebrisMotes(scene: Phaser.Scene, config: LevelConfig): void {
    createDebrisMotesHelper(
      scene,
      config,
      this.getViewportSize(),
      this.debrisMotes
    );
  }

  // ---------------------------------------------------------------------------
  // Update
  // ---------------------------------------------------------------------------

  update(delta: number): void {
    this.elapsed += delta;
    this.updateAtmosphereState(delta);
    this.updateVisualLayers(delta);
    this.hazardOverlayAlpha = this.updateHazardOverlay(delta);
  }

  private getFrameDampingAlpha(frameAlpha: number, delta: number): number {
    if (!Number.isFinite(delta) || delta <= 0) {
      return 0;
    }

    return Phaser.Math.Clamp(1 - Math.pow(1 - frameAlpha, delta / (1000 / 60)), 0, 1);
  }

  private updateAtmosphereState(delta: number): void {
    const alpha = this.getFrameDampingAlpha(0.08, delta);
    this.atmosphereAlpha = Phaser.Math.Linear(this.atmosphereAlpha, this.targetAtmosphereAlpha, alpha);
    this.atmosphereDrift = Phaser.Math.Linear(this.atmosphereDrift, this.targetAtmosphereDrift, alpha);
    this.atmosphereTwinkle = Phaser.Math.Linear(this.atmosphereTwinkle, this.targetAtmosphereTwinkle, alpha);
    this.landmarkAlpha = Phaser.Math.Linear(this.landmarkAlpha, this.targetLandmarkAlpha, alpha);
  }

  private updateVisualLayers(delta: number): void {
    scrollStarLayers(this.tileSprites, STARFIELD_LAYER_CONFIGS, delta);
    this.scrollPremiumBackgroundLayers(delta);
    updatePlanetLayerMotion(this.planetLayer, this.elapsed, this.atmosphereAlpha, this.landmarkAlpha);
    updateDebrisMoteMotion(this.debrisMotes, this.elapsed, delta, this.atmosphereAlpha);
    updateTwinkleMotion(this.twinkles, this.elapsed, this.atmosphereTwinkle);
    updatePassingPlanetMotion(
      this.passingPlanetSprites,
      delta,
      this.atmosphereAlpha,
      this.landmarkAlpha,
      (sprite) => getPassingPlanetOffscreenThreshold(sprite, PASSING_PLANET_OFFSCREEN_PADDING),
      (planet) => resetPassingPlanetPosition(
        planet,
        this.currentWidth,
        PASSING_PLANET_RESPAWN_MIN_X,
        PASSING_PLANET_RESPAWN_MAX_X
      )
    );
  }

  private updateHazardOverlay(delta: number): number {
    return updateHazardOverlayRuntime({
      overlay: this.hazardOverlay,
      scene: this.scene,
      width: this.currentWidth,
      height: this.currentHeight,
      time: this.elapsed,
      delta,
      levelConfig: this.levelConfig,
      overlayAlpha: this.hazardOverlayAlpha,
      targetOverlayAlpha: this.targetHazardOverlayAlpha,
      activeHazards: this.activeHazards,
    });
  }

  // ---------------------------------------------------------------------------
  // Layout
  // ---------------------------------------------------------------------------

  private layoutTileSprites(): void {
    layoutStarfieldTileSprites(this.tileSprites, this.currentWidth, this.currentHeight);
  }

  private layoutPremiumBackgroundLayers(): void {
    layoutPremiumBackgroundLayersHelper(this.premiumBackgroundLayers, this.getViewportSize());
  }

  private layoutLevelVisualLayers(): void {
    this.layoutPlanetLayer();
  }

  private scrollPremiumBackgroundLayers(delta: number): void {
    scrollPremiumBackgroundLayersHelper({
      premiumBackgroundLayers: this.premiumBackgroundLayers,
      delta,
      currentHeight: this.currentHeight,
      atmosphereDrift: this.atmosphereDrift,
      atmosphereAlpha: this.atmosphereAlpha,
      elapsed: this.elapsed,
    });
  }

  private layoutPlanetLayer(): void {
    layoutPlanetLayerHelper(this.planetLayer, this.getViewportSize());
  }

  // ---------------------------------------------------------------------------
  // Cleanup
  // ---------------------------------------------------------------------------

  private destroyPlanetLayer(): void {
    this.planetLayer = destroyPlanetLayerHelper(this.scene, this.planetLayer);
  }

  private destroyDebrisMotes(): void {
    this.debrisMotes = destroyDebrisMotesHelper(this.debrisMotes);
  }
}
