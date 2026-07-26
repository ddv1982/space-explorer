/**
 * Run optional side effects without letting failures break critical control flow.
 */
export function runBestEffort(effect: () => void): void {
  try {
    effect();
  } catch {
    // Keep the caller alive even if optional cleanup or feedback fails.
  }
}
