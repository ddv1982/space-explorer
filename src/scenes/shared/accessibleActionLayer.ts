export interface AccessibleAction {
  name: string;
  label: string;
  activate: () => void;
  disabled?: boolean;
  selected?: boolean;
  description?: string;
}

interface AccessibleStatus {
  message: string;
  politeness?: 'polite' | 'assertive';
}

export interface AccessibleActionLayerOptions {
  label: string;
  actions: AccessibleAction[];
  summary?: string;
  status?: AccessibleStatus;
}

export interface AccessibleActionLayerHandle {
  (): void;
  update: (options: AccessibleActionLayerOptions) => void;
}

interface ActionEntry {
  action: AccessibleAction;
  button: HTMLButtonElement;
  description: HTMLSpanElement;
}

const LAYER_ID = 'accessible-action-layer';
const SUMMARY_ID = `${LAYER_ID}-summary`;
const STATUS_ID = `${LAYER_ID}-status`;
let activeLayerRoot: HTMLElement | null = null;
let activeLayerCanvas: Element | null = null;
let canvasAriaHiddenBeforeLayer: string | null = null;

function actionDescriptionId(name: string): string {
  return `${LAYER_ID}-${encodeURIComponent(name)}-description`;
}

export function mountAccessibleActionLayer(options: AccessibleActionLayerOptions): AccessibleActionLayerHandle {
  const documentRef = globalThis.document;
  if (!documentRef?.body) {
    const teardown = (() => undefined) as AccessibleActionLayerHandle;
    teardown.update = () => undefined;
    return teardown;
  }

  const existing = documentRef.getElementById(LAYER_ID);
  const activeElement = documentRef.activeElement as HTMLButtonElement | null;
  const focusedActionName = existing?.contains(activeElement) ? activeElement?.name : undefined;
  const canvas = documentRef.querySelector('#game-root canvas');
  if (!activeLayerRoot || existing !== activeLayerRoot) {
    canvasAriaHiddenBeforeLayer = canvas?.getAttribute('aria-hidden') ?? null;
  }
  existing?.remove();

  const root = documentRef.createElement('nav');
  root.id = LAYER_ID;
  root.className = 'sr-only-actions';

  const summary = documentRef.createElement('p');
  summary.id = SUMMARY_ID;

  const status = documentRef.createElement('p');
  status.id = STATUS_ID;
  status.setAttribute('aria-atomic', 'true');

  const entries = new Map<string, ActionEntry>();
  let destroyed = false;

  const update = (nextOptions: AccessibleActionLayerOptions): void => {
    if (destroyed) return;
    const focusedElement = documentRef.activeElement as HTMLButtonElement | null;
    const focusedName = root.contains(focusedElement) ? focusedElement?.name : undefined;

    root.setAttribute('aria-label', nextOptions.label);
    summary.textContent = nextOptions.summary ?? '';
    if (nextOptions.summary) {
      root.setAttribute('aria-describedby', SUMMARY_ID);
    } else {
      root.removeAttribute('aria-describedby');
    }

    status.textContent = nextOptions.status?.message ?? '';
    const politeness = nextOptions.status?.politeness ?? 'polite';
    status.setAttribute('role', politeness === 'assertive' ? 'alert' : 'status');
    status.setAttribute('aria-live', politeness);

    const nextNames = new Set(nextOptions.actions.map((action) => action.name));
    for (const [name, entry] of entries) {
      if (!nextNames.has(name)) {
        entry.button.remove();
        entry.description.remove();
        entries.delete(name);
      }
    }

    const orderedElements: HTMLElement[] = [summary, status];
    for (const action of nextOptions.actions) {
      let entry = entries.get(action.name);
      if (!entry) {
        const button = documentRef.createElement('button');
        button.type = 'button';
        button.name = action.name;
        const description = documentRef.createElement('span');
        description.id = actionDescriptionId(action.name);
        entry = { action, button, description };
        button.addEventListener('click', () => {
          if (!button.disabled) entry?.action.activate();
        });
        entries.set(action.name, entry);
      }

      entry.action = action;
      entry.button.textContent = action.label;
      entry.button.disabled = action.disabled === true;
      if (action.selected === undefined) {
        entry.button.removeAttribute('aria-pressed');
      } else {
        entry.button.setAttribute('aria-pressed', String(action.selected));
      }

      entry.description.textContent = action.description ?? '';
      if (action.description) {
        entry.button.setAttribute('aria-describedby', entry.description.id);
      } else {
        entry.button.removeAttribute('aria-describedby');
      }

      orderedElements.push(entry.button, entry.description);
    }

    orderedElements.forEach((element, index) => {
      if (root.children[index] !== element) {
        root.insertBefore(element, root.children[index] ?? null);
      }
    });

    while (root.children.length > orderedElements.length) {
      root.lastElementChild?.remove();
    }

    if (focusedName && documentRef.activeElement !== entries.get(focusedName)?.button) {
      entries.get(focusedName)?.button.focus();
    }
  };

  update(options);
  documentRef.body.appendChild(root);
  activeLayerRoot = root;
  activeLayerCanvas = canvas;
  canvas?.setAttribute('aria-hidden', 'true');
  if (focusedActionName) {
    entries.get(focusedActionName)?.button.focus();
  }

  const teardown = (() => {
    if (destroyed) return;
    destroyed = true;
    root.remove();
    if (activeLayerRoot !== root) return;

    activeLayerRoot = null;
    if (activeLayerCanvas === canvas) {
      if (canvasAriaHiddenBeforeLayer === null) {
        canvas?.removeAttribute('aria-hidden');
      } else {
        canvas?.setAttribute('aria-hidden', canvasAriaHiddenBeforeLayer);
      }
    }
    activeLayerCanvas = null;
    canvasAriaHiddenBeforeLayer = null;
  }) as AccessibleActionLayerHandle;
  teardown.update = update;
  return teardown;
}
