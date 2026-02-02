import React, { useState, useEffect } from 'react';
import { HashRouter, Routes, Route, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, List, Plus, Settings as SettingsIcon, PieChart, Package, UserCircle } from 'lucide-react';
import Dashboard from './components/Dashboard';
import TransactionList from './components/TransactionList';
import InventoryList from './components/InventoryList';
import EntryForm from './components/EntryForm';
import Settings from './components/Settings';
import Reports from './components/Reports';
import LockScreen from './components/LockScreen';
import { loadTransactions, saveTransaction, deleteTransaction, loadSettings } from './services/storageService';
import { hasPin } from './services/authService';
import { Transaction } from './types';

// Desktop Sidebar
const Sidebar = ({ logo }: { logo?: string }) => {
  const location = useLocation();
  const imgSrc = logo || 'logo.png';
  
  const NavItem = ({ to, icon: Icon, label }: { to: string; icon: any; label: string }) => {
    const isActive = location.pathname === to;
    return (
      <NavLink 
        to={to} 
        className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${
          isActive 
            ? 'bg-[var(--primary)] text-white shadow-md shadow-indigo-500/20' 
            : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-100 dark:hover:bg-slate-800'
        }`}
      >
        <Icon className={`h-5 w-5 ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-[var(--primary)] dark:group-hover:text-white'}`} />
        <span className="font-semibold text-sm tracking-wide">{label}</span>
      </NavLink>
    );
  };

  return (
    <div className="w-72 bg-white border-r border-slate-200 dark:bg-slate-900 dark:border-slate-800 flex flex-col h-screen fixed left-0 top-0 z-20 hidden md:flex transition-colors duration-300">
      <div className="p-8 pb-4 flex items-center gap-3">
        <div className="h-10 w-10 bg-slate-50 dark:bg-slate-800 rounded-xl flex items-center justify-center overflow-hidden shadow-sm border border-slate-200 dark:border-slate-700">
          <img src={imgSrc} alt="Logo" className="h-7 w-7 object-contain" />
        </div>
        <div>
          <h1 className="text-slate-900 dark:text-white font-bold tracking-tight text-lg">LANSKY</h1>
          <p className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold">Ledger Solutions</p>
        </div>
      </div>
      
      <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
        <NavItem to="/" icon={LayoutDashboard} label="Overview" />
        <NavItem to="/inventory" icon={Package} label="Inventory" />
        <NavItem to="/transactions" icon={List} label="Transactions" />
        <NavItem to="/reports" icon={PieChart} label="Analytics" />
        <div className="pt-6 pb-2 px-4">
           <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Actions</p>
        </div>
        <NavItem to="/add" icon={Plus} label="Log Activity" />
        <NavItem to="/settings" icon={SettingsIcon} label="Settings" />
      </nav>

      <div className="p-6 border-t border-slate-100 dark:border-slate-800">
        <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-xl border border-slate-100 dark:border-slate-700">
          <p className="text-xs text-slate-500 font-medium text-center">
            Secure • Offline • v1.3
          </p>
        </div>
      </div>
    </div>
  );
};

// Mobile Header
const MobileHeader = ({ logo }: { logo?: string }) => {
  const imgSrc = logo || 'logo.png';
  return (
    <div className="md:hidden bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-4 py-3 flex justify-between items-center sticky top-0 z-30 transition-colors duration-300">
      <div className="flex items-center gap-3">
         <div className="h-9 w-9 bg-slate-100 dark:bg-slate-800 rounded-lg flex items-center justify-center overflow-hidden border border-slate-200 dark:border-slate-700 shadow-sm">
            <img src={imgSrc} alt="Logo" className="h-6 w-6 object-contain" />
          </div>
          <div className="flex flex-col">
            <h1 className="text-slate-900 dark:text-white font-bold text-lg tracking-tight leading-none">LANSKY</h1>
            <p className="text-[8px] text-slate-500 uppercase tracking-widest font-semibold leading-none mt-0.5">Ledger Solutions</p>
          </div>
      </div>
      <NavLink to="/settings" className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
        <UserCircle className="h-7 w-7 text-slate-400 dark:text-slate-500" />
      </NavLink>
    </div>
  );
};

