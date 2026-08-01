/**
 * Session-scoped hardware keyboard detection for touch devices.
 *
 * Browsers expose no API for "hardware keyboard attached" and pointer media
 * queries never reflect keyboards, but on-screen keyboards only emit key events
 * into focused text inputs. This game has no text inputs, so any window keydown
 * is proof that a hardware keyboard is in use.
 */

type HardwareKeyboardDetectedHandler = () => void;

let detected = false;
let armedTarget: EventTarget | null = null;
const handlers = new Set<HardwareKeyboardDetectedHandler>();

const handleKeydown = (): void => {
  detected = true;
  armedTarget?.removeEventListener('keydown', handleKeydown);
  armedTarget = null;

  const pending = [...handlers];
  handlers.clear();
  pending.forEach((handler) => handler());
};

export function initHardwareKeyboardDetection(target: EventTarget): void {
  if (detected || armedTarget) {
    return;
  }

  armedTarget = target;
  armedTarget.addEventListener('keydown', handleKeydown);
}

export function isHardwareKeyboardDetected(): boolean {
  return detected;
}

/**
 * Subscribes to the first hardware keypress of the session. When detection
 * already happened, the handler runs immediately and the returned unsubscribe
 * is a no-op.
 */
export function onHardwareKeyboardDetected(handler: HardwareKeyboardDetectedHandler): () => void {
  if (detected) {
    handler();
    return () => undefined;
  }

  handlers.add(handler);
  return () => {
    handlers.delete(handler);
  };
}

export function resetHardwareKeyboardDetectionForTests(): void {
  armedTarget?.removeEventListener('keydown', handleKeydown);
  armedTarget = null;
  handlers.clear();
  detected = false;
}
