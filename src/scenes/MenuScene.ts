import Phaser from 'phaser';
import { getLevelConfig } from '../config/LevelsConfig';
import { ParallaxBackground } from '../systems/ParallaxBackground';
import { resetPlayerState } from '../systems/PlayerState';
import { audioManager } from '../systems/AudioManager';
import { isTouchMobileDevice } from '../utils/device';
import { rebindSceneLifecycleHandlers } from '../utils/sceneLifecycle';
import { bindProceedOnInput } from './shared/bindProceedOnInput';
import { CONTINUE_PROMPT, createPromptText } from './shared/createPromptText';
import { registerRestartOnResize } from './shared/registerRestartOnResize';
import { createMenuLayoutPlan } from './menuScene/layout';
import { startRegisteredScene } from './sceneRegistry';
import {
  createControlsPanel,
  createMenuTitle,
  createMusicLabPanel,
  destroyMenuMusicSliders,
  type MenuMusicSliders,
} from './menuScene/panels';

export class MenuScene extends Phaser.Scene {
  private parallax!: ParallaxBackground;
  private musicSliders: MenuMusicSliders | null = null;

  constructor() {
    super({ key: 'Menu' });
  }

  create(): void {
    rebindSceneLifecycleHandlers(this, {
      onShutdown: this.handleSceneShutdown,
      context: this,
    });

    const menuConfig = getLevelConfig(1);
    const layoutPlan = createMenuLayoutPlan(this);

    this.cameras.main.setBackgroundColor(menuConfig.bgColor);

    audioManager.init();
    audioManager.startMusic(menuConfig.music.stage);
    audioManager.setMusicIntensity(0.9);

    this.parallax = new ParallaxBackground();
    this.parallax.create(this, menuConfig);
    registerRestartOnResize(this);

    createMenuTitle(this, layoutPlan);
    createControlsPanel(this, layoutPlan, menuConfig.accentColor, isTouchMobileDevice());
    this.musicSliders = createMusicLabPanel(this, layoutPlan, menuConfig.accentColor, () => this.musicSliders);

    createPromptText(this, layoutPlan.centerX, layoutPlan.promptY, CONTINUE_PROMPT).setDepth(12);

    bindProceedOnInput(this, () => {
      audioManager.init();
      audioManager.playClick();
      resetPlayerState(this.registry);
      startRegisteredScene(this, 'Game');
    });
  }

  update(_time: number, delta: number): void {
    this.parallax?.update(delta);
  }

  private handleSceneShutdown(): void {
    this.parallax?.destroy();
    destroyMenuMusicSliders(this.musicSliders);
    this.musicSliders = null;
  }
}
