import Phaser from 'phaser';
import { createActionButtonControl, type ActionButtonControl } from '../shared/actionButtonControl';
import {
  createMusicSliderCluster,
  destroyMusicSliderCluster,
  setMusicSliderClusterDepth,
  setMusicSliderClusterPosition,
  setMusicSliderClusterVisible,
  type MusicSliderCluster,
} from '../shared/musicSliderCluster';
import {
  createPauseSaveSlotRows,
  destroyPauseSaveSlotRows,
  setPauseSaveSlotRowsDepth,
  setPauseSaveSlotRowsPosition,
  setPauseSaveSlotRowsState,
  setPauseSaveSlotRowsVisible,
  type PauseSaveSlotRows,
} from './pauseOverlay/controls';
import type { PauseOverlayHandlers, PauseOverlayState } from './pauseOverlay/types';
import {
  drawPauseOverlayBackdrop,
  getPauseOverlayLayout,
  getPauseOverlayMessage,
  PAUSE_OVERLAY_BUTTON_HEIGHT,
  PAUSE_OVERLAY_BUTTON_WIDTH,
  PAUSE_OVERLAY_SLIDER_SPACING,
  PAUSE_OVERLAY_SLIDER_WIDTH,
} from './pauseOverlay/view';

function createDefaultPauseOverlayState(): PauseOverlayState {
  return {
    visible: false,
    orientationBlocked: false,
    canResume: true,
    canSave: false,
    storageAvailable: false,
    saveSlots: [],
    statusMessage: '',
  };
}

export class PauseOverlay {
  private scene: Phaser.Scene | null = null;
  private handlers: PauseOverlayHandlers | null = null;
  private readonly state: PauseOverlayState = createDefaultPauseOverlayState();

  private blocker: Phaser.GameObjects.Zone | null = null;
  private dimmer: Phaser.GameObjects.Graphics | null = null;
  private panel: Phaser.GameObjects.Graphics | null = null;
  private titleText: Phaser.GameObjects.Text | null = null;
  private subtitleText: Phaser.GameObjects.Text | null = null;
  private hintText: Phaser.GameObjects.Text | null = null;
  private musicHeaderText: Phaser.GameObjects.Text | null = null;
  private savesHeaderText: Phaser.GameObjects.Text | null = null;
  private statusText: Phaser.GameObjects.Text | null = null;
  private resumeButton: ActionButtonControl | null = null;
  private saveButton: ActionButtonControl | null = null;
  private loadButton: ActionButtonControl | null = null;
  private menuButton: ActionButtonControl | null = null;
  private musicSliders: MusicSliderCluster | null = null;
  private saveSlotRows: PauseSaveSlotRows | null = null;
  private musicVisible = true;
  private saveSlotsVisible = true;
  private actionButtonsVisible = false;
  private subtitleVisible = true;
  private hintVisible = true;

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
      fontSize: '86px',
      color: '#eefbff',
      fontStyle: 'bold',
      fontFamily: '"Arial Black", "Impact", "Helvetica Neue", Arial, sans-serif',
      stroke: '#42c9ff',
      strokeThickness: 2,
    }).setOrigin(0.5);
    this.subtitleText = scene.add.text(0, 0, '', {
      fontSize: '16px',
      color: '#d5e6f6',
      fontFamily: 'monospace',
      align: 'center',
    }).setOrigin(0.5);
    this.hintText = scene.add.text(0, 0, '', {
      fontSize: '14px',
      color: '#7fa8df',
      fontFamily: 'monospace',
      align: 'center',
      wordWrap: { width: 650 },
    }).setOrigin(0.5);
    this.musicHeaderText = scene.add.text(0, 0, 'TUNE MUSIC + VOLUME', {
      fontSize: '14px',
      color: '#7fa8df',
      fontFamily: 'monospace',
      fontStyle: 'bold',
    });
    this.savesHeaderText = scene.add.text(0, 0, 'CHECKPOINT GRID', {
      fontSize: '14px',
      color: '#ffbf6b',
      fontFamily: 'monospace',
      fontStyle: 'bold',
    });
    this.statusText = scene.add.text(0, 0, '', {
      fontSize: '13px',
      color: '#72ecff',
      fontFamily: 'monospace',
      align: 'center',
      wordWrap: { width: 620 },
    }).setOrigin(0.5);

    this.musicSliders = createMusicSliderCluster(scene, {
      width: PAUSE_OVERLAY_SLIDER_WIDTH,
      getSliders: () => this.musicSliders,
    });
    this.saveSlotRows = createPauseSaveSlotRows(scene, {
      onSaveSlot: (slotId) => this.handlers?.onSaveSlot(slotId),
      onLoadSlot: (slotId) => this.handlers?.onLoadSlot(slotId),
      onDeleteSlot: (slotId) => this.handlers?.onDeleteSlot(slotId),
    });
    this.resumeButton = createActionButtonControl(scene, {
      label: '▶\nRESUME',
      width: PAUSE_OVERLAY_BUTTON_WIDTH,
      height: PAUSE_OVERLAY_BUTTON_HEIGHT,
      onClick: () => this.handlers?.onResume(),
      variant: 'primary',
    });
    this.saveButton = createActionButtonControl(scene, {
      label: '▣\nSAVE GAME',
      width: PAUSE_OVERLAY_BUTTON_WIDTH,
      height: PAUSE_OVERLAY_BUTTON_HEIGHT,
      onClick: () => this.handlers?.onSaveSlot('slot-1'),
      variant: 'secondary',
    });
    this.loadButton = createActionButtonControl(scene, {
      label: '▰\nLOAD GAME',
      width: PAUSE_OVERLAY_BUTTON_WIDTH,
      height: PAUSE_OVERLAY_BUTTON_HEIGHT,
      onClick: () => this.handlers?.onLoadSlot(this.getPreferredLoadSlotId()),
      variant: 'secondary',
    });
    this.menuButton = createActionButtonControl(scene, {
      label: '⌂\nMAIN MENU',
      width: PAUSE_OVERLAY_BUTTON_WIDTH,
      height: PAUSE_OVERLAY_BUTTON_HEIGHT,
      onClick: () => this.handlers?.onMainMenu(),
      variant: 'secondary',
    });

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
    this.state.canSave = nextState.canSave ?? this.state.canSave;
    this.state.storageAvailable = nextState.storageAvailable ?? this.state.storageAvailable;
    this.state.saveSlots = nextState.saveSlots ?? this.state.saveSlots;
    const statusMessageChanged = nextState.statusMessage !== undefined && nextState.statusMessage !== this.state.statusMessage;
    this.state.statusMessage = nextState.statusMessage ?? this.state.statusMessage;
    this.state.statusOk = nextState.statusOk ?? (nextState.statusMessage === '' || statusMessageChanged ? true : this.state.statusOk);
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
      !this.musicHeaderText ||
      !this.savesHeaderText ||
      !this.statusText ||
      !this.resumeButton ||
      !this.saveButton ||
      !this.loadButton ||
      !this.menuButton ||
      !this.musicSliders ||
      !this.saveSlotRows
    ) {
      return;
    }

    const layout = getPauseOverlayLayout(this.scene);

    this.blocker.setPosition(layout.left, layout.top);
    this.blocker.setSize(layout.width, layout.height);
    drawPauseOverlayBackdrop(this.dimmer, this.panel, layout);

    this.titleText.setPosition(layout.centerX, layout.titleY);
    this.subtitleText.setPosition(layout.centerX, layout.subtitleY);
    this.hintText.setPosition(layout.centerX, layout.hintY);
    this.hintText.setWordWrapWidth(Math.max(280, layout.panelWidth - 88));
    this.musicVisible = layout.musicVisible;
    this.saveSlotsVisible = layout.saveSlotsVisible;
    this.actionButtonsVisible = layout.actionButtonsVisible;
    this.subtitleVisible = layout.subtitleVisible;
    this.hintVisible = layout.hintVisible;
    this.musicHeaderText.setPosition(layout.musicHeaderX, layout.musicHeaderY);
    this.savesHeaderText.setPosition(layout.saveHeaderX, layout.saveHeaderY);
    this.statusText.setPosition(layout.statusX, layout.statusY);
    this.statusText.setWordWrapWidth(Math.max(280, layout.panelWidth - 96));

    setMusicSliderClusterPosition(this.musicSliders, layout.sliderX, layout.sliderStartY, PAUSE_OVERLAY_SLIDER_SPACING);
    setPauseSaveSlotRowsPosition(this.saveSlotRows, layout.slotRows);
    this.resumeButton.setPosition(layout.resumeButtonX, layout.resumeButtonY);
    this.saveButton.setPosition(layout.saveButtonX, layout.saveButtonY);
    this.loadButton.setPosition(layout.loadButtonX, layout.loadButtonY);
    this.menuButton.setPosition(layout.menuButtonX, layout.menuButtonY);
  }

  destroy(): void {
    if (!this.scene) {
      return;
    }

    this.scene.scale.off(Phaser.Scale.Events.RESIZE, this.relayout, this);

    this.resumeButton?.destroy();
    this.saveButton?.destroy();
    this.loadButton?.destroy();
    this.menuButton?.destroy();
    destroyMusicSliderCluster(this.musicSliders);
    destroyPauseSaveSlotRows(this.saveSlotRows);

    this.blocker?.destroy();
    this.dimmer?.destroy();
    this.panel?.destroy();
    this.titleText?.destroy();
    this.subtitleText?.destroy();
    this.hintText?.destroy();
    this.musicHeaderText?.destroy();
    this.savesHeaderText?.destroy();
    this.statusText?.destroy();

    this.blocker = null;
    this.dimmer = null;
    this.panel = null;
    this.titleText = null;
    this.subtitleText = null;
    this.hintText = null;
    this.musicHeaderText = null;
    this.savesHeaderText = null;
    this.statusText = null;
    this.resumeButton = null;
    this.saveButton = null;
    this.loadButton = null;
    this.menuButton = null;
    this.musicSliders = null;
    this.saveSlotRows = null;
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
    this.musicHeaderText?.setDepth(depth + 3);
    this.savesHeaderText?.setDepth(depth + 3);
    this.statusText?.setDepth(depth + 3);
    if (this.resumeButton) {
      this.resumeButton.setDepth(depth + 3);
    }
    if (this.saveButton) {
      this.saveButton.setDepth(depth + 3);
    }
    if (this.loadButton) {
      this.loadButton.setDepth(depth + 3);
    }
    if (this.menuButton) {
      this.menuButton.setDepth(depth + 3);
    }
    if (this.musicSliders) {
      setMusicSliderClusterDepth(this.musicSliders, depth + 3);
    }
    if (this.saveSlotRows) {
      setPauseSaveSlotRowsDepth(this.saveSlotRows, depth + 3);
    }
  }

  private applyState(): void {
    if (
      !this.titleText ||
      !this.subtitleText ||
      !this.hintText ||
      !this.musicHeaderText ||
      !this.savesHeaderText ||
      !this.statusText ||
      !this.resumeButton ||
      !this.saveButton ||
      !this.loadButton ||
      !this.menuButton ||
      !this.blocker ||
      !this.dimmer ||
      !this.panel ||
      !this.musicSliders ||
      !this.saveSlotRows
    ) {
      return;
    }

    const shouldShow = this.state.visible;
    const canResume = this.state.canResume && !this.state.orientationBlocked;
    const message = getPauseOverlayMessage(this.state);
    const statusMessage = this.state.statusMessage ||
      (this.state.storageAvailable ? 'Select SAVE to overwrite a slot, LOAD to restore, or DEL to clear.' : 'Checkpoint storage unavailable in this browser.');

    this.titleText.setText(message.title);
    this.subtitleText.setText(message.subtitle);
    this.hintText.setText(message.hint);
    this.resumeButton.setLabel(message.resumeLabel);
    this.statusText.setText(statusMessage);
    this.statusText.setColor(this.state.statusOk === false || !this.state.storageAvailable ? '#ff9c7f' : '#72ecff');

    this.resumeButton.setEnabled(canResume);
    this.saveButton.setEnabled(this.state.storageAvailable && this.state.canSave);
    this.loadButton.setEnabled(this.state.storageAvailable && this.state.saveSlots.some((slot) => slot.occupied));
    this.menuButton.setEnabled(true);
    setPauseSaveSlotRowsState(this.saveSlotRows, this.state);

    this.blocker.setVisible(shouldShow);
    this.dimmer.setVisible(shouldShow);
    this.panel.setVisible(shouldShow);
    this.titleText.setVisible(shouldShow);
    this.subtitleText.setVisible(shouldShow && this.subtitleVisible);
    this.hintText.setVisible(shouldShow && this.hintVisible);
    this.musicHeaderText.setVisible(shouldShow && this.musicVisible);
    this.savesHeaderText.setVisible(shouldShow && this.saveSlotsVisible);
    this.statusText.setVisible(shouldShow);
    this.resumeButton.setVisible(shouldShow);
    this.saveButton.setVisible(shouldShow && this.actionButtonsVisible);
    this.loadButton.setVisible(shouldShow && this.actionButtonsVisible);
    this.menuButton.setVisible(shouldShow);
    setMusicSliderClusterVisible(this.musicSliders, shouldShow && this.musicVisible);
    setPauseSaveSlotRowsVisible(this.saveSlotRows, shouldShow && this.saveSlotsVisible);
  }

  private getPreferredLoadSlotId(): 'slot-1' | 'slot-2' | 'slot-3' {
    return this.state.saveSlots.find((slot) => slot.occupied)?.id ?? 'slot-1';
  }
}
