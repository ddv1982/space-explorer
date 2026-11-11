/**
 * Arrow-key focus across the refit bay's card grid. Only purchasable cards take focus; -1 means none.
 * `purchasable` is one flag per card in reading order; `columns` is the grid's current column count.
 */

export function findLinearFocusIndex(purchasable: readonly boolean[], currentIndex: number, delta: number): number {
  const total = purchasable.length;
  if (total === 0) return -1;

  let index = currentIndex === -1 ? (delta > 0 ? 0 : total - 1) : (currentIndex + delta + total) % total;
  for (let step = 0; step < total; step++) {
    if (purchasable[index]) return index;
    index = (index + delta + total) % total;
  }
  return -1;
}

function findRowFocusIndex(
  purchasable: readonly boolean[],
  columns: number,
  currentIndex: number,
  direction: number
): number {
  if (currentIndex === -1) return findLinearFocusIndex(purchasable, currentIndex, direction);

  const totalRows = Math.ceil(purchasable.length / columns);
  let row = Math.floor(currentIndex / columns);
  let column = (currentIndex % columns) + direction;
  if (column < 0) {
    column = columns - 1;
    row = row === 0 ? totalRows - 1 : row - 1;
  } else if (column >= columns) {
    column = 0;
    row = row + 1 >= totalRows ? 0 : row + 1;
  }

  const index = row * columns + column;
  return purchasable[index] ? index : findLinearFocusIndex(purchasable, currentIndex, direction);
}

function findColumnFocusIndex(
  purchasable: readonly boolean[],
  columns: number,
  currentIndex: number,
  direction: number
): number {
  if (currentIndex === -1) return findLinearFocusIndex(purchasable, currentIndex, direction);

  const totalRows = Math.ceil(purchasable.length / columns);
  const row = (Math.floor(currentIndex / columns) + direction + totalRows) % totalRows;
  let index = row * columns + (currentIndex % columns);
  // A short last row: land on its final card.
  if (index >= purchasable.length) index = Math.min((row + 1) * columns - 1, purchasable.length - 1);

  return purchasable[index] ? index : findLinearFocusIndex(purchasable, currentIndex, direction * columns);
}

/** Where an arrow key moves focus from `currentIndex`, or null for any other key. */
export function findArrowFocusIndex(
  code: string,
  purchasable: readonly boolean[],
  columns: number,
  currentIndex: number
): number | null {
  switch (code) {
    case 'ArrowRight':
      return findRowFocusIndex(purchasable, columns, currentIndex, 1);
    case 'ArrowLeft':
      return findRowFocusIndex(purchasable, columns, currentIndex, -1);
    case 'ArrowDown':
      return findColumnFocusIndex(purchasable, columns, currentIndex, 1);
    case 'ArrowUp':
      return findColumnFocusIndex(purchasable, columns, currentIndex, -1);
    default:
      return null;
  }
}

/** The next purchasable card after `startIndex`, wrapping; -1 when none is left. */
export function findNextPurchasableAfter(purchasable: readonly boolean[], startIndex: number): number {
  const total = purchasable.length;
  for (let step = 1; step <= total; step++) {
    const index = (startIndex + step) % total;
    if (purchasable[index]) return index;
  }
  return -1;
}
