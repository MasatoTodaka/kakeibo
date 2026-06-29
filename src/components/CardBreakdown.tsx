import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { type Transaction, CARD_BRAND_LABELS, CARD_BRAND_COLORS, type CardBrand } from '../types';
import { renderPieLabel } from './PieLabel';
import {
  getCardSummaries,
  getCategorySummaries,
  formatCurrency,
} from '../utils/aggregation';

const CATEGORY_COLORS = [
  '#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6',
  '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#6366F1',
];

interface CardBreakdownProps {
  transactions: Transaction[];
}

export function CardBreakdown({ transactions }: CardBreakdownProps) {
  const cardSummaries = getCardSummaries(transactions).sort(
    (a, b) => b.totalAmount - a.totalAmount
  );

  if (cardSummaries.length === 0) return null;

  const pieData = cardSummaries.map((c) => ({
    name: CARD_BRAND_LABELS[c.cardBrand],
    value: c.totalAmount,
    brand: c.cardBrand,
  }));

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <h2 className="text-lg font-semibold text-gray-800 mb-4">
        カード別利用状況
      </h2>
      <div className="flex flex-col lg:flex-row lg:items-center gap-6">
        <div className="w-full lg:w-2/5 h-72">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                outerRadius="65%"
                dataKey="value"
                startAngle={90}
                endAngle={-270}
                label={renderPieLabel}
                labelLine={false}
              >
                {pieData.map((entry) => (
                  <Cell
                    key={entry.brand}
                    fill={CARD_BRAND_COLORS[entry.brand].chart}
                  />
                ))}
              </Pie>
              <Tooltip
                formatter={(value: number) => formatCurrency(value)}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="w-full lg:w-3/5 grid grid-cols-1 md:grid-cols-2 gap-4">
          {cardSummaries.map((card) => {
            const cardTransactions = transactions.filter(
              (t) => t.cardBrand === card.cardBrand
            );
            const categories = getCategorySummaries(cardTransactions).slice(
              0,
              5
            );

            return (
              <div
                key={card.cardBrand}
                className="border border-gray-200 rounded-lg p-4"
              >
                <div className="flex items-center gap-2 mb-3">
                  <span
                    className="w-3 h-3 rounded-full"
                    style={{
                      backgroundColor: CARD_BRAND_COLORS[card.cardBrand].chart,
                    }}
                  />
                  <span className="font-semibold text-gray-800">
                    {CARD_BRAND_LABELS[card.cardBrand]}
                  </span>
                </div>
                <div className="text-xl font-bold text-gray-900 mb-2">
                  {formatCurrency(card.totalAmount)}
                </div>
                <div className="flex gap-4 text-xs text-gray-500 mb-3">
                  <span>
                    固定費:{' '}
                    <span className="text-orange-600 font-medium">
                      {formatCurrency(card.fixedAmount)}
                    </span>
                  </span>
                  <span>
                    変動費:{' '}
                    <span className="text-emerald-600 font-medium">
                      {formatCurrency(card.variableAmount)}
                    </span>
                  </span>
                </div>
                <div className="space-y-1">
                  {categories.map((cat, i) => (
                    <div
                      key={cat.category}
                      className="flex justify-between text-xs"
                    >
                      <span className="flex items-center gap-1">
                        <span
                          className="w-2 h-2 rounded-full"
                          style={{
                            backgroundColor:
                              CATEGORY_COLORS[i % CATEGORY_COLORS.length],
                          }}
                        />
                        {cat.category}
                      </span>
                      <span className="font-mono text-gray-600">
                        {formatCurrency(cat.amount)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
