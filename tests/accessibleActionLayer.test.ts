import { afterEach, describe, expect, mock, test } from 'bun:test';

import { mountAccessibleActionLayer } from '../src/scenes/shared/accessibleActionLayer';

class FakeElement {
  id = '';
  name = '';
  type = '';
  textContent = '';
  className = '';
  disabled = false;
  parent: FakeElement | null = null;
  readonly children: FakeElement[] = [];
  private readonly attributes = new Map<string, string>();
  private readonly listeners = new Map<string, Array<() => void>>();

  constructor(private readonly owner: FakeDocument) {}

  setAttribute(name: string, value: string): void {
    this.attributes.set(name, value);
  }

  getAttribute(name: string): string | null {
    return this.attributes.get(name) ?? null;
  }

  removeAttribute(name: string): void {
    this.attributes.delete(name);
  }

  appendChild(child: FakeElement): FakeElement {
    return this.insertBefore(child, null);
  }

  insertBefore(child: FakeElement, before: FakeElement | null): FakeElement {
    child.remove();
    child.parent = this;
    const index = before ? this.children.indexOf(before) : -1;
    if (index >= 0) {
      this.children.splice(index, 0, child);
    } else {
      this.children.push(child);
    }
    return child;
  }

  remove(): void {
    if (!this.parent) return;
    if (this.contains(this.owner.activeElement)) this.owner.activeElement = null;
    const index = this.parent.children.indexOf(this);
    if (index >= 0) this.parent.children.splice(index, 1);
    this.parent = null;
  }

  contains(element: FakeElement | null): boolean {
    if (!element) return false;
    return element === this || this.children.some((child) => child.contains(element));
  }

  addEventListener(name: string, listener: () => void): void {
    const listeners = this.listeners.get(name) ?? [];
    listeners.push(listener);
    this.listeners.set(name, listeners);
  }

  click(): void {
    for (const listener of this.listeners.get('click') ?? []) listener();
  }

  focus(): void {
    this.owner.activeElement = this;
  }

  get lastElementChild(): FakeElement | null {
    return this.children.at(-1) ?? null;
  }
}

class FakeDocument {
  readonly body = new FakeElement(this);
  readonly canvas = new FakeElement(this);
  activeElement: FakeElement | null = null;

  createElement(): FakeElement {
    return new FakeElement(this);
  }

  getElementById(id: string): FakeElement | null {
    const visit = (element: FakeElement): FakeElement | null => {
      if (element.id === id) return element;
      for (const child of element.children) {
        const result = visit(child);
        if (result) return result;
      }
      return null;
    };
    return visit(this.body);
  }

  querySelector(selector: string): FakeElement | null {
    return selector === '#game-root canvas' ? this.canvas : null;
  }
}

function installDocument(documentRef: FakeDocument): void {
  Object.defineProperty(globalThis, 'document', {
    configurable: true,
    value: documentRef as unknown as Document,
  });
}

function uninstallDocument(): void {
  Reflect.deleteProperty(globalThis, 'document');
}

function button(documentRef: FakeDocument, name: string): FakeElement {
  const root = documentRef.getElementById('accessible-action-layer');
  const result = root?.children.find((child) => child.name === name);
  if (!result) throw new Error(`Missing ${name} button`);
  return result;
}

afterEach(() => uninstallDocument());

