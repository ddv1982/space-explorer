import { prefersReducedMotion } from '../utils/device';
import { h } from './dom';

/** Shared parts of the run-summary screens (Game Over and Victory). */

export function formatScore(score: number): string {
  return score.toLocaleString('en-US');
}

/** Glass cell in one accent: a small tracked label over a large numeral, with an optional note beside it. */
/** The line under a final score: a new best, or the best to beat. Empty before any score exists. */
export function bestScoreNote(best: number, isNewBest: boolean): string | undefined {
  if (best <= 0) return undefined;
  return isNewBest ? 'NEW BEST' : `BEST ${formatScore(best)}`;
}

export function statCell(
  label: string,
  value: string,
  accentRgb: string,
  note?: string
): { element: HTMLElement; value: HTMLElement } {
  const valueText = h('span', { className: 'stat__value' }, value);
  const element = h(
    'div',
    { className: 'stat' },
    h('div', { className: 'ui-frame', 'aria-hidden': 'true' }),
    h('span', { className: 'stat__label' }, label),
    valueText,
    note && h('span', { className: 'stat__note ui-ellipsis' }, note)
  );
  element.style.setProperty('--accent-rgb', accentRgb);
  return { element, value: valueText };
}

/** Rolls a numeral up from zero. Reduced motion (or nothing to count) shows the final value at once. */
export function countUp(element: HTMLElement, target: number, delayMs: number): void {
  if (target <= 0 || prefersReducedMotion()) return;
  const duration = Math.min(1900, Math.max(600, 500 + Math.log10(target + 1) * 260));
  const start = performance.now() + delayMs;
  element.textContent = '0';
  const tick = (now: number): void => {
    if (!element.isConnected) return;
    const t = Math.min(1, Math.max(0, (now - start) / duration));
    element.textContent = formatScore(Math.round(target * (1 - (1 - t) ** 3)));
    if (t < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}
