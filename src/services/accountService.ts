import { api } from '@/src/services/api';
import type { Account, AccountInput } from '@/src/types';

export const accountService = {
  async getAccounts(): Promise<Account[]> {
    const { data } = await api.get<Account[]>('/api/accounts');
    return data;
  },

  async createAccount(input: AccountInput): Promise<Account> {
    // NOTE: the API currently ignores the balance on create (accounts start at 0;
    // balance is derived server-side). We still send it so it works once the
    // backend supports an opening balance.
    const { data } = await api.post<Account>('/api/accounts', input);
    return data;
  },

  async updateAccount(id: string, input: AccountInput): Promise<Account> {
    const { data } = await api.put<Account>(`/api/accounts/${id}`, input);
    return data;
  },

  async deleteAccount(id: string): Promise<void> {
    await api.delete(`/api/accounts/${id}`);
  },
};
