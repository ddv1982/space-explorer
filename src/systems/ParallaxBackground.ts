import Phaser from 'phaser';
import { createLivingBackground, type LivingBackground } from './parallax/LivingBackground';
import type { LevelConfig, LevelSectionConfig, ScriptedHazardConfig } from '../config/LevelsConfig';
import { applyHazardTelegraphGlow } from '../utils/renderingCompat';
import { resolveSectionAtmosphereTargets } from './parallax/atmosphereProfile';
import { updateHazardOverlay as updateHazardOverlayRuntime } from './parallax/hazardOverlayRuntime';
import { runtimePerformanceBudget, type RuntimePerformanceSnapshot } from './RuntimePerformanceBudget';

export class ParallaxBackground {
  private scene: Phaser.Scene | null = null;
  private livingBackground: LivingBackground | null = null;
  private levelConfig?: LevelConfig;
  private elapsed = 0;
  private currentWidth = 0;
  private currentHeight = 0;
  private atmosphereAlpha = 1;
  private targetAtmosphereAlpha = 1;
  private atmosphereDrift = 1;
  private targetAtmosphereDrift = 1;
  private landmarkAlpha = 1;
  private targetLandmarkAlpha = 1;
  private hazardOverlayAlpha = 0;
  private targetHazardOverlayAlpha = 0;
  private activeHazards: ScriptedHazardConfig[] = [];
  private hazardOverlay: Phaser.GameObjects.Graphics | null = null;
  private unsubscribePerformanceBudget: (() => void) | null = null;

  create(scene: Phaser.Scene, levelConfig?: LevelConfig): void {
    this.destroy();
    this.initializeSceneState(scene, levelConfig);
    this.createSceneLayers(scene, levelConfig);
    this.createHazardOverlay(scene, levelConfig?.accentColor ?? 0x88c8ff);
    this.unsubscribePerformanceBudget = runtimePerformanceBudget.subscribe((snapshot) => {
      this.applyRuntimePerformanceBudget(snapshot);
    });
    this.applyRuntimePerformanceBudget(runtimePerformanceBudget.getSnapshot());
  }

  private initializeSceneState(scene: Phaser.Scene, levelConfig?: LevelConfig): void {
    this.scene = scene;
    this.levelConfig = levelConfig;
    this.resetRuntimeFieldState(scene.cameras.main.width, scene.cameras.main.height);
  }

  private createSceneLayers(scene: Phaser.Scene, levelConfig?: LevelConfig): void {
    this.livingBackground = createLivingBackground(scene, levelConfig?.name);
  }

  private createHazardOverlay(scene: Phaser.Scene, accentColor: number): void {
    this.hazardOverlay = scene.add.graphics();
    this.hazardOverlay.setDepth(-5).setVisible(false);
    applyHazardTelegraphGlow(this.hazardOverlay, accentColor);
  }

  resize(width: number, height: number): void {
    if (!this.scene || width <= 0 || height <= 0) return;
    this.currentWidth = width;
    this.currentHeight = height;
    this.livingBackground?.resize(width, height);
  }

  destroy(): void {
    this.livingBackground?.destroy();
    this.livingBackground = null;
    this.unsubscribePerformanceBudget?.();
    this.unsubscribePerformanceBudget = null;
    this.scene = null;
    this.levelConfig = undefined;
    this.resetRuntimeFieldState(0, 0);
    this.hazardOverlay?.destroy();
    this.hazardOverlay = null;
  }

  private applyRuntimePerformanceBudget(snapshot: RuntimePerformanceSnapshot): void {
    this.livingBackground?.setPressure(snapshot.pressureLevel);
    for (const filter of this.hazardOverlay?.filters?.internal.list ?? []) {
      filter.setActive(snapshot.glowEnabled);
    }
  }

  setSectionAtmosphere(section: LevelSectionConfig | null, sectionProgress: number): void {
    const targets = resolveSectionAtmosphereTargets(section, sectionProgress);

    this.targetAtmosphereAlpha = targets.atmosphereAlpha;
    this.targetAtmosphereDrift = targets.atmosphereDrift;
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
    this.landmarkAlpha = 1;
    this.targetLandmarkAlpha = 1;
    this.hazardOverlayAlpha = 0;
    this.targetHazardOverlayAlpha = 0;
    this.activeHazards = [];
  }

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
    this.landmarkAlpha = Phaser.Math.Linear(this.landmarkAlpha, this.targetLandmarkAlpha, alpha);
  }

  private updateVisualLayers(delta: number): void {
    this.livingBackground?.update(delta, this.atmosphereDrift, this.atmosphereAlpha, this.landmarkAlpha);
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

  getLivingBackgroundSnapshot() {
    return this.livingBackground?.snapshot() ?? null;
  }
}
