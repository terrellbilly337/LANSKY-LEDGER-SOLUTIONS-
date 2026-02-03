import React, { useMemo, useState, useEffect } from 'react';
import { Transaction, LedgerSummary, InventoryItem, InventorySummary } from '../types';
import { calculateSummary, formatCurrency, getChartData, calculateInventorySummary } from '../services/financeService';
import { loadInventory, loadSettings } from '../services/storageService';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Package, TrendingUp, Wallet, ArrowRight, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface DashboardProps {
  transactions: Transaction[];
  isDarkMode: boolean;
}

const AccountCard = ({ 
    label, 
    value, 
    subValue, 
    type = 'standard',
    onClick
}: { 
    label: string; 
    value: string; 
    subValue?: string;
    type?: 'primary' | 'standard';
    onClick?: () => void;
}) => {
    if (type === 'primary') {
        return (
            <div 
                onClick={onClick}
                className="col-span-1 md:col-span-1 bg-gradient-to-br from-[var(--primary)] to-indigo-900 rounded-2xl p-6 shadow-lg shadow-indigo-500/20 text-white relative overflow-hidden cursor-pointer transform transition-transform hover:scale-[1.02]"
            >
                {/* Decorative circles */}
                <div className="absolute -top-10 -right-10 h-40 w-40 bg-white opacity-5 rounded-full blur-2xl"></div>
                <div className="absolute bottom-0 left-0 h-32 w-32 bg-indigo-500 opacity-20 rounded-full blur-xl"></div>
                
                <div className="relative z-10 flex flex-col h-full justify-between min-h-[140px]">
                    <div className="flex justify-between items-start">
                        <h3 className="text-indigo-100 font-medium text-sm uppercase tracking-wider">{label}</h3>
                        <Wallet className="h-6 w-6 text-indigo-200 opacity-80" />
                    </div>
                    <div>
                        <p className="text-3xl md:text-4xl font-bold tracking-tight mb-1">{value}</p>
                        {subValue && <p className="text-indigo-200 text-sm font-medium">{subValue}</p>}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div 
            onClick={onClick}
            className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-100 dark:border-slate-700/50 cursor-pointer transition-colors hover:border-[var(--primary)] dark:hover:border-[var(--primary)] group"
        >
            <div className="flex justify-between items-start mb-6">
                 <h3 className="text-slate-500 dark:text-slate-400 font-medium text-sm uppercase tracking-wider">{label}</h3>
                 <div className="p-2 rounded-full bg-slate-50 dark:bg-slate-700/50 group-hover:bg-indigo-50 dark:group-hover:bg-indigo-900/30 transition-colors">
                     <ArrowRight className="h-4 w-4 text-slate-400 group-hover:text-[var(--primary)]" />
                 </div>
            </div>
            <div>
                 <p className="text-2xl font-bold text-slate-800 dark:text-slate-100 tracking-tight">{value}</p>
                 {subValue && <p className="text-slate-400 dark:text-slate-500 text-xs mt-1 font-medium">{subValue}</p>}
            </div>
        </div>
    );
};

const Dashboard: React.FC<DashboardProps> = ({ transactions, isDarkMode }) => {
  const navigate = useNavigate();
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [agingCount, setAgingCount] = useState(0);
  const [agingThreshold, setAgingThreshold] = useState(30);
  
  const summary: LedgerSummary = useMemo(() => calculateSummary(transactions), [transactions]);
  const chartData = useMemo(() => getChartData(transactions), [transactions]);
  
  useEffect(() => {
    const loadedInventory = loadInventory();
    const settings = loadSettings();
    setInventory(loadedInventory);
    setAgingThreshold(settings.inventoryAgingThreshold);

    // Calculate aging items
    const now = new Date().getTime();
    const aging = loadedInventory.filter(item => {
        if (item.status !== 'IN_STOCK') return false;
        const daysHeld = Math.floor((now - new Date(item.dateAcquired).getTime()) / (1000 * 60 * 60 * 24));
        return daysHeld > settings.inventoryAgingThreshold;
    });
    setAgingCount(aging.length);
  }, [transactions]); 

  const invSummary: InventorySummary = useMemo(() => calculateInventorySummary(inventory), [inventory]);

  return (
    <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-between px-1">
            <h2 className="text-xl font-bold text-slate-800 dark:text-white">Accounts & Overview</h2>
            <span className="text-xs font-medium text-slate-500 bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-full">
                {new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
            </span>
        </div>

        {/* Alerts Section */}
        {agingCount > 0 && (
            <div onClick={() => navigate('/inventory')} className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-900/50 rounded-xl p-4 flex items-center justify-between cursor-pointer hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-colors">
                <div className="flex items-center gap-3">
                    <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-500" />
                    <div>
                        <p className="text-sm font-bold text-amber-800 dark:text-amber-200">Dead Stock Alert</p>
                        <p className="text-xs text-amber-700 dark:text-amber-400">
                            You have {agingCount} item{agingCount !== 1 ? 's' : ''} in stock for over {agingThreshold} days.
                        </p>
                    </div>
                </div>
                <ArrowRight className="h-4 w-4 text-amber-500" />
            </div>
        )}

      <div className="grid grid-cols-1 sm:grid-cols-3 landscape:grid-cols-3 gap-4 md:gap-6">
        <AccountCard 
          type="primary"
          label="Net Profit (Cash)" 
          value={formatCurrency(summary.totalBalanceCents)} 
          subValue="Available Balance"
          onClick={() => navigate('/transactions')}
        />
        <AccountCard 
          label="Inventory Stock" 
          value={formatCurrency(invSummary.totalValueCents)} 
          subValue={`${invSummary.totalItems} Items in Stock`}
          onClick={() => navigate('/inventory')}
        />
        <AccountCard 
          label="Total Sales Revenue" 
          value={formatCurrency(summary.totalIncomeCents)} 
          subValue="Lifetime Income"
          onClick={() => navigate('/reports')}
        />
      </div>

      <div className="grid grid-cols-1 landscape:grid-cols-3 lg:grid-cols-3 gap-6 pt-4">
        {/* Main Chart */}
        <div className="landscape:col-span-2 lg:col-span-2 bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-100 dark:border-slate-700/50">
          <div className="flex justify-between items-center mb-6">
              <h3 className="text-slate-800 dark:text-slate-200 font-bold">Cash Flow Trends</h3>
              <button 
                onClick={() => navigate('/reports')}
                className="text-xs font-semibold text-[var(--primary)] hover:opacity-80"
              >
                  See All
              </button>
          </div>
          <div className="h-64 w-full">
            {transactions.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="var(--primary)" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={isDarkMode ? "#334155" : "#f1f5f9"} vertical={false} />
                  <XAxis 
                    dataKey="date" 
                    stroke={isDarkMode ? "#94a3b8" : "#94a3b8"} 
                    tick={{fontSize: 10}} 
                    tickLine={false}
                    axisLine={false}
                    minTickGap={40}
                  />
                  <YAxis hide />
                  <Tooltip 
                    contentStyle={{ 
                        backgroundColor: isDarkMode ? '#1e293b' : '#ffffff', 
                        borderColor: isDarkMode ? '#334155' : '#e2e8f0', 
                        borderRadius: '12px',
                        color: isDarkMode ? '#f1f5f9' : '#0f172a',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' 
                    }}
                    itemStyle={{ color: 'var(--primary)', fontWeight: 'bold' }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="balance" 
                    stroke="var(--primary)" 
                    strokeWidth={3}
                    fillOpacity={1} 
                    fill="url(#colorBalance)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-dashed border-slate-200 dark:border-slate-700">
                <TrendingUp className="h-8 w-8 mb-2 opacity-50" />
                <p className="text-sm">Start logging transactions to see data</p>
              </div>
            )}
          </div>
        </div>

        {/* Inventory Widget */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-100 dark:border-slate-700/50 flex flex-col h-full">
          <div className="flex items-center justify-between mb-4">
             <h3 className="text-slate-800 dark:text-slate-200 font-bold">Recent Arrivals</h3>
             <button 
                onClick={() => navigate('/inventory')}
                className="text-xs font-semibold text-[var(--primary)] hover:opacity-80"
              >
                  View All
              </button>
          </div>
          
          <div className="flex-grow overflow-y-auto pr-1 -mx-2 px-2">
             {invSummary.recentItems.length > 0 ? (
               <ul className="space-y-4">
                 {invSummary.recentItems.map((item, idx) => (
                   <li key={item.id || idx} className="flex items-center gap-3 py-1">
                      <div className="h-10 w-10 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center flex-shrink-0">
                         <Package className="h-5 w-5 text-slate-500 dark:text-slate-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-slate-800 dark:text-slate-200 font-semibold text-sm truncate">{item.name}</p>
                        <p className="text-slate-500 text-xs truncate">{item.category}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-slate-800 dark:text-slate-200 font-mono text-sm font-medium">{formatCurrency(item.costPerUnitCents)}</p>
                        <p className="text-slate-400 text-[10px]">x{item.quantity}</p>
                      </div>
                   </li>
                 ))}
               </ul>
             ) : (
               <div className="text-center text-slate-400 dark:text-slate-500 text-sm mt-10">
                 <Package className="h-10 w-10 mx-auto mb-3 opacity-30" />
                 No items currently in stock.
               </div>
             )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;