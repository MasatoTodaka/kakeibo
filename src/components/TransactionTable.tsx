import { useState, useMemo } from 'react';
import { type Transaction, CARD_BRAND_LABELS, CARD_BRAND_COLORS, type CardBrand } from '../types';
import { CATEGORIES } from '../config/classificationRules';
import { formatCurrency } from '../utils/aggregation';

interface TransactionTableProps {
  transactions: Transaction[];
  onUpdateTransaction: (id: string, updates: Partial<Transaction>) => void;
  onDeleteTransaction?: (id: string) => void;
}

export function TransactionTable({
  transactions,
  onUpdateTransaction,
  onDeleteTransaction,
}: TransactionTableProps) {
  const [collapsed, setCollapsed] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<{ date: string; payee: string; amount: string }>({ date: '', payee: '', amount: '' });
  const [filterCard, setFilterCard] = useState<CardBrand | 'all'>('all');
  const [filterType, setFilterType] = useState<'all' | 'fixed' | 'variable'>(
    'all'
  );
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [searchText, setSearchText] = useState('');
  const [sortKey, setSortKey] = useState<'date' | 'amount'>('date');
  const [sortAsc, setSortAsc] = useState(false);

  const filtered = useMemo(() => {
    let result = transactions;

    if (filterCard !== 'all') {
      result = result.filter((t) => t.cardBrand === filterCard);
    }
    if (filterType !== 'all') {
      result = result.filter((t) => t.expenseType === filterType);
    }
    if (filterCategory !== 'all') {
      result = result.filter((t) => t.category === filterCategory);
    }
    if (searchText) {
      const query = searchText.toLowerCase();
      result = result.filter(
        (t) =>
          t.payee.toLowerCase().includes(query) ||
          t.memo.toLowerCase().includes(query)
      );
    }

    result = [...result].sort((a, b) => {
      const mul = sortAsc ? 1 : -1;
      if (sortKey === 'date') return mul * a.date.localeCompare(b.date);
      return mul * (a.amount - b.amount);
    });

    return result;
  }, [transactions, filterCard, filterType, filterCategory, searchText, sortKey, sortAsc]);

  const handleSort = (key: 'date' | 'amount') => {
    if (sortKey === key) {
      setSortAsc(!sortAsc);
    } else {
      setSortKey(key);
      setSortAsc(false);
    }
  };

  const usedCards = [...new Set(transactions.map((t) => t.cardBrand))];

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="w-full flex items-center justify-between mb-2"
      >
        <h2 className="text-lg font-semibold text-gray-800">明細一覧</h2>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-500">{transactions.length}件</span>
          <span className={`text-gray-400 transition-transform ${collapsed ? '' : 'rotate-180'}`}>
            &#9660;
          </span>
        </div>
      </button>

      {!collapsed && (<>

      <div className="flex flex-wrap gap-3 mb-4">
        <input
          type="text"
          placeholder="支払先を検索..."
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-48"
        />

        <select
          value={filterCard}
          onChange={(e) => setFilterCard(e.target.value as CardBrand | 'all')}
          className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">全カード</option>
          {usedCards.map((brand) => (
            <option key={brand} value={brand}>
              {CARD_BRAND_LABELS[brand]}
            </option>
          ))}
        </select>

        <select
          value={filterType}
          onChange={(e) =>
            setFilterType(e.target.value as 'all' | 'fixed' | 'variable')
          }
          className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">固定費・変動費</option>
          <option value="fixed">固定費のみ</option>
          <option value="variable">変動費のみ</option>
        </select>

        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">全カテゴリ</option>
          {CATEGORIES.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>
      </div>

      <div className="text-sm text-gray-500 mb-2">
        {filtered.length}件表示 / {transactions.length}件中
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b-2 border-gray-200">
              <th
                className="text-left py-2 px-2 text-gray-600 cursor-pointer hover:text-gray-900"
                onClick={() => handleSort('date')}
              >
                日付 {sortKey === 'date' && (sortAsc ? '▲' : '▼')}
              </th>
              <th className="text-left py-2 px-2 text-gray-600">支払先</th>
              <th
                className="text-right py-2 px-2 text-gray-600 cursor-pointer hover:text-gray-900"
                onClick={() => handleSort('amount')}
              >
                金額 {sortKey === 'amount' && (sortAsc ? '▲' : '▼')}
              </th>
              <th className="text-left py-2 px-2 text-gray-600">カード</th>
              <th className="text-left py-2 px-2 text-gray-600">カテゴリ</th>
              <th className="text-left py-2 px-2 text-gray-600">分類</th>
              <th className="text-right py-2 px-2 text-gray-600">操作</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((t) => {
              const isEditing = editingId === t.id;
              return (
              <tr
                key={t.id}
                className="border-b border-gray-100 hover:bg-gray-50"
              >
                <td className="py-2 px-2 text-gray-700 whitespace-nowrap">
                  {isEditing ? (
                    <input type="date" value={editValues.date} onChange={(e) => setEditValues({ ...editValues, date: e.target.value })} className="text-xs border border-gray-300 rounded px-1 py-0.5 w-32 focus:outline-none focus:ring-1 focus:ring-blue-500" />
                  ) : t.date}
                </td>
                <td className="py-2 px-2 text-gray-900 max-w-xs">
                  {isEditing ? (
                    <input type="text" value={editValues.payee} onChange={(e) => setEditValues({ ...editValues, payee: e.target.value })} className="text-xs border border-gray-300 rounded px-1 py-0.5 w-full focus:outline-none focus:ring-1 focus:ring-blue-500" />
                  ) : <span className="truncate block">{t.payee}</span>}
                </td>
                <td className="py-2 px-2 text-right font-mono text-gray-900">
                  {isEditing ? (
                    <input type="text" value={editValues.amount} onChange={(e) => setEditValues({ ...editValues, amount: e.target.value })} className="text-xs border border-gray-300 rounded px-1 py-0.5 w-24 text-right font-mono focus:outline-none focus:ring-1 focus:ring-blue-500" />
                  ) : formatCurrency(t.amount)}
                </td>
                <td className="py-2 px-2">
                  <span
                    className={`px-2 py-0.5 rounded text-xs font-medium ${CARD_BRAND_COLORS[t.cardBrand].bg} ${CARD_BRAND_COLORS[t.cardBrand].text}`}
                  >
                    {CARD_BRAND_LABELS[t.cardBrand]}
                  </span>
                </td>
                <td className="py-2 px-2">
                  <select
                    value={t.category}
                    onChange={(e) =>
                      onUpdateTransaction(t.id, { category: e.target.value })
                    }
                    className="text-xs border border-gray-200 rounded px-1 py-0.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    {CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="py-2 px-2">
                  <select
                    value={t.expenseType}
                    onChange={(e) =>
                      onUpdateTransaction(t.id, {
                        expenseType: e.target.value as 'fixed' | 'variable',
                      })
                    }
                    className={`text-xs border rounded px-1 py-0.5 focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                      t.expenseType === 'fixed'
                        ? 'border-orange-200 bg-orange-50 text-orange-700'
                        : 'border-emerald-200 bg-emerald-50 text-emerald-700'
                    }`}
                  >
                    <option value="fixed">固定費</option>
                    <option value="variable">変動費</option>
                  </select>
                </td>
                <td className="py-2 px-2 text-right whitespace-nowrap">
                  {isEditing ? (
                    <div className="flex gap-1 justify-end">
                      <button
                        onClick={() => {
                          const amt = parseInt(editValues.amount.replace(/[,，¥]/g, ''), 10);
                          if (editValues.payee.trim() && !isNaN(amt)) {
                            onUpdateTransaction(t.id, { date: editValues.date, payee: editValues.payee.trim(), amount: amt });
                          }
                          setEditingId(null);
                        }}
                        className="text-xs text-blue-600 hover:text-blue-800"
                      >
                        保存
                      </button>
                      <button onClick={() => setEditingId(null)} className="text-xs text-gray-400 hover:text-gray-600">
                        取消
                      </button>
                    </div>
                  ) : (
                    <div className="flex gap-1 justify-end">
                      <button
                        onClick={() => { setEditingId(t.id); setEditValues({ date: t.date, payee: t.payee, amount: t.amount.toString() }); }}
                        className="text-xs text-gray-400 hover:text-blue-600"
                      >
                        編集
                      </button>
                      {onDeleteTransaction && (
                        <button onClick={() => onDeleteTransaction(t.id)} className="text-xs text-gray-400 hover:text-red-600">
                          削除
                        </button>
                      )}
                    </div>
                  )}
                </td>
              </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      </>)}
    </div>
  );
}
