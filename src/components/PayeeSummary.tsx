import { Fragment, useMemo, useState } from 'react';
import type { Transaction } from '../types';
import { CARD_BRAND_LABELS, CARD_BRAND_COLORS } from '../types';
import { formatCurrency } from '../utils/aggregation';

interface PayeeSummaryProps {
  transactions: Transaction[];
}

interface PayeeGroup {
  payee: string;
  totalAmount: number;
  count: number;
  category: string;
  expenseType: 'fixed' | 'variable';
  cards: Set<string>;
  transactions: Transaction[];
}

export function PayeeSummary({ transactions }: PayeeSummaryProps) {
  const [collapsed, setCollapsed] = useState(true);
  const [sortKey, setSortKey] = useState<'amount' | 'count' | 'payee'>(
    'amount'
  );
  const [sortAsc, setSortAsc] = useState(false);
  const [expandedPayee, setExpandedPayee] = useState<string | null>(null);

  const groups = useMemo(() => {
    const map = new Map<string, PayeeGroup>();

    for (const t of transactions) {
      const key = t.payee;
      const existing = map.get(key);
      if (existing) {
        existing.totalAmount += t.amount;
        existing.count += 1;
        existing.cards.add(t.cardBrand);
        existing.transactions.push(t);
      } else {
        map.set(key, {
          payee: t.payee,
          totalAmount: t.amount,
          count: 1,
          category: t.category,
          expenseType: t.expenseType,
          cards: new Set([t.cardBrand]),
          transactions: [t],
        });
      }
    }

    const arr = Array.from(map.values());
    arr.sort((a, b) => {
      const mul = sortAsc ? 1 : -1;
      switch (sortKey) {
        case 'amount':
          return mul * (a.totalAmount - b.totalAmount);
        case 'count':
          return mul * (a.count - b.count);
        case 'payee':
          return mul * a.payee.localeCompare(b.payee);
      }
    });

    return arr;
  }, [transactions, sortKey, sortAsc]);

  const handleSort = (key: 'amount' | 'count' | 'payee') => {
    if (sortKey === key) {
      setSortAsc(!sortAsc);
    } else {
      setSortKey(key);
      setSortAsc(false);
    }
  };

  const totalAll = groups.reduce((sum, g) => sum + g.totalAmount, 0);

  if (groups.length === 0) return null;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="w-full flex items-center justify-between mb-2"
      >
        <h2 className="text-lg font-semibold text-gray-800">
          支出先別累積
        </h2>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-500">
            {groups.length}件 / {formatCurrency(totalAll)}
          </span>
          <span className={`text-gray-400 transition-transform ${collapsed ? '' : 'rotate-180'}`}>
            &#9660;
          </span>
        </div>
      </button>

      {collapsed ? null : (<>

      <div className="text-sm text-gray-500 mb-3">
        {groups.length}件の支出先 / 合計 {formatCurrency(totalAll)}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b-2 border-gray-200">
              <th
                className="text-left py-2 px-2 text-gray-600 cursor-pointer hover:text-gray-900"
                onClick={() => handleSort('payee')}
              >
                支出先 {sortKey === 'payee' && (sortAsc ? '▲' : '▼')}
              </th>
              <th className="text-left py-2 px-2 text-gray-600">カテゴリ</th>
              <th className="text-left py-2 px-2 text-gray-600">分類</th>
              <th className="text-left py-2 px-2 text-gray-600">カード</th>
              <th
                className="text-right py-2 px-2 text-gray-600 cursor-pointer hover:text-gray-900"
                onClick={() => handleSort('count')}
              >
                回数 {sortKey === 'count' && (sortAsc ? '▲' : '▼')}
              </th>
              <th
                className="text-right py-2 px-2 text-gray-600 cursor-pointer hover:text-gray-900"
                onClick={() => handleSort('amount')}
              >
                累積金額 {sortKey === 'amount' && (sortAsc ? '▲' : '▼')}
              </th>
              <th className="text-right py-2 px-2 text-gray-600">構成比</th>
            </tr>
          </thead>
          <tbody>
            {groups.map((g) => (
              <Fragment key={g.payee}>
                <tr
                  className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer"
                  onClick={() =>
                    setExpandedPayee(
                      expandedPayee === g.payee ? null : g.payee
                    )
                  }
                >
                  <td className="py-2 px-2 text-gray-900 max-w-xs">
                    <span className="flex items-center gap-1">
                      <span
                        className={`text-xs text-gray-400 transition-transform ${expandedPayee === g.payee ? 'rotate-90' : ''}`}
                      >
                        &#9654;
                      </span>
                      {g.payee}
                    </span>
                  </td>
                  <td className="py-2 px-2 text-gray-600">{g.category}</td>
                  <td className="py-2 px-2">
                    <span
                      className={`px-2 py-0.5 rounded text-xs font-medium ${
                        g.expenseType === 'fixed'
                          ? 'bg-orange-100 text-orange-700'
                          : 'bg-emerald-100 text-emerald-700'
                      }`}
                    >
                      {g.expenseType === 'fixed' ? '固定費' : '変動費'}
                    </span>
                  </td>
                  <td className="py-2 px-2">
                    <div className="flex gap-1">
                      {Array.from(g.cards).map((card) => (
                        <span
                          key={card}
                          className={`px-1.5 py-0.5 rounded text-xs font-medium ${CARD_BRAND_COLORS[card as keyof typeof CARD_BRAND_COLORS]?.bg || 'bg-gray-100'} ${CARD_BRAND_COLORS[card as keyof typeof CARD_BRAND_COLORS]?.text || 'text-gray-700'}`}
                        >
                          {CARD_BRAND_LABELS[card as keyof typeof CARD_BRAND_LABELS]}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="py-2 px-2 text-right text-gray-700">
                    {g.count}回
                  </td>
                  <td className="py-2 px-2 text-right font-mono font-semibold text-gray-900">
                    {formatCurrency(g.totalAmount)}
                  </td>
                  <td className="py-2 px-2 text-right text-gray-500">
                    {totalAll > 0
                      ? ((g.totalAmount / totalAll) * 100).toFixed(1)
                      : 0}
                    %
                  </td>
                </tr>
                {expandedPayee === g.payee && (
                  <tr key={`${g.payee}-detail`}>
                    <td colSpan={7} className="px-2 py-0">
                      <div className="bg-gray-50 rounded-lg p-3 mb-2 ml-6">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="text-gray-500">
                              <th className="text-left py-1">日付</th>
                              <th className="text-right py-1">金額</th>
                              <th className="text-left py-1 pl-3">カード</th>
                            </tr>
                          </thead>
                          <tbody>
                            {g.transactions
                              .sort((a, b) => a.date.localeCompare(b.date))
                              .map((t) => (
                                <tr
                                  key={t.id}
                                  className="border-t border-gray-200"
                                >
                                  <td className="py-1 text-gray-700">
                                    {t.date}
                                  </td>
                                  <td className="py-1 text-right font-mono text-gray-900">
                                    {formatCurrency(t.amount)}
                                  </td>
                                  <td className="py-1 pl-3 text-gray-500">
                                    {CARD_BRAND_LABELS[t.cardBrand]}
                                  </td>
                                </tr>
                              ))}
                          </tbody>
                        </table>
                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>

      </>)}
    </div>
  );
}
