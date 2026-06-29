import type { Transaction, ClassificationRule, BankAccount, IncomeEntry } from '../types';
import { CARD_BRAND_LABELS } from '../types';

interface BackupData {
  version: 1;
  exportedAt: string;
  transactions: Transaction[];
  rules: ClassificationRule[];
  bankAccounts: BankAccount[];
  incomeEntries: IncomeEntry[];
}

export function exportJSON(
  transactions: Transaction[],
  rules: ClassificationRule[],
  bankAccounts: BankAccount[],
  incomeEntries: IncomeEntry[]
): void {
  const data: BackupData = {
    version: 1,
    exportedAt: new Date().toISOString(),
    transactions,
    rules,
    bankAccounts,
    incomeEntries,
  };
  const json = JSON.stringify(data, null, 2);
  const date = new Date().toISOString().slice(0, 10);
  download(json, `kakeibo_backup_${date}.json`, 'application/json');
}

export function importJSON(json: string): BackupData | null {
  try {
    const data = JSON.parse(json);
    if (!data.transactions || !Array.isArray(data.transactions)) return null;
    return data as BackupData;
  } catch {
    return null;
  }
}

export function exportCSV(transactions: Transaction[]): void {
  const header = ['日付', 'カード', '支払先', '金額', 'カテゴリ', '固定/変動', 'メモ'];
  const rows = transactions
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((t) => [
      t.date,
      CARD_BRAND_LABELS[t.cardBrand],
      csvEscape(t.payee),
      t.amount.toString(),
      t.category,
      t.expenseType === 'fixed' ? '固定費' : '変動費',
      csvEscape(t.memo),
    ].join(','));

  const bom = '﻿';
  const csv = bom + [header.join(','), ...rows].join('\n');
  const date = new Date().toISOString().slice(0, 10);
  download(csv, `kakeibo_${date}.csv`, 'text/csv;charset=utf-8');
}

function csvEscape(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function download(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
