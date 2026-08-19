import { describe, expect, test } from 'bun:test';

import { mountAccessibleActionLayer } from '../src/scenes/shared/accessibleActionLayer';

describe('mountAccessibleActionLayer', () => {
  test('is a no-op when the document is unavailable', () => {
    const teardown = mountAccessibleActionLayer({
      label: 'Command deck',
      actions: [{ name: 'new-run', label: 'New run', activate: () => undefined }],
    });

    expect(typeof teardown).toBe('function');
    teardown();
  });
});
