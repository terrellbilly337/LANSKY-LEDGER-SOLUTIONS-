
import { Transaction, TransactionType, ScheduleCData, TaxCategoryMapping, InventoryItem, TaxProfile, TaxFormRecommendation } from '../types';

// Official Schedule C Line Items for Mapping
export const TAX_LINES = {
  INCOME: {
    GROSS_RECEIPTS: 'Part I Line 1: Gross Receipts or Sales',
    OTHER_INCOME: 'Part I Line 6: Other Income',
  },
  COGS: {
    PURCHASES: 'Part III Line 36: Purchases (COGS)',
    MATERIALS: 'Part III Line 38: Materials/Supplies (COGS)',
  },
  EXPENSES: {
    ADVERTISING: 'Part II Line 8: Advertising',
    COMMISSIONS: 'Part II Line 10: Commissions/Fees',
    CONTRACT_LABOR: 'Part II Line 11: Contract Labor',
    SUPPLIES: 'Part II Line 22: Supplies',
    OFFICE: 'Part II Line 18: Office Expense',
    LEGAL: 'Part II Line 17: Legal & Professional Services',
    TRAVEL: 'Part II Line 24: Travel',
    SHIPPING: 'Part II Line 27a: Other (Shipping)', // Common for e-commerce
    OTHER: 'Part II Line 27a: Other Expenses',
  }
};

// Platforms known to handle sales tax automatically (Marketplace Facilitator Laws)
const MARKETPLACE_FACILITATORS = ['eBay', 'Poshmark', 'Mercari', 'Amazon', 'Etsy', 'Whatnot', 'Depop'];

export const getDefaultMapping = (categories: string[], expenseCategories: string[]): TaxCategoryMapping => {
  const mapping: TaxCategoryMapping = {};

  // Map Sales Categories to Gross Receipts by default
  categories.forEach(c => {
    mapping[c] = TAX_LINES.INCOME.GROSS_RECEIPTS;
  });

  // Smart map expense categories
  expenseCategories.forEach(c => {
    const lower = c.toLowerCase();
    if (lower.includes('shipping') || lower.includes('postage')) mapping[c] = TAX_LINES.EXPENSES.SHIPPING;
    else if (lower.includes('fee') || lower.includes('platform')) mapping[c] = TAX_LINES.EXPENSES.COMMISSIONS;
    else if (lower.includes('supply') || lower.includes('packaging')) mapping[c] = TAX_LINES.EXPENSES.SUPPLIES;
    else if (lower.includes('ad') || lower.includes('marketing')) mapping[c] = TAX_LINES.EXPENSES.ADVERTISING;
    else if (lower.includes('inventory') || lower.includes('source')) mapping[c] = TAX_LINES.COGS.PURCHASES;
    else mapping[c] = TAX_LINES.EXPENSES.OTHER;
  });

  return mapping;
};

