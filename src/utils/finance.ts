import type { Account, BudgetStatus, MonthSummary, Transaction } from '@/src/types';

// Pure calculations for the dashboard. Keeping these out of the components makes
// them unit-testable and keeps the UI focused on rendering.

export function sumBalances(accounts: Account[]): number {
  return accounts.reduce((total, a) => total + a.balance, 0);
}

export function summarizeMonth(transactions: Transaction[]): MonthSummary {
  let income = 0;
  let expenses = 0;
  for (const t of transactions) {
    if (t.type === 'INCOME') income += t.amount;
    else if (t.type === 'EXPENSE') expenses += t.amount;
  }
  return { income, expenses, net: income - expenses };
}

export type BudgetLevel = 'ok' | 'warning' | 'exceeded';

export function budgetPercent(budget: BudgetStatus): number {
  if (budget.limitAmount <= 0) return 0;
  return (budget.spentAmount / budget.limitAmount) * 100;
}

export function budgetLevel(budget: BudgetStatus): BudgetLevel {
  const pct = budgetPercent(budget);
  if (pct > 100) return 'exceeded'; // red
  if (pct >= 70) return 'warning'; // amber (70–100%)
  return 'ok'; // green (<70%)
}

export const BUDGET_LEVEL_COLOR: Record<BudgetLevel, string> = {
  ok: '#34c759',
  warning: '#ff9f0a',
  exceeded: '#ff3b30',
};
