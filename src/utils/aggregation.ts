import type {
  Transaction,
  CardBrand,
  CardSummary,
  CategorySummary,
  MonthlySummary,
} from '../types';

export function getCardSummaries(transactions: Transaction[]): CardSummary[] {
  const map = new Map<CardBrand, CardSummary>();

  for (const t of transactions) {
    const existing = map.get(t.cardBrand) || {
      cardBrand: t.cardBrand,
      totalAmount: 0,
      fixedAmount: 0,
      variableAmount: 0,
      transactionCount: 0,
    };
    existing.totalAmount += t.amount;
    existing.transactionCount += 1;
    if (t.expenseType === 'fixed') {
      existing.fixedAmount += t.amount;
    } else {
      existing.variableAmount += t.amount;
    }
    map.set(t.cardBrand, existing);
  }

  return Array.from(map.values());
}

export function getCategorySummaries(
  transactions: Transaction[]
): CategorySummary[] {
  const map = new Map<string, CategorySummary>();

  for (const t of transactions) {
    const existing = map.get(t.category) || {
      category: t.category,
      amount: 0,
      count: 0,
      expenseType: t.expenseType,
    };
    existing.amount += t.amount;
    existing.count += 1;
    map.set(t.category, existing);
  }

  return Array.from(map.values()).sort((a, b) => b.amount - a.amount);
}

export function getMonthlySummaries(
  transactions: Transaction[]
): MonthlySummary[] {
  const map = new Map<string, MonthlySummary>();

  for (const t of transactions) {
    const month = t.date.substring(0, 7); // YYYY-MM
    const existing = map.get(month) || {
      month,
      total: 0,
      fixed: 0,
      variable: 0,
    };
    existing.total += t.amount;
    if (t.expenseType === 'fixed') {
      existing.fixed += t.amount;
    } else {
      existing.variable += t.amount;
    }
    map.set(month, existing);
  }

  return Array.from(map.values()).sort((a, b) =>
    a.month.localeCompare(b.month)
  );
}

export function formatCurrency(amount: number): string {
  return `¥${amount.toLocaleString()}`;
}

export function getFiscalYear(month: string): string {
  const [y, m] = month.split('-').map(Number);
  return m >= 4 ? `${y}` : `${y - 1}`;
}

export function getFiscalYearLabel(fy: string): string {
  return `${fy}年度`;
}

export const FISCAL_MONTH_ORDER = [4, 5, 6, 7, 8, 9, 10, 11, 12, 1, 2, 3];

export function sortByFiscalMonth(a: string, b: string): number {
  const [ay, am] = a.split('-').map(Number);
  const [by, bm] = b.split('-').map(Number);
  const afy = am >= 4 ? ay : ay - 1;
  const bfy = bm >= 4 ? by : by - 1;
  if (afy !== bfy) return afy - bfy;
  return FISCAL_MONTH_ORDER.indexOf(am) - FISCAL_MONTH_ORDER.indexOf(bm);
}
