import React, { useRef, useState, useEffect, ReactNode } from 'react';
import { exportData, importData, loadSettings, saveSettings } from '../services/storageService';
import { setPin, hasPin as checkHasPin, verifyPin, removePin } from '../services/authService';
import { Download, Upload, AlertTriangle, CheckCircle, Lock, ShieldAlert, ShieldCheck, Palette, List, Plus, Trash2, Gavel, User, ChevronDown, ChevronUp, Database, Image as ImageIcon, X, Sun, Moon } from 'lucide-react';
import { AppSettings, UserProfile } from '../types';

interface SettingsProps {
  onDataChanged: () => void;
}

const CollapsibleSection = ({ 
  title, 
  icon: Icon, 
  children, 
  isOpen, 
  onToggle 
}: { 
  title: string; 
  icon: any; 
  children: ReactNode; 
  isOpen: boolean; 
  onToggle: () => void; 
}) => (
  <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-sm overflow-hidden mb-4 transition-colors">
    <button 
      onClick={onToggle}
      className="w-full flex items-center justify-between p-6 text-left focus:outline-none hover:bg-slate-50 dark:hover:bg-slate-750 transition-colors"
    >
      <div className="flex items-center gap-2 text-xl font-semibold text-slate-800 dark:text-slate-100">
        <Icon className="h-5 w-5 text-[var(--primary)]" />
        {title}
      </div>
      {isOpen ? <ChevronUp className="h-5 w-5 text-slate-400" /> : <ChevronDown className="h-5 w-5 text-slate-400" />}
    </button>
    {isOpen && <div className="p-6 pt-0 border-t border-slate-200 dark:border-slate-700/50">{children}</div>}
  </div>
);

