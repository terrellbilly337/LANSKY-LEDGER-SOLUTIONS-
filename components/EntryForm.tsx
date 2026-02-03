
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { TransactionType, InventoryItem } from '../types';
import { loadSettings, loadInventory, processSale } from '../services/storageService';
import { getAppDateString } from '../services/timeService';
import { formatCurrency } from '../services/financeService';
import { Save, TrendingUp, DollarSign, Box, Search, AlertCircle, Camera, Image as ImageIcon, X } from 'lucide-react';
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
  const [inventoryList, setInventoryList] = useState<InventoryItem[]>([]);

  // Common
  const [description, setDescription] = useState('');
  const [amountStr, setAmountStr] = useState('');
  const [date, setDate] = useState(getAppDateString());
  
  // Inventory Source Specific
  const [itemName, setItemName] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [category, setCategory] = useState('');
  const [sourcePlatform, setSourcePlatform] = useState('');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sale Specific
  const [selectedInventoryId, setSelectedInventoryId] = useState<string>('');
  const [salePlatform, setSalePlatform] = useState('');
  const [saleSearchTerm, setSaleSearchTerm] = useState('');
  
  // Expense Specific
  const [expenseCategory, setExpenseCategory] = useState('');

  useEffect(() => {
    refreshData();
  }, []);

  const refreshData = () => {
    const settings = loadSettings();
    setProductCategoryList(settings.categories);
    setExpenseCategoryList(settings.expenseCategories);
    setPlatformList(settings.platforms);
    
    // Load Inventory for Sales Selector (Only IN_STOCK)
    const inv = loadInventory().filter(i => i.status === 'IN_STOCK' && i.quantity > 0);
    setInventoryList(inv);

    // Set defaults
    if (settings.categories.length > 0) setCategory(settings.categories[0]);
    if (settings.expenseCategories.length > 0) setExpenseCategory(settings.expenseCategories[0]);
    if (settings.platforms.length > 0) {
      setSourcePlatform(settings.platforms[0]);
      setSalePlatform(settings.platforms[0]);
    }
  };

  // Image handling
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Compress Image logic using Canvas
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 600;
        const scaleSize = MAX_WIDTH / img.width;
        
        // Resize if larger than max width
        if (img.width > MAX_WIDTH) {
            canvas.width = MAX_WIDTH;
            canvas.height = img.height * scaleSize;
        } else {
            canvas.width = img.width;
            canvas.height = img.height;
        }

        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
        
        // Output as JPEG with lower quality for storage efficiency
        const dataUrl = canvas.toDataURL('image/jpeg', 0.6);
        setImagePreview(dataUrl);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  // Derived state for Sale Preview
  const selectedItem = useMemo(() => 
    inventoryList.find(i => i.id === selectedInventoryId), 
  [selectedInventoryId, inventoryList]);

  const profitPreview = useMemo(() => {
    if (!selectedItem || !amountStr) return null;
    const revenue = parseFloat(amountStr) * 100; // cents
    const cost = selectedItem.costPerUnitCents * quantity; // Total cost for sold qty
    return revenue - cost;
  }, [selectedItem, amountStr, quantity]);

  // Filter inventory list for search
  const filteredInventory = useMemo(() => {
    if (!saleSearchTerm) return inventoryList;
    return inventoryList.filter(i => 
        i.name.toLowerCase().includes(saleSearchTerm.toLowerCase()) || 
        i.category.toLowerCase().includes(saleSearchTerm.toLowerCase())
    );
  }, [inventoryList, saleSearchTerm]);

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

      transactionData = {
        ...transactionData,
        type: TransactionType.DEBIT,
        category: 'Inventory Source',
        platform: sourcePlatform,
        description: `Sourced: ${itemName} (x${quantity}) from ${sourcePlatform}`,
      };
      
      const invItem = {
        name: itemName,
        category: category,
        quantity: quantity,
        costPerUnitCents: costPerUnit,
        dateAcquired: dateIso,
        status: 'IN_STOCK',
        platform: sourcePlatform,
        imageData: imagePreview // Save the image
      };
      
      saveInventoryItem(invItem as any);
      onAdd(transactionData);

    } else if (mode === 'SALE') {
      if (!selectedInventoryId || !selectedItem) {
          alert("Please select an item from inventory to record a sale.");
          return;
      }

      if (quantity > selectedItem.quantity) {
          alert(`Insufficient stock. Only ${selectedItem.quantity} available.`);
          return;
      }
      
      transactionData = {
        ...transactionData,
        type: TransactionType.CREDIT,
        category: 'Sales',
        platform: salePlatform,
        description: `Sold: ${selectedItem.name} (x${quantity}) on ${salePlatform}`,
      };

      // Use atomic process function
      const success = processSale(transactionData, selectedInventoryId, quantity);
      
      if (success) {
          // Trigger parent update (which refreshes dashboard lists)
          onAdd(transactionData); 
          // Refresh local inventory list immediately
          refreshData();
      } else {
          alert("Error processing sale. Inventory may have changed.");
      }

    } else {
      // Expense
      if (!description) return;

      transactionData = {
        ...transactionData,
        type: TransactionType.DEBIT,
        category: expenseCategory,
        description: description,
      };
      onAdd(transactionData);
    }

    // Reset Form
    setDescription('');
    setItemName('');
    setAmountStr('');
    setQuantity(1);
    setSelectedInventoryId('');
    setSaleSearchTerm('');
    setImagePreview(null); // Clear image
    setDate(getAppDateString());
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

             {/* Photo Upload Section */}
             <div>
                 <label className="block text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">Item Photo</label>
                 <div className="flex items-center gap-4">
                     <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 px-4 py-2 rounded-lg flex items-center gap-2 transition-colors text-sm font-medium"
                     >
                        <Camera className="h-4 w-4" />
                        Take Photo / Upload
                     </button>
                     <input 
                        type="file" 
                        accept="image/*" 
                        capture="environment" // Hints mobile to use rear camera
                        ref={fileInputRef} 
                        onChange={handleImageUpload} 
                        className="hidden" 
                     />
                     {imagePreview && (
                         <div className="relative h-12 w-12 rounded-lg overflow-hidden border border-slate-300 dark:border-slate-600">
                             <img src={imagePreview} alt="Preview" className="h-full w-full object-cover" />
                             <button
                                type="button" 
                                onClick={() => { setImagePreview(null); if (fileInputRef.current) fileInputRef.current.value = ''; }}
                                className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity"
                             >
                                 <X className="h-4 w-4 text-white" />
                             </button>
                         </div>
                     )}
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

        {/* ... (Existing Sale & Expense Modes - unchanged logic) ... */}
        {/* Sale Mode Fields (New Selector Logic) */}
        {mode === 'SALE' && (
          <div className="space-y-4 animate-fade-in">
             {/* Inventory Selector */}
             <div>
                <label className="block text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">Select Item from Inventory</label>
                
                {!selectedInventoryId ? (
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <input 
                            type="text"
                            placeholder="Search inventory to sell..."
                            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-slate-100 rounded px-3 py-2 pl-9 focus:outline-none focus:border-emerald-500"
                            value={saleSearchTerm}
                            onChange={(e) => setSaleSearchTerm(e.target.value)}
                        />
                        {saleSearchTerm && (
                            <div className="absolute top-full left-0 right-0 mt-1 max-h-48 overflow-y-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg z-10">
                                {filteredInventory.length > 0 ? (
                                    filteredInventory.map(item => (
                                        <div 
                                            key={item.id}
                                            onClick={() => {
                                                setSelectedInventoryId(item.id);
                                                setSaleSearchTerm('');
                                            }}
                                            className="p-3 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer border-b last:border-0 border-slate-100 dark:border-slate-800 flex justify-between items-center"
                                        >
                                            <div className="flex items-center gap-3">
                                                {item.imageData && (
                                                    <img src={item.imageData} className="h-8 w-8 rounded object-cover" alt="" />
                                                )}
                                                <div>
                                                    <p className="font-medium text-sm text-slate-900 dark:text-slate-100">{item.name}</p>
                                                    <p className="text-xs text-slate-500">{item.category} • Cost: {formatCurrency(item.costPerUnitCents)}</p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <span className="text-xs font-bold bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 px-2 py-0.5 rounded">Qty: {item.quantity}</span>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="p-3 text-sm text-slate-500 text-center">No matching items found</div>
                                )}
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-200 dark:border-emerald-900/50 rounded-lg p-3 flex justify-between items-center">
                        <div className="flex items-center gap-3">
                             {selectedItem?.imageData && (
                                <img src={selectedItem.imageData} className="h-10 w-10 rounded object-cover" alt="" />
                            )}
                            <div>
                                <p className="font-bold text-slate-800 dark:text-slate-200">{selectedItem?.name}</p>
                                <p className="text-xs text-slate-500 mt-0.5">
                                    SKU: {selectedItem?.id.substring(0,6).toUpperCase()} • Cost Basis: {selectedItem && formatCurrency(selectedItem.costPerUnitCents)}
                                </p>
                            </div>
                        </div>
                        <button 
                            type="button"
                            onClick={() => setSelectedInventoryId('')}
                            className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 underline"
                        >
                            Change
                        </button>
                    </div>
                )}
             </div>

             {selectedItem && (
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-fade-in">
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
                      <label className="block text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">Total Sale Amount</label>
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
                    
                    <div>
                       <label className="block text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">Quantity Sold</label>
                       <div className="flex items-center gap-3">
                           <input 
                              type="number" 
                              min="1"
                              max={selectedItem.quantity}
                              className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-slate-100 rounded px-3 py-2 focus:outline-none focus:border-emerald-500"
                              value={quantity}
                              onChange={(e) => setQuantity(Math.min(parseInt(e.target.value) || 1, selectedItem.quantity))}
                              required
                           />
                           <span className="text-xs text-slate-500 whitespace-nowrap">
                               of {selectedItem.quantity} available
                           </span>
                       </div>
                       {selectedItem.quantity < 3 && (
                           <p className="text-[10px] text-amber-600 dark:text-amber-400 mt-1 flex items-center gap-1">
                               <AlertCircle className="h-3 w-3" /> Low stock warning
                           </p>
                       )}
                    </div>

                    {/* Profit Preview */}
                    <div className="flex flex-col justify-end">
                         {profitPreview !== null && (
                             <div className={`p-3 rounded-lg border ${profitPreview >= 0 ? 'bg-emerald-50 dark:bg-emerald-900/10 border-emerald-100 dark:border-emerald-900/30' : 'bg-rose-50 dark:bg-rose-900/10 border-rose-100 dark:border-rose-900/30'}`}>
                                 <p className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wide font-bold">Estimated Profit</p>
                                 <div className={`text-xl font-mono font-bold ${profitPreview >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                                     {formatCurrency(profitPreview)}
                                 </div>
                             </div>
                         )}
                    </div>
                 </div>
             )}

             {!selectedItem && (
                 <div className="text-center p-4 border border-dashed border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-400">
                     Search and select an item above to calculate profit and update inventory automatically.
                 </div>
             )}
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
            disabled={mode === 'SALE' && !selectedItem}
            className={`w-full flex items-center justify-center gap-2 text-white py-3 px-4 rounded transition-colors font-medium shadow-lg disabled:opacity-50 disabled:cursor-not-allowed
              ${mode === 'SOURCE' ? 'bg-[var(--primary)] hover:opacity-90' : 
                mode === 'SALE' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'}`
            }
          >
            <Save className="h-4 w-4" />
            {mode === 'SOURCE' ? 'Add to Inventory' : mode === 'SALE' ? 'Confirm Sale' : 'Log Expense'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default EntryForm;
