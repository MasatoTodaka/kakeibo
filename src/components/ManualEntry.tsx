import { useState } from 'react';
import type { Transaction, ExpenseType } from '../types';
import { CATEGORIES } from '../config/classificationRules';
import { NumericInput } from './NumericInput';

interface ManualEntryProps {
  onAdd: (items: Transaction | Transaction[]) => void;
}

let idSeq = 0;

function addMonths(dateStr: string, months: number): string {
  const d = new Date(dateStr + 'T00:00:00');
  d.setMonth(d.getMonth() + months);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function monthDiff(from: string, to: string): number {
  const [fy, fm] = from.split('-').map(Number);
  const [ty, tm] = to.split('-').map(Number);
  return (ty - fy) * 12 + (tm - fm);
}

export function ManualEntry({ onAdd }: ManualEntryProps) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<'single' | 'recurring'>('single');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [endMonth, setEndMonth] = useState('');
  const [payee, setPayee] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('その他');
  const [expenseType, setExpenseType] = useState<ExpenseType>('fixed');
  const [memo, setMemo] = useState('');

  const handleSubmit = () => {
    const amt = parseInt(amount.replace(/,/g, ''), 10);
    if (!payee.trim() || isNaN(amt) || amt === 0) return;

    if (mode === 'single') {
      onAdd({
        id: `manual-${Date.now()}-${++idSeq}`,
        date,
        payee: payee.trim(),
        amount: amt,
        cardBrand: 'manual',
        category,
        expenseType,
        memo: memo.trim(),
      });
    } else {
      const end = endMonth || date.substring(0, 7);
      const startMonth = date.substring(0, 7);
      const count = monthDiff(startMonth, end) + 1;
      if (count < 1 || count > 120) {
        alert('期間が不正です（最大10年）');
        return;
      }
      const day = date.split('-')[2];
      const items: Transaction[] = [];
      for (let i = 0; i < count; i++) {
        const base = addMonths(date, i);
        const m = base.substring(0, 7);
        items.push({
          id: `manual-${Date.now()}-${++idSeq}`,
          date: `${m}-${day}`,
          payee: payee.trim(),
          amount: amt,
          cardBrand: 'manual',
          category,
          expenseType,
          memo: memo.trim(),
        });
      }
      onAdd(items);
      alert(`${payee.trim()} を ${count}ヶ月分追加しました`);
    }

    setPayee('');
    setAmount('');
    setMemo('');
    setOpen(false);
  };

  const previewCount = (() => {
    if (mode !== 'recurring' || !endMonth) return 0;
    const start = date.substring(0, 7);
    return Math.max(0, monthDiff(start, endMonth) + 1);
  })();

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full border-2 border-dashed border-slate-200 rounded-xl p-4 text-sm font-medium text-slate-400 hover:border-blue-400 hover:text-blue-500 transition-colors"
      >
        + 明細を手動で追加
      </button>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-800">明細を追加</h2>
        <button
          onClick={() => setOpen(false)}
          className="text-gray-400 hover:text-gray-600 text-xl"
        >
          &times;
        </button>
      </div>

      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setMode('single')}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            mode === 'single'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          単発
        </button>
        <button
          onClick={() => { setMode('recurring'); setExpenseType('fixed'); }}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            mode === 'recurring'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          毎月繰り返し
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
        <div>
          <label className="block text-xs text-gray-500 mb-1">
            {mode === 'single' ? '日付' : '開始日'}
          </label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        {mode === 'recurring' && (
          <div>
            <label className="block text-xs text-gray-500 mb-1">終了月</label>
            <input
              type="month"
              value={endMonth}
              onChange={(e) => setEndMonth(e.target.value)}
              min={date.substring(0, 7)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {previewCount > 0 && (
              <p className="text-xs text-blue-500 mt-1">{previewCount}ヶ月分を追加</p>
            )}
          </div>
        )}
        <div>
          <label className="block text-xs text-gray-500 mb-1">支払先</label>
          <input
            type="text"
            value={payee}
            onChange={(e) => setPayee(e.target.value)}
            placeholder="例: 家賃、電気代"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">金額</label>
          <NumericInput
            value={amount}
            onChange={setAmount}
            placeholder="例: 80000"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-right font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">カテゴリ</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">分類</label>
          <select
            value={expenseType}
            onChange={(e) => setExpenseType(e.target.value as ExpenseType)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="fixed">固定費</option>
            <option value="variable">変動費</option>
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">メモ</label>
          <input
            type="text"
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            placeholder="任意"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <div className="flex justify-end">
        <button
          onClick={handleSubmit}
          className="px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          {mode === 'single' ? '追加' : `${previewCount || 1}ヶ月分を追加`}
        </button>
      </div>
    </div>
  );
}
