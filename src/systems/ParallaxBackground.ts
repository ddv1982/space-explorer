import Phaser from 'phaser';
import type { LevelConfig, LevelSectionConfig, ScriptedHazardConfig } from '../config/LevelsConfig';
import { resolveSectionAtmosphereTargets } from './parallax/atmosphereProfile';
import {
  scrollStarLayers,
  updateDebrisMoteMotion,
  updateForegroundSilhouetteMotion,
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
  capturePremiumBackgroundScrollOffsets as capturePremiumBackgroundScrollOffsetsHelper,
  createPremiumBackgroundLayers as createPremiumBackgroundLayersHelper,
  destroyPremiumBackgroundLayers as destroyPremiumBackgroundLayersHelper,
  layoutPremiumBackgroundLayers as layoutPremiumBackgroundLayersHelper,
  rebuildPremiumBackgroundLayers as rebuildPremiumBackgroundLayersHelper,
  restorePremiumBackgroundScrollOffsets as restorePremiumBackgroundScrollOffsetsHelper,
  scrollPremiumBackgroundLayers as scrollPremiumBackgroundLayersHelper,
  type PremiumBackgroundLayerState,
  type PremiumBackgroundScrollSnapshot,
} from './parallax/premiumBackgroundLayers';
import { updateHazardOverlay as updateHazardOverlayRuntime } from './parallax/hazardOverlayRuntime';
import {
  getPassingPlanetOffscreenThreshold,
  resetPassingPlanetPosition,
  type PassingPlanetState,
} from './parallax/passingPlanetLifecycle';
import { type ForegroundSilhouetteState } from './parallax/foregroundSilhouetteLifecycle';
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
  scheduleLevelVisualRebuild as scheduleLevelVisualRebuildOrchestration,
  type ResizeRebuildOrchestrationContext,
} from './parallax/resizeRebuildOrchestration';
import { getResizeRebuildOrchestrationContext as getResizeRebuildOrchestrationContextHelper } from './parallax/resizeRebuildOrchestrationContext';
import {
  createLevelVisualLayers,
  destroyLevelVisualLayers,
  rebuildLevelVisualLayers,
  type LevelVisualLayerLifecycleContext,
} from './parallax/levelVisualLayerLifecycle';
import { getLevelVisualLayerLifecycleContext as getLevelVisualLayerLifecycleContextHelper } from './parallax/levelVisualLayerLifecycleContext';

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
  private hazardResponseScale = 1;
  private activeHazards: ScriptedHazardConfig[] = [];
  private hazardOverlay: Phaser.GameObjects.Graphics | null = null;
  private foregroundSilhouettes: ForegroundSilhouetteState[] = [];
  private premiumBackgroundLayers: PremiumBackgroundLayerState[] = [];

  create(scene: Phaser.Scene, levelConfig?: LevelConfig): void {
    this.destroy();
    this.initializeSceneState(scene, levelConfig);
    this.createSceneLayers(scene, levelConfig);
    this.createHazardOverlay(scene);
    this.layoutSceneLayers();

    // The seamless image backgrounds are a low-depth art backplate. The normal
    // committed Phaser background stack remains in front of it.
  }

  private initializeSceneState(scene: Phaser.Scene, levelConfig?: LevelConfig): void {
    this.scene = scene;
    this.levelConfig = levelConfig;
    this.tileSprites = [];
    this.debrisMotes = [];
    this.foregroundSilhouettes = [];
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

  private createHazardOverlay(scene: Phaser.Scene): void {
    this.hazardOverlay = scene.add.graphics();
    this.hazardOverlay.setDepth(-5);
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

  private capturePremiumBackgroundScrollOffsets(): PremiumBackgroundScrollSnapshot[] {
    return capturePremiumBackgroundScrollOffsetsHelper(this.premiumBackgroundLayers);
  }

  private restorePremiumBackgroundScrollOffsets(snapshots: PremiumBackgroundScrollSnapshot[]): void {
    restorePremiumBackgroundScrollOffsetsHelper(this.premiumBackgroundLayers, snapshots);
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
    return getLevelVisualLayerLifecycleContextHelper(
      this.scene,
      this.currentWidth,
      this.currentHeight,
      this.passingPlanetSprites,
      this.twinkles,
      this.foregroundSilhouettes,
      PASSING_PLANET_RESPAWN_MIN_X,
      PASSING_PLANET_RESPAWN_MAX_X,
      STARFIELD_TILE_DEPTHS,
      this.createPlanetLayer.bind(this),
      this.createDebrisMotes.bind(this),
      this.destroyPlanetLayer.bind(this),
      this.destroyDebrisMotes.bind(this),
      (states) => this.setPassingPlanetSprites(states),
      (states) => this.setTwinkles(states)
    );
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
    return getResizeRebuildOrchestrationContextHelper(
      () => this.scene,
      () => this.levelConfig,
      () => this.currentWidth,
      () => this.currentHeight,
      (width, height) => {
        this.currentWidth = width;
        this.currentHeight = height;
      },
      () => this.premiumBackgroundLayers.length,
      () => this.pendingRebuildEvent,
      (event) => {
        this.pendingRebuildEvent = event;
      },
      () => this.layoutTileSprites(),
      () => this.layoutPremiumBackgroundLayers(),
      () => this.layoutLevelVisualLayers(),
      (scene, config) => this.rebuildPremiumBackgroundLayers(scene, config),
      (scene, config) => this.rebuildLevelVisualLayers(scene, config)
    );
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
    this.hazardResponseScale = targets.hazardResponseScale;
    this.activeHazards = targets.activeHazards;
  }

  private scheduleLevelVisualRebuild(): void {
    scheduleLevelVisualRebuildOrchestration(this.getResizeRebuildOrchestrationContext());
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
    this.hazardResponseScale = 1;
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
    this.updateAtmosphereState();
    this.updateVisualLayers(delta);
    this.hazardOverlayAlpha = this.updateHazardOverlay();
  }

  private updateAtmosphereState(): void {
    this.atmosphereAlpha = Phaser.Math.Linear(this.atmosphereAlpha, this.targetAtmosphereAlpha, 0.08);
    this.atmosphereDrift = Phaser.Math.Linear(this.atmosphereDrift, this.targetAtmosphereDrift, 0.08);
    this.atmosphereTwinkle = Phaser.Math.Linear(this.atmosphereTwinkle, this.targetAtmosphereTwinkle, 0.08);
    this.landmarkAlpha = Phaser.Math.Linear(this.landmarkAlpha, this.targetLandmarkAlpha, 0.08);
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
    updateForegroundSilhouetteMotion(this.foregroundSilhouettes, this.elapsed, this.landmarkAlpha);
  }

  private updateHazardOverlay(): number {
    return updateHazardOverlayRuntime({
      overlay: this.hazardOverlay,
      scene: this.scene,
      width: this.currentWidth,
      height: this.currentHeight,
      time: this.elapsed,
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
