import React, { useState, useEffect, useMemo } from 'react';
import { AppSettings, TaxProfile, Transaction, InventoryItem, ScheduleCData, TaxFormRecommendation } from '../types';
import { TAX_LINES, getDefaultMapping, generateScheduleCReport, convertToCSV, determineTaxForms } from '../services/taxService';
import { loadSettings, saveSettings, loadTransactions, loadInventory } from '../services/storageService';
import { generateTaxPDF } from '../services/pdfService';
import { formatCurrency } from '../services/financeService';
import { FileText, Save, Download, AlertTriangle, Calculator, Briefcase, Calendar, ChevronRight, CheckCircle, Info, FileWarning, TrendingUp, ShieldCheck } from 'lucide-react';

export const TaxHub: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'PROFILE' | 'MAPPING' | 'REPORT'>('PROFILE');
  const [settings, setSettings] = useState<AppSettings>(loadSettings());
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  
  // Tax Profile State
  const [profile, setProfile] = useState<TaxProfile>(settings.taxProfile || {
    entityType: 'SOLE_PROP',
    productType: 'PHYSICAL',
    taxId: '',
    taxIdType: 'EIN',
    address: '',
    city: '',
    state: '',
    zip: '',
    filingFrequency: 'ANNUALLY',
    estimatedTaxRate: 30
  });

  // Report State
  const [reportYear, setReportYear] = useState(new Date().getFullYear());
  const [reportData, setReportData] = useState<ScheduleCData | null>(null);
  const [recommendations, setRecommendations] = useState<TaxFormRecommendation[]>([]);

  useEffect(() => {
    setTransactions(loadTransactions());
    setInventory(loadInventory());
  }, []);

  // Initialize Default Mapping if empty
  useEffect(() => {
    if (!settings.taxMapping) {
      const defaultMap = getDefaultMapping(settings.categories, settings.expenseCategories);
      const newSettings = { ...settings, taxMapping: defaultMap };
      setSettings(newSettings);
      saveSettings(newSettings);
    }
  }, [settings.categories, settings.expenseCategories]);

  // Real-time Liability Calculation for current year
  const currentLiability = useMemo(() => {
    if (!settings.taxMapping) return 0;
    const currentYear = new Date().getFullYear();
    const data = generateScheduleCReport(
      transactions,
      inventory,
      currentYear,
      settings.taxMapping,
      profile.estimatedTaxRate
    );
    return data.estimatedTax;
  }, [transactions, inventory, settings.taxMapping, profile.estimatedTaxRate]);

  const handleProfileSave = () => {
    const newSettings = { ...settings, taxProfile: profile };
    setSettings(newSettings);
    saveSettings(newSettings);
    setActiveTab('MAPPING');
  };

  const handleMappingChange = (category: string, taxLine: string) => {
    const newMapping = { ...(settings.taxMapping || {}), [category]: taxLine };
    const newSettings = { ...settings, taxMapping: newMapping };
    setSettings(newSettings);
    saveSettings(newSettings);
  };

  const generateReport = () => {
    if (!settings.taxMapping) return;
    
    // 1. Generate Numbers
    const data = generateScheduleCReport(
      transactions,
      inventory,
      reportYear,
      settings.taxMapping,
      profile.estimatedTaxRate
    );
    setReportData(data);

    // 2. Generate Recommendations (Decision Tree)
    const recs = determineTaxForms(profile, transactions, reportYear);
    setRecommendations(recs);
  };

  const downloadCSV = () => {
    if (!reportData) return;
    const csv = convertToCSV(reportData, reportYear);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `lansky_tax_report_${reportYear}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleDownloadPDF = (isDraft: boolean) => {
    if (!reportData) return;
    generateTaxPDF(reportData, profile, reportYear, isDraft);
  };

  const US_STATES = [
    'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD',
    'MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC',
    'SD','TN','TX','UT','VT','VA','WA','WV','WI','WY'
  ];

  return (
    <div className="space-y-6">
      
      {/* Real-time Liability Widget */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-xl p-6 text-white shadow-lg border border-slate-700">
        <div className="flex justify-between items-start">
            <div>
                <h3 className="text-slate-400 text-sm font-medium uppercase tracking-wider mb-1 flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-[var(--primary)]" />
                    Est. {new Date().getFullYear()} Tax Liability
                </h3>
                <p className="text-3xl font-bold font-mono tracking-tight">{formatCurrency(currentLiability)}</p>
                <p className="text-xs text-slate-500 mt-1">
                    Based on {profile.estimatedTaxRate}% rate on current net profit. 
                    Updates in real-time.
                </p>
            </div>
            <div className="bg-slate-800 p-3 rounded-lg border border-slate-700">
                <p className="text-xs text-slate-400 mb-1">Tax Rate Setting</p>
                <div className="flex items-center gap-2">
                    <span className="text-xl font-bold">{profile.estimatedTaxRate}%</span>
                    <button 
                       onClick={() => setActiveTab('PROFILE')} 
                       className="text-xs text-[var(--primary)] hover:underline"
                    >
                        Adjust
                    </button>
                </div>
            </div>
        </div>
      </div>

      <div className="bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
      {/* Disclaimer Header */}
      <div className="bg-amber-50 dark:bg-amber-900/20 p-4 border-b border-amber-100 dark:border-amber-900/50 flex items-start gap-3">
        <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-500 flex-shrink-0 mt-0.5" />
        <div>
           <p className="text-sm font-bold text-amber-800 dark:text-amber-200">Legal Disclaimer</p>
           <p className="text-xs text-amber-700 dark:text-amber-400 mt-1">
             Lansky Ledger is not a tax advisory service. The reports generated below are estimates based on your input and app categorization. 
             Always consult with a qualified CPA or tax professional before filing.
           </p>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
        <button 
          onClick={() => setActiveTab('PROFILE')}
          className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${activeTab === 'PROFILE' ? 'text-[var(--primary)] border-b-2 border-[var(--primary)]' : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'}`}
        >
          <Briefcase className="h-4 w-4" /> Profile
        </button>
        <button 
           onClick={() => setActiveTab('MAPPING')}
           className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${activeTab === 'MAPPING' ? 'text-[var(--primary)] border-b-2 border-[var(--primary)]' : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'}`}
        >
          <Calculator className="h-4 w-4" /> Categorization
        </button>
        <button 
           onClick={() => { setActiveTab('REPORT'); generateReport(); }}
           className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${activeTab === 'REPORT' ? 'text-[var(--primary)] border-b-2 border-[var(--primary)]' : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'}`}
        >
          <FileText className="h-4 w-4" /> Reports & PDF
        </button>
      </div>

      <div className="p-6">
        
        {/* PROFILE TAB */}
        {activeTab === 'PROFILE' && (
          <div className="space-y-4 animate-fade-in">
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1 uppercase">Legal Entity Type</label>
                  <select 
                    value={profile.entityType}
                    onChange={e => setProfile({...profile, entityType: e.target.value as any})}
                    className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded px-3 py-2 text-sm focus:border-[var(--primary)] outline-none"
                  >
                    <option value="SOLE_PROP">Sole Proprietorship</option>
                    <option value="LLC_SINGLE">Single-Member LLC</option>
                    <option value="PARTNERSHIP">Partnership</option>
                    <option value="CORP">C-Corporation</option>
                    <option value="S_CORP">S-Corporation</option>
                  </select>
                </div>
                <div>
                   <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1 uppercase">Primary Product Type</label>
                   <select 
                    value={profile.productType}
                    onChange={e => setProfile({...profile, productType: e.target.value as any})}
                    className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded px-3 py-2 text-sm focus:border-[var(--primary)] outline-none"
                  >
                    <option value="PHYSICAL">Physical Goods</option>
                    <option value="DIGITAL">Digital Goods</option>
                    <option value="SERVICE">Services</option>
                    <option value="HYBRID">Hybrid</option>
                  </select>
                </div>
             </div>

             <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                   <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1 uppercase">State (Nexus)</label>
                   <select 
                    value={profile.state}
                    onChange={e => setProfile({...profile, state: e.target.value})}
                    className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded px-3 py-2 text-sm focus:border-[var(--primary)] outline-none"
                  >
                    <option value="">Select State</option>
                    {US_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                   <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1 uppercase">Filing Frequency</label>
                   <select 
                    value={profile.filingFrequency}
                    onChange={e => setProfile({...profile, filingFrequency: e.target.value as any})}
                    className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded px-3 py-2 text-sm focus:border-[var(--primary)] outline-none"
                  >
                    <option value="ANNUALLY">Annually (Form 1040)</option>
                    <option value="QUARTERLY">Quarterly (Form 1040-ES)</option>
                  </select>
                </div>
                 <div>
                   <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1 uppercase">Tax ID Type</label>
                  <select 
                    value={profile.taxIdType}
                    onChange={e => setProfile({...profile, taxIdType: e.target.value as any})}
                    className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded px-3 py-2 text-sm focus:border-[var(--primary)] outline-none"
                  >
                    <option value="EIN">EIN (Employer ID)</option>
                    <option value="SSN">SSN (Social Security)</option>
                  </select>
               </div>
             </div>

             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               <div className="md:col-span-1">
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1 uppercase">Tax ID Number</label>
                  <input 
                    type="text" 
                    value={profile.taxId}
                    onChange={e => setProfile({...profile, taxId: e.target.value})}
                    placeholder={profile.taxIdType === 'EIN' ? 'XX-XXXXXXX' : 'XXX-XX-XXXX'}
                    className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded px-3 py-2 text-sm focus:border-[var(--primary)] outline-none font-mono"
                  />
               </div>
               <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1 uppercase">Estimated Tax Rate (%)</label>
                <div className="flex items-center gap-2">
                  <input 
                    type="number" 
                    value={profile.estimatedTaxRate}
                    onChange={e => setProfile({...profile, estimatedTaxRate: parseFloat(e.target.value)})}
                    className="w-24 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded px-3 py-2 text-sm focus:border-[var(--primary)] outline-none text-right"
                  />
                  <span className="text-sm text-slate-500">%</span>
                </div>
                <p className="text-[10px] text-slate-400 mt-1">
                  Used for calculating estimated quarterly payments. Includes Self-Employment Tax (15.3%) + Income Tax Bracket.
                </p>
             </div>
             </div>

             <div className="pt-4 flex justify-end">
               <button 
                 onClick={handleProfileSave}
                 className="bg-[var(--primary)] text-white px-4 py-2 rounded flex items-center gap-2 text-sm font-medium hover:opacity-90"
               >
                 <Save className="h-4 w-4" /> Save & Continue
               </button>
             </div>
          </div>
        )}

        {/* MAPPING TAB */}
        {activeTab === 'MAPPING' && (
          <div className="space-y-6 animate-fade-in">
             <div className="bg-slate-100 dark:bg-slate-800 p-4 rounded text-sm text-slate-600 dark:text-slate-400 mb-4">
               Map your internal app categories to official IRS Schedule C line items. 
               This ensures your expenses flow into the correct tax bucket.
             </div>

             <div className="space-y-6">
                <div>
                   <h3 className="font-bold text-slate-800 dark:text-white mb-2 text-sm uppercase">Income Categories</h3>
                   <div className="space-y-2">
                      {settings.categories.map(cat => (
                        <div key={cat} className="flex flex-col sm:flex-row sm:items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800/50">
                          <span className="w-48 font-medium text-slate-700 dark:text-slate-300 text-sm">{cat}</span>
                          <ChevronRight className="h-4 w-4 text-slate-300 hidden sm:block" />
                          <select 
                            value={settings.taxMapping?.[cat] || ''}
                            onChange={(e) => handleMappingChange(cat, e.target.value)}
                            className="flex-1 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded px-2 py-1 text-xs focus:border-[var(--primary)] outline-none"
                          >
                             {Object.values(TAX_LINES.INCOME).map(line => (
                               <option key={line} value={line}>{line}</option>
                             ))}
                          </select>
                        </div>
                      ))}
                   </div>
                </div>

                <div>
                   <h3 className="font-bold text-slate-800 dark:text-white mb-2 text-sm uppercase">Expense Categories</h3>
                   <div className="space-y-2">
                      {settings.expenseCategories.map(cat => (
                        <div key={cat} className="flex flex-col sm:flex-row sm:items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800/50">
                          <span className="w-48 font-medium text-slate-700 dark:text-slate-300 text-sm">{cat}</span>
                          <ChevronRight className="h-4 w-4 text-slate-300 hidden sm:block" />
                          <select 
                            value={settings.taxMapping?.[cat] || ''}
                            onChange={(e) => handleMappingChange(cat, e.target.value)}
                            className="flex-1 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded px-2 py-1 text-xs focus:border-[var(--primary)] outline-none"
                          >
                             <optgroup label="Cost of Goods Sold">
                                {Object.values(TAX_LINES.COGS).map(line => (
                                  <option key={line} value={line}>{line}</option>
                                ))}
                             </optgroup>
                             <optgroup label="Expenses">
                                {Object.values(TAX_LINES.EXPENSES).map(line => (
                                  <option key={line} value={line}>{line}</option>
                                ))}
                             </optgroup>
                          </select>
                        </div>
                      ))}
                   </div>
                </div>
             </div>
          </div>
        )}

        {/* REPORT TAB */}
        {activeTab === 'REPORT' && (
          <div className="animate-fade-in space-y-6">
             <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                   <Calendar className="h-5 w-5 text-slate-400" />
                   <select 
                      value={reportYear}
                      onChange={(e) => {
                         setReportYear(parseInt(e.target.value));
                      }}
                      className="bg-white dark:bg-slate-800 border-none font-bold text-lg text-slate-800 dark:text-white focus:ring-0 cursor-pointer"
                   >
                      <option value={2023}>2023</option>
                      <option value={2024}>2024</option>
                      <option value={2025}>2025</option>
                   </select>
                </div>
                <div className="flex gap-2">
                   <button 
                    onClick={generateReport} 
                    className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 text-xs rounded font-medium"
                   >
                     Refresh
                   </button>
                   <button 
                     onClick={downloadCSV}
                     className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-800 dark:text-slate-200 text-xs rounded font-medium flex items-center gap-1 hover:opacity-90"
                   >
                     <Download className="h-3 w-3" /> CSV
                   </button>
                   <div className="relative group">
                     <button 
                        className="px-3 py-1.5 bg-[var(--primary)] text-white text-xs rounded font-medium flex items-center gap-1 hover:opacity-90"
                     >
                        <FileText className="h-3 w-3" /> Download PDF
                     </button>
                     <div className="absolute right-0 mt-1 w-48 bg-white dark:bg-slate-800 rounded shadow-xl border border-slate-200 dark:border-slate-700 hidden group-hover:block z-10">
                        <button 
                            onClick={() => handleDownloadPDF(true)}
                            className="w-full text-left px-4 py-2 text-xs hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300"
                        >
                            Download Draft (Watermarked)
                        </button>
                        <button 
                            onClick={() => handleDownloadPDF(false)}
                            className="w-full text-left px-4 py-2 text-xs hover:bg-slate-50 dark:hover:bg-slate-700 text-[var(--primary)] font-bold flex items-center justify-between"
                        >
                            Finalize & Sign
                            <ShieldCheck className="h-3 w-3" />
                        </button>
                     </div>
                   </div>
                </div>
             </div>

             {reportData ? (
               <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                 
                 {/* Left Column: Form Requirements (Automatic Detection) */}
                 <div className="lg:col-span-1 space-y-4">
                    <h3 className="font-bold text-slate-800 dark:text-white text-sm uppercase flex items-center gap-2">
                        <FileWarning className="h-4 w-4 text-[var(--primary)]" />
                        Filing Requirements
                    </h3>
                    <div className="space-y-3">
                        {recommendations.length > 0 ? (
                            recommendations.map(rec => (
                                <div key={rec.id} className={`p-3 rounded-lg border text-sm ${
                                    rec.priority === 'REQUIRED' 
                                        ? 'bg-rose-50 dark:bg-rose-900/10 border-rose-200 dark:border-rose-900/30' 
                                        : rec.priority === 'CONDITIONAL' 
                                        ? 'bg-amber-50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-900/30'
                                        : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700'
                                }`}>
                                    <div className="flex items-start justify-between mb-1">
                                        <span className={`font-bold text-xs px-2 py-0.5 rounded-full ${
                                            rec.priority === 'REQUIRED' ? 'bg-rose-100 text-rose-700' : 
                                            rec.priority === 'CONDITIONAL' ? 'bg-amber-100 text-amber-700' : 
                                            'bg-slate-200 text-slate-600'
                                        }`}>{rec.priority}</span>
                                        <span className="text-[10px] text-slate-400">{rec.formCode}</span>
                                    </div>
                                    <p className="font-semibold text-slate-800 dark:text-slate-200 mb-1">{rec.title}</p>
                                    <p className="text-xs text-slate-600 dark:text-slate-400 mb-2">{rec.description}</p>
                                    <p className="text-[10px] text-slate-400 italic border-t border-slate-200 dark:border-slate-700/50 pt-1 mt-1">
                                        Trigger: {rec.triggerReason}
                                    </p>
                                </div>
                            ))
                        ) : (
                            <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700 text-center text-slate-500 text-xs">
                                No specific forms detected based on current profile.
                            </div>
                        )}
                    </div>
                 </div>

                 {/* Right Column: Schedule C Worksheet */}
                 <div className="lg:col-span-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm rounded-lg overflow-hidden font-mono text-sm">
                   {/* Header resembling Schedule C */}
                   <div className="bg-slate-100 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 p-4 flex justify-between items-center">
                      <div>
                         <h2 className="font-bold text-lg text-slate-900 dark:text-white">SCHEDULE C (Form 1040)</h2>
                         <p className="text-xs text-slate-500">Profit or Loss From Business (Draft Worksheet)</p>
                      </div>
                      <div className="text-right">
                         <p className="text-xs font-bold">{profile.entityType}</p>
                         <p className="text-xs text-slate-500">{profile.taxId}</p>
                      </div>
                   </div>

                   {/* Content */}
                   <div className="divide-y divide-slate-100 dark:divide-slate-700">
                      {/* Part I: Income */}
                      <div className="p-4 bg-slate-50/50 dark:bg-slate-800/50">
                         <p className="font-bold text-slate-700 dark:text-slate-300 mb-2 border-b border-slate-200 dark:border-slate-700 pb-1">Part I: Income</p>
                         <div className="flex justify-between py-1">
                            <span>1. Gross Receipts or Sales</span>
                            <span>{formatCurrency(reportData.grossReceipts)}</span>
                         </div>
                         <div className="flex justify-between py-1">
                            <span>4. Cost of Goods Sold (Part III)</span>
                            <span className="text-rose-500">({formatCurrency(reportData.costOfGoodsSold)})</span>
                         </div>
                         <div className="flex justify-between py-1 font-bold bg-slate-100 dark:bg-slate-700 px-2 rounded">
                            <span>5. Gross Profit</span>
                            <span>{formatCurrency(reportData.grossProfit)}</span>
                         </div>
                      </div>

                      {/* Part II: Expenses */}
                      <div className="p-4">
                         <p className="font-bold text-slate-700 dark:text-slate-300 mb-2 border-b border-slate-200 dark:border-slate-700 pb-1">Part II: Expenses</p>
                         {Object.entries(reportData.expenses).map(([name, amount]) => (
                            <div key={name} className="flex justify-between py-1 pl-4 text-slate-600 dark:text-slate-400">
                               <span>{name.split(':')[1]?.trim() || name}</span>
                               <span>{formatCurrency(amount as number)}</span>
                            </div>
                         ))}
                         <div className="flex justify-between py-1 mt-2 font-bold border-t border-slate-200 dark:border-slate-700 pt-2">
                            <span>28. Total Expenses</span>
                            <span className="text-rose-500">{formatCurrency((Object.values(reportData.expenses) as number[]).reduce((a, b) => a + b, 0))}</span>
                         </div>
                      </div>

                      {/* Summary */}
                      <div className="p-4 bg-indigo-50 dark:bg-indigo-900/20">
                         <div className="flex justify-between py-2 text-lg font-bold text-slate-900 dark:text-white">
                            <span>31. Net Profit (or Loss)</span>
                            <span className={reportData.netProfit >= 0 ? 'text-[var(--primary)]' : 'text-rose-500'}>
                               {formatCurrency(reportData.netProfit)}
                            </span>
                         </div>
                         <div className="mt-2 pt-2 border-t border-indigo-200 dark:border-indigo-800/50 flex justify-between text-xs text-slate-500 dark:text-slate-400">
                            <span>Est. Tax Liability ({profile.estimatedTaxRate}%)</span>
                            <span>{formatCurrency(reportData.estimatedTax)}</span>
                         </div>
                      </div>
                   </div>
                </div>
               </div>
             ) : (
               <div className="text-center py-10 text-slate-400">
                  Select a year and click Refresh to calculate requirements.
               </div>
             )}
          </div>
        )}
      </div>
      </div>
  );
};