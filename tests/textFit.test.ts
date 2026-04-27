import { describe, expect, mock, test } from 'bun:test';

mock.module('phaser', () => ({ default: {} }));

const { setSingleLineTextWithEllipsis } = await import('../src/scenes/shared/textFit');

type TextStub = {
  text: string;
  width: number;
  style: { fontSize: string };
  setText: (value: string) => void;
  setWordWrapWidth: (_width: number) => void;
};

function createTextStub(fontSize = 12): TextStub {
  return {
    text: '',
    width: 0,
    style: { fontSize: `${fontSize}px` },
    setText(value) {
      this.text = value;
      this.width = value.length * 7;
    },
    setWordWrapWidth() {
      // no-op
    },
  };
}

describe('setSingleLineTextWithEllipsis', () => {
  test('keeps text unchanged when it already fits', () => {
    const text = createTextStub();
    setSingleLineTextWithEllipsis(text as never, 'SHORT', 200);

    expect(text.text).toBe('SHORT');
  });

  test('adds ellipsis when text exceeds max width', () => {
    const text = createTextStub();
    setSingleLineTextWithEllipsis(text as never, 'THIS IS A VERY LONG TITLE THAT WILL OVERFLOW', 70);

    expect(text.text.endsWith('…')).toBe(true);
    expect(text.width).toBeLessThanOrEqual(70);
  });

  test('handles very small max width safely', () => {
    const text = createTextStub();
    setSingleLineTextWithEllipsis(text as never, 'LONG VALUE', 1);

    expect(text.text).toBe('');
  });

  test('is stable across repeated calls', () => {
    const text = createTextStub();
    setSingleLineTextWithEllipsis(text as never, 'REPEATED LONG VALUE FOR STABILITY', 60);
    const first = text.text;

    setSingleLineTextWithEllipsis(text as never, 'REPEATED LONG VALUE FOR STABILITY', 60);
    expect(text.text).toBe(first);
  });
});
