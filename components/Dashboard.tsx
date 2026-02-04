
import React, { useMemo, useState, useEffect } from 'react';
import { Transaction, LedgerSummary, InventoryItem, InventorySummary } from '../types';
import { calculateSummary, formatCurrency, getChartData, calculateInventorySummary } from '../services/financeService';
import { loadInventory, loadSettings } from '../services/storageService';
import { getAppTime, formatAppDisplayDate } from '../services/timeService';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp, Wallet, ArrowRight, AlertCircle, ChevronDown, ChevronUp, Scale, Percent, Landmark, Medal, BarChart3, TrendingDown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface DashboardProps {
  transactions: Transaction[];
  isDarkMode: boolean;
}

const InvestmentWidget = ({ invested, recouped }: { invested: number, recouped: number }) => {
    const roi = invested > 0 ? ((recouped - invested) / invested) * 100 : 0;
    const isPositive = roi >= 0;

    return (
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm border border-slate-100 dark:border-slate-700/50 flex flex-col justify-between">
            <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-2">
                    <Scale className="h-4 w-4 text-slate-400" />
                    <h3 className="text-slate-500 dark:text-slate-400 font-medium text-xs uppercase tracking-wider">Capital Analysis</h3>
                </div>
                <div className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border ${isPositive ? 'text-emerald-500 bg-emerald-50 border-emerald-100 dark:bg-emerald-900/20 dark:border-emerald-800' : 'text-rose-500 bg-rose-50 border-rose-100 dark:bg-rose-900/20 dark:border-rose-800'}`}>
                    ROI: {roi.toFixed(1)}%
                </div>
            </div>
            <div className="space-y-4">
                <div>
                    <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">Total Invested</p>
                    <p className="text-lg font-bold text-slate-800 dark:text-slate-100">{formatCurrency(invested)}</p>
                </div>
                <div>
                    <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">Total Recouped</p>
                    <p className="text-lg font-bold text-slate-800 dark:text-slate-100">{formatCurrency(recouped)}</p>
                </div>
            </div>
            <div className="mt-4 pt-4 border-t border-slate-50 dark:border-slate-700/50">
                 <div className="flex justify-between items-center text-[10px] font-bold uppercase">
                     <span className="text-slate-400">Recovery Status</span>
                     <span className={isPositive ? 'text-emerald-500' : 'text-amber-500'}>{isPositive ? 'PROFITABLE' : 'RECOUPING'}</span>
                 </div>
                 <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full mt-2 overflow-hidden">
                    <div className={`h-full rounded-full ${isPositive ? 'bg-emerald-500' : 'bg-amber-500'}`} style={{ width: `${Math.min(Math.max((recouped/invested) * 100, 5), 100)}%` }}></div>
                 </div>
            </div>
        </div>
    );
};

const TaxLiabilityWidget = ({ estimatedTaxCents, totalBalanceCents, taxRate }: { estimatedTaxCents: number, totalBalanceCents: number, taxRate: number }) => {
    const navigate = useNavigate();
    let liabilityRatio = totalBalanceCents > 0 ? (estimatedTaxCents / totalBalanceCents) * 100 : (estimatedTaxCents > 0 ? 100 : 0);

    const taxDollars = estimatedTaxCents / 100;
    let badgeLabel = "";
    let badgeColor = "";
    if (taxDollars >= 100000) { badgeLabel = "The CEO"; badgeColor = "text-amber-400 bg-amber-900/40 border-amber-500/50"; }
    else if (taxDollars >= 10000) { badgeLabel = "The Reseller"; badgeColor = "text-sky-400 bg-sky-900/40 border-sky-500/50"; }
    else if (taxDollars >= 1000) { badgeLabel = "The Peddler"; badgeColor = "text-emerald-400 bg-emerald-900/40 border-emerald-500/50"; }

    let textColor = liabilityRatio <= 10 ? 'text-emerald-600 dark:text-emerald-400' : liabilityRatio <= 25 ? 'text-amber-600 dark:text-amber-400' : 'text-rose-600 dark:text-rose-400';
    let barGradient = liabilityRatio <= 10 ? 'bg-gradient-to-r from-emerald-400 to-emerald-600' : liabilityRatio <= 25 ? 'bg-gradient-to-r from-amber-400 to-amber-600' : 'bg-gradient-to-r from-rose-500 to-rose-700 animate-pulse';

    return (
        <div onClick={() => navigate('/reports')} className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm border border-slate-100 dark:border-slate-700/50 cursor-pointer group flex flex-col justify-between relative overflow-hidden transition-all hover:shadow-md">
            <div className="flex justify-between items-start mb-2 relative z-10">
                <div className="flex items-center gap-2">
                    <Landmark className="h-4 w-4 text-slate-400 group-hover:text-[var(--primary)]" />
                    <h3 className="text-slate-500 dark:text-slate-400 font-medium text-xs uppercase tracking-wider">Est. Tax Liability</h3>
                </div>
                {badgeLabel && (
                    <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[10px] font-bold uppercase tracking-wider ${badgeColor}`}>
                        <Medal className="h-3 w-3" />
                        {badgeLabel}
                    </div>
                )}
            </div>
            <div className="space-y-1 relative z-10">
                <p className="text-2xl font-bold text-slate-800 dark:text-slate-100 tracking-tight">{formatCurrency(estimatedTaxCents)}</p>
                <div className="flex justify-between items-center text-xs">
                    <p className="text-slate-400 dark:text-slate-500 font-medium">Est. @ {taxRate}%</p>
                    <p className={`${textColor} font-bold`}>{liabilityRatio.toFixed(1)}% of Cash</p>
                </div>
            </div>
            <div className="w-full h-2 bg-slate-100 dark:bg-slate-700 rounded-full mt-3 overflow-hidden relative z-10">
                <div className={`h-full rounded-full transition-all duration-1000 ease-out ${barGradient}`} style={{ width: `${Math.min(Math.max(liabilityRatio, 5), 100)}%` }}></div>
            </div>
        </div>
    );
};

