import Phaser from 'phaser';
import { getGameplayDifficultyTier } from '../../config/gameplayDifficulty';
import { getVisualQualityTier } from '../../config/visualQuality';
import { UI_FONT_DISPLAY, UI_FONT_MONO } from '../../utils/uiFonts';
import { createActionButtonControl, type ActionButtonControl } from '../shared/actionButtonControl';
import { createSettingsPanel, type SettingsPanel } from '../shared/settingsPanel';
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
} from './pauseOverlay/view';

function createDefaultPauseOverlayState(): PauseOverlayState {
  return {
    visible: false,
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
  private savesHeaderText: Phaser.GameObjects.Text | null = null;
  private statusText: Phaser.GameObjects.Text | null = null;
  private resumeButton: ActionButtonControl | null = null;
  private menuButton: ActionButtonControl | null = null;
  private checkpointTab: ActionButtonControl | null = null;
  private settingsTab: ActionButtonControl | null = null;
  private settingsPanel: SettingsPanel | null = null;
  private saveSlotRows: PauseSaveSlotRows | null = null;
  private saveSlotsVisible = true;
  private saveHeaderVisible = true;
  private subtitleVisible = true;
  private hintVisible = true;
  private activeSubview: 'checkpoints' | 'settings' = 'checkpoints';

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
      fontFamily: UI_FONT_DISPLAY,
      stroke: '#42c9ff',
      strokeThickness: 2,
    }).setOrigin(0.5);
    this.subtitleText = scene.add.text(0, 0, '', {
      fontSize: '16px',
      color: '#d5e6f6',
      fontFamily: UI_FONT_MONO,
      align: 'center',
    }).setOrigin(0.5);
    this.hintText = scene.add.text(0, 0, '', {
      fontSize: '14px',
      color: '#7fa8df',
      fontFamily: UI_FONT_MONO,
      align: 'center',
      wordWrap: { width: 650 },
    }).setOrigin(0.5);
    this.savesHeaderText = scene.add.text(0, 0, 'CHECKPOINT SLOTS', {
      fontSize: '14px',
      color: '#ffbf6b',
      fontFamily: UI_FONT_MONO,
      fontStyle: 'bold',
    });
    this.statusText = scene.add.text(0, 0, '', {
      fontSize: '13px',
      color: '#72ecff',
      fontFamily: UI_FONT_MONO,
      align: 'center',
      wordWrap: { width: 620 },
    }).setOrigin(0.5);

    const initialLayout = getPauseOverlayLayout(scene);
    this.settingsPanel = createSettingsPanel(scene, {
      layout: initialLayout.settingsLayout,
      difficulty: getGameplayDifficultyTier(),
      quality: getVisualQualityTier(),
      onSelectDifficulty: (tier) => this.handlers?.onSelectDifficulty(tier) ?? false,
      onSelectQuality: (tier) => this.handlers?.onSelectQuality(tier) ?? false,
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
    this.menuButton = createActionButtonControl(scene, {
      label: '⌂\nMAIN MENU',
      width: PAUSE_OVERLAY_BUTTON_WIDTH,
      height: PAUSE_OVERLAY_BUTTON_HEIGHT,
      onClick: () => this.handlers?.onMainMenu(),
      variant: 'secondary',
    });
    this.checkpointTab = createActionButtonControl(scene, {
      label: 'CHECKPOINTS', width: initialLayout.tabWidth, height: initialLayout.tabHeight,
      onClick: () => this.selectSubview('checkpoints'), variant: 'primary', fontSize: '11px',
    });
    this.settingsTab = createActionButtonControl(scene, {
      label: 'SETTINGS', width: initialLayout.tabWidth, height: initialLayout.tabHeight,
      onClick: () => this.selectSubview('settings'), variant: 'secondary', fontSize: '11px',
    });

    this.setDepth(900);

    scene.scale.off(Phaser.Scale.Events.RESIZE, this.relayout, this);
    scene.scale.on(Phaser.Scale.Events.RESIZE, this.relayout, this);

    this.relayout();
    this.applyState();

    return this;
  }

  setState(nextState: Partial<PauseOverlayState>): void {
    if (nextState.visible === true && !this.state.visible) this.activeSubview = 'checkpoints';
    this.state.visible = nextState.visible ?? this.state.visible;
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
      !this.savesHeaderText ||
      !this.statusText ||
      !this.resumeButton ||
      !this.menuButton ||
      !this.settingsPanel ||
      !this.checkpointTab ||
      !this.settingsTab ||
      !this.saveSlotRows
    ) {
      return;
    }

    const layout = getPauseOverlayLayout(this.scene);

    this.blocker.setPosition(layout.left, layout.top);
    this.blocker.setSize(layout.width, layout.height);
    drawPauseOverlayBackdrop(this.dimmer, this.panel, layout);

    this.titleText.setFontSize(layout.titleFontSize);
    const maxTitleWidth = Math.max(180, layout.panelWidth - 64);
    if (this.titleText.width > maxTitleWidth) {
      const scaled = Math.floor((layout.titleFontSize * maxTitleWidth) / this.titleText.width);
      this.titleText.setFontSize(Math.max(28, scaled));
    }
    this.subtitleText.setFontSize(layout.subtitleFontSize);
    this.hintText.setFontSize(layout.hintFontSize);
    this.titleText.setPosition(layout.centerX, layout.titleY);
    this.subtitleText.setPosition(layout.centerX, layout.subtitleY);
    this.hintText.setPosition(layout.centerX, layout.hintY);
    this.hintText.setWordWrapWidth(Math.max(280, layout.panelWidth - 88));
    this.saveSlotsVisible = layout.saveSlotsVisible;
    this.saveHeaderVisible = layout.saveHeaderVisible;
    this.subtitleVisible = layout.subtitleVisible;
    this.hintVisible = layout.hintVisible;
    this.savesHeaderText.setPosition(layout.saveHeaderX, layout.saveHeaderY);
    this.statusText.setPosition(layout.statusX, layout.statusY);
    this.statusText.setWordWrapWidth(Math.max(280, layout.panelWidth - 96));

    this.settingsPanel.setLayout(layout.settingsLayout);
    setPauseSaveSlotRowsPosition(this.saveSlotRows, layout.slotRows);
    this.resumeButton.setPosition(layout.resumeButtonX, layout.resumeButtonY);
    this.menuButton.setPosition(layout.menuButtonX, layout.menuButtonY);
    this.checkpointTab.setPosition(layout.checkpointTabX, layout.tabY);
    this.settingsTab.setPosition(layout.settingsTabX, layout.tabY);
    this.applyState();
  }

  destroy(): void {
    if (!this.scene) {
      return;
    }

    this.scene.scale.off(Phaser.Scale.Events.RESIZE, this.relayout, this);

    this.resumeButton?.destroy();
    this.menuButton?.destroy();
    this.checkpointTab?.destroy();
    this.settingsTab?.destroy();
    this.settingsPanel?.destroy();
    destroyPauseSaveSlotRows(this.saveSlotRows);

    this.blocker?.destroy();
    this.dimmer?.destroy();
    this.panel?.destroy();
    this.titleText?.destroy();
    this.subtitleText?.destroy();
    this.hintText?.destroy();
    this.savesHeaderText?.destroy();
    this.statusText?.destroy();

    this.blocker = null;
    this.dimmer = null;
    this.panel = null;
    this.titleText = null;
    this.subtitleText = null;
    this.hintText = null;
    this.savesHeaderText = null;
    this.statusText = null;
    this.resumeButton = null;
    this.menuButton = null;
    this.checkpointTab = null;
    this.settingsTab = null;
    this.settingsPanel = null;
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
    this.savesHeaderText?.setDepth(depth + 3);
    this.statusText?.setDepth(depth + 3);
    if (this.resumeButton) {
      this.resumeButton.setDepth(depth + 3);
    }
    if (this.menuButton) {
      this.menuButton.setDepth(depth + 3);
    }
    this.checkpointTab?.setDepth(depth + 3);
    this.settingsTab?.setDepth(depth + 3);
    this.settingsPanel?.setDepth(depth + 3);
    if (this.saveSlotRows) {
      setPauseSaveSlotRowsDepth(this.saveSlotRows, depth + 3);
    }
  }

  private applyState(): void {
    if (
      !this.titleText ||
      !this.subtitleText ||
      !this.hintText ||
      !this.savesHeaderText ||
      !this.statusText ||
      !this.resumeButton ||
      !this.menuButton ||
      !this.blocker ||
      !this.dimmer ||
      !this.panel ||
      !this.settingsPanel ||
      !this.checkpointTab ||
      !this.settingsTab ||
      !this.saveSlotRows
    ) {
      return;
    }

    const shouldShow = this.state.visible;
    const canResume = this.state.canResume;
    const message = getPauseOverlayMessage();
    const statusMessage = this.state.statusMessage || (this.activeSubview === 'settings'
      ? 'Quality applies after restart.'
      : this.state.storageAvailable ? 'Select SAVE to overwrite a slot, LOAD to restore, or DEL to clear.' : 'Checkpoint storage unavailable in this browser.');

    this.titleText.setText(message.title);
    this.subtitleText.setText(message.subtitle);
    this.hintText.setText(this.activeSubview === 'settings' ? message.settingsHint : message.checkpointHint);
    this.resumeButton.setLabel(message.resumeLabel);
    this.statusText.setText(statusMessage);
    this.statusText.setColor(this.state.statusOk === false || (this.activeSubview === 'checkpoints' && !this.state.storageAvailable) ? '#ff9c7f' : '#72ecff');

    this.resumeButton.setEnabled(canResume);
    this.menuButton.setEnabled(true);
    setPauseSaveSlotRowsState(this.saveSlotRows, this.state);

    this.blocker.setVisible(shouldShow);
    this.dimmer.setVisible(shouldShow);
    this.panel.setVisible(shouldShow);
    this.titleText.setVisible(shouldShow);
    this.subtitleText.setVisible(shouldShow && this.subtitleVisible);
    this.hintText.setVisible(shouldShow && this.hintVisible);
    const checkpointsVisible = shouldShow && this.activeSubview === 'checkpoints';
    const settingsVisible = shouldShow && this.activeSubview === 'settings';
    this.savesHeaderText.setVisible(checkpointsVisible && this.saveSlotsVisible && this.saveHeaderVisible);
    this.statusText.setVisible(shouldShow);
    this.resumeButton.setVisible(shouldShow);
    this.menuButton.setVisible(shouldShow);
    this.checkpointTab.setVisible(shouldShow);
    this.settingsTab.setVisible(shouldShow);
    this.checkpointTab.setVariant(this.activeSubview === 'checkpoints' ? 'primary' : 'secondary');
    this.settingsTab.setVariant(this.activeSubview === 'settings' ? 'primary' : 'secondary');
    this.settingsPanel.setVisible(settingsVisible);
    setPauseSaveSlotRowsVisible(this.saveSlotRows, checkpointsVisible && this.saveSlotsVisible);
  }

  private selectSubview(subview: 'checkpoints' | 'settings'): void {
    if (subview === this.activeSubview) return;
    this.activeSubview = subview;
    this.applyState();
  }

}
