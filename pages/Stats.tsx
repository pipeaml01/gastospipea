import React, { useState, useMemo, useRef } from 'react';
import { Transaction, CreditCard } from '../types';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, Tooltip as RechartsTooltip, ResponsiveContainer, YAxis } from 'recharts';
import { CreditCard as CardIcon, Trash2, Plus, X, Download, Upload, Cloud, LogOut, LogIn, User, ShieldCheck, RefreshCw } from 'lucide-react';
import * as storage from '../services/storageService';
import { useAuth } from '../context/AuthContext';

interface StatsProps {
  transactions: Transaction[];
  onClearData: () => void;
  cards: CreditCard[];
  onAddCard: (card: Omit<CreditCard, 'id'>) => void;
  onEditCard: (card: CreditCard) => void;
  onDeleteCard: (id: string) => void;
  onImportData: () => void;
  onOpenAuth: () => void;
  onSyncLocalToCloud?: () => Promise<void>;
  hasLocalDataToSync?: boolean;
}

const Stats: React.FC<StatsProps> = ({
  transactions,
  onClearData,
  cards,
  onAddCard,
  onEditCard,
  onDeleteCard,
  onImportData,
  onOpenAuth,
  onSyncLocalToCloud,
  hasLocalDataToSync = false,
}) => {
  const { user, userProfile, logout } = useAuth();
  const [isAddingCard, setIsAddingCard] = useState(false);
  const [bank, setBank] = useState('');
  const [last4, setLast4] = useState('');
  const [limit, setLimit] = useState('');
  const [selectedColor, setSelectedColor] = useState('from-slate-700 to-slate-900');
  const [syncingCloud, setSyncingCloud] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#6366f1'];

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

  const expensesByCategory = useMemo(() => {
    const data: Record<string, number> = {};
    transactions
      .filter((t) => t.type === 'expense' && t.category !== 'Pago Tarjeta')
      .forEach((t) => {
        data[t.category] = (data[t.category] || 0) + t.amount;
      });

    return Object.entries(data).map(([name, value]) => ({ name, value }));
  }, [transactions]);

  const expensesByDate = useMemo(() => {
    const data: Record<string, number> = {};
    transactions
      .filter((t) => t.type === 'expense' && t.category !== 'Pago Tarjeta')
      .forEach((t) => {
        data[t.date] = (data[t.date] || 0) + t.amount;
      });

    const sortedEntries = Object.entries(data).sort();

    const chartData = sortedEntries
      .slice(-7)
      .map(([date, value]) => ({ name: date.substring(5), value, fullDate: date }));

    const listData = sortedEntries
      .reverse()
      .map(([date, value]) => ({ date, value }));

    return { chartData, listData };
  }, [transactions]);

  const handleClear = () => {
    if (window.confirm('¿Estás seguro de que quieres borrar TODOS los datos? Esta acción no se puede deshacer.')) {
      onClearData();
    }
  };

  const handleSaveCard = (e: React.FormEvent) => {
    e.preventDefault();
    if (bank && last4 && limit) {
      onAddCard({
        bank,
        last4,
        limit: parseFloat(limit),
        color: selectedColor,
      });
      setBank('');
      setLast4('');
      setLimit('');
      setSelectedColor(CARD_COLORS[0]);
      setIsAddingCard(false);
    }
  };

  const handleCycleColor = (card: CreditCard) => {
    const currentIndex = CARD_COLORS.indexOf(card.color);
    const nextIndex = (currentIndex + 1) % CARD_COLORS.length;
    const nextColor = CARD_COLORS[nextIndex];
    onEditCard({ ...card, color: nextColor });
  };

  const handleExport = async () => {
    const data = storage.getAllData();
    const jsonString = JSON.stringify(data, null, 2);
    const fileName = `finanzasimple_backup_${new Date().toISOString().split('T')[0]}.json`;

    try {
      if ('showSaveFilePicker' in window) {
        const handle = await (window as any).showSaveFilePicker({
          suggestedName: fileName,
          types: [
            {
              description: 'Archivo de Respaldo JSON',
              accept: { 'application/json': ['.json'] },
            },
          ],
        });
        const writable = await handle.createWritable();
        await writable.write(jsonString);
        await writable.close();
      } else {
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.error('Error al exportar:', err);
        alert('Hubo un error al guardar el archivo.');
      }
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (storage.restoreData(json)) {
          alert('Copia de seguridad restaurada con éxito.');
          onImportData();
        } else {
          alert('El archivo no parece ser válido.');
        }
      } catch (err) {
        alert('Error al leer el archivo.');
      }
    };
    reader.readAsText(file);
    if (e.target) e.target.value = '';
  };

  const handleMigrate = async () => {
    if (!onSyncLocalToCloud) return;
    setSyncingCloud(true);
    setSyncFeedback(null);
    try {
      await onSyncLocalToCloud();
      setSyncFeedback('¡Datos locales transferidos exitosamente a tu nube!');
    } catch (e) {
      setSyncFeedback('Error al transferir datos.');
    } finally {
      setSyncingCloud(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="p-6 pb-24 min-h-screen bg-white">
      <h1 className="text-2xl font-bold text-slate-800 mb-6">Estadísticas y Ajustes</h1>

      {/* Cloud & User Account Section */}
      <div className="mb-8 p-5 bg-gradient-to-br from-slate-900 to-blue-950 text-white rounded-3xl shadow-xl shadow-slate-900/10">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center">
              <Cloud className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h3 className="font-bold text-sm leading-tight">Cuenta en la Nube</h3>
              <p className="text-xs text-slate-300">
                {user ? 'Sincronización en tiempo real' : 'Acceso individual y seguro'}
              </p>
            </div>
          </div>
          {user && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-[11px] font-semibold">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              Activa
            </span>
          )}
        </div>

        {user ? (
          <div className="space-y-3 pt-2 border-t border-white/10">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">Usuario:</span>
              <span className="font-bold text-white truncate max-w-[200px]">
                {userProfile?.displayName || user.displayName || 'Usuario'}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">Correo:</span>
              <span className="font-mono text-slate-200 truncate max-w-[200px]">{user.email}</span>
            </div>

            {hasLocalDataToSync && (
              <div className="pt-2">
                <button
                  onClick={handleMigrate}
                  disabled={syncingCloud}
                  className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs rounded-xl transition shadow-md"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${syncingCloud ? 'animate-spin' : ''}`} />
                  {syncingCloud ? 'Subiendo datos a la nube...' : 'Subir mis datos locales a la nube'}
                </button>
                {syncFeedback && (
                  <p className="text-[11px] text-emerald-300 mt-1 text-center font-medium">
                    {syncFeedback}
                  </p>
                )}
              </div>
            )}

            <button
              onClick={() => logout()}
              className="w-full mt-2 py-2 px-3 bg-white/10 hover:bg-white/20 text-red-300 font-semibold text-xs rounded-xl transition flex items-center justify-center gap-2"
            >
              <LogOut size={14} />
              Cerrar Sesión
            </button>
          </div>
        ) : (
          <div className="pt-2 border-t border-white/10">
            <p className="text-xs text-slate-300 mb-3">
              Crea tu usuario y contraseña para guardar tus finanzas en la nube y acceder desde cualquier celular o computador.
            </p>
            <button
              onClick={onOpenAuth}
              className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl transition shadow-md flex items-center justify-center gap-2 active:scale-[0.99]"
            >
              <LogIn size={14} />
              Iniciar Sesión / Crear Cuenta
            </button>
          </div>
        )}
      </div>

      {/* Credit Cards Section */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-bold text-slate-700">Mis Tarjetas</h3>
          <button
            onClick={() => setIsAddingCard(true)}
            className="text-xs bg-slate-900 text-white px-3 py-1.5 rounded-lg font-medium flex items-center gap-1 shadow-md shadow-slate-900/20"
          >
            <Plus size={14} /> Agregar
          </button>
        </div>

        {isAddingCard && (
          <form
            onSubmit={handleSaveCard}
            className="bg-slate-50 p-4 rounded-2xl border border-slate-200 mb-4 animate-in fade-in zoom-in-95 duration-200"
          >
            <div className="flex justify-between items-center mb-3">
              <span className="text-xs font-bold uppercase text-slate-400">Nueva Tarjeta</span>
              <button type="button" onClick={() => setIsAddingCard(false)}>
                <X size={16} className="text-slate-400" />
              </button>
            </div>
            <div className="flex flex-col gap-3 mb-3">
              <div className="flex gap-3">
                <input
                  type="text"
                  placeholder="Banco (ej. BBVA)"
                  className="flex-1 bg-white p-2 rounded-lg text-sm border border-slate-200 outline-none focus:border-blue-500"
                  value={bank}
                  onChange={(e) => setBank(e.target.value)}
                  required
                  autoFocus
                />
                <input
                  type="text"
                  placeholder="Últimos 4"
                  maxLength={4}
                  className="w-24 bg-white p-2 rounded-lg text-sm border border-slate-200 outline-none focus:border-blue-500"
                  value={last4}
                  onChange={(e) => setLast4(e.target.value)}
                  required
                />
              </div>
              <input
                type="number"
                placeholder="Cupo Total / Límite (ej. 5.000.000)"
                className="w-full bg-white p-2 rounded-lg text-sm border border-slate-200 outline-none focus:border-blue-500"
                value={limit}
                onChange={(e) => setLimit(e.target.value)}
                required
              />

              {/* Color Selector */}
              <div>
                <p className="text-[10px] uppercase font-bold text-slate-400 mb-2">Color</p>
                <div className="flex gap-2 flex-wrap">
                  {CARD_COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setSelectedColor(color)}
                      className={`w-6 h-6 rounded-full bg-gradient-to-tr ${color} ${
                        selectedColor === color ? 'ring-2 ring-offset-2 ring-slate-800' : ''
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>
            <button
              type="submit"
              className="w-full py-2 bg-slate-900 text-white rounded-lg font-bold text-xs shadow-md shadow-slate-900/10"
            >
              Guardar Tarjeta
            </button>
          </form>
        )}

        <div className="space-y-3">
          {cards.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-4 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
              No tienes tarjetas registradas
            </p>
          ) : (
            cards.map((card) => (
              <div
                key={card.id}
                className={`p-4 rounded-2xl bg-gradient-to-tr ${card.color} text-white shadow-lg flex justify-between items-center relative overflow-hidden`}
              >
                <div>
                  <p className="text-xs uppercase tracking-wider font-semibold opacity-75">{card.bank}</p>
                  <p className="font-mono text-sm tracking-widest mt-1">•••• {card.last4}</p>
                  <p className="text-[11px] opacity-90 mt-2">
                    Cupo: <span className="font-bold">{formatCurrency(card.limit)}</span>
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleCycleColor(card)}
                    className="p-2 bg-white/10 hover:bg-white/20 rounded-xl transition text-white/80 hover:text-white"
                    title="Cambiar Color"
                  >
                    🎨
                  </button>
                  <button
                    onClick={() => onDeleteCard(card.id)}
                    className="p-2 bg-white/10 hover:bg-red-500/20 rounded-xl transition text-white/80 hover:text-red-300"
                    title="Eliminar Tarjeta"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Pie Chart: Expenses by Category */}
      <div className="mb-10">
        <h3 className="font-bold text-slate-700 mb-4">Gastos por Categoría</h3>
        <div className="h-64 w-full">
          {expensesByCategory.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={expensesByCategory}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {expensesByCategory.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <RechartsTooltip formatter={(value: number) => `$${value.toLocaleString()}`} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-slate-400 text-sm">
              Sin datos suficientes
            </div>
          )}
        </div>

        {/* Legend */}
        <div className="grid grid-cols-2 gap-2 mt-4">
          {expensesByCategory.map((item, index) => (
            <div key={item.name} className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: COLORS[index % COLORS.length] }}
              ></div>
              <span className="text-xs font-medium text-slate-600">{item.name}</span>
              <span className="text-xs text-slate-400 ml-auto">${item.value.toLocaleString()}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Bar Chart & Daily History */}
      <div className="mb-10">
        <h3 className="font-bold text-slate-700 mb-4">Gastos Diarios (Últimos 7 días)</h3>
        <div className="h-48 w-full mb-6">
          {expensesByDate.chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={expensesByDate.chartData}>
                <XAxis dataKey="name" tick={{ fontSize: 10 }} stroke="#94a3b8" />
                <YAxis hide />
                <RechartsTooltip
                  cursor={{ fill: '#f1f5f9' }}
                  formatter={(value: number) => `$${value.toLocaleString()}`}
                />
                <Bar dataKey="value" fill="#334155" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 text-sm">
              Sin datos suficientes
            </div>
          )}
        </div>

        <h3 className="font-bold text-slate-700 mb-3 text-sm">Historial Diario Global</h3>
        <div className="bg-slate-50 rounded-2xl border border-slate-100 overflow-hidden max-h-60 overflow-y-auto">
          {expensesByDate.listData.length === 0 ? (
            <div className="p-4 text-center text-xs text-slate-400">No hay gastos registrados</div>
          ) : (
            expensesByDate.listData.map((day, index) => (
              <div
                key={day.date}
                className={`flex justify-between items-center p-3 px-4 ${
                  index !== expensesByDate.listData.length - 1 ? 'border-b border-slate-200' : ''
                }`}
              >
                <span className="text-xs font-bold text-slate-600">{day.date}</span>
                <span className="text-sm font-bold text-slate-800">{formatCurrency(day.value)}</span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Backup Section */}
      <div className="mb-10 border-t pt-8">
        <h3 className="font-bold text-slate-800 mb-4">Copia de Seguridad Local</h3>
        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={handleExport}
            className="flex items-center justify-center gap-2 p-4 bg-blue-50 text-blue-700 rounded-2xl font-bold hover:bg-blue-100 transition-colors"
          >
            <Download size={20} /> Exportar JSON
          </button>
          <button
            onClick={handleImportClick}
            className="flex items-center justify-center gap-2 p-4 bg-slate-50 text-slate-700 rounded-2xl font-bold hover:bg-slate-100 transition-colors"
          >
            <Upload size={20} /> Importar JSON
          </button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".json"
            className="hidden"
          />
        </div>
        <p className="text-[10px] text-slate-400 mt-2">
          "Exportar" te permite descargar un archivo JSON con todos tus movimientos. "Importar" restaura los datos.
        </p>
      </div>

      {/* Settings / Danger Zone */}
      <div className="border-t pt-8">
        <h3 className="font-bold text-slate-800 mb-4">Zona de Peligro</h3>
        <button
          onClick={handleClear}
          className="w-full py-3 bg-red-50 text-red-600 font-bold rounded-xl border border-red-100 hover:bg-red-100 transition-colors"
        >
          Borrar todos los datos
        </button>
        <p className="text-[10px] text-slate-400 text-center mt-4">
          FinanzaSimple • Control de Finanzas en la Nube
        </p>
      </div>
    </div>
  );
};

export default Stats;