const Dashboard: React.FC<DashboardProps> = ({ transactions, isDarkMode }) => {
  const navigate = useNavigate();
  const [agingCount, setAgingCount] = useState(0);
  const [taxRate, setTaxRate] = useState(0);
  const [isChartOpen, setIsChartOpen] = useState(true);
  
  const summary: LedgerSummary = useMemo(() => calculateSummary(transactions), [transactions]);
  const chartData = useMemo(() => getChartData(transactions), [transactions]);
  
  const estimatedTaxCents = useMemo(() => {
      const netProfit = summary.totalBalanceCents;
      return netProfit > 0 && taxRate > 0 ? Math.round(netProfit * (taxRate / 100)) : 0;
  }, [summary.totalBalanceCents, taxRate]);

  useEffect(() => {
    const loadedInventory = loadInventory();
    const settings = loadSettings();
    setTaxRate(settings.taxRatePercentage || 0);

    const now = getAppTime().getTime();
    const aging = loadedInventory.filter(item => {
        if (item.status !== 'IN_STOCK') return false;
        const daysHeld = Math.floor((now - new Date(item.dateAcquired).getTime()) / (1000 * 60 * 60 * 24));
        return daysHeld > settings.inventoryAgingThreshold;
    });
    setAgingCount(aging.length);
  }, [transactions]); 

  return (
    <div className="space-y-4 animate-fade-in">
        <div className="flex items-center justify-between px-1 mb-2">
            <h2 className="text-lg font-bold text-slate-800 dark:text-white">Overview</h2>
            <span className="text-[10px] font-medium text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-full border border-slate-200 dark:border-slate-700">
                {formatAppDisplayDate(getAppTime())}
            </span>
        </div>

        {agingCount > 0 && (
            <div onClick={() => navigate('/inventory')} className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-900/50 rounded-xl p-3 flex items-center justify-between cursor-pointer hover:bg-amber-100 transition-colors shadow-sm">
                <div className="flex items-center gap-3">
                    <div className="bg-amber-100 dark:bg-amber-900/40 p-2 rounded-full">
                        <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-500" />
                    </div>
                    <div>
                        <p className="text-xs font-bold text-amber-800 dark:text-amber-200 uppercase tracking-wide">Action Required</p>
                        <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">{agingCount} items in Dead Stock.</p>
                    </div>
                </div>
                <ArrowRight className="h-4 w-4 text-amber-500" />
            </div>
        )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-6">
        <div onClick={() => navigate('/transactions')} className="bg-gradient-to-br from-[var(--primary)] to-indigo-900 rounded-2xl p-5 shadow-lg shadow-indigo-500/20 text-white relative overflow-hidden cursor-pointer transform transition-transform hover:scale-[1.02] flex flex-col justify-between min-h-[160px]">
            <div className="relative z-10 flex justify-between items-start">
                <h3 className="text-indigo-100 font-medium text-xs uppercase tracking-wider">Net Profit</h3>
                <Wallet className="h-5 w-5 text-indigo-200 opacity-80" />
            </div>
            <div className="relative z-10">
                <p className="text-3xl font-bold tracking-tight mb-1">{formatCurrency(summary.totalBalanceCents)}</p>
                <p className="text-indigo-200 text-xs font-medium uppercase tracking-widest opacity-80">Liquid Cash</p>
            </div>
        </div>
        <TaxLiabilityWidget estimatedTaxCents={estimatedTaxCents} totalBalanceCents={summary.totalBalanceCents} taxRate={taxRate} />
        <InvestmentWidget invested={summary.totalInvestedCents} recouped={summary.totalRecoupedCents} />
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm border border-slate-100 dark:border-slate-700/50 flex flex-col mt-2">
          <div className="flex justify-between items-center mb-4">
              <h3 className="text-slate-800 dark:text-slate-200 font-bold text-sm">Cash Flow Trends</h3>
              <div className="flex items-center gap-3">
                  <button onClick={() => navigate('/reports')} className="text-[10px] font-bold uppercase text-[var(--primary)]">Full Report</button>
                  <button onClick={() => setIsChartOpen(!isChartOpen)} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded transition-colors text-slate-400">
                    {isChartOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </button>
              </div>
          </div>
          {isChartOpen && (
              <div className="h-56 w-full animate-fade-in">
                {transactions.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData}>
                      <defs><linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="var(--primary)" stopOpacity={0.3}/><stop offset="95%" stopColor="var(--primary)" stopOpacity={0}/></linearGradient></defs>
                      <CartesianGrid strokeDasharray="3 3" stroke={isDarkMode ? "#334155" : "#f1f5f9"} vertical={false} />
                      <XAxis dataKey="date" stroke="#94a3b8" tick={{fontSize: 10}} tickLine={false} axisLine={false} minTickGap={40} />
                      <YAxis hide />
                      <Tooltip contentStyle={{ backgroundColor: isDarkMode ? '#1e293b' : '#ffffff', borderColor: isDarkMode ? '#334155' : '#e2e8f0', borderRadius: '12px', fontSize: '12px' }} itemStyle={{ color: 'var(--primary)', fontWeight: 'bold' }} />
                      <Area type="monotone" dataKey="balance" stroke="var(--primary)" strokeWidth={3} fillOpacity={1} fill="url(#colorBalance)" />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-slate-400 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-dashed border-slate-200 dark:border-slate-700">
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
