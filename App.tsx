import React, { useState, useEffect, useMemo } from 'react';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import AddTransaction from './pages/AddTransaction';
import History from './pages/History';
import Recurring from './pages/Recurring';
import Stats from './pages/Stats';
import { AuthModal } from './components/AuthModal';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Transaction, RecurringPayment, FinancialSummary, CreditCard, PaymentMethod } from './types';
import * as storage from './services/storageService';
import {
  subscribeUserTransactions,
  subscribeUserRecurring,
  subscribeUserCards,
  addCloudTransaction,
  deleteCloudTransaction,
  addCloudRecurring,
  updateCloudRecurring,
  deleteCloudRecurring,
  addCloudCard,
  updateCloudCard,
  deleteCloudCard,
  migrateLocalDataToCloud,
} from './services/firestoreService';

const FinanzaApp: React.FC = () => {
  const { user, loading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [recurringPayments, setRecurringPayments] = useState<RecurringPayment[]>([]);
  const [cards, setCards] = useState<CreditCard[]>([]);

  // Track if there are items stored in localStorage available to migrate
  const [hasLocalData, setHasLocalData] = useState(false);

  const checkLocalData = () => {
    const localTx = storage.getTransactions();
    const localRec = storage.getRecurringPayments();
    const localCd = storage.getCards();
    setHasLocalData(localTx.length > 0 || localRec.length > 0 || localCd.length > 0);
  };

  // Reload data when offline / local
  const loadLocalData = () => {
    setTransactions(storage.getTransactions());
    setRecurringPayments(storage.getRecurringPayments());
    setCards(storage.getCards());
    checkLocalData();
  };

  // Setup data sync: either real-time Firestore when authenticated, or localStorage when guest
  useEffect(() => {
    if (authLoading) return;

    if (user) {
      // Subscribe to authenticated user's private cloud Firestore subcollections
      const unsubTx = subscribeUserTransactions(user.uid, (data) => {
        setTransactions(data);
      });
      const unsubRec = subscribeUserRecurring(user.uid, (data) => {
        setRecurringPayments(data);
      });
      const unsubCards = subscribeUserCards(user.uid, (data) => {
        setCards(data);
      });

      checkLocalData();

      return () => {
        unsubTx();
        unsubRec();
        unsubCards();
      };
    } else {
      // Local fallback
      loadLocalData();
    }
  }, [user, authLoading]);

  // Sync to local storage only if NOT authenticated (guest mode)
  useEffect(() => {
    if (!user && !authLoading) {
      storage.saveTransactions(transactions);
      checkLocalData();
    }
  }, [transactions, user, authLoading]);

  useEffect(() => {
    if (!user && !authLoading) {
      storage.saveRecurringPayments(recurringPayments);
      checkLocalData();
    }
  }, [recurringPayments, user, authLoading]);

  useEffect(() => {
    if (!user && !authLoading) {
      storage.saveCards(cards);
      checkLocalData();
    }
  }, [cards, user, authLoading]);

  // Calculate debts per card
  const cardDebts = useMemo(() => {
    const debts: Record<string, number> = {};
    cards.forEach((c) => (debts[c.id] = 0));

    transactions.forEach((t) => {
      if (t.type === 'expense') {
        if (t.paymentMethod === 'credit' && t.cardId) {
          debts[t.cardId] = (debts[t.cardId] || 0) + t.amount;
        } else if (t.category === 'Pago Tarjeta' && t.cardId) {
          debts[t.cardId] = (debts[t.cardId] || 0) - t.amount;
        }
      }
    });
    return debts;
  }, [transactions, cards]);

  const summary = useMemo<FinancialSummary>(() => {
    let cash = 0;
    let account = 0;
    let income = 0;
    let expense = 0;
    let creditDebt = 0;

    transactions.forEach((t) => {
      if (t.type === 'income') {
        income += t.amount;
        if (t.destination === 'cash') {
          cash += t.amount;
        } else {
          account += t.amount;
        }
      } else {
        if (t.category === 'Pago Tarjeta') {
          if (t.paymentMethod === 'cash') {
            cash -= t.amount;
          } else if (t.paymentMethod === 'debit') {
            account -= t.amount;
          }
          creditDebt -= t.amount;
        } else {
          expense += t.amount;
          if (t.paymentMethod === 'cash') {
            cash -= t.amount;
          } else if (t.paymentMethod === 'debit') {
            account -= t.amount;
          } else if (t.paymentMethod === 'credit') {
            creditDebt += t.amount;
          }
        }
      }
    });

    return {
      totalBalance: cash + account,
      cashBalance: cash,
      accountBalance: account,
      creditDebt,
      totalIncome: income,
      totalExpense: expense,
    };
  }, [transactions]);

  const handleAddTransaction = async (transactionData: Omit<Transaction, 'id'>) => {
    const newTransaction: Transaction = {
      ...transactionData,
      id: Date.now().toString(),
      userId: user?.uid,
    };

    if (user) {
      try {
        await addCloudTransaction(user.uid, newTransaction);
      } catch (err) {
        console.error('Error adding transaction to cloud', err);
      }
    } else {
      setTransactions((prev) => [newTransaction, ...prev]);
    }
    setActiveTab('dashboard');
  };

  const handleDeleteTransaction = async (id: string) => {
    if (window.confirm('¿Borrar este movimiento?')) {
      if (user) {
        try {
          await deleteCloudTransaction(user.uid, id);
        } catch (err) {
          console.error('Error deleting transaction from cloud', err);
        }
      } else {
        setTransactions((prev) => prev.filter((t) => t.id !== id));
      }
    }
  };

  const handleAddRecurring = async (paymentData: Omit<RecurringPayment, 'id' | 'isPaidCurrentMonth'>) => {
    const newPayment: RecurringPayment = {
      ...paymentData,
      id: Date.now().toString(),
      isPaidCurrentMonth: false,
      userId: user?.uid,
    };

    if (user) {
      try {
        await addCloudRecurring(user.uid, newPayment);
      } catch (err) {
        console.error('Error adding recurring payment to cloud', err);
      }
    } else {
      setRecurringPayments((prev) => [...prev, newPayment]);
    }
  };

  const handlePayRecurring = async (id: string, method: PaymentMethod, cardId?: string) => {
    const payment = recurringPayments.find((p) => p.id === id);
    const nowIso = new Date().toISOString();

    const newTransaction: Transaction = {
      id: Date.now().toString(),
      type: 'expense',
      amount: payment ? payment.amount : 0,
      category: 'Mensualidad',
      description: payment ? `Pago mensual: ${payment.name}` : 'Pago recurrente',
      date: nowIso.split('T')[0],
      time: new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
      paymentMethod: method,
      cardId,
      userId: user?.uid,
    };

    if (user) {
      try {
        await updateCloudRecurring(user.uid, id, {
          isPaidCurrentMonth: true,
          lastPaidDate: nowIso,
        });
        if (payment) {
          await addCloudTransaction(user.uid, newTransaction);
        }
      } catch (err) {
        console.error('Error processing cloud recurring pay', err);
      }
    } else {
      setRecurringPayments((prev) =>
        prev.map((p) => (p.id === id ? { ...p, isPaidCurrentMonth: true, lastPaidDate: nowIso } : p))
      );
      if (payment) {
        setTransactions((prev) => [newTransaction, ...prev]);
      }
    }
  };

  const handleUnpayRecurring = async (id: string) => {
    if (
      window.confirm(
        '¿Marcar como NO pagado? (Esto no borra el gasto del historial, debes borrarlo manualmente si es necesario)'
      )
    ) {
      if (user) {
        try {
          await updateCloudRecurring(user.uid, id, {
            isPaidCurrentMonth: false,
          });
        } catch (err) {
          console.error('Error unpaying cloud recurring', err);
        }
      } else {
        setRecurringPayments((prev) =>
          prev.map((p) => (p.id === id ? { ...p, isPaidCurrentMonth: false } : p))
        );
      }
    }
  };

  const handleDeleteRecurring = async (id: string) => {
    if (window.confirm('¿Eliminar este pago recurrente?')) {
      if (user) {
        try {
          await deleteCloudRecurring(user.uid, id);
        } catch (err) {
          console.error('Error deleting cloud recurring', err);
        }
      } else {
        setRecurringPayments((prev) => prev.filter((p) => p.id !== id));
      }
    }
  };

  const handleAddCard = async (cardData: Omit<CreditCard, 'id'>) => {
    const newCard: CreditCard = {
      ...cardData,
      id: Date.now().toString(),
      userId: user?.uid,
    };

    if (user) {
      try {
        await addCloudCard(user.uid, newCard);
      } catch (err) {
        console.error('Error adding cloud card', err);
      }
    } else {
      setCards((prev) => [...prev, newCard]);
    }
  };

  const handleEditCard = async (updatedCard: CreditCard) => {
    if (user) {
      try {
        await updateCloudCard(user.uid, updatedCard);
      } catch (err) {
        console.error('Error updating cloud card', err);
      }
    } else {
      setCards((prev) => prev.map((c) => (c.id === updatedCard.id ? updatedCard : c)));
    }
  };

  const handleDeleteCard = async (id: string) => {
    if (window.confirm('¿Eliminar esta tarjeta?')) {
      if (user) {
        try {
          await deleteCloudCard(user.uid, id);
        } catch (err) {
          console.error('Error deleting cloud card', err);
        }
      } else {
        setCards((prev) => prev.filter((c) => c.id !== id));
      }
    }
  };

  const handlePayCard = async (cardId: string, amount: number, method: 'cash' | 'debit') => {
    const card = cards.find((c) => c.id === cardId);
    const newTransaction: Transaction = {
      id: Date.now().toString(),
      type: 'expense',
      amount,
      category: 'Pago Tarjeta',
      description: `Abono: ${card?.bank || 'Tarjeta'}`,
      date: new Date().toISOString().split('T')[0],
      time: new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
      paymentMethod: method,
      cardId,
      userId: user?.uid,
    };

    if (user) {
      try {
        await addCloudTransaction(user.uid, newTransaction);
      } catch (err) {
        console.error('Error adding payment to cloud', err);
      }
    } else {
      setTransactions((prev) => [newTransaction, ...prev]);
    }
  };

  const handleClearData = async () => {
    if (user) {
      // Clear cloud data for user
      for (const t of transactions) {
        await deleteCloudTransaction(user.uid, t.id);
      }
      for (const r of recurringPayments) {
        await deleteCloudRecurring(user.uid, r.id);
      }
      for (const c of cards) {
        await deleteCloudCard(user.uid, c.id);
      }
    }
    storage.clearAllData();
    setTransactions([]);
    setRecurringPayments([]);
    setCards([]);
    checkLocalData();
    setActiveTab('dashboard');
  };

  const handleSyncLocalToCloud = async () => {
    if (!user) return;
    const localTx = storage.getTransactions();
    const localRec = storage.getRecurringPayments();
    const localCd = storage.getCards();
    await migrateLocalDataToCloud(user.uid, localTx, localRec, localCd);
    storage.clearAllData();
    checkLocalData();
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <Dashboard
            summary={summary}
            recentTransactions={transactions.slice(0, 5)}
            allTransactions={transactions}
            onSeeAll={() => setActiveTab('history')}
            cards={cards}
            cardDebts={cardDebts}
            onPayCard={handlePayCard}
            onOpenAuth={() => setIsAuthModalOpen(true)}
          />
        );
      case 'add':
        return (
          <AddTransaction
            onAdd={handleAddTransaction}
            onCancel={() => setActiveTab('dashboard')}
            cards={cards}
            onAddCard={handleAddCard}
          />
        );
      case 'history':
        return (
          <History
            transactions={transactions}
            onDelete={handleDeleteTransaction}
            cards={cards}
          />
        );
      case 'recurring':
        return (
          <Recurring
            payments={recurringPayments}
            onAdd={handleAddRecurring}
            onPay={handlePayRecurring}
            onUnpay={handleUnpayRecurring}
            onDelete={handleDeleteRecurring}
            cards={cards}
          />
        );
      case 'stats':
        return (
          <Stats
            transactions={transactions}
            onClearData={handleClearData}
            cards={cards}
            onAddCard={handleAddCard}
            onEditCard={handleEditCard}
            onDeleteCard={handleDeleteCard}
            onImportData={loadLocalData}
            onOpenAuth={() => setIsAuthModalOpen(true)}
            onSyncLocalToCloud={handleSyncLocalToCloud}
            hasLocalDataToSync={hasLocalData && !!user}
          />
        );
      default:
        return (
          <Dashboard
            summary={summary}
            recentTransactions={transactions.slice(0, 5)}
            allTransactions={transactions}
            onSeeAll={() => setActiveTab('history')}
            cards={cards}
            cardDebts={cardDebts}
            onPayCard={handlePayCard}
            onOpenAuth={() => setIsAuthModalOpen(true)}
          />
        );
    }
  };

  return (
    <>
      {activeTab === 'add' ? (
        renderContent()
      ) : (
        <Layout
          activeTab={activeTab}
          onNavigate={setActiveTab}
          onOpenAuth={() => setIsAuthModalOpen(true)}
        >
          {renderContent()}
        </Layout>
      )}

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        canDismiss={true}
      />
    </>
  );
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <FinanzaApp />
    </AuthProvider>
  );
};

export default App;
