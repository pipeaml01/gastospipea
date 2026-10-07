import React, { useState, useMemo } from 'react';
import { Transaction, FinancialSummary, CreditCard } from '../types';
import { Wallet, CreditCard as CreditCardIcon, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownLeft, Landmark, X, DollarSign, ArrowLeft, Calendar, Cloud, LogIn } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface DashboardProps {
  summary: FinancialSummary;
  recentTransactions: Transaction[];
  allTransactions: Transaction[];
  onSeeAll: () => void;
  cards: CreditCard[];
  cardDebts: Record<string, number>;
  onPayCard: (cardId: string, amount: number, method: 'cash' | 'debit') => void;
  onOpenAuth?: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({ summary, recentTransactions, allTransactions, onSeeAll, cards, cardDebts, onPayCard, onOpenAuth }) => {
  const { user, userProfile } = useAuth();
  const [payingCard, setPayingCard] = useState<{id: string, bank: string, debt: number} | null>(null);
  const [viewingCard, setViewingCard] = useState<CreditCard | null>(null);
  const [payAmount, setPayAmount] = useState('');
  const [paySource, setPaySource] = useState<'cash' | 'debit'>('debit');

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(amount);
  };

  const getCardDetails = (cardId?: string) => {
      if (!cardId) return null;
      return cards.find(c => c.id === cardId);
  };

  const handleOpenPayModal = (e: React.MouseEvent, card: CreditCard, debt: number) => {
      e.stopPropagation(); // Prevent opening the card detail view
      setPayingCard({ id: card.id, bank: card.bank, debt: debt });
      setPayAmount(''); // Reset
      setPaySource('debit'); // Default to bank
  };

  const handleConfirmPay = () => {
      if (payingCard && payAmount) {
          const amount = parseFloat(payAmount);
          if (amount > 0) {
              onPayCard(payingCard.id, amount, paySource);
              setPayingCard(null);
          }
      }
  };

  const todayDate = new Date().toISOString().split('T')[0];

  // Calculate Total Limits and Available
  const totalLimit = cards.reduce((sum, card) => sum + (card.limit || 0), 0);
  const totalAvailable = totalLimit - summary.creditDebt;

  // Filter transactions for specific card viewing
  const cardTransactions = viewingCard 
    ? allTransactions.filter(t => t.cardId === viewingCard.id)
    : [];

  // Calculate Daily Totals for the Viewing Card
  const cardDailyTotals = useMemo(() => {
    if (!viewingCard) return [];
    const stats: Record<string, number> = {};
    
    allTransactions
        .filter(t => t.cardId === viewingCard.id && t.type === 'expense' && t.category !== 'Pago Tarjeta')
        .forEach(t => {
            stats[t.date] = (stats[t.date] || 0) + t.amount;
        });
    
    return Object.entries(stats)
        .sort((a, b) => b[0].localeCompare(a[0])) // Sort by date desc
        .map(([date, total]) => ({ date, total }));
  }, [viewingCard, allTransactions]);

  // Calculate Global Daily Expenses (Last 5 active days)
  const lastDaysExpenses = useMemo(() => {
    const stats: Record<string, number> = {};
    allTransactions
      .filter(t => t.type === 'expense' && t.category !== 'Pago Tarjeta')
      .forEach(t => {
          stats[t.date] = (stats[t.date] || 0) + t.amount;
      });
    
    return Object.entries(stats)
      .sort((a, b) => b[0].localeCompare(a[0]))
      .slice(0, 5) // Show top 5 recent days
      .map(([date, total]) => ({ date, total }));
  }, [allTransactions]);

  const formatDateShort = (dateStr: string) => {
      const [year, month, day] = dateStr.split('-').map(Number);
      const date = new Date(year, month - 1, day);
      return new Intl.DateTimeFormat('es-ES', { weekday: 'short', day: 'numeric' }).format(date);
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <header className="flex justify-between items-center mb-1">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">
            {user ? `¡Hola, ${userProfile?.displayName || 'Usuario'}!` : 'Mi Balance'}
          </h1>
          <p className="text-slate-500 text-xs">
            {user ? 'Tus finanzas sincronizadas en la nube' : 'Resumen financiero en este dispositivo'}
          </p>
        </div>
        <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-slate-900 to-blue-900 overflow-hidden flex items-center justify-center text-white font-bold text-sm shadow-md shadow-slate-900/10">
          {user ? (userProfile?.displayName || user.email || 'U')[0].toUpperCase() : 'FS'}
        </div>
      </header>

      {/* Cloud Banner for Guest Users */}
      {!user && onOpenAuth && (
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-blue-900 text-white p-3.5 rounded-2xl shadow-md flex items-center justify-between gap-3 animate-fade-in">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-2 bg-blue-500/20 border border-blue-400/30 rounded-xl shrink-0">
              <Cloud className="w-4 h-4 text-blue-300" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold leading-tight">Guarda tus datos en la nube</p>
              <p className="text-[11px] text-slate-300 truncate">Crea tu usuario y contraseña gratis</p>
            </div>
          </div>
          <button
            onClick={onOpenAuth}
            className="shrink-0 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs px-3 py-1.5 rounded-xl transition active:scale-95 shadow-sm"
          >
            Crear cuenta
          </button>
        </div>
      )}

      {/* Main Card - Available Liquid Money */}
      <div className="bg-slate-900 text-white rounded-3xl p-6 shadow-xl shadow-slate-900/20">
        <p className="text-slate-400 text-sm font-medium mb-1">Dinero Disponible</p>
        <h2 className="text-4xl font-bold mb-6">{formatCurrency(summary.totalBalance)}</h2>
        
        <div className="flex gap-4">
          <div className="flex-1 bg-white/10 rounded-2xl p-3 backdrop-blur-sm">
            <div className="flex items-center gap-2 mb-1">
              <div className="p-1.5 bg-green-500/20 rounded-full">
                <TrendingUp size={14} className="text-green-400" />
              </div>
              <span className="text-xs text-slate-300">Ingresos</span>
            </div>
            <p className="font-semibold">{formatCurrency(summary.totalIncome)}</p>
          </div>
          <div className="flex-1 bg-white/10 rounded-2xl p-3 backdrop-blur-sm">
             <div className="flex items-center gap-2 mb-1">
              <div className="p-1.5 bg-red-500/20 rounded-full">
                <TrendingDown size={14} className="text-red-400" />
              </div>
              <span className="text-xs text-slate-300">Gastos</span>
            </div>
            <p className="font-semibold">{formatCurrency(summary.totalExpense)}</p>
          </div>
        </div>
      </div>

      {/* Accounts Breakdown - 3 Way Split */}
      <div className="grid grid-cols-2 gap-4">
        {/* Bank */}
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-between h-28">
            <div className="flex justify-between items-start">
                <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                    <Landmark size={20} />
                </div>
            </div>
            <div>
                <p className="text-xs text-slate-400 font-medium">Cuentas/Banco</p>
                <p className="text-lg font-bold text-slate-800">{formatCurrency(summary.accountBalance)}</p>
            </div>
        </div>
        
        {/* Cash */}
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-between h-28">
            <div className="flex justify-between items-start">
                <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                    <Wallet size={20} />
                </div>
            </div>
            <div>
                <p className="text-xs text-slate-400 font-medium">Efectivo</p>
                <p className="text-lg font-bold text-slate-800">{formatCurrency(summary.cashBalance)}</p>
            </div>
        </div>
      </div>

      {/* Credit Summary Block: Debt + Available */}
      <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
              <div className="p-2 bg-slate-100 text-slate-600 rounded-lg">
                  <CreditCardIcon size={18} />
              </div>
              <h3 className="font-bold text-slate-700 text-sm">Resumen Tarjetas de Crédito</h3>
          </div>
          
          <div className="flex gap-3">
              {/* Total Debt */}
              <div className="flex-1 p-3 bg-red-50 rounded-xl border border-red-100">
                   <p className="text-[10px] text-red-400 font-bold uppercase mb-1 tracking-wider">Deuda Total</p>
                   <p className="text-lg font-bold text-red-700">{formatCurrency(summary.creditDebt)}</p>
              </div>
              {/* Total Available Limit */}
              <div className="flex-1 p-3 bg-blue-50 rounded-xl border border-blue-100">
                   <p className="text-[10px] text-blue-400 font-bold uppercase mb-1 tracking-wider">Cupo Disponible</p>
                   <p className="text-lg font-bold text-blue-700">{formatCurrency(totalAvailable)}</p>
              </div>
          </div>
      </div>

      {/* Credit Cards Slider/Grid */}
      <div>
        <h3 className="font-bold text-lg text-slate-800 mb-3">Mis Tarjetas</h3>
        {cards.length === 0 ? (
           <div className="bg-slate-50 p-4 rounded-2xl border border-dashed border-slate-200 text-center text-sm text-slate-400">
               No hay tarjetas registradas
           </div>
        ) : (
            <div className="space-y-3">
                {cards.map(card => {
                    const debt = cardDebts[card.id] || 0;
                    const limit = card.limit || 0;
                    const available = limit - debt;
                    const percentage = limit > 0 ? (debt / limit) * 100 : 0;
                    
                    return (
                        <div 
                            key={card.id} 
                            onClick={() => setViewingCard(card)}
                            className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 cursor-pointer hover:border-blue-200 transition-colors"
                        >
                            <div className="flex justify-between items-center mb-3">
                                <div className="flex items-center gap-2">
                                    <div className={`w-8 h-5 rounded bg-gradient-to-r ${card.color}`}></div>
                                    <div>
                                        <p className="font-bold text-slate-700 leading-tight">{card.bank}</p>
                                        <p className="text-[10px] text-slate-400">**** {card.last4}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-xs text-slate-400 font-medium">Disponible</p>
                                    <p className={`font-bold ${available < 0 ? 'text-red-500' : 'text-slate-800'}`}>{formatCurrency(available)}</p>
                                </div>
                            </div>
                            
                            {/* Progress Bar */}
                            <div className="h-2 bg-slate-100 rounded-full overflow-hidden mb-3">
                                <div 
                                    className={`h-full rounded-full transition-all duration-500 ${percentage > 90 ? 'bg-red-500' : 'bg-blue-500'}`}
                                    style={{ width: `${Math.min(percentage, 100)}%` }}
                                ></div>
                            </div>
                            
                            <div className="flex justify-between items-end">
                                <div className="text-[10px] font-medium text-slate-400">
                                    <p className="mb-0.5">Deuda: <span className="text-slate-600 font-bold">{formatCurrency(debt)}</span></p>
                                    <p>Cupo: {formatCurrency(limit)}</p>
                                </div>
                                
                                {debt > 0 && (
                                    <button 
                                        onClick={(e) => handleOpenPayModal(e, card, debt)}
                                        className="text-xs bg-slate-900 text-white px-3 py-1.5 rounded-lg font-bold shadow-sm active:scale-95 transition-transform"
                                    >
                                        Pagar
                                    </button>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        )}
      </div>

      {/* Global Daily Expenses Widget */}
      {lastDaysExpenses.length > 0 && (
          <div>
              <h3 className="font-bold text-lg text-slate-800 mb-3">Gasto Diario Global</h3>
              <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar">
                  {lastDaysExpenses.map((day) => (
                      <div key={day.date} className="min-w-[120px] bg-white p-3 rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center">
                          <p className="text-xs font-bold text-slate-400 uppercase mb-1">{formatDateShort(day.date)}</p>
                          <p className="font-bold text-slate-800">{formatCurrency(day.total)}</p>
                      </div>
                  ))}
              </div>
          </div>
      )}

      {/* Recent Transactions */}
      <div>
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-bold text-lg text-slate-800">Recientes</h3>
          <button onClick={onSeeAll} className="text-sm text-accent font-medium">Ver todo</button>
        </div>

        <div className="space-y-3">
            {recentTransactions.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-sm bg-white rounded-2xl border border-dashed border-slate-200">
                    No hay movimientos recientes
                </div>
            ) : (
                recentTransactions.map(t => {
                    const card = getCardDetails(t.cardId);
                    const isToday = t.date === todayDate;
                    const isCreditPayment = t.category === 'Pago Tarjeta';
                    
                    return (
                        <div key={t.id} className="bg-white p-3 rounded-2xl shadow-sm border border-slate-50 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className={`p-3 rounded-xl shrink-0 ${
                                    t.type === 'income' 
                                    ? 'bg-green-50 text-green-600' 
                                    : isCreditPayment 
                                        ? 'bg-blue-50 text-blue-600' // Distinct color for payments
                                        : 'bg-red-50 text-red-600'
                                }`}>
                                    {t.type === 'income' ? <ArrowDownLeft size={20} /> : <ArrowUpRight size={20} />}
                                </div>
                                <div className="min-w-0">
                                    <p className="font-semibold text-slate-800 truncate">
                                        {t.description ? t.description : t.category}
                                    </p>
                                    <div className="text-xs text-slate-400 flex items-center gap-1 flex-wrap">
                                        {/* If description exists, show category as tag */}
                                        {t.description && <span className="font-medium text-slate-500">{t.category}</span>}
                                        {t.description && <span>•</span>}
                                        
                                        {/* Time/Date */}
                                        {t.time && <span className="text-slate-500">{t.time}</span>}
                                        {!isToday && <span>{t.date.substring(5)}</span>}
                                        
                                        {/* Card Info */}
                                        {card && (
                                            <>
                                                <span>•</span>
                                                <span className="flex items-center gap-1 text-blue-500 font-medium truncate">
                                                    {card.bank} <span className="opacity-70">({card.last4})</span>
                                                </span>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <span className={`font-bold whitespace-nowrap ml-2 ${
                                t.type === 'income' 
                                ? 'text-green-600' 
                                : isCreditPayment 
                                    ? 'text-blue-600' 
                                    : 'text-slate-800'
                            }`}>
                                {t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount)}
                            </span>
                        </div>
                    );
                })
            )}
        </div>
      </div>

      {/* Pay Card Modal */}
      {payingCard && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-6 animate-in fade-in duration-200">
            <div className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl scale-100 animate-in zoom-in-95">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h3 className="text-lg font-bold text-slate-800">Pagar Tarjeta</h3>
                        <p className="text-xs text-slate-500 font-medium">{payingCard.bank}</p>
                    </div>
                    <button onClick={() => setPayingCard(null)} className="p-1.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <div className="bg-blue-50 p-4 rounded-2xl mb-6 flex justify-between items-center">
                    <span className="text-sm font-bold text-blue-700">Deuda Actual</span>
                    <span className="text-xl font-bold text-blue-900">{formatCurrency(payingCard.debt)}</span>
                </div>
                
                <div className="space-y-4 mb-6">
                    <div>
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">Monto a pagar</label>
                        <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                                <DollarSign size={16} />
                            </span>
                            <input 
                                type="number" 
                                value={payAmount}
                                onChange={(e) => setPayAmount(e.target.value)}
                                className="w-full bg-slate-50 p-4 pl-10 rounded-2xl font-bold text-slate-800 outline-none focus:ring-2 focus:ring-blue-500/20"
                                placeholder="0"
                                autoFocus
                            />
                            <button 
                                onClick={() => setPayAmount(payingCard.debt.toString())}
                                className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-blue-100 text-blue-600 text-xs font-bold rounded-lg hover:bg-blue-200"
                            >
                                Total
                            </button>
                        </div>
                    </div>

                    <div>
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">Origen del dinero</label>
                        <div className="grid grid-cols-2 gap-3">
                             <button
                                onClick={() => setPaySource('debit')}
                                className={`flex flex-col items-center justify-center gap-1 py-3 rounded-xl border-2 transition-all ${
                                    paySource === 'debit' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-100 text-slate-400 bg-white'
                                }`}
                             >
                                 <Landmark size={20} />
                                 <span className="text-xs font-bold">Cuenta</span>
                             </button>
                             <button
                                onClick={() => setPaySource('cash')}
                                className={`flex flex-col items-center justify-center gap-1 py-3 rounded-xl border-2 transition-all ${
                                    paySource === 'cash' ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-100 text-slate-400 bg-white'
                                }`}
                             >
                                 <Wallet size={20} />
                                 <span className="text-xs font-bold">Efectivo</span>
                             </button>
                        </div>
                    </div>
                </div>

                <button 
                    onClick={handleConfirmPay}
                    disabled={!payAmount || parseFloat(payAmount) <= 0}
                    className="w-full py-4 bg-slate-900 text-white font-bold rounded-2xl shadow-lg shadow-slate-900/20 active:scale-95 transition-transform disabled:opacity-50 disabled:active:scale-100"
                >
                    Confirmar Pago
                </button>
            </div>
        </div>
      )}

      {/* Full Screen Card Details View */}
      {viewingCard && (
          <div className="fixed inset-0 z-50 bg-slate-50 overflow-y-auto animate-in slide-in-from-right duration-300">
              {/* Header */}
              <div className="bg-white px-6 pt-12 pb-6 rounded-b-[2.5rem] shadow-sm mb-6 sticky top-0 z-10">
                  <div className="flex items-center justify-between mb-6">
                      <button onClick={() => setViewingCard(null)} className="p-2 -ml-2 text-slate-600 hover:bg-slate-100 rounded-full transition-colors">
                          <ArrowLeft size={24} />
                      </button>
                      <h2 className="font-bold text-lg text-slate-800">Detalle de Tarjeta</h2>
                      <div className="w-8"></div>
                  </div>

                  {/* Card Visual */}
                  <div className={`bg-gradient-to-r ${viewingCard.color} text-white p-6 rounded-2xl shadow-xl relative overflow-hidden mb-6`}>
                       <div className="flex justify-between items-center relative z-10">
                            <div className="flex items-center gap-2">
                                <CreditCardIcon size={24} className="opacity-80" />
                                <span className="font-bold text-xl tracking-wide">{viewingCard.bank}</span>
                            </div>
                            <span className="font-mono text-lg opacity-80">•••• {viewingCard.last4}</span>
                        </div>
                        <div className="absolute -bottom-8 -right-8 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
                  </div>

                  {/* Stats Grid */}
                  <div className="grid grid-cols-2 gap-4">
                      <div className="bg-red-50 p-4 rounded-2xl border border-red-100">
                           <p className="text-xs text-red-400 font-bold uppercase mb-1">Deuda Actual</p>
                           <p className="text-xl font-bold text-red-700">{formatCurrency(cardDebts[viewingCard.id] || 0)}</p>
                      </div>
                      <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100">
                           <p className="text-xs text-blue-400 font-bold uppercase mb-1">Disponible</p>
                           <p className="text-xl font-bold text-blue-700">{formatCurrency((viewingCard.limit || 0) - (cardDebts[viewingCard.id] || 0))}</p>
                      </div>
                  </div>
                  
                  {/* Action Bar */}
                  {(cardDebts[viewingCard.id] || 0) > 0 && (
                       <button 
                           onClick={(e) => handleOpenPayModal(e, viewingCard, cardDebts[viewingCard.id] || 0)}
                           className="w-full mt-6 py-3 bg-slate-900 text-white font-bold rounded-xl shadow-lg shadow-slate-900/20 active:scale-95 transition-transform"
                       >
                           Pagar Tarjeta
                       </button>
                  )}
              </div>

              {/* Transactions List */}
              <div className="px-6 pb-20 space-y-8">
                  {/* Daily Summary Section */}
                  <div>
                      <h3 className="font-bold text-lg text-slate-800 mb-4 flex items-center gap-2">
                          <Calendar size={18} className="text-slate-400" />
                          Gastos por Día
                      </h3>
                      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                          {cardDailyTotals.length === 0 ? (
                               <div className="p-4 text-center text-sm text-slate-400">Sin gastos registrados</div>
                          ) : (
                              cardDailyTotals.map((day, index) => (
                                  <div key={day.date} className={`flex justify-between items-center p-4 ${index !== cardDailyTotals.length - 1 ? 'border-b border-slate-50' : ''}`}>
                                      <span className="text-sm font-medium text-slate-600">{day.date}</span>
                                      <span className="font-bold text-slate-800">{formatCurrency(day.total)}</span>
                                  </div>
                              ))
                          )}
                      </div>
                  </div>

                  {/* Full List Section */}
                  <div>
                    <h3 className="font-bold text-lg text-slate-800 mb-4">Todos los Movimientos</h3>
                    
                    <div className="space-y-3">
                        {cardTransactions.length === 0 ? (
                            <div className="text-center py-10 text-slate-400">
                                <p>No hay movimientos registrados con esta tarjeta.</p>
                            </div>
                        ) : (
                            cardTransactions.map(t => {
                                const isPayment = t.category === 'Pago Tarjeta';
                                return (
                                    <div key={t.id} className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className={`p-3 rounded-xl shrink-0 ${
                                                isPayment ? 'bg-blue-50 text-blue-600' : 'bg-red-50 text-red-600'
                                            }`}>
                                                {isPayment ? <ArrowDownLeft size={20} /> : <ArrowUpRight size={20} />}
                                            </div>
                                            <div>
                                                <p className="font-bold text-slate-800">{t.description || t.category}</p>
                                                <p className="text-xs text-slate-400">{t.date} • {t.time}</p>
                                            </div>
                                        </div>
                                        <span className={`font-bold ${isPayment ? 'text-blue-600' : 'text-slate-800'}`}>
                                            {isPayment ? '-' : ''}{formatCurrency(t.amount)}
                                        </span>
                                    </div>
                                );
                            })
                        )}
                    </div>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default Dashboard;