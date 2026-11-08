import type Phaser from 'phaser';
import type { LevelConfig } from '../../config/LevelsConfig';
import {
  scrollStarLayers,
  updateDebrisMoteMotion,
  updatePassingPlanetMotion,
  updatePlanetLayerMotion,
  updateTwinkleMotion,
} from './backgroundMotion';
import {
  createStarfieldTileSprites,
  destroyStarfieldTileSprites,
  layoutStarfieldTileSprites,
  STARFIELD_LAYER_CONFIGS,
  STARFIELD_TILE_DEPTHS,
} from './starfieldTileSpriteLifecycle';
import {
  createPremiumBackgroundLayers,
  destroyPremiumBackgroundLayers,
  layoutPremiumBackgroundLayers,
  rebuildPremiumBackgroundLayers,
  scrollPremiumBackgroundLayers,
  type PremiumBackgroundLayerState,
} from './premiumBackgroundLayers';
import {
  createPassingPlanetLayers,
  destroyPassingPlanetLayers,
  getPassingPlanetOffscreenThreshold,
  resetPassingPlanetPosition,
  type PassingPlanetState,
} from './passingPlanetLifecycle';
import {
  createPlanetLayer,
  destroyPlanetLayer,
  layoutPlanetLayer,
  type PlanetLayerState,
} from './distantPlanetLayerLifecycle';
import { createStarTwinkles, destroyTwinkles, type TwinkleState } from './starTwinkleLifecycle';
import { createDebrisMotes, destroyDebrisMotes, type DebrisMoteState } from './debrisMoteLifecycle';

export class LegacyBackground {
  private scene: Phaser.Scene | null = null;
  private levelConfig?: LevelConfig;
  private viewport = { width: 0, height: 0 };
  private tileSprites: Phaser.GameObjects.TileSprite[] = [];
  private planetLayer: PlanetLayerState | null = null;
  private debrisMotes: DebrisMoteState[] = [];
  private twinkles: TwinkleState[] = [];
  private passingPlanetSprites: PassingPlanetState[] = [];
  private premiumBackgroundLayers: PremiumBackgroundLayerState[] = [];
  private pendingRebuildEvent: Phaser.Time.TimerEvent | null = null;

  create(scene: Phaser.Scene, levelConfig?: LevelConfig): void {
    this.scene = scene;
    this.levelConfig = levelConfig;
    this.viewport.width = scene.cameras.main.width;
    this.viewport.height = scene.cameras.main.height;
    this.createSceneLayers(scene, levelConfig);
    this.layoutTileSprites();
    this.layoutPremiumBackgroundLayers();
  }

  private createSceneLayers(scene: Phaser.Scene, levelConfig?: LevelConfig): void {
    const hasPremiumLayers = levelConfig
      ? createPremiumBackgroundLayers(scene, levelConfig, this.viewport, this.premiumBackgroundLayers)
      : false;
    this.tileSprites = hasPremiumLayers
      ? []
      : createStarfieldTileSprites(scene, levelConfig, this.viewport.width, this.viewport.height);
    if (levelConfig) this.createLevelVisualLayers(scene, levelConfig);
  }

  private createLevelVisualLayers(scene: Phaser.Scene, config: LevelConfig): void {
    createPassingPlanetLayers(
      scene,
      config,
      this.viewport.width,
      this.viewport.height,
      this.passingPlanetSprites,
      100,
      400
    );
    this.planetLayer = createPlanetLayer(scene, config, this.viewport);
    createDebrisMotes(scene, config, this.viewport, this.debrisMotes);
    createStarTwinkles(scene, this.twinkles, { ...this.viewport, depths: STARFIELD_TILE_DEPTHS });
  }

  private destroyLevelVisualLayers(): void {
    this.passingPlanetSprites = destroyPassingPlanetLayers(this.passingPlanetSprites);
    this.planetLayer = destroyPlanetLayer(this.scene, this.planetLayer);
    this.debrisMotes = destroyDebrisMotes(this.debrisMotes);
    this.twinkles = destroyTwinkles(this.twinkles);
  }

  resize(width: number, height: number): void {
    if (!this.scene || width <= 0 || height <= 0) return;
    const changed = this.viewport.width !== width || this.viewport.height !== height;
    this.viewport.width = width;
    this.viewport.height = height;
    this.layoutTileSprites();
    this.layoutPremiumBackgroundLayers();
    if (!this.levelConfig) return;
    if (!changed) {
      this.layoutLevelVisualLayers();
      return;
    }

    this.pendingRebuildEvent?.remove(false);
    this.pendingRebuildEvent = this.scene.time.delayedCall(120, () => {
      this.pendingRebuildEvent = null;
      if (!this.scene || !this.levelConfig || this.viewport.width !== width || this.viewport.height !== height) return;
      this.rebuildPremiumBackgroundLayers(this.scene, this.levelConfig);
      this.rebuildLevelVisualLayers(this.scene, this.levelConfig);
    });
  }

  private rebuildPremiumBackgroundLayers(scene: Phaser.Scene, config: LevelConfig): void {
    rebuildPremiumBackgroundLayers({
      scene,
      config,
      viewport: this.viewport,
      premiumBackgroundLayers: this.premiumBackgroundLayers,
      layoutPremiumBackgroundLayers: () => this.layoutPremiumBackgroundLayers(),
    });
  }

  private rebuildLevelVisualLayers(scene: Phaser.Scene, config: LevelConfig): void {
    this.destroyLevelVisualLayers();
    this.createLevelVisualLayers(scene, config);
  }

  private layoutTileSprites(): void {
    layoutStarfieldTileSprites(this.tileSprites, this.viewport.width, this.viewport.height);
  }

  private layoutPremiumBackgroundLayers(): void {
    layoutPremiumBackgroundLayers(this.premiumBackgroundLayers, this.viewport);
  }

  private layoutLevelVisualLayers(): void {
    layoutPlanetLayer(this.planetLayer, this.viewport);
  }

  update(delta: number, elapsed: number, drift: number, alpha: number, twinkle: number, landmark: number): void {
    scrollStarLayers(this.tileSprites, STARFIELD_LAYER_CONFIGS, delta);
    scrollPremiumBackgroundLayers({
      premiumBackgroundLayers: this.premiumBackgroundLayers,
      delta,
      currentWidth: this.viewport.width,
      currentHeight: this.viewport.height,
      atmosphereDrift: drift,
      atmosphereAlpha: alpha,
      elapsed,
    });
    updatePlanetLayerMotion(this.planetLayer, elapsed, alpha, landmark);
    updateDebrisMoteMotion(this.debrisMotes, elapsed, delta, alpha);
    updateTwinkleMotion(this.twinkles, elapsed, twinkle);
    updatePassingPlanetMotion(
      this.passingPlanetSprites,
      delta,
      alpha,
      landmark,
      (sprite) => getPassingPlanetOffscreenThreshold(sprite, 220),
      (planet) => resetPassingPlanetPosition(planet, this.viewport.width, 100, 400)
    );
  }

  setLayerLimit(limit: number): void {
    this.premiumBackgroundLayers.forEach((layer, index) => layer.sprite.setVisible(index < limit));
  }

  destroy(): void {
    this.pendingRebuildEvent?.remove(false);
    this.pendingRebuildEvent = null;
    this.destroyLevelVisualLayers();
    destroyPremiumBackgroundLayers(this.premiumBackgroundLayers);
    this.tileSprites = destroyStarfieldTileSprites(this.tileSprites);
    this.scene = null;
    this.levelConfig = undefined;
  }
}
