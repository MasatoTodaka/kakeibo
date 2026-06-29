import Papa from 'papaparse';
import type { CardBrand } from '../types';
import type { RawTransaction } from './smbc';

function parseYYMMDD(dateStr: string): string {
  const cleaned = dateStr.trim();
  const match = cleaned.match(/^(\d{2})(\d{2})(\d{2})$/);
  if (match) {
    const [, yy, mm, dd] = match;
    return `20${yy}-${mm}-${dd}`;
  }
  return cleaned;
}

function parseAmount(amountStr: string): number {
  const cleaned = amountStr.replace(/[,，¥￥円\s]/g, '');
  const num = parseInt(cleaned, 10);
  return isNaN(num) ? 0 : num;
}

export function parseAEON(csvText: string): RawTransaction[] {
  const lines = csvText.split('\n');
  const transactions: RawTransaction[] = [];

  // Find the detail sections by scanning for header rows
  let i = 0;
  while (i < lines.length) {
    const line = lines[i].trim();

    // Main transaction section: header starts with ご利用日 and contains 利用者区分 or ご利用先
    if (
      line.startsWith('ご利用日') &&
      (line.includes('利用者区分') || line.includes('ご利用先'))
    ) {
      const cols = line.split(',');
      const dateIdx = 0;
      const payeeIdx = cols.findIndex(
        (c) => c.includes('ご利用先') || c.includes('利用先')
      );
      const amountIdx = cols.findIndex((c) => c.includes('ご利用金額'));
      const memoIdx = cols.findIndex((c) => c.includes('備考'));

      i++;
      while (i < lines.length) {
        const dataLine = lines[i].trim();
        if (!dataLine || dataLine.startsWith('割') || dataLine.startsWith('ボーナス')) break;

        const dataCols = dataLine.split(',');
        const dateCell = dataCols[dateIdx]?.trim() || '';

        if (!/^\d{6}$/.test(dateCell)) {
          // Not a YYMMDD date — might be a section header or summary
          if (dateCell.includes('ご利用') || dateCell.includes('合計') || dateCell === '') {
            i++;
            continue;
          }
          break;
        }

        const payee = (payeeIdx >= 0 ? dataCols[payeeIdx] : '')?.trim() || '';
        const amount = amountIdx >= 0 ? parseAmount(dataCols[amountIdx] || '') : 0;
        const memo = memoIdx >= 0 ? (dataCols[memoIdx] || '').trim() : '';

        if (payee && amount !== 0) {
          transactions.push({
            date: parseYYMMDD(dateCell),
            payee,
            amount,
            memo,
            cardBrand: 'aeon',
          });
        }
        i++;
      }
      continue;
    }

    // Installment section: header starts with ご利用日 and contains 支払回 or 今回ご請求
    if (
      line.startsWith('ご利用日') &&
      (line.includes('支払回') || line.includes('今回'))
    ) {
      const cols = line.split(',');
      const dateIdx = 0;
      const payeeIdx = cols.findIndex((c) => c.includes('ご利用先'));
      const billingIdx = cols.findIndex((c) => c.includes('今回ご請求'));

      i++;
      while (i < lines.length) {
        const dataLine = lines[i].trim();
        if (!dataLine) break;

        const dataCols = dataLine.split(',');
        const dateCell = dataCols[dateIdx]?.trim() || '';

        if (!/^\d{6}$/.test(dateCell)) {
          i++;
          continue;
        }

        const payee = (payeeIdx >= 0 ? dataCols[payeeIdx] : '')?.trim() || '';
        const amount = billingIdx >= 0 ? parseAmount(dataCols[billingIdx] || '') : 0;

        if (payee && amount !== 0) {
          transactions.push({
            date: parseYYMMDD(dateCell),
            payee,
            amount,
            memo: '分割払い',
            cardBrand: 'aeon',
          });
        }
        i++;
      }
      continue;
    }

    i++;
  }

  // Fallback: try old simple header format (ご利用日,ご利用店名,ご利用金額,...)
  if (transactions.length === 0) {
    return parseLegacyAEON(csvText);
  }

  return transactions;
}

function parseLegacyAEON(csvText: string): RawTransaction[] {
  const result = Papa.parse(csvText, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h: string) => h.trim(),
  });

  if (!result.data.length) return [];

  const headers = Object.keys(result.data[0] as Record<string, string>);

  const findCol = (candidates: string[]) => {
    for (const c of candidates) {
      const found = headers.find((h) => h.includes(c) || c.includes(h));
      if (found) return found;
    }
    return null;
  };

  const dateCol = findCol(['ご利用日', '利用日', 'お買上日']);
  const payeeCol = findCol(['ご利用店名', 'ご利用先', '利用先']);
  const amountCol = findCol(['ご利用金額', '利用金額']);
  const memoCol = findCol(['備考', 'メモ']);

  if (!dateCol || !payeeCol || !amountCol) return [];

  return (result.data as Record<string, string>[])
    .filter((row) => row[dateCol] && row[amountCol])
    .map((row) => {
      const dateStr = row[dateCol].trim().replace(/\//g, '-');
      const parts = dateStr.split('-');
      const date =
        parts.length === 3
          ? `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`
          : dateStr;
      return {
        date,
        payee: (row[payeeCol] || '').trim(),
        amount: parseAmount(row[amountCol]),
        memo: memoCol ? (row[memoCol] || '').trim() : '',
        cardBrand: 'aeon' as CardBrand,
      };
    })
    .filter((t) => t.amount !== 0);
}
