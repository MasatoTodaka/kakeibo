import { useMemo } from 'react';
import { getFiscalYear, getFiscalYearLabel, sortByFiscalMonth } from '../utils/aggregation';

interface MonthSelectorProps {
  months: string[];
  selectedMonth: string | null; // null=全期間, "FY:YYYY"=年度, "YYYY-MM"=月
  onSelect: (month: string | null) => void;
}

export function MonthSelector({
  months,
  selectedMonth,
  onSelect,
}: MonthSelectorProps) {
  const fiscalYears = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const m of months) {
      const fy = getFiscalYear(m);
      const list = map.get(fy) || [];
      list.push(m);
      map.set(fy, list);
    }
    return Array.from(map.entries())
      .map(([fy, ms]) => ({ fy, months: ms.sort(sortByFiscalMonth) }))
      .sort((a, b) => a.fy.localeCompare(b.fy));
  }, [months]);

  const isFiscalYear = selectedMonth?.startsWith('FY:') ?? false;
  const selectedFY = isFiscalYear ? selectedMonth!.slice(3) : null;

  const activeFY = selectedFY
    ?? (selectedMonth ? getFiscalYear(selectedMonth) : null);

  const activeMonths =
    fiscalYears.find((y) => y.fy === activeFY)?.months || [];

  const handleFYClick = (fy: string) => {
    const key = `FY:${fy}`;
    if (selectedMonth === key) {
      onSelect(null);
    } else {
      onSelect(key);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 space-y-3">
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-gray-600 shrink-0">
          表示期間
        </span>
        <div className="flex gap-1 flex-wrap">
          <button
            onClick={() => onSelect(null)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              selectedMonth === null
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            全期間
          </button>
          {fiscalYears.map(({ fy }) => {
            const key = `FY:${fy}`;
            return (
              <button
                key={fy}
                onClick={() => handleFYClick(fy)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  selectedMonth === key
                    ? 'bg-blue-600 text-white'
                    : activeFY === fy && selectedMonth !== null
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {getFiscalYearLabel(fy)}
              </button>
            );
          })}
        </div>
      </div>

      {activeFY && selectedMonth !== null && activeMonths.length > 0 && (
        <div className="flex items-center gap-1 pl-16 flex-wrap">
          {activeMonths.map((m) => {
            const mo = parseInt(m.split('-')[1]);
            return (
              <button
                key={m}
                onClick={() =>
                  onSelect(selectedMonth === m ? `FY:${activeFY}` : m)
                }
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  selectedMonth === m
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-50 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {mo}月
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
