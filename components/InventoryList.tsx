import React, { useState, useMemo, useEffect } from 'react';
import { InventoryItem } from '../types';
import { formatCurrency } from '../services/financeService';
import { loadInventory, deleteInventoryItem, loadSettings } from '../services/storageService';
import { Search, Trash2, Package, Filter, AlertCircle, LayoutList } from 'lucide-react';

const InventoryList: React.FC = () => {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [filter, setFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [platformFilter, setPlatformFilter] = useState<string>('ALL');
  const [availableCategories, setAvailableCategories] = useState<string[]>([]);
  const [availablePlatforms, setAvailablePlatforms] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [agingThreshold, setAgingThreshold] = useState(30);
  const [view, setView] = useState<'ALL' | 'DEAD_STOCK'>('ALL');

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

  const handleDelete = (id: string) => {
    if (window.confirm('Are you sure you want to remove this item from inventory?')) {
      deleteInventoryItem(id);
      refreshData();
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
    return inventory.filter(item => {
      const matchesSearch = item.name.toLowerCase().includes(filter.toLowerCase()) || 
                            item.category.toLowerCase().includes(filter.toLowerCase());
      const matchesCategory = categoryFilter === 'ALL' || item.category === categoryFilter;
      const matchesPlatform = platformFilter === 'ALL' || item.platform === platformFilter;
      
      let matchesView = true;
      if (view === 'DEAD_STOCK') {
          const daysHeld = getDaysHeld(item.dateAcquired);
          matchesView = item.status === 'IN_STOCK' && daysHeld > agingThreshold;
      }

      return matchesSearch && matchesCategory && matchesPlatform && matchesView;
    }).sort((a, b) => new Date(b.dateAcquired).getTime() - new Date(a.dateAcquired).getTime());
  }, [inventory, filter, categoryFilter, platformFilter, view, agingThreshold]);

  return (
    <div className="space-y-4">
      {/* Header & Controls */}
      <div className="flex flex-col gap-4">
         <div className="flex justify-between items-center px-1">
             <h2 className="text-xl font-bold text-slate-800 dark:text-white">Inventory</h2>
             <div className="text-xs text-slate-500 font-medium flex items-center gap-1">
                 <span>Dead Stock Threshold: &gt;{agingThreshold}d</span>
             </div>
         </div>
         
         {/* View Tabs */}
         <div className="flex p-1 bg-slate-100 dark:bg-slate-800 rounded-lg self-start">
             <button
                onClick={() => setView('ALL')}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${view === 'ALL' ? 'bg-white dark:bg-slate-700 shadow-sm text-slate-900 dark:text-slate-100' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'}`}
             >
                 <div className="flex items-center gap-2">
                     <LayoutList className="h-4 w-4" />
                     <span>All Items</span>
                 </div>
             </button>
             <button
                onClick={() => setView('DEAD_STOCK')}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${view === 'DEAD_STOCK' ? 'bg-white dark:bg-slate-700 shadow-sm text-slate-900 dark:text-slate-100' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'}`}
             >
                 <div className="flex items-center gap-2">
                     <AlertCircle className={`h-4 w-4 ${deadStockCount > 0 ? 'text-amber-500' : ''}`} />
                     <span>Dead Stock</span>
                     {deadStockCount > 0 && (
                         <span className="bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 text-[10px] px-1.5 rounded-full min-w-[20px] text-center">
                             {deadStockCount}
                         </span>
                     )}
                 </div>
             </button>
         </div>
         
         <div className="bg-white dark:bg-slate-800 p-2 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col md:flex-row gap-2">
            <div className="relative flex-grow">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input 
                type="text" 
                placeholder="Search inventory..." 
                className="w-full bg-transparent text-slate-900 dark:text-slate-100 px-3 py-2 pl-9 text-sm focus:outline-none"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                />
            </div>
             <button 
                onClick={() => setShowFilters(!showFilters)}
                className={`md:hidden p-2 rounded-lg flex items-center justify-center ${showFilters ? 'bg-slate-100 dark:bg-slate-700' : ''}`}
            >
                <Filter className="h-5 w-5 text-slate-500" />
            </button>

             {/* Desktop Filters */}
             <div className="hidden md:flex gap-2">
                 <select 
                    className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-[var(--primary)]"
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                >
                    <option value="ALL">All Categories</option>
                    {availableCategories.map(c => (
                    <option key={c} value={c}>{c}</option>
                    ))}
                </select>

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
             </div>
         </div>

         {/* Mobile Filters Collapsible */}
        {showFilters && (
            <div className="md:hidden grid grid-cols-2 gap-2 animate-fade-in">
                <select 
                    className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg px-3 py-3 text-sm focus:outline-none"
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                >
                    <option value="ALL">All Categories</option>
                    {availableCategories.map(c => (
                    <option key={c} value={c}>{c}</option>
                    ))}
                </select>
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
            </div>
        )}
      </div>

       {/* Mobile List View (Cards) */}
       <div className="md:hidden space-y-3">
        {filteredData.length > 0 ? (
          filteredData.map((item) => {
            const daysHeld = getDaysHeld(item.dateAcquired);
            const isAging = item.status === 'IN_STOCK' && daysHeld > agingThreshold;

            return (
            <div key={item.id} className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm flex items-start gap-3">
                <div className="h-12 w-12 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg flex items-center justify-center flex-shrink-0 text-indigo-600 dark:text-indigo-400">
                    <Package className="h-6 w-6" />
                </div>
                <div className="flex-grow min-w-0">
                    <div className="flex justify-between items-start">
                        <h3 className="text-slate-900 dark:text-slate-100 font-bold text-sm truncate pr-2">{item.name}</h3>
                        <p className="font-mono font-bold text-sm text-slate-800 dark:text-slate-200">{formatCurrency(item.costPerUnitCents)}</p>
                    </div>
                    <p className="text-slate-500 text-xs mt-0.5">{item.category}</p>
                    <div className="flex items-center gap-3 mt-2">
                        <span className="bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded text-[10px] font-medium">
                            Qty: {item.quantity}
                        </span>
                        {item.status === 'IN_STOCK' ? (
                             <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wide">In Stock</span>
                        ) : (
                             <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Sold</span>
                        )}
                        
                        {isAging && (
                            <span className="flex items-center gap-1 text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-2 py-0.5 rounded-full">
                                <AlertCircle className="h-3 w-3" />
                                {daysHeld}d
                            </span>
                        )}
                    </div>
                </div>
                <button 
                  onClick={() => handleDelete(item.id)}
                  className="text-slate-300 hover:text-rose-500 dark:text-slate-600"
                >
                    <Trash2 className="h-4 w-4" />
                </button>
            </div>
            );
          })
        ) : (
            <div className="text-center py-10 text-slate-400">
                {view === 'DEAD_STOCK' ? 'No Dead Stock items found.' : 'No inventory items found.'}
            </div>
        )}
       </div>

      {/* Desktop Table View */}
      <div className="hidden md:block bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm overflow-hidden">
        <table className="w-full text-left text-sm text-slate-500 dark:text-slate-400">
          <thead className="bg-slate-50 dark:bg-slate-800/50 text-xs uppercase text-slate-500 dark:text-slate-500">
            <tr>
              <th className="px-6 py-4 font-semibold">Date Acquired</th>
              <th className="px-6 py-4 font-semibold">Item Name</th>
              <th className="px-6 py-4 font-semibold">Category</th>
              <th className="px-6 py-4 font-semibold">Platform</th>
              <th className="px-6 py-4 font-semibold text-right">Unit Cost</th>
              <th className="px-6 py-4 font-semibold text-center">Qty</th>
              <th className="px-6 py-4 font-semibold text-center">Status</th>
              <th className="px-6 py-4 font-semibold text-center">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {filteredData.length > 0 ? (
              filteredData.map((item) => {
                const daysHeld = getDaysHeld(item.dateAcquired);
                const isAging = item.status === 'IN_STOCK' && daysHeld > agingThreshold;

                return (
                <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-mono text-slate-600 dark:text-slate-400">{new Date(item.dateAcquired).toLocaleDateString()}</div>
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
                  <td className="px-6 py-4 text-center">
                    {item.status === 'IN_STOCK' ? (
                         <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-1 rounded-md">In Stock</span>
                    ) : (
                         <span className="text-xs font-bold text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-md">Sold</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <button 
                      onClick={() => handleDelete(item.id)}
                      className="text-slate-400 hover:text-rose-500 dark:text-slate-500 dark:hover:text-rose-400 transition-colors"
                      title="Remove Item"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              )})
            ) : (
              <tr>
                <td colSpan={8} className="px-6 py-12 text-center text-slate-400">
                    {view === 'DEAD_STOCK' ? 'No Dead Stock items found.' : 'No inventory items found.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default InventoryList;