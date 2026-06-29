import { useState } from 'react';
import type { IncomeEntry } from '../types';
import { NumericInput } from './NumericInput';
import { formatCurrency } from '../utils/aggregation';

interface IncomePanelProps {
  entries: IncomeEntry[];
  onSave: (entries: IncomeEntry[]) => void;
  selectedMonth: string | null;
}

let idSeq = 0;

export function IncomePanel({ entries, onSave, selectedMonth }: IncomePanelProps) {
  const [newDate, setNewDate] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [newSource, setNewSource] = useState('給与');
  const [newAmount, setNewAmount] = useState('');
  const [newMemo, setNewMemo] = useState('');
  const [showForm, setShowForm] = useState(false);

  const filtered = selectedMonth
    ? entries.filter((e) => e.date.startsWith(selectedMonth))
    : entries;

  const totalIncome = filtered.reduce((s, e) => s + e.amount, 0);

  const handleAdd = () => {
    const amount = parseInt(newAmount.replace(/,/g, ''), 10);
    if (!newSource.trim() || isNaN(amount) || amount <= 0) return;
    const entry: IncomeEntry = {
      id: `inc-${Date.now()}-${++idSeq}`,
      date: newDate,
      source: newSource.trim(),
      amount,
      memo: newMemo.trim(),
    };
    onSave([...entries, entry].sort((a, b) => a.date.localeCompare(b.date)));
    setNewSource('給与');
    setNewAmount('');
    setNewMemo('');
    setShowForm(false);
  };

  const handleDelete = (id: string) => {
    onSave(entries.filter((e) => e.id !== id));
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-800">収入</h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-3 py-1.5 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
        >
          {showForm ? 'キャンセル' : '+ 収入を追加'}
        </button>
      </div>

      {filtered.length > 0 && (
        <div className="mb-4 p-4 bg-emerald-50 rounded-lg">
          <div className="text-sm text-emerald-600">
            {selectedMonth ? `${selectedMonth.replace('-', '年')}月` : '全期間'}の収入合計
          </div>
          <div className="text-2xl font-bold text-emerald-800">
            {formatCurrency(totalIncome)}
          </div>
        </div>
      )}

      {showForm && (
        <div className="p-4 bg-gray-50 rounded-lg mb-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">日付</label>
              <input
                type="date"
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
                className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">金額</label>
              <NumericInput
                value={newAmount}
                onChange={setNewAmount}
                placeholder="例: 300000"
                className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm text-right font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">
                収入源
              </label>
              <select
                value={['給与', '賞与'].includes(newSource) ? newSource : '_other'}
                onChange={(e) => {
                  if (e.target.value === '_other') {
                    setNewSource('');
                  } else {
                    setNewSource(e.target.value);
                  }
                }}
                className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 mb-1"
              >
                <option value="給与">給与</option>
                <option value="賞与">賞与</option>
                <option value="_other">その他（手入力）</option>
              </select>
              {!['給与', '賞与'].includes(newSource) && (
                <input
                  type="text"
                  value={newSource}
                  onChange={(e) => setNewSource(e.target.value)}
                  placeholder="例: 副業, 配当金"
                  className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              )}
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">メモ</label>
              <input
                type="text"
                value={newMemo}
                onChange={(e) => setNewMemo(e.target.value)}
                placeholder="任意"
                className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <div className="flex justify-end">
            <button
              onClick={handleAdd}
              className="px-4 py-1.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
            >
              追加
            </button>
          </div>
        </div>
      )}

      {filtered.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b-2 border-gray-200">
                <th className="text-left py-2 px-2 text-gray-600">日付</th>
                <th className="text-left py-2 px-2 text-gray-600">収入源</th>
                <th className="text-right py-2 px-2 text-gray-600">金額</th>
                <th className="text-left py-2 px-2 text-gray-600">メモ</th>
                <th className="text-right py-2 px-2 text-gray-600">操作</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((e) => (
                <tr
                  key={e.id}
                  className="border-b border-gray-100 hover:bg-gray-50"
                >
                  <td className="py-2 px-2 text-gray-700 whitespace-nowrap">
                    {e.date}
                  </td>
                  <td className="py-2 px-2 text-gray-900">{e.source}</td>
                  <td className="py-2 px-2 text-right font-mono font-semibold text-emerald-700">
                    {formatCurrency(e.amount)}
                  </td>
                  <td className="py-2 px-2 text-gray-500">{e.memo}</td>
                  <td className="py-2 px-2 text-right">
                    <button
                      onClick={() => handleDelete(e.id)}
                      className="text-red-500 hover:text-red-700 text-xs"
                    >
                      削除
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-center py-4 text-gray-400 text-sm">
          収入データがありません
        </div>
      )}
    </div>
  );
}
