
export const APP_STORAGE_KEY = 'lansky_ledger_v1';
export const APP_PIN_KEY = 'lansky_ledger_pin_hash';
export const INVENTORY_STORAGE_KEY = 'lansky_inventory_v1';
export const SETTINGS_STORAGE_KEY = 'lansky_settings_v1';

export const DEFAULT_PLATFORMS = [
  'eBay',
  'Poshmark',
  'Mercari',
  'Facebook',
  'Whatnot',
  'Other'
];

// Product/Inventory Categories
export const DEFAULT_CATEGORIES = [
  'Sneakers',
  'Apparel',
  'Electronics',
  'Collectibles',
  'Accessories',
  'Other'
];

// Operational Expense Categories
export const DEFAULT_EXPENSE_CATEGORIES = [
  'Shipping',
  'Tools/Supplies',
  'Platform Fees',
  'Packaging',
  'Inventory Source', // Keeping this if users want to manually categorize a debit as sourcing without using the Source mode
  'Other'
];

export const DEFAULT_THEME_COLOR = '#4f46e5'; // Indigo-600
export const DEFAULT_SECONDARY_COLOR = '#64748b'; // Slate-500 (Base for backgrounds)
export const DEFAULT_INVENTORY_AGING_THRESHOLD = 30; // Days

export const DEFAULT_CURRENCY_LOCALE = 'en-US';
export const DEFAULT_CURRENCY_CODE = 'USD';