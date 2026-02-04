
import React, { useMemo, useState, useEffect } from 'react';
import { Transaction, TransactionType } from '../types';
import { getChartData, getExpenseCategoryData, getQuarterlyReports, formatCurrency } from '../services/financeService';
import { loadSettings, loadInventory } from '../services/storageService';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, BarChart, Bar
} from 'recharts';
import { ChevronDown, ChevronUp, FileText, Download, Printer } from 'lucide-react';

interface ReportsProps {
  transactions: Transaction[];
  isDarkMode?: boolean;
}

const COLORS = ['#10b981', '#3b82f6', '#8b5cf6', '#f43f5e', '#f59e0b', '#6366f1', '#ec4899', '#14b8a6', '#64748b'];

const CustomTooltip = ({ active, payload, label, isDarkMode }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className={`${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'} border p-3 rounded shadow-xl`}>
        <p className={`${isDarkMode ? 'text-slate-300' : 'text-slate-600'} text-xs mb-1`}>{label}</p>
        <p className="text-[var(--primary)] font-mono font-bold">
          {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(payload[0].value)}
        </p>
      </div>
    );
  }
  return null;
};

const Reports: React.FC<ReportsProps> = ({ transactions, isDarkMode = true }) => {
  const [isQuarterlyOpen, setIsQuarterlyOpen] = useState(true);
  const [isTaxOpen, setIsTaxOpen] = useState(false);
  const [taxRate, setTaxRate] = useState(0);
  
  useEffect(() => {
      const settings = loadSettings();
      setTaxRate(settings.taxRatePercentage || 0);
  }, []);

  const lineChartData = useMemo(() => getChartData(transactions), [transactions]);
  const pieChartData = useMemo(() => getExpenseCategoryData(transactions), [transactions]);
  const quarterlyReports = useMemo(() => getQuarterlyReports(transactions), [transactions]);

  // Tax Summary Calculation (Schedule C Style)
  const taxSummary = useMemo(() => {
      const inventory = loadInventory();
      
      // 1. Gross Revenue (Line 1)
      const grossReceipts = transactions
        .filter(t => t.type === TransactionType.CREDIT)
        .reduce((sum, t) => sum + t.amountCents, 0);

      // 2. Returns/Refunds (Line 2 - implied in our Net calc, but technically separate. 
      // Our system marks Refunds as Type REFUND. 
      const returns = transactions
        .filter(t => t.type === TransactionType.REFUND)
        .reduce((sum, t) => sum + t.amountCents, 0);
      
      // 3. COGS (Line 4)
      // We calculate COGS based on items marked 'SOLD'. 
      // This is simpler for cash-basis resellers than calculating Beginning + Purchase - Ending.
      const cogs = inventory
        .filter(i => i.status === 'SOLD')
        .reduce((sum, i) => sum + (i.costPerUnitCents * i.quantity), 0);

      // 4. Gross Profit (Line 5)
      const grossProfit = grossReceipts - returns - cogs;

      // 5. Expenses (Part II)
      const expenses = transactions
        .filter(t => t.type === TransactionType.DEBIT)
        .reduce((sum, t) => sum + t.amountCents, 0);
      
      // Specific Shipping bucket (Pirate Ship etc)
      const shippingExpenses = transactions
        .filter(t => t.type === TransactionType.DEBIT && (t.category === 'Shipping' || t.description.toLowerCase().includes('pirate')))
        .reduce((sum, t) => sum + t.amountCents, 0);

      const otherExpenses = expenses - shippingExpenses;

      // 6. Net Profit (Line 31)
      const netProfit = grossProfit - expenses;

      // 7. Estimated Tax
      const estimatedTax = netProfit > 0 ? Math.round(netProfit * (taxRate / 100)) : 0;

      return {
          grossReceipts,
          returns,
          cogs,
          grossProfit,
          shippingExpenses,
          otherExpenses,
          totalExpenses: expenses,
          netProfit,
          estimatedTax
      };
  }, [transactions, taxRate]);

  // Transform quarterly data for Bar Chart
  const quarterlyChartData = useMemo(() => {
      return [...quarterlyReports].reverse().map(q => ({
          name: q.label,
          profit: q.netProfitCents / 100,
          income: q.totalIncomeCents / 100
      }));
  }, [quarterlyReports]);

  // Export CSV Function
  const handleExportCSV = () => {
      const headers = ["Category", "Amount"];
      const rows = [
          ["Gross Receipts (Sales)", (taxSummary.grossReceipts / 100).toFixed(2)],
          ["Returns & Allowances", (taxSummary.returns / 100).toFixed(2)],
          ["Cost of Goods Sold (COGS)", (taxSummary.cogs / 100).toFixed(2)],
          ["Gross Profit", (taxSummary.grossProfit / 100).toFixed(2)],
          ["Shipping Expenses", (taxSummary.shippingExpenses / 100).toFixed(2)],
          ["Other Expenses", (taxSummary.otherExpenses / 100).toFixed(2)],
          ["Net Profit", (taxSummary.netProfit / 100).toFixed(2)],
          [`Estimated Tax (${taxRate}%)`, (taxSummary.estimatedTax / 100).toFixed(2)]
      ];

      const csvContent = "data:text/csv;charset=utf-8," 
          + headers.join(",") + "\n" 
          + rows.map(e => e.join(",")).join("\n");

      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `lansky_schedule_c_summary_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
  };

  const handlePrint = () => {
      window.print();
  };

  return (
    <div className="space-y-6 animate-fade-in print:p-0 print:m-0 print:w-full">
      {/* Print-only Header */}
      <div className="hidden print:block mb-8 text-center">
          <h1 className="text-2xl font-bold text-black">Lansky Ledger - Tax Summary</h1>
          <p className="text-sm text-gray-500">Generated: {new Date().toLocaleDateString()}</p>
      </div>

      <div className="flex items-center justify-between mb-2 print:hidden">
        <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-100">Financial Insights</h2>
        <span className="text-sm text-slate-500 dark:text-slate-400">{transactions.length} Records Analyzed</span>
      </div>

      {/* Tax Report Card */}
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg transition-colors overflow-hidden print:border-none print:shadow-none print:dark:bg-white print:dark:text-black">
        <button 
             onClick={() => setIsTaxOpen(!isTaxOpen)}
             className="w-full flex items-center justify-between p-6 text-left hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors print:hidden"
        >
            <div className="flex items-center gap-2 text-slate-800 dark:text-slate-200 text-lg font-semibold">
                <FileText className="h-5 w-5 text-indigo-500" />
                Sole Proprietorship Tax Summary (Schedule C)
            </div>
            {isTaxOpen ? <ChevronUp className="h-5 w-5 text-slate-400" /> : <ChevronDown className="h-5 w-5 text-slate-400" />}
        </button>
        
        {/* Always visible in print, conditional on screen */}
        <div className={`${isTaxOpen ? 'block' : 'hidden'} print:block p-6 pt-0 border-t border-slate-200 dark:border-slate-700/50 print:border-none`}>
            <div className="flex justify-end gap-3 my-4 print:hidden">
                <button onClick={handlePrint} className="flex items-center gap-2 text-xs font-medium bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 px-3 py-2 rounded text-slate-700 dark:text-slate-200 transition-colors">
                    <Printer className="h-4 w-4" /> Print PDF
                </button>
                <button onClick={handleExportCSV} className="flex items-center gap-2 text-xs font-medium bg-indigo-50 dark:bg-indigo-900/30 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 px-3 py-2 rounded text-indigo-700 dark:text-indigo-300 transition-colors">
                    <Download className="h-4 w-4" /> Export CSV
                </button>
            </div>

            <div className="space-y-1">
                <h4 className="text-sm font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 dark:border-slate-700 pb-1 mb-2 print:text-gray-500">Part I: Income</h4>
                <div className="flex justify-between py-1 text-sm">
                    <span className="text-slate-600 dark:text-slate-300 print:text-black">Gross Receipts or Sales</span>
                    <span className="font-mono text-slate-900 dark:text-white print:text-black">{formatCurrency(taxSummary.grossReceipts)}</span>
                </div>
                <div className="flex justify-between py-1 text-sm">
                    <span className="text-slate-600 dark:text-slate-300 print:text-black">Returns and Allowances</span>
                    <span className="font-mono text-rose-500">({formatCurrency(taxSummary.returns)})</span>
                </div>
                <div className="flex justify-between py-1 text-sm">
                    <span className="text-slate-600 dark:text-slate-300 print:text-black">Cost of Goods Sold (COGS)</span>
                    <span className="font-mono text-rose-500">({formatCurrency(taxSummary.cogs)})</span>
                </div>
                <div className="flex justify-between py-2 text-base font-bold border-t border-slate-100 dark:border-slate-700 mt-1">
                    <span className="text-slate-800 dark:text-slate-200 print:text-black">Gross Profit</span>
                    <span className="font-mono text-slate-900 dark:text-white print:text-black">{formatCurrency(taxSummary.grossProfit)}</span>
                </div>
            </div>

            <div className="space-y-1 mt-6">
                <h4 className="text-sm font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 dark:border-slate-700 pb-1 mb-2 print:text-gray-500">Part II: Expenses</h4>
                <div className="flex justify-between py-1 text-sm">
                    <span className="text-slate-600 dark:text-slate-300 print:text-black">Shipping Expenses (Pirate Ship)</span>
                    <span className="font-mono text-rose-500">({formatCurrency(taxSummary.shippingExpenses)})</span>
                </div>
                <div className="flex justify-between py-1 text-sm">
                    <span className="text-slate-600 dark:text-slate-300 print:text-black">Other Expenses</span>
                    <span className="font-mono text-rose-500">({formatCurrency(taxSummary.otherExpenses)})</span>
                </div>
                <div className="flex justify-between py-2 text-base font-bold border-t border-slate-100 dark:border-slate-700 mt-1">
                    <span className="text-slate-800 dark:text-slate-200 print:text-black">Total Expenses</span>
                    <span className="font-mono text-rose-500">({formatCurrency(taxSummary.totalExpenses)})</span>
                </div>
            </div>

            <div className="mt-6 bg-slate-50 dark:bg-slate-900/50 p-4 rounded-lg border border-slate-200 dark:border-slate-700 print:bg-gray-100 print:border-gray-300">
                <div className="flex justify-between items-center mb-1">
                    <span className="text-sm font-bold text-slate-700 dark:text-slate-300 print:text-black">Net Profit (Loss)</span>
                    <span className={`text-lg font-mono font-bold ${taxSummary.netProfit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600'} print:text-black`}>
                        {formatCurrency(taxSummary.netProfit)}
                    </span>
                </div>
                <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-500 dark:text-slate-400 print:text-gray-600">Estimated Tax Withheld ({taxRate}%)</span>
                    <span className="font-mono text-slate-500 dark:text-slate-400 print:text-gray-600">{formatCurrency(taxSummary.estimatedTax)}</span>
                </div>
            </div>
        </div>
      </div>

      <div className="grid grid-cols-1 landscape:grid-cols-2 lg:grid-cols-2 gap-6 print:hidden">
        {/* Pie Chart: Expenses by Category */}
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-6 rounded-lg shadow-sm flex flex-col transition-colors">
          <h3 className="text-slate-800 dark:text-slate-200 text-lg font-semibold mb-6">Expense Distribution</h3>
          <div className="h-64 md:h-80 w-full flex-grow flex items-center justify-center">
             {pieChartData.length > 0 ? (
               <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieChartData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={80} 
                    fill="#8884d8"
                    dataKey="value"
                    stroke={isDarkMode ? "#1e293b" : "#ffffff"}
                    strokeWidth={2}
                  >
                    {pieChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip isDarkMode={isDarkMode} />} />
                  <Legend 
                    layout="vertical" 
                    verticalAlign="middle" 
                    align="right"
                    wrapperStyle={{ fontSize: '10px', color: isDarkMode ? '#94a3b8' : '#64748b' }} 
                  />
                </PieChart>
              </ResponsiveContainer>
             ) : (
               <div className="flex items-center justify-center h-full text-slate-400 dark:text-slate-500">
                 No expense data available.
               </div>
             )}
          </div>
        </div>

        {/* Line Chart: Balance Over Time */}
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-6 rounded-lg shadow-sm flex flex-col transition-colors">
          <h3 className="text-slate-800 dark:text-slate-200 text-lg font-semibold mb-6">Net Asset History</h3>
          <div className="h-64 md:h-80 w-full flex-grow">
            {lineChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={lineChartData}>
                  <defs>
                    <linearGradient id="colorBalanceReport" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="var(--primary)" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={isDarkMode ? "#334155" : "#e2e8f0"} vertical={false} />
                  <XAxis 
                    dataKey="date" 
                    stroke={isDarkMode ? "#94a3b8" : "#64748b"}
                    tick={{fontSize: 10}} 
                    tickLine={false}
                    axisLine={false}
                    minTickGap={30}
                  />
                  <YAxis 
                    stroke={isDarkMode ? "#94a3b8" : "#64748b"}
                    tick={{fontSize: 10}} 
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => `$${value}`}
                  />
                  <Tooltip content={<CustomTooltip isDarkMode={isDarkMode} />} />
                  <Area 
                    type="monotone" 
                    dataKey="balance" 
                    stroke="var(--primary)" 
                    strokeWidth={2}
                    fillOpacity={1} 
                    fill="url(#colorBalanceReport)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-slate-400 dark:text-slate-500">
                No transaction history available.
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Quarterly Reports Section */}
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg transition-colors overflow-hidden print:hidden">
        <button 
             onClick={() => setIsQuarterlyOpen(!isQuarterlyOpen)}
             className="w-full flex items-center justify-between p-6 text-left hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
        >
            <h3 className="text-slate-800 dark:text-slate-200 text-lg font-semibold">Quarterly Performance</h3>
            {isQuarterlyOpen ? <ChevronUp className="h-5 w-5 text-slate-400" /> : <ChevronDown className="h-5 w-5 text-slate-400" />}
        </button>
        
        {isQuarterlyOpen && (
            <div className="p-6 pt-0 border-t border-slate-200 dark:border-slate-700/50">
                {/* Bar Chart Visualization */}
                <div className="h-64 w-full mb-6 mt-4">
                    {quarterlyChartData.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={quarterlyChartData}>
                                <CartesianGrid strokeDasharray="3 3" stroke={isDarkMode ? "#334155" : "#e2e8f0"} vertical={false} />
                                <XAxis dataKey="name" stroke={isDarkMode ? "#94a3b8" : "#64748b"} tick={{fontSize: 12}} axisLine={false} tickLine={false} />
                                <Tooltip 
                                    cursor={{fill: 'transparent'}}
                                    contentStyle={{ 
                                        backgroundColor: isDarkMode ? '#1e293b' : '#ffffff', 
                                        borderColor: isDarkMode ? '#334155' : '#e2e8f0', 
                                        borderRadius: '8px'
                                    }}
                                    itemStyle={{ color: 'var(--primary)' }}
                                />
                                <Bar dataKey="profit" fill="var(--primary)" radius={[4, 4, 0, 0]} name="Net Profit" />
                            </BarChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="h-full flex items-center justify-center text-slate-400 text-sm">Not enough data for visualization</div>
                    )}
                </div>

                <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-500 dark:text-slate-400">
                    <thead className="bg-slate-100 dark:bg-slate-900 text-xs uppercase text-slate-500 dark:text-slate-500">
                    <tr>
                        <th className="px-4 py-3 whitespace-nowrap">Period</th>
                        <th className="px-4 py-3 text-right text-emerald-600 dark:text-emerald-500 whitespace-nowrap">Income</th>
                        <th className="px-4 py-3 text-right text-rose-600 dark:text-rose-500 whitespace-nowrap">Expenses</th>
                        <th className="px-4 py-3 text-right text-indigo-500 dark:text-indigo-400 whitespace-nowrap">Net Profit</th>
                    </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                    {quarterlyReports.length > 0 ? (
                        quarterlyReports.map((q) => (
                        <tr key={`${q.year}-Q${q.quarter}`} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                            <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-200 whitespace-nowrap">
                            {q.label}
                            </td>
                            <td className="px-4 py-3 text-right font-mono text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                            {formatCurrency(q.totalIncomeCents)}
                            </td>
                            <td className="px-4 py-3 text-right font-mono text-rose-600 dark:text-rose-400 whitespace-nowrap">
                            {formatCurrency(q.totalExpenseCents)}
                            </td>
                            <td className={`px-4 py-3 text-right font-mono font-bold whitespace-nowrap ${q.netProfitCents >= 0 ? 'text-[var(--primary)]' : 'text-rose-600 dark:text-rose-400'}`}>
                            {formatCurrency(q.netProfitCents)}
                            </td>
                        </tr>
                        ))
                    ) : (
                        <tr><td colSpan={4} className="px-4 py-8 text-center text-slate-500">No quarterly data available.</td></tr>
                    )}
                    </tbody>
                </table>
                </div>
            </div>
        )}
      </div>
    </div>
  );
};

export default Reports;
