import { api, getApiErrorMessage } from '@/src/services/api';
import type { BudgetInput, BudgetStatus } from '@/src/types';

export const budgetService = {
  /**
   * Budgets, optionally for a given month/year (the API filters server-side).
   * NOTE: /api/budgets/status is per-category (needs ?category=), so the LIST
   * comes from /api/budgets — it already includes spentAmount/limitAmount, and
   * we compute the percentage client-side (utils/finance).
   */
  async getBudgets(params?: { month: number; year: number }): Promise<BudgetStatus[]> {
    const { data } = await api.get<BudgetStatus[]>('/api/budgets', { params });
    return data;
  },

  async createBudget(input: BudgetInput): Promise<BudgetStatus> {
    try {
      const { data } = await api.post<BudgetStatus>('/api/budgets', input);
      return data;
    } catch (e) {
      // Surface the server's message for 409 (duplicate) / 400 (validation).
      throw new Error(getApiErrorMessage(e, 'Could not save the budget.'));
    }
  },
};
