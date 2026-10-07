import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  updateDoc,
  onSnapshot,
  Unsubscribe,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from './firebase';
import { Transaction, RecurringPayment, CreditCard, UserProfile } from '../types';

// User Profile
export async function saveUserProfile(user: UserProfile): Promise<void> {
  const path = `users/${user.uid}`;
  try {
    const userDocRef = doc(db, 'users', user.uid);
    await setDoc(userDocRef, {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName || user.email.split('@')[0],
      createdAt: user.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

// Transactions Subscriptions & Mutations
export function subscribeUserTransactions(
  userId: string,
  onData: (transactions: Transaction[]) => void,
  onError?: (error: unknown) => void
): Unsubscribe {
  const path = `users/${userId}/transactions`;
  const collectionRef = collection(db, 'users', userId, 'transactions');

  return onSnapshot(
    collectionRef,
    (snapshot) => {
      const items: Transaction[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data() as Transaction;
        items.push({
          ...data,
          id: docSnap.id,
        });
      });
      // Sort newest date first
      items.sort((a, b) => (b.date + (b.time || '')).localeCompare(a.date + (a.time || '')));
      onData(items);
    },
    (error) => {
      if (onError) onError(error);
      handleFirestoreError(error, OperationType.GET, path);
    }
  );
}

export async function addCloudTransaction(userId: string, transaction: Omit<Transaction, 'userId'>): Promise<void> {
  const path = `users/${userId}/transactions/${transaction.id}`;
  try {
    const docRef = doc(db, 'users', userId, 'transactions', transaction.id);
    const payload: Record<string, any> = {
      id: transaction.id,
      userId,
      type: transaction.type,
      amount: Number(transaction.amount),
      category: transaction.category,
      date: transaction.date,
      createdAt: new Date().toISOString(),
    };
    if (transaction.description) payload.description = transaction.description;
    if (transaction.time) payload.time = transaction.time;
    if (transaction.paymentMethod) payload.paymentMethod = transaction.paymentMethod;
    if (transaction.cardId) payload.cardId = transaction.cardId;
    if (transaction.incomeType) payload.incomeType = transaction.incomeType;
    if (transaction.destination) payload.destination = transaction.destination;

    await setDoc(docRef, payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteCloudTransaction(userId: string, transactionId: string): Promise<void> {
  const path = `users/${userId}/transactions/${transactionId}`;
  try {
    const docRef = doc(db, 'users', userId, 'transactions', transactionId);
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// Recurring Payments Subscriptions & Mutations
export function subscribeUserRecurring(
  userId: string,
  onData: (recurring: RecurringPayment[]) => void,
  onError?: (error: unknown) => void
): Unsubscribe {
  const path = `users/${userId}/recurring`;
  const collectionRef = collection(db, 'users', userId, 'recurring');

  return onSnapshot(
    collectionRef,
    (snapshot) => {
      const items: RecurringPayment[] = [];
      const today = new Date();
      const currentMonthKey = `${today.getFullYear()}-${today.getMonth()}`;

      snapshot.forEach((docSnap) => {
        const data = docSnap.data() as RecurringPayment;
        let isPaid = data.isPaidCurrentMonth;
        if (data.lastPaidDate) {
          const lastPaid = new Date(data.lastPaidDate);
          const lastPaidMonthKey = `${lastPaid.getFullYear()}-${lastPaid.getMonth()}`;
          if (lastPaidMonthKey !== currentMonthKey) {
            isPaid = false;
          }
        }
        items.push({
          ...data,
          id: docSnap.id,
          isPaidCurrentMonth: isPaid,
        });
      });
      items.sort((a, b) => a.dayDue - b.dayDue);
      onData(items);
    },
    (error) => {
      if (onError) onError(error);
      handleFirestoreError(error, OperationType.GET, path);
    }
  );
}

export async function addCloudRecurring(userId: string, payment: Omit<RecurringPayment, 'userId'>): Promise<void> {
  const path = `users/${userId}/recurring/${payment.id}`;
  try {
    const docRef = doc(db, 'users', userId, 'recurring', payment.id);
    const payload: Record<string, any> = {
      id: payment.id,
      userId,
      name: payment.name,
      amount: Number(payment.amount),
      dayDue: Number(payment.dayDue),
      isPaidCurrentMonth: Boolean(payment.isPaidCurrentMonth),
    };
    if (payment.lastPaidDate) payload.lastPaidDate = payment.lastPaidDate;

    await setDoc(docRef, payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function updateCloudRecurring(
  userId: string,
  paymentId: string,
  updates: Partial<RecurringPayment>
): Promise<void> {
  const path = `users/${userId}/recurring/${paymentId}`;
  try {
    const docRef = doc(db, 'users', userId, 'recurring', paymentId);
    await updateDoc(docRef, updates);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteCloudRecurring(userId: string, paymentId: string): Promise<void> {
  const path = `users/${userId}/recurring/${paymentId}`;
  try {
    const docRef = doc(db, 'users', userId, 'recurring', paymentId);
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// Credit Cards Subscriptions & Mutations
export function subscribeUserCards(
  userId: string,
  onData: (cards: CreditCard[]) => void,
  onError?: (error: unknown) => void
): Unsubscribe {
  const path = `users/${userId}/cards`;
  const collectionRef = collection(db, 'users', userId, 'cards');

  return onSnapshot(
    collectionRef,
    (snapshot) => {
      const items: CreditCard[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data() as CreditCard;
        items.push({
          ...data,
          id: docSnap.id,
        });
      });
      onData(items);
    },
    (error) => {
      if (onError) onError(error);
      handleFirestoreError(error, OperationType.GET, path);
    }
  );
}

export async function addCloudCard(userId: string, card: Omit<CreditCard, 'userId'>): Promise<void> {
  const path = `users/${userId}/cards/${card.id}`;
  try {
    const docRef = doc(db, 'users', userId, 'cards', card.id);
    await setDoc(docRef, {
      id: card.id,
      userId,
      bank: card.bank,
      last4: card.last4,
      color: card.color,
      limit: Number(card.limit),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function updateCloudCard(userId: string, card: CreditCard): Promise<void> {
  const path = `users/${userId}/cards/${card.id}`;
  try {
    const docRef = doc(db, 'users', userId, 'cards', card.id);
    await updateDoc(docRef, {
      bank: card.bank,
      last4: card.last4,
      color: card.color,
      limit: Number(card.limit),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteCloudCard(userId: string, cardId: string): Promise<void> {
  const path = `users/${userId}/cards/${cardId}`;
  try {
    const docRef = doc(db, 'users', userId, 'cards', cardId);
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// Bulk sync / migration from local storage to cloud
export async function migrateLocalDataToCloud(
  userId: string,
  transactions: Transaction[],
  recurring: RecurringPayment[],
  cards: CreditCard[]
): Promise<number> {
  let count = 0;
  for (const card of cards) {
    await addCloudCard(userId, card);
    count++;
  }
  for (const item of recurring) {
    await addCloudRecurring(userId, item);
    count++;
  }
  for (const tx of transactions) {
    await addCloudTransaction(userId, tx);
    count++;
  }
  return count;
}
