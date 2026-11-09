export interface DragState {
  fingerStartX: number;
  fingerStartY: number;
  shipStartX: number;
  shipStartY: number;
}

export interface DragBounds {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

export function beginDrag(fingerX: number, fingerY: number, shipX: number, shipY: number): DragState {
  return { fingerStartX: fingerX, fingerStartY: fingerY, shipStartX: shipX, shipStartY: shipY };
}

/** The ship follows the finger's movement, not the finger's position. */
export function dragTarget(
  state: DragState,
  fingerX: number,
  fingerY: number,
  bounds: DragBounds
): { x: number; y: number } {
  const x = state.shipStartX + (fingerX - state.fingerStartX);
  const y = state.shipStartY + (fingerY - state.fingerStartY);
  return {
    x: Math.min(bounds.right, Math.max(bounds.left, x)),
    y: Math.min(bounds.bottom, Math.max(bounds.top, y)),
  };
}

/** Velocity that would close the gap to the drag target within `followMs`, capped at `maxSpeed`. */
export function dragDesiredVelocity(
  shipX: number,
  shipY: number,
  targetX: number,
  targetY: number,
  maxSpeed: number,
  followMs = 60
): { vx: number; vy: number } {
  const dx = targetX - shipX;
  const dy = targetY - shipY;
  const distance = Math.hypot(dx, dy);
  if (distance < 1) {
    return { vx: 0, vy: 0 };
  }
  const speed = Math.min(maxSpeed, distance / (followMs / 1000));
  return { vx: (dx / distance) * speed, vy: (dy / distance) * speed };
}
