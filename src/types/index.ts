// Shared TypeScript interfaces for the whole app.
// CLAUDE.md rule: "TypeScript everywhere — no any types".
// Every API request/response shape lives here so screens, services and the
// auth context all agree on the same contract.

export interface User {
  id: string;
  email: string;
  name?: string; // optional: the auth endpoints may not return a display name
}

/**
 * App-internal auth result (normalized in authService).
 * NOTE: the API itself returns a FLAT body { token, userId, email } — see
 * authService.ts, which maps it into this shape.
 */
export interface AuthResponse {
  token: string; // JWT — stored in AsyncStorage (see CLAUDE.md)
  user: User;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
}

// ─── Dashboard domain (shapes VERIFIED against the running API) ──────────────

export interface Account {
  id: string;
  name: string;
  type: string;
  balance: number;
}

export const ACCOUNT_TYPES = ['CHECKING', 'SAVINGS', 'CREDIT', 'CASH'] as const;
export type AccountType = (typeof ACCOUNT_TYPES)[number];

/** Payload for creating/updating an account. */
export interface AccountInput {
  name: string;
  type: AccountType;
  balance: number;
}

export type TransactionType = 'INCOME' | 'EXPENSE';

export interface Transaction {
  id: string;
  accountId: string;
  amount: number;
  type: TransactionType;
  category: string;
  description: string;
  date: string; // YYYY-MM-DD
}

/** From /api/budgets/status (falls back to /api/budgets — same shape). */
export interface BudgetStatus {
  id: string;
  category: string;
  limitAmount: number;
  spentAmount: number;
  month: number;
  year: number;
}

export interface SpendingSummary {
  summary: string;
}

/** Payload for creating a budget. */
export interface BudgetInput {
  category: string;
  limitAmount: number;
  month: number;
  year: number;
}

/** Payload for creating a transaction. */
export interface TransactionInput {
  accountId: string;
  amount: number;
  type: TransactionType;
  category: string;
  description: string;
  date: string; // YYYY-MM-DD
}

/** Computed client-side from this month's transactions. */
export interface MonthSummary {
  income: number;
  expenses: number;
  net: number;
}
