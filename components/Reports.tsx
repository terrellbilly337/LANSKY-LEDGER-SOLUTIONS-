
import React, { useMemo, useState, useEffect } from 'react';
import { Transaction, TransactionType, QuarterlyReport, MonthlyReport, InventoryItem } from '../types';
import { getChartData, getExpenseCategoryData, getQuarterlyReports, getMonthlyReports, formatCurrency } from '../services/financeService';
import { loadSettings, loadInventory, deleteMonthlyData } from '../services/storageService';
import { 
  PieChart, Pie, Cell, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { ChevronDown, ChevronUp, FileText, Download, Trash2, LayoutGrid, CalendarRange, TrendingUp, Package, AlertTriangle, FileSpreadsheet } from 'lucide-react';

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

interface QuarterlyBarChartProps {
  report: QuarterlyReport;
  isDarkMode: boolean;
  categories: string[];
}

const QuarterlyBarChart: React.FC<QuarterlyBarChartProps> = ({ report, isDarkMode, categories }) => {
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

interface AnnualSummaryChartProps {
  reports: QuarterlyReport[];
  isDarkMode: boolean;
}

const AnnualSummaryChart: React.FC<AnnualSummaryChartProps> = ({ reports, isDarkMode }) => {
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
  const [activeTab, setActiveTab] = useState<'MONTHLY' | 'QUARTERLY' | 'ANNUAL'>('MONTHLY');
  const [inventory, setInventory] = useState(loadInventory());
  const [settings, setSettings] = useState(loadSettings());
  
  useEffect(() => {
      setInventory(loadInventory());
      setSettings(loadSettings());
  }, [transactions]);

  const pieChartData = useMemo(() => getExpenseCategoryData(transactions), [transactions]);
  const quarterlyReports = useMemo(() => getQuarterlyReports(transactions), [transactions]);
  const monthlyReports = useMemo(() => getMonthlyReports(transactions, inventory), [transactions, inventory]);

  const handleExportMonthly = (report: MonthlyReport) => {
    const headers = ["Item Name", "Quantity", "Size", "Color", "Platform", "Landed Cost (Unit)", "Sold Price (Unit)", "Net ROI %", "Total Net Profit"];
    const rows = report.itemsSold.map(item => {
        const roi = ((item.soldPriceCents! - item.costPerUnitCents) / item.costPerUnitCents) * 100;
        const profit = (item.soldPriceCents! - item.costPerUnitCents) * item.quantity;
        return [
            `"${item.name}"`,
            item.quantity,
            `"${item.size || ''}"`,
            `"${item.color || ''}"`,
            `"${item.platform || ''}"`,
            (item.costPerUnitCents / 100).toFixed(2),
            (item.soldPriceCents! / 100).toFixed(2),
            roi.toFixed(1),
            (profit / 100).toFixed(2)
        ];
    });

    const csvContent = "data:text/csv;charset=utf-8," 
        + headers.join(",") + "\n" 
        + rows.map(e => e.join(",")).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `lansky_report_${report.label.replace(' ', '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleScrubMonth = (report: MonthlyReport) => {
      if (window.confirm(`CRITICAL WARNING: This will permanently delete ALL transactions and sold items for ${report.label}. This action cannot be undone. Scrub activity log?`)) {
          deleteMonthlyData(report.year, report.month);
          window.location.reload(); // Refresh to clear state
      }
  };

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-2">
        <h2 className="text-xl font-black text-slate-800 dark:text-slate-100 uppercase tracking-tight">Performance Intelligence</h2>
        <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg border border-slate-200 dark:border-slate-700 overflow-x-auto no-scrollbar">
            <button onClick={() => setActiveTab('MONTHLY')} className={`px-4 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-md transition-all whitespace-nowrap ${activeTab === 'MONTHLY' ? 'bg-white dark:bg-slate-700 shadow-sm text-indigo-600' : 'text-slate-500'}`}>Monthly Reports</button>
            <button onClick={() => setActiveTab('QUARTERLY')} className={`px-4 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-md transition-all whitespace-nowrap ${activeTab === 'QUARTERLY' ? 'bg-white dark:bg-slate-700 shadow-sm text-indigo-600' : 'text-slate-500'}`}>Quarterly</button>
            <button onClick={() => setActiveTab('ANNUAL')} className={`px-4 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-md transition-all whitespace-nowrap ${activeTab === 'ANNUAL' ? 'bg-white dark:bg-slate-700 shadow-sm text-indigo-600' : 'text-slate-500'}`}>Fiscal Year</button>
        </div>
      </div>

      {activeTab === 'MONTHLY' && (
          <div className="space-y-8 animate-fade-in">
              {monthlyReports.length > 0 ? monthlyReports.map((report) => (
                  <div key={report.label} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-sm overflow-hidden">
                      <div className="bg-slate-50 dark:bg-slate-900/50 p-6 border-b border-slate-100 dark:border-slate-800 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                          <div className="flex-1">
                            <h3 className="text-xl font-black text-slate-800 dark:text-slate-100 uppercase tracking-tight">{report.label} Sales Report</h3>
                            <div className="flex items-center gap-3 mt-2">
                                <button onClick={() => handleExportMonthly(report)} className="flex items-center gap-1.5 text-[10px] font-black uppercase text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 px-2 py-1 rounded border border-indigo-100 dark:border-indigo-800 hover:scale-105 transition-transform">
                                    <FileSpreadsheet className="h-3 w-3" /> Export CSV
                                </button>
                                <button onClick={() => handleScrubMonth(report)} className="flex items-center gap-1.5 text-[10px] font-black uppercase text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-900/30 px-2 py-1 rounded border border-rose-100 dark:border-rose-800 hover:scale-105 transition-transform">
                                    <Trash2 className="h-3 w-3" /> Scrub Month
                                </button>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full md:w-auto">
                              <div className="bg-white dark:bg-slate-800 p-3 rounded-xl border border-slate-100 dark:border-slate-700 text-center">
                                  <p className="text-[9px] font-bold text-slate-400 uppercase mb-1">Revenue</p>
                                  <p className="text-sm font-black text-emerald-500">{formatCurrency(report.totalRevenueCents)}</p>
                              </div>
                              <div className="bg-white dark:bg-slate-800 p-3 rounded-xl border border-slate-100 dark:border-slate-700 text-center">
                                  <p className="text-[9px] font-bold text-slate-400 uppercase mb-1">COGS</p>
                                  <p className="text-sm font-black text-rose-500">{formatCurrency(report.totalCogsCents)}</p>
                              </div>
                              <div className="bg-white dark:bg-slate-800 p-3 rounded-xl border border-slate-100 dark:border-slate-700 text-center">
                                  <p className="text-[9px] font-bold text-slate-400 uppercase mb-1">OpEx</p>
                                  <p className="text-sm font-black text-amber-500">{formatCurrency(report.totalExpensesCents)}</p>
                              </div>
                              <div className="bg-white dark:bg-slate-800 p-3 rounded-xl border border-slate-100 dark:border-slate-700 text-center">
                                  <p className="text-[9px] font-bold text-slate-400 uppercase mb-1">Net Profit</p>
                                  <p className={`text-sm font-black ${report.netProfitCents >= 0 ? 'text-indigo-500' : 'text-rose-500'}`}>{formatCurrency(report.netProfitCents)}</p>
                              </div>
                          </div>
                      </div>
                      
                      <div className="overflow-x-auto custom-scrollbar">
                          <table className="w-full text-left text-sm">
                              <thead className="bg-slate-50 dark:bg-slate-900 text-[9px] uppercase font-black text-slate-500 tracking-widest">
                                  <tr>
                                      <th className="px-6 py-4">Item (Itemized)</th>
                                      <th className="px-6 py-4">Platform</th>
                                      <th className="px-6 py-4 text-right">Landed Cost</th>
                                      <th className="px-6 py-4 text-right">Sold At</th>
                                      <th className="px-6 py-4 text-right">Net ROI</th>
                                      <th className="px-6 py-4 text-right">Profit</th>
                                  </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                  {report.itemsSold.map((item) => {
                                      const roi = ((item.soldPriceCents! - item.costPerUnitCents) / item.costPerUnitCents) * 100;
                                      const profit = (item.soldPriceCents! - item.costPerUnitCents) * item.quantity;
                                      return (
                                          <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/30 transition-colors">
                                              <td className="px-6 py-4">
                                                  <div className="flex items-center gap-3">
                                                      <div className="h-10 w-10 rounded bg-slate-100 dark:bg-slate-700 overflow-hidden flex-shrink-0 border border-slate-200 dark:border-slate-600 shadow-inner">
                                                          {item.imageData ? <img src={item.imageData} alt="" className="h-full w-full object-cover" /> : <Package className="h-4 w-4 text-slate-400 m-auto mt-3 opacity-20" />}
                                                      </div>
                                                      <div className="min-w-0">
                                                          <p className="font-black text-slate-800 dark:text-slate-100 text-[11px] truncate uppercase tracking-tight">{item.name}</p>
                                                          <p className="text-[9px] text-slate-400 font-bold uppercase">{item.quantity} Unit{item.quantity !== 1 ? 's' : ''} • {item.size || 'N/A'} • {item.color || 'N/A'}</p>
                                                      </div>
                                                  </div>
                                              </td>
                                              <td className="px-6 py-4">
                                                  <span className="text-[9px] font-black text-indigo-500 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 px-2 py-0.5 rounded border border-indigo-100 dark:border-indigo-800 uppercase tracking-widest">{item.platform}</span>
                                              </td>
                                              <td className="px-6 py-4 text-right font-mono text-xs text-slate-500 font-bold">{formatCurrency(item.costPerUnitCents)}</td>
                                              <td className="px-6 py-4 text-right font-mono text-xs text-emerald-600 font-black">{formatCurrency(item.soldPriceCents!)}</td>
                                              <td className="px-6 py-4 text-right">
                                                  <span className={`text-[10px] font-black px-2 py-0.5 rounded ${roi >= 50 ? 'bg-emerald-500 text-white' : roi >= 20 ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                                                      {roi.toFixed(0)}%
                                                  </span>
                                              </td>
                                              <td className={`px-6 py-4 text-right font-mono font-black text-xs ${profit >= 0 ? 'text-indigo-600 dark:text-indigo-400' : 'text-rose-500'}`}>
                                                  {formatCurrency(profit)}
                                              </td>
                                          </tr>
                                      );
                                  })}
                              </tbody>
                          </table>
                      </div>
                      
                      {report.itemsSold.length === 0 && (
                          <div className="p-12 text-center flex flex-col items-center gap-2">
                             <AlertTriangle className="h-6 w-6 text-slate-300" />
                             <p className="text-slate-400 text-xs font-bold uppercase tracking-widest leading-relaxed max-w-xs">No individual unit sales detected. Monthly totals reflect general transactions.</p>
                          </div>
                      )}
                  </div>
              )) : (
                  <div className="py-24 text-center text-slate-400 text-xs font-black uppercase tracking-widest border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl">No Historical Sales Performance Data Found</div>
              )}
          </div>
      )}

      {activeTab === 'QUARTERLY' && (
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
                <h3 className="text-xl font-black text-slate-800 dark:text-slate-100 uppercase tracking-tight">Financial Fidelity</h3>
                <p className="text-xs text-slate-500 font-bold mt-2 px-8 uppercase leading-relaxed tracking-wider">Atomic transaction logs ensure your ledger remains tax-compliant and mathematically sound.</p>
            </div>
          </div>

          <div className="space-y-6">
              {quarterlyReports.length > 0 ? (
                  quarterlyReports.map((q) => (
                      <QuarterlyBarChart key={`${q.year}-Q${q.quarter}`} report={q} isDarkMode={!!isDarkMode} categories={settings.categories} />
                  ))
              ) : ( <div className="py-24 text-center text-slate-400 text-xs font-black uppercase tracking-widest border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl">No Quarterly Performance Data</div> )}
          </div>
        </div>
      )}

      {activeTab === 'ANNUAL' && (
        <div className="animate-fade-in space-y-6">
            <AnnualSummaryChart reports={quarterlyReports} isDarkMode={!!isDarkMode} />
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 shadow-sm">
                <h3 className="text-slate-800 dark:text-slate-200 font-black text-sm uppercase tracking-widest mb-6 flex items-center gap-2">
                    <CalendarRange className="h-5 w-5 text-indigo-500" /> Fiscal Period History
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
