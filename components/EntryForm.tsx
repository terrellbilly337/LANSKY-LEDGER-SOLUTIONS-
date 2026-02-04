
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { TransactionType, InventoryItem, Transaction } from '../types';
import { loadSettings, loadInventory, processSale, processBundleSale, saveInventoryItem } from '../services/storageService';
import { getAppDateString } from '../services/timeService';
import { formatCurrency } from '../services/financeService';
import { Save, TrendingUp, DollarSign, Box, Search, AlertCircle, Camera, Image as ImageIcon, X, Layers, Plus, Trash2, Loader2, Gauge, PackageCheck, Smartphone } from 'lucide-react';

interface EntryFormProps {
  onAdd: (transaction: any, wasAlreadySaved?: boolean) => void;
}

type EntryMode = 'SOURCE' | 'SALE' | 'EXPENSE' | 'BUNDLE';

const EntryForm: React.FC<EntryFormProps> = ({ onAdd }) => {
  const [mode, setMode] = useState<EntryMode>('SOURCE');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [productCategoryList, setProductCategoryList] = useState<string[]>([]);
  const [expenseCategoryList, setExpenseCategoryList] = useState<string[]>([]);
  const [platformList, setPlatformList] = useState<string[]>([]);
  const [inventoryList, setInventoryList] = useState<InventoryItem[]>([]);

  const [description, setDescription] = useState('');
  const [amountStr, setAmountStr] = useState('');
  const [targetSaleStr, setTargetSaleStr] = useState(''); 
  const [date, setDate] = useState(getAppDateString());
  
  const [itemName, setItemName] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [category, setCategory] = useState('');
  const [sourcePlatform, setSourcePlatform] = useState('');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [showCamera, setShowCamera] = useState(false);

  const [selectedInventoryId, setSelectedInventoryId] = useState<string>('');
  const [salePlatform, setSalePlatform] = useState('');
  const [saleSearchTerm, setSaleSearchTerm] = useState('');
  const [expenseCategory, setExpenseCategory] = useState('');
  const [bundleItems, setBundleItems] = useState<{item: InventoryItem, qty: number}[]>([]);
  
  useEffect(() => {
    const settings = loadSettings();
    setProductCategoryList(settings.categories);
    setExpenseCategoryList(settings.expenseCategories);
    setPlatformList(settings.platforms);
    setInventoryList(loadInventory().filter(i => i.status === 'IN_STOCK' && i.quantity > 0));
    if (settings.categories.length > 0) setCategory(settings.categories[0]);
    if (settings.expenseCategories.length > 0) setExpenseCategory(settings.expenseCategories[0]);
    if (settings.platforms.length > 0) { setSourcePlatform(settings.platforms[0]); setSalePlatform(settings.platforms[0]); }
  }, []);

  const projectedRoi = useMemo(() => {
    const cost = parseFloat(amountStr);
    const target = parseFloat(targetSaleStr);
    if (!cost || !target || cost <= 0) return 0;
    return ((target - cost) / cost) * 100;
  }, [amountStr, targetSaleStr]);

  const filteredInventory = useMemo(() => {
    const term = saleSearchTerm.toLowerCase();
    return inventoryList.filter(i => 
        i.name.toLowerCase().includes(term) || 
        i.category.toLowerCase().includes(term)
    );
  }, [inventoryList, saleSearchTerm]);

  const selectedItem = useMemo(() => 
    inventoryList.find(i => i.id === selectedInventoryId), 
  [selectedInventoryId, inventoryList]);

  const handleStartCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setShowCamera(true);
      }
    } catch (err) {
      alert("Could not access camera: " + err);
    }
  };

  const handleCapture = () => {
    if (videoRef.current && canvasRef.current) {
      const context = canvasRef.current.getContext('2d');
      if (context) {
        canvasRef.current.width = videoRef.current.videoWidth;
        canvasRef.current.height = videoRef.current.videoHeight;
        context.drawImage(videoRef.current, 0, 0);
        const dataUrl = canvasRef.current.toDataURL('image/jpeg');
        setImagePreview(dataUrl);
        handleStopCamera();
      }
    }
  };

  const handleStopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setShowCamera(false);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => setImagePreview(ev.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleAddToBundle = () => {
    if (!selectedItem || quantity <= 0) return;
    const existingInBundle = bundleItems.find(b => b.item.id === selectedItem.id);
    const currentQtyInBundle = existingInBundle ? existingInBundle.qty : 0;
    
    if (quantity + currentQtyInBundle > selectedItem.quantity) {
        alert(`Stock limit reached! You only have ${selectedItem.quantity} units of this item available.`);
        return;
    }

    if (existingInBundle) {
        setBundleItems(bundleItems.map(b => b.item.id === selectedItem.id ? { ...b, qty: b.qty + quantity } : b));
    } else {
        setBundleItems([...bundleItems, { item: selectedItem, qty: quantity }]);
    }
    
    setSelectedInventoryId('');
    setSaleSearchTerm('');
    setQuantity(1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    const amountFloat = parseFloat(amountStr);
    if (isNaN(amountFloat) || (amountFloat <= 0 && mode !== 'EXPENSE')) { alert("Invalid amount."); return; }
    setIsSubmitting(true);

    try {
        const amountCents = Math.round(amountFloat * 100);
        const dateIso = new Date(date).toISOString();

        if (mode === 'SOURCE') {
          const invItem = {
            name: itemName,
            category: category,
            quantity: quantity,
            costPerUnitCents: Math.round(amountCents / quantity),
            dateAcquired: dateIso,
            status: 'IN_STOCK',
            platform: sourcePlatform,
            imageData: imagePreview,
            projectedRoi: Math.round(projectedRoi)
          };
          saveInventoryItem(invItem as any);
          onAdd({ amountCents, date: dateIso, type: TransactionType.DEBIT, category: 'Inventory Source', platform: sourcePlatform, description: `Sourced: ${itemName} (x${quantity})` }, false);
        } else if (mode === 'SALE') {
          if (!selectedItem) throw new Error("Please select an item to sell.");
          if (quantity > selectedItem.quantity) throw new Error(`Not enough stock. Only ${selectedItem.quantity} available.`);
          
          const resultTx = processSale({ amountCents, date: dateIso, type: TransactionType.CREDIT, category: 'Sales', platform: salePlatform, description: `Sold: ${selectedItem.name}` }, selectedInventoryId, quantity);
          if (resultTx) onAdd(resultTx, true);
        } else if (mode === 'BUNDLE') {
            if (bundleItems.length === 0) throw new Error("Bundle is empty.");
            const resultTx = processBundleSale(bundleItems.map(b => ({ id: b.item.id, qty: b.qty })), amountCents, salePlatform, dateIso);
            if (resultTx) onAdd(resultTx, true);
        } else if (mode === 'EXPENSE') {
          const finalDesc = selectedItem ? `[Item Expense: ${selectedItem.name}] ${description}` : description;
          onAdd({ amountCents, date: dateIso, type: TransactionType.DEBIT, category: expenseCategory, description: finalDesc, linkedItemId: selectedInventoryId }, false);
        }
        
        // Reset state after success
        setAmountStr(''); setTargetSaleStr(''); setItemName(''); setQuantity(1); setImagePreview(null); 
        setSelectedInventoryId(''); setSaleSearchTerm(''); setDescription(''); setBundleItems([]);
        setInventoryList(loadInventory().filter(i => i.status === 'IN_STOCK' && i.quantity > 0));
    } catch (err: any) { alert(err.message || "Error processing log."); }
    finally { setIsSubmitting(false); }
  };

  return (
    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-6 rounded-2xl shadow-sm transition-all duration-300">
      <div className="flex items-center justify-between mb-8 overflow-x-auto no-scrollbar pb-2">
        <h2 className="text-xl font-black text-slate-800 dark:text-slate-100 uppercase tracking-tight flex-shrink-0 mr-4">Log Activity</h2>
        <div className="flex bg-slate-100 dark:bg-slate-900 rounded-xl p-1 flex-shrink-0">
          {(['SOURCE', 'SALE', 'BUNDLE', 'EXPENSE'] as EntryMode[]).map(m => (
            <button key={m} type="button" onClick={() => { setMode(m); setSelectedInventoryId(''); setSaleSearchTerm(''); }} className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${mode === m ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'}`}>{m}</button>
          ))}
        </div>
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        {mode === 'SOURCE' && (
          <div className="space-y-6 animate-fade-in">
             <div className="flex flex-col md:flex-row gap-6">
                <div className="w-full md:w-1/3 flex flex-col items-center">
                    <div className="w-full aspect-square bg-slate-100 dark:bg-slate-900 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700 overflow-hidden relative group">
                        {showCamera ? (
                            <div className="relative h-full w-full">
                                <video ref={videoRef} autoPlay playsInline className="h-full w-full object-cover" />
                                <button type="button" onClick={handleCapture} className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-white text-indigo-600 p-3 rounded-full shadow-xl">
                                    <Camera className="h-6 w-6" />
                                </button>
                                <button type="button" onClick={handleStopCamera} className="absolute top-2 right-2 bg-black/50 text-white p-1 rounded-full">
                                    <X className="h-4 w-4" />
                                </button>
                            </div>
                        ) : imagePreview ? (
                            <>
                                <img src={imagePreview} alt="Preview" className="h-full w-full object-cover" />
                                <button type="button" onClick={() => setImagePreview(null)} className="absolute top-2 right-2 bg-rose-500 text-white p-1 rounded-full shadow-md">
                                    <Trash2 className="h-4 w-4" />
                                </button>
                            </>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-2">
                                <ImageIcon className="h-10 w-10 opacity-20" />
                                <p className="text-[10px] font-bold uppercase tracking-widest">No Image</p>
                            </div>
                        )}
                        <canvas ref={canvasRef} className="hidden" />
                    </div>
                    <div className="flex gap-2 mt-4 w-full">
                        <button type="button" onClick={handleStartCamera} className="flex-1 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 py-2 rounded-xl text-xs font-bold uppercase flex items-center justify-center gap-2">
                            <Camera className="h-4 w-4" /> Camera
                        </button>
                        <button type="button" onClick={() => fileInputRef.current?.click()} className="flex-1 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 py-2 rounded-xl text-xs font-bold uppercase flex items-center justify-center gap-2">
                            <Plus className="h-4 w-4" /> Upload
                        </button>
                        <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept="image/*" />
                    </div>
                </div>

                <div className="flex-1 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div><label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Item Name</label><input type="text" className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm focus:border-indigo-500 focus:outline-none" value={itemName} onChange={(e) => setItemName(e.target.value)} required /></div>
                        <div><label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Category</label><select className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm focus:border-indigo-500 focus:outline-none" value={category} onChange={(e) => setCategory(e.target.value)}>{productCategoryList.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div><label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Quantity Sourced</label><input type="number" min="1" className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm focus:border-indigo-500 focus:outline-none" value={quantity} onChange={(e) => setQuantity(parseInt(e.target.value) || 1)} /></div>
                        <div><label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Source Platform</label><select className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm focus:border-indigo-500 focus:outline-none" value={sourcePlatform} onChange={(e) => setSourcePlatform(e.target.value)}>{platformList.map(p => <option key={p} value={p}>{p}</option>)}</select></div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="relative">
                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Total Cost ($)</label>
                            <input type="number" step="0.01" className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm focus:border-indigo-500 focus:outline-none" value={amountStr} onChange={(e) => setAmountStr(e.target.value)} required />
                        </div>
                        <div className="relative">
                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Target Sale Price ($)</label>
                            <input type="number" step="0.01" className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm focus:border-indigo-500 focus:outline-none" value={targetSaleStr} onChange={(e) => setTargetSaleStr(e.target.value)} />
                            {projectedRoi > 0 && (
                                <div className="absolute right-3 top-9 flex items-center gap-1.5 bg-emerald-100 dark:bg-emerald-900/30 px-2 py-1 rounded-lg border border-emerald-200 dark:border-emerald-800">
                                    <Gauge className="h-3 w-3 text-emerald-600" />
                                    <span className="text-[10px] font-black text-emerald-600">{projectedRoi.toFixed(0)}% ROI</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
             </div>
          </div>
        )}

        {(mode === 'SALE' || mode === 'BUNDLE' || mode === 'EXPENSE') && (
            <div className="space-y-4 animate-fade-in">
                <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">
                        {mode === 'EXPENSE' ? 'Link Expense to Inventory (Optional)' : 'Select Inventory Item'}
                    </label>
                    <div className="relative group">
                        <Search className="absolute left-3 top-3.5 h-4 w-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                        <input 
                            type="text" 
                            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 pl-10 text-sm focus:border-indigo-500 focus:outline-none transition-all shadow-inner" 
                            placeholder="Search active inventory..." 
                            value={saleSearchTerm}
                            onChange={(e) => setSaleSearchTerm(e.target.value)}
                        />
                    </div>
                    
                    {filteredInventory.length > 0 && (
                        <div className="mt-4 grid grid-cols-1 gap-2 max-h-56 overflow-y-auto pr-2 custom-scrollbar">
                            {filteredInventory.map(item => (
                                <button 
                                    key={item.id} 
                                    type="button"
                                    onClick={() => setSelectedInventoryId(item.id)}
                                    className={`flex items-center justify-between p-3 rounded-2xl border text-left transition-all ${selectedInventoryId === item.id ? 'bg-indigo-50 border-indigo-200 dark:bg-indigo-900/20 dark:border-indigo-800 ring-2 ring-indigo-500/20' : 'bg-white dark:bg-slate-900/50 border-slate-100 dark:border-slate-800 hover:border-indigo-200'}`}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="h-10 w-10 bg-slate-100 dark:bg-slate-800 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700">
                                            {item.imageData ? <img src={item.imageData} alt="" className="h-full w-full object-cover" /> : <Box className="h-5 w-5 text-slate-400 m-auto mt-2.5" />}
                                        </div>
                                        <div>
                                            <p className="text-xs font-bold text-slate-800 dark:text-slate-100">{item.name}</p>
                                            <div className="flex items-center gap-2">
                                                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{item.category}</span>
                                                <span className={`text-[10px] font-black px-1.5 py-0.5 rounded ${item.quantity > 5 ? 'text-indigo-500 bg-indigo-50 dark:bg-indigo-900/30' : 'text-rose-500 bg-rose-50 dark:bg-rose-900/30'}`}>
                                                    {item.quantity} units
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    {selectedInventoryId === item.id && <PackageCheck className="h-5 w-5 text-indigo-500" />}
                                </button>
                            ))}
                        </div>
                    )}
                    {filteredInventory.length === 0 && saleSearchTerm && (
                        <div className="mt-4 p-4 text-center text-slate-400 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700">
                            No matching inventory found.
                        </div>
                    )}
                </div>

                {mode === 'SALE' && selectedItem && (
                    <div className="bg-emerald-50 dark:bg-emerald-900/10 p-4 rounded-2xl border border-emerald-100 dark:border-emerald-800/50 flex flex-col md:flex-row gap-4 items-center animate-fade-in">
                         <div className="flex-1 w-full">
                            <label className="block text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest mb-1">Quantity to Sell</label>
                            <input type="number" min="1" max={selectedItem.quantity} className="w-full bg-white dark:bg-slate-800 border border-emerald-200 dark:border-emerald-700 rounded-xl px-4 py-3 text-sm font-bold text-emerald-900 dark:text-emerald-100" value={quantity} onChange={(e) => setQuantity(parseInt(e.target.value) || 1)} />
                         </div>
                         <div className="flex-1 w-full">
                            <label className="block text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest mb-1">Sale Platform</label>
                            <select className="w-full bg-white dark:bg-slate-800 border border-emerald-200 dark:border-emerald-700 rounded-xl px-4 py-3 text-sm" value={salePlatform} onChange={(e) => setSalePlatform(e.target.value)}>{platformList.map(p => <option key={p} value={p}>{p}</option>)}</select>
                         </div>
                    </div>
                )}

                {mode === 'BUNDLE' && selectedItem && (
                    <div className="flex flex-col md:flex-row gap-4 items-end bg-indigo-50 dark:bg-indigo-900/10 p-4 rounded-2xl border border-dashed border-indigo-200 dark:border-indigo-800 animate-fade-in">
                         <div className="flex-1 w-full">
                            <label className="block text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest mb-1">Bundle Qty</label>
                            <input type="number" min="1" max={selectedItem.quantity} className="w-full bg-white dark:bg-slate-800 border border-indigo-200 dark:border-indigo-700 rounded-xl px-4 py-3 text-sm font-bold" value={quantity} onChange={(e) => setQuantity(parseInt(e.target.value) || 1)} />
                         </div>
                         <button type="button" onClick={handleAddToBundle} className="w-full md:w-auto bg-indigo-600 text-white px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest shadow-lg shadow-indigo-600/20 active:scale-95 transition-all">Add to Bundle</button>
                    </div>
                )}

                {bundleItems.length > 0 && mode === 'BUNDLE' && (
                    <div className="space-y-3 p-4 bg-slate-50 dark:bg-slate-900/30 rounded-2xl border border-slate-200 dark:border-slate-700">
                         <div className="flex items-center justify-between">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Active Bundle Contents</p>
                            <p className="text-[10px] font-black text-indigo-600 dark:text-indigo-400">{bundleItems.reduce((acc, b) => acc + b.qty, 0)} Items Selected</p>
                         </div>
                         <div className="space-y-2">
                            {bundleItems.map((b, i) => (
                                <div key={i} className="flex justify-between items-center bg-white dark:bg-slate-800 p-3 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm">
                                    <div className="flex items-center gap-3">
                                        <div className="h-8 w-8 rounded bg-slate-100 dark:bg-slate-900 flex-shrink-0">
                                            {b.item.imageData && <img src={b.item.imageData} className="h-full w-full object-cover rounded" alt="" />}
                                        </div>
                                        <span className="text-xs font-bold text-slate-800 dark:text-slate-200">{b.item.name} <span className="text-indigo-500 font-black ml-1">x{b.qty}</span></span>
                                    </div>
                                    <button type="button" onClick={() => setBundleItems(bundleItems.filter((_, idx) => idx !== i))} className="p-1 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-lg text-rose-400"><Trash2 className="h-4 w-4" /></button>
                                </div>
                            ))}
                         </div>
                    </div>
                )}
            </div>
        )}

        {mode === 'EXPENSE' && (
            <div className="space-y-4 animate-fade-in pt-4 border-t border-slate-100 dark:border-slate-800">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div><label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Expense Category</label><select className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm focus:border-indigo-500 focus:outline-none" value={expenseCategory} onChange={(e) => setExpenseCategory(e.target.value)}>{expenseCategoryList.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
                    <div><label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Expense Description</label><input type="text" className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm focus:border-indigo-500 focus:outline-none" value={description} onChange={(e) => setDescription(e.target.value)} required placeholder="e.g. Polymailers, Tape, Fees" /></div>
                </div>
            </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-slate-100 dark:border-slate-800">
           <div><label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{mode === 'SOURCE' ? 'Purchase Total ($)' : mode === 'EXPENSE' ? 'Expense Total ($)' : 'Total Sale Amount ($)'}</label><input type="number" step="0.01" className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm focus:border-indigo-500 focus:outline-none font-mono" value={amountStr} onChange={(e) => setAmountStr(e.target.value)} required /></div>
           <div><label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Activity Date</label><input type="date" className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm focus:border-indigo-500 focus:outline-none" value={date} onChange={(e) => setDate(e.target.value)} required /></div>
        </div>

        <button type="submit" disabled={isSubmitting} className={`w-full h-14 flex items-center justify-center gap-2 rounded-2xl text-white font-black text-sm tracking-widest uppercase transition-all shadow-xl active:scale-[0.98] disabled:opacity-50 ${mode === 'SOURCE' ? 'bg-indigo-600 shadow-indigo-600/20' : mode === 'SALE' ? 'bg-emerald-600 shadow-emerald-600/20' : mode === 'BUNDLE' ? 'bg-indigo-500 shadow-indigo-500/20' : 'bg-rose-600 shadow-rose-600/20'}`}>
             {isSubmitting ? <Loader2 className="h-6 w-6 animate-spin" /> : <Save className="h-6 w-6" />}
             {isSubmitting ? 'Recording Ledger Entry...' : `Confirm ${mode} Entry`}
        </button>
      </form>
    </div>
  );
};
export default EntryForm;
