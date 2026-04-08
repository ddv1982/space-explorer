import Phaser from 'phaser';
import {
  createPauseButton,
  type PauseMusicSliders,
  createPauseMusicSliders,
  destroyPauseButton,
  destroyPauseMusicSliders,
  setPauseButtonDepth,
  setPauseButtonEnabled,
  setPauseButtonPosition,
  setPauseButtonVisible,
  setPauseMusicSlidersDepth,
  setPauseMusicSlidersPosition,
  setPauseMusicSlidersVisible,
} from './pauseOverlay/controls';
import type { PauseButton, PauseOverlayHandlers, PauseOverlayState } from './pauseOverlay/types';
import {
  drawPauseOverlayBackdrop,
  getPauseOverlayLayout,
  getPauseOverlayMessage,
  PAUSE_OVERLAY_BUTTON_GAP,
  PAUSE_OVERLAY_BUTTON_HEIGHT,
  PAUSE_OVERLAY_BUTTON_WIDTH,
} from './pauseOverlay/view';

export class PauseOverlay {
  private scene: Phaser.Scene | null = null;
  private handlers: PauseOverlayHandlers | null = null;
  private readonly state: PauseOverlayState = {
    visible: false,
    orientationBlocked: false,
    canResume: true,
  };

  private blocker: Phaser.GameObjects.Zone | null = null;
  private dimmer: Phaser.GameObjects.Graphics | null = null;
  private panel: Phaser.GameObjects.Graphics | null = null;
  private titleText: Phaser.GameObjects.Text | null = null;
  private subtitleText: Phaser.GameObjects.Text | null = null;
  private hintText: Phaser.GameObjects.Text | null = null;
  private resumeButton: PauseButton | null = null;
  private menuButton: PauseButton | null = null;
  private musicSliders: PauseMusicSliders | null = null;

  static create(scene: Phaser.Scene, handlers: PauseOverlayHandlers): PauseOverlay {
    return new PauseOverlay().create(scene, handlers);
  }

  create(scene: Phaser.Scene, handlers: PauseOverlayHandlers): this {
    this.destroy();

    this.scene = scene;
    this.handlers = handlers;

    this.blocker = scene.add.zone(0, 0, 1, 1).setOrigin(0).setInteractive();
    this.blocker.on('pointerdown', () => {
      // Swallow input while paused.
    });

    this.dimmer = scene.add.graphics();
    this.panel = scene.add.graphics();
    this.titleText = scene.add.text(0, 0, 'PAUSED', {
      fontSize: '44px',
      color: '#eef7ff',
      fontStyle: 'bold',
      fontFamily: 'monospace',
      stroke: '#091624',
      strokeThickness: 4,
    }).setOrigin(0.5);
    this.subtitleText = scene.add.text(0, 0, '', {
      fontSize: '18px',
      color: '#bed5f5',
      fontFamily: 'monospace',
      align: 'center',
    }).setOrigin(0.5);
    this.hintText = scene.add.text(0, 0, '', {
      fontSize: '14px',
      color: '#8fb3d8',
      fontFamily: 'monospace',
      align: 'center',
    }).setOrigin(0.5);

    this.musicSliders = createPauseMusicSliders(scene, () => this.musicSliders);
    this.resumeButton = createPauseButton(
      scene,
      'RESUME',
      () => this.handlers?.onResume(),
      PAUSE_OVERLAY_BUTTON_WIDTH,
      PAUSE_OVERLAY_BUTTON_HEIGHT
    );
    this.menuButton = createPauseButton(
      scene,
      'MAIN MENU',
      () => this.handlers?.onMainMenu(),
      PAUSE_OVERLAY_BUTTON_WIDTH,
      PAUSE_OVERLAY_BUTTON_HEIGHT
    );

    this.setDepth(900);

    scene.scale.off(Phaser.Scale.Events.RESIZE, this.relayout, this);
    scene.scale.on(Phaser.Scale.Events.RESIZE, this.relayout, this);

    this.relayout();
    this.applyState();

    return this;
  }

  setState(nextState: Partial<PauseOverlayState>): void {
    this.state.visible = nextState.visible ?? this.state.visible;
    this.state.orientationBlocked = nextState.orientationBlocked ?? this.state.orientationBlocked;
    this.state.canResume = nextState.canResume ?? this.state.canResume;
    this.applyState();
  }

