import type Phaser from 'phaser';
import { getGameplayDifficultyTier } from '../../config/gameplayDifficulty';
import { getVisualQualityTier } from '../../config/visualQuality';
import { describePickedShipSystems, NO_SHIP_SYSTEMS, type ShipSystemSlot } from '../../config/shipSystems';
import type { SaveSlotId, SaveSlotViewModel } from '../../systems/SaveSlotStorage';
import { h, mountUiLayer, releaseFocus, setStatus } from '../../ui/dom';
import { createSettingsForm } from '../../ui/settingsForm';
import type { PauseOverlayHandlers, PauseOverlayState, PauseSubview } from './pauseOverlay/types';

/** Shown under the settings subview until the controller reports something more specific. */
const SETTINGS_NOTE = 'Quality applies after restart.';
const STORAGE_UNAVAILABLE_NOTE = 'Checkpoint storage unavailable in this browser.';
const SUBVIEWS: ReadonlyArray<[PauseSubview, string]> = [
  ['checkpoints', 'CHECKPOINTS'],
  ['systems', 'SYSTEMS'],
  ['settings', 'SETTINGS'],
];
const SYSTEM_SLOTS: readonly ShipSystemSlot[] = ['gun', 'support', 'late'];

/** The status line: the controller's message, else a note about the active subview. */
export function describePauseStatus(
  state: Pick<PauseOverlayState, 'statusMessage' | 'statusOk' | 'storageAvailable'>,
  subview: PauseSubview
): { message: string; tone: 'idle' | 'info' | 'error' } {
  const storageMissing = subview === 'checkpoints' && !state.storageAvailable;
  const note = subview === 'settings' ? SETTINGS_NOTE : storageMissing ? STORAGE_UNAVAILABLE_NOTE : '';
  const tone = state.statusOk === false || storageMissing ? 'error' : state.statusMessage ? 'info' : 'idle';
  return { message: state.statusMessage || note, tone };
}

interface SlotRow {
  element: HTMLElement;
  refresh: (model: SaveSlotViewModel | undefined, state: PauseOverlayState) => void;
}

/** A checkpoint card with ghost SAVE / LOAD and a danger DEL; RESUME stays the panel's one solid key. */
function createSlotRow(slotNumber: number, handlers: PauseOverlayHandlers): SlotRow {
  const slotId = `slot-${slotNumber}` as SaveSlotId;
  const title = h('span', { className: 'pause-slot__title ui-ellipsis' });
  const subtitle = h('span', { className: 'pause-slot__sub ui-ellipsis' });
  const savedAt = h('span', { className: 'pause-slot__time' });
  const action = (label: string, onClick: (id: SaveSlotId) => void, danger = false): HTMLButtonElement => {
    const button = h(
      'button',
      { type: 'button', className: `ui-btn ui-btn--slim${danger ? ' ui-btn--danger' : ''}` },
      label
    );
    button.addEventListener('click', () => onClick(slotId));
    return button;
  };
  const save = action('SAVE', handlers.onSaveSlot);
  const load = action('LOAD', handlers.onLoadSlot);
  const del = action('DEL', handlers.onDeleteSlot, true);
  const element = h(
    'div',
    { className: 'ui-card pause-slot' },
    title,
    subtitle,
    savedAt,
    h('div', { className: 'pause-slot__actions' }, save, load, del)
  );

  return {
    element,
    refresh(model, state) {
      const occupied = Boolean(model?.occupied);
      const name = model?.title || `SLOT ${slotNumber}`;
      element.toggleAttribute('data-occupied', occupied);
      title.textContent = name;
      subtitle.textContent = model?.subtitle || 'EMPTY';
      savedAt.textContent = occupied ? (model?.savedAtLabel ?? '') : '';
      save.disabled = !state.storageAvailable || !state.canSave;
      load.disabled = del.disabled = !state.storageAvailable || !occupied;
      save.setAttribute('aria-label', `Save to ${name}`);
      load.setAttribute('aria-label', `Load ${name}`);
      del.setAttribute('aria-label', `Delete ${name}`);
    },
  };
}