describe('mountAccessibleActionLayer', () => {
  test('is a no-op when the document is unavailable', () => {
    const teardown = mountAccessibleActionLayer({
      label: 'Command deck',
      actions: [{ name: 'new-run', label: 'New run', activate: () => undefined }],
    });

    expect(typeof teardown).toBe('function');
    expect(typeof teardown.update).toBe('function');
    teardown.update({ label: 'Updated', actions: [] });
    teardown();
  });

  test('exposes summaries, live status, and complete action state', () => {
    const documentRef = new FakeDocument();
    installDocument(documentRef);
    const activate = mock();

    const teardown = mountAccessibleActionLayer({
      label: 'Paused',
      summary: 'Checkpoint controls',
      status: { message: 'Save failed', politeness: 'assertive' },
      actions: [
        {
          name: 'settings',
          label: 'Settings',
          description: 'Audio and visual settings',
          selected: true,
          disabled: true,
          activate,
        },
      ],
    });

    const root = documentRef.getElementById('accessible-action-layer');
    const settings = button(documentRef, 'settings');
    expect(root?.getAttribute('aria-label')).toBe('Paused');
    expect(root?.getAttribute('aria-describedby')).toBe('accessible-action-layer-summary');
    expect(documentRef.getElementById('accessible-action-layer-summary')?.textContent).toBe('Checkpoint controls');
    expect(documentRef.getElementById('accessible-action-layer-status')?.getAttribute('role')).toBe('alert');
    expect(documentRef.getElementById('accessible-action-layer-status')?.getAttribute('aria-live')).toBe('assertive');
    expect(settings.getAttribute('aria-pressed')).toBe('true');
    expect(settings.getAttribute('aria-describedby')).toBe('accessible-action-layer-settings-description');
    expect(settings.disabled).toBe(true);
    settings.click();
    expect(activate).not.toHaveBeenCalled();
    expect(documentRef.canvas.getAttribute('aria-hidden')).toBe('true');

    teardown();
    expect(documentRef.getElementById('accessible-action-layer')).toBeNull();
    expect(documentRef.canvas.getAttribute('aria-hidden')).toBeNull();
  });

  test('uses distinct description IDs for action names that sanitize alike', () => {
    const documentRef = new FakeDocument();
    installDocument(documentRef);
    const teardown = mountAccessibleActionLayer({
      label: 'Actions',
      actions: [
        { name: 'a b', label: 'Space', description: 'First', activate: () => undefined },
        { name: 'a-b', label: 'Dash', description: 'Second', activate: () => undefined },
      ],
    });

    const firstId = button(documentRef, 'a b').getAttribute('aria-describedby');
    const secondId = button(documentRef, 'a-b').getAttribute('aria-describedby');
    expect(firstId).not.toBe(secondId);
    expect(documentRef.getElementById(firstId ?? '')?.textContent).toBe('First');
    expect(documentRef.getElementById(secondId ?? '')?.textContent).toBe('Second');
    teardown();
  });

  test('updates actions in place so focus and current handlers survive state changes', () => {
    const documentRef = new FakeDocument();
    installDocument(documentRef);
    const firstActivate = mock();
    const nextActivate = mock();
    const teardown = mountAccessibleActionLayer({
      label: 'Paused',
      actions: [
        { name: 'resume', label: 'Resume', activate: firstActivate },
        { name: 'menu', label: 'Menu', activate: () => undefined },
      ],
    });
    const initialButton = button(documentRef, 'resume');
    initialButton.focus();

    teardown.update({
      label: 'Paused settings',
      status: { message: 'Quality set to high' },
      actions: [
        { name: 'menu', label: 'Menu', activate: () => undefined },
        { name: 'resume', label: 'Resume game', selected: false, activate: nextActivate },
      ],
    });

    const updatedButton = button(documentRef, 'resume');
    expect(updatedButton).toBe(initialButton);
    expect(documentRef.activeElement).toBe(initialButton);
    expect(updatedButton.textContent).toBe('Resume game');
    expect(updatedButton.getAttribute('aria-pressed')).toBe('false');
    expect(documentRef.getElementById('accessible-action-layer-status')?.getAttribute('role')).toBe('status');
    updatedButton.click();
    expect(firstActivate).not.toHaveBeenCalled();
    expect(nextActivate).toHaveBeenCalledTimes(1);
    teardown();
  });

  test('preserves focus by action name when a replacement layer is mounted', () => {
    const documentRef = new FakeDocument();
    installDocument(documentRef);
    const firstTeardown = mountAccessibleActionLayer({
      label: 'First',
      actions: [{ name: 'continue', label: 'Continue', activate: () => undefined }],
    });
    button(documentRef, 'continue').focus();

    const secondTeardown = mountAccessibleActionLayer({
      label: 'Second',
      actions: [{ name: 'continue', label: 'Continue journey', activate: () => undefined }],
    });

    expect(documentRef.activeElement).toBe(button(documentRef, 'continue'));
    firstTeardown();
    expect(documentRef.canvas.getAttribute('aria-hidden')).toBe('true');
    secondTeardown();
    expect(documentRef.canvas.getAttribute('aria-hidden')).toBeNull();
  });

  test('restores a canvas aria-hidden value owned before the layer mounted', () => {
    const documentRef = new FakeDocument();
    documentRef.canvas.setAttribute('aria-hidden', 'false');
    installDocument(documentRef);

    const teardown = mountAccessibleActionLayer({ label: 'Actions', actions: [] });
    expect(documentRef.canvas.getAttribute('aria-hidden')).toBe('true');
    teardown();
    expect(documentRef.canvas.getAttribute('aria-hidden')).toBe('false');
  });
});
