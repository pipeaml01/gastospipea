import React, { useState } from 'react';
import { Home, PlusCircle, List, Calendar, PieChart, Cloud, LogOut, User as UserIcon, LogIn } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  onNavigate: (tab: string) => void;
  onOpenAuth: () => void;
}

const Layout: React.FC<LayoutProps> = ({ children, activeTab, onNavigate, onOpenAuth }) => {
  const { user, userProfile, logout } = useAuth();
  const [showUserMenu, setShowUserMenu] = useState(false);

  const navItems = [
    { id: 'dashboard', icon: <Home size={22} />, label: 'Inicio' },
    { id: 'history', icon: <List size={22} />, label: 'Gastos' },
    { id: 'add', icon: <PlusCircle size={30} className="text-accent" />, label: '', isAction: true },
    { id: 'recurring', icon: <Calendar size={22} />, label: 'Mes' },
    { id: 'stats', icon: <PieChart size={22} />, label: 'Stats' },
  ];

  const handleLogout = async () => {
    setShowUserMenu(false);
    await logout();
  };

  return (
    <div className="flex flex-col h-screen max-w-md mx-auto bg-gray-50 shadow-2xl relative overflow-hidden">
      {/* Top Header with Brand and Cloud/User status */}
      <header className="bg-white border-b border-slate-200 px-4 py-2.5 flex items-center justify-between shrink-0 z-40">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-slate-900 flex items-center justify-center text-white font-bold text-base shadow-sm shadow-slate-900/20">
            F
          </div>
          <div>
            <h1 className="text-sm font-bold text-slate-900 leading-tight">FinanzaSimple</h1>
            <div className="flex items-center gap-1.5">
              {user ? (
                <span className="inline-flex items-center gap-1 text-[10px] text-emerald-600 font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  Nube conectada
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[10px] text-amber-600 font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                  Modo local (Sin cuenta)
                </span>
              )}
            </div>
          </div>
        </div>

        {/* User Account Button */}
        <div className="relative">
          {user ? (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center gap-2 py-1 px-2.5 rounded-full bg-slate-100 hover:bg-slate-200 transition border border-slate-200 text-slate-700 text-xs font-medium"
              >
                <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-[11px] font-bold">
                  {(userProfile?.displayName || user.email || 'U')[0].toUpperCase()}
                </div>
                <span className="max-w-[90px] truncate hidden sm:inline">
                  {userProfile?.displayName || user.email?.split('@')[0]}
                </span>
              </button>

              {showUserMenu && (
                <div className="absolute right-0 top-10 w-56 bg-white rounded-2xl shadow-xl border border-slate-100 p-2 z-50 animate-in fade-in zoom-in-95">
                  <div className="px-3 py-2 border-b border-slate-100 mb-1">
                    <p className="text-xs font-bold text-slate-800 truncate">
                      {userProfile?.displayName || 'Usuario'}
                    </p>
                    <p className="text-[11px] text-slate-500 truncate">{user.email}</p>
                    <span className="inline-flex items-center gap-1 text-[10px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-md mt-1.5 font-medium">
                      <Cloud className="w-3 h-3 text-emerald-600" /> Sincronización en la nube
                    </span>
                  </div>

                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-600 hover:bg-red-50 rounded-xl transition font-medium"
                  >
                    <LogOut size={14} />
                    Cerrar Sesión
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={onOpenAuth}
              className="flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold px-3 py-1.5 rounded-xl shadow-sm transition active:scale-95"
            >
              <LogIn size={13} />
              <span>Entrar / Crear Cuenta</span>
            </button>
          )}
        </div>
      </header>

      {/* Main scrollable body */}
      <main className="flex-1 overflow-y-auto pb-20 no-scrollbar">
        {children}
      </main>

      {/* Bottom navigation bar */}
      <nav className="fixed bottom-0 w-full max-w-md bg-white border-t border-gray-200 px-2 py-2 pb-4 flex justify-between items-end z-40">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onNavigate(item.id)}
            className={`flex flex-col items-center justify-center w-full ${
              item.isAction ? '-mt-4' : ''
            } ${activeTab === item.id && !item.isAction ? 'text-accent' : 'text-slate-400'}`}
          >
            <div
              className={`${
                item.isAction
                  ? 'bg-white rounded-full p-1 shadow-lg transform active:scale-95 transition-transform'
                  : 'transform active:scale-95 transition-transform'
              }`}
            >
              {item.isAction ? (
                <div className="bg-slate-900 text-white p-3 rounded-full shadow-lg shadow-blue-500/30">
                  <PlusCircle size={26} />
                </div>
              ) : (
                item.icon
              )}
            </div>
            {item.label && (
              <span className="text-[10px] mt-1 font-medium">{item.label}</span>
            )}
          </button>
        ))}
      </nav>
    </div>
  );
};

export default Layout;
