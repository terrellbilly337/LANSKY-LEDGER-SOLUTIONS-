
import React, { useState, useMemo, useEffect } from 'react';
import { InventoryItem } from '../types';
import { formatCurrency } from '../services/financeService';
import { loadInventory, deleteInventoryItem, loadSettings, processRefund } from '../services/storageService';
import { hasPin } from '../services/authService';
import { Search, Trash2, Package, Filter, AlertCircle, LayoutList, ArrowUp, ArrowDown, CheckCircle2, RotateCcw, ChevronDown, ChevronUp, Calendar, Tag, Globe } from 'lucide-react';
import { formatAppDisplayDate } from '../services/timeService';
import PinModal from './PinModal';

interface MobileInventoryItemProps { 
    item: InventoryItem; 
    agingThreshold: number; 
    view: string; 
    onDelete: (item: InventoryItem) => void; 
    onRefund: (item: InventoryItem) => void;
}

const MobileInventoryItem: React.FC<MobileInventoryItemProps> = ({ 
    item, 
    agingThreshold, 
    view, 
    onDelete, 
    onRefund 
}) => {
    const [isOpen, setIsOpen] = useState(false);
    
    const getDaysHeld = (dateAcquired: string): number => {
        const start = new Date(dateAcquired).getTime();
        const now = new Date().getTime();
        return Math.floor((now - start) / (1000 * 60 * 60 * 24));
    };

    const daysHeld = getDaysHeld(item.dateAcquired);
    const isAging = item.status === 'IN_STOCK' && daysHeld > agingThreshold;
    const profit = (item.soldPriceCents || 0) - item.costPerUnitCents;

    return (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden transition-all">
            {/* Header / Always Visible */}
            <div 
                className="p-3 flex items-center gap-3 cursor-pointer active:bg-slate-50 dark:active:bg-slate-700/50"
                onClick={() => setIsOpen(!isOpen)}
            >
                <div className="h-10 w-10 rounded-lg flex items-center justify-center flex-shrink-0 bg-slate-100 dark:bg-slate-700 overflow-hidden border border-slate-200 dark:border-slate-600">
                    {item.imageData ? (
                        <img src={item.imageData} alt="" className="h-full w-full object-cover" />
                    ) : (
                        <Package className="h-5 w-5 text-slate-400" />
                    )}
                </div>
                <div className="flex-grow min-w-0">
                    <div className="flex justify-between items-start">
                        <h3 className="text-slate-900 dark:text-slate-100 font-bold text-sm truncate pr-2">{item.name}</h3>
                        <p className="font-mono font-bold text-sm text-slate-800 dark:text-slate-200">
                            {view === 'SOLD' ? formatCurrency(item.soldPriceCents || 0) : formatCurrency(item.costPerUnitCents)}
                        </p>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-slate-500">Qty: {item.quantity}</span>
                        <span className="text-slate-300 dark:text-slate-600 text-[10px]">•</span>
                        {item.status === 'IN_STOCK' ? (
                             <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wide">In Stock</span>
                        ) : (
                             <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Sold</span>
                        )}
                        {isAging && (
                            <span className="flex items-center gap-0.5 text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-1.5 py-0.5 rounded-full ml-1">
                                <AlertCircle className="h-3 w-3" />
                                {daysHeld}d
                            </span>
                        )}
                    </div>
                </div>
                <div className="text-slate-400">
                    {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </div>
            </div>

            {/* Collapsible Content */}
            {isOpen && (
                <div className="px-3 pb-3 pt-0 animate-fade-in border-t border-slate-100 dark:border-slate-700/50 mt-1">
                    <div className="grid grid-cols-2 gap-2 mt-3 mb-3 text-xs text-slate-500 dark:text-slate-400">
                        <div className="flex items-center gap-2">
                            <Tag className="h-3 w-3" />
                            <span>{item.category}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Globe className="h-3 w-3" />
                            <span>{item.platform || 'N/A'}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Calendar className="h-3 w-3" />
                            <span>Acq: {formatAppDisplayDate(item.dateAcquired)}</span>
                        </div>
                        {item.status === 'SOLD' && (
                            <div className="flex items-center gap-2">
                                <Calendar className="h-3 w-3" />
                                <span>Sold: {item.soldDate ? formatAppDisplayDate(item.soldDate) : '-'}</span>
                            </div>
                        )}
                    </div>

                    {/* Cost Breakdown for Sold items */}
                    {item.status === 'SOLD' && item.soldPriceCents && (
                        <div className="bg-slate-50 dark:bg-slate-900/50 rounded-lg p-2 mb-3 border border-slate-100 dark:border-slate-800">
                            <div className="flex justify-between text-xs mb-1">
                                <span>Cost Basis</span>
                                <span className="font-mono">{formatCurrency(item.costPerUnitCents * item.quantity)}</span>
                            </div>
                            <div className="flex justify-between text-xs mb-2 border-b border-slate-200 dark:border-slate-700 pb-1">
                                <span>Sale Revenue</span>
                                <span className="font-mono">{formatCurrency(item.soldPriceCents * item.quantity)}</span>
                            </div>
                            <div className="flex justify-between text-xs font-bold">
                                <span>Net Profit</span>
                                <span className={`${profit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'} font-mono`}>
                                    {formatCurrency(profit * item.quantity)}
                                </span>
                            </div>
                        </div>
                    )}

                    <div className="flex gap-2 justify-end">
                        {item.status === 'SOLD' && (
                            <button 
                                onClick={(e) => { e.stopPropagation(); onRefund(item); }}
                                className="flex-1 bg-amber-50 hover:bg-amber-100 dark:bg-amber-900/20 dark:hover:bg-amber-900/40 text-amber-700 dark:text-amber-400 text-xs py-2 rounded-lg flex items-center justify-center gap-2 transition-colors border border-amber-200 dark:border-amber-900/50"
                            >
                                <RotateCcw className="h-3 w-3" />
                                Refund
                            </button>
                        )}
                        <button 
                            onClick={(e) => { e.stopPropagation(); onDelete(item); }}
                            className="flex-1 bg-rose-50 hover:bg-rose-100 dark:bg-rose-900/20 dark:hover:bg-rose-900/40 text-rose-600 dark:text-rose-400 text-xs py-2 rounded-lg flex items-center justify-center gap-2 transition-colors border border-rose-200 dark:border-rose-900/50"
                        >
                            <Trash2 className="h-3 w-3" />
                            Delete
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

const InventoryList: React.FC = () => {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [filter, setFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [platformFilter, setPlatformFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  
  // Sorting state
  const [sortKey, setSortKey] = useState<'dateAcquired' | 'costPerUnitCents'>('dateAcquired');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const [availableCategories, setAvailableCategories] = useState<string[]>([]);
  const [availablePlatforms, setAvailablePlatforms] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [agingThreshold, setAgingThreshold] = useState(30);
  const [view, setView] = useState<'ALL' | 'DEAD_STOCK' | 'SOLD'>('ALL');

  // PIN Logic
  const [showPinModal, setShowPinModal] = useState(false);
  const [pendingDeleteItem, setPendingDeleteItem] = useState<InventoryItem | null>(null);

  useEffect(() => {
    refreshData();
  }, []);

  const refreshData = () => {
    setInventory(loadInventory());
    const settings = loadSettings();
    setAvailableCategories(settings.categories);
    setAvailablePlatforms(settings.platforms);
    setAgingThreshold(settings.inventoryAgingThreshold);
  };

  const handleDelete = (item: InventoryItem) => {
    let msg = 'Are you sure you want to permanently delete this item?';
    if (item.status === 'SOLD') {
        msg = 'WARNING: This is a Sold item. Deleting it will NOT remove the financial transaction from your sales history. To reverse a sale, use the Refund button instead. Delete only if this was an entry error. Proceed?';
    } else if (item.status === 'IN_STOCK') {
        msg = 'Are you sure you want to delete this inventory item? This cannot be undone.';
    }

    if (window.confirm(msg)) {
        if (hasPin()) {
            setPendingDeleteItem(item);
            setShowPinModal(true);
        } else {
            deleteInventoryItem(item.id);
            refreshData();
        }
    }
  };

  const onPinSuccess = () => {
      if (pendingDeleteItem) {
          deleteInventoryItem(pendingDeleteItem.id);
          refreshData();
          setPendingDeleteItem(null);
      }
  };

  const handleRefund = (item: InventoryItem) => {
      if (window.confirm(`Refund ${item.name}? This will return the item to stock and create a negative refund entry in your transactions.`)) {
          const success = processRefund(item.id);
          if (success) {
              refreshData();
              alert("Refund processed successfully.");
          } else {
              alert("Failed to process refund.");
          }
      }
  };

  const getDaysHeld = (dateAcquired: string): number => {
    const start = new Date(dateAcquired).getTime();
    const now = new Date().getTime();
    return Math.floor((now - start) / (1000 * 60 * 60 * 24));
  };
  
  // Calculate Dead Stock Count for Tab Badge
  const deadStockCount = useMemo(() => {
      return inventory.filter(i => i.status === 'IN_STOCK' && getDaysHeld(i.dateAcquired) > agingThreshold).length;
  }, [inventory, agingThreshold]);

  const filteredData = useMemo(() => {
    let result = inventory.filter(item => {
      const matchesSearch = item.name.toLowerCase().includes(filter.toLowerCase()) || 
                            item.category.toLowerCase().includes(filter.toLowerCase());
      const matchesCategory = categoryFilter === 'ALL' || item.category === categoryFilter;
      const matchesPlatform = platformFilter === 'ALL' || item.platform === platformFilter;
      
      // Status filter overrides manual status filter if view is specific
      let matchesStatus = statusFilter === 'ALL' || item.status === statusFilter;
      
      let matchesView = true;
      if (view === 'DEAD_STOCK') {
          const daysHeld = getDaysHeld(item.dateAcquired);
          matchesView = item.status === 'IN_STOCK' && daysHeld > agingThreshold;
          matchesStatus = true; // Implicit
      } else if (view === 'SOLD') {
          matchesView = item.status === 'SOLD';
          matchesStatus = true; // Implicit
      } else {
          // ALL View - respect manual status filter
      }

      return matchesSearch && matchesCategory && matchesPlatform && matchesStatus && matchesView;
    });

    // Apply Sorting
    result.sort((a, b) => {
        let valA, valB;

        if (sortKey === 'dateAcquired') {
            valA = new Date(a.dateAcquired).getTime();
            valB = new Date(b.dateAcquired).getTime();
        } else {
            valA = a.costPerUnitCents;
            valB = b.costPerUnitCents;
        }

        if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
        if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
        return 0;
    });

    return result;
  }, [inventory, filter, categoryFilter, platformFilter, statusFilter, view, agingThreshold, sortKey, sortOrder]);

  return (
    <div className="space-y-4">
      {/* Header & Controls */}
      <div className="flex flex-col gap-3">
         <div className="flex justify-between items-center px-1">
             <h2 className="text-xl font-bold text-slate-800 dark:text-white">Inventory</h2>
             {view === 'DEAD_STOCK' && (
                 <div className="text-xs text-slate-500 font-medium flex items-center gap-1">
                    <span>Threshold: &gt;{agingThreshold}d</span>
                 </div>
             )}
         </div>
         
         {/* View Tabs */}
         <div className="flex p-1 bg-slate-100 dark:bg-slate-800 rounded-lg self-start overflow-x-auto max-w-full no-scrollbar">
             <button
                onClick={() => setView('ALL')}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all whitespace-nowrap ${view === 'ALL' ? 'bg-white dark:bg-slate-700 shadow-sm text-slate-900 dark:text-slate-100' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'}`}
             >
                 All Items
             </button>
             <button
                onClick={() => setView('DEAD_STOCK')}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all whitespace-nowrap flex items-center gap-1.5 ${view === 'DEAD_STOCK' ? 'bg-white dark:bg-slate-700 shadow-sm text-slate-900 dark:text-slate-100' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'}`}
             >
                 <span>Dead Stock</span>
                 {deadStockCount > 0 && (
                     <span className="bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 text-[10px] px-1.5 rounded-full min-w-[16px] text-center">
                         {deadStockCount}
                     </span>
                 )}
             </button>
             <button
                onClick={() => setView('SOLD')}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all whitespace-nowrap ${view === 'SOLD' ? 'bg-white dark:bg-slate-700 shadow-sm text-slate-900 dark:text-slate-100' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'}`}
             >
                 Sold History
             </button>
         </div>
         
         {/* Search & Filter Bar */}
         <div className="bg-white dark:bg-slate-800 p-2 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col gap-2">
            <div className="flex gap-2">
                <div className="relative flex-grow">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input 
                    type="text" 
                    placeholder="Search..." 
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
            </div>

             {/* Filters Row */}
             <div className={`flex-col md:flex-row gap-2 ${showFilters ? 'flex animate-fade-in' : 'hidden md:flex'}`}>
                 {view === 'ALL' && (
                     <select 
                        className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg px-3 py-2 text-xs focus:outline-none"
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                    >
                        <option value="ALL">All Statuses</option>
                        <option value="IN_STOCK">In Stock</option>
                        <option value="SOLD">Sold</option>
                    </select>
                 )}

                 <select 
                    className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg px-3 py-2 text-xs focus:outline-none"
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                >
                    <option value="ALL">All Categories</option>
                    {availableCategories.map(c => (
                    <option key={c} value={c}>{c}</option>
                    ))}
                </select>

                <select 
                    className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg px-3 py-2 text-xs focus:outline-none"
                    value={platformFilter}
                    onChange={(e) => setPlatformFilter(e.target.value)}
                >
                    <option value="ALL">All Platforms</option>
                    {availablePlatforms.map(p => (
                    <option key={p} value={p}>{p}</option>
                    ))}
                </select>

                {/* Sort Controls */}
                <div className="flex gap-2 md:ml-auto">
                    <select 
                        className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg px-3 py-2 text-xs focus:outline-none flex-grow md:flex-grow-0"
                        value={sortKey}
                        onChange={(e) => setSortKey(e.target.value as any)}
                    >
                        <option value="dateAcquired">Sort: Date</option>
                        <option value="costPerUnitCents">Sort: Amount</option>
                    </select>
                    <button 
                        onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                        className="px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                    >
                        {sortOrder === 'asc' ? <ArrowUp className="h-4 w-4 text-slate-500" /> : <ArrowDown className="h-4 w-4 text-slate-500" />}
                    </button>
                </div>
             </div>
         </div>
      </div>

       {/* Mobile List View (Cards) */}
       <div className="md:hidden space-y-2">
        {filteredData.length > 0 ? (
          filteredData.map((item) => (
            <MobileInventoryItem 
                key={item.id} 
                item={item} 
                agingThreshold={agingThreshold} 
                view={view}
                onDelete={handleDelete}
                onRefund={handleRefund}
            />
          ))
        ) : (
            <div className="text-center py-10 text-slate-400">
                {view === 'DEAD_STOCK' ? 'No Dead Stock items found.' : 
                 view === 'SOLD' ? 'No sales history found.' : 'No inventory items found.'}
            </div>
        )}
       </div>

      {/* Desktop Table View */}
      <div className="hidden md:block bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm overflow-hidden overflow-x-auto">
        <table className="w-full text-left text-sm text-slate-500 dark:text-slate-400">
          <thead className="bg-slate-50 dark:bg-slate-800/50 text-xs uppercase text-slate-500 dark:text-slate-500">
            <tr>
              <th className="px-6 py-4 font-semibold w-12"></th>
              <th className="px-6 py-4 font-semibold">Date Acquired</th>
              <th className="px-6 py-4 font-semibold">Item Name</th>
              <th className="px-6 py-4 font-semibold">Category</th>
              <th className="px-6 py-4 font-semibold">Platform</th>
              <th className="px-6 py-4 font-semibold text-right">Unit Cost</th>
              <th className="px-6 py-4 font-semibold text-center">Qty</th>
              {view === 'SOLD' && <th className="px-6 py-4 font-semibold text-right">Sold Price</th>}
              {view === 'SOLD' && <th className="px-6 py-4 font-semibold text-right">Total Profit</th>}
              <th className="px-6 py-4 font-semibold text-center">Status</th>
              <th className="px-6 py-4 font-semibold text-center">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {filteredData.length > 0 ? (
              filteredData.map((item) => {
                const daysHeld = getDaysHeld(item.dateAcquired);
                const isAging = item.status === 'IN_STOCK' && daysHeld > agingThreshold;
                const profit = item.soldPriceCents ? (item.soldPriceCents - item.costPerUnitCents) * item.quantity : 0;

                return (
                <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                  <td className="px-6 py-4">
                      <div className="h-8 w-8 rounded bg-slate-100 dark:bg-slate-700 overflow-hidden flex items-center justify-center border border-slate-200 dark:border-slate-600">
                          {item.imageData ? (
                              <img src={item.imageData} alt="" className="h-full w-full object-cover" />
                          ) : (
                              <Package className="h-4 w-4 text-slate-400" />
                          )}
                      </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-mono text-slate-600 dark:text-slate-400">{formatAppDisplayDate(item.dateAcquired)}</div>
                      {isAging && (
                          <div className="flex items-center gap-1 text-[10px] text-amber-600 dark:text-amber-400 font-bold mt-1">
                              <AlertCircle className="h-3 w-3" />
                              {daysHeld} days
                          </div>
                      )}
                  </td>
                  <td className="px-6 py-4 font-medium text-slate-800 dark:text-slate-200">
                    {item.name}
                  </td>
                  <td className="px-6 py-4">
                     <span className="px-2 py-1 rounded-md bg-slate-100 dark:bg-slate-800 text-xs text-slate-600 dark:text-slate-400">
                      {item.category}
                    </span>
                  </td>
                   <td className="px-6 py-4">
                    {item.platform ? (
                      <span className="px-2 py-1 rounded-md bg-slate-100 dark:bg-slate-800 text-xs text-indigo-600 dark:text-indigo-400">
                        {item.platform}
                      </span>
                    ) : (
                      <span className="text-slate-400 dark:text-slate-600 text-xs">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right font-mono font-medium text-slate-800 dark:text-slate-200">
                    {formatCurrency(item.costPerUnitCents)}
                  </td>
                  <td className="px-6 py-4 text-center font-mono text-slate-800 dark:text-slate-200">
                    {item.quantity}
                  </td>
                  
                  {view === 'SOLD' && (
                      <td className="px-6 py-4 text-right font-mono text-slate-600 dark:text-slate-400">
                          {item.soldPriceCents ? formatCurrency(item.soldPriceCents) : '-'}
                      </td>
                  )}
                  {view === 'SOLD' && (
                      <td className={`px-6 py-4 text-right font-mono font-bold ${profit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                          {item.soldPriceCents ? formatCurrency(profit) : '-'}
                      </td>
                  )}

                  <td className="px-6 py-4 text-center">
                    {item.status === 'IN_STOCK' ? (
                         <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-1 rounded-md">In Stock</span>
                    ) : (
                         <span className="text-xs font-bold text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-md">Sold</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <div className="flex items-center justify-center gap-2">
                        {item.status === 'SOLD' && (
                            <button 
                                onClick={() => handleRefund(item)}
                                className="text-slate-400 hover:text-amber-500 dark:text-slate-500 dark:hover:text-amber-400 transition-colors"
                                title="Refund Item"
                            >
                                <RotateCcw className="h-4 w-4" />
                            </button>
                        )}
                        <button 
                            onClick={() => handleDelete(item)}
                            className="text-slate-400 hover:text-rose-500 dark:text-slate-500 dark:hover:text-rose-400 transition-colors"
                            title="Remove Item"
                        >
                            <Trash2 className="h-4 w-4" />
                        </button>
                    </div>
                  </td>
                </tr>
              )})
            ) : (
              <tr>
                <td colSpan={view === 'SOLD' ? 11 : 9} className="px-6 py-12 text-center text-slate-400">
                    {view === 'DEAD_STOCK' ? 'No Dead Stock items found.' : 
                     view === 'SOLD' ? 'No sales history found.' : 'No inventory items found.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      
      <PinModal 
        isOpen={showPinModal} 
        onClose={() => { setShowPinModal(false); setPendingDeleteItem(null); }}
        onSuccess={onPinSuccess}
        title="Confirm Item Deletion"
      />
    </div>
  );
};

export default InventoryList;
