
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

// --- Tax Specific Types ---

export type EntityType = 'SOLE_PROP' | 'LLC_SINGLE' | 'PARTNERSHIP' | 'CORP' | 'S_CORP';
export type ProductType = 'PHYSICAL' | 'DIGITAL' | 'SERVICE' | 'HYBRID';

export interface TaxProfile {
  entityType: EntityType;
  productType: ProductType; // New field for Sales Tax logic
  taxId: string; // EIN or SSN
  taxIdType: 'EIN' | 'SSN';
  address: string;
  city: string;
  state: string;
  zip: string;
  filingFrequency: 'QUARTERLY' | 'ANNUALLY';
  estimatedTaxRate: number; // Percentage
}

export interface TaxFormRecommendation {
  id: string;
  formCode: string;
  title: string;
  description: string;
  priority: 'REQUIRED' | 'CONDITIONAL' | 'INFORMATIONAL';
  triggerReason: string;
}

// Maps a user category (e.g., "Sneakers") to a Tax Line (e.g., "Gross Receipts")
export interface TaxCategoryMapping {
  [userCategory: string]: string; // "Sneakers" -> "Gross Receipts"
}

export interface ScheduleCData {
  grossReceipts: number;
  costOfGoodsSold: number;
  grossProfit: number;
  expenses: Record<string, number>; // Line Item -> Amount
  netProfit: number;
  estimatedTax: number;
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
  
  // Tax Settings
  taxProfile?: TaxProfile;
  taxMapping?: TaxCategoryMapping;
}

export interface QuarterlyReport {
  year: number;
  quarter: number; // 1, 2, 3, 4
  totalIncomeCents: number;
  totalExpenseCents: number;
  netProfitCents: number;
}