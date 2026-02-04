
import React, { useMemo, useState, useEffect } from 'react';
import { Transaction, TransactionType, QuarterlyReport } from '../types';
import { getChartData, getExpenseCategoryData, getQuarterlyReports, formatCurrency } from '../services/financeService';
import { loadSettings, loadInventory } from '../services/storageService';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, BarChart, Bar
} from 'recharts';
import { ChevronDown, ChevronUp, FileText, Download, Printer, LayoutGrid, CalendarRange, TrendingUp, DollarSign } from 'lucide-react';

interface ReportsProps {
  transactions: Transaction[];
  isDarkMode?: boolean;
}

const COLORS = ['#10b981', '#3b82f6', '#8b5cf6', '#f43f5e', '#f59e0b', '#6366f1', '#ec4899', '#14b8a6', '#64748b'];

const CustomTooltip = ({ active, payload, label, isDarkMode }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className={`${isDarkMode ? 'bg-slate-800 border-slate-700 shadow-xl' : 'bg-white border-slate-200 shadow-lg'} border p-3 rounded-xl`}>
        <p className={`${isDarkMode ? 'text-slate-400' : 'text-slate-500'} text-[10px] font-bold uppercase tracking-widest mb-2`}>{label}</p>
        <div className="space-y-1">
          {payload.map((p: any, i: number) => (
            <div key={i} className="flex items-center justify-between gap-6">
              <span className="text-xs font-medium text-slate-300 capitalize">{p.name}:</span>
              <span className="text-xs font-mono font-bold" style={{ color: p.color }}>
                {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(p.value)}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return null;
};

const QuarterlyBarChart = ({ report, isDarkMode }: { report: QuarterlyReport, isDarkMode: boolean }) => {
    const data = useMemo(() => {
        return Object.keys(report.categories).map(cat => ({
            name: cat,
            Income: report.categories[cat].income / 100,
            Expenses: report.categories[cat].expense / 100,
            Net: report.categories[cat].profit / 100
        })).sort((a, b) => b.Income - a.Income);
    }, [report]);

    return (
        <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700/50 mb-6 transition-all hover:border-[var(--primary)]">
            <div className="flex justify-between items-center mb-4">
                <div className="flex flex-col">
                    <h4 className="text-lg font-black text-slate-800 dark:text-slate-100 tracking-tight">{report.label} Performance</h4>
                    <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full border border-slate-200 dark:border-slate-700 mt-1 self-start">
                        <CalendarRange className="h-3 w-3" />
                        <span>{report.dateRange}</span>
                    </div>
                </div>
                <div className="flex gap-3">
                    <div className="flex flex-col items-center"><div className="w-2 h-2 rounded-full bg-emerald-500"></div></div>
                    <div className="flex flex-col items-center"><div className="w-2 h-2 rounded-full bg-rose-500"></div></div>
                    <div className="flex flex-col items-center"><div className="w-2 h-2 rounded-full bg-indigo-500"></div></div>
                </div>
            </div>
            <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDarkMode ? "#334155" : "#e2e8f0"} />
                        <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                        <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v}`} />
                        <Tooltip content={<CustomTooltip isDarkMode={isDarkMode} />} cursor={{ fill: 'transparent' }} />
                        <Bar dataKey="Income" fill="#10b981" radius={[4, 4, 0, 0]} barSize={12} />
                        <Bar dataKey="Expenses" fill="#f43f5e" radius={[4, 4, 0, 0]} barSize={12} />
                        <Bar dataKey="Net" fill="var(--primary)" radius={[4, 4, 0, 0]} barSize={12} />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

const AnnualSummaryChart = ({ reports, isDarkMode }: { reports: QuarterlyReport[], isDarkMode: boolean }) => {
    const data = useMemo(() => {
        return reports.slice().reverse().map(r => ({
            name: r.label,
            Income: r.totalIncomeCents / 100,
            Expenses: r.totalExpenseCents / 100,
            Net: r.netProfitCents / 100
        }));
    }, [reports]);

    return (
        <div className="bg-indigo-50 dark:bg-indigo-900/10 p-6 rounded-2xl border-2 border-indigo-100 dark:border-indigo-900/30 mb-6 shadow-xl shadow-indigo-500/5">
            <h4 className="text-xl font-black text-indigo-900 dark:text-indigo-100 uppercase tracking-tighter mb-6 flex items-center gap-2">
                <LayoutGrid className="h-6 w-6" /> Annual Fiscal Summary
            </h4>
            <div className="h-80 w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDarkMode ? "#334155" : "#e2e8f0"} />
                        <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} fontWeight="bold" tickLine={false} axisLine={false} />
                        <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                        <Tooltip content={<CustomTooltip isDarkMode={isDarkMode} />} cursor={{ fill: isDarkMode ? '#1e293b' : '#f8fafc', opacity: 0.4 }} />
                        <Bar dataKey="Income" fill="#10b981" radius={[6, 6, 0, 0]} barSize={32} />
                        <Bar dataKey="Expenses" fill="#f43f5e" radius={[6, 6, 0, 0]} barSize={32} />
                        <Bar dataKey="Net" fill="var(--primary)" radius={[6, 6, 0, 0]} barSize={32} />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

const Reports: React.FC<ReportsProps> = ({ transactions, isDarkMode = true }) => {
  const [activeTab, setActiveTab] = useState<'VISUAL' | 'ANNUAL'>('VISUAL');
  const [taxRate, setTaxRate] = useState(0);
  
  useEffect(() => {
      const settings = loadSettings();
      setTaxRate(settings.taxRatePercentage || 0);
  }, []);

  const pieChartData = useMemo(() => getExpenseCategoryData(transactions), [transactions]);
  const quarterlyReports = useMemo(() => getQuarterlyReports(transactions), [transactions]);

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-xl font-black text-slate-800 dark:text-slate-100 uppercase tracking-tight">Performance Intelligence</h2>
        <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg border border-slate-200 dark:border-slate-700">
            <button onClick={() => setActiveTab('VISUAL')} className={`px-4 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-md transition-all ${activeTab === 'VISUAL' ? 'bg-white dark:bg-slate-700 shadow-sm text-indigo-600' : 'text-slate-500'}`}>Quarterly</button>
            <button onClick={() => setActiveTab('ANNUAL')} className={`px-4 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-md transition-all ${activeTab === 'ANNUAL' ? 'bg-white dark:bg-slate-700 shadow-sm text-indigo-600' : 'text-slate-500'}`}>Fiscal Year</button>
        </div>
      </div>

      {activeTab === 'VISUAL' ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-6 rounded-2xl shadow-sm">
              <h3 className="text-slate-800 dark:text-slate-200 text-xs font-black uppercase tracking-widest mb-6">Expense Distribution</h3>
              <div className="h-64 w-full flex items-center justify-center">
                 {pieChartData.length > 0 ? (
                   <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={pieChartData} cx="50%" cy="50%" labelLine={false} outerRadius={80} fill="#8884d8" dataKey="value" stroke={isDarkMode ? "#1e293b" : "#ffffff"} strokeWidth={2}>
                        {pieChartData.map((entry, index) => ( <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} /> ))}
                      </Pie>
                      <Tooltip content={<CustomTooltip isDarkMode={isDarkMode} />} />
                      <Legend layout="vertical" verticalAlign="middle" align="right" wrapperStyle={{ fontSize: '10px' }} />
                    </PieChart>
                  </ResponsiveContainer>
                 ) : ( <div className="text-slate-400 text-xs font-bold uppercase tracking-widest">No Logged Expenses</div> )}
              </div>
            </div>

            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-6 rounded-2xl shadow-sm flex flex-col justify-center text-center">
                <div className="h-20 w-20 bg-indigo-50 dark:bg-indigo-900/20 rounded-full mx-auto mb-4 flex items-center justify-center border border-indigo-100 dark:border-indigo-800">
                    <TrendingUp className="h-10 w-10 text-indigo-600 dark:text-indigo-400" />
                </div>
                <h3 className="text-xl font-black text-slate-800 dark:text-slate-100 uppercase tracking-tight">Financial Accuracy</h3>
                <p className="text-xs text-slate-500 font-bold mt-2 px-8 uppercase leading-relaxed tracking-wider">Reports are dynamically generated using offline-first local datasets.</p>
            </div>
          </div>

          <div className="space-y-6">
              {quarterlyReports.length > 0 ? (
                  quarterlyReports.map((q) => (
                      <QuarterlyBarChart key={`${q.year}-Q${q.quarter}`} report={q} isDarkMode={!!isDarkMode} />
                  ))
              ) : ( <div className="py-24 text-center text-slate-400 text-xs font-black uppercase tracking-widest border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl">No Historical Performance Data Found</div> )}
          </div>
        </div>
      ) : (
        <div className="animate-fade-in space-y-6">
            <AnnualSummaryChart reports={quarterlyReports} isDarkMode={!!isDarkMode} />
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 shadow-sm">
                <h3 className="text-slate-800 dark:text-slate-200 font-black text-sm uppercase tracking-widest mb-6 flex items-center gap-2">
                    <CalendarRange className="h-5 w-5 text-indigo-500" /> Performance Ledger History
                </h3>
                <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 dark:bg-slate-900 text-[10px] uppercase font-black text-slate-500 tracking-widest">
                            <tr>
                                <th className="px-4 py-4">Period</th>
                                <th className="px-4 py-4">Full Date Range</th>
                                <th className="px-4 py-4 text-right">Income</th>
                                <th className="px-4 py-4 text-right">Expense</th>
                                <th className="px-4 py-4 text-right">Net Profit</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {quarterlyReports.map(q => (
                                <tr key={`${q.year}-${q.quarter}`} className="hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors group">
                                    <td className="px-4 py-4 font-black text-slate-800 dark:text-slate-100">{q.label} {q.year}</td>
                                    <td className="px-4 py-4">
                                        <span className="text-[10px] font-bold text-slate-400 bg-slate-100 dark:bg-slate-900 px-2 py-1 rounded-md border border-slate-200 dark:border-slate-700">{q.dateRange}</span>
                                    </td>
                                    <td className="px-4 py-4 text-right font-mono font-bold text-emerald-500">{formatCurrency(q.totalIncomeCents)}</td>
                                    <td className="px-4 py-4 text-right font-mono font-bold text-rose-500">({formatCurrency(q.totalExpenseCents)})</td>
                                    <td className={`px-4 py-4 text-right font-mono font-black ${q.netProfitCents >= 0 ? 'text-indigo-600 dark:text-indigo-400' : 'text-rose-600'}`}>{formatCurrency(q.netProfitCents)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};
export default Reports;
