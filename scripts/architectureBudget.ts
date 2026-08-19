export const BUDGET_SLACK_LINES = 80;

export function isConcentrationBudgetLoose(
  measuredLines: number,
  budgetLines: number,
  slackLines: number = BUDGET_SLACK_LINES
): boolean {
  return measuredLines + slackLines < budgetLines;
}
