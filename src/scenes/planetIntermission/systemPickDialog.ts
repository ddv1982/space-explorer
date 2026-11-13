import type { ShipSystemId, ShipSystemSlotDef } from '../../config/shipSystems';
import { h, mountUiLayer } from '../../ui/dom';

export interface SystemPickDialog {
  destroy: () => void;
}

/**
 * A free pick of one ship system out of three, shown over the refit bay. With `current` null it is the
 * slot's first pick, offered before any shopping, and modal: the run carries on only once a system is
 * chosen, so nobody skips it by accident. With `current` set it is a free swap the player opened: the
 * current option is marked and focused, and Escape keeps it (reported as picking it again).
 */
export function createSystemPickDialog(
  slot: ShipSystemSlotDef,
  current: ShipSystemId | null,
  onPick: (id: ShipSystemId) => void
): SystemPickDialog {
  const options = slot.options.map((option) => {
    const description = h('span', { className: 'pick__detail', id: `pick-${option.id}-detail` }, option.description);
    const button = h(
      'button',
      {
        type: 'button',
        className: 'ui-btn pick__option',
        'aria-describedby': description.id,
        'aria-pressed': current ? String(option.id === current) : undefined,
      },
      h(
        'span',
        { className: 'pick__name' },
        option.name,
        option.id === current && h('span', { className: 'pick__current', 'aria-hidden': 'true' }, 'CURRENT')
      ),
      description
    );
    button.addEventListener('click', () => onPick(option.id));
    return button;
  });
  const sheet = h(
    'section',
    {
      className: 'ui-panel menu-sheet pick',
      role: 'dialog',
      'aria-modal': 'true',
      'aria-labelledby': 'pick-title',
      tabIndex: -1,
    },
    h('div', { className: 'ui-frame', 'aria-hidden': 'true' }),
    h('p', { className: 'ui-caption' }, current ? 'SWAP SHIP SYSTEM  ·  FREE' : 'NEW SHIP SYSTEM  ·  FREE'),
    h('h2', { className: 'ui-heading', id: 'pick-title' }, `${current ? 'SWAP' : 'CHOOSE'} YOUR ${slot.title}`),
    h('div', { className: 'pick__options' }, ...options)
  );
  const modal = h('div', { className: 'ui-modal' }, sheet);
  // Arrow keys and Tab cycle through the three options and never leave the dialog; Enter and Space
  // pick the focused one natively.
  modal.addEventListener('keydown', (event) => {
    if (event.code === 'Escape' && current) {
      // Handled here: the bay behind must not also read Escape as "carry on".
      event.preventDefault();
      event.stopPropagation();
      onPick(current);
      return;
    }
    const forward =
      event.code === 'ArrowDown' || event.code === 'ArrowRight' || (event.code === 'Tab' && !event.shiftKey);
    const backward = event.code === 'ArrowUp' || event.code === 'ArrowLeft' || (event.code === 'Tab' && event.shiftKey);
    if (!forward && !backward) return;
    event.preventDefault();
    const focused = options.indexOf(document.activeElement as HTMLButtonElement);
    const next = options[(focused + (forward ? 1 : -1) + options.length) % options.length];
    next.focus({ preventScroll: true });
    // On a short screen the list scrolls: bring the focused option, ring and all, into view.
    next.scrollIntoView({ block: 'nearest' });
  });

  // The dialog lives in its own layer above the refit bay; the scene makes the bay inert meanwhile.
  const layer = mountUiLayer();
  layer.append(modal);
  // A first pick starts on the first option; a swap starts on the current one.
  const currentIndex = slot.options.findIndex((option) => option.id === current);
  const initial = options[Math.max(0, currentIndex)];
  initial.focus({ preventScroll: true });
  initial.scrollIntoView({ block: 'nearest' });
  return { destroy: () => layer.remove() };
}
