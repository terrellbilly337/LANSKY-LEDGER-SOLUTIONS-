
export enum TransactionType {
  CREDIT = 'CREDIT', // Sale
  DEBIT = 'DEBIT',   // Purchase/Expense
  REFUND = 'REFUND', // Return/Reversal
}

export type InventoryStatus = 'IN_STOCK' | 'SOLD';

export interface InventoryItem {
  id: string;
  name: string;
  category: string;
  platform?: string; 
  quantity: number;
  costPerUnitCents: number;
  dateAcquired: string;
  status: InventoryStatus;
  linkedTransactionId?: string;
  imageData?: string; // Base64 string for item photo
  
  // Fields for Sold History snapshot
  soldPriceCents?: number; 
  soldDate?: string;
}

export interface Transaction {
  id: string;
  description: string;
  amountCents: number; // Stored as integer
  type: TransactionType;
  date: string; // ISO string
  category: string;
  platform?: string;
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

export interface TimeSettings {
  timeZone: string;
  offsetMs: number; 
}

export interface AppSettings {
  themeColor: string;
  secondaryColor: string; 
  themeMode: 'dark' | 'light';
  inventoryAgingThreshold: number; 
  taxRatePercentage: number; // New: Tax Rate
  fiscalYearStartMonth: number; // 0 (Jan) - 11 (Dec)
  categories: string[]; 
  expenseCategories: string[]; 
  platforms: string[];
  userProfile: UserProfile;
  logoData?: string; 
  companyLogoData?: string; 
  timeSettings: TimeSettings;
}

export interface QuarterlyReport {
  year: number;
  quarter: number; // 1, 2, 3, 4 based on custom start
  label: string; // e.g., "Q1 2024"
  totalIncomeCents: number;
  totalExpenseCents: number;
  netProfitCents: number;
}
