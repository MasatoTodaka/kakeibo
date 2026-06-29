import type { ClassificationRule, Transaction, BankAccount, IncomeEntry } from '../types';
import { DEFAULT_RULES } from '../config/classificationRules';

const RULES_KEY = 'kakeibo_rules';
const TRANSACTIONS_KEY = 'kakeibo_transactions';
const BANK_ACCOUNTS_KEY = 'kakeibo_bank_accounts';
const INCOME_KEY = 'kakeibo_income';

export function loadRules(): ClassificationRule[] {
  const stored = localStorage.getItem(RULES_KEY);
  if (stored) {
    return JSON.parse(stored);
  }
  return DEFAULT_RULES;
}

export function saveRules(rules: ClassificationRule[]): void {
  localStorage.setItem(RULES_KEY, JSON.stringify(rules));
}

export function loadTransactions(): Transaction[] {
  const stored = localStorage.getItem(TRANSACTIONS_KEY);
  if (stored) {
    return JSON.parse(stored);
  }
  return [];
}

export function saveTransactions(transactions: Transaction[]): void {
  localStorage.setItem(TRANSACTIONS_KEY, JSON.stringify(transactions));
}

export function clearTransactions(): void {
  localStorage.removeItem(TRANSACTIONS_KEY);
}

export function loadBankAccounts(): BankAccount[] {
  const stored = localStorage.getItem(BANK_ACCOUNTS_KEY);
  if (stored) return JSON.parse(stored);
  return [];
}

export function saveBankAccounts(accounts: BankAccount[]): void {
  localStorage.setItem(BANK_ACCOUNTS_KEY, JSON.stringify(accounts));
}

export function loadIncomeEntries(): IncomeEntry[] {
  const stored = localStorage.getItem(INCOME_KEY);
  if (stored) return JSON.parse(stored);
  return [];
}

export function saveIncomeEntries(entries: IncomeEntry[]): void {
  localStorage.setItem(INCOME_KEY, JSON.stringify(entries));
}

const IMPORTED_FILES_KEY = 'kakeibo_imported_files';

export function loadImportedHashes(): string[] {
  const stored = localStorage.getItem(IMPORTED_FILES_KEY);
  if (stored) return JSON.parse(stored);
  return [];
}

export function addImportedHash(hash: string): void {
  const hashes = loadImportedHashes();
  if (!hashes.includes(hash)) {
    hashes.push(hash);
    localStorage.setItem(IMPORTED_FILES_KEY, JSON.stringify(hashes));
  }
}

export function clearImportedHashes(): void {
  localStorage.removeItem(IMPORTED_FILES_KEY);
}

export async function hashFileContent(text: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}