export const determineTaxForms = (
  profile: TaxProfile,
  transactions: Transaction[],
  year: number
): TaxFormRecommendation[] => {
  const forms: TaxFormRecommendation[] = [];
  
  // 1. FEDERAL INCOME TAX LOGIC (Based on Entity Type)
  switch (profile.entityType) {
    case 'SOLE_PROP':
    case 'LLC_SINGLE':
      forms.push({
        id: '1040_SCH_C',
        formCode: 'Form 1040 + Schedule C',
        title: 'Profit or Loss from Business',
        description: 'Primary form for Sole Proprietors and Single-Member LLCs to report business income/loss.',
        priority: 'REQUIRED',
        triggerReason: `Entity type is ${profile.entityType === 'SOLE_PROP' ? 'Sole Proprietorship' : 'Single-Member LLC'}.`
      });
      // Self Employment Tax
      forms.push({
        id: '1040_SCH_SE',
        formCode: 'Schedule SE',
        title: 'Self-Employment Tax',
        description: 'Calculates Social Security and Medicare tax for self-employed individuals.',
        priority: 'REQUIRED',
        triggerReason: 'Required if net earnings from self-employment are $400 or more.'
      });
      break;
    case 'PARTNERSHIP':
      forms.push({
        id: '1065',
        formCode: 'Form 1065',
        title: 'Return of Partnership Income',
        description: 'Partnerships must file an information return to report income, gains, losses, etc.',
        priority: 'REQUIRED',
        triggerReason: 'Entity type is Partnership.'
      });
      forms.push({
        id: 'SCH_K1',
        formCode: 'Schedule K-1',
        title: 'Partner\'s Share of Income',
        description: 'Must be issued to each partner.',
        priority: 'REQUIRED',
        triggerReason: 'Pass-through entity requirement.'
      });
      break;
    case 'CORP':
      forms.push({
        id: '1120',
        formCode: 'Form 1120',
        title: 'U.S. Corporation Income Tax Return',
        description: 'Income tax return for C Corporations.',
        priority: 'REQUIRED',
        triggerReason: 'Entity type is C-Corporation.'
      });
      break;
    case 'S_CORP':
       forms.push({
        id: '1120S',
        formCode: 'Form 1120-S',
        title: 'U.S. Income Tax Return for an S Corp',
        description: 'Tax return for S Corporations.',
        priority: 'REQUIRED',
        triggerReason: 'Entity type is S-Corporation.'
      });
      break;
  }

  // 2. MARKETPLACE / 1099-K LOGIC (Incoming Forms)
  const yearTx = transactions.filter(t => new Date(t.date).getFullYear() === year && t.type === TransactionType.CREDIT);
  
  // Aggregate revenue by platform
  const platformRevenue: Record<string, number> = {};
  yearTx.forEach(t => {
    if (t.platform) {
      platformRevenue[t.platform] = (platformRevenue[t.platform] || 0) + t.amountCents;
    }
  });

  Object.entries(platformRevenue).forEach(([platform, cents]) => {
    // Current federal threshold is nominally $600, though delayed implementation often confuses this.
    // We design for the strict rule to be safe.
    if (cents >= 60000) { // $600.00
      forms.push({
        id: `1099K_${platform}`,
        formCode: 'Form 1099-K (Incoming)',
        title: `Payment Card Transactions (${platform})`,
        description: `You should receive a 1099-K from ${platform} as sales exceeded $600. Verify this against your records.`,
        priority: 'INFORMATIONAL',
        triggerReason: `${platform} revenue ($${(cents/100).toFixed(2)}) exceeds the $600 IRS reporting threshold.`
      });
    }
  });

  // 3. SALES TAX NEXUS LOGIC (Physical Products)
  if (profile.productType === 'PHYSICAL') {
    if (profile.state) {
        forms.push({
            id: 'STATE_SALES_TAX',
            formCode: `${profile.state} Sales Tax Return`,
            title: 'State Sales Tax Filing',
            description: `Required for selling physical goods in ${profile.state}. Check if your platforms collect this for you (Marketplace Facilitator).`,
            priority: 'CONDITIONAL',
            triggerReason: `Physical products sold with nexus in ${profile.state}.`
        });
    } else {
        // Fallback if state is missing
        forms.push({
            id: 'STATE_SALES_TAX_MISSING',
            formCode: `State Sales Tax`,
            title: 'Sales Tax Filing (State Unknown)',
            description: `Selling physical goods usually requires state tax filing. Please update your address in Profile.`,
            priority: 'CONDITIONAL',
            triggerReason: `Physical products detected, but State is missing in profile.`
        });
    }

    // Check for "Own Website" or "Other" which implies no Marketplace Facilitator
    const hasDirectSales = yearTx.some(t => {
        const p = t.platform?.toLowerCase() || '';
        return !MARKETPLACE_FACILITATORS.some(mf => p.includes(mf.toLowerCase()));
    });

    if (hasDirectSales && profile.state) {
        forms.push({
             id: 'DIRECT_SALES_TAX',
             formCode: 'Direct Sales Tax Liability',
             title: 'Manual Sales Tax Remittance',
             description: 'You have sales on platforms that may NOT collect sales tax for you. You are responsible for remitting tax on these sales.',
             priority: 'REQUIRED',
             triggerReason: 'Transactions detected on non-facilitator platforms (Direct/Other).'
        });
    }
  }

  // 4. QUARTERLY ESTIMATED TAX
  if (profile.filingFrequency === 'QUARTERLY') {
      forms.push({
          id: '1040_ES',
          formCode: 'Form 1040-ES',
          title: 'Estimated Tax Payments',
          description: 'Quarterly vouchers for paying estimated tax on income not subject to withholding.',
          priority: 'REQUIRED',
          triggerReason: 'Filing frequency set to Quarterly in profile.'
      });
  }

  return forms;
};

export const generateScheduleCReport = (
  transactions: Transaction[], 
  inventory: InventoryItem[],
  year: number,
  mapping: TaxCategoryMapping,
  taxRate: number
): ScheduleCData => {
  
  let grossReceipts = 0;
  let purchasesCogs = 0;
  const expenses: Record<string, number> = {};

  // Filter transactions for the tax year
  const yearTx = transactions.filter(t => new Date(t.date).getFullYear() === year);

  yearTx.forEach(t => {
    // Determine the Tax Line for this category
    const taxLine = mapping[t.category] || (t.type === TransactionType.CREDIT ? TAX_LINES.INCOME.GROSS_RECEIPTS : TAX_LINES.EXPENSES.OTHER);
    const amount = t.amountCents;

    if (t.type === TransactionType.CREDIT) {
       // Income Logic
       if (taxLine === TAX_LINES.INCOME.GROSS_RECEIPTS) {
         grossReceipts += amount;
       }
    } else {
       // Expense Logic
       if (taxLine === TAX_LINES.COGS.PURCHASES || taxLine === TAX_LINES.COGS.MATERIALS) {
         purchasesCogs += amount;
       } else {
         // General Expenses
         expenses[taxLine] = (expenses[taxLine] || 0) + amount;
       }
    }
  });

  /* 
     Simple COGS Calculation for Cash Basis:
     Inventory at Beginning of Year 
     + Purchases (purchasesCogs)
     - Inventory at End of Year
     = Cost of Goods Sold
     
     *Note: For this "Lite" version, we are using the transaction method where 
     "Inventory Source" expenses are treated as Purchases.
  */
  
  const costOfGoodsSold = purchasesCogs; 
  const grossProfit = grossReceipts - costOfGoodsSold;
  
  const totalExpenses = Object.values(expenses).reduce((a, b) => a + b, 0);
  const netProfit = grossProfit - totalExpenses;
  
  // Estimate Tax (Self Employment ~15.3% + Income Tax bracket)
  // We use the user provided rate
  const estimatedTax = netProfit > 0 ? netProfit * (taxRate / 100) : 0;

  return {
    grossReceipts,
    costOfGoodsSold,
    grossProfit,
    expenses,
    netProfit,
    estimatedTax
  };
};

export const convertToCSV = (data: ScheduleCData, year: number): string => {
  const rows = [
    ['Lansky Ledger - Tax Worksheet', `Year: ${year}`],
    [''],
    ['Line Item', 'Amount'],
    ['Part I: Income', ''],
    ['Gross Receipts or Sales', (data.grossReceipts / 100).toFixed(2)],
    ['Cost of Goods Sold', (data.costOfGoodsSold / 100).toFixed(2)],
    ['Gross Profit', (data.grossProfit / 100).toFixed(2)],
    [''],
    ['Part II: Expenses', '']
  ];

  Object.entries(data.expenses).forEach(([key, value]) => {
    rows.push([key, (value / 100).toFixed(2)]);
  });

  rows.push(['']);
  rows.push(['Total Expenses', (Object.values(data.expenses).reduce((a, b) => a + b, 0) / 100).toFixed(2)]);
  rows.push(['']);
  rows.push(['Net Profit (or Loss)', (data.netProfit / 100).toFixed(2)]);
  rows.push(['']);
  rows.push(['Estimated Tax Liability', (data.estimatedTax / 100).toFixed(2)]);

  return rows.map(r => r.join(',')).join('\n');
};