// Mobile Bottom Navigation
const BottomNav = () => {
  const NavItem = ({ to, icon: Icon, label }: { to: string; icon: any; label: string }) => {
    return (
      <NavLink 
        to={to} 
        className={({isActive}) => `flex flex-col items-center justify-center w-full py-1 ${isActive ? 'text-[var(--primary)]' : 'text-slate-400 dark:text-slate-500'}`}
      >
        <Icon className="h-6 w-6 mb-1" strokeWidth={2} />
        <span className="text-[10px] font-medium">{label}</span>
      </NavLink>
    );
  };

  // Special FAB for Add
  const AddButton = () => {
      const navigate = useNavigate();
      const location = useLocation();
      const isActive = location.pathname === '/add';
      
      return (
        <div className="relative -top-5">
           <button 
             onClick={() => navigate('/add')}
             className={`h-14 w-14 rounded-full flex items-center justify-center shadow-lg transform transition-transform active:scale-95 ${
                 isActive 
                 ? 'bg-[var(--primary)] ring-4 ring-indigo-100 dark:ring-indigo-900' 
                 : 'bg-[var(--primary)]'
             }`}
           >
             <Plus className="h-7 w-7 text-white" strokeWidth={3} />
           </button>
        </div>
      );
  };

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 px-2 pb-safe-area-bottom pt-2 h-[80px] flex justify-between items-start z-30 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
      <NavItem to="/" icon={LayoutDashboard} label="Home" />
      <NavItem to="/inventory" icon={Package} label="Inventory" />
      <div className="w-full flex justify-center">
         <AddButton />
      </div>
      <NavItem to="/transactions" icon={List} label="Activity" />
      <NavItem to="/reports" icon={PieChart} label="Reports" />
    </div>
  );
};

const App: React.FC = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLocked, setIsLocked] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [logoData, setLogoData] = useState<string | undefined>(undefined);
  const [themeMode, setThemeMode] = useState<'light'|'dark'>('dark');

  useEffect(() => {
    refreshData();
    const pinExists = hasPin();
    setIsLocked(pinExists);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    if (themeMode === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [themeMode]);

  const refreshData = () => {
    setTransactions(loadTransactions());
    const settings = loadSettings();
    setLogoData(settings.logoData);
    setThemeMode(settings.themeMode);
    document.documentElement.style.setProperty('--primary', settings.themeColor);
  };

  const handleAddTransaction = (t: Omit<Transaction, 'id'>) => {
    saveTransaction(t);
    refreshData();
  };

  const handleDeleteTransaction = (id: string) => {
    if (window.confirm('Are you sure you want to scrub this record?')) {
      deleteTransaction(id);
      refreshData();
    }
  };

  if (isLoading) {
    return <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center text-slate-500 font-medium">Initializing Secure Ledger...</div>;
  }

  if (isLocked) {
    return <LockScreen onUnlock={() => setIsLocked(false)} logo={logoData} />;
  }

  return (
    <HashRouter>
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-200 font-sans transition-colors duration-300">
        <Sidebar logo={logoData} />
        <MobileHeader logo={logoData} />
        
        {/* Main Content Area - padded bottom for mobile nav */}
        <main className="md:ml-72 p-4 md:p-10 max-w-7xl mx-auto pb-24 md:pb-10">
          <Routes>
            <Route path="/" element={<Dashboard transactions={transactions} isDarkMode={themeMode === 'dark'} />} />
            <Route path="/inventory" element={<InventoryList />} />
            <Route path="/reports" element={<Reports transactions={transactions} isDarkMode={themeMode === 'dark'} />} />
            <Route path="/transactions" element={<TransactionList transactions={transactions} onDelete={handleDeleteTransaction} />} />
            <Route path="/add" element={<EntryForm onAdd={handleAddTransaction} />} />
            <Route path="/settings" element={<Settings onDataChanged={refreshData} />} />
          </Routes>
        </main>
        
        <BottomNav />
      </div>
    </HashRouter>
  );
};

export default App;