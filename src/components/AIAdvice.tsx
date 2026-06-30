import { useState, useCallback } from 'react';
import type { Transaction, IncomeEntry, BankAccount } from '../types';
import { CARD_BRAND_LABELS } from '../types';
import { formatCurrency, getFiscalYear } from '../utils/aggregation';
import { getCategorySummaries } from '../utils/aggregation';

interface AIAdviceProps {
  transactions: Transaction[];
  incomeEntries: IncomeEntry[];
  bankAccounts: BankAccount[];
}

function buildSummary(
  transactions: Transaction[],
  incomeEntries: IncomeEntry[],
  bankAccounts: BankAccount[]
): string {
  const totalExpense = transactions.reduce((s, t) => s + t.amount, 0);
  const totalIncome = incomeEntries.reduce((s, e) => s + e.amount, 0);
  const totalBalance = bankAccounts.reduce((s, a) => s + a.balance, 0);
  const fixed = transactions.filter((t) => t.expenseType === 'fixed').reduce((s, t) => s + t.amount, 0);
  const variable = totalExpense - fixed;
  const categories = getCategorySummaries(transactions);

  const months = new Set<string>();
  transactions.forEach((t) => months.add(t.date.substring(0, 7)));
  const monthCount = months.size || 1;
  const avgMonthly = Math.round(totalExpense / monthCount);

  const cardUsage = new Map<string, number>();
  transactions.forEach((t) => {
    cardUsage.set(t.cardBrand, (cardUsage.get(t.cardBrand) || 0) + t.amount);
  });

  const fySet = new Set<string>();
  transactions.forEach((t) => fySet.add(getFiscalYear(t.date.substring(0, 7))));

  const lines = [
    `## 家計データサマリー`,
    `- 対象期間: ${monthCount}ヶ月分 (年度: ${[...fySet].sort().join(', ')})`,
    `- 銀行口座残高合計: ${formatCurrency(totalBalance)} (${bankAccounts.length}口座)`,
    `- 収入合計: ${formatCurrency(totalIncome)}`,
    `- 支出合計: ${formatCurrency(totalExpense)} (月平均: ${formatCurrency(avgMonthly)})`,
    `- 固定費: ${formatCurrency(fixed)} (${totalExpense > 0 ? ((fixed / totalExpense) * 100).toFixed(1) : 0}%)`,
    `- 変動費: ${formatCurrency(variable)} (${totalExpense > 0 ? ((variable / totalExpense) * 100).toFixed(1) : 0}%)`,
    `- 収支差額: ${formatCurrency(totalIncome - totalExpense)}`,
    ``,
    `### カテゴリ別支出`,
    ...categories.slice(0, 10).map(
      (c) => `- ${c.category}: ${formatCurrency(c.amount)} (${c.count}件, ${c.expenseType === 'fixed' ? '固定費' : '変動費'})`
    ),
    ``,
    `### カード別利用額`,
    ...[...cardUsage.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([brand, amount]) => `- ${CARD_BRAND_LABELS[brand as keyof typeof CARD_BRAND_LABELS]}: ${formatCurrency(amount)}`),
  ];

  return lines.join('\n');
}

const DEFAULT_PROMPT = `以下の観点から分析し、日本語で具体的なアドバイスをしてください。
- 収支バランスの評価（固定費率、貯蓄率など）
- 支出の改善ポイント
- 投資・資産形成の提案
- 具体的な行動提案（優先度順に3つ）`;

export function AIAdvice({ transactions, incomeEntries, bankAccounts }: AIAdviceProps) {
  const [advice, setAdvice] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [collapsed, setCollapsed] = useState(false);
  const [userPrompt, setUserPrompt] = useState(DEFAULT_PROMPT);

  const handleAnalyze = useCallback(async () => {
    setLoading(true);
    setError('');
    setAdvice('');
    try {
      const summary = buildSummary(transactions, incomeEntries, bankAccounts);
      const res = await fetch('/api/advice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ summary, userPrompt }),
      });
      const data = await res.json();
      if (data.error) {
        setError(data.error);
      } else {
        setAdvice(data.advice);
        setCollapsed(false);
      }
    } catch {
      setError('APIへの接続に失敗しました。Vercel URL (kakeibo-app-sandy.vercel.app) からアクセスしているか確認してください。');
    } finally {
      setLoading(false);
    }
  }, [transactions, incomeEntries, bankAccounts, userPrompt]);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-sm font-bold">
          AI
        </div>
        <h2 className="text-lg font-semibold text-gray-800">AI家計アドバイス</h2>
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          質問・分析依頼
        </label>
        <textarea
          value={userPrompt}
          onChange={(e) => setUserPrompt(e.target.value)}
          rows={4}
          placeholder="例: 来年マンションを購入したい場合の貯蓄計画を教えてください"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-y"
        />
      </div>

      <div className="flex justify-end mb-4">
        <button
          onClick={handleAnalyze}
          disabled={loading || transactions.length === 0 || !userPrompt.trim()}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? '分析中...' : '分析する'}
        </button>
      </div>

      {error && (
        <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm mb-4">
          {error}
        </div>
      )}

      {advice && (
        <>
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="w-full flex items-center justify-between mb-2"
          >
            <span className="text-sm text-gray-500">分析結果</span>
            <span className={`text-gray-400 transition-transform ${collapsed ? '' : 'rotate-180'}`}>
              &#9660;
            </span>
          </button>
          {!collapsed && (
            <div className="prose prose-sm max-w-none text-gray-700 bg-gradient-to-br from-indigo-50/50 to-purple-50/50 rounded-lg p-4 whitespace-pre-wrap leading-relaxed">
              {advice}
            </div>
          )}
        </>
      )}

      {!advice && !loading && !error && (
        <p className="text-sm text-gray-400">
          「家計を分析する」ボタンを押すと、AIが収支データを分析してアドバイスを提供します
        </p>
      )}
    </div>
  );
}