interface SystemRow {
  element: HTMLElement;
  refresh: (state: PauseOverlayState) => void;
}

/**
 * A picked ship system: its slot, name and what it does. Support and doctrine get SWAP to cycle to the
 * slot's next option; the main gun is swapped in flight only, where its cooldown applies.
 */
function createSystemRow(slot: ShipSystemSlot, handlers: PauseOverlayHandlers): SystemRow {
  const kicker = h('span', { className: 'pause-system__slot' });
  const name = h('span');
  const description = h('span', { className: 'pause-slot__sub ui-ellipsis' });
  let swap: HTMLButtonElement | null = null;
  if (slot !== 'gun') {
    swap = h('button', { type: 'button', className: 'ui-btn ui-btn--slim' }, 'SWAP');
    swap.addEventListener('click', () => handlers.onCycleSystem(slot));
  }
  const element = h(
    'div',
    { className: 'ui-card pause-slot pause-system', 'data-occupied': '' },
    h('span', { className: 'pause-slot__title ui-ellipsis' }, kicker, name),
    description,
    ...(swap ? [h('div', { className: 'pause-slot__actions' }, swap)] : [])
  );

  return {
    element,
    refresh(state) {
      const picked = describePickedShipSystems(state.systems).find((system) => system.slot === slot);
      element.hidden = !picked;
      if (!picked) return;
      kicker.textContent = picked.title;
      name.textContent = picked.option.name;
      description.textContent = picked.option.description;
      swap?.setAttribute('aria-label', `Swap ${picked.title.toLowerCase()}, now ${picked.option.name}`);
    },
  };
}

/**
 * The pause panel in HTML over the frozen battlefield: PAUSED, a CHECKPOINTS / SYSTEMS / SETTINGS tab
 * strip (SYSTEMS only once the run has a ship system), the active subview, one status line and
 * RESUME / MAIN MENU. Reopening always starts on checkpoints.
 */
export class PauseOverlay {
  private layer: HTMLElement | null = null;
  private panel: HTMLElement | null = null;
  private status: HTMLElement | null = null;
  private resume: HTMLButtonElement | null = null;
  private hint: HTMLElement | null = null;
  private rows: SlotRow[] = [];
  private systemRows: SystemRow[] = [];
  private tabs = new Map<PauseSubview, { tab: HTMLButtonElement; view: HTMLElement }>();
  private syncSettings: (() => void) | null = null;
  private activeSubview: PauseSubview = 'checkpoints';
  private readonly state: PauseOverlayState = {
    visible: false,
    canResume: true,
    canSave: false,
    storageAvailable: false,
    saveSlots: [],
    systems: NO_SHIP_SYSTEMS,
    statusMessage: '',
  };

  static create(_scene: Phaser.Scene, handlers: PauseOverlayHandlers): PauseOverlay {
    return new PauseOverlay().create(handlers);
  }

