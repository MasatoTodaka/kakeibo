import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import type { Transaction } from '../types';
import { getMonthlySummaries, formatCurrency } from '../utils/aggregation';

interface MonthlyTrendProps {
  transactions: Transaction[];
}

export function MonthlyTrend({ transactions }: MonthlyTrendProps) {
  const summaries = getMonthlySummaries(transactions);

  if (summaries.length === 0) return null;

  const data = summaries.map((s) => ({
    month: s.month,
    固定費: s.fixed,
    変動費: s.variable,
  }));

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <h2 className="text-lg font-semibold text-gray-800 mb-4">
        月別推移
      </h2>
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="month" tick={{ fontSize: 12 }} />
            <YAxis
              tick={{ fontSize: 12 }}
              tickFormatter={(v) => `¥${(v / 1000).toFixed(0)}k`}
            />
            <Tooltip
              formatter={(value: number) => formatCurrency(value)}
            />
            <Legend />
            <Bar
              dataKey="固定費"
              stackId="a"
              fill="#F97316"
              radius={[0, 0, 0, 0]}
            />
            <Bar
              dataKey="変動費"
              stackId="a"
              fill="#10B981"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
