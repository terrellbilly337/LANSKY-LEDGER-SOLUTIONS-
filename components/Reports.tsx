import React, { useMemo } from 'react';
import { Transaction } from '../types';
import { getChartData, getExpenseCategoryData, getQuarterlyReports, formatCurrency } from '../services/financeService';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';

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
  const lineChartData = useMemo(() => getChartData(transactions), [transactions]);
  const pieChartData = useMemo(() => getExpenseCategoryData(transactions), [transactions]);
  const quarterlyReports = useMemo(() => getQuarterlyReports(transactions), [transactions]);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-100">Financial Insights</h2>
        <span className="text-sm text-slate-500 dark:text-slate-400">{transactions.length} Records Analyzed</span>
      </div>

      <div className="grid grid-cols-1 landscape:grid-cols-2 lg:grid-cols-2 gap-6">
        {/* Pie Chart: Expenses by Category */}
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-6 rounded-lg shadow-sm flex flex-col transition-colors">
          <h3 className="text-slate-800 dark:text-slate-200 text-lg font-semibold mb-6">Expense Distribution</h3>
          <div className="h-80 landscape:h-64 w-full flex-grow">
             {pieChartData.length > 0 ? (
               <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieChartData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={100}
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
                    wrapperStyle={{ fontSize: '12px', color: isDarkMode ? '#94a3b8' : '#64748b' }} 
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
          <div className="h-80 landscape:h-64 w-full flex-grow">
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
      
      {/* Quarterly Reports Table */}
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-6 rounded-lg transition-colors">
        <h3 className="text-slate-800 dark:text-slate-200 text-lg font-semibold mb-4">Quarterly Performance</h3>
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
                      Q{q.quarter} {q.year}
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
    </div>
  );
};

export default Reports;