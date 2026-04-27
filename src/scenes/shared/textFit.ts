import Phaser from 'phaser';

function estimateCharWidthPx(text: Phaser.GameObjects.Text): number {
  const style = text.style as { fontSize?: string | number };
  const fontSizeRaw = style?.fontSize;
  const fontSize =
    typeof fontSizeRaw === 'number'
      ? fontSizeRaw
      : typeof fontSizeRaw === 'string'
        ? Number.parseFloat(fontSizeRaw)
        : 12;

  return Math.max(4, (Number.isFinite(fontSize) ? fontSize : 12) * 0.62);
}

export function setSingleLineTextWithEllipsis(
  text: Phaser.GameObjects.Text,
  fullValue: string,
  maxWidth: number,
  fallbackValue = ''
): void {
  const safeMaxWidth = Math.max(0, maxWidth);
  const source = fullValue || fallbackValue;

  text.setWordWrapWidth(0, false);

  if (safeMaxWidth <= 0) {
    text.setText('');
    return;
  }

  text.setText(source);
  if (typeof text.width === 'number' && text.width <= safeMaxWidth) {
    return;
  }

  const ellipsis = '…';
  text.setText(ellipsis);
  const ellipsisWidth = typeof text.width === 'number' ? text.width : estimateCharWidthPx(text);
  if (ellipsisWidth > safeMaxWidth) {
    text.setText('');
    return;
  }

  let low = 0;
  let high = source.length;
  let best = '';

  while (low <= high) {
    const mid = (low + high) >> 1;
    const candidate = `${source.slice(0, mid)}${ellipsis}`;
    text.setText(candidate);
    const candidateWidth =
      typeof text.width === 'number'
        ? text.width
        : candidate.length * estimateCharWidthPx(text);

    if (candidateWidth <= safeMaxWidth) {
      best = candidate;
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }

  text.setText(best || ellipsis);
}
