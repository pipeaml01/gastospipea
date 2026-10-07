export type TransactionType = 'expense' | 'income';

export type PaymentMethod = 'cash' | 'debit' | 'credit';

export type IncomeType = 'salary' | 'sale' | 'commission' | 'other';

export interface CreditCard {
  id: string;
  userId?: string;
  bank: string;
  last4: string;
  color: string; // Hex color for UI decoration
  limit: number; // Credit limit / Cupo total
}

export interface Transaction {
  id: string;
  userId?: string;
  type: TransactionType;
  amount: number;
  category: string;
  description?: string;
  date: string; // ISO string YYYY-MM-DD
  time?: string; // HH:mm format
  paymentMethod?: PaymentMethod; // For expenses
  cardId?: string; // If paymentMethod is 'credit' OR if category is 'Pago Tarjeta'
  incomeType?: IncomeType; // For income
  destination?: 'cash' | 'account'; // For income (where did the money go?)
  createdAt?: string;
}

export interface RecurringPayment {
  id: string;
  userId?: string;
  name: string;
  amount: number;
  dayDue: number; // 1-31
  isPaidCurrentMonth: boolean;
  lastPaidDate?: string; // To reset logic
}

export interface FinancialSummary {
  totalBalance: number; // Liquid assets (Cash + Account)
  cashBalance: number;
  accountBalance: number;
  creditDebt: number; // Total owed across all cards
  totalIncome: number;
  totalExpense: number;
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName?: string;
  createdAt?: string;
  updatedAt?: string;
}
