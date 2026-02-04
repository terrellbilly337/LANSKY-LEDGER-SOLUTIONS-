
import { Transaction, TransactionType, InventoryItem, AppSettings } from '../types';
import { APP_STORAGE_KEY, INVENTORY_STORAGE_KEY, SETTINGS_STORAGE_KEY, DEFAULT_CATEGORIES, DEFAULT_EXPENSE_CATEGORIES, DEFAULT_PLATFORMS, DEFAULT_THEME_COLOR, DEFAULT_SECONDARY_COLOR, DEFAULT_INVENTORY_AGING_THRESHOLD, DEFAULT_TAX_RATE_PERCENTAGE } from '../constants';

// Helper to generate simple UUIDs locally
const generateId = (): string => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

// --- Transactions ---

export const loadTransactions = (): Transaction[] => {
  try {
    const data = localStorage.getItem(APP_STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    console.error("Failed to load ledger data", e);
    return [];
  }
};

export const saveTransaction = (transaction: Omit<Transaction, 'id'>): Transaction => {
  const transactions = loadTransactions();
  const newTransaction: Transaction = {
    ...transaction,
    id: generateId(),
  };
  transactions.push(newTransaction);
  localStorage.setItem(APP_STORAGE_KEY, JSON.stringify(transactions));
  console.debug(`[Storage] Saved Transaction: ${newTransaction.id}`);
  return newTransaction;
};

export const deleteTransaction = (id: string): void => {
  const transactions = loadTransactions();
  const filtered = transactions.filter(t => t.id !== id);
  localStorage.setItem(APP_STORAGE_KEY, JSON.stringify(filtered));
};

// --- Inventory ---

export const loadInventory = (): InventoryItem[] => {
  try {
    const data = localStorage.getItem(INVENTORY_STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    console.error("Failed to load inventory data", e);
    return [];
  }
};

export const saveInventoryItem = (item: Omit<InventoryItem, 'id'>): InventoryItem => {
  const items = loadInventory();
  const newItem: InventoryItem = {
    ...item,
    id: generateId(),
  };
  items.push(newItem);
  localStorage.setItem(INVENTORY_STORAGE_KEY, JSON.stringify(items));
  return newItem;
};

/**
 * Atomic processing of a sale.
 */
export const processSale = (
    transactionData: Omit<Transaction, 'id'>, 
    inventoryItemId: string, 
    quantitySold: number
): Transaction | null => {
    const items = loadInventory();
    const transactions = loadTransactions();
    
    const itemIndex = items.findIndex(i => i.id === inventoryItemId);
    if (itemIndex === -1) return null;

    const originalItem = items[itemIndex];

    if (originalItem.quantity < quantitySold) {
        return null; // Prevent overselling
    }

    // 1. Create Transaction
    const newTransaction: Transaction = {
        ...transactionData,
        id: generateId()
    };
    transactions.push(newTransaction);

    // 2. Handle Inventory Logic
    const soldPriceCents = Math.round(newTransaction.amountCents / quantitySold); // Per unit revenue

    if (originalItem.quantity === quantitySold) {
        // Full Sale
        items[itemIndex] = {
            ...originalItem,
            status: 'SOLD',
            linkedTransactionId: newTransaction.id,
            soldDate: newTransaction.date,
            soldPriceCents: soldPriceCents
        };
    } else {
        // Partial Sale
        items[itemIndex] = {
            ...originalItem,
            quantity: originalItem.quantity - quantitySold
        };

        // Create New Sold Snapshot
        const soldItemSnapshot: InventoryItem = {
            ...originalItem,
            id: generateId(),
            quantity: quantitySold,
            status: 'SOLD',
            linkedTransactionId: newTransaction.id,
            soldDate: newTransaction.date,
            soldPriceCents: soldPriceCents
        };
        items.push(soldItemSnapshot);
    }

    localStorage.setItem(APP_STORAGE_KEY, JSON.stringify(transactions));
    localStorage.setItem(INVENTORY_STORAGE_KEY, JSON.stringify(items));

    console.debug(`[Storage] Atomic Sale Processed: ${newTransaction.id}`);
    return newTransaction;
};

/**
 * Processes a Bundle Sale (Multiple items, single transaction).
 */
export const processBundleSale = (
    bundleItems: { id: string; qty: number }[],
    totalSaleCents: number,
    platform: string,
    date: string
): Transaction | null => {
    const items = loadInventory();
    const transactions = loadTransactions();

    // 1. Validate Stock Levels first
    for (const bundleItem of bundleItems) {
        const invItem = items.find(i => i.id === bundleItem.id);
        if (!invItem || invItem.quantity < bundleItem.qty) {
            return null; // Validation failed
        }
    }

    // 2. Create Single Transaction
    const description = `Bundle Sale: ${bundleItems.length} Items`;
    const newTransaction: Transaction = {
        id: generateId(),
        amountCents: totalSaleCents,
        date: date,
        type: TransactionType.CREDIT,
        category: 'Bundle Sale',
        platform: platform,
        description: description
    };
    transactions.push(newTransaction);

    // 3. Process Inventory & Distribute Revenue based on COGS weight
    let totalBundleCost = 0;
    const bundleDetails = bundleItems.map(b => {
        const item = items.find(i => i.id === b.id)!;
        const totalItemCost = item.costPerUnitCents * b.qty;
        totalBundleCost += totalItemCost;
        return { ...b, item, totalItemCost };
    });

    bundleDetails.forEach(detail => {
        const itemIndex = items.findIndex(i => i.id === detail.id);
        const originalItem = items[itemIndex];

        let proportionalSaleCents = 0;
        if (totalBundleCost > 0) {
            const weight = detail.totalItemCost / totalBundleCost;
            proportionalSaleCents = Math.round(totalSaleCents * weight);
        } else {
            const totalQty = bundleItems.reduce((acc, curr) => acc + curr.qty, 0);
            proportionalSaleCents = Math.round((totalSaleCents / totalQty) * detail.qty);
        }
        
        const unitSoldPrice = Math.round(proportionalSaleCents / detail.qty);

        if (originalItem.quantity === detail.qty) {
            // Full Sale
            items[itemIndex] = {
                ...originalItem,
                status: 'SOLD',
                linkedTransactionId: newTransaction.id,
                soldDate: newTransaction.date,
                soldPriceCents: unitSoldPrice
            };
        } else {
            // Partial Sale
            items[itemIndex] = {
                ...originalItem,
                quantity: originalItem.quantity - detail.qty
            };

            const soldItemSnapshot: InventoryItem = {
                ...originalItem,
                id: generateId(),
                quantity: detail.qty,
                status: 'SOLD',
                linkedTransactionId: newTransaction.id,
                soldDate: newTransaction.date,
                soldPriceCents: unitSoldPrice
            };
            items.push(soldItemSnapshot);
        }
    });

    localStorage.setItem(APP_STORAGE_KEY, JSON.stringify(transactions));
    localStorage.setItem(INVENTORY_STORAGE_KEY, JSON.stringify(items));

    console.debug(`[Storage] Atomic Bundle Processed: ${newTransaction.id}`);
    return newTransaction;
};

/**
 * Processes a Refund.
 */
export const processRefund = (inventoryItemId: string): boolean => {
    const items = loadInventory();
    const transactions = loadTransactions();

    const itemIndex = items.findIndex(i => i.id === inventoryItemId);
    if (itemIndex === -1) return false;

    const soldItem = items[itemIndex];
    if (soldItem.status !== 'SOLD' || !soldItem.soldPriceCents) return false;

    // 1. Restore Inventory Status
    items[itemIndex] = {
        ...soldItem,
        status: 'IN_STOCK',
        linkedTransactionId: undefined,
        soldDate: undefined,
        soldPriceCents: undefined
    };

    // 2. Create Refund Transaction
    const totalRefundAmount = (soldItem.soldPriceCents || 0) * soldItem.quantity;
    const refundTransaction: Transaction = {
        id: generateId(),
        type: TransactionType.REFUND, 
        amountCents: totalRefundAmount,
        date: new Date().toISOString(),
        category: 'Refunds',
        platform: soldItem.platform,
        description: `Refund: ${soldItem.name} (x${soldItem.quantity})`
    };
    transactions.push(refundTransaction);

    localStorage.setItem(APP_STORAGE_KEY, JSON.stringify(transactions));
    localStorage.setItem(INVENTORY_STORAGE_KEY, JSON.stringify(items));

    return true;
};

export const deleteInventoryItem = (id: string): void => {
  const items = loadInventory();
  const filtered = items.filter(i => i.id !== id);
  localStorage.setItem(INVENTORY_STORAGE_KEY, JSON.stringify(filtered));
};

/**
 * Destructive deletion of all activity for a specific month.
 */
export const deleteMonthlyData = (year: number, month: number): void => {
    const transactions = loadTransactions();
    const inventory = loadInventory();

    const filteredTransactions = transactions.filter(t => {
        const d = new Date(t.date);
        return d.getFullYear() !== year || d.getMonth() !== month;
    });

    const filteredInventory = inventory.filter(item => {
        if (item.status === 'SOLD' && item.soldDate) {
            const d = new Date(item.soldDate);
            // If the item was sold this month, we remove it. 
            // Note: In this system, SOLD records are snapshots. Removing them doesn't 
            // restore the original stock unless we specifically write logic to merge it back.
            // For "Scrubbing", we assume the user wants the activity wiped.
            return d.getFullYear() !== year || d.getMonth() !== month;
        }
        return true;
    });

    localStorage.setItem(APP_STORAGE_KEY, JSON.stringify(filteredTransactions));
    localStorage.setItem(INVENTORY_STORAGE_KEY, JSON.stringify(filteredInventory));
};

// --- Settings ---

export const loadSettings = (): AppSettings => {
  try {
    const data = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (data) {
      const parsed = JSON.parse(data);
      return {
        themeColor: parsed.themeColor || DEFAULT_THEME_COLOR,
        secondaryColor: parsed.secondaryColor || DEFAULT_SECONDARY_COLOR,
        themeMode: parsed.themeMode || 'dark',
        inventoryAgingThreshold: parsed.inventoryAgingThreshold || DEFAULT_INVENTORY_AGING_THRESHOLD,
        fiscalYearStartMonth: parsed.fiscalYearStartMonth !== undefined ? parsed.fiscalYearStartMonth : 0, 
        taxRatePercentage: parsed.taxRatePercentage !== undefined ? parsed.taxRatePercentage : DEFAULT_TAX_RATE_PERCENTAGE, 
        categories: parsed.categories || DEFAULT_CATEGORIES,
        expenseCategories: parsed.expenseCategories || DEFAULT_EXPENSE_CATEGORIES,
        platforms: parsed.platforms || DEFAULT_PLATFORMS,
        userProfile: parsed.userProfile || { name: '', businessName: '', email: '', phone: '', notes: '' },
        roiGoals: parsed.roiGoals || [],
        logoData: parsed.logoData,
        companyLogoData: parsed.companyLogoData,
        timeSettings: parsed.timeSettings || { timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone, offsetMs: 0 }
      };
    }
  } catch (e) {
    console.error("Failed to load settings", e);
  }
  return {
    themeColor: DEFAULT_THEME_COLOR,
    secondaryColor: DEFAULT_SECONDARY_COLOR,
    themeMode: 'dark',
    inventoryAgingThreshold: DEFAULT_INVENTORY_AGING_THRESHOLD,
    fiscalYearStartMonth: 0, 
    taxRatePercentage: DEFAULT_TAX_RATE_PERCENTAGE,
    categories: DEFAULT_CATEGORIES,
    expenseCategories: DEFAULT_EXPENSE_CATEGORIES,
    platforms: DEFAULT_PLATFORMS,
    userProfile: { name: '', businessName: '', email: '', phone: '', notes: '' },
    roiGoals: [],
    timeSettings: { timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone, offsetMs: 0 }
  };
};

export const saveSettings = (settings: AppSettings): void => {
  localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
};

export const clearAllData = (): void => {
  localStorage.clear();
};

export const importData = (jsonData: string): boolean => {
  try {
    const parsed = JSON.parse(jsonData);
    if (Array.isArray(parsed)) {
      localStorage.setItem(APP_STORAGE_KEY, JSON.stringify(parsed));
      return true;
    } else if (parsed.transactions && Array.isArray(parsed.transactions)) {
      localStorage.setItem(APP_STORAGE_KEY, JSON.stringify(parsed.transactions));
      if (parsed.inventory) {
        localStorage.setItem(INVENTORY_STORAGE_KEY, JSON.stringify(parsed.inventory));
      }
      if (parsed.settings) {
        localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(parsed.settings));
      }
      return true;
    }
    return false;
  } catch (e) {
    return false;
  }
};

export const exportData = (): string => {
  const transactions = loadTransactions();
  const inventory = loadInventory();
  const settings = loadSettings();
  return JSON.stringify({ transactions, inventory, settings }, null, 2);
};