  create(handlers: PauseOverlayHandlers): this {
    this.destroy();
    const layer = mountUiLayer();
    layer.hidden = true;

    this.rows = [1, 2, 3].map((slotNumber) => createSlotRow(slotNumber, handlers));
    this.systemRows = SYSTEM_SLOTS.map((slot) => createSystemRow(slot, handlers));
    const settings = createSettingsForm({
      captions: false,
      difficulty: getGameplayDifficultyTier(),
      quality: getVisualQualityTier(),
      onSelectDifficulty: (tier) => handlers.onSelectDifficulty(tier),
      onSelectQuality: (tier) => handlers.onSelectQuality(tier),
    });
    this.syncSettings = settings.sync;
    const views: Record<PauseSubview, HTMLElement> = {
      checkpoints: h('div', { className: 'pause__slots' }, ...this.rows.map((row) => row.element)),
      systems: h('div', { className: 'pause__slots' }, ...this.systemRows.map((row) => row.element)),
      settings: h('div', { className: 'pause__settings' }, settings.element),
    };
    const tabStrip = h('div', { className: 'ui-tabs', role: 'tablist' });
    for (const [subview, label] of SUBVIEWS) {
      const tab = h('button', { type: 'button', className: 'ui-tab', role: 'tab', id: `pause-tab-${subview}` }, label);
      const view = views[subview];
      view.setAttribute('role', 'tabpanel');
      view.setAttribute('aria-labelledby', tab.id);
      tab.addEventListener('click', () => this.selectSubview(subview));
      tabStrip.append(tab);
      this.tabs.set(subview, { tab, view });
    }

    this.resume = h('button', { type: 'button', className: 'ui-btn ui-btn--primary' }, 'RESUME');
    this.resume.addEventListener('click', () => handlers.onResume());
    const mainMenu = h('button', { type: 'button', className: 'ui-btn' }, 'MAIN MENU');
    mainMenu.addEventListener('click', () => handlers.onMainMenu());
    this.status = h('p', { className: 'ui-status pause__status' });
    this.hint = h('p', { className: 'pause__hint', 'aria-hidden': 'true' });
    this.panel = h(
      'section',
      {
        className: 'ui-panel pause__panel',
        role: 'dialog',
        'aria-modal': 'true',
        'aria-label': 'Paused',
        tabIndex: -1,
      },
      h('div', { className: 'ui-frame', 'aria-hidden': 'true' }),
      h('div', { className: 'pause__header' }, h('h2', { className: 'ui-title pause__title' }, 'PAUSED'), tabStrip),
      h('div', { className: 'pause__body' }, views.checkpoints, views.systems, views.settings),
      this.status,
      h('div', { className: 'pause__actions' }, this.resume, mainMenu),
      this.hint
    );
    layer.append(h('div', { className: 'pause' }, this.panel));
    this.layer = layer;
    this.applyState();
    return this;
  }

  setState(nextState: Partial<PauseOverlayState>): void {
    const opening = nextState.visible === true && !this.state.visible;
    if (opening) this.activeSubview = 'checkpoints';
    const statusMessageChanged =
      nextState.statusMessage !== undefined && nextState.statusMessage !== this.state.statusMessage;
    Object.assign(this.state, nextState);
    this.state.statusOk =
      nextState.statusOk ?? (nextState.statusMessage === '' || statusMessageChanged ? true : this.state.statusOk);
    this.applyState();
    if (opening) {
      this.syncSettings?.();
      this.panel?.focus({ preventScroll: true });
    }
  }

  destroy(): void {
    this.layer?.remove();
    this.layer = this.panel = this.status = this.resume = this.hint = this.syncSettings = null;
    this.rows = [];
    this.systemRows = [];
    this.tabs.clear();
  }

  private selectSubview(subview: PauseSubview): void {
    if (subview === this.activeSubview) return;
    this.activeSubview = subview;
    this.applyState();
  }

  private applyState(): void {
    if (!this.layer || !this.status || !this.resume || !this.hint) return;
    if (!this.state.visible) releaseFocus(this.layer);
    this.layer.hidden = !this.state.visible;
    this.resume.disabled = !this.state.canResume;
    this.rows.forEach((row, index) => row.refresh(this.state.saveSlots[index], this.state));
    this.systemRows.forEach((row) => row.refresh(this.state));
    this.hint.textContent = this.state.systems.gun ? 'ESC  RESUME      Q  SWAP GUN' : 'ESC  RESUME';
    for (const [subview, { tab, view }] of this.tabs) {
      const active = subview === this.activeSubview;
      if (subview === 'systems') tab.hidden = describePickedShipSystems(this.state.systems).length === 0;
      tab.setAttribute('aria-selected', String(active));
      view.toggleAttribute('data-inactive', !active);
      view.inert = !active;
    }
    const { message, tone } = describePauseStatus(this.state, this.activeSubview);
    setStatus(this.status, message, tone);
  }
}
