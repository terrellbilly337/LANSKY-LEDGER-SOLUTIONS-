import { Transaction, TransactionType, LedgerSummary, ChartDataPoint, CategoryDataPoint, InventoryItem, InventorySummary, QuarterlyReport } from '../types';
import { DEFAULT_CURRENCY_LOCALE, DEFAULT_CURRENCY_CODE } from '../constants';

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
      } else {
        acc.totalExpenseCents += t.amountCents;
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
    } else {
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

export const getQuarterlyReports = (transactions: Transaction[]): QuarterlyReport[] => {
  const reportMap: Record<string, QuarterlyReport> = {};

  transactions.forEach(t => {
    const date = new Date(t.date);
    const year = date.getFullYear();
    const month = date.getMonth() + 1; // 1-12
    const quarter = Math.ceil(month / 3);
    const key = `${year}-Q${quarter}`;

    if (!reportMap[key]) {
      reportMap[key] = {
        year,
        quarter,
        totalIncomeCents: 0,
        totalExpenseCents: 0,
        netProfitCents: 0
      };
    }

    if (t.type === TransactionType.CREDIT) {
      reportMap[key].totalIncomeCents += t.amountCents;
      reportMap[key].netProfitCents += t.amountCents;
    } else {
      reportMap[key].totalExpenseCents += t.amountCents;
      reportMap[key].netProfitCents -= t.amountCents;
    }
  });

  return Object.values(reportMap).sort((a, b) => {
    if (a.year !== b.year) return b.year - a.year;
    return b.quarter - a.quarter;
  });
};
