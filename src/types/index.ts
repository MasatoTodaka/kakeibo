export type CardBrand =
  | 'olive'
  | 'nl-gold'
  | 'amazon-master'
  | 'smbc'
  | 'aeon'
  | 'epos'
  | 'paypay'
  | 'manual';

export type ExpenseType = 'fixed' | 'variable';

export interface Transaction {
  id: string;
  date: string;
  payee: string;
  amount: number;
  cardBrand: CardBrand;
  category: string;
  expenseType: ExpenseType;
  memo: string;
}

export interface ClassificationRule {
  pattern: string;
  category: string;
  expenseType: ExpenseType;
}

export interface CardSummary {
  cardBrand: CardBrand;
  totalAmount: number;
  fixedAmount: number;
  variableAmount: number;
  transactionCount: number;
}

export interface CategorySummary {
  category: string;
  amount: number;
  count: number;
  expenseType: ExpenseType;
}

export interface MonthlySummary {
  month: string;
  total: number;
  fixed: number;
  variable: number;
}

export interface BankAccount {
  id: string;
  name: string;
  balance: number;
  updatedAt: string;
}

export interface IncomeEntry {
  id: string;
  date: string;
  source: string;
  amount: number;
  memo: string;
}

export interface YearlySummary {
  year: string;
  totalIncome: number;
  totalExpense: number;
  balance: number;
  months: {
    month: string;
    income: number;
    expense: number;
  }[];
}

export const CARD_BRAND_LABELS: Record<CardBrand, string> = {
  olive: 'Olive',
  'nl-gold': 'NLゴールド',
  'amazon-master': 'Amazon Master',
  smbc: '三井住友カード',
  aeon: 'イオンカード',
  epos: 'エポスカード',
  paypay: 'PayPayカード',
  manual: '現金・PayPay・口座引落',
};

export const CARD_BRAND_COLORS: Record<CardBrand, { bg: string; text: string; chart: string }> = {
  olive: { bg: 'bg-lime-100', text: 'text-lime-700', chart: '#84CC16' },
  'nl-gold': { bg: 'bg-amber-100', text: 'text-amber-700', chart: '#F59E0B' },
  'amazon-master': { bg: 'bg-slate-100', text: 'text-slate-700', chart: '#475569' },
  smbc: { bg: 'bg-green-100', text: 'text-green-700', chart: '#22C55E' },
  aeon: { bg: 'bg-purple-100', text: 'text-purple-700', chart: '#A855F7' },
  epos: { bg: 'bg-red-100', text: 'text-red-700', chart: '#EF4444' },
  paypay: { bg: 'bg-rose-100', text: 'text-rose-700', chart: '#F43F5E' },
  manual: { bg: 'bg-cyan-100', text: 'text-cyan-700', chart: '#06B6D4' },
};
