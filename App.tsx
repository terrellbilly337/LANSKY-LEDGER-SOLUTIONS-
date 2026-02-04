
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
import PinModal from './components/PinModal';
import Toast from './components/Toast';
import { loadTransactions, saveTransaction, deleteTransaction, loadSettings } from './services/storageService';
import { calculateSummary, formatCurrency } from './services/financeService';
import { hasPin } from './services/authService';
import { Transaction, UserProfile, TransactionType } from './types';

// Desktop Sidebar
const Sidebar = ({ profileImage, userProfile, companyLogo }: { profileImage?: string, userProfile?: UserProfile, companyLogo?: string }) => {
  const location = useLocation();
  const brandLogo = companyLogo || 'logo.svg';
  
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
          <img src={brandLogo} alt="Logo" className="h-7 w-7 object-contain" />
        </div>
        <div>
          <h1 className="text-slate-900 dark:text-white font-black tracking-tighter text-xl">LANSKY LEDGER</h1>
          <p className="text-xs text-[var(--primary)] font-bold tracking-widest uppercase mt-0.5">Solutions</p>
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

      {/* User Profile Card */}
      <div className="p-4 border-t border-slate-100 dark:border-slate-800">
          <NavLink to="/settings" className="flex items-center gap-3 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-100 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
            {profileImage ? (
                <img src={profileImage} alt="Profile" className="h-10 w-10 rounded-full object-cover border border-slate-200 dark:border-slate-600 bg-slate-200 dark:bg-slate-700" />
            ) : (
                <div className="h-10 w-10 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center">
                    <UserCircle className="h-6 w-6 text-slate-400" />
                </div>
            )}
            <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{userProfile?.name || 'User'}</p>
                <p className="text-xs text-slate-500 truncate">{userProfile?.businessName || 'My Ledger'}</p>
            </div>
          </NavLink>
      </div>
    </div>
  );
};

