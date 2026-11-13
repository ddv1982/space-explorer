import { SPECIAL_GUN_CHARGE } from '../../config/shipSystems';
import { h, mountUiLayer } from '../../ui/dom';

export interface SpecialGunIntroCard {
  destroy: () => void;
}

/** The card belongs to the refit bay right before the first sector that flies Lance, and to no other. */
export function isSpecialGunIntroDue(clearedLevel: number): boolean {
  return clearedLevel === SPECIAL_GUN_CHARGE.fromLevel - 1;
}

/** The card's lines; touch names the on-screen swap key instead of Q. */
export function describeSpecialGunIntro(touch: boolean): readonly string[] {
  return [
    'Your main gun is now the LANCE: slower shots that pierce every ship in a line.',
    `${touch ? 'Tap the swap key' : 'Press Q'} to switch to SCATTER or SEEKERS.`,
    'Special guns run on a charge. When it is empty you drop back to the Lance, which refills it.',
  ];
}

/**
 * A short explanation of the special guns, shown over the refit bay before the shop opens. Nothing to
 * choose: CONTINUE (or Enter, Space, Escape) closes it, and focus never leaves it while it is open.
 */
export function createSpecialGunIntroCard(touch: boolean, onContinue: () => void): SpecialGunIntroCard {
  const done = h('button', { type: 'button', className: 'ui-btn ui-btn--primary menu-sheet__done' }, 'CONTINUE');
  done.addEventListener('click', onContinue);
  const sheet = h(
    'section',
    {
      className: 'ui-panel menu-sheet gun-intro',
      role: 'dialog',
      'aria-modal': 'true',
      'aria-labelledby': 'gun-intro-title',
      'aria-describedby': 'gun-intro-lines',
      tabIndex: -1,
    },
    h('div', { className: 'ui-frame', 'aria-hidden': 'true' }),
    h('p', { className: 'ui-caption' }, 'REFIT BAY  ·  NEW HARDWARE'),
    h('h2', { className: 'ui-heading', id: 'gun-intro-title' }, 'SPECIAL GUNS ONLINE'),
    h(
      'div',
      { className: 'gun-intro__lines', id: 'gun-intro-lines' },
      ...describeSpecialGunIntro(touch).map((line) => h('p', {}, line))
    ),
    done
  );
  const modal = h('div', { className: 'ui-modal' }, sheet);
  modal.addEventListener('keydown', (event) => {
    if (event.code === 'Escape') {
      // Handled here: the bay behind must not also read Escape as "carry on".
      event.preventDefault();
      event.stopPropagation();
      onContinue();
    } else if (event.code === 'Tab' || event.code.startsWith('Arrow')) {
      // One control: Tab and the arrows keep focus on it.
      event.preventDefault();
    }
  });
  // A press on the card itself must not pull focus off CONTINUE, or Enter would stop working.
  modal.addEventListener('mousedown', (event) => {
    if (event.target !== done) event.preventDefault();
  });

  // Its own layer above the refit bay; the scene makes the bay inert meanwhile.
  const layer = mountUiLayer();
  layer.append(modal);
  done.focus({ preventScroll: true });
  return { destroy: () => layer.remove() };
}
