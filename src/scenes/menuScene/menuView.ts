import type { SaveSlotId, SaveSlotViewModel } from '../../systems/SaveSlotStorage';
import { getAutoFireSettings } from '../../config/autoFireSettings';
import { isTouchMobileDevice } from '../../utils/device';
import { h, mountUiLayer, releaseFocus, setStatus } from '../../ui/dom';
import { createSettingsForm, type SettingsForm } from '../../ui/settingsForm';

interface MenuViewHandlers {
  onNewRun: () => void;
  onLoadSlot: (slotId: SaveSlotId) => void;
  onDeleteSlot: (slotId: SaveSlotId) => void;
  /** Opening or closing the settings sheet (plays the menu click). */
  onToggleSettings: () => void;
  settings: Omit<Parameters<typeof createSettingsForm>[0], 'captions'>;
}

export interface MenuView {
  /** The empty band the canvas hero ship flies in. */
  heroSlot: HTMLElement;
  settings: SettingsForm;
  refreshSlots: (slots: SaveSlotViewModel[], storageAvailable: boolean) => void;
  setStatus: (message: string, isError?: boolean) => void;
  closeSettings: () => void;
  destroy: () => void;
}

interface SlotCard {
  element: HTMLElement;
  refresh: (model: SaveSlotViewModel | undefined, storageAvailable: boolean) => void;
}

/** A save slot as a glass card: tap to resume, DEL to clear; dim and inert when empty. */
function createSlotCard(slotNumber: number, handlers: MenuViewHandlers): SlotCard {
  const slotId = `slot-${slotNumber}` as SaveSlotId;
  const title = h('span', { className: 'menu-slot__title ui-ellipsis' });
  const detail = h('span', { className: 'menu-slot__detail ui-ellipsis' });
  const savedAt = h('span', { className: 'menu-slot__time ui-ellipsis' });
  const load = h('button', { type: 'button', className: 'ui-btn menu-slot__load' }, title, detail, savedAt);
  const del = h('button', { type: 'button', className: 'ui-btn ui-btn--danger menu-slot__del' }, 'DEL');
  load.addEventListener('click', () => handlers.onLoadSlot(slotId));
  del.addEventListener('click', () => handlers.onDeleteSlot(slotId));
  const element = h('div', { className: 'menu-slot' }, load, del);

  return {
    element,
    refresh(model, storageAvailable) {
      const occupied = Boolean(model?.occupied);
      const name = model?.title || `SLOT ${slotNumber}`;
      element.toggleAttribute('data-occupied', occupied);
      title.textContent = name;
      detail.textContent = model?.subtitle || 'EMPTY';
      savedAt.textContent = occupied ? (model?.savedAtLabel ?? '') : '';
      savedAt.hidden = !occupied;
      load.disabled = !occupied || !storageAvailable;
      load.setAttribute('aria-label', `Load ${name}`);
      del.setAttribute('aria-label', `Delete ${name}`);
      del.hidden = !occupied;
    },
  };
}

/**
 * The command deck in HTML: kicker, glowing title and tagline, an empty band where the canvas hero
 * flies, NEW RUN, the save-slot cards, SETTINGS and a status line, plus the settings sheet.
 */
export function createMenuView(handlers: MenuViewHandlers): MenuView {
  // Read when shown, so the fire part follows an autofire change made in the settings sheet.
  const idleHint = (): string => {
    const autoFire = getAutoFireSettings();
    return isTouchMobileDevice()
      ? `DRAG TO FLY  ·  ${autoFire.touch ? 'GUNS FIRE AUTOMATICALLY' : 'TOUCH TO FIRE'}`
      : `WASD / ARROWS TO FLY  ·  ${autoFire.keyboard ? 'GUNS FIRE AUTOMATICALLY' : 'SPACE TO FIRE'}  ·  ESC TO PAUSE`;
  };

  const heroSlot = h('div', { className: 'menu__hero' });
  const launch = h(
    'button',
    { type: 'button', className: 'ui-btn ui-btn--primary' },
    h('span', { className: 'menu__chevron', 'aria-hidden': 'true' }),
    'NEW RUN'
  );
  launch.addEventListener('click', handlers.onNewRun);
  const cards = [1, 2, 3].map((slotNumber) => createSlotCard(slotNumber, handlers));
  const settingsButton = h('button', { type: 'button', className: 'ui-btn menu__settings' }, 'SETTINGS');
  const status = h('p', { className: 'ui-status menu__status' });

  const home = h(
    'div',
    { className: 'menu__deck' },
    heroSlot,
    h(
      'div',
      { className: 'menu__run' },
      h('div', { className: 'menu__launch' }, launch),
      h('div', { className: 'menu__slots' }, ...cards.map((card) => card.element))
    ),
    settingsButton
  );
  const lockup = h(
    'header',
    { className: 'menu__lockup' },
    h('p', { className: 'menu__kicker' }, 'COMMAND DECK'),
    h('h1', { className: 'ui-title menu__title' }, 'SPACE EXPLORER'),
    h('p', { className: 'menu__tagline' }, 'TEN HOSTILE SECTORS. ONE SHIP.')
  );

  const settings = createSettingsForm({ captions: true, ...handlers.settings });
  const done = h('button', { type: 'button', className: 'ui-btn ui-btn--primary menu-sheet__done' }, 'DONE');
  const sheet = h(
    'section',
    {
      className: 'ui-panel menu-sheet',
      role: 'dialog',
      'aria-modal': 'true',
      'aria-labelledby': 'menu-settings-title',
      tabIndex: -1,
    },
    h('div', { className: 'ui-frame', 'aria-hidden': 'true' }),
    h('h2', { className: 'ui-heading', id: 'menu-settings-title' }, 'SETTINGS'),
    settings.element,
    done
  );
  const modal = h('div', { className: 'ui-modal', hidden: true }, sheet);

  const setOpen = (open: boolean): void => {
    if (open === !modal.hidden) return;
    handlers.onToggleSettings();
    if (!open) releaseFocus(modal);
    modal.hidden = !open;
    lockup.inert = open;
    home.inert = open;
    if (open) {
      settings.sync();
      sheet.focus({ preventScroll: true });
    } else {
      settingsButton.focus({ preventScroll: true });
      // An idle footer re-reads the controls line, which may now say the guns fire automatically.
      if (status.dataset.tone === 'idle') setStatus(status, idleHint(), 'idle');
    }
  };
  settingsButton.addEventListener('click', () => setOpen(true));
  done.addEventListener('click', () => setOpen(false));

  const layer = mountUiLayer();
  layer.append(h('div', { className: 'menu' }, lockup, home, status), modal);

  return {
    heroSlot,
    settings,
    refreshSlots(slots, storageAvailable) {
      cards.forEach((card, index) => card.refresh(slots[index], storageAvailable));
    },
    setStatus(message, isError = false) {
      setStatus(status, message || idleHint(), isError ? 'error' : message ? 'info' : 'idle');
    },
    closeSettings: () => setOpen(false),
    destroy: () => layer.remove(),
  };
}