// Mobile Header
const MobileHeader = ({ profileImage, companyLogo }: { profileImage?: string, companyLogo?: string }) => {
  const brandLogo = companyLogo || 'logo.svg';
  
  return (
    <div className="md:hidden bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-4 py-3 flex justify-between items-center sticky top-0 z-30 transition-colors duration-300">
      <div className="flex items-center gap-3">
         <div className="h-9 w-9 bg-slate-100 dark:bg-slate-800 rounded-lg flex items-center justify-center overflow-hidden border border-slate-200 dark:border-slate-700 shadow-sm">
            <img src={brandLogo} alt="Logo" className="h-6 w-6 object-contain" />
          </div>
          <div className="flex flex-col">
            <h1 className="text-slate-900 dark:text-white font-black text-lg tracking-tighter leading-none">LANSKY LEDGER</h1>
            <p className="text-[10px] text-[var(--primary)] font-bold tracking-widest uppercase leading-none mt-1">Solutions</p>
          </div>
      </div>
      <NavLink to="/settings" className="rounded-full overflow-hidden border border-transparent hover:border-slate-200 dark:hover:border-slate-700 transition-all">
        {profileImage ? (
             <img src={profileImage} alt="Profile" className="h-8 w-8 object-cover bg-slate-200 dark:bg-slate-700" />
        ) : (
             <UserCircle className="h-8 w-8 text-slate-400 dark:text-slate-500 p-0.5" />
        )}
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

const hexToRgb = (hex: string) => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? [
    parseInt(result[1], 16),
    parseInt(result[2], 16),
    parseInt(result[3], 16)
  ] : [0, 0, 0];
};

const mixColors = (color1: number[], color2: number[], weight: number) => {
  const w = weight; 
  const r = Math.round(color1[0] * w + color2[0] * (1 - w));
  const g = Math.round(color1[1] * w + color2[1] * (1 - w));
  const b = Math.round(color1[2] * w + color2[2] * (1 - w));
  return `rgb(${r}, ${g}, ${b})`;
};

const updateTheme = (primary: string, secondary: string) => {
  const root = document.documentElement;
  root.style.setProperty('--primary', primary);

  const secRgb = hexToRgb(secondary);
  const white = [255, 255, 255];
  const black = [15, 23, 42]; 

  root.style.setProperty('--bg-50', mixColors(white, secRgb, 0.96));
  root.style.setProperty('--bg-100', mixColors(white, secRgb, 0.90));
  root.style.setProperty('--bg-200', mixColors(white, secRgb, 0.82));
  root.style.setProperty('--bg-300', mixColors(white, secRgb, 0.70));
  root.style.setProperty('--bg-400', mixColors(white, secRgb, 0.50));
  root.style.setProperty('--bg-500', secondary); 
  root.style.setProperty('--bg-600', mixColors(black, secRgb, 0.30)); 
  root.style.setProperty('--bg-700', mixColors(black, secRgb, 0.50));
  root.style.setProperty('--bg-800', mixColors(black, secRgb, 0.70));
  root.style.setProperty('--bg-850', mixColors(black, secRgb, 0.78)); 
  root.style.setProperty('--bg-900', mixColors(black, secRgb, 0.88));
  root.style.setProperty('--bg-950', mixColors(black, secRgb, 0.95));
};

const App: React.FC = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLocked, setIsLocked] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [logoData, setLogoData] = useState<string | undefined>(undefined);
  const [companyLogoData, setCompanyLogoData] = useState<string | undefined>(undefined);
  const [themeMode, setThemeMode] = useState<'light'|'dark'>('dark');
  const [userProfile, setUserProfile] = useState<UserProfile | undefined>(undefined);
  
  const [showPinModal, setShowPinModal] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const [toastConfig, setToastConfig] = useState<{msg: string, sub: string, visible: boolean}>({ msg: '', sub: '', visible: false });

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
    const txs = loadTransactions();
    setTransactions(txs);
    const settings = loadSettings();
    setLogoData(settings.logoData);
    setCompanyLogoData(settings.companyLogoData);
    setThemeMode(settings.themeMode);
    setUserProfile(settings.userProfile);
    updateTheme(settings.themeColor, settings.secondaryColor);
  };

  const getEstimatedTax = (currentTx: Transaction[]) => {
    const settings = loadSettings();
    const rate = settings.taxRatePercentage || 0;
    if (rate === 0) return 0;
    const summary = calculateSummary(currentTx);
    const netProfit = summary.totalBalanceCents;
    if (netProfit <= 0) return 0;
    return Math.round(netProfit * (rate / 100));
  };

  const handleAddTransaction = (t: Transaction | Omit<Transaction, 'id'>, wasAlreadySaved = false) => {
    console.debug(`[App] Handling New Transaction. SavedExternally: ${wasAlreadySaved}`);
    const oldTax = getEstimatedTax(transactions);

    if (!wasAlreadySaved) {
        saveTransaction(t as Omit<Transaction, 'id'>);
    }
    
    // Refresh memory from localStorage
    const newTxList = loadTransactions(); 
    setTransactions(newTxList);
    refreshData(); 

    if ((t as Transaction).type === TransactionType.CREDIT) {
        const newTax = getEstimatedTax(newTxList);
        const threshold = 100000; 
        const oldLevel = Math.floor(oldTax / threshold);
        const newLevel = Math.floor(newTax / threshold);

        if (newLevel > oldLevel) {
            const settings = loadSettings();
            const taxRate = settings.taxRatePercentage || 33;
            const reservedAmount = newLevel * 1000; 
            const impliedProfit = Math.round((reservedAmount * 100) / taxRate);
            setToastConfig({
                msg: "Tax Milestone Reached!",
                sub: `You have successfully reserved ${formatCurrency(reservedAmount * 100)} in your tax vault. This represents approximately ${formatCurrency(impliedProfit * 100)} in pure, debt-free profit. Keep scaling!`,
                visible: true
            });
        }
    }
  };

  const handleDeleteTransaction = (id: string) => {
    if (hasPin()) {
        if (window.confirm('Are you sure you want to scrub this record?')) {
            setPendingDeleteId(id);
            setShowPinModal(true);
        }
    } else {
        if (window.confirm('Are you sure you want to scrub this record?')) {
            deleteTransaction(id);
            refreshData();
        }
    }
  };

  const onPinSuccess = () => {
      if (pendingDeleteId) {
          deleteTransaction(pendingDeleteId);
          refreshData();
          setPendingDeleteId(null);
      }
  };

  if (isLoading) {
    return <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center text-slate-500 font-medium">Initializing Secure Ledger...</div>;
  }

  if (isLocked) {
    return <LockScreen onUnlock={() => setIsLocked(false)} logo={companyLogoData} />;
  }

  return (
    <HashRouter>
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-200 font-sans transition-colors duration-300">
        <Sidebar profileImage={logoData} userProfile={userProfile} companyLogo={companyLogoData} />
        <MobileHeader profileImage={logoData} companyLogo={companyLogoData} />
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
        <PinModal 
            isOpen={showPinModal} 
            onClose={() => { setShowPinModal(false); setPendingDeleteId(null); }}
            onSuccess={onPinSuccess}
            title="Confirm Deletion"
        />
        <Toast 
            message={toastConfig.msg}
            subMessage={toastConfig.sub}
            isVisible={toastConfig.visible}
            onClose={() => setToastConfig({ ...toastConfig, visible: false })}
        />
      </div>
    </HashRouter>
  );
};

export default App;
