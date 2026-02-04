
import React, { useState, useMemo, useEffect } from 'react';
import { InventoryItem } from '../types';
import { formatCurrency } from '../services/financeService';
import { loadInventory, deleteInventoryItem, loadSettings, processRefund } from '../services/storageService';
import { hasPin } from '../services/authService';
import { Search, Trash2, Package, Filter, AlertCircle, LayoutList, ArrowUp, ArrowDown, CheckCircle2, RotateCcw, ChevronDown, ChevronUp, Calendar, Tag, Globe, TrendingUp, Gauge, Ruler, Palette } from 'lucide-react';
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
    const actualRoi = item.soldPriceCents ? ((item.soldPriceCents - item.costPerUnitCents) / item.costPerUnitCents) * 100 : 0;
    const profit = (item.soldPriceCents || 0) - item.costPerUnitCents;

    return (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden transition-all duration-300">
            {/* Header / Always Visible */}
            <div 
                className="p-4 flex items-center gap-4 cursor-pointer active:bg-slate-50 dark:active:bg-slate-700/50"
                onClick={() => setIsOpen(!isOpen)}
            >
                <div className="h-12 w-12 rounded-xl flex items-center justify-center flex-shrink-0 bg-slate-100 dark:bg-slate-900 overflow-hidden border border-slate-200 dark:border-slate-700">
                    {item.imageData ? (
                        <img src={item.imageData} alt="" className="h-full w-full object-cover" />
                    ) : (
                        <Package className="h-6 w-6 text-slate-400 opacity-20" />
                    )}
                </div>
                <div className="flex-grow min-w-0">
                    <div className="flex justify-between items-start">
                        <h3 className="text-slate-900 dark:text-slate-100 font-black text-sm truncate pr-2 tracking-tight uppercase">{item.name}</h3>
                        <p className="font-mono font-black text-sm text-slate-900 dark:text-slate-100">
                            {view === 'SOLD' ? formatCurrency(item.soldPriceCents || 0) : formatCurrency(item.costPerUnitCents)}
                        </p>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] font-black text-slate-500 bg-slate-100 dark:bg-slate-900 px-2 py-0.5 rounded-md uppercase tracking-widest">{item.quantity} Unit{item.quantity !== 1 ? 's' : ''}</span>
                        {(item.size || item.color) && (
                            <span className="text-[9px] font-black text-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 px-1.5 py-0.5 rounded">
                                {item.size}{item.size && item.color ? ' • ' : ''}{item.color}
                            </span>
                        )}
                        {item.status === 'IN_STOCK' ? (
                             <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">Active</span>
                        ) : (
                             <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">Sold</span>
                        )}
                        {isAging && (
                            <span className="flex items-center gap-0.5 text-[10px] font-black text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-1.5 py-0.5 rounded-md border border-amber-200 dark:border-amber-900/50">
                                <AlertCircle className="h-3 w-3" /> {daysHeld}d
                            </span>
                        )}
                    </div>
                </div>
                <div className="text-slate-300">
                    {isOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                </div>
            </div>

            {/* Collapsible Content */}
            {isOpen && (
                <div className="px-4 pb-4 pt-0 animate-fade-in border-t border-slate-100 dark:border-slate-700/50 mt-1">
                    <div className="grid grid-cols-2 gap-4 mt-4 mb-4 text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
                        <div className="flex items-center gap-2"><Tag className="h-3 w-3" /><span>{item.category}</span></div>
                        <div className="flex items-center gap-2"><Globe className="h-3 w-3" /><span>{item.platform || 'General'}</span></div>
                        <div className="flex items-center gap-2"><Calendar className="h-3 w-3" /><span>Acq: {formatAppDisplayDate(item.dateAcquired)}</span></div>
                        {item.status === 'SOLD' && (
                            <div className="flex items-center gap-2"><Calendar className="h-3 w-3" /><span>Sold: {item.soldDate ? formatAppDisplayDate(item.soldDate) : '-'}</span></div>
                        )}
                    </div>

                    {/* ROI Section */}
                    <div className="bg-slate-50 dark:bg-slate-900/50 rounded-2xl p-4 mb-4 border border-slate-100 dark:border-slate-800">
                        <div className="grid grid-cols-2 gap-4 mb-3 pb-3 border-b border-slate-200 dark:border-slate-800">
                            <div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Projected ROI</p>
                                <p className="text-sm font-black text-slate-800 dark:text-slate-100">{item.projectedRoi || 0}%</p>
                            </div>
                            {item.status === 'SOLD' && (
                                <div>
                                    <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1">Actual ROI</p>
                                    <p className={`text-sm font-black ${actualRoi >= (item.projectedRoi || 0) ? 'text-emerald-500' : 'text-amber-500'}`}>{actualRoi.toFixed(0)}%</p>
                                </div>
                            )}
                        </div>
                        {item.status === 'SOLD' && item.soldPriceCents && (
                            <div className="space-y-1.5">
                                <div className="flex justify-between text-[10px] font-bold uppercase text-slate-500">
                                    <span>Total Sourcing (COGS)</span>
                                    <span className="font-mono text-xs">{formatCurrency(item.costPerUnitCents * item.quantity)}</span>
                                </div>
                                <div className="flex justify-between text-[10px] font-bold uppercase text-slate-500">
                                    <span>Gross Realized Revenue</span>
                                    <span className="font-mono text-xs">{formatCurrency(item.soldPriceCents * item.quantity)}</span>
                                </div>
                                <div className="flex justify-between text-[10px] font-black uppercase text-indigo-600 dark:text-indigo-400 pt-1.5 border-t border-slate-200 dark:border-slate-700">
                                    <span>Net Realized Profit</span>
                                    <span className="font-mono text-xs">{formatCurrency(profit * item.quantity)}</span>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="flex gap-2">
                        {item.status === 'SOLD' && (
                            <button 
                                onClick={(e) => { e.stopPropagation(); onRefund(item); }}
                                className="flex-1 bg-amber-50 hover:bg-amber-100 dark:bg-amber-900/20 dark:hover:bg-amber-900/40 text-amber-700 dark:text-amber-400 text-[10px] font-black uppercase tracking-widest py-3 rounded-xl flex items-center justify-center gap-2 transition-all border border-amber-200 dark:border-amber-900/50"
                            >
                                <RotateCcw className="h-4 w-4" /> Refund Item
                            </button>
                        )}
                        <button 
                            onClick={(e) => { e.stopPropagation(); onDelete(item); }}
                            className="flex-1 bg-rose-50 hover:bg-rose-100 dark:bg-rose-900/20 dark:hover:bg-rose-900/40 text-rose-600 dark:text-rose-400 text-[10px] font-black uppercase tracking-widest py-3 rounded-xl flex items-center justify-center gap-2 transition-all border border-rose-200 dark:border-rose-900/50"
                        >
                            <Trash2 className="h-4 w-4" /> {view === 'SOLD' ? 'Scrub Record' : 'Delete Item'}
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
  
  const [sortKey, setSortKey] = useState<'dateAcquired' | 'costPerUnitCents'>('dateAcquired');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const [availableCategories, setAvailableCategories] = useState<string[]>([]);
  const [availablePlatforms, setAvailablePlatforms] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [agingThreshold, setAgingThreshold] = useState(30);
  const [view, setView] = useState<'ALL' | 'DEAD_STOCK' | 'SOLD'>('ALL');

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
    let msg = 'Permanently delete this inventory record?';
    if (item.status === 'SOLD') {
        msg = 'CRITICAL: This is a SOLD record. Deleting it will NOT affect transaction history. Use Refund to return to stock. Scrub record anyway?';
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
      if (window.confirm(`Issue refund for ${item.name}? This returns the unit to active stock and logs a negative revenue entry.`)) {
          const success = processRefund(item.id);
          if (success) {
              refreshData();
          } else {
              alert("Refund failed. Integrity error.");
          }
      }
  };

  const getDaysHeld = (dateAcquired: string): number => {
    const start = new Date(dateAcquired).getTime();
    const now = new Date().getTime();
    return Math.floor((now - start) / (1000 * 60 * 60 * 24));
  };
  
  const deadStockCount = useMemo(() => {
      return inventory.filter(i => i.status === 'IN_STOCK' && getDaysHeld(i.dateAcquired) > agingThreshold).length;
  }, [inventory, agingThreshold]);

  const filteredData = useMemo(() => {
    let result = inventory.filter(item => {
      const matchesSearch = item.name.toLowerCase().includes(filter.toLowerCase()) || 
                            item.category.toLowerCase().includes(filter.toLowerCase());
      const matchesCategory = categoryFilter === 'ALL' || item.category === categoryFilter;
      const matchesPlatform = platformFilter === 'ALL' || item.platform === platformFilter;
      
      let matchesStatus = statusFilter === 'ALL' || item.status === statusFilter;
      
      let matchesView = true;
      if (view === 'DEAD_STOCK') {
          const daysHeld = getDaysHeld(item.dateAcquired);
          matchesView = item.status === 'IN_STOCK' && daysHeld > agingThreshold;
          matchesStatus = true;
      } else if (view === 'SOLD') {
          matchesView = item.status === 'SOLD';
          matchesStatus = true;
      }

      return matchesSearch && matchesCategory && matchesPlatform && matchesStatus && matchesView;
    });

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
    <div className="space-y-4 pb-12">
      <div className="flex flex-col gap-4">
         <div className="flex justify-between items-center px-1">
             <h2 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-tight">Inventory Ledger</h2>
             {view === 'DEAD_STOCK' && (
                 <div className="text-[10px] text-amber-600 dark:text-amber-400 font-black bg-amber-50 dark:bg-amber-900/20 px-2 py-1 rounded-md border border-amber-200 dark:border-amber-900/50 uppercase tracking-widest">
                    Aging Threshold: {agingThreshold}d
                 </div>
             )}
         </div>
         
         <div className="flex p-1 bg-slate-100 dark:bg-slate-800 rounded-xl self-start border border-slate-200 dark:border-slate-700">
             <button onClick={() => setView('ALL')} className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${view === 'ALL' ? 'bg-white dark:bg-slate-700 shadow-sm text-indigo-600' : 'text-slate-500 hover:text-slate-900'}`}>Stock</button>
             <button onClick={() => setView('DEAD_STOCK')} className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${view === 'DEAD_STOCK' ? 'bg-white dark:bg-slate-700 shadow-sm text-amber-600' : 'text-slate-500 hover:text-slate-900'}`}>
                 <span>Dead Stock</span>
                 {deadStockCount > 0 && <span className="bg-amber-500 text-white text-[9px] px-1.5 rounded-full">{deadStockCount}</span>}
             </button>
             <button onClick={() => setView('SOLD')} className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${view === 'SOLD' ? 'bg-white dark:bg-slate-700 shadow-sm text-indigo-600' : 'text-slate-500 hover:text-slate-900'}`}>Sold History</button>
         </div>
         
         <div className="bg-white dark:bg-slate-800 p-2 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col gap-2">
            <div className="flex gap-2">
                <div className="relative flex-grow">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input type="text" placeholder="Search item or category..." className="w-full bg-transparent text-slate-900 dark:text-slate-100 px-3 py-2 pl-10 text-sm focus:outline-none placeholder:text-slate-400" value={filter} onChange={(e) => setFilter(e.target.value)} />
                </div>
                <button onClick={() => setShowFilters(!showFilters)} className={`md:hidden p-2 rounded-lg flex items-center justify-center transition-colors ${showFilters ? 'bg-slate-100 dark:bg-slate-700 text-indigo-600' : 'text-slate-400'}`}><Filter className="h-5 w-5" /></button>
            </div>

             <div className={`flex-col md:flex-row gap-2 ${showFilters ? 'flex animate-fade-in' : 'hidden md:flex'}`}>
                 {view === 'ALL' && (
                     <select className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg px-3 py-2 text-xs focus:outline-none" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}><option value="ALL">All Units</option><option value="IN_STOCK">In Stock</option><option value="SOLD">Sold</option></select>
                 )}
                 <select className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg px-3 py-2 text-xs focus:outline-none" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}><option value="ALL">All Categories</option>{availableCategories.map(c => <option key={c} value={c}>{c}</option>)}</select>
                 <select className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg px-3 py-2 text-xs focus:outline-none" value={platformFilter} onChange={(e) => setPlatformFilter(e.target.value)}><option value="ALL">All Platforms</option>{availablePlatforms.map(p => <option key={p} value={p}>{p}</option>)}</select>
                <div className="flex gap-2 md:ml-auto">
                    <select className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg px-3 py-2 text-xs focus:outline-none" value={sortKey} onChange={(e) => setSortKey(e.target.value as any)}><option value="dateAcquired">Sort: Acquired</option><option value="costPerUnitCents">Sort: Value</option></select>
                    <button onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')} className="px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800">{sortOrder === 'asc' ? <ArrowUp className="h-4 w-4 text-slate-500" /> : <ArrowDown className="h-4 w-4 text-slate-500" />}</button>
                </div>
             </div>
         </div>
      </div>

       <div className="md:hidden space-y-3">
        {filteredData.length > 0 ? filteredData.map((item) => <MobileInventoryItem key={item.id} item={item} agingThreshold={agingThreshold} view={view} onDelete={handleDelete} onRefund={handleRefund} />) : (
            <div className="py-20 text-center text-slate-400 text-[10px] font-black uppercase tracking-widest border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl">No Records Match Query</div>
        )}
       </div>

      <div className="hidden md:block bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-sm overflow-hidden overflow-x-auto">
        <table className="w-full text-left text-sm text-slate-500 dark:text-slate-400">
          <thead className="bg-slate-50 dark:bg-slate-800/50 text-[10px] uppercase font-black text-slate-500 tracking-widest">
            <tr>
              <th className="px-6 py-4 w-12"></th>
              <th className="px-6 py-4">Acquired</th>
              <th className="px-6 py-4">Name</th>
              <th className="px-6 py-4">Attributes</th>
              <th className="px-6 py-4 text-right">Landed Cost</th>
              <th className="px-6 py-4 text-center">Qty</th>
              {view === 'SOLD' && <th className="px-6 py-4 text-right">Sold At</th>}
              {view === 'SOLD' && <th className="px-6 py-4 text-right">Profit</th>}
              {view === 'SOLD' && <th className="px-6 py-4 text-center">Actual ROI</th>}
              <th className="px-6 py-4 text-center">Status</th>
              <th className="px-6 py-4 text-center">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {filteredData.length > 0 ? filteredData.map((item) => {
                const daysHeld = getDaysHeld(item.dateAcquired);
                const isAging = item.status === 'IN_STOCK' && daysHeld > agingThreshold;
                const actualRoi = item.soldPriceCents ? ((item.soldPriceCents - item.costPerUnitCents) / item.costPerUnitCents) * 100 : 0;
                const profit = item.soldPriceCents ? (item.soldPriceCents - item.costPerUnitCents) * item.quantity : 0;

                return (
                <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                  <td className="px-6 py-4">
                      <div className="h-10 w-10 rounded-lg bg-slate-100 dark:bg-slate-700 overflow-hidden flex items-center justify-center border border-slate-200 dark:border-slate-600 shadow-inner">
                          {item.imageData ? <img src={item.imageData} alt="" className="h-full w-full object-cover" /> : <Package className="h-5 w-5 text-slate-400 opacity-20" />}
                      </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-mono text-xs text-slate-600 dark:text-slate-400">{formatAppDisplayDate(item.dateAcquired)}</div>
                      {isAging && <div className="text-[9px] text-amber-600 font-black uppercase mt-1">Dead {daysHeld}d</div>}
                  </td>
                  <td className="px-6 py-4 font-black text-slate-800 dark:text-slate-100 uppercase tracking-tight text-xs">{item.name}</td>
                  <td className="px-6 py-4">
                      <div className="flex flex-col gap-1">
                          {item.size && <span className="text-[9px] font-bold text-slate-400 uppercase flex items-center gap-1"><Ruler className="h-3 w-3" /> {item.size}</span>}
                          {item.color && <span className="text-[9px] font-bold text-slate-400 uppercase flex items-center gap-1"><Palette className="h-3 w-3" /> {item.color}</span>}
                          {!item.size && !item.color && <span className="text-slate-300">-</span>}
                      </div>
                  </td>
                  <td className="px-6 py-4 text-right font-mono font-bold text-slate-800 dark:text-slate-100">{formatCurrency(item.costPerUnitCents)}</td>
                  <td className="px-6 py-4 text-center font-black text-slate-500">{item.quantity}</td>
                  
                  {view === 'SOLD' && <td className="px-6 py-4 text-right font-mono text-emerald-600 font-black">{item.soldPriceCents ? formatCurrency(item.soldPriceCents) : '-'}</td>}
                  {view === 'SOLD' && <td className={`px-6 py-4 text-right font-mono font-black ${profit >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>{item.soldPriceCents ? formatCurrency(profit) : '-'}</td>}
                  {view === 'SOLD' && <td className={`px-6 py-4 text-center font-black text-xs ${actualRoi >= (item.projectedRoi || 0) ? 'text-emerald-500' : 'text-amber-500'}`}>{actualRoi.toFixed(0)}%</td>}

                  <td className="px-6 py-4 text-center">
                    <span className={`text-[9px] font-black px-2 py-1 rounded-md uppercase tracking-widest ${item.status === 'IN_STOCK' ? 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20' : 'text-slate-500 bg-slate-100 dark:bg-slate-800'}`}>{item.status.replace('_', ' ')}</span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <div className="flex items-center justify-center gap-2">
                        {item.status === 'SOLD' && <button onClick={() => handleRefund(item)} className="text-slate-400 hover:text-amber-500 transition-colors" title="Issue Refund"><RotateCcw className="h-4 w-4" /></button>}
                        <button onClick={() => handleDelete(item)} className="text-slate-400 hover:text-rose-500 transition-colors" title="Delete Entry"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </td>
                </tr>
              )}) : (
              <tr><td colSpan={view === 'SOLD' ? 11 : 10} className="px-6 py-20 text-center text-slate-400 text-xs font-black uppercase tracking-widest">No matching results found in local ledger</td></tr>
            )}
          </tbody>
        </table>
      </div>
      
      <PinModal isOpen={showPinModal} onClose={() => { setShowPinModal(false); setPendingDeleteItem(null); }} onSuccess={onPinSuccess} title="Scrub Inventory Record" />
    </div>
  );
};

export default InventoryList;
