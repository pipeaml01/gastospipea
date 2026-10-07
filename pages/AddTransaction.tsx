import React, { useState } from 'react';
import { TransactionType, PaymentMethod, IncomeType, Transaction, CreditCard } from '../types';
import { ArrowLeft, Calendar as CalendarIcon, Tag, AlignLeft, DollarSign, CreditCard as CreditCardIcon, Plus } from 'lucide-react';

interface AddTransactionProps {
  onAdd: (transaction: Omit<Transaction, 'id'>) => void;
  onCancel: () => void;
  cards: CreditCard[];
  onAddCard: (card: Omit<CreditCard, 'id'>) => void;
}

const AddTransaction: React.FC<AddTransactionProps> = ({ onAdd, onCancel, cards, onAddCard }) => {
  const [type, setType] = useState<TransactionType>('expense');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [description, setDescription] = useState('');
  
  // Expense specific
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [selectedCardId, setSelectedCardId] = useState<string>('');
  
  // Inline Add Card State
  const [isAddingCard, setIsAddingCard] = useState(false);
  const [newBank, setNewBank] = useState('');
  const [newLast4, setNewLast4] = useState('');
  const [newLimit, setNewLimit] = useState('');
  const [newColor, setNewColor] = useState('from-slate-700 to-slate-900');

  // Income specific
  const [incomeType, setIncomeType] = useState<IncomeType>('salary');
  const [destination, setDestination] = useState<'cash' | 'account'>('account');

  const categories = [
    { id: 'food', label: 'Comida', icon: '🍔' },
    { id: 'transport', label: 'Transporte', icon: '🚌' },
    { id: 'shopping', label: 'Compras', icon: '🛍️' },
    { id: 'home', label: 'Hogar', icon: '🏠' },
    { id: 'health', label: 'Salud', icon: '💊' },
    { id: 'entertainment', label: 'Ocio', icon: '🎬' },
    { id: 'bills', label: 'Servicios', icon: '💡' },
    { id: 'credit_payment', label: 'Pago Tarjeta', icon: '💳' },
  ];

  const CARD_COLORS = [
      'from-slate-700 to-slate-900', // Black
      'from-blue-600 to-blue-800',   // Blue
      'from-purple-600 to-purple-800', // Purple
      'from-emerald-600 to-emerald-800', // Green
      'from-rose-600 to-rose-800',   // Red
      'from-amber-500 to-amber-700', // Gold
      'from-cyan-600 to-cyan-800',   // Cyan
      'from-pink-600 to-pink-800',   // Pink
  ];

  const handleQuickAddCard = () => {
      if(newBank && newLast4) {
          onAddCard({ 
            bank: newBank, 
            last4: newLast4, 
            color: newColor,
            limit: newLimit ? parseFloat(newLimit) : 0
          });
          setNewBank('');
          setNewLast4('');
          setNewLimit('');
          setNewColor(CARD_COLORS[0]);
          setIsAddingCard(false);
      }
  };

  const handleCategoryChange = (newCategory: string) => {
    setCategory(newCategory);
    // If switching TO 'Pago Tarjeta', reset method if it was credit
    if (newCategory === 'Pago Tarjeta' && paymentMethod === 'credit') {
        setPaymentMethod('cash'); // Default to cash to prevent invalid state
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !date) return;
    
    // Validation for credit card selection
    // Case 1: Paid with credit card
    if (type === 'expense' && paymentMethod === 'credit' && !selectedCardId && cards.length > 0) {
        alert("Por favor selecciona una tarjeta de crédito");
        return;
    }
    // Case 2: Paying OFF a credit card
    if (type === 'expense' && category === 'Pago Tarjeta' && !selectedCardId && cards.length > 0) {
        alert("Por favor selecciona qué tarjeta estás pagando");
        return;
    }

    const numAmount = parseFloat(amount);
    
    // Capture current time for "Registration Time"
    const now = new Date();
    const time = now.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', hour12: false });

    if (type === 'expense') {
      const isCardPayment = category === 'Pago Tarjeta';
      // cardId is relevant if payment method is CREDIT OR if we are PAYING a card
      const relatedCardId = (paymentMethod === 'credit' || isCardPayment) ? selectedCardId : undefined;

      onAdd({
        type: 'expense',
        amount: numAmount,
        category: category || 'Otros',
        date,
        time,
        description,
        paymentMethod,
        cardId: relatedCardId
      });
    } else {
      onAdd({
        type: 'income',
        amount: numAmount,
        category: incomeType === 'salary' ? 'Salario' : incomeType === 'sale' ? 'Venta' : 'Otros',
        date,
        time,
        description,
        incomeType,
        destination
      });
    }
  };

  const isCreditPaymentCategory = category === 'Pago Tarjeta';
  const showCardSelector = paymentMethod === 'credit' || isCreditPaymentCategory;

  return (
    <div className="min-h-screen bg-white pb-24">
      {/* Top Bar */}
      <div className="bg-slate-900 pt-8 pb-12 px-6 rounded-b-[2.5rem] shadow-xl relative z-10">
        <div className="flex items-center justify-between text-white mb-6">
          <button onClick={onCancel} className="p-2 bg-white/10 rounded-full hover:bg-white/20 transition">
            <ArrowLeft size={20} />
          </button>
          <h2 className="text-lg font-semibold">Nueva Transacción</h2>
          <div className="w-9"></div> {/* Spacer */}
        </div>
        
        {/* Toggle */}
        <div className="bg-slate-800 p-1 rounded-2xl flex relative">
           <div className={`absolute top-1 bottom-1 w-[48%] bg-white/10 rounded-xl transition-all duration-300 ${type === 'income' ? 'left-[51%]' : 'left-1'}`}></div>
           <button 
             onClick={() => setType('expense')} 
             className={`flex-1 py-3 text-center rounded-xl relative z-10 text-sm font-medium transition-colors ${type === 'expense' ? 'text-white' : 'text-slate-400'}`}
           >
             Gasto
           </button>
           <button 
             onClick={() => setType('income')}
             className={`flex-1 py-3 text-center rounded-xl relative z-10 text-sm font-medium transition-colors ${type === 'income' ? 'text-white' : 'text-slate-400'}`}
           >
             Ingreso
           </button>
        </div>

        {/* Amount Input */}
        <div className="mt-8 mb-4 relative">
             <div className="absolute left-0 top-1/2 -translate-y-1/2 text-slate-400">
                <DollarSign size={24} />
             </div>
             <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0"
                className="w-full bg-transparent text-5xl font-bold text-white placeholder-slate-600 pl-8 focus:outline-none"
                autoFocus
             />
        </div>
      </div>

      <div className="px-6 -mt-6 relative z-20">
         <form onSubmit={handleSubmit} className="bg-white rounded-3xl p-6 shadow-lg border border-slate-100 space-y-6">
            
            {/* Date */}
            <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                    <CalendarIcon size={14} /> Fecha
                </label>
                <input 
                    type="date" 
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full bg-slate-50 p-4 rounded-2xl text-slate-700 font-medium outline-none focus:ring-2 focus:ring-accent/20"
                />
            </div>

            {/* Dynamic Fields based on Type */}
            {type === 'expense' ? (
                <>
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                            <Tag size={14} /> Categoría
                        </label>
                        <div className="grid grid-cols-4 gap-2">
                            {categories.map(cat => (
                                <button
                                    key={cat.id}
                                    type="button"
                                    onClick={() => handleCategoryChange(cat.label)}
                                    className={`flex flex-col items-center justify-center p-2 rounded-xl border transition-all ${
                                        category === cat.label 
                                        ? 'bg-slate-800 text-white border-slate-800 shadow-md transform scale-105' 
                                        : 'bg-white text-slate-500 border-slate-100 hover:border-slate-300'
                                    }`}
                                >
                                    <span className="text-xl mb-1">{cat.icon}</span>
                                    <span className="text-[10px] font-medium truncate w-full text-center">{cat.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="space-y-2">
                         <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                            {isCreditPaymentCategory ? '¿Cómo vas a pagar?' : 'Método de Pago'}
                         </label>
                         
                         {isCreditPaymentCategory ? (
                             <div className="grid grid-cols-2 gap-3">
                                 <button
                                     key="cash"
                                     type="button"
                                     onClick={() => setPaymentMethod('cash')}
                                     className={`py-3 rounded-xl text-sm font-semibold transition-colors flex flex-col items-center ${
                                         paymentMethod === 'cash' ? 'bg-emerald-50 text-emerald-600 ring-2 ring-emerald-100' : 'bg-slate-50 text-slate-500'
                                     }`}
                                 >
                                     <span>Efectivo</span>
                                 </button>
                                 <button
                                     key="debit"
                                     type="button"
                                     onClick={() => setPaymentMethod('debit')}
                                     className={`py-3 rounded-xl text-sm font-semibold transition-colors flex flex-col items-center ${
                                         paymentMethod === 'debit' ? 'bg-blue-50 text-blue-600 ring-2 ring-blue-100' : 'bg-slate-50 text-slate-500'
                                     }`}
                                 >
                                     <span>Cuenta Bancaria</span>
                                 </button>
                             </div>
                         ) : (
                             <div className="grid grid-cols-3 gap-3">
                                 {([['cash', 'Efectivo'], ['debit', 'Débito'], ['credit', 'Crédito']] as const).map(([val, label]) => (
                                     <button
                                        key={val}
                                        type="button"
                                        onClick={() => setPaymentMethod(val)}
                                        className={`py-3 rounded-xl text-sm font-semibold transition-colors ${
                                            paymentMethod === val ? 'bg-red-50 text-red-600 ring-2 ring-red-100' : 'bg-slate-50 text-slate-500'
                                        }`}
                                     >
                                         {label}
                                     </button>
                                 ))}
                             </div>
                         )}
                    </div>

                    {/* Credit Card Selector */}
                    {showCardSelector && (
                        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 animate-in fade-in slide-in-from-top-2">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">
                                {isCreditPaymentCategory ? '¿Qué tarjeta estás pagando?' : 'Seleccionar Tarjeta'}
                            </label>
                            
                            {cards.length === 0 && !isAddingCard && (
                                <div className="text-center">
                                    <p className="text-sm text-slate-400 mb-2">No tienes tarjetas registradas.</p>
                                    <button 
                                        type="button"
                                        onClick={() => setIsAddingCard(true)}
                                        className="text-sm font-bold text-accent"
                                    >
                                        + Agregar Tarjeta
                                    </button>
                                </div>
                            )}

                            {!isAddingCard && cards.length > 0 && (
                                <div className="space-y-2">
                                    {cards.map(card => (
                                        <div 
                                            key={card.id}
                                            onClick={() => setSelectedCardId(card.id)}
                                            className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                                                selectedCardId === card.id ? 'bg-white border-blue-500 shadow-md ring-1 ring-blue-500' : 'bg-white border-slate-200 opacity-60 hover:opacity-100'
                                            }`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className={`w-8 h-5 rounded bg-gradient-to-r ${card.color}`}></div>
                                                <span className="font-bold text-slate-700 text-sm">{card.bank}</span>
                                            </div>
                                            <span className="font-mono text-xs text-slate-400">•••• {card.last4}</span>
                                        </div>
                                    ))}
                                    <button 
                                        type="button" 
                                        onClick={() => setIsAddingCard(true)}
                                        className="w-full text-center text-xs font-bold text-accent mt-2 py-1"
                                    >
                                        + Otra tarjeta
                                    </button>
                                </div>
                            )}

                            {isAddingCard && (
                                <div className="bg-white p-3 rounded-xl border border-blue-100 shadow-sm">
                                    <p className="text-xs font-bold text-slate-800 mb-2">Nueva Tarjeta</p>
                                    <div className="flex flex-col gap-2 mb-2">
                                        <div className="flex gap-2">
                                            <input 
                                                type="text" 
                                                placeholder="Banco" 
                                                value={newBank}
                                                onChange={e => setNewBank(e.target.value)}
                                                className="flex-1 bg-slate-50 p-2 rounded text-sm outline-none"
                                            />
                                            <input 
                                                type="text" 
                                                placeholder="4 díg" 
                                                maxLength={4}
                                                value={newLast4}
                                                onChange={e => setNewLast4(e.target.value)}
                                                className="w-16 bg-slate-50 p-2 rounded text-sm outline-none"
                                            />
                                        </div>
                                        <input 
                                            type="number" 
                                            placeholder="Cupo Total" 
                                            value={newLimit}
                                            onChange={e => setNewLimit(e.target.value)}
                                            className="w-full bg-slate-50 p-2 rounded text-sm outline-none"
                                        />
                                        
                                        {/* Color Selector */}
                                        <div className="mt-1">
                                            <div className="flex gap-2 flex-wrap justify-center">
                                                {CARD_COLORS.map(color => (
                                                    <button
                                                        key={color}
                                                        type="button"
                                                        onClick={() => setNewColor(color)}
                                                        className={`w-5 h-5 rounded-full bg-gradient-to-br ${color} ${newColor === color ? 'ring-2 ring-offset-2 ring-slate-800 scale-110' : 'opacity-70'} transition-all`}
                                                    />
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex justify-end gap-2">
                                        <button type="button" onClick={() => setIsAddingCard(false)} className="text-xs text-slate-400 font-medium">Cancelar</button>
                                        <button type="button" onClick={handleQuickAddCard} className="text-xs bg-slate-800 text-white px-3 py-1.5 rounded-lg font-bold">Guardar</button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </>
            ) : (
                <>
                     <div className="space-y-2">
                         <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Tipo de Ingreso</label>
                         <select 
                            value={incomeType}
                            onChange={(e) => setIncomeType(e.target.value as IncomeType)}
                            className="w-full bg-slate-50 p-4 rounded-2xl text-slate-700 font-medium outline-none focus:ring-2 focus:ring-green-500/20"
                         >
                             <option value="salary">Salario / Nómina</option>
                             <option value="sale">Venta</option>
                             <option value="commission">Comisión</option>
                             <option value="other">Otros</option>
                         </select>
                    </div>

                    <div className="space-y-2">
                         <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Destino</label>
                         <div className="flex gap-3">
                             <button
                                type="button"
                                onClick={() => setDestination('account')}
                                className={`flex-1 py-3 rounded-xl text-sm font-semibold transition-colors ${
                                    destination === 'account' ? 'bg-green-50 text-green-600 ring-2 ring-green-100' : 'bg-slate-50 text-slate-500'
                                }`}
                             >
                                 Cuenta Bancaria
                             </button>
                             <button
                                type="button"
                                onClick={() => setDestination('cash')}
                                className={`flex-1 py-3 rounded-xl text-sm font-semibold transition-colors ${
                                    destination === 'cash' ? 'bg-green-50 text-green-600 ring-2 ring-green-100' : 'bg-slate-50 text-slate-500'
                                }`}
                             >
                                 Efectivo
                             </button>
                         </div>
                    </div>
                </>
            )}

            <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                    <AlignLeft size={14} /> Nota (Opcional)
                </label>
                <input 
                    type="text" 
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Detalles adicionales..."
                    className="w-full bg-slate-50 p-4 rounded-2xl text-slate-700 font-medium outline-none focus:ring-2 focus:ring-accent/20"
                />
            </div>

            <button 
                type="submit" 
                className={`w-full py-4 rounded-2xl text-white font-bold text-lg shadow-lg transform active:scale-95 transition-all ${
                    type === 'expense' ? 'bg-slate-900 shadow-slate-900/30' : 'bg-green-600 shadow-green-600/30'
                }`}
            >
                Guardar {type === 'expense' ? 'Gasto' : 'Ingreso'}
            </button>
         </form>
      </div>
    </div>
  );
};

export default AddTransaction;