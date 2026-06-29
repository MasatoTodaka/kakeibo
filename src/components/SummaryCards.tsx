import { type Transaction, CARD_BRAND_LABELS } from '../types';
import { getCardSummaries, formatCurrency } from '../utils/aggregation';

interface SummaryCardsProps {
  transactions: Transaction[];
}

export function SummaryCards({ transactions }: SummaryCardsProps) {
  const total = transactions.reduce((sum, t) => sum + t.amount, 0);
  const fixed = transactions
    .filter((t) => t.expenseType === 'fixed')
    .reduce((sum, t) => sum + t.amount, 0);
  const variable = transactions
    .filter((t) => t.expenseType === 'variable')
    .reduce((sum, t) => sum + t.amount, 0);
  const cardSummaries = getCardSummaries(transactions);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
        <div className="text-sm text-gray-500 mb-1">総支出</div>
        <div className="text-2xl font-bold text-gray-900">
          {formatCurrency(total)}
        </div>
        <div className="text-xs text-gray-400 mt-1">
          {transactions.length}件
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
        <div className="text-sm text-gray-500 mb-1">固定費</div>
        <div className="text-2xl font-bold text-orange-600">
          {formatCurrency(fixed)}
        </div>
        <div className="text-xs text-gray-400 mt-1">
          {total > 0 ? ((fixed / total) * 100).toFixed(1) : 0}%
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
        <div className="text-sm text-gray-500 mb-1">変動費</div>
        <div className="text-2xl font-bold text-emerald-600">
          {formatCurrency(variable)}
        </div>
        <div className="text-xs text-gray-400 mt-1">
          {total > 0 ? ((variable / total) * 100).toFixed(1) : 0}%
        </div>
      </div>

      {cardSummaries.map((card) => (
        <div
          key={card.cardBrand}
          className="bg-white rounded-xl shadow-sm border border-gray-200 p-5"
        >
          <div className="text-sm text-gray-500 mb-1">
            {CARD_BRAND_LABELS[card.cardBrand]}
          </div>
          <div className="text-2xl font-bold text-blue-600">
            {formatCurrency(card.totalAmount)}
          </div>
          <div className="text-xs text-gray-400 mt-1">
            {card.transactionCount}件
          </div>
        </div>
      ))}
    </div>
  );
}
