import React, { useState } from 'react';
import { RecurringPayment, CreditCard, PaymentMethod } from '../types';
import { Plus, Check, Bell, Trash2, AlertCircle, X, CreditCard as CardIcon, Wallet, Landmark } from 'lucide-react';

interface RecurringProps {
  payments: RecurringPayment[];
  onAdd: (payment: Omit<RecurringPayment, 'id' | 'isPaidCurrentMonth'>) => void;
  onPay: (id: string, method: PaymentMethod, cardId?: string) => void;
  onUnpay: (id: string) => void;
  onDelete: (id: string) => void;
  cards: CreditCard[];
}

const Recurring: React.FC<RecurringProps> = ({ payments, onAdd, onPay, onUnpay, onDelete, cards }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [newAmount, setNewAmount] = useState('');
  const [newDay, setNewDay] = useState('');

  // Payment Modal State
  const [payingId, setPayingId] = useState<string | null>(null);
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>('debit'); // Default to debit for bills usually
  const [selectedCardId, setSelectedCardId] = useState<string>('');

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(amount);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newName && newAmount && newDay) {
      onAdd({
        name: newName,
        amount: parseFloat(newAmount),
        dayDue: parseInt(newDay),
      });
      setIsAdding(false);
      setNewName('');
      setNewAmount('');
      setNewDay('');
    }
  };

  const handleOpenPayModal = (id: string) => {
      setPayingId(id);
      setSelectedMethod('debit'); // Reset to default
      setSelectedCardId('');
  };

  const handleConfirmPay = () => {
      if (payingId) {
          if (selectedMethod === 'credit' && !selectedCardId) {
              alert('Por favor selecciona una tarjeta');
              return;
          }
          onPay(payingId, selectedMethod, selectedMethod === 'credit' ? selectedCardId : undefined);
          setPayingId(null);
      }
  };

  // Sort: Unpaid first, then by day due
  const sortedPayments = [...payments].sort((a, b) => {
    if (a.isPaidCurrentMonth === b.isPaidCurrentMonth) {
        return a.dayDue - b.dayDue;
    }
    return a.isPaidCurrentMonth ? 1 : -1;
  });

  const todayDay = new Date().getDate();

  return (
    <div className="p-6 pb-24 min-h-screen bg-slate-50 relative">
      <div className="flex justify-between items-center mb-6">
        <div>
            <h1 className="text-2xl font-bold text-slate-800">Mensualidades</h1>
            <p className="text-xs text-slate-500">Pagos fijos y recordatorios</p>
        </div>
        <button 
            onClick={() => setIsAdding(!isAdding)}
            className="p-3 bg-slate-900 text-white rounded-full shadow-lg shadow-slate-900/20"
        >
            <Plus size={20} />
        </button>
      </div>

      {isAdding && (
        <form onSubmit={handleSubmit} className="bg-white p-4 rounded-2xl shadow-lg border border-slate-100 mb-6 animate-in slide-in-from-top-4">
            <h3 className="font-bold text-slate-800 mb-3">Nuevo Pago Recurrente</h3>
            <div className="space-y-3">
                <input 
                    type="text" 
                    placeholder="Nombre (ej. Internet)" 
                    value={newName}
                    onChange={e => setNewName(e.target.value)}
                    className="w-full bg-slate-50 p-3 rounded-xl text-sm outline-none font-medium"
                    required
                />
                <div className="flex gap-3">
                    <input 
                        type="number" 
                        placeholder="Monto" 
                        value={newAmount}
                        onChange={e => setNewAmount(e.target.value)}
                        className="flex-1 bg-slate-50 p-3 rounded-xl text-sm outline-none font-medium"
                        required
                    />
                    <input 
                        type="number" 
                        placeholder="Día (1-31)" 
                        min="1" max="31"
                        value={newDay}
                        onChange={e => setNewDay(e.target.value)}
                        className="w-20 bg-slate-50 p-3 rounded-xl text-sm outline-none font-medium"
                        required
                    />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                    <button type="button" onClick={() => setIsAdding(false)} className="px-4 py-2 text-slate-400 font-medium text-sm">Cancelar</button>
                    <button type="submit" className="px-6 py-2 bg-accent text-white rounded-xl font-bold text-sm shadow-md shadow-blue-500/20">Agregar</button>
                </div>
            </div>
        </form>
      )}

      <div className="space-y-3">
        {sortedPayments.length === 0 ? (
            <div className="text-center py-12 text-slate-400 bg-white rounded-2xl border border-dashed border-slate-200">
                <p>No tienes pagos fijos registrados.</p>
            </div>
        ) : (
            sortedPayments.map(payment => {
                const isLate = !payment.isPaidCurrentMonth && payment.dayDue < todayDay;
                const isDueSoon = !payment.isPaidCurrentMonth && payment.dayDue >= todayDay && payment.dayDue <= todayDay + 3;

                return (
                    <div 
                        key={payment.id} 
                        className={`p-4 rounded-2xl shadow-sm border transition-all ${
                            payment.isPaidCurrentMonth 
                            ? 'bg-slate-100 border-transparent opacity-60' 
                            : 'bg-white border-slate-100'
                        }`}
                    >
                        <div className="flex justify-between items-center mb-2">
                            <div className="flex items-center gap-3">
                                <div className="flex flex-col items-center gap-1">
                                     <button 
                                        onClick={() => payment.isPaidCurrentMonth ? onUnpay(payment.id) : handleOpenPayModal(payment.id)}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                            payment.isPaidCurrentMonth 
                                            ? 'bg-green-100 text-green-600 hover:bg-red-100 hover:text-red-500' 
                                            : 'bg-slate-800 text-white shadow-md hover:bg-slate-700'
                                        }`}
                                    >
                                        {payment.isPaidCurrentMonth ? 'Pagado' : 'Pagar'}
                                    </button>
                                </div>
                                <div>
                                    <h4 className={`font-bold ${payment.isPaidCurrentMonth ? 'text-slate-500 line-through' : 'text-slate-800'}`}>
                                        {payment.name}
                                    </h4>
                                    <div className="flex items-center gap-2">
                                        <p className="text-xs text-slate-500">Día {payment.dayDue}</p>
                                        {isLate && <span className="text-[10px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded font-bold flex items-center gap-1"><AlertCircle size={10} /> Vencido</span>}
                                        {isDueSoon && <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-bold flex items-center gap-1"><Bell size={10} /> Cerca</span>}
                                    </div>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="font-bold text-slate-700">{formatCurrency(payment.amount)}</p>
                                <button onClick={() => onDelete(payment.id)} className="text-slate-300 hover:text-red-400 transition-colors mt-1">
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        </div>
                    </div>
                );
            })
        )}
      </div>

      {/* Payment Modal Overlay */}
      {payingId && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl animate-in zoom-in-95 duration-200">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-bold text-slate-800">Confirmar Pago</h3>
                    <button onClick={() => setPayingId(null)} className="p-1 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500">
                        <X size={20} />
                    </button>
                </div>
                
                <p className="text-sm text-slate-500 mb-4">Selecciona cómo vas a pagar esta mensualidad:</p>

                <div className="grid grid-cols-3 gap-3 mb-6">
                     <button
                        onClick={() => setSelectedMethod('cash')}
                        className={`flex flex-col items-center justify-center gap-2 py-4 rounded-xl border-2 transition-all ${
                            selectedMethod === 'cash' ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-100 text-slate-400'
                        }`}
                     >
                         <Wallet size={24} />
                         <span className="text-xs font-bold">Efectivo</span>
                     </button>
                     <button
                        onClick={() => setSelectedMethod('debit')}
                        className={`flex flex-col items-center justify-center gap-2 py-4 rounded-xl border-2 transition-all ${
                            selectedMethod === 'debit' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-100 text-slate-400'
                        }`}
                     >
                         <Landmark size={24} />
                         <span className="text-xs font-bold">Cuenta</span>
                     </button>
                     <button
                        onClick={() => setSelectedMethod('credit')}
                        className={`flex flex-col items-center justify-center gap-2 py-4 rounded-xl border-2 transition-all ${
                            selectedMethod === 'credit' ? 'border-purple-500 bg-purple-50 text-purple-700' : 'border-slate-100 text-slate-400'
                        }`}
                     >
                         <CardIcon size={24} />
                         <span className="text-xs font-bold">Crédito</span>
                     </button>
                </div>

                {selectedMethod === 'credit' && (
                    <div className="mb-6 animate-in slide-in-from-top-2">
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Seleccionar Tarjeta</p>
                        {cards.length === 0 ? (
                            <div className="text-center p-2 bg-red-50 text-red-500 rounded-lg text-xs">No tienes tarjetas agregadas</div>
                        ) : (
                            <div className="space-y-2">
                                {cards.map(card => (
                                    <button
                                        key={card.id}
                                        onClick={() => setSelectedCardId(card.id)}
                                        className={`w-full p-3 rounded-xl border flex items-center gap-3 transition-all ${
                                            selectedCardId === card.id 
                                            ? 'border-purple-500 bg-purple-50 ring-1 ring-purple-500' 
                                            : 'border-slate-200 bg-white'
                                        }`}
                                    >
                                        <div className={`w-8 h-5 rounded bg-gradient-to-r ${card.color}`}></div>
                                        <span className="text-sm font-bold text-slate-700">{card.bank}</span>
                                        <span className="text-xs text-slate-400 ml-auto">••• {card.last4}</span>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                <button 
                    onClick={handleConfirmPay}
                    className="w-full py-4 bg-slate-900 text-white font-bold rounded-2xl shadow-lg shadow-slate-900/20 active:scale-95 transition-transform"
                >
                    Confirmar Pago
                </button>
            </div>
        </div>
      )}
    </div>
  );
};

export default Recurring;