import React, { useState, useEffect } from 'react';
import { TransactionType } from '../types';
import { loadSettings } from '../services/storageService';
import { Save, TrendingUp, DollarSign, Box } from 'lucide-react';
import { saveInventoryItem } from '../services/storageService';

interface EntryFormProps {
  onAdd: (transaction: any) => void;
}

type EntryMode = 'SOURCE' | 'SALE' | 'EXPENSE';

const EntryForm: React.FC<EntryFormProps> = ({ onAdd }) => {
  const [mode, setMode] = useState<EntryMode>('SOURCE');
  
  // Dynamic Lists
  const [productCategoryList, setProductCategoryList] = useState<string[]>([]);
  const [expenseCategoryList, setExpenseCategoryList] = useState<string[]>([]);
  const [platformList, setPlatformList] = useState<string[]>([]);

  // Common
  const [description, setDescription] = useState('');
  const [amountStr, setAmountStr] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  
  // Inventory Specific
  const [itemName, setItemName] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [category, setCategory] = useState(''); // For Products
  const [sourcePlatform, setSourcePlatform] = useState('');

  // Sale Specific
  const [salePlatform, setSalePlatform] = useState('');

  // Expense Specific
  const [expenseCategory, setExpenseCategory] = useState(''); // For Expenses

  useEffect(() => {
    const settings = loadSettings();
    setProductCategoryList(settings.categories);
    setExpenseCategoryList(settings.expenseCategories);
    setPlatformList(settings.platforms);
    
    // Set defaults
    if (settings.categories.length > 0) {
      setCategory(settings.categories[0]);
    }
    if (settings.expenseCategories.length > 0) {
      setExpenseCategory(settings.expenseCategories[0]);
    }
    if (settings.platforms.length > 0) {
      setSourcePlatform(settings.platforms[0]);
      setSalePlatform(settings.platforms[0]);
    }
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amountStr) return;

    const amountFloat = parseFloat(amountStr);
    if (isNaN(amountFloat) || amountFloat <= 0) {
      alert("Please enter a valid positive amount.");
      return;
    }
    const amountCents = Math.round(amountFloat * 100);
    const dateIso = new Date(date).toISOString();

    let transactionData: any = {
      amountCents,
      date: dateIso,
    };

    if (mode === 'SOURCE') {
      if (!itemName) return;
      
      const totalCostCents = amountCents; 
      const costPerUnit = Math.round(totalCostCents / quantity);

      // 1. Create Transaction (Debit)
      transactionData = {
        ...transactionData,
        type: TransactionType.DEBIT,
        category: 'Inventory Source', // Hardcoded for financial ledger consistency
        platform: sourcePlatform,
        description: `Sourced: ${itemName} (x${quantity}) from ${sourcePlatform}`,
      };
      
      // 2. Automatically Log to Inventory
      const invItem = {
        name: itemName,
        category: category, // Saves the specific product category to inventory
        quantity: quantity,
        costPerUnitCents: costPerUnit,
        dateAcquired: dateIso,
        status: 'IN_STOCK',
        platform: sourcePlatform
      };
      
      saveInventoryItem(invItem as any);

    } else if (mode === 'SALE') {
      if (!description) return;
      
      transactionData = {
        ...transactionData,
        type: TransactionType.CREDIT,
        category: 'Sales',
        platform: salePlatform,
        description: `Sold: ${description} on ${salePlatform}`,
      };
    } else {
      // Expense
      if (!description) return;

      transactionData = {
        ...transactionData,
        type: TransactionType.DEBIT,
        category: expenseCategory,
        description: description,
      };
    }

    onAdd(transactionData);

    // Reset
    setDescription('');
    setItemName('');
    setAmountStr('');
    setQuantity(1);
  };

  return (
    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-6 rounded-lg shadow-sm transition-colors">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-100">Log Activity</h2>
        <div className="flex bg-slate-100 dark:bg-slate-900 rounded p-1">
          <button 
            type="button"
            onClick={() => setMode('SOURCE')}
            className={`px-3 py-1.5 rounded text-xs font-medium flex items-center gap-2 transition-colors ${mode === 'SOURCE' ? 'bg-[var(--primary)] text-white' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'}`}
          >
            <Box className="h-3 w-3" />
            Source
          </button>
          <button 
             type="button"
             onClick={() => setMode('SALE')}
             className={`px-3 py-1.5 rounded text-xs font-medium flex items-center gap-2 transition-colors ${mode === 'SALE' ? 'bg-emerald-600 text-white' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'}`}
          >
            <TrendingUp className="h-3 w-3" />
            Sale
          </button>
          <button 
             type="button"
             onClick={() => setMode('EXPENSE')}
             className={`px-3 py-1.5 rounded text-xs font-medium flex items-center gap-2 transition-colors ${mode === 'EXPENSE' ? 'bg-rose-600 text-white' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'}`}
          >
            <DollarSign className="h-3 w-3" />
            Expense
          </button>
        </div>
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        
        {/* Source Mode Fields */}
        {mode === 'SOURCE' && (
          <div className="space-y-4 animate-fade-in">
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               <div>
                  <label className="block text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">Item Name</label>
                  <input 
                    type="text" 
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-slate-100 rounded px-3 py-2 focus:outline-none focus:border-[var(--primary)]"
                    placeholder="e.g. Jordan 1 High OG"
                    value={itemName}
                    onChange={(e) => setItemName(e.target.value)}
                    required
                  />
               </div>
               <div>
                  <label className="block text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">Product Category</label>
                  <select 
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-slate-100 rounded px-3 py-2 focus:outline-none focus:border-[var(--primary)]"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                  >
                    {productCategoryList.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
               </div>
             </div>
             
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               <div>
                  <label className="block text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">Platform (Source)</label>
                  <select 
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-slate-100 rounded px-3 py-2 focus:outline-none focus:border-[var(--primary)]"
                    value={sourcePlatform}
                    onChange={(e) => setSourcePlatform(e.target.value)}
                  >
                    {platformList.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
               </div>
                <div>
                  <label className="block text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">Total Cost</label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-slate-500">$</span>
                    <input 
                      type="number" 
                      step="0.01"
                      min="0.01"
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-slate-100 rounded px-3 py-2 pl-7 font-mono focus:outline-none focus:border-[var(--primary)]"
                      placeholder="0.00"
                      value={amountStr}
                      onChange={(e) => setAmountStr(e.target.value)}
                      required
                    />
                  </div>
                </div>
             </div>
             <div>
                   <label className="block text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">Quantity</label>
                   <input 
                      type="number" 
                      min="1"
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-slate-100 rounded px-3 py-2 focus:outline-none focus:border-[var(--primary)]"
                      value={quantity}
                      onChange={(e) => setQuantity(parseInt(e.target.value))}
                      required
                   />
                </div>
          </div>
        )}

        {/* Sale Mode Fields */}
        {mode === 'SALE' && (
          <div className="space-y-4 animate-fade-in">
             <div>
                <label className="block text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">Item/Description</label>
                <input 
                  type="text" 
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-slate-100 rounded px-3 py-2 focus:outline-none focus:border-emerald-500"
                  placeholder="e.g. Sold Jordan 1s"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  required
                />
             </div>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                   <label className="block text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">Platform (Sold On)</label>
                   <select 
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-slate-100 rounded px-3 py-2 focus:outline-none focus:border-emerald-500"
                      value={salePlatform}
                      onChange={(e) => setSalePlatform(e.target.value)}
                    >
                      {platformList.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">Sale Amount</label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-slate-500">$</span>
                    <input 
                      type="number" 
                      step="0.01"
                      min="0.01"
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-slate-100 rounded px-3 py-2 pl-7 font-mono focus:outline-none focus:border-emerald-500"
                      placeholder="0.00"
                      value={amountStr}
                      onChange={(e) => setAmountStr(e.target.value)}
                      required
                    />
                  </div>
                </div>
              </div>
          </div>
        )}

        {/* Expense Mode Fields */}
        {mode === 'EXPENSE' && (
           <div className="space-y-4 animate-fade-in">
              <div>
                <label className="block text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">Description</label>
                <input 
                  type="text" 
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-slate-100 rounded px-3 py-2 focus:outline-none focus:border-rose-500"
                  placeholder="e.g. Bubble wrap and tape"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  required
                />
             </div>
             <div className="grid grid-cols-2 gap-4">
                <div>
                   <label className="block text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">Expense Category</label>
                   <select 
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-slate-100 rounded px-3 py-2 focus:outline-none focus:border-rose-500"
                      value={expenseCategory}
                      onChange={(e) => setExpenseCategory(e.target.value)}
                    >
                      {expenseCategoryList.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">Cost</label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-slate-500">$</span>
                    <input 
                      type="number" 
                      step="0.01"
                      min="0.01"
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-slate-100 rounded px-3 py-2 pl-7 font-mono focus:outline-none focus:border-rose-500"
                      placeholder="0.00"
                      value={amountStr}
                      onChange={(e) => setAmountStr(e.target.value)}
                      required
                    />
                  </div>
                </div>
             </div>
           </div>
        )}

        <div>
          <label className="block text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">Date</label>
          <input 
            type="date" 
            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-slate-100 rounded px-3 py-2 focus:outline-none focus:border-[var(--primary)]"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
          />
        </div>

        <div className="pt-2">
          <button 
            type="submit" 
            className={`w-full flex items-center justify-center gap-2 text-white py-3 px-4 rounded transition-colors font-medium shadow-lg
              ${mode === 'SOURCE' ? 'bg-[var(--primary)] hover:opacity-90' : 
                mode === 'SALE' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'}`
            }
          >
            <Save className="h-4 w-4" />
            {mode === 'SOURCE' ? 'Add to Inventory' : mode === 'SALE' ? 'Record Sale' : 'Log Expense'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default EntryForm;