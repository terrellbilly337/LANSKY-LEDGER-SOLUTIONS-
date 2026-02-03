import React, { useState, useMemo, useEffect } from 'react';
import { Transaction, TransactionType } from '../types';
import { formatCurrency } from '../services/financeService';
import { loadSettings } from '../services/storageService';
import { Search, Trash2, ArrowUpRight, ArrowDownLeft, Filter, ChevronDown, ChevronUp, Tag, Globe, Calendar } from 'lucide-react';

interface TransactionListProps {
  transactions: Transaction[];
  onDelete: (id: string) => void;
}

interface MobileTransactionItemProps {
    t: Transaction;
    onDelete: (id: string) => void;
}

const MobileTransactionItem: React.FC<MobileTransactionItemProps> = ({ t, onDelete }) => {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden transition-all">
            <div 
                className="p-3 flex items-center justify-between cursor-pointer active:bg-slate-50 dark:active:bg-slate-700/50"
                onClick={() => setIsOpen(!isOpen)}
            >
                <div className="flex items-center gap-3 overflow-hidden">
                    <div className={`h-10 w-10 rounded-full flex items-center justify-center flex-shrink-0 ${t.type === TransactionType.CREDIT ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600' : t.type === TransactionType.REFUND ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-600' : 'bg-rose-50 dark:bg-rose-900/20 text-rose-600'}`}>
                         {t.type === TransactionType.CREDIT ? <ArrowUpRight className="h-5 w-5" /> : <ArrowDownLeft className="h-5 w-5" />}
                    </div>
                    <div className="min-w-0">
                        <p className="text-slate-900 dark:text-slate-100 font-semibold text-sm truncate">{t.description}</p>
                        <p className="text-slate-500 text-xs flex items-center gap-1">
                            {new Date(t.date).toLocaleDateString()}
                        </p>
                    </div>
                </div>
                <div className="flex flex-col items-end pl-2">
                    <p className={`font-mono font-bold text-sm ${t.type === TransactionType.CREDIT ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-900 dark:text-slate-100'}`}>
                        {t.type === TransactionType.CREDIT ? '+' : ''}{formatCurrency(t.amountCents)}
                    </p>
                    <div className="text-slate-300 dark:text-slate-600 mt-1">
                        {isOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </div>
                </div>
            </div>

            {isOpen && (
                <div className="px-3 pb-3 pt-0 animate-fade-in border-t border-slate-100 dark:border-slate-700/50">
                    <div className="grid grid-cols-2 gap-2 mt-3 mb-3 text-xs text-slate-500 dark:text-slate-400">
                        <div className="flex items-center gap-2">
                            <Tag className="h-3 w-3" />
                            <span>{t.category}</span>
                        </div>
                        {t.platform && (
                            <div className="flex items-center gap-2">
                                <Globe className="h-3 w-3" />
                                <span>{t.platform}</span>
                            </div>
                        )}
                        <div className="flex items-center gap-2 col-span-2">
                            <Calendar className="h-3 w-3" />
                            <span>{new Date(t.date).toLocaleString()}</span>
                        </div>
                    </div>
                    <button 
                        onClick={(e) => { e.stopPropagation(); onDelete(t.id); }}
                        className="w-full bg-rose-50 hover:bg-rose-100 dark:bg-rose-900/20 dark:hover:bg-rose-900/40 text-rose-600 dark:text-rose-400 text-xs py-2 rounded-lg flex items-center justify-center gap-2 transition-colors border border-rose-200 dark:border-rose-900/50"
                    >
                        <Trash2 className="h-3 w-3" />
                        Delete Entry
                    </button>
                </div>
            )}
        </div>
    );
};

const TransactionList: React.FC<TransactionListProps> = ({ transactions, onDelete }) => {
  const [filter, setFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [platformFilter, setPlatformFilter] = useState<string>('ALL');
  const [availablePlatforms, setAvailablePlatforms] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    const settings = loadSettings();
    setAvailablePlatforms(settings.platforms);
  }, []);

  const filteredData = useMemo(() => {
    return transactions.filter(t => {
      const matchesSearch = t.description.toLowerCase().includes(filter.toLowerCase()) || 
                            t.category.toLowerCase().includes(filter.toLowerCase());
      const matchesType = typeFilter === 'ALL' || t.type === typeFilter;
      const matchesPlatform = platformFilter === 'ALL' || t.platform === platformFilter;
      
      return matchesSearch && matchesType && matchesPlatform;
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()); // Newest first
  }, [transactions, filter, typeFilter, platformFilter]);

  return (
    <div className="space-y-4">
      {/* Header & Controls */}
      <div className="flex flex-col gap-3">
        <h2 className="text-xl font-bold text-slate-800 dark:text-white px-1">Activity</h2>
        
        <div className="bg-white dark:bg-slate-800 p-2 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col md:flex-row gap-2">
            <div className="relative flex-grow">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input 
                type="text" 
                placeholder="Search activity..." 
                className="w-full bg-transparent text-slate-900 dark:text-slate-100 px-3 py-2 pl-9 text-sm focus:outline-none placeholder:text-slate-400"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                />
            </div>
            <button 
                onClick={() => setShowFilters(!showFilters)}
                className={`md:hidden p-2 rounded-lg flex items-center justify-center transition-colors ${showFilters ? 'bg-slate-100 dark:bg-slate-700 text-[var(--primary)]' : 'text-slate-400'}`}
            >
                <Filter className="h-5 w-5" />
            </button>

            {/* Desktop Filters */}
            <div className="hidden md:flex gap-2">
                 <select 
                    className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-[var(--primary)]"
                    value={platformFilter}
                    onChange={(e) => setPlatformFilter(e.target.value)}
                >
                    <option value="ALL">All Platforms</option>
                    {availablePlatforms.map(p => (
                    <option key={p} value={p}>{p}</option>
                    ))}
                </select>

                <select 
                    className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-[var(--primary)]"
                    value={typeFilter}
                    onChange={(e) => setTypeFilter(e.target.value)}
                >
                    <option value="ALL">All Types</option>
                    <option value={TransactionType.CREDIT}>Income</option>
                    <option value={TransactionType.DEBIT}>Expense</option>
                </select>
            </div>
        </div>

        {/* Mobile Filters Collapsible */}
        {showFilters && (
            <div className="md:hidden grid grid-cols-2 gap-2 animate-fade-in">
                <select 
                    className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg px-3 py-3 text-sm focus:outline-none"
                    value={platformFilter}
                    onChange={(e) => setPlatformFilter(e.target.value)}
                >
                    <option value="ALL">All Platforms</option>
                    {availablePlatforms.map(p => (
                    <option key={p} value={p}>{p}</option>
                    ))}
                </select>
                <select 
                    className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg px-3 py-3 text-sm focus:outline-none"
                    value={typeFilter}
                    onChange={(e) => setTypeFilter(e.target.value)}
                >
                    <option value="ALL">All Types</option>
                    <option value={TransactionType.CREDIT}>Income</option>
                    <option value={TransactionType.DEBIT}>Expense</option>
                </select>
            </div>
        )}
      </div>

      {/* Mobile List View (Cards) */}
      <div className="md:hidden space-y-2">
        {filteredData.length > 0 ? (
          filteredData.map((t) => (
            <MobileTransactionItem key={t.id} t={t} onDelete={onDelete} />
          ))
        ) : (
            <div className="text-center py-10 text-slate-400">No activity found.</div>
        )}
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm overflow-hidden">
        <table className="w-full text-left text-sm text-slate-500 dark:text-slate-400">
          <thead className="bg-slate-50 dark:bg-slate-800/50 text-xs uppercase text-slate-500 dark:text-slate-500">
            <tr>
              <th className="px-6 py-4 font-semibold">Date</th>
              <th className="px-6 py-4 font-semibold">Item</th>
              <th className="px-6 py-4 font-semibold">Platform</th>
              <th className="px-6 py-4 font-semibold">Category</th>
              <th className="px-6 py-4 font-semibold text-right">Amount</th>
              <th className="px-6 py-4 font-semibold text-center">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {filteredData.length > 0 ? (
              filteredData.map((t) => (
                <tr key={t.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap font-mono text-slate-600 dark:text-slate-400">{new Date(t.date).toLocaleDateString()}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className={`p-1.5 rounded-full ${t.type === TransactionType.CREDIT ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600' : t.type === TransactionType.REFUND ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-600' : 'bg-rose-100 dark:bg-rose-900/30 text-rose-500'}`}>
                         {t.type === TransactionType.CREDIT ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownLeft className="h-3 w-3" />}
                      </div>
                      <span className="font-medium text-slate-800 dark:text-slate-200">{t.description}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {t.platform ? (
                      <span className="px-2 py-1 rounded-md bg-slate-100 dark:bg-slate-800 text-xs font-medium text-indigo-600 dark:text-indigo-400">
                        {t.platform}
                      </span>
                    ) : (
                      <span className="text-slate-400 dark:text-slate-600 text-xs">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-1 rounded-md bg-slate-100 dark:bg-slate-800 text-xs text-slate-600 dark:text-slate-400">
                      {t.category}
                    </span>
                  </td>
                  <td className={`px-6 py-4 text-right font-mono font-bold ${t.type === TransactionType.CREDIT ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-900 dark:text-slate-100'}`}>
                    {t.type === TransactionType.CREDIT ? '+' : ''}{formatCurrency(t.amountCents)}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <button 
                      onClick={() => onDelete(t.id)}
                      className="text-slate-400 hover:text-rose-500 dark:text-slate-500 dark:hover:text-rose-400 transition-colors"
                      title="Delete Entry"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                  No records found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default TransactionList;