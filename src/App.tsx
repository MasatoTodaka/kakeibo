import { useState, useCallback, useEffect, useMemo } from 'react';
import type { Transaction, CardBrand, ClassificationRule, BankAccount, IncomeEntry } from './types';
import { parseCSV, autoParseCSV, readFileAsText } from './parsers';
import { getFiscalYear, sortByFiscalMonth } from './utils/aggregation';
import { classifyTransactions } from './utils/classifier';
import {
  loadRules,
  saveRules,
  loadTransactions,
  saveTransactions,
  clearTransactions,
  loadBankAccounts,
  saveBankAccounts,
  loadIncomeEntries,
  saveIncomeEntries,
  loadImportedHashes,
  addImportedHash,
  clearImportedHashes,
  hashFileContent,
} from './utils/storage';
import { FileUpload } from './components/FileUpload';
import { MonthSelector } from './components/MonthSelector';
import { SummaryCards } from './components/SummaryCards';
import { CategoryChart } from './components/CategoryChart';
import { MonthlyTrend } from './components/MonthlyTrend';
import { CardBreakdown } from './components/CardBreakdown';
import { PayeeSummary } from './components/PayeeSummary';
import { TransactionTable } from './components/TransactionTable';
import { RuleEditor } from './components/RuleEditor';
import { BankAccountPanel } from './components/BankAccountPanel';
import { IncomePanel } from './components/IncomePanel';
import { AnnualSummary } from './components/AnnualSummary';
import { ManualEntry } from './components/ManualEntry';
import { exportJSON, importJSON, exportCSV } from './utils/exportImport';

type TabId = 'expense' | 'annual';

const NAV_ITEMS: { id: TabId; label: string; icon: string }[] = [
  { id: 'expense', label: '支出分析', icon: '&#9776;' },
  { id: 'annual', label: '年間収支', icon: '&#9733;' },
];

export default function App() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [rules, setRules] = useState<ClassificationRule[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [incomeEntries, setIncomeEntries] = useState<IncomeEntry[]>([]);
  const [ruleEditorOpen, setRuleEditorOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>('expense');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    setRules(loadRules());
    setTransactions(loadTransactions());
    setBankAccounts(loadBankAccounts());
    setIncomeEntries(loadIncomeEntries());
  }, []);

  const availableMonths = useMemo(() => {
    const monthSet = new Set<string>();
    for (const t of transactions) monthSet.add(t.date.substring(0, 7));
    for (const e of incomeEntries) monthSet.add(e.date.substring(0, 7));
    return Array.from(monthSet).sort(sortByFiscalMonth);
  }, [transactions, incomeEntries]);

  const filteredTransactions = useMemo(() => {
    if (!selectedMonth) return transactions;
    if (selectedMonth.startsWith('FY:')) {
      const fy = selectedMonth.slice(3);
      return transactions.filter((t) => getFiscalYear(t.date.substring(0, 7)) === fy);
    }
    return transactions.filter((t) => t.date.startsWith(selectedMonth));
  }, [transactions, selectedMonth]);

  const isFiscalYearOrAll = !selectedMonth || selectedMonth.startsWith('FY:');

  const totalExpense = filteredTransactions.reduce((s, t) => s + t.amount, 0);

  const handleUpload = useCallback(
    async (files: File[], cardBrand: CardBrand | 'auto') => {
      setLoading(true);
      try {
        const results: { file: string; brand: string; count: number }[] = [];
        const skipped: string[] = [];
        const failed: string[] = [];
        let allNew: Transaction[] = [];

        for (const file of files) {
          const text = await readFileAsText(file);
          const fileHash = await hashFileContent(text);
          if (loadImportedHashes().includes(fileHash)) {
            skipped.push(file.name);
            continue;
          }

          let raw;
          console.log(`[家計簿] ${file.name}: デコード先頭:`, text.substring(0, 100));

          if (cardBrand === 'auto') {
            const result = autoParseCSV(text, file.name);
            if (!result) { failed.push(file.name); continue; }
            raw = result.transactions;
          } else {
            raw = parseCSV(text, cardBrand);
          }

          if (raw.length === 0) { failed.push(file.name); continue; }

          const classified = classifyTransactions(raw, rules);
          allNew = [...allNew, ...classified];
          addImportedHash(fileHash);

          const { CARD_BRAND_LABELS } = await import('./types');
          const brands = [...new Set(raw.map((t) => t.cardBrand))];
          results.push({
            file: file.name,
            brand: brands.map((b) => CARD_BRAND_LABELS[b]).join('/'),
            count: raw.length,
          });
        }

        if (allNew.length > 0) {
          const merged = [...transactions, ...allNew];
          setTransactions(merged);
          saveTransactions(merged);
        }

        const lines: string[] = [];
        if (results.length > 0) {
          lines.push(...results.map((r) => `${r.file}: ${r.brand} ${r.count}件`));
        }
        if (skipped.length > 0) {
          lines.push(`\n読み込み済み: ${skipped.join(', ')}`);
        }
        if (failed.length > 0) {
          lines.push(`\n読み込み失敗: ${failed.join(', ')}`);
        }
        if (lines.length > 0) {
          alert(lines.join('\n'));
        }
      } finally {
        setLoading(false);
      }
    },
    [rules, transactions]
  );

  const handleUpdateTransaction = useCallback(
    (id: string, updates: Partial<Transaction>) => {
      const updated = transactions.map((t) => (t.id === id ? { ...t, ...updates } : t));
      setTransactions(updated);
      saveTransactions(updated);

      if (updates.category || updates.expenseType) {
        const txn = updated.find((t) => t.id === id);
        if (txn) {
          const newCategory = txn.category;
          const newType = txn.expenseType;
          const pattern = txn.payee;
          const existing = rules.find(
            (r) => r.pattern === pattern
          );
          if (existing) {
            if (existing.category !== newCategory || existing.expenseType !== newType) {
              const newRules = rules.map((r) =>
                r.pattern === pattern ? { ...r, category: newCategory, expenseType: newType } : r
              );
              setRules(newRules);
              saveRules(newRules);
            }
          } else {
            const newRules = [...rules, { pattern, category: newCategory, expenseType: newType }];
            setRules(newRules);
            saveRules(newRules);
          }
        }
      }
    },
    [transactions, rules]
  );

  const handleDeleteTransaction = useCallback(
    (id: string) => {
      const updated = transactions.filter((t) => t.id !== id);
      setTransactions(updated);
      saveTransactions(updated);
    },
    [transactions]
  );

  const handleSaveRules = useCallback(
    (newRules: ClassificationRule[]) => {
      setRules(newRules);
      saveRules(newRules);
      const reclassified = transactions.map((t) => {
        const payeeUpper = t.payee.toUpperCase();
        for (const rule of newRules) {
          if (payeeUpper.includes(rule.pattern.toUpperCase())) {
            return { ...t, category: rule.category, expenseType: rule.expenseType };
          }
        }
        return { ...t, category: 'その他', expenseType: 'variable' as const };
      });
      setTransactions(reclassified);
      saveTransactions(reclassified);
    },
    [transactions]
  );

  const handleSaveBankAccounts = useCallback((accounts: BankAccount[]) => {
    setBankAccounts(accounts);
    saveBankAccounts(accounts);
  }, []);

  const handleSaveIncomeEntries = useCallback((entries: IncomeEntry[]) => {
    setIncomeEntries(entries);
    saveIncomeEntries(entries);
  }, []);

  const handleClearAll = useCallback(() => {
    if (!window.confirm('全データ（明細・口座・収入）を削除しますか？')) return;
    setTransactions([]);
    setBankAccounts([]);
    setIncomeEntries([]);
    setSelectedMonth(null);
    clearTransactions();
    clearImportedHashes();
    saveBankAccounts([]);
    saveIncomeEntries([]);
  }, []);

  const handleClearTransactions = useCallback(() => {
    if (!window.confirm('支出明細をすべて削除しますか？（口座・収入データは残ります）')) return;
    setTransactions([]);
    setSelectedMonth(null);
    clearTransactions();
    clearImportedHashes();
  }, []);

  const handleClearAnnual = useCallback(() => {
    if (!window.confirm('口座残高・収入データを削除しますか？（支出明細は残ります）')) return;
    setBankAccounts([]);
    setIncomeEntries([]);
    saveBankAccounts([]);
    saveIncomeEntries([]);
  }, []);

  const handleClearMonth = useCallback(() => {
    if (!selectedMonth || selectedMonth.startsWith('FY:')) {
      alert('削除する月を選択してください。\n表示期間で年度を選び、月ボタンを押してから実行してください。');
      return;
    }
    const label = `${selectedMonth.split('-')[0]}年${parseInt(selectedMonth.split('-')[1])}月`;
    const count = filteredTransactions.length;
    if (count === 0) {
      alert(`${label}の明細はありません。`);
      return;
    }
    if (!window.confirm(`${label}の明細${count}件を削除しますか？`)) return;
    const remaining = transactions.filter((t) => !t.date.startsWith(selectedMonth));
    setTransactions(remaining);
    saveTransactions(remaining);
    setSelectedMonth(null);
  }, [selectedMonth, transactions, filteredTransactions]);

  const handleManualAdd = useCallback(
    (newItems: Transaction | Transaction[]) => {
      const arr = Array.isArray(newItems) ? newItems : [newItems];
      const merged = [...transactions, ...arr];
      setTransactions(merged);
      saveTransactions(merged);
    },
    [transactions]
  );

  const handleExportJSON = useCallback(() => {
    exportJSON(transactions, rules, bankAccounts, incomeEntries);
  }, [transactions, rules, bankAccounts, incomeEntries]);

  const handleExportCSV = useCallback(() => {
    exportCSV(transactions);
  }, [transactions]);

  const handleImportJSON = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      const text = await file.text();
      const data = importJSON(text);
      if (!data) { alert('バックアップファイルの読み込みに失敗しました。'); return; }
      if (!window.confirm(`${data.transactions.length}件の明細を復元します。現在のデータは上書きされます。`)) return;
      setTransactions(data.transactions);
      setRules(data.rules);
      setBankAccounts(data.bankAccounts || []);
      setIncomeEntries(data.incomeEntries || []);
      saveTransactions(data.transactions);
      saveRules(data.rules);
      saveBankAccounts(data.bankAccounts || []);
      saveIncomeEntries(data.incomeEntries || []);
      clearImportedHashes();
      alert('復元しました。');
    };
    input.click();
  }, []);

  const hasData = transactions.length > 0 || incomeEntries.length > 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50/30 flex">
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-56 bg-slate-900 text-white transform transition-transform duration-200 lg:translate-x-0 overflow-y-auto ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center gap-3 px-5 py-5 border-b border-slate-700/50">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-sm font-bold">
            K
          </div>
          <span className="text-lg font-semibold tracking-tight">家計簿</span>
        </div>

        <nav className="mt-4 px-3 space-y-1">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                setActiveTab(item.id);
                setSidebarOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                activeTab === item.id
                  ? 'bg-white/10 text-white'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <span dangerouslySetInnerHTML={{ __html: item.icon }} />
              {item.label}
            </button>
          ))}
        </nav>

        <div className="mt-6 px-3 space-y-1">
          <div className="px-3 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
            ツール
          </div>
          <button
            onClick={() => { setRuleEditorOpen(true); setSidebarOpen(false); }}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
          >
            分類ルール設定
          </button>
          <button
            onClick={handleImportJSON}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
          >
            バックアップ復元
          </button>
          {transactions.length > 0 && (
            <>
              <button
                onClick={handleExportJSON}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
              >
                バックアップ保存
              </button>
              <button
                onClick={handleExportCSV}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
              >
                CSV出力
              </button>
              <div className="mt-2 pt-2 border-t border-slate-700/50 space-y-1">
                <div className="px-3 py-1 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  データクリア
                </div>
                <button
                  onClick={handleClearMonth}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors"
                >
                  選択中の月を削除
                </button>
                <button
                  onClick={handleClearTransactions}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors"
                >
                  支出明細を削除
                </button>
                <button
                  onClick={handleClearAnnual}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors"
                >
                  口座・収入を削除
                </button>
                <button
                  onClick={handleClearAll}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors"
                >
                  全データ削除
                </button>
              </div>
            </>
          )}
        </div>
      </aside>

      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col min-h-screen min-w-0 lg:ml-56">
        {/* Top bar */}
        <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-slate-200/60">
          <div className="flex items-center justify-between px-4 lg:px-8 h-14">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden w-9 h-9 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-600"
              >
                <span dangerouslySetInnerHTML={{ __html: '&#9776;' }} />
              </button>
              <h1 className="text-lg font-semibold text-slate-800">
                {activeTab === 'expense' ? '支出分析' : '年間収支'}
              </h1>
            </div>
            {hasData && (
              <div className="flex items-center gap-4 text-sm">
                <span className="text-slate-500">
                  {transactions.length}件の明細
                </span>
                {totalExpense > 0 && (
                  <span className="font-semibold text-slate-800">
                    &yen;{totalExpense.toLocaleString()}
                  </span>
                )}
              </div>
            )}
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 px-4 lg:px-8 py-6">
          <div className="max-w-6xl mx-auto space-y-6">
            {activeTab === 'expense' && (
              <>
                <FileUpload onUpload={handleUpload} />
                <ManualEntry onAdd={handleManualAdd} />

                {loading && (
                  <div className="text-center py-8 text-slate-400">
                    読み込み中...
                  </div>
                )}

                {transactions.length > 0 && (
                  <>
                    <MonthSelector
                      months={availableMonths}
                      selectedMonth={selectedMonth}
                      onSelect={setSelectedMonth}
                    />
                    <SummaryCards transactions={filteredTransactions} />
                    {isFiscalYearOrAll && (
                      <MonthlyTrend transactions={filteredTransactions} />
                    )}
                    <CardBreakdown transactions={filteredTransactions} />
                    <CategoryChart transactions={filteredTransactions} />
                    <PayeeSummary transactions={filteredTransactions} />
                    <TransactionTable
                      transactions={filteredTransactions}
                      onUpdateTransaction={handleUpdateTransaction}
                      onDeleteTransaction={handleDeleteTransaction}
                    />
                  </>
                )}

                {transactions.length === 0 && !loading && (
                  <div className="text-center py-24">
                    <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-2xl font-bold">
                      K
                    </div>
                    <div className="text-xl font-semibold text-slate-700 mb-2">
                      家計簿を始めましょう
                    </div>
                    <div className="text-sm text-slate-400">
                      CSVファイルをアップロードしてカード利用明細を分析できます
                    </div>
                  </div>
                )}
              </>
            )}

            {activeTab === 'annual' && (
              <>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <BankAccountPanel
                    accounts={bankAccounts}
                    onSave={handleSaveBankAccounts}
                  />
                  <IncomePanel
                    entries={incomeEntries}
                    onSave={handleSaveIncomeEntries}
                    selectedMonth={selectedMonth}
                  />
                </div>
                <AnnualSummary
                  transactions={transactions}
                  incomeEntries={incomeEntries}
                  bankAccounts={bankAccounts}
                />
              </>
            )}
          </div>
        </main>

        <footer className="border-t border-slate-200/60 bg-white/50 px-4 lg:px-8 py-3">
          <div className="max-w-6xl mx-auto text-xs text-slate-400 text-center">
            Kakeibo &mdash; Personal Finance Dashboard
          </div>
        </footer>
      </div>

      <RuleEditor
        rules={rules}
        onSaveRules={handleSaveRules}
        isOpen={ruleEditorOpen}
        onClose={() => setRuleEditorOpen(false)}
      />
    </div>
  );
}
