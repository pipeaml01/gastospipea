import { Transaction, RecurringPayment, CreditCard } from '../types';

const TRANSACTIONS_KEY = 'finanzasimple_transactions';
const RECURRING_KEY = 'finanzasimple_recurring';
const CARDS_KEY = 'finanzasimple_cards';

export const saveTransactions = (transactions: Transaction[]) => {
  try {
    localStorage.setItem(TRANSACTIONS_KEY, JSON.stringify(transactions));
  } catch (error) {
    console.error('Error saving transactions', error);
  }
};

export const getTransactions = (): Transaction[] => {
  try {
    const data = localStorage.getItem(TRANSACTIONS_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Error loading transactions', error);
    return [];
  }
};

export const saveRecurringPayments = (payments: RecurringPayment[]) => {
  try {
    localStorage.setItem(RECURRING_KEY, JSON.stringify(payments));
  } catch (error) {
    console.error('Error saving recurring payments', error);
  }
};

export const getRecurringPayments = (): RecurringPayment[] => {
  try {
    const data = localStorage.getItem(RECURRING_KEY);
    const payments: RecurringPayment[] = data ? JSON.parse(data) : [];
    
    // Check if we need to reset "isPaid" for a new month
    const today = new Date();
    const currentMonthKey = `${today.getFullYear()}-${today.getMonth()}`;
    
    return payments.map(p => {
      // If last paid date is not in current month/year, reset isPaid
      let isPaid = p.isPaidCurrentMonth;
      if (p.lastPaidDate) {
        const lastPaid = new Date(p.lastPaidDate);
        const lastPaidMonthKey = `${lastPaid.getFullYear()}-${lastPaid.getMonth()}`;
        if (lastPaidMonthKey !== currentMonthKey) {
            isPaid = false;
        }
      }
      return { ...p, isPaidCurrentMonth: isPaid };
    });
  } catch (error) {
    console.error('Error loading recurring payments', error);
    return [];
  }
};

export const saveCards = (cards: CreditCard[]) => {
  try {
    localStorage.setItem(CARDS_KEY, JSON.stringify(cards));
  } catch (error) {
    console.error('Error saving cards', error);
  }
};

export const getCards = (): CreditCard[] => {
  try {
    const data = localStorage.getItem(CARDS_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Error loading cards', error);
    return [];
  }
};

export const clearAllData = () => {
    localStorage.removeItem(TRANSACTIONS_KEY);
    localStorage.removeItem(RECURRING_KEY);
    localStorage.removeItem(CARDS_KEY);
};

// --- Backup Functions ---

export const getAllData = () => {
  return {
    transactions: getTransactions(),
    recurring: getRecurringPayments(),
    cards: getCards(),
    backupDate: new Date().toISOString(),
    version: '1.0'
  };
};

export const restoreData = (jsonData: any) => {
  try {
    if (jsonData.transactions) saveTransactions(jsonData.transactions);
    if (jsonData.recurring) saveRecurringPayments(jsonData.recurring);
    if (jsonData.cards) saveCards(jsonData.cards);
    return true;
  } catch (e) {
    console.error("Restoration failed", e);
    return false;
  }
};