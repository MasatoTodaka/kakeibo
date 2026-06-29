import { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import type { Transaction, IncomeEntry, BankAccount } from '../types';
import { formatCurrency, getFiscalYear, getFiscalYearLabel, sortByFiscalMonth } from '../utils/aggregation';

interface AnnualSummaryProps {
  transactions: Transaction[];
  incomeEntries: IncomeEntry[];
  bankAccounts: BankAccount[];
}

interface YearData {
  fy: string;
  label: string;
  income: number;
  expense: number;
  balance: number;
  months: MonthData[];
}

interface MonthData {
  month: string;
  label: string;
  income: number;
  expense: number;
  balance: number;
}

export function AnnualSummary({
  transactions,
  incomeEntries,
  bankAccounts,
}: AnnualSummaryProps) {
  const years = useMemo(() => {
    const allMonths = new Set<string>();
    for (const t of transactions) allMonths.add(t.date.substring(0, 7));
    for (const e of incomeEntries) allMonths.add(e.date.substring(0, 7));

    const fyMap = new Map<string, YearData>();

    for (const m of Array.from(allMonths).sort(sortByFiscalMonth)) {
      const fy = getFiscalYear(m);
      if (!fyMap.has(fy)) {
        fyMap.set(fy, {
          fy,
          label: getFiscalYearLabel(fy),
          income: 0,
          expense: 0,
          balance: 0,
          months: [],
        });
      }
      const yd = fyMap.get(fy)!;

      const mIncome = incomeEntries
        .filter((e) => e.date.startsWith(m))
        .reduce((s, e) => s + e.amount, 0);
      const mExpense = transactions
        .filter((t) => t.date.startsWith(m))
        .reduce((s, t) => s + t.amount, 0);

      yd.income += mIncome;
      yd.expense += mExpense;
      yd.balance = yd.income - yd.expense;
      yd.months.push({
        month: m,
        label: `${parseInt(m.split('-')[1])}月`,
        income: mIncome,
        expense: mExpense,
        balance: mIncome - mExpense,
      });
    }

    return Array.from(fyMap.values()).sort((a, b) =>
      a.fy.localeCompare(b.fy)
    );
  }, [transactions, incomeEntries]);

  const totalBankBalance = bankAccounts.reduce((s, a) => s + a.balance, 0);

  if (years.length === 0) return null;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <h2 className="text-lg font-semibold text-gray-800 mb-4">年度別収支</h2>

      {bankAccounts.length > 0 && (
        <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-emerald-50 rounded-lg flex items-center justify-between">
          <div>
            <div className="text-sm text-gray-600">現在の総預金残高</div>
            <div className="text-2xl font-bold text-gray-900">
              {formatCurrency(totalBankBalance)}
            </div>
          </div>
          <div className="text-xs text-gray-400">
            {bankAccounts.length}口座
          </div>
        </div>
      )}

      {years.map((yd) => (
        <div key={yd.fy} className="mb-8 last:mb-0">
          <div className="flex items-center gap-4 mb-4 flex-wrap">
            <h3 className="text-xl font-bold text-gray-900">{yd.label}</h3>
            <div className="text-xs text-gray-400">
              ({yd.fy}/4 ~ {parseInt(yd.fy) + 1}/3)
            </div>
            <div className="flex gap-4 text-sm">
              <span className="text-emerald-600">
                収入: <span className="font-semibold">{formatCurrency(yd.income)}</span>
              </span>
              <span className="text-red-500">
                支出: <span className="font-semibold">{formatCurrency(yd.expense)}</span>
              </span>
              <span
                className={`font-semibold ${yd.balance >= 0 ? 'text-blue-600' : 'text-red-600'}`}
              >
                収支: {yd.balance >= 0 ? '+' : ''}
                {formatCurrency(yd.balance)}
              </span>
            </div>
          </div>

          <div className="h-64 mb-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={yd.months}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                <YAxis
                  tick={{ fontSize: 12 }}
                  tickFormatter={(v) =>
                    `${v >= 0 ? '' : '-'}¥${Math.abs(v / 10000).toFixed(0)}万`
                  }
                />
                <Tooltip
                  formatter={(value: number, name: string) => [
                    formatCurrency(value),
                    name,
                  ]}
                />
                <Legend />
                <ReferenceLine y={0} stroke="#94a3b8" />
                <Bar dataKey="income" name="収入" fill="#10B981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="expense" name="支出" fill="#EF4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-gray-200">
                  <th className="text-left py-2 px-2 text-gray-600">月</th>
                  <th className="text-right py-2 px-2 text-emerald-600">収入</th>
                  <th className="text-right py-2 px-2 text-red-500">支出</th>
                  <th className="text-right py-2 px-2 text-gray-600">収支</th>
                </tr>
              </thead>
              <tbody>
                {yd.months.map((m) => (
                  <tr
                    key={m.month}
                    className="border-b border-gray-100 hover:bg-gray-50"
                  >
                    <td className="py-2 px-2 text-gray-700">{m.label}</td>
                    <td className="py-2 px-2 text-right font-mono text-emerald-700">
                      {m.income > 0 ? formatCurrency(m.income) : '-'}
                    </td>
                    <td className="py-2 px-2 text-right font-mono text-red-500">
                      {m.expense > 0 ? formatCurrency(m.expense) : '-'}
                    </td>
                    <td
                      className={`py-2 px-2 text-right font-mono font-semibold ${
                        m.balance >= 0 ? 'text-blue-600' : 'text-red-600'
                      }`}
                    >
                      {m.balance >= 0 ? '+' : ''}
                      {formatCurrency(m.balance)}
                    </td>
                  </tr>
                ))}
                <tr className="border-t-2 border-gray-300 bg-gray-50 font-semibold">
                  <td className="py-2 px-2 text-gray-900">年度計</td>
                  <td className="py-2 px-2 text-right font-mono text-emerald-700">
                    {formatCurrency(yd.income)}
                  </td>
                  <td className="py-2 px-2 text-right font-mono text-red-500">
                    {formatCurrency(yd.expense)}
                  </td>
                  <td
                    className={`py-2 px-2 text-right font-mono ${
                      yd.balance >= 0 ? 'text-blue-600' : 'text-red-600'
                    }`}
                  >
                    {yd.balance >= 0 ? '+' : ''}
                    {formatCurrency(yd.balance)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
}
