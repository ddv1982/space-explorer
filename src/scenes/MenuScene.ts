import Phaser from 'phaser';
import { getLevelConfig } from '../config/LevelsConfig';
import { ParallaxBackground } from '../systems/ParallaxBackground';
import { resetPlayerState } from '../systems/PlayerState';
import { audioManager } from '../systems/AudioManager';
import { centerHorizontally, getViewportLayout } from '../utils/layout';

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
    this.scale.off(Phaser.Scale.Events.RESIZE, this.handleScaleResize, this);

    const menuConfig = getLevelConfig(1);
    const layout = getViewportLayout(this);
    const controlsPanelWidth = 360;
    const controlsPanelHeight = 132;
    const controlsY = layout.centerY + 40;
    const controlsPanelX = centerHorizontally(layout, controlsPanelWidth);

    this.cameras.main.setBackgroundColor(menuConfig.bgColor);

    this.parallax = new ParallaxBackground();
    this.parallax.create(this, menuConfig);
    this.scale.on(Phaser.Scale.Events.RESIZE, this.handleScaleResize, this);

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
      { label: 'MOVE', keys: 'W A S D  /  Arrow Keys' },
      { label: 'FIRE', keys: 'SPACE  /  Click' },
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

    // Pulsing subtitle
    const subtitle = this.add.text(layout.centerX, controlsY + 140, 'Click to Start', {
      fontSize: '24px',
      color: '#cfefff',
      fontFamily: 'monospace',
      stroke: '#040b12',
      strokeThickness: 2,
    }).setOrigin(0.5).setDepth(12);

    this.tweens.add({
      targets: subtitle,
      alpha: { from: 1, to: 0.3 },
      duration: 800,
      yoyo: true,
      repeat: -1,
    });

    this.input.once('pointerdown', () => {
      audioManager.init();
      audioManager.playClick();
      resetPlayerState(this.registry);
      this.scene.start('Game');
    });
  }

  update(_time: number, delta: number): void {
    this.parallax?.update(delta);
  }

  private handleScaleResize(): void {
    this.parallax?.resize(this.cameras.main.width, this.cameras.main.height);
  }

  private handleSceneShutdown(): void {
    this.scale.off(Phaser.Scale.Events.RESIZE, this.handleScaleResize, this);
    this.parallax?.destroy();
  }

  private handleSceneDestroy(): void {
    this.scale.off(Phaser.Scale.Events.RESIZE, this.handleScaleResize, this);
    this.parallax?.destroy();
  }
}

function colorToHexString(color: number): string {
  return `#${color.toString(16).padStart(6, '0')}`;
}
