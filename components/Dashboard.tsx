
import React, { useMemo, useState, useEffect } from 'react';
import { Transaction, LedgerSummary, InventoryItem, InventorySummary } from '../types';
import { calculateSummary, formatCurrency, getChartData, calculateInventorySummary } from '../services/financeService';
import { loadInventory, loadSettings } from '../services/storageService';
import { getAppTime, formatAppDisplayDate } from '../services/timeService';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp, Wallet, ArrowRight, AlertCircle, ChevronDown, ChevronUp, Scale, Percent, Landmark, Medal } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface DashboardProps {
  transactions: Transaction[];
  isDarkMode: boolean;
}

// Visual Indicator for Tax Liability
const TaxLiabilityWidget = ({ estimatedTaxCents, totalBalanceCents, taxRate }: { estimatedTaxCents: number, totalBalanceCents: number, taxRate: number }) => {
    const navigate = useNavigate();
    
    // Calculate Liability Ratio
    let liabilityRatio = 0;
    if (totalBalanceCents > 0) {
        liabilityRatio = (estimatedTaxCents / totalBalanceCents) * 100;
    } else if (estimatedTaxCents > 0) {
        liabilityRatio = 100;
    }

    // Badge Logic (Roadmap Progress)
    // Thresholds: $1k (Peddler), $10k (Reseller), $100k (CEO)
    const taxDollars = estimatedTaxCents / 100;
    let badgeLabel = "";
    let badgeColor = "";
    
    if (taxDollars >= 100000) {
        badgeLabel = "The CEO";
        badgeColor = "text-amber-400 bg-amber-900/40 border-amber-500/50";
    } else if (taxDollars >= 10000) {
        badgeLabel = "The Reseller";
        badgeColor = "text-sky-400 bg-sky-900/40 border-sky-500/50";
    } else if (taxDollars >= 1000) {
        badgeLabel = "The Peddler";
        badgeColor = "text-emerald-400 bg-emerald-900/40 border-emerald-500/50";
    }

    // Dynamic Gradient Logic
    let textColor = '';
    let barGradient = '';

    if (liabilityRatio <= 10) {
        textColor = 'text-emerald-600 dark:text-emerald-400';
        barGradient = 'bg-gradient-to-r from-emerald-400 to-emerald-600';
    } else if (liabilityRatio <= 25) {
        textColor = 'text-amber-600 dark:text-amber-400';
        barGradient = 'bg-gradient-to-r from-amber-400 to-amber-600';
    } else {
        textColor = 'text-rose-600 dark:text-rose-400';
        barGradient = 'bg-gradient-to-r from-rose-500 to-rose-700 animate-pulse';
    }

    const barWidth = Math.min(Math.max(liabilityRatio, 5), 100);

    return (
        <div 
            onClick={() => navigate('/reports')}
            className="col-span-1 md:col-span-1 bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm border border-slate-100 dark:border-slate-700/50 cursor-pointer group flex flex-col justify-between relative overflow-hidden"
        >
            <div className="flex justify-between items-start mb-2 relative z-10">
                <div className="flex items-center gap-2">
                    <Landmark className="h-4 w-4 text-slate-400 group-hover:text-[var(--primary)]" />
                    <h3 className="text-slate-500 dark:text-slate-400 font-medium text-xs uppercase tracking-wider">Tax Liability</h3>
                </div>
                
                {/* Roadmap Badge */}
                {badgeLabel && (
                    <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[10px] font-bold uppercase tracking-wider ${badgeColor}`}>
                        <Medal className="h-3 w-3" />
                        {badgeLabel}
                    </div>
                )}
            </div>

            <div className="space-y-1 relative z-10">
                <p className="text-2xl font-bold text-slate-800 dark:text-slate-100 tracking-tight">
                    {formatCurrency(estimatedTaxCents)}
                </p>
                <div className="flex justify-between items-center text-xs">
                    <p className="text-slate-400 dark:text-slate-500 font-medium">Est. @ {taxRate}%</p>
                    <p className={`${textColor} font-bold`}>{liabilityRatio.toFixed(1)}% of Cash</p>
                </div>
            </div>

            {/* Dynamic Progress Bar */}
            <div className="w-full h-2 bg-slate-100 dark:bg-slate-700 rounded-full mt-3 overflow-hidden relative z-10">
                <div 
                    className={`h-full rounded-full transition-all duration-1000 ease-out ${barGradient}`} 
                    style={{ width: `${barWidth}%` }}
                ></div>
            </div>
        </div>
    );
};

const AccountCard = ({ 
    label, 
    value, 
    subValue, 
    type = 'standard',
    onClick,
    collapsible = false,
    icon: Icon
}: { 
    label: string; 
    value: string; 
    subValue?: string;
    type?: 'primary' | 'standard' | 'secondary';
    onClick?: () => void;
    collapsible?: boolean;
    icon?: any;
}) => {
    const [isOpen, setIsOpen] = useState(true);

    const handleToggle = (e: React.MouseEvent) => {
        e.stopPropagation();
        setIsOpen(!isOpen);
    };

    if (type === 'primary') {
        return (
            <div 
                onClick={onClick}
                className="col-span-1 md:col-span-1 bg-gradient-to-br from-[var(--primary)] to-indigo-900 rounded-2xl p-5 shadow-lg shadow-indigo-500/20 text-white relative overflow-hidden cursor-pointer transform transition-transform hover:scale-[1.02]"
            >
                {/* Decorative circles */}
                <div className="absolute -top-10 -right-10 h-40 w-40 bg-white opacity-5 rounded-full blur-2xl"></div>
                <div className="absolute bottom-0 left-0 h-32 w-32 bg-indigo-500 opacity-20 rounded-full blur-xl"></div>
                
                <div className="relative z-10 flex flex-col h-full justify-between min-h-[120px]">
                    <div className="flex justify-between items-start">
                        <h3 className="text-indigo-100 font-medium text-xs uppercase tracking-wider">{label}</h3>
                        <Wallet className="h-5 w-5 text-indigo-200 opacity-80" />
                    </div>
                    <div>
                        <p className="text-3xl font-bold tracking-tight mb-1">{value}</p>
                        {subValue && <p className="text-indigo-200 text-xs font-medium">{subValue}</p>}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div 
            onClick={onClick}
            className={`bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm border border-slate-100 dark:border-slate-700/50 cursor-pointer transition-colors hover:border-[var(--primary)] dark:hover:border-[var(--primary)] group h-full flex flex-col`}
        >
            <div className="flex justify-between items-center">
                 <div className="flex items-center gap-2">
                    {Icon && <Icon className="h-4 w-4 text-slate-400 group-hover:text-[var(--primary)]" />}
                    <h3 className="text-slate-500 dark:text-slate-400 font-medium text-xs uppercase tracking-wider">{label}</h3>
                 </div>
                 <div className="flex items-center gap-2">
                    {collapsible && (
                        <button 
                            onClick={handleToggle}
                            className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded transition-colors text-slate-400"
                        >
                            {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </button>
                    )}
                    {!collapsible && (
                         <div className="p-1.5 rounded-full bg-slate-50 dark:bg-slate-700/50 group-hover:bg-indigo-50 dark:group-hover:bg-indigo-900/30 transition-colors">
                            <ArrowRight className="h-3 w-3 text-slate-400 group-hover:text-[var(--primary)]" />
                        </div>
                    )}
                 </div>
            </div>
            {isOpen && (
                <div className="animate-fade-in mt-4">
                    <p className="text-2xl font-bold text-slate-800 dark:text-slate-100 tracking-tight">{value}</p>
                    {subValue && <p className="text-slate-400 dark:text-slate-500 text-xs mt-1 font-medium">{subValue}</p>}
                </div>
            )}
        </div>
    );
};

const Dashboard: React.FC<DashboardProps> = ({ transactions, isDarkMode }) => {
  const navigate = useNavigate();
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [agingCount, setAgingCount] = useState(0);
  const [agingThreshold, setAgingThreshold] = useState(30);
  const [taxRate, setTaxRate] = useState(0);
  
  // Collapse States
  const [isChartOpen, setIsChartOpen] = useState(true);
  
  const summary: LedgerSummary = useMemo(() => calculateSummary(transactions), [transactions]);
  const chartData = useMemo(() => getChartData(transactions), [transactions]);
  
  // Tax Calculations
  const estimatedTaxCents = useMemo(() => {
      const netProfit = summary.totalBalanceCents;
      if (netProfit <= 0 || taxRate <= 0) return 0;
      return Math.round(netProfit * (taxRate / 100));
  }, [summary.totalBalanceCents, taxRate]);

  useEffect(() => {
    const loadedInventory = loadInventory();
    const settings = loadSettings();
    setInventory(loadedInventory);
    setAgingThreshold(settings.inventoryAgingThreshold);
    setTaxRate(settings.taxRatePercentage || 0);

    // Calculate aging items using App Time
    const now = getAppTime().getTime();
    const aging = loadedInventory.filter(item => {
        if (item.status !== 'IN_STOCK') return false;
        const daysHeld = Math.floor((now - new Date(item.dateAcquired).getTime()) / (1000 * 60 * 60 * 24));
        return daysHeld > settings.inventoryAgingThreshold;
    });
    setAgingCount(aging.length);
  }, [transactions]); 

  const invSummary: InventorySummary = useMemo(() => calculateInventorySummary(inventory), [inventory]);

  return (
    <div className="space-y-4 animate-fade-in">
        <div className="flex items-center justify-between px-1 mb-2">
            <h2 className="text-lg font-bold text-slate-800 dark:text-white">Overview</h2>
            <span className="text-[10px] font-medium text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-full border border-slate-200 dark:border-slate-700">
                {formatAppDisplayDate(getAppTime())}
            </span>
        </div>

        {/* Alerts Section */}
        {agingCount > 0 && (
            <div onClick={() => navigate('/inventory')} className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-900/50 rounded-xl p-3 flex items-center justify-between cursor-pointer hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-colors shadow-sm">
                <div className="flex items-center gap-3">
                    <div className="bg-amber-100 dark:bg-amber-900/40 p-2 rounded-full">
                        <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-500" />
                    </div>
                    <div>
                        <p className="text-xs font-bold text-amber-800 dark:text-amber-200 uppercase tracking-wide">Action Required</p>
                        <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">
                            {agingCount} item{agingCount !== 1 ? 's' : ''} in Dead Stock (&gt;{agingThreshold} days).
                        </p>
                    </div>
                </div>
                <ArrowRight className="h-4 w-4 text-amber-500" />
            </div>
        )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-6">
        <AccountCard 
          type="primary"
          label="Net Profit" 
          value={formatCurrency(summary.totalBalanceCents)} 
          subValue="Realized Cash"
          onClick={() => navigate('/transactions')}
        />
        
        {/* Dynamic Tax Widget replaces standard Tax Cards */}
        <TaxLiabilityWidget 
            estimatedTaxCents={estimatedTaxCents} 
            totalBalanceCents={summary.totalBalanceCents}
            taxRate={taxRate}
        />

        <AccountCard 
          label="Total Revenue" 
          value={formatCurrency(summary.totalIncomeCents)} 
          subValue="Gross Sales"
          onClick={() => navigate('/reports')}
          collapsible={true}
        />
      </div>

      {/* Main Chart */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm border border-slate-100 dark:border-slate-700/50 flex flex-col mt-2">
          <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-2">
                <h3 className="text-slate-800 dark:text-slate-200 font-bold text-sm">Cash Flow Trends</h3>
              </div>
              <div className="flex items-center gap-3">
                  <button 
                    onClick={() => navigate('/reports')}
                    className="text-[10px] font-bold uppercase text-[var(--primary)] hover:opacity-80"
                  >
                      Full Report
                  </button>
                  <button 
                    onClick={() => setIsChartOpen(!isChartOpen)}
                    className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded transition-colors text-slate-400"
                  >
                    {isChartOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>
              </div>
          </div>
          {isChartOpen && (
              <div className="h-56 w-full animate-fade-in">
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
                            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                            fontSize: '12px'
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
                    <p className="text-xs">No data available</p>
                  </div>
                )}
              </div>
          )}
        </div>
    </div>
  );
};

export default Dashboard;
