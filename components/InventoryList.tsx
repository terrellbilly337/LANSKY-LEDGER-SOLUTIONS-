import React, { useState, useMemo, useEffect } from 'react';
import { InventoryItem } from '../types';
import { formatCurrency } from '../services/financeService';
import { loadInventory, deleteInventoryItem, loadSettings } from '../services/storageService';
import { Search, Trash2, Package, Filter, Tag } from 'lucide-react';

const InventoryList: React.FC = () => {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [filter, setFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [platformFilter, setPlatformFilter] = useState<string>('ALL');
  const [availableCategories, setAvailableCategories] = useState<string[]>([]);
  const [availablePlatforms, setAvailablePlatforms] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    refreshData();
  }, []);

  const refreshData = () => {
    setInventory(loadInventory());
    const settings = loadSettings();
    setAvailableCategories(settings.categories);
    setAvailablePlatforms(settings.platforms);
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Are you sure you want to remove this item from inventory?')) {
      deleteInventoryItem(id);
      refreshData();
    }
  };

  const filteredData = useMemo(() => {
    return inventory.filter(item => {
      const matchesSearch = item.name.toLowerCase().includes(filter.toLowerCase()) || 
                            item.category.toLowerCase().includes(filter.toLowerCase());
      const matchesCategory = categoryFilter === 'ALL' || item.category === categoryFilter;
      const matchesPlatform = platformFilter === 'ALL' || item.platform === platformFilter;
      
      return matchesSearch && matchesCategory && matchesPlatform;
    }).sort((a, b) => new Date(b.dateAcquired).getTime() - new Date(a.dateAcquired).getTime());
  }, [inventory, filter, categoryFilter, platformFilter]);

  return (
    <div className="space-y-4">
      {/* Header & Controls */}
      <div className="flex flex-col gap-4">
         <h2 className="text-xl font-bold text-slate-800 dark:text-white px-1">Inventory</h2>
         
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
          filteredData.map((item) => (
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
                    </div>
                </div>
                <button 
                  onClick={() => handleDelete(item.id)}
                  className="text-slate-300 hover:text-rose-500 dark:text-slate-600"
                >
                    <Trash2 className="h-4 w-4" />
                </button>
            </div>
          ))
        ) : (
            <div className="text-center py-10 text-slate-400">No inventory found.</div>
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
              filteredData.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap font-mono text-slate-600 dark:text-slate-400">{new Date(item.dateAcquired).toLocaleDateString()}</td>
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
              ))
            ) : (
              <tr>
                <td colSpan={8} className="px-6 py-12 text-center text-slate-400">
                  No inventory items found.
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