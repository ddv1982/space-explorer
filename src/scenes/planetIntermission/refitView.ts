import type { LevelConfig } from '../../config/LevelsConfig';
import type { UpgradeEvaluation, UpgradeKey } from '../../config/UpgradesConfig';
import { colorToHexString, mixColor } from '../../utils/colorUtils';
import { h, liveRegion, mountUiLayer, releaseFocus } from '../../ui/dom';
import { findArrowFocusIndex, findLinearFocusIndex, findNextPurchasableAfter } from './navigation';
import type { PlanetIntermissionProfile } from './planetProfiles';

const UPGRADE_COLORS: Record<UpgradeKey, number> = {
  hp: 0x65f6c1,
  damage: 0xff7d9a,
  fireRate: 0x62d9ff,
  shield: 0xb78cff,
  turrets: 0xffb85c,
};

/** Glyphs on a 36-unit tile centred on the origin; the padlock replaces them while locked. */
const GLYPHS: Record<UpgradeKey | 'locked', string> = {
  hp: '<path d="M-8 0H8M0-8V8"/>',
  damage: '<path d="M-8 8L8-8M1-8H8V-1"/>',
  fireRate: '<path d="M-9-6H-1M-9 0H4M-9 6H9"/>',
  shield: '<path d="M0 9L-8-7H8Z"/>',
  // Picket mount: barrel rising from a housing on a base plate.
  turrets: '<path d="M0 1V-9M-5 7V1H5V7M-9 7H9"/>',
  locked: '<path d="M-5-2A5 5 0 0 1 5-2"/><rect x="-7.5" y="-2" width="15" height="11"/>',
};

function rgb(color: number): string {
  return `${(color >> 16) & 255} ${(color >> 8) & 255} ${color & 255}`;
}

function levelText(evaluation: UpgradeEvaluation): string {
  if (evaluation.blockReason === 'locked' && evaluation.unlockReason) {
    return `UNLOCK: ${evaluation.unlockReason.toUpperCase()}`;
  }
  const tierName = evaluation.upgrade.tierNames?.[evaluation.currentLevel];
  const description = (tierName ?? evaluation.upgrade.description).toUpperCase();
  return `${description}  ·  ${evaluation.currentLevel}/${evaluation.upgrade.maxLevel}`;
}

function costText(evaluation: UpgradeEvaluation): string {
  switch (evaluation.blockReason) {
    case 'maxed':
      return 'MAXED';
    case 'locked':
      return 'LOCKED';
    case 'progression':
      return `CAP ${evaluation.progressionLimit}`;
    default:
      return `${evaluation.cost} CR`;
  }
}

/** Restarts a one-shot CSS animation keyed off a data attribute. */
function replay(element: HTMLElement, attribute: string): void {
  element.removeAttribute(attribute);
  void element.offsetWidth;
  element.setAttribute(attribute, '');
}

interface UpgradeCard {
  button: HTMLButtonElement;
  refresh: (evaluation: UpgradeEvaluation) => void;
  /** Shrinks a tier line that would overflow (to 72% at most) so its rank count stays readable. */
  fit: () => void;
}

/** Icon tile, name, tier line, cost chip and one pip per rank; disabled whenever it cannot be bought. */
function createUpgradeCard(evaluation: UpgradeEvaluation, onBuy: (key: UpgradeKey) => void): UpgradeCard {
  const { key, name, maxLevel } = evaluation.upgrade;
  const icon = h('span', { className: 'card__icon', 'aria-hidden': 'true' });
  const detail = h('span', { className: 'card__detail ui-ellipsis', id: `refit-${key}-detail` });
  const cost = h('span', { className: 'ui-card card__cost', id: `refit-${key}-cost` });
  const pips = Array.from({ length: maxLevel }, () => h('i'));
  const button = h(
    'button',
    {
      type: 'button',
      className: 'ui-btn card',
      'aria-label': `Buy ${name}`,
      'aria-describedby': `${detail.id} ${cost.id}`,
    },
    icon,
    h('span', { className: 'card__title ui-ellipsis' }, name),
    detail,
    h(
      'span',
      { className: 'card__status' },
      cost,
      h('span', { className: 'card__pips', 'aria-hidden': 'true' }, ...pips)
    )
  );
  button.style.setProperty('--key-rgb', rgb(UPGRADE_COLORS[key]));
  button.addEventListener('click', () => onBuy(key));

  return {
    button,
    refresh(next) {
      button.dataset.state = next.blockReason ?? 'live';
      button.disabled = !next.canPurchase;
      icon.innerHTML = `<svg viewBox="-18 -18 36 36"><path class="card__tile" d="M-11.5-17.5H17.5V11.5L11.5 17.5H-17.5V-11.5Z"/>${GLYPHS[next.blockReason === 'locked' ? 'locked' : key]}</svg>`;
      detail.textContent = levelText(next);
      cost.textContent = costText(next);
      pips.forEach((pip, index) => pip.toggleAttribute('data-lit', index < next.currentLevel));
    },
    fit() {
      detail.style.removeProperty('--fit');
      const ratio = detail.clientWidth / detail.scrollWidth;
      // Glyph widths round as the size drops: leave a little slack.
      if (ratio < 1) detail.style.setProperty('--fit', String(Math.max(0.72, ratio * 0.97)));
    },
  };
}

interface RefitViewConfig {
  levelConfig: LevelConfig;
  profile: PlanetIntermissionProfile;
  level: number;
  totalLevels: number;
  credits: number;
  /** Null once the final sector is cleared: no refit, straight on to the campaign record. */
  nextLevelName: string | null;
  continueLabel: string;
  summary: string;
  evaluations: UpgradeEvaluation[];
  onBuy: (key: UpgradeKey) => void;
  onContinue: () => void;
}

export interface RefitView {
  /** The square the canvas planet fills. */
  planetSlot: HTMLElement;
  /** New balance and evaluations after a purchase: refreshes every card and announces the result. */
  refresh: (credits: number, evaluations: UpgradeEvaluation[], purchased: UpgradeKey, message: string) => void;
  /** Arrow keys and Enter / Space while no card holds focus; returns whether the key was used. */
  handleUnfocusedKey: (code: string) => boolean;
  /** Puts the whole bay out of reach of pointer and keyboard while a dialog is open over it. */
  setInert: (inert: boolean) => void;
  /** Fades the UI out under the warp. */
  leave: () => void;
  destroy: () => void;
}

/**
 * The refit bay in HTML over the planet art: arrival header, sector and credits, the upgrade cards and
 * CONTINUE. Only the cards and CONTINUE take the pointer; a tap anywhere else falls through to the canvas.
 */
