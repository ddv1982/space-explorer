import Phaser from 'phaser';
import { getGameplayDifficultyTier } from '../../config/gameplayDifficulty';
import { getVisualQualityTier } from '../../config/visualQuality';
import { audioManager } from '../../systems/AudioManager';
import {
  mountAccessibleActionLayer,
  type AccessibleAction,
  type AccessibleActionLayerHandle,
} from '../shared/accessibleActionLayer';
import { createActionButtonControl, type ActionButtonControl } from '../shared/actionButtonControl';
import { addNeonTitle, NEON_TEXT, neonLabelStyle } from '../shared/neonUiTheme';
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
import { createPauseTabs, type PauseTabs } from './pauseOverlay/tabs';
import type { PauseOverlayHandlers, PauseOverlayLayout, PauseOverlayState, PauseSubview } from './pauseOverlay/types';
import {
  drawPauseOverlayBackdrop,
  getPauseOverlayLayout,
  PAUSE_OVERLAY_BUTTON_HEIGHT,
  PAUSE_OVERLAY_BUTTON_WIDTH,
} from './pauseOverlay/view';

const OVERLAY_DEPTH = 900;
/** Shown under the settings subview until the controller reports something more specific. */
const SETTINGS_NOTE = 'Quality applies after restart.';
/** Announced to assistive technology only; sighted players read the slot cards instead. */
const CHECKPOINTS_SPOKEN_NOTE = 'Save, load or delete a checkpoint slot.';
const STORAGE_UNAVAILABLE_NOTE = 'Checkpoint storage unavailable in this browser.';

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
  private statusText: Phaser.GameObjects.Text | null = null;
  private keyHintText: Phaser.GameObjects.Text | null = null;
  private resumeButton: ActionButtonControl | null = null;
  private menuButton: ActionButtonControl | null = null;
  private tabs: PauseTabs | null = null;
  private settingsPanel: SettingsPanel | null = null;
  private teardownAccessibleActions?: AccessibleActionLayerHandle;
  private saveSlotRows: PauseSaveSlotRows | null = null;
  private keyHintVisible = false;
  private activeSubview: PauseSubview = 'checkpoints';
  private accessibleStatusMessage = '';
  private paintedStatusMessage = '';

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
    this.statusText = scene.add
      .text(0, 0, '', { ...neonLabelStyle(14, NEON_TEXT.cyan, 0.8), align: 'center' })
      .setOrigin(0.5);
    this.keyHintText = scene.add.text(0, 0, 'ESC  RESUME', neonLabelStyle(12, NEON_TEXT.muted, 2)).setOrigin(0.5);

    const initialLayout = getPauseOverlayLayout(scene);
    this.settingsPanel = createSettingsPanel(scene, {
      layout: initialLayout.settingsLayout,
      difficulty: getGameplayDifficultyTier(),
      quality: getVisualQualityTier(),
      onSelectDifficulty: (tier) => this.handlers?.onSelectDifficulty(tier) ?? false,
      onSelectQuality: (tier) => this.handlers?.onSelectQuality(tier) ?? false,
      onMusicValueChanged: () => this.syncAccessibleActions(this.state.visible),
    });
    this.saveSlotRows = createPauseSaveSlotRows(scene, {
      onSaveSlot: (slotId) => this.handlers?.onSaveSlot(slotId),
      onLoadSlot: (slotId) => this.handlers?.onLoadSlot(slotId),
      onDeleteSlot: (slotId) => this.handlers?.onDeleteSlot(slotId),
    });
    this.resumeButton = createActionButtonControl(scene, {
      label: 'RESUME',
      width: PAUSE_OVERLAY_BUTTON_WIDTH,
      height: PAUSE_OVERLAY_BUTTON_HEIGHT,
      onClick: () => this.handlers?.onResume(),
      variant: 'primary',
      fontSize: '18px',
    });
    this.menuButton = createActionButtonControl(scene, {
      label: 'MAIN MENU',
      width: PAUSE_OVERLAY_BUTTON_WIDTH,
      height: PAUSE_OVERLAY_BUTTON_HEIGHT,
      onClick: () => this.handlers?.onMainMenu(),
      variant: 'secondary',
      fontSize: '18px',
    });
    this.tabs = createPauseTabs(scene, (subview) => this.selectSubview(subview));

    this.setDepth(OVERLAY_DEPTH);

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
    const statusMessageChanged =
      nextState.statusMessage !== undefined && nextState.statusMessage !== this.state.statusMessage;
    if (statusMessageChanged) this.accessibleStatusMessage = '';
    this.state.statusMessage = nextState.statusMessage ?? this.state.statusMessage;
    this.state.statusOk =
      nextState.statusOk ?? (nextState.statusMessage === '' || statusMessageChanged ? true : this.state.statusOk);
    this.applyState();
  }

  relayout(): void {
    if (
      !this.scene ||
      !this.blocker ||
      !this.dimmer ||
      !this.panel ||
      !this.statusText ||
      !this.keyHintText ||
      !this.resumeButton ||
      !this.menuButton ||
      !this.settingsPanel ||
      !this.tabs ||
      !this.saveSlotRows
    ) {
      return;
    }

    const layout = getPauseOverlayLayout(this.scene);

    this.blocker.setPosition(layout.left, layout.top);
    this.blocker.setSize(layout.width, layout.height);
    drawPauseOverlayBackdrop(this.dimmer, this.panel, layout);
    this.paintTitle(this.scene, layout);

    this.statusText.setPosition(layout.statusX, layout.statusY);
    this.statusText.setWordWrapWidth(layout.statusWrapWidth);
    this.keyHintText.setPosition(layout.centerX, layout.keyHintY);
    this.keyHintVisible = layout.keyHintVisible;

    this.tabs.setLayout(layout);
    this.settingsPanel.setLayout(layout.settingsLayout);
    setPauseSaveSlotRowsPosition(this.saveSlotRows, layout.slotRows);
    this.resumeButton.setPosition(layout.resumeButtonX, layout.resumeButtonY);
    this.menuButton.setPosition(layout.menuButtonX, layout.menuButtonY);
    this.applyState();
  }

  destroy(): void {
    this.teardownAccessibleActions?.();
    this.teardownAccessibleActions = undefined;
    if (!this.scene) {
      return;
    }

    this.scene.scale.off(Phaser.Scale.Events.RESIZE, this.relayout, this);

    this.resumeButton?.destroy();
    this.menuButton?.destroy();
    this.tabs?.destroy();
    this.settingsPanel?.destroy();
    destroyPauseSaveSlotRows(this.saveSlotRows);

    this.blocker?.destroy();
    this.dimmer?.destroy();
    this.panel?.destroy();
    this.titleText?.destroy();
    this.statusText?.destroy();
    this.keyHintText?.destroy();

    this.blocker = null;
    this.dimmer = null;
    this.panel = null;
    this.titleText = null;
    this.statusText = null;
    this.keyHintText = null;
    this.resumeButton = null;
    this.menuButton = null;
    this.tabs = null;
    this.settingsPanel = null;
    this.saveSlotRows = null;
    this.handlers = null;
    this.scene = null;
  }

  /** The glowing title bakes its size into its texture, so a relayout repaints it. */
  private paintTitle(scene: Phaser.Scene, layout: PauseOverlayLayout): void {
    this.titleText?.destroy();
    this.titleText = addNeonTitle(
      scene,
      layout.titleX,
      layout.titleY,
      'PAUSED',
      layout.titleFontSize,
      OVERLAY_DEPTH + 3
    ).setOrigin(layout.titleCentered ? 0.5 : 0, 0.5);
  }

  private setDepth(depth: number): void {
    this.blocker?.setDepth(depth);
    this.dimmer?.setDepth(depth + 1);
    this.panel?.setDepth(depth + 2);
    this.statusText?.setDepth(depth + 3);
    this.keyHintText?.setDepth(depth + 3);
    this.resumeButton?.setDepth(depth + 3);
    this.menuButton?.setDepth(depth + 3);
    this.tabs?.setDepth(depth + 3);
    this.settingsPanel?.setDepth(depth + 3);
    if (this.saveSlotRows) {
      setPauseSaveSlotRowsDepth(this.saveSlotRows, depth + 3);
    }
  }

  private applyState(): void {
    if (
      !this.titleText ||
      !this.statusText ||
      !this.keyHintText ||
      !this.resumeButton ||
      !this.menuButton ||
      !this.blocker ||
      !this.dimmer ||
      !this.panel ||
      !this.settingsPanel ||
      !this.tabs ||
      !this.saveSlotRows
    ) {
      return;
    }

    const shouldShow = this.state.visible;
    const onCheckpoints = this.activeSubview === 'checkpoints';
    const storageMissing = onCheckpoints && !this.state.storageAvailable;
    const note = onCheckpoints ? (storageMissing ? STORAGE_UNAVAILABLE_NOTE : '') : SETTINGS_NOTE;
    const statusMessage = this.state.statusMessage || note;
    this.paintedStatusMessage = statusMessage;

    this.statusText.setText(statusMessage);
    this.statusText.setColor(
      this.state.statusOk === false || storageMissing
        ? NEON_TEXT.danger
        : this.state.statusMessage
          ? NEON_TEXT.cyan
          : NEON_TEXT.muted
    );

    this.resumeButton.setEnabled(this.state.canResume);
    this.menuButton.setEnabled(true);
    this.tabs.setActive(this.activeSubview);
    setPauseSaveSlotRowsState(this.saveSlotRows, this.state);

    this.blocker.setVisible(shouldShow);
    this.dimmer.setVisible(shouldShow);
    this.panel.setVisible(shouldShow);
    this.titleText.setVisible(shouldShow);
    this.statusText.setVisible(shouldShow);
    this.keyHintText.setVisible(shouldShow && this.keyHintVisible);
    this.resumeButton.setVisible(shouldShow);
    this.menuButton.setVisible(shouldShow);
    this.tabs.setVisible(shouldShow);
    this.settingsPanel.setVisible(shouldShow && !onCheckpoints);
    setPauseSaveSlotRowsVisible(this.saveSlotRows, shouldShow && onCheckpoints);
    this.syncAccessibleActions(shouldShow);
  }

  private syncAccessibleActions(visible: boolean): void {
    if (!visible || !this.handlers) {
      this.teardownAccessibleActions?.();
      this.teardownAccessibleActions = undefined;
      return;
    }

    const handlers = this.handlers;
    const checkpointActions: AccessibleAction[] = this.state.saveSlots.flatMap((slot) => [
      {
        name: `save-${slot.id}`,
        label: `Save to ${slot.title}`,
        disabled: !this.state.storageAvailable || !this.state.canSave,
        activate: () => handlers.onSaveSlot(slot.id),
      },
      {
        name: `load-${slot.id}`,
        label: `Load ${slot.title}`,
        description: slot.occupied ? `${slot.subtitle}, ${slot.savedAtLabel}` : 'Empty slot',
        disabled: !this.state.storageAvailable || !slot.occupied,
        activate: () => handlers.onLoadSlot(slot.id),
      },
      {
        name: `delete-${slot.id}`,
        label: `Delete ${slot.title}`,
        disabled: !this.state.storageAvailable || !slot.occupied,
        activate: () => handlers.onDeleteSlot(slot.id),
      },
    ]);
    const settingsActions: AccessibleAction[] = [
      ...(['low', 'normal', 'high'] as const).map((tier) => ({
        name: `difficulty-${tier}`,
        label: `Set difficulty ${tier}`,
        selected: getGameplayDifficultyTier() === tier,
        activate: () => {
          if (handlers.onSelectDifficulty(tier)) this.settingsPanel?.setDifficulty(tier);
        },
      })),
      ...(['low', 'standard', 'high', 'auto'] as const).map((tier) => ({
        name: `quality-${tier}`,
        label: `Set visual quality ${tier}`,
        selected: getVisualQualityTier() === tier,
        activate: () => {
          if (handlers.onSelectQuality(tier)) this.settingsPanel?.setQuality(tier);
        },
      })),
      ...this.createAccessibleMusicActions(),
    ];
    const options = {
      label: 'Paused',
      summary: `${this.activeSubview === 'checkpoints' ? 'Checkpoint controls' : 'Game and music settings'}. Gameplay remains paused.`,
      status: {
        message:
          this.accessibleStatusMessage ||
          this.state.statusMessage ||
          this.paintedStatusMessage ||
          CHECKPOINTS_SPOKEN_NOTE,
        politeness:
          !this.accessibleStatusMessage && this.state.statusOk === false ? ('assertive' as const) : ('polite' as const),
      },
      actions: [
        { name: 'resume', label: 'Resume', disabled: !this.state.canResume, activate: () => handlers.onResume() },
        { name: 'main-menu', label: 'Main menu', activate: () => handlers.onMainMenu() },
        {
          name: 'checkpoints',
          label: 'Checkpoints',
          selected: this.activeSubview === 'checkpoints',
          activate: () => this.selectSubview('checkpoints'),
        },
        {
          name: 'settings',
          label: 'Settings',
          selected: this.activeSubview === 'settings',
          activate: () => this.selectSubview('settings'),
        },
        ...(this.activeSubview === 'checkpoints' ? checkpointActions : settingsActions),
      ],
    };
    if (this.teardownAccessibleActions) {
      this.teardownAccessibleActions.update(options);
    } else {
      this.teardownAccessibleActions = mountAccessibleActionLayer(options);
    }
  }

  private createAccessibleMusicActions(): AccessibleAction[] {
    const tuning = audioManager.getMusicRuntimeTuning();
    const values = { ...tuning, volume: audioManager.getMusicVolume() };
    return (Object.keys(values) as Array<keyof typeof values>).flatMap((key) => {
      const label = key === 'volume' ? 'music volume' : key;
      const description = `${Math.round(values[key] * 100)} percent`;
      return [
        {
          name: `decrease-${key}`,
          label: `Decrease ${label}`,
          description,
          disabled: values[key] <= 0,
          activate: () => this.adjustAccessibleMusicValue(key, -0.05),
        },
        {
          name: `increase-${key}`,
          label: `Increase ${label}`,
          description,
          disabled: values[key] >= 1,
          activate: () => this.adjustAccessibleMusicValue(key, 0.05),
        },
      ];
    });
  }

  private adjustAccessibleMusicValue(key: 'creativity' | 'energy' | 'ambience' | 'volume', delta: number): void {
    const current = key === 'volume' ? audioManager.getMusicVolume() : audioManager.getMusicRuntimeTuning()[key];
    const requested = Math.max(0, Math.min(1, current + delta));
    if (key === 'volume') {
      const value = audioManager.setMusicVolume(requested);
      this.settingsPanel?.setMusicValue(key, value);
      this.accessibleStatusMessage = `Music volume ${Math.round(value * 100)} percent.`;
    } else {
      const value = audioManager.setMusicRuntimeTuning({ [key]: requested })[key];
      this.settingsPanel?.setMusicValue(key, value);
      this.accessibleStatusMessage = `${key} ${Math.round(value * 100)} percent.`;
    }
    this.syncAccessibleActions(true);
  }

  private selectSubview(subview: PauseSubview): void {
    if (subview === this.activeSubview) return;
    this.activeSubview = subview;
    this.accessibleStatusMessage = '';
    this.applyState();
  }
}