  relayout(): void {
    if (
      !this.scene ||
      !this.blocker ||
      !this.dimmer ||
      !this.panel ||
      !this.titleText ||
      !this.subtitleText ||
      !this.hintText ||
      !this.resumeButton ||
      !this.menuButton ||
      !this.musicSliders
    ) {
      return;
    }

    const layout = getPauseOverlayLayout(this.scene);

    this.blocker.setPosition(layout.left, layout.top);
    this.blocker.setSize(layout.width, layout.height);
    drawPauseOverlayBackdrop(this.dimmer, this.panel, layout);

    this.titleText.setPosition(layout.centerX, layout.panelY + 58);
    this.subtitleText.setPosition(layout.centerX, layout.panelY + 116);
    this.hintText.setPosition(layout.centerX, layout.panelY + 160);

    setPauseMusicSlidersPosition(this.musicSliders, layout.sliderX, layout.sliderStartY);
    setPauseButtonPosition(
      this.resumeButton,
      PAUSE_OVERLAY_BUTTON_WIDTH,
      PAUSE_OVERLAY_BUTTON_HEIGHT,
      layout.buttonsX,
      layout.buttonY
    );
    setPauseButtonPosition(
      this.menuButton,
      PAUSE_OVERLAY_BUTTON_WIDTH,
      PAUSE_OVERLAY_BUTTON_HEIGHT,
      layout.buttonsX + PAUSE_OVERLAY_BUTTON_WIDTH + PAUSE_OVERLAY_BUTTON_GAP,
      layout.buttonY
    );
  }

  destroy(): void {
    if (!this.scene) {
      return;
    }

    this.scene.scale.off(Phaser.Scale.Events.RESIZE, this.relayout, this);

    destroyPauseButton(this.resumeButton);
    destroyPauseButton(this.menuButton);
    destroyPauseMusicSliders(this.musicSliders);

    this.blocker?.destroy();
    this.dimmer?.destroy();
    this.panel?.destroy();
    this.titleText?.destroy();
    this.subtitleText?.destroy();
    this.hintText?.destroy();

    this.blocker = null;
    this.dimmer = null;
    this.panel = null;
    this.titleText = null;
    this.subtitleText = null;
    this.hintText = null;
    this.resumeButton = null;
    this.menuButton = null;
    this.musicSliders = null;
    this.handlers = null;
    this.scene = null;
  }

  private setDepth(depth: number): void {
    this.blocker?.setDepth(depth);
    this.dimmer?.setDepth(depth + 1);
    this.panel?.setDepth(depth + 2);
    this.titleText?.setDepth(depth + 3);
    this.subtitleText?.setDepth(depth + 3);
    this.hintText?.setDepth(depth + 3);
    if (this.resumeButton) {
      setPauseButtonDepth(this.resumeButton, depth + 3);
    }
    if (this.menuButton) {
      setPauseButtonDepth(this.menuButton, depth + 3);
    }
    if (this.musicSliders) {
      setPauseMusicSlidersDepth(this.musicSliders, depth + 3);
    }
  }

  private applyState(): void {
    if (
      !this.titleText ||
      !this.subtitleText ||
      !this.hintText ||
      !this.resumeButton ||
      !this.menuButton ||
      !this.blocker ||
      !this.dimmer ||
      !this.panel ||
      !this.musicSliders
    ) {
      return;
    }

    const shouldShow = this.state.visible;
    const canResume = this.state.canResume && !this.state.orientationBlocked;
    const message = getPauseOverlayMessage(this.state);

    this.titleText.setText(message.title);
    this.subtitleText.setText(message.subtitle);
    this.hintText.setText(message.hint);
    this.resumeButton.label.setText(message.resumeLabel);

    setPauseButtonEnabled(this.resumeButton, PAUSE_OVERLAY_BUTTON_WIDTH, PAUSE_OVERLAY_BUTTON_HEIGHT, canResume);
    setPauseButtonEnabled(this.menuButton, PAUSE_OVERLAY_BUTTON_WIDTH, PAUSE_OVERLAY_BUTTON_HEIGHT, true);

    this.blocker.setVisible(shouldShow);
    this.dimmer.setVisible(shouldShow);
    this.panel.setVisible(shouldShow);
    this.titleText.setVisible(shouldShow);
    this.subtitleText.setVisible(shouldShow);
    this.hintText.setVisible(shouldShow);
    setPauseButtonVisible(this.resumeButton, shouldShow);
    setPauseButtonVisible(this.menuButton, shouldShow);
    setPauseMusicSlidersVisible(this.musicSliders, shouldShow);
  }
}
