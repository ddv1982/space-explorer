import { describe, expect, test } from 'bun:test';

import { BUDGET_SLACK_LINES, isConcentrationBudgetLoose } from '../scripts/architectureBudget';

describe('architecture concentration slack', () => {
  test('fails a retained budget that sits far above the measured size', () => {
    expect(BUDGET_SLACK_LINES).toBe(80);
    expect(isConcentrationBudgetLoose(100, 300)).toBe(true);
    expect(isConcentrationBudgetLoose(100, 180)).toBe(false);
    expect(isConcentrationBudgetLoose(100, 181)).toBe(true);
  });
});
