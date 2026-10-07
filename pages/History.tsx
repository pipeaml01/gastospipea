import React, { useState, useMemo } from 'react';
import { Transaction, CreditCard } from '../types';
import { Search, Filter, ArrowUpRight, ArrowDownLeft, Calendar } from 'lucide-react';

interface HistoryProps {
  transactions: Transaction[];
  onDelete: (id: string) => void;
  cards: CreditCard[];
}

const History: React.FC<HistoryProps> = ({ transactions, onDelete, cards }) => {
  const [filter, setFilter] = useState<'all' | 'expense' | 'income'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      const matchesType = filter === 'all' || t.type === filter;
      const matchesSearch = 
        t.category.toLowerCase().includes(searchTerm.toLowerCase()) || 
        (t.description && t.description.toLowerCase().includes(searchTerm.toLowerCase()));
      return matchesType && matchesSearch;
    }).sort((a, b) => {
        // Sort by date desc, then by time desc if date is equal
        const timeA = a.time || '00:00';
        const timeB = b.time || '00:00';
        const dateDiff = new Date(b.date).getTime() - new Date(a.date).getTime();
        
        if (dateDiff === 0) {
            return timeB.localeCompare(timeA);
        }
        return dateDiff;
    });
  }, [transactions, filter, searchTerm]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(amount);
  };

  const formatDate = (dateStr: string) => {
      const date = new Date(dateStr);
      const options: Intl.DateTimeFormatOptions = { weekday: 'short', day: 'numeric', month: 'short' };
      const [year, month, day] = dateStr.split('-').map(Number);
      const localDate = new Date(year, month - 1, day);
      return new Intl.DateTimeFormat('es-ES', options).format(localDate);
  }

  const getCardDetails = (cardId?: string) => {
    if (!cardId) return null;
    return cards.find(c => c.id === cardId);
  };

  // Group by date
  const groupedTransactions = useMemo(() => {
      const groups: Record<string, Transaction[]> = {};
      filteredTransactions.forEach(t => {
          if (!groups[t.date]) groups[t.date] = [];
          groups[t.date].push(t);
      });
      return groups;
  }, [filteredTransactions]);

  return (
    <div className="p-6 pb-24 min-h-screen bg-gray-50">
      <h1 className="text-2xl font-bold text-slate-800 mb-6">Historial</h1>

      {/* Search and Filter */}
      <div className="flex gap-3 mb-6">
        <div className="flex-1 bg-white p-3 rounded-xl shadow-sm border border-slate-100 flex items-center gap-2">
            <Search size={18} className="text-slate-400" />
            <input 
                type="text" 
                placeholder="Buscar..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-transparent outline-none text-sm font-medium text-slate-700"
            />
        </div>
        <div className="bg-white p-1 rounded-xl shadow-sm border border-slate-100 flex items-center">
            {(['all', 'expense', 'income'] as const).map((f) => (
                <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className={`px-3 py-2 rounded-lg text-xs font-bold capitalize transition-all ${
                        filter === f ? 'bg-slate-800 text-white shadow-md' : 'text-slate-400 hover:text-slate-600'
                    }`}
                >
                    {f === 'all' ? 'Todos' : f === 'expense' ? 'G' : 'I'}
                </button>
            ))}
        </div>
      </div>

      {/* List */}
      <div className="space-y-6">
          {Object.keys(groupedTransactions).length === 0 ? (
               <div className="text-center py-12 text-slate-400">
                   <p>No se encontraron movimientos.</p>
               </div>
          ) : (
              Object.keys(groupedTransactions).map(date => {
                  const dailyTransactions = groupedTransactions[date];
                  const dailyExpenseTotal = dailyTransactions
                    .filter(t => t.type === 'expense' && t.category !== 'Pago Tarjeta')
                    .reduce((sum, t) => sum + t.amount, 0);

                  return (
                    <div key={date}>
                        <div className="flex justify-between items-center mb-3 px-1">
                            <div className="flex items-center gap-2">
                                <Calendar size={14} className="text-slate-400" />
                                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wide">{formatDate(date)}</h3>
                            </div>
                            {dailyExpenseTotal > 0 && (
                                <span className="text-xs font-bold text-slate-500 bg-slate-200/50 px-2 py-1 rounded-lg">
                                    Total: {formatCurrency(dailyExpenseTotal)}
                                </span>
                            )}
                        </div>
                        <div className="space-y-3">
                            {dailyTransactions.map(t => {
                                const card = getCardDetails(t.cardId);
                                return (
                                    <div key={t.id} className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex justify-between items-center group relative overflow-hidden">
                                        <div className="flex items-center gap-4 relative z-10 w-full overflow-hidden">
                                            <div className={`w-10 h-10 rounded-full shrink-0 flex items-center justify-center ${
                                                t.type === 'income' ? 'bg-green-100 text-green-600' : 'bg-red-50 text-red-500'
                                            }`}>
                                                {t.type === 'income' ? <ArrowDownLeft size={20} /> : <ArrowUpRight size={20} />}
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <p className="font-bold text-slate-800 truncate">
                                                    {t.description ? t.description : t.category}
                                                </p>
                                                
                                                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400 mt-0.5">
                                                    {t.description && <span className="font-medium text-slate-500">{t.category}</span>}
                                                    
                                                    {/* Time */}
                                                    {t.time && (
                                                        <>
                                                            {t.description && <span>•</span>}
                                                            <span>{t.time}</span>
                                                        </>
                                                    )}

                                                    {/* Card Details */}
                                                    {card && (
                                                       <>
                                                           <span>•</span>
                                                           <span className="text-blue-500 font-medium truncate">{card.bank} ****{card.last4}</span>
                                                       </>
                                                    )}
                                                    
                                                    {/* Method Label if no card */}
                                                    {!card && (
                                                        <span className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-500 uppercase font-bold text-[9px] tracking-wide">
                                                            {t.type === 'income' ? t.destination : t.paymentMethod}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="text-right relative z-10 pl-2 shrink-0">
                                            <p className={`font-bold ${t.type === 'income' ? 'text-green-600' : 'text-slate-800'}`}>
                                                {t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount)}
                                            </p>
                                            <button 
                                                onClick={() => onDelete(t.id)}
                                                className="text-[10px] text-red-400 underline mt-1"
                                            >
                                                Eliminar
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                  );
              })
          )}
      </div>
    </div>
  );
};

export default History;