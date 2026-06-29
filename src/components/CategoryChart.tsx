import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import type { Transaction } from '../types';
import { getCategorySummaries, formatCurrency } from '../utils/aggregation';
import { renderPieLabel } from './PieLabel';

const COLORS = [
  '#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6',
  '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#6366F1',
  '#14B8A6', '#E11D48', '#A855F7', '#78716C',
];

interface CategoryChartProps {
  transactions: Transaction[];
}

export function CategoryChart({ transactions }: CategoryChartProps) {
  const categories = getCategorySummaries(transactions);

  if (categories.length === 0) return null;

  const data = categories.map((c) => ({
    name: c.category,
    value: c.amount,
    count: c.count,
    type: c.expenseType === 'fixed' ? '固定費' : '変動費',
  }));

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <h2 className="text-lg font-semibold text-gray-800 mb-4">
        カテゴリ別支出
      </h2>
      <div className="flex flex-col lg:flex-row lg:items-center gap-6">
        <div className="w-full lg:w-2/5 h-80">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                outerRadius="65%"
                dataKey="value"
                startAngle={90}
                endAngle={-270}
                label={renderPieLabel}
                labelLine={false}
              >
                {data.map((_, index) => (
                  <Cell
                    key={index}
                    fill={COLORS[index % COLORS.length]}
                  />
                ))}
              </Pie>
              <Tooltip
                formatter={(value: number) => formatCurrency(value)}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="w-full lg:w-3/5">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-2 text-gray-600">カテゴリ</th>
                <th className="text-left py-2 text-gray-600">分類</th>
                <th className="text-right py-2 text-gray-600">金額</th>
                <th className="text-right py-2 text-gray-600">件数</th>
              </tr>
            </thead>
            <tbody>
              {data.map((item, i) => (
                <tr key={item.name} className="border-b border-gray-100">
                  <td className="py-2 flex items-center gap-2">
                    <span
                      className="w-3 h-3 rounded-full inline-block"
                      style={{ backgroundColor: COLORS[i % COLORS.length] }}
                    />
                    {item.name}
                  </td>
                  <td className="py-2">
                    <span
                      className={`px-2 py-0.5 rounded text-xs font-medium ${
                        item.type === '固定費'
                          ? 'bg-orange-100 text-orange-700'
                          : 'bg-emerald-100 text-emerald-700'
                      }`}
                    >
                      {item.type}
                    </span>
                  </td>
                  <td className="py-2 text-right font-mono">
                    {formatCurrency(item.value)}
                  </td>
                  <td className="py-2 text-right text-gray-500">
                    {item.count}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
