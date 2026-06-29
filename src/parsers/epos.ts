import type { CardBrand } from '../types';
import type { RawTransaction } from './smbc';

function parseEposDate(dateStr: string): string {
  const match = dateStr.trim().match(/(\d{4})年(\d{1,2})月(\d{1,2})日/);
  if (match) {
    const [, y, m, d] = match;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }
  const match2 = dateStr.trim().match(/(\d{4})年(\d{2})(\d{2})日/);
  if (match2) {
    const [, y, m, d] = match2;
    return `${y}-${m}-${d}`;
  }
  // YYYYMMDD or YYYY/MM/DD
  const match3 = dateStr.trim().match(/(\d{4})\/?(\d{2})\/?(\d{2})/);
  if (match3) {
    const [, y, m, d] = match3;
    return `${y}-${m}-${d}`;
  }
  return dateStr.trim();
}

function parseAmount(amountStr: string): number {
  const cleaned = amountStr.replace(/[,，¥￥円\s]/g, '');
  const num = parseInt(cleaned, 10);
  return isNaN(num) ? 0 : num;
}

export function parseEPOS(csvText: string): RawTransaction[] {
  const lines = csvText.split('\n');

  console.log(`[家計簿/EPOS] 行数: ${lines.length}`);
  for (let i = 0; i < Math.min(lines.length, 4); i++) {
    console.log(`[家計簿/EPOS] Line ${i}: ${lines[i]?.substring(0, 120)}`);
  }

  // ヘッダー検出: キーワードマッチ
  let headerIdx = -1;
  for (let i = 0; i < Math.min(lines.length, 10); i++) {
    const line = lines[i] || '';
    if (
      line.includes('種別') ||
      line.includes('ご利用年月日') ||
      line.includes('ご利用店') ||
      line.includes('支払区分')
    ) {
      headerIdx = i;
      break;
    }
  }

  // フォールバック: 7列前後のヘッダー行を構造で検出
  if (headerIdx < 0) {
    for (let i = 0; i < Math.min(lines.length, 5); i++) {
      const cols = (lines[i] || '').split(',');
      if (cols.length >= 6 && cols.length <= 10) {
        const hasNumericCols = cols.some((c) => /^\d+$/.test(c.trim()));
        if (!hasNumericCols) {
          headerIdx = i;
          console.log(`[家計簿/EPOS] 構造フォールバックでヘッダー検出: Line ${i}`);
          break;
        }
      }
    }
  }

  console.log(`[家計簿/EPOS] ヘッダー行: ${headerIdx}`);
  if (headerIdx < 0) return [];

  const headerCols = lines[headerIdx].split(',');
  console.log(`[家計簿/EPOS] ヘッダー列:`, headerCols.map((c, i) => `${i}:${c.trim()}`).join(', '));

  // カラム検出: キーワードマッチ → 位置フォールバック
  let dateIdx = headerCols.findIndex(
    (c) => c.includes('ご利用年月日') || c.includes('利用日') || c.includes('年月日')
  );
  let storeIdx = headerCols.findIndex(
    (c) => c.includes('ご利用場所') || c.includes('ご利用店') || c.includes('利用店')
  );
  let amountIdx = headerCols.findIndex(
    (c) => c.includes('ご利用金額') || c.includes('利用金額')
  );
  let paymentIdx = headerCols.findIndex((c) => c.includes('お支払金額'));

  // キーワードで見つからない場合、EPOS固定レイアウト（種別,年月日,店,内容,金額,支払金額,区分）を仮定
  if (dateIdx < 0 && headerCols.length >= 6) {
    console.log('[家計簿/EPOS] キーワード検出失敗、位置ベースで列を割り当て');
    dateIdx = 1;
    storeIdx = 2;
    amountIdx = 4;
    paymentIdx = 5;
  }

  console.log(`[家計簿/EPOS] 列: date=${dateIdx}, store=${storeIdx}, amount=${amountIdx}, payment=${paymentIdx}`);

  if (dateIdx < 0 || amountIdx < 0) return [];

  const transactions: RawTransaction[] = [];

  for (let i = headerIdx + 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    if (line.includes('合計') || line.startsWith(',')) continue;

    const cols = line.split(',');
    const dateCell = cols[dateIdx]?.trim() || '';

    if (!dateCell || dateCell.length < 4) continue;
    // 日付らしき文字列かチェック（年を含む or 数字で始まる）
    if (!dateCell.includes('年') && !/^\d{4}/.test(dateCell)) continue;

    const payee = (storeIdx >= 0 ? cols[storeIdx] : '')?.trim() || '';
    const amount = parseAmount(cols[amountIdx] || '');
    const billingAmount =
      paymentIdx >= 0 ? parseAmount(cols[paymentIdx] || '') : 0;

    if (!payee || amount === 0) continue;

    transactions.push({
      date: parseEposDate(dateCell),
      payee,
      amount: billingAmount > 0 ? billingAmount : amount,
      memo:
        billingAmount > 0 && billingAmount !== amount
          ? `利用額: ¥${amount.toLocaleString()}`
          : '',
      cardBrand: 'epos' as CardBrand,
    });
  }

  console.log(`[家計簿/EPOS] パース結果: ${transactions.length}件`);
  return transactions;
}
