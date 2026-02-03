
export enum TransactionType {
  CREDIT = 'CREDIT', // Sale
  DEBIT = 'DEBIT',   // Purchase/Expense
}

export type InventoryStatus = 'IN_STOCK' | 'SOLD';

export interface InventoryItem {
  id: string;
  name: string;
  category: string;
  platform?: string; // New field
  quantity: number;
  costPerUnitCents: number;
  dateAcquired: string;
  status: InventoryStatus;
  linkedTransactionId?: string;
}

export interface Transaction {
  id: string;
  description: string;
  amountCents: number; // Stored as integer to avoid floating point errors
  type: TransactionType;
  date: string; // ISO string
  category: string;
  platform?: string; // New field
}

export interface LedgerSummary {
  totalBalanceCents: number;
  totalIncomeCents: number;
  totalExpenseCents: number;
}

export interface InventorySummary {
  totalItems: number;
  totalValueCents: number;
  recentItems: InventoryItem[];
}

export interface ChartDataPoint {
  date: string;
  balance: number;
}

export interface CategoryDataPoint {
  name: string;
  value: number;
}

export interface UserProfile {
  name: string;
  businessName: string;
  email: string;
  phone: string;
  notes: string;
}

export interface AppSettings {
  themeColor: string;
  secondaryColor: string; // New field for background tint
  themeMode: 'dark' | 'light';
  inventoryAgingThreshold: number; // Days before notifying (30, 60, 90)
  categories: string[]; // Buy/Sell Categories
  expenseCategories: string[]; // Expense Categories
  platforms: string[];
  userProfile: UserProfile;
  logoData?: string; // Base64 encoded image string
}

export interface QuarterlyReport {
  year: number;
  quarter: number; // 1, 2, 3, 4
  totalIncomeCents: number;
  totalExpenseCents: number;
  netProfitCents: number;
}