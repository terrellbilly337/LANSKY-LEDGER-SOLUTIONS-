
import { Transaction, TransactionType, LedgerSummary, ChartDataPoint, CategoryDataPoint, InventoryItem, InventorySummary, QuarterlyReport } from '../types';
import { DEFAULT_CURRENCY_LOCALE, DEFAULT_CURRENCY_CODE } from '../constants';
import { loadSettings } from './storageService';

export const formatCurrency = (cents: number): string => {
  return new Intl.NumberFormat(DEFAULT_CURRENCY_LOCALE, {
    style: 'currency',
    currency: DEFAULT_CURRENCY_CODE,
  }).format(cents / 100);
};

export const calculateSummary = (transactions: Transaction[]): LedgerSummary => {
  return transactions.reduce(
    (acc, t) => {
      if (t.type === TransactionType.CREDIT) {
        acc.totalIncomeCents += t.amountCents;
        acc.totalBalanceCents += t.amountCents;
      } else if (t.type === TransactionType.DEBIT) {
        acc.totalExpenseCents += t.amountCents;
        acc.totalBalanceCents -= t.amountCents;
      } else if (t.type === TransactionType.REFUND) {
        // Refund reduces Income and Balance
        acc.totalIncomeCents -= t.amountCents;
        acc.totalBalanceCents -= t.amountCents;
      }
      return acc;
    },
    { totalBalanceCents: 0, totalIncomeCents: 0, totalExpenseCents: 0 }
  );
};

export const calculateInventorySummary = (inventory: InventoryItem[]): InventorySummary => {
  const inStock = inventory.filter(i => i.status === 'IN_STOCK');
  const totalValue = inStock.reduce((sum, item) => sum + (item.costPerUnitCents * item.quantity), 0);
  
  // Get 5 most recent
  const recent = [...inStock].sort((a, b) => new Date(b.dateAcquired).getTime() - new Date(a.dateAcquired).getTime()).slice(0, 5);

  return {
    totalItems: inStock.reduce((sum, item) => sum + item.quantity, 0),
    totalValueCents: totalValue,
    recentItems: recent
  };
};

export const getChartData = (transactions: Transaction[]): ChartDataPoint[] => {
  // Sort by date ascending
  const sorted = [...transactions].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  
  let runningBalance = 0;
  const data: ChartDataPoint[] = [];

  sorted.forEach(t => {
    if (t.type === TransactionType.CREDIT) {
      runningBalance += t.amountCents;
    } else if (t.type === TransactionType.DEBIT || t.type === TransactionType.REFUND) {
      runningBalance -= t.amountCents;
    }
    
    // Convert cents to standard units for charting
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
      if (!categoryMap[t.category]) {
        categoryMap[t.category] = 0;
      }
      categoryMap[t.category] += t.amountCents;
    }
  });

  return Object.keys(categoryMap)
    .map(category => ({
      name: category,
      value: categoryMap[category] / 100 // Convert to dollars for display
    }))
    .sort((a, b) => b.value - a.value); // Sort highest expense first
};

/**
 * Calculates quarterly reports based on user's fiscal year setting.
 */
export const getQuarterlyReports = (transactions: Transaction[]): QuarterlyReport[] => {
  const settings = loadSettings();
  const fiscalStartMonth = settings.fiscalYearStartMonth || 0; // 0 = Jan
  
  const reportMap: Record<string, QuarterlyReport> = {};

  transactions.forEach(t => {
    const date = new Date(t.date);
    const monthIndex = date.getMonth(); // 0-11
    
    // Calculate adjusted month relative to fiscal start
    // If fiscal starts in April (3), then April(3) is month 0 of fiscal year
    let adjustedMonth = monthIndex - fiscalStartMonth;
    if (adjustedMonth < 0) adjustedMonth += 12;

    const quarter = Math.floor(adjustedMonth / 3) + 1;
    
    // Determine Fiscal Year
    // If start is Jan: Jan 2024 -> FY2024
    // If start is July: July 2024 -> FY2025 (usually) or FY2024. 
    // Standard logic: The year associated is usually the year the fiscal year ENDS, 
    // or simply the calendar year of the start.
    // Simpler approach for this app: Group by calendar year of the *transaction*, 
    // but label quarters relative to start.
    // If fiscal start > 0, and current month < fiscal start, it belongs to previous Fiscal Year cycle?
    // Let's stick to simple "Fiscal Year" based on start date logic.
    
    // Simple logic: We calculate a unique key based on absolute time
    // But user wants to group by their quarters.
    
    let fiscalYear = date.getFullYear();
    // If fiscal year starts in e.g. July, dates before July are part of previous fiscal year
    if (monthIndex < fiscalStartMonth) {
        fiscalYear -= 1;
    }

    const key = `${fiscalYear}-Q${quarter}`;

    if (!reportMap[key]) {
      reportMap[key] = {
        year: fiscalYear,
        quarter,
        label: `Q${quarter} ${fiscalYear}`, // e.g. Q1 2024
        totalIncomeCents: 0,
        totalExpenseCents: 0,
        netProfitCents: 0
      };
    }

    if (t.type === TransactionType.CREDIT) {
      reportMap[key].totalIncomeCents += t.amountCents;
      reportMap[key].netProfitCents += t.amountCents;
    } else if (t.type === TransactionType.DEBIT) {
      reportMap[key].totalExpenseCents += t.amountCents;
      reportMap[key].netProfitCents -= t.amountCents;
    } else if (t.type === TransactionType.REFUND) {
       reportMap[key].totalIncomeCents -= t.amountCents;
       reportMap[key].netProfitCents -= t.amountCents; 
    }
  });

  return Object.values(reportMap).sort((a, b) => {
    if (a.year !== b.year) return b.year - a.year;
    return b.quarter - a.quarter;
  });
};
