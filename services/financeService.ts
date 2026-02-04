
import { Transaction, TransactionType, LedgerSummary, ChartDataPoint, CategoryDataPoint, InventoryItem, InventorySummary, QuarterlyReport } from '../types';
import { DEFAULT_CURRENCY_LOCALE, DEFAULT_CURRENCY_CODE } from '../constants';
import { loadSettings, loadInventory } from './storageService';

export const formatCurrency = (cents: number): string => {
  return new Intl.NumberFormat(DEFAULT_CURRENCY_LOCALE, {
    style: 'currency',
    currency: DEFAULT_CURRENCY_CODE,
  }).format(cents / 100);
};

export const calculateSummary = (transactions: Transaction[]): LedgerSummary => {
  const inventory = loadInventory();
  
  const base = transactions.reduce(
    (acc, t) => {
      if (t.type === TransactionType.CREDIT) {
        acc.totalIncomeCents += t.amountCents;
        acc.totalBalanceCents += t.amountCents;
        acc.totalRecoupedCents += t.amountCents;
      } else if (t.type === TransactionType.DEBIT) {
        acc.totalExpenseCents += t.amountCents;
        acc.totalBalanceCents -= t.amountCents;
      } else if (t.type === TransactionType.REFUND) {
        acc.totalIncomeCents -= t.amountCents;
        acc.totalBalanceCents -= t.amountCents;
        acc.totalRecoupedCents -= t.amountCents;
      }
      return acc;
    },
    { totalBalanceCents: 0, totalIncomeCents: 0, totalExpenseCents: 0, totalInvestedCents: 0, totalRecoupedCents: 0 }
  );

  // Capital invested = Sum cost of all inventory acquired
  base.totalInvestedCents = inventory.reduce((sum, item) => sum + (item.costPerUnitCents * item.quantity), 0);
  
  return base;
};

export const calculateInventorySummary = (inventory: InventoryItem[]): InventorySummary => {
  const inStock = inventory.filter(i => i.status === 'IN_STOCK');
  const totalValue = inStock.reduce((sum, item) => sum + (item.costPerUnitCents * item.quantity), 0);
  const recent = [...inStock].sort((a, b) => new Date(b.dateAcquired).getTime() - new Date(a.dateAcquired).getTime()).slice(0, 5);

  return {
    totalItems: inStock.reduce((sum, item) => sum + item.quantity, 0),
    totalValueCents: totalValue,
    recentItems: recent
  };
};

export const getChartData = (transactions: Transaction[]): ChartDataPoint[] => {
  const sorted = [...transactions].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  let runningBalance = 0;
  const data: ChartDataPoint[] = [];

  sorted.forEach(t => {
    if (t.type === TransactionType.CREDIT) {
      runningBalance += t.amountCents;
    } else if (t.type === TransactionType.DEBIT || t.type === TransactionType.REFUND) {
      runningBalance -= t.amountCents;
    }
    data.push({
      date: new Date(t.date).toLocaleDateString(),
      balance: runningBalance / 100
    });
  });
  return data;
};

export const getExpenseCategoryData = (transactions: Transaction[]): CategoryDataPoint[] => {
  const categoryMap: Record<string, number> = {};
  transactions.forEach(t => {
    if (t.type === TransactionType.DEBIT) {
      categoryMap[t.category] = (categoryMap[t.category] || 0) + t.amountCents;
    }
  });
  return Object.keys(categoryMap)
    .map(category => ({ name: category, value: categoryMap[category] / 100 }))
    .sort((a, b) => b.value - a.value);
};

export const getQuarterlyReports = (transactions: Transaction[]): QuarterlyReport[] => {
  const settings = loadSettings();
  const fiscalStartMonth = settings.fiscalYearStartMonth || 0; 
  const reportMap: Record<string, QuarterlyReport> = {};

  transactions.forEach(t => {
    const date = new Date(t.date);
    const monthIndex = date.getMonth();
    
    let adjustedMonth = monthIndex - fiscalStartMonth;
    if (adjustedMonth < 0) adjustedMonth += 12;

    const quarter = Math.floor(adjustedMonth / 3) + 1;
    let fiscalYear = date.getFullYear();
    if (monthIndex < fiscalStartMonth) fiscalYear -= 1;

    const key = `${fiscalYear}-Q${quarter}`;

    if (!reportMap[key]) {
      // Calculate Date Range for label
      const qStartMonth = (quarter - 1) * 3 + fiscalStartMonth;
      const startDate = new Date(fiscalYear, qStartMonth, 1);
      const endDate = new Date(fiscalYear, qStartMonth + 3, 0);
      
      const rangeStr = `${startDate.toLocaleDateString('en-US', {month: '2-digit', day: '2-digit'})} – ${endDate.toLocaleDateString('en-US', {month: '2-digit', day: '2-digit', year: 'numeric'})}`;

      reportMap[key] = {
        year: fiscalYear,
        quarter,
        label: `Q${quarter}`,
        dateRange: rangeStr,
        totalIncomeCents: 0,
        totalExpenseCents: 0,
        netProfitCents: 0,
        categories: {}
      };
    }

    const cat = t.category || 'Other';
    if (!reportMap[key].categories[cat]) {
      reportMap[key].categories[cat] = { income: 0, expense: 0, profit: 0 };
    }

    if (t.type === TransactionType.CREDIT) {
      reportMap[key].totalIncomeCents += t.amountCents;
      reportMap[key].netProfitCents += t.amountCents;
      reportMap[key].categories[cat].income += t.amountCents;
      reportMap[key].categories[cat].profit += t.amountCents;
    } else if (t.type === TransactionType.DEBIT) {
      reportMap[key].totalExpenseCents += t.amountCents;
      reportMap[key].netProfitCents -= t.amountCents;
      reportMap[key].categories[cat].expense += t.amountCents;
      reportMap[key].categories[cat].profit -= t.amountCents;
    } else if (t.type === TransactionType.REFUND) {
      reportMap[key].totalIncomeCents -= t.amountCents;
      reportMap[key].netProfitCents -= t.amountCents;
      reportMap[key].categories[cat].income -= t.amountCents;
      reportMap[key].categories[cat].profit -= t.amountCents;
    }
  });

  return Object.values(reportMap).sort((a, b) => {
    if (a.year !== b.year) return b.year - a.year;
    return b.quarter - a.quarter;
  });
};
