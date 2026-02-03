
import { Transaction, TransactionType, InventoryItem, AppSettings } from '../types';
import { APP_STORAGE_KEY, INVENTORY_STORAGE_KEY, SETTINGS_STORAGE_KEY, DEFAULT_CATEGORIES, DEFAULT_EXPENSE_CATEGORIES, DEFAULT_PLATFORMS, DEFAULT_THEME_COLOR, DEFAULT_SECONDARY_COLOR, DEFAULT_INVENTORY_AGING_THRESHOLD } from '../constants';

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
): boolean => {
    const items = loadInventory();
    const transactions = loadTransactions();
    
    const itemIndex = items.findIndex(i => i.id === inventoryItemId);
    if (itemIndex === -1) return false;

    const originalItem = items[itemIndex];

    if (originalItem.quantity < quantitySold) {
        return false; // Prevent overselling
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

    return true;
};

/**
 * Processes a Refund.
 * 1. Restores inventory item to IN_STOCK.
 * 2. Creates a negative/REFUND transaction to offset the books.
 */
export const processRefund = (inventoryItemId: string): boolean => {
    const items = loadInventory();
    const transactions = loadTransactions();

    const itemIndex = items.findIndex(i => i.id === inventoryItemId);
    if (itemIndex === -1) return false;

    const soldItem = items[itemIndex];
    if (soldItem.status !== 'SOLD' || !soldItem.soldPriceCents) return false;

    // 1. Restore Inventory Status
    // We treat the refunded item as returned to stock.
    // We strip the 'sold' metadata but keep acquisition data.
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
        type: TransactionType.REFUND, // Handled as negative in calculations
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

// --- Settings ---

export const loadSettings = (): AppSettings => {
  try {
    const data = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (data) {
      const parsed = JSON.parse(data);
      // Ensure defaults if keys are missing in old data
      return {
        themeColor: parsed.themeColor || DEFAULT_THEME_COLOR,
        secondaryColor: parsed.secondaryColor || DEFAULT_SECONDARY_COLOR,
        themeMode: parsed.themeMode || 'dark',
        inventoryAgingThreshold: parsed.inventoryAgingThreshold || DEFAULT_INVENTORY_AGING_THRESHOLD,
        fiscalYearStartMonth: parsed.fiscalYearStartMonth !== undefined ? parsed.fiscalYearStartMonth : 0, // Default Jan
        categories: parsed.categories || DEFAULT_CATEGORIES,
        expenseCategories: parsed.expenseCategories || DEFAULT_EXPENSE_CATEGORIES,
        platforms: parsed.platforms || DEFAULT_PLATFORMS,
        userProfile: parsed.userProfile || { name: '', businessName: '', email: '', phone: '', notes: '' },
        logoData: parsed.logoData,
        companyLogoData: parsed.companyLogoData,
        timeSettings: parsed.timeSettings || { timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone, offsetMs: 0 }
      };
    }
  } catch (e) {
    console.error("Failed to load settings", e);
  }
  // Default fresh state
  return {
    themeColor: DEFAULT_THEME_COLOR,
    secondaryColor: DEFAULT_SECONDARY_COLOR,
    themeMode: 'dark',
    inventoryAgingThreshold: DEFAULT_INVENTORY_AGING_THRESHOLD,
    fiscalYearStartMonth: 0, // Jan
    categories: DEFAULT_CATEGORIES,
    expenseCategories: DEFAULT_EXPENSE_CATEGORIES,
    platforms: DEFAULT_PLATFORMS,
    userProfile: { name: '', businessName: '', email: '', phone: '', notes: '' },
    timeSettings: { timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone, offsetMs: 0 }
  };
};

export const saveSettings = (settings: AppSettings): void => {
  localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
};

export const clearAllData = (): void => {
  localStorage.clear();
};

// --- Backup/Restore ---

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
