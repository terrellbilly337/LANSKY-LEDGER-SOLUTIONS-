
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
  shippingCostCents?: number; // Total shipping for the batch
  size?: string;
  color?: string;
  dateAcquired: string;
  status: InventoryStatus;
  linkedTransactionId?: string;
  imageData?: string; 
  soldPriceCents?: number; 
  soldDate?: string;
  projectedRoi?: number; 
}

export interface Transaction {
  id: string;
  description: string;
  amountCents: number;
  type: TransactionType;
  date: string;
  category: string;
  platform?: string;
  linkedItemId?: string; // For linking expenses to specific products
}

export interface LedgerSummary {
  totalBalanceCents: number;
  totalIncomeCents: number;
  totalExpenseCents: number;
  totalInvestedCents: number; 
  totalRecoupedCents: number; 
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

export interface ROIGoal {
  id: string;
  label: string;
  targetPercentage: number;
  completed: boolean;
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
  taxRatePercentage: number;
  fiscalYearStartMonth: number;
  categories: string[]; 
  expenseCategories: string[]; 
  platforms: string[];
  userProfile: UserProfile;
  roiGoals: ROIGoal[]; 
  logoData?: string; 
  companyLogoData?: string; 
  timeSettings: TimeSettings;
}

export interface QuarterlyReport {
  year: number;
  quarter: number;
  label: string;
  dateRange: string;
  totalIncomeCents: number;
  totalExpenseCents: number;
  netProfitCents: number;
  categories: Record<string, { income: number, expense: number, profit: number }>;
}

export interface MonthlyReport {
  year: number;
  month: number;
  label: string;
  totalRevenueCents: number;
  totalCogsCents: number;
  totalExpensesCents: number;
  netProfitCents: number;
  itemsSold: InventoryItem[];
}
