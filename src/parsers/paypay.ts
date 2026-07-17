import Papa from 'papaparse';
import type { RawTransaction } from './smbc';

function parseDate(dateStr: string): string {
  // "2026/06/30 21:55:40" → "2026-06-30"
  const datePart = dateStr.trim().split(/\s+/)[0];
  const parts = datePart.split('/');
  if (parts.length === 3) {
    const [y, m, d] = parts;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }
  return datePart;
}

function parseAmount(amountStr: string): number {
  const cleaned = (amountStr || '').replace(/[,，¥￥円\s]/g, '');
  const num = parseInt(cleaned, 10);
  return isNaN(num) ? 0 : num;
}

export function parsePayPay(csvText: string): RawTransaction[] {
  const result = Papa.parse(csvText.replace(/^\uFEFF/, ''), {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h: string) => h.trim(),
  });

  if (!result.data.length) return [];

  const headers = Object.keys(result.data[0] as Record<string, string>);
  const findCol = (keyword: string) =>
    headers.find((h) => h.includes(keyword)) ?? null;

  const dateCol = findCol('取引日');
  const outCol = headers.find((h) => h.includes('出金金額') && !h.includes('海外')) ?? null;
  const contentCol = findCol('取引内容');
  const payeeCol = findCol('取引先');
  const methodCol = findCol('取引方法');

  if (!dateCol || !outCol || !payeeCol || !methodCol) return [];

  const transactions: RawTransaction[] = [];

  for (const row of result.data as Record<string, string>[]) {
    // 出金のみ対象（入金・チャージ・ポイント獲得などは除外）
    const amount = parseAmount(row[outCol]);
    if (amount <= 0) continue;

    const method = (row[methodCol] || '').trim();
    const content = contentCol ? (row[contentCol] || '').trim() : '';

    // ポイント利用・ポイント運用は実際の支出ではないため除外
    if (method.includes('ポイント')) continue;
    // 残高チャージは資金移動であり支出ではない（残高からの支払い側で計上）
    if (content === 'チャージ') continue;

    const payee = (row[payeeCol] || '').trim();
    if (!payee) continue;

    // クレジット払い → PayPayカード、PayPay残高・銀行口座払い → 現金・口座引落
    const isCredit = method.includes('クレジット');

    transactions.push({
      date: parseDate(row[dateCol] || ''),
      payee,
      amount,
      memo: isCredit ? '' : `${content}（${method}）`,
      cardBrand: isCredit ? 'paypay' : 'manual',
    });
  }

  return transactions;
}
