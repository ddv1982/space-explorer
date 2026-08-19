export interface AccessibleAction {
  name: string;
  label: string;
  activate: () => void;
  disabled?: boolean;
}

export function mountAccessibleActionLayer(options: { label: string; actions: AccessibleAction[] }): () => void {
  const documentRef = globalThis.document;
  if (!documentRef?.body) {
    return () => undefined;
  }

  const existing = documentRef.getElementById('accessible-action-layer');
  existing?.remove();

  const root = documentRef.createElement('nav');
  root.id = 'accessible-action-layer';
  root.setAttribute('aria-label', options.label);
  root.className = 'sr-only-actions';

  for (const action of options.actions) {
    const button = documentRef.createElement('button');
    button.type = 'button';
    button.name = action.name;
    button.textContent = action.label;
    button.disabled = action.disabled === true;
    button.addEventListener('click', () => {
      if (button.disabled) {
        return;
      }
      action.activate();
    });
    root.appendChild(button);
  }

  documentRef.body.appendChild(root);
  const canvas = documentRef.querySelector('#game-root canvas');
  canvas?.setAttribute('aria-hidden', 'true');

  return () => {
    root.remove();
    if (!documentRef.getElementById('accessible-action-layer')) {
      canvas?.removeAttribute('aria-hidden');
    }
  };
}