const Settings: React.FC<SettingsProps> = ({ onDataChanged }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<{msg: string, type: 'success' | 'error' | ''}>({ msg: '', type: '' });
  
  // Settings State
  const [settings, setSettings] = useState<AppSettings>(loadSettings());
  
  // Inputs for lists
  const [newCategory, setNewCategory] = useState('');
  const [newExpenseCategory, setNewExpenseCategory] = useState('');
  const [newPlatform, setNewPlatform] = useState('');

  // Accordion State
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    'profile': true,
    'customization': false,
    'data': false,
    'security': false,
    'legal': false
  });

  const toggleSection = (key: string) => {
    setOpenSections(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // Security State
  const [isPinSet, setIsPinSet] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [currentPinInput, setCurrentPinInput] = useState('');
  const [showPinSetup, setShowPinSetup] = useState(false);
  const [pinAction, setPinAction] = useState<'SET' | 'CHANGE' | 'REMOVE' | null>(null);

  useEffect(() => {
    setIsPinSet(checkHasPin());
  }, []);

  const handleUpdateSettings = (newSettings: AppSettings) => {
    setSettings(newSettings);
    saveSettings(newSettings);
    // Apply theme color
    document.documentElement.style.setProperty('--primary', newSettings.themeColor);
    // Theme Mode class toggle is handled in App.tsx via onDataChanged refresh, 
    // but we can preemptively toggle class for instant feel if needed, 
    // though App.tsx effect is fast enough usually.
    onDataChanged();
  };

  // --- Profile Logic ---
  const handleProfileChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    const updatedProfile = { ...settings.userProfile, [name]: value };
    handleUpdateSettings({ ...settings, userProfile: updatedProfile });
  };

  // --- Customization Logic ---
  const handleThemeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleUpdateSettings({ ...settings, themeColor: e.target.value });
  };
  
  const toggleThemeMode = () => {
    const newMode = settings.themeMode === 'light' ? 'dark' : 'light';
    handleUpdateSettings({ ...settings, themeMode: newMode });
  };
  
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Limit size to ~500KB to prevent localStorage quota issues
    if (file.size > 500 * 1024) {
        setStatus({ msg: 'Image too large. Please use an image under 500KB.', type: 'error' });
        return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
        const base64 = event.target?.result as string;
        handleUpdateSettings({ ...settings, logoData: base64 });
        setStatus({ msg: 'Logo updated successfully.', type: 'success' });
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };
  
  const handleRemoveLogo = () => {
      const newSettings = { ...settings };
      delete newSettings.logoData;
      handleUpdateSettings(newSettings);
  };

  const handleAddCategory = () => {
    if (newCategory && !settings.categories.includes(newCategory)) {
      handleUpdateSettings({ ...settings, categories: [...settings.categories, newCategory] });
      setNewCategory('');
    }
  };

  const handleDeleteCategory = (cat: string) => {
    handleUpdateSettings({ ...settings, categories: settings.categories.filter(c => c !== cat) });
  };

  const handleAddExpenseCategory = () => {
    if (newExpenseCategory && !settings.expenseCategories.includes(newExpenseCategory)) {
      handleUpdateSettings({ ...settings, expenseCategories: [...settings.expenseCategories, newExpenseCategory] });
      setNewExpenseCategory('');
    }
  };

  const handleDeleteExpenseCategory = (cat: string) => {
    handleUpdateSettings({ ...settings, expenseCategories: settings.expenseCategories.filter(c => c !== cat) });
  };

  const handleAddPlatform = () => {
    if (newPlatform && !settings.platforms.includes(newPlatform)) {
      handleUpdateSettings({ ...settings, platforms: [...settings.platforms, newPlatform] });
      setNewPlatform('');
    }
  };

  const handleDeletePlatform = (plat: string) => {
    handleUpdateSettings({ ...settings, platforms: settings.platforms.filter(p => p !== plat) });
  };

  // --- Export/Import Logic (Unchanged) ---
  const handleExport = () => {
    const jsonString = exportData();
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `lansky_ledger_backup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setStatus({ msg: 'Ledger exported successfully.', type: 'success' });
  };

  const handleImportClick = () => { fileInputRef.current?.click(); };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const success = importData(content);
      if (success) {
        setStatus({ msg: 'Ledger restored successfully. Refreshing...', type: 'success' });
        // Reload settings to reflect imported state
        setSettings(loadSettings());
        document.documentElement.style.setProperty('--primary', loadSettings().themeColor);
        onDataChanged();
      } else {
        setStatus({ msg: 'Invalid backup file format.', type: 'error' });
      }
    };
    reader.readAsText(file);
    e.target.value = ''; 
  };

  // --- PIN Logic (Unchanged) ---
  const handlePinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pinAction === 'SET') {
        if (pinInput.length < 4) { setStatus({ msg: 'PIN must be at least 4 digits.', type: 'error' }); return; }
        await setPin(pinInput); setIsPinSet(true); setStatus({ msg: 'Security PIN activated.', type: 'success' }); resetPinForm();
    } else if (pinAction === 'CHANGE') {
        if (!await verifyPin(currentPinInput)) { setStatus({ msg: 'Incorrect current PIN.', type: 'error' }); return; }
        if (pinInput.length < 4) { setStatus({ msg: 'New PIN must be at least 4 digits.', type: 'error' }); return; }
        await setPin(pinInput); setStatus({ msg: 'PIN updated successfully.', type: 'success' }); resetPinForm();
    } else if (pinAction === 'REMOVE') {
        if (!await verifyPin(currentPinInput)) { setStatus({ msg: 'Incorrect PIN.', type: 'error' }); return; }
        removePin(); setIsPinSet(false); setStatus({ msg: 'Security PIN removed.', type: 'success' }); resetPinForm();
    }
  };
  const resetPinForm = () => { setPinInput(''); setCurrentPinInput(''); setPinAction(null); setShowPinSetup(false); };

  return (
    <div className="space-y-6 animate-fade-in pb-10">
        
        {/* User Profile Section */}
        <CollapsibleSection 
          title="User & Business Profile" 
          icon={User} 
          isOpen={openSections['profile']} 
          onToggle={() => toggleSection('profile')}
        >
           <div className="space-y-4 pt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                   <label className="block text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">Your Name</label>
                   <input 
                      type="text"
                      name="name"
                      value={settings.userProfile.name}
                      onChange={handleProfileChange}
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-slate-200 rounded px-3 py-2 focus:outline-none focus:border-[var(--primary)]"
                   />
                </div>
                <div>
                   <label className="block text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">Business Name</label>
                   <input 
                      type="text"
                      name="businessName"
                      value={settings.userProfile.businessName}
                      onChange={handleProfileChange}
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-slate-200 rounded px-3 py-2 focus:outline-none focus:border-[var(--primary)]"
                   />
                </div>
              </div>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                   <label className="block text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">Email</label>
                   <input 
                      type="email"
                      name="email"
                      value={settings.userProfile.email}
                      onChange={handleProfileChange}
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-slate-200 rounded px-3 py-2 focus:outline-none focus:border-[var(--primary)]"
                   />
                </div>
                <div>
                   <label className="block text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">Phone</label>
                   <input 
                      type="text"
                      name="phone"
                      value={settings.userProfile.phone}
                      onChange={handleProfileChange}
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-slate-200 rounded px-3 py-2 focus:outline-none focus:border-[var(--primary)]"
                   />
                </div>
              </div>
              <div>
                   <label className="block text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">Private Notes (Local Only)</label>
                   <textarea 
                      name="notes"
                      rows={3}
                      value={settings.userProfile.notes}
                      onChange={handleProfileChange}
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-slate-200 rounded px-3 py-2 focus:outline-none focus:border-[var(--primary)]"
                   />
                </div>
           </div>
        </CollapsibleSection>

        {/* Visual Theme & Customization */}
        <CollapsibleSection 
          title="Visual Theme & Customization" 
          icon={Palette} 
          isOpen={openSections['customization']} 
          onToggle={() => toggleSection('customization')}
        >
            <div className="pt-4 space-y-8">
                
                {/* Logo and Theme Controls */}
                <div className="flex flex-col md:flex-row md:items-end gap-8">
                    {/* Logo Section */}
                    <div>
                         <label className="block text-sm font-medium text-slate-500 dark:text-slate-400 mb-2">App Logo</label>
                         <div className="flex items-center gap-4">
                            <div className="h-20 w-20 bg-slate-100 dark:bg-white rounded-lg flex items-center justify-center border border-slate-200 dark:border-slate-600 shadow-sm overflow-hidden p-1 relative group">
                                <img src={settings.logoData || "logo.png"} alt="App Logo" className="h-full w-full object-contain" />
                                {settings.logoData && (
                                    <button 
                                        onClick={handleRemoveLogo}
                                        className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"
                                        title="Remove Logo"
                                    >
                                        <X className="h-6 w-6 text-white" />
                                    </button>
                                )}
                            </div>
                            <div>
                                <button 
                                    onClick={() => logoInputRef.current?.click()}
                                    className="bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 text-xs py-2 px-3 rounded border border-slate-300 dark:border-slate-600 flex items-center gap-2 mb-1"
                                >
                                    <ImageIcon className="h-4 w-4" />
                                    Upload New
                                </button>
                                <p className="text-[10px] text-slate-500">Max size 500KB. PNG/JPG.</p>
                                <input 
                                    type="file" 
                                    ref={logoInputRef} 
                                    onChange={handleLogoUpload} 
                                    className="hidden" 
                                    accept="image/*"
                                />
                            </div>
                         </div>
                    </div>

                    {/* Appearance Controls */}
                    <div className="flex items-end gap-6">
                        <div>
                            <label className="block text-sm font-medium text-slate-500 dark:text-slate-400 mb-2">Primary Accent</label>
                             <input 
                                type="color" 
                                value={settings.themeColor}
                                onChange={handleThemeChange}
                                className="bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 h-10 w-24 rounded cursor-pointer p-1"
                            />
                        </div>
                        
                        <div>
                             <label className="block text-sm font-medium text-slate-500 dark:text-slate-400 mb-2">Interface Theme</label>
                             <button 
                                onClick={toggleThemeMode}
                                className="h-10 px-4 rounded border border-slate-300 dark:border-slate-600 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 flex items-center gap-2 transition-colors min-w-[140px] justify-center"
                             >
                                {settings.themeMode === 'light' ? (
                                    <>
                                        <Sun className="h-4 w-4 text-amber-500" />
                                        <span>Light Mode</span>
                                    </>
                                ) : (
                                    <>
                                        <Moon className="h-4 w-4 text-indigo-400" />
                                        <span>Dark Mode</span>
                                    </>
                                )}
                             </button>
                        </div>
                    </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {/* Buy/Sell Categories */}
                    <div>
                        <h3 className="text-slate-800 dark:text-slate-200 font-medium mb-3 flex items-center gap-2 text-sm uppercase tracking-wide">
                            <List className="h-4 w-4 text-emerald-500" /> Inventory Categories
                        </h3>
                        <div className="flex gap-2 mb-3">
                            <input 
                                type="text" 
                                className="bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded px-2 py-1 flex-1 text-sm text-slate-900 dark:text-slate-200 focus:border-[var(--primary)] focus:outline-none"
                                placeholder="Add Category"
                                value={newCategory}
                                onChange={(e) => setNewCategory(e.target.value)}
                            />
                            <button onClick={handleAddCategory} className="bg-[var(--primary)] text-white p-1 rounded hover:opacity-90">
                                <Plus className="h-4 w-4" />
                            </button>
                        </div>
                        <ul className="max-h-40 overflow-y-auto space-y-1 bg-slate-100 dark:bg-slate-900/50 p-2 rounded border border-slate-200 dark:border-slate-700/50">
                            {settings.categories.map(c => (
                                <li key={c} className="flex justify-between items-center text-sm text-slate-600 dark:text-slate-400">
                                    <span>{c}</span>
                                    {c !== 'Inventory Source' && (
                                        <button onClick={() => handleDeleteCategory(c)} className="text-slate-400 hover:text-rose-500 dark:text-slate-600 dark:hover:text-rose-400">
                                            <Trash2 className="h-3 w-3" />
                                        </button>
                                    )}
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Expense Categories */}
                    <div>
                        <h3 className="text-slate-800 dark:text-slate-200 font-medium mb-3 flex items-center gap-2 text-sm uppercase tracking-wide">
                            <List className="h-4 w-4 text-rose-500" /> Expense Categories
                        </h3>
                         <div className="flex gap-2 mb-3">
                            <input 
                                type="text" 
                                className="bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded px-2 py-1 flex-1 text-sm text-slate-900 dark:text-slate-200 focus:border-[var(--primary)] focus:outline-none"
                                placeholder="Add Expense"
                                value={newExpenseCategory}
                                onChange={(e) => setNewExpenseCategory(e.target.value)}
                            />
                            <button onClick={handleAddExpenseCategory} className="bg-[var(--primary)] text-white p-1 rounded hover:opacity-90">
                                <Plus className="h-4 w-4" />
                            </button>
                        </div>
                         <ul className="max-h-40 overflow-y-auto space-y-1 bg-slate-100 dark:bg-slate-900/50 p-2 rounded border border-slate-200 dark:border-slate-700/50">
                            {settings.expenseCategories.map(c => (
                                <li key={c} className="flex justify-between items-center text-sm text-slate-600 dark:text-slate-400">
                                    <span>{c}</span>
                                    <button onClick={() => handleDeleteExpenseCategory(c)} className="text-slate-400 hover:text-rose-500 dark:text-slate-600 dark:hover:text-rose-400">
                                        <Trash2 className="h-3 w-3" />
                                    </button>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Platforms */}
                    <div>
                         <h3 className="text-slate-800 dark:text-slate-200 font-medium mb-3 flex items-center gap-2 text-sm uppercase tracking-wide">
                            <List className="h-4 w-4 text-indigo-500" /> Platforms
                        </h3>
                        <div className="flex gap-2 mb-3">
                            <input 
                                type="text" 
                                className="bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded px-2 py-1 flex-1 text-sm text-slate-900 dark:text-slate-200 focus:border-[var(--primary)] focus:outline-none"
                                placeholder="Add Platform"
                                value={newPlatform}
                                onChange={(e) => setNewPlatform(e.target.value)}
                            />
                            <button onClick={handleAddPlatform} className="bg-[var(--primary)] text-white p-1 rounded hover:opacity-90">
                                <Plus className="h-4 w-4" />
                            </button>
                        </div>
                        <ul className="max-h-40 overflow-y-auto space-y-1 bg-slate-100 dark:bg-slate-900/50 p-2 rounded border border-slate-200 dark:border-slate-700/50">
                            {settings.platforms.map(p => (
                                <li key={p} className="flex justify-between items-center text-sm text-slate-600 dark:text-slate-400">
                                    <span>{p}</span>
                                    <button onClick={() => handleDeletePlatform(p)} className="text-slate-400 hover:text-rose-500 dark:text-slate-600 dark:hover:text-rose-400">
                                        <Trash2 className="h-3 w-3" />
                                    </button>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            </div>
        </CollapsibleSection>

        {/* Data Management Section */}
        <CollapsibleSection 
          title="Data Management" 
          icon={Database} 
          isOpen={openSections['data']} 
          onToggle={() => toggleSection('data')}
        >
            <div className="pt-4">
                <p className="text-slate-500 dark:text-slate-400 mb-6 text-sm leading-relaxed">
                    Lansky Ledger operates entirely offline. Your financial data is stored in your browser's local storage.
                    Use the tools below to backup your ledger to a JSON file or restore from a previous backup.
                </p>

                <div className="flex flex-col sm:flex-row gap-4">
                    <button 
                    onClick={handleExport}
                    className="flex-1 flex items-center justify-center gap-2 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 py-3 px-4 rounded border border-slate-300 dark:border-slate-600 transition-colors"
                    >
                    <Download className="h-5 w-5" />
                    Export / Backup
                    </button>

                    <button 
                    onClick={handleImportClick}
                    className="flex-1 flex items-center justify-center gap-2 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 py-3 px-4 rounded border border-slate-300 dark:border-slate-600 transition-colors"
                    >
                    <Upload className="h-5 w-5" />
                    Import / Restore
                    </button>
                    <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={handleFileChange} 
                    className="hidden" 
                    accept=".json"
                    />
                </div>
            </div>
        </CollapsibleSection>

        {/* Security Section */}
        <CollapsibleSection 
          title="App Security" 
          icon={ShieldCheck} 
          isOpen={openSections['security']} 
          onToggle={() => toggleSection('security')}
        >
            <div className="pt-4">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-base font-medium text-slate-700 dark:text-slate-300">PIN Protection Status</h3>
                    {isPinSet ? (
                        <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 text-sm font-medium bg-emerald-100 dark:bg-emerald-900/20 px-3 py-1 rounded-full border border-emerald-200 dark:border-emerald-900/50">
                            <ShieldCheck className="h-4 w-4" />
                            <span>Protected</span>
                        </div>
                    ) : (
                        <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 text-sm font-medium bg-amber-100 dark:bg-amber-900/20 px-3 py-1 rounded-full border border-amber-200 dark:border-amber-900/50">
                            <ShieldAlert className="h-4 w-4" />
                            <span>Unsecured</span>
                        </div>
                    )}
                </div>

                {!showPinSetup ? (
                    <div className="flex gap-4">
                        {!isPinSet ? (
                            <button 
                                onClick={() => { setPinAction('SET'); setShowPinSetup(true); }}
                                className="flex-1 bg-[var(--primary)] hover:opacity-90 text-white py-3 px-4 rounded transition-colors flex items-center justify-center gap-2"
                            >
                                <Lock className="h-4 w-4" />
                                Enable PIN Protection
                            </button>
                        ) : (
                            <>
                                <button 
                                    onClick={() => { setPinAction('CHANGE'); setShowPinSetup(true); }}
                                    className="flex-1 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 py-3 px-4 rounded border border-slate-300 dark:border-slate-600 transition-colors"
                                >
                                    Change PIN
                                </button>
                                <button 
                                    onClick={() => { setPinAction('REMOVE'); setShowPinSetup(true); }}
                                    className="flex-1 bg-rose-100 hover:bg-rose-200 dark:bg-rose-900/50 dark:hover:bg-rose-900 text-rose-700 dark:text-rose-200 py-3 px-4 rounded border border-rose-200 dark:border-rose-800 transition-colors"
                                >
                                    Remove PIN
                                </button>
                            </>
                        )}
                    </div>
                ) : (
                    <form onSubmit={handlePinSubmit} className="bg-slate-100 dark:bg-slate-900 p-4 rounded-lg border border-slate-200 dark:border-slate-700 space-y-4">
                        <h3 className="text-slate-800 dark:text-slate-200 font-medium">
                            {pinAction === 'SET' ? 'Set New PIN' : pinAction === 'CHANGE' ? 'Change PIN' : 'Remove PIN'}
                        </h3>
                        
                        {(pinAction === 'CHANGE' || pinAction === 'REMOVE') && (
                            <div>
                                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Current PIN</label>
                                <input 
                                    type="password" 
                                    inputMode="numeric"
                                    className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-slate-100 rounded px-3 py-2 focus:outline-none focus:border-[var(--primary)]"
                                    value={currentPinInput}
                                    onChange={(e) => setCurrentPinInput(e.target.value)}
                                    autoFocus
                                />
                            </div>
                        )}

                        {(pinAction === 'SET' || pinAction === 'CHANGE') && (
                            <div>
                                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                                    {pinAction === 'CHANGE' ? 'New PIN' : 'Enter PIN (4+ digits)'}
                                </label>
                                <input 
                                    type="password" 
                                    inputMode="numeric"
                                    className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-slate-100 rounded px-3 py-2 focus:outline-none focus:border-[var(--primary)]"
                                    value={pinInput}
                                    onChange={(e) => setPinInput(e.target.value)}
                                    autoFocus={pinAction === 'SET'}
                                />
                            </div>
                        )}

                        <div className="flex gap-3 pt-2">
                            <button 
                                type="button" 
                                onClick={resetPinForm}
                                className="flex-1 py-2 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                            >
                                Cancel
                            </button>
                            <button 
                                type="submit"
                                className={`flex-1 py-2 rounded text-white ${pinAction === 'REMOVE' ? 'bg-rose-600 hover:bg-rose-700' : 'bg-emerald-600 hover:bg-emerald-700'}`}
                            >
                                Confirm
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </CollapsibleSection>

        {/* Legal Section */}
        <CollapsibleSection 
          title="Legal & Disclaimer" 
          icon={Gavel} 
          isOpen={openSections['legal']} 
          onToggle={() => toggleSection('legal')}
        >
            <div className="pt-4 text-slate-500 dark:text-slate-400 text-xs space-y-4 bg-slate-100 dark:bg-slate-900/50 p-4 rounded border border-slate-200 dark:border-slate-700/50 max-h-40 overflow-y-auto">
                <p><strong>Terms of Use:</strong> Lansky Ledger Solutions is a locally hosted, offline application. The developers take no responsibility for data loss, financial inaccuracies, or legal liabilities arising from the use of this software.</p>
                <p><strong>Privacy Policy:</strong> No data is transmitted to external servers. All information is stored locally on your device via the browser's LocalStorage API. You are solely responsible for backing up your data and securing your device.</p>
                <p><strong>License:</strong> This software is provided "as is", without warranty of any kind, express or implied.</p>
                <p>© {new Date().getFullYear()} Lansky Ledger Solutions.</p>
            </div>
        </CollapsibleSection>

        {status.msg && (
            <div className={`mt-6 p-4 rounded flex items-center gap-3 ${status.type === 'success' ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400' : 'bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400'}`}>
            {status.type === 'success' ? <CheckCircle className="h-5 w-5" /> : <AlertTriangle className="h-5 w-5" />}
            <span>{status.msg}</span>
            </div>
        )}
    </div>
  );
};

export default Settings;