import type Phaser from 'phaser';
import { getVisualQualityProfile } from '../config/visualQuality';

type Child = Node | string | null | undefined | false;
type Props<K extends keyof HTMLElementTagNameMap> = Partial<Omit<HTMLElementTagNameMap[K], 'style'>> & {
  [attribute: `aria-${string}` | `data-${string}`]: string | number | boolean | undefined;
};

/** Creates an element: hyphenated keys become attributes, the rest are assigned as properties. */
export function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  props: Props<K> = {},
  ...children: Child[]
): HTMLElementTagNameMap[K] {
  const element = document.createElement(tag);
  for (const [key, value] of Object.entries(props)) {
    if (value === undefined) continue;
    if (key.includes('-')) element.setAttribute(key, String(value));
    else Reflect.set(element, key, value);
  }
  for (const child of children) if (child || child === '') element.append(child);
  return element;
}

/** Keys a focused control handles natively; Phaser listens on window and would otherwise swallow them. */
const NATIVE_KEYS = new Set([
  'Enter',
  'Space',
  'Tab',
  'ArrowLeft',
  'ArrowRight',
  'ArrowUp',
  'ArrowDown',
  'Home',
  'End',
  'PageUp',
  'PageDown',
]);

function keepNativeKeys(event: KeyboardEvent): void {
  const target = event.target as HTMLElement | null;
  if (NATIVE_KEYS.has(event.code) && target?.closest('button, input')) event.stopPropagation();
}

/**
 * Mounts an HTML UI layer over the game canvas. The layer itself ignores the pointer; its panels and
 * controls opt back in, so canvas input keeps working everywhere else. Escape still reaches the game.
 */
export function mountUiLayer(): HTMLDivElement {
  const host = document.getElementById('game-root') ?? document.body;
  const profile = getVisualQualityProfile();
  const layer = h('div', { className: 'ui-layer' });
  layer.style.setProperty('--ui-glow', String(profile.uiGlowStrength));
  layer.style.setProperty('--ui-halo', profile.menuAtmosphere >= 2 ? '1' : '0');
  layer.addEventListener('keydown', keepNativeKeys);
  layer.addEventListener('keyup', keepNativeKeys);
  host.querySelector('canvas')?.setAttribute('aria-hidden', 'true');
  host.append(layer);
  return layer;
}

/** Status line text plus tone; errors are announced assertively. */
export function setStatus(element: HTMLElement, message: string, tone: 'idle' | 'info' | 'error'): void {
  element.textContent = message;
  element.dataset.tone = tone;
  element.setAttribute('aria-live', tone === 'error' ? 'assertive' : 'polite');
}

/** Blurs focus out of an element that is about to hide, so game keys (Space to fire) are not swallowed. */
export function releaseFocus(container: HTMLElement): void {
  const active = document.activeElement;
  if (active instanceof HTMLElement && container.contains(active)) active.blur();
}

/**
 * A visually hidden polite live region. The first message lands after the region is in the document,
 * so screen readers announce it; later messages go through `textContent`.
 */
export function liveRegion(message: string): HTMLParagraphElement {
  const region = h('p', { className: 'ui-sr', role: 'status' });
  window.setTimeout(() => (region.textContent ||= message), 0);
  return region;
}

/** An element's box in the scene's game coordinates, for canvas art that sits in a gap the HTML leaves. */
export function measureInGame(
  scene: Phaser.Scene,
  element: Element
): { left: number; top: number; width: number; height: number } {
  const box = element.getBoundingClientRect();
  const canvas = scene.game.canvas.getBoundingClientRect();
  const scale = canvas.width > 0 ? Number(scene.scale.width) / canvas.width : 1;
  return {
    left: (box.left - canvas.left) * scale,
    top: (box.top - canvas.top) * scale,
    width: box.width * scale,
    height: box.height * scale,
  };
}