export function createRefitView(config: RefitViewConfig): RefitView {
  const accent = config.levelConfig.planetPalette[1];
  const sector = `SECTOR ${String(config.level).padStart(2, '0')} / ${String(config.totalLevels).padStart(2, '0')}`;
  const credits = h('span', { className: 'ui-card refit__credits' }, `CREDITS ${config.credits}`);
  const cards = config.evaluations.map((evaluation) => createUpgradeCard(evaluation, config.onBuy));
  cards.forEach((card, index) => card.refresh(config.evaluations[index]));
  const grid = h('div', { className: 'refit__cards' }, ...cards.map((card) => card.button));
  const status = liveRegion(config.summary);
  const continueButton = h(
    'button',
    { type: 'button', className: 'ui-btn ui-btn--primary refit__continue', 'aria-label': config.continueLabel },
    config.continueLabel
  );
  continueButton.addEventListener('click', config.onContinue);

  const planetSlot = h(
    'div',
    { className: 'refit__planet' },
    h('p', { className: 'refit__class' }, config.profile.classification),
    h(
      'p',
      { className: 'refit__orbit' },
      `ORBIT ${String(config.level).padStart(2, '0')}  ·  ${config.profile.approachCode}`
    )
  );
  const root = h(
    'section',
    { className: 'refit', 'aria-label': 'Planet intermission' },
    planetSlot,
    h(
      'div',
      { className: 'refit__content' },
      h('p', { className: 'refit__eyebrow' }, `// ${config.profile.approachCode} · ARRIVAL CONFIRMED`),
      h(
        'div',
        { className: 'refit__sheet' },
        h('div', { className: 'ui-frame', 'aria-hidden': 'true' }),
        h('h1', { className: 'ui-title refit__name' }, config.levelConfig.planetName.toUpperCase()),
        h('p', { className: 'refit__destination' }, config.levelConfig.destination.toUpperCase()),
        h('p', { className: 'refit__note' }, `“${config.levelConfig.journeyNote}”`),
        h(
          'div',
          { className: 'refit__status' },
          h('span', { className: 'refit__sector ui-ellipsis' }, `${sector}  ·  ${config.profile.signalLabel}`),
          credits
        ),
        h(
          'p',
          { className: 'ui-caption refit__caption' },
          config.nextLevelName ? 'REFIT BAY // SELECT AN UPGRADE' : 'MISSION ARCHIVE // JOURNEY COMPLETE'
        ),
        grid
      ),
      h(
        'p',
        { className: 'refit__next' },
        config.nextLevelName
          ? `NEXT VECTOR  ·  ${config.nextLevelName.toUpperCase()}`
          : 'ALL TEN SECTORS CLEARED  ·  RETURNING TO COMMAND'
      )
    ),
    continueButton,
    status
  );
  root.style.setProperty('--accent-rgb', rgb(accent));
  root.style.setProperty('--accent-text', colorToHexString(mixColor(accent, 0xffffff, 0.3)));
  root.style.setProperty('--title-glow', colorToHexString(accent));
  root.style.setProperty('--title-base', colorToHexString(mixColor(0xffffff, accent, 0.45)));

  let evaluations = config.evaluations;
  const purchasable = (): boolean[] => evaluations.map((evaluation) => evaluation.canPurchase);
  const focusedIndex = (): number => cards.findIndex((card) => card.button === document.activeElement);
  const focusCard = (index: number): void => cards[index]?.button.focus({ preventScroll: true });
  const moveFocus = (code: string): boolean => {
    const columns = getComputedStyle(grid).gridTemplateColumns.split(' ').length;
    const next = findArrowFocusIndex(code, purchasable(), columns, focusedIndex());
    if (next === null) return false;
    focusCard(next);
    return true;
  };

  grid.addEventListener('keydown', (event) => {
    // Holding Enter must not buy rank after rank.
    if (event.repeat && (event.code === 'Enter' || event.code === 'Space')) event.preventDefault();
    else if (moveFocus(event.code)) event.preventDefault();
  });

  const layer = mountUiLayer();
  layer.append(root);
  cards.forEach((card) => card.fit());

  return {
    planetSlot,
    refresh(creditsLeft, next, purchased, message) {
      evaluations = next;
      const index = next.findIndex((evaluation) => evaluation.upgrade.key === purchased);
      const hadFocus = focusedIndex() === index;
      cards.forEach((card, cardIndex) => {
        card.refresh(next[cardIndex]);
        card.fit();
      });
      credits.textContent = `CREDITS ${creditsLeft}`;
      replay(credits, 'data-pulse');
      if (cards[index]) replay(cards[index].button, 'data-flash');
      status.textContent = message;
      // A card that just capped drops out of the focus order: hand focus to the next one that can buy.
      if (hadFocus && !next[index].canPurchase) focusCard(findNextPurchasableAfter(purchasable(), index));
    },
    handleUnfocusedKey(code) {
      if (code !== 'Enter' && code !== 'Space') return moveFocus(code);
      const first = findLinearFocusIndex(purchasable(), -1, 1);
      focusCard(first);
      cards[first]?.button.click();
      return true;
    },
    setInert(inert) {
      if (inert) releaseFocus(layer);
      layer.inert = inert;
    },
    leave() {
      releaseFocus(layer);
      layer.inert = true;
      layer.dataset.leaving = '';
    },
    destroy: () => layer.remove(),
  };
}
