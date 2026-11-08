import { describe, expect, test } from 'bun:test';
import { getFlightMode } from '../src/config/flightMode';

describe('getFlightMode', () => {
  test('returns legacy only for ?flight=legacy', () => {
    expect(getFlightMode('?flight=legacy')).toBe('legacy');
    expect(getFlightMode('?level=3&flight=legacy')).toBe('legacy');
    expect(getFlightMode('')).toBe('momentum');
    expect(getFlightMode('?flight=x')).toBe('momentum');
  });
});
