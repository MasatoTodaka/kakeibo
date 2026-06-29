import Papa from 'papaparse';
import type { CardBrand } from '../types';

export interface RawTransaction {
  date: string;
  payee: string;
  amount: number;
  memo: string;
  cardBrand: CardBrand;
}

const CARD_NUMBER_PATTERN = /\d{4}-\d{2}\*{2}-\*{4}-\*{4}/;

function parseDate(dateStr: string): string {
  const cleaned = dateStr.trim().replace(/\//g, '-');
  const parts = cleaned.split('-');
  if (parts.length === 3) {
    const [y, m, d] = parts;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }
  return cleaned;
}

function parseAmount(amountStr: string): number {
  const cleaned = amountStr.replace(/[,，¥￥円\s]/g, '');
  const num = parseInt(cleaned, 10);
  return isNaN(num) ? 0 : num;
}

function isDateString(s: string): boolean {
  return /^\d{4}\/\d{1,2}\/\d{1,2}$/.test(s.trim());
}

function isCardInfoLine(line: string): boolean {
  return CARD_NUMBER_PATTERN.test(line);
}

function normalizeWidth(s: string): string {
  return s.replace(/[Ａ-Ｚａ-ｚ０-９]/g, (ch) =>
    String.fromCharCode(ch.charCodeAt(0) - 0xfee0)
  );
}

function detectSubBrand(description: string, fallback: CardBrand): CardBrand {
  const text = normalizeWidth(description).toUpperCase();
  if (text.includes('OLIVE')) return 'olive';
  if (text.includes('マスター') || text.includes('MASTER') || text.includes('AMAZON')) return 'amazon-master';
  if (text.includes('NL') || text.includes('ゴールド') || text.includes('GOLD')) return 'nl-gold';
  // iD/バーチャル等のサブカードはメインカードのブランドを引き継ぐ
  return fallback;
}

function extractSubBrand(line: string, currentBrand: CardBrand): CardBrand {
  const parts = line.split(',');
  const cardNum = parts[1]?.trim() || '';
  const description = parts[2]?.trim() || '';
  const brand = detectSubBrand(description, currentBrand);
  console.log(`[家計簿] カード検出: 番号=${cardNum}, 名称="${description}" → ${brand}`);
  return brand;
}

export function parseSMBC(csvText: string): RawTransaction[] {
  const lines = csvText.split('\n');

  const hasHeaders = lines.some(
    (l) =>
      l.includes('ご利用日') &&
      (l.includes('ご利用先') || l.includes('ご利用内容'))
  );

  if (hasHeaders) {
    return parseWithHeaders(csvText);
  }

  const transactions: RawTransaction[] = [];
  let currentBrand: CardBrand = 'smbc';

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    if (isCardInfoLine(trimmed)) {
      currentBrand = extractSubBrand(trimmed, currentBrand);
      continue;
    }

    const cols = trimmed.split(',');
    if (cols.length < 3) continue;

    const dateCell = cols[0].trim();
    if (!isDateString(dateCell)) continue;

    const payee = cols[1]?.trim() || '';
    const totalAmount = parseAmount(cols[2] || '');
    const currentPayment = cols.length >= 6 ? parseAmount(cols[5] || '') : 0;
    // 今回支払額があればそちらを使用（分割払い対応）
    const amount = currentPayment > 0 ? currentPayment : totalAmount;
    const extraInfo = cols[6]?.trim() || '';

    let memo = '';
    if (currentPayment > 0 && currentPayment !== totalAmount) {
      memo = `利用額: ¥${totalAmount.toLocaleString()}`;
      if (extraInfo) memo += ` (${extraInfo})`;
    } else if (extraInfo) {
      memo = extraInfo;
    }

    if (!payee || amount === 0) continue;

    transactions.push({
      date: parseDate(dateCell),
      payee,
      amount,
      memo,
      cardBrand: currentBrand,
    });
  }

  return transactions;
}

function parseWithHeaders(csvText: string): RawTransaction[] {
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

  const dateCol = findCol(['ご利用日', '利用日']);
  const payeeCol = findCol(['ご利用先・ご利用内容', 'ご利用先', '利用先']);
  const amountCol = findCol(['ご利用金額', '利用金額']);
  const memoCol = findCol(['備考', 'メモ']);

  if (!dateCol || !payeeCol || !amountCol) return [];

  return (result.data as Record<string, string>[])
    .filter((row) => row[dateCol] && row[amountCol])
    .map((row) => ({
      date: parseDate(row[dateCol]),
      payee: (row[payeeCol] || '').trim(),
      amount: parseAmount(row[amountCol]),
      memo: memoCol ? (row[memoCol] || '').trim() : '',
      cardBrand: 'smbc' as CardBrand,
    }))
    .filter((t) => t.amount !== 0);
}
