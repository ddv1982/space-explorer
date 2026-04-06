import Phaser from 'phaser';
import type { UpgradeEvaluation } from '../../config/UpgradesConfig';
import type { UpgradeButton } from './shared';

type EvaluateButton = (button: UpgradeButton) => UpgradeEvaluation;

interface GridFocusState {
  currentRow: number;
  currentCol: number;
  totalRows: number;
}

function getGridFocusState(buttons: UpgradeButton[], currentIndex: number): GridFocusState | null {
  if (buttons.length === 0 || currentIndex === -1) {
    return null;
  }

  return {
    currentRow: Math.floor(currentIndex / buttons[0].layout.columns),
    currentCol: currentIndex % buttons[0].layout.columns,
    totalRows: Math.ceil(buttons.length / buttons[0].layout.columns),
  };
}

export function findButtonIndexAtPoint(buttons: UpgradeButton[], x: number, y: number): number {
  for (let i = 0; i < buttons.length; i++) {
    const button = buttons[i];
    if (
      x >= button.x &&
      x <= button.x + button.width &&
      y >= button.y &&
      y <= button.y + button.height
    ) {
      return i;
    }
  }

  return -1;
}

export function findFirstPurchasableButton(buttons: UpgradeButton[], evaluateButton: EvaluateButton): number {
  for (let i = 0; i < buttons.length; i++) {
    if (evaluateButton(buttons[i]).canPurchase) {
      return i;
    }
  }

  return -1;
}

export function findLinearFocusIndex(
  buttons: UpgradeButton[],
  currentIndex: number,
  delta: number,
  evaluateButton: EvaluateButton
): number {
  if (buttons.length === 0) {
    return -1;
  }

  const totalButtons = buttons.length;
  let newIndex =
    currentIndex === -1
      ? delta > 0
        ? 0
        : totalButtons - 1
      : (currentIndex + delta + totalButtons) % totalButtons;

  let iterations = 0;
  while (iterations < totalButtons) {
    if (evaluateButton(buttons[newIndex]).canPurchase) {
      return newIndex;
    }

    newIndex = (newIndex + delta + totalButtons) % totalButtons;
    iterations++;
  }

  return -1;
}

export function findRowFocusIndex(
  buttons: UpgradeButton[],
  currentIndex: number,
  direction: number,
  evaluateButton: EvaluateButton
): number {
  const state = getGridFocusState(buttons, currentIndex);
  if (!state) {
    return findLinearFocusIndex(buttons, currentIndex, direction > 0 ? 1 : -1, evaluateButton);
  }

  const { currentRow, currentCol, totalRows } = state;
  const columns = buttons[0].layout.columns;

  let newCol = currentCol + direction;
  let newRow = currentRow;

  if (newCol < 0) {
    newCol = columns - 1;
    newRow = currentRow - 1;
    if (newRow < 0) {
      newRow = totalRows - 1;
    }
  } else if (newCol >= columns) {
    newCol = 0;
    newRow = currentRow + 1;
    if (newRow >= totalRows) {
      newRow = 0;
    }
  }

  const newIndex = newRow * columns + newCol;
  if (newIndex < buttons.length && evaluateButton(buttons[newIndex]).canPurchase) {
    return newIndex;
  }

  return findLinearFocusIndex(buttons, currentIndex, direction, evaluateButton);
}

export function findColumnFocusIndex(
  buttons: UpgradeButton[],
  currentIndex: number,
  direction: number,
  evaluateButton: EvaluateButton
): number {
  const state = getGridFocusState(buttons, currentIndex);
  if (!state) {
    return findLinearFocusIndex(buttons, currentIndex, direction > 0 ? 1 : -1, evaluateButton);
  }

  const { currentRow, currentCol, totalRows } = state;
  const columns = buttons[0].layout.columns;

  let newRow = currentRow + direction;
  if (newRow < 0) {
    newRow = totalRows - 1;
  } else if (newRow >= totalRows) {
    newRow = 0;
  }

  let newIndex = newRow * columns + currentCol;
  if (newIndex >= buttons.length) {
    newIndex = (newRow + 1) * columns - 1;
    if (newIndex >= buttons.length) {
      newIndex = buttons.length - 1;
    }
  }

  if (evaluateButton(buttons[newIndex]).canPurchase) {
    return newIndex;
  }

  return findLinearFocusIndex(buttons, currentIndex, direction * columns, evaluateButton);
}

export function findNextPurchasableAfter(
  buttons: UpgradeButton[],
  startIndex: number,
  evaluateButton: EvaluateButton
): number {
  const totalButtons = buttons.length;
  for (let i = 1; i <= totalButtons; i++) {
    const checkIndex = (startIndex + i) % totalButtons;
    if (evaluateButton(buttons[checkIndex]).canPurchase) {
      return checkIndex;
    }
  }

  return -1;
}

export function drawFocusIndicator(
  graphics: Phaser.GameObjects.Graphics,
  button: UpgradeButton | undefined
): void {
  graphics.clear();
  if (!button) {
    return;
  }

  const padding = 4;
  const glowSize = 3;

  graphics.lineStyle(glowSize, 0x79a9ff, 0.22);
  graphics.strokeRoundedRect(
    button.x - padding - glowSize,
    button.y - padding - glowSize,
    button.width + (padding + glowSize) * 2,
    button.height + (padding + glowSize) * 2,
    button.borderRadius + padding
  );

  graphics.lineStyle(2, 0xaaccff, 0.95);
  graphics.strokeRoundedRect(
    button.x - padding,
    button.y - padding,
    button.width + padding * 2,
    button.height + padding * 2,
    button.borderRadius + padding / 2
  );

  graphics.lineStyle(1, 0xe8f3ff, 0.9);
  graphics.strokeRoundedRect(
    button.x - padding + 2,
    button.y - padding + 2,
    button.width + (padding - 2) * 2,
    button.height + (padding - 2) * 2,
    button.borderRadius
  );
}

export function drawHoverIndicator(
  graphics: Phaser.GameObjects.Graphics,
  button: UpgradeButton | undefined
): void {
  graphics.clear();
  if (!button) {
    return;
  }

  const padding = 2;

  graphics.fillStyle(0x66aaff, 0.15);
  graphics.fillRoundedRect(
    button.x + padding,
    button.y + padding,
    button.width - padding * 2,
    button.height - padding * 2,
    button.borderRadius - 2
  );

  graphics.lineStyle(1, 0xaaccff, 0.6);
  graphics.strokeRoundedRect(
    button.x + padding,
    button.y + padding,
    button.width - padding * 2,
    button.height - padding * 2,
    button.borderRadius - 2
  );
}
