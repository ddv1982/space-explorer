import { describe, expect, test } from 'bun:test';

describe('vercel security headers', () => {
  test('declares the production header set', async () => {
    const config = (await Bun.file('vercel.json').json()) as {
      headers?: Array<{ source: string; headers: Array<{ key: string; value: string }> }>;
    };
    const headerNames = new Set(config.headers?.flatMap((entry) => entry.headers.map((header) => header.key)));

    expect(headerNames.has('Content-Security-Policy')).toBe(true);
    expect(headerNames.has('X-Content-Type-Options')).toBe(true);
    expect(headerNames.has('Referrer-Policy')).toBe(true);
    expect(headerNames.has('Permissions-Policy')).toBe(true);
    expect(headerNames.has('X-Frame-Options')).toBe(true);
  });
});
