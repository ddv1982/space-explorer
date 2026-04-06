import Phaser from 'phaser';
import { getLevelConfig } from '../config/LevelsConfig';
import { ParallaxBackground } from '../systems/ParallaxBackground';
import { resetPlayerState } from '../systems/PlayerState';
import { audioManager } from '../systems/AudioManager';
import { isTouchMobileDevice } from '../utils/device';
import { centerHorizontally, getViewportLayout } from '../utils/layout';
import { bindProceedOnInput } from './shared/bindProceedOnInput';
import { createPromptText } from './shared/createPromptText';
import { registerRestartOnResize } from './shared/registerRestartOnResize';

export class MenuScene extends Phaser.Scene {
  private parallax!: ParallaxBackground;

  constructor() {
    super({ key: 'Menu' });
  }

  create(): void {
    this.events.off(Phaser.Scenes.Events.SHUTDOWN, this.handleSceneShutdown, this);
    this.events.off(Phaser.Scenes.Events.DESTROY, this.handleSceneDestroy, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.handleSceneShutdown, this);
    this.events.once(Phaser.Scenes.Events.DESTROY, this.handleSceneDestroy, this);

    const menuConfig = getLevelConfig(1);
    const layout = getViewportLayout(this);
    const controlsPanelWidth = 360;
    const controlsPanelHeight = 132;
    const controlsY = layout.centerY + 40;
    const controlsPanelX = centerHorizontally(layout, controlsPanelWidth);
    const mobile = isTouchMobileDevice();

    this.cameras.main.setBackgroundColor(menuConfig.bgColor);

    this.parallax = new ParallaxBackground();
    this.parallax.create(this, menuConfig);
    registerRestartOnResize(this);

    this.add.text(layout.centerX, layout.centerY - 60, 'SPACE EXPLORER', {
      fontSize: '64px',
      color: '#eefaff',
      fontStyle: 'bold',
      fontFamily: 'monospace',
      stroke: '#040b12',
      strokeThickness: 4,
    }).setOrigin(0.5).setDepth(12);

    // Controls panel
    const controlsPanel = this.add.graphics();
    controlsPanel.fillStyle(0x050b14, 0.76);
    controlsPanel.fillRoundedRect(controlsPanelX, controlsY - 8, controlsPanelWidth, controlsPanelHeight, 8);
    controlsPanel.lineStyle(1, menuConfig.accentColor, 0.38);
    controlsPanel.strokeRoundedRect(controlsPanelX, controlsY - 8, controlsPanelWidth, controlsPanelHeight, 8);
    controlsPanel.setDepth(10);

    this.add.text(layout.centerX, controlsY + 6, 'CONTROLS', {
      fontSize: '14px',
      color: colorToHexString(menuConfig.accentColor),
      fontFamily: 'monospace',
    }).setOrigin(0.5).setDepth(11);

    const controlsContent = [
      { label: 'MOVE', keys: mobile ? 'On-screen Joystick' : 'W A S D  /  Arrows' },
      { label: 'FIRE', keys: mobile ? 'Tap Screen' : 'SPACE  /  Click' },
      { label: 'LIVES', keys: '3 Ships Per Run' },
    ];

    controlsContent.forEach((row, i) => {
      const rowY = controlsY + 28 + i * 28;
      this.add.text(controlsPanelX + 20, rowY, row.label, {
        fontSize: '13px',
        color: '#d6f6ff',
        fontFamily: 'monospace',
        fontStyle: 'bold',
      }).setDepth(11);

      // Key badge
      this.add.text(layout.centerX + 10, rowY, row.keys, {
        fontSize: '12px',
        color: '#ffffff',
        fontFamily: 'monospace',
        backgroundColor: '#112033',
        padding: { x: 8, y: 4 },
      }).setOrigin(0.5).setDepth(12);
    });

    createPromptText(this, layout.centerX, controlsY + 140, 'Click, Tap, or Press Any Key').setDepth(12);

    bindProceedOnInput(this, () => {
      audioManager.init();
      audioManager.playClick();
      resetPlayerState(this.registry);
      this.scene.start('Game');
    });
  }

  update(_time: number, delta: number): void {
    this.parallax?.update(delta);
  }

  private handleSceneShutdown(): void {
    this.parallax?.destroy();
  }

  private handleSceneDestroy(): void {
    this.parallax?.destroy();
  }
}

function colorToHexString(color: number): string {
  return `#${color.toString(16).padStart(6, '0')}`;
}
