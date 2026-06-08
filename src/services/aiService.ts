import { api } from '@/src/services/api';
import type { SpendingSummary } from '@/src/types';

export const aiService = {
  /** Claude-generated plain-English spending summary. Can be slow; may fail. */
  async getSpendingSummary(): Promise<SpendingSummary> {
    const { data } = await api.get<SpendingSummary>('/api/ai/spending-summary');
    return data;
  },

  /** Suggest a category for a transaction from its free-text description. */
  async categorize(description: string): Promise<string> {
    const { data } = await api.post<{ category: string }>('/api/ai/categorize', {
      description,
    });
    return data.category;
  },

  /** Claude-generated budget recommendations (Markdown text). */
  async getBudgetAdvice(): Promise<string> {
    const { data } = await api.get<{ advice: string }>('/api/ai/budget-advice');
    return data.advice;
  },
};
