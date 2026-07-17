import type { CardBrand } from '../types';
import { parseSMBC } from './smbc';
import { parseAEON } from './aeon';
import { parseEPOS } from './epos';
import { parsePayPay } from './paypay';
import type { RawTransaction } from './smbc';

export type { RawTransaction };

const ALL_BRANDS: CardBrand[] = ['paypay', 'epos', 'aeon', 'smbc'];

export function detectCardBrand(csvText: string, fileName?: string): CardBrand | null {
  // ファイル名による判定（CSV内にヘッダーが無いカード向け）
  if (fileName) {
    const name = fileName.toLowerCase();
    if (name.includes('usedetailreference')) return 'epos';
    if (name.includes('meisai')) return 'aeon';
  }

  const head = csvText.substring(0, 2000);

  // PayPay: 取引履歴CSVのヘッダーキーワード
  if (head.includes('取引日') && head.includes('取引方法') && head.includes('取引番号')) return 'paypay';

  // エポスカード: CSVヘッダーのキーワード
  if (head.includes('種別') && head.includes('ご利用年月日')) return 'epos';
  if ((head.includes('ご利用店') || head.includes('ご利用場所')) && head.includes('お支払金額') && head.includes('支払区分')) return 'epos';

  // イオンカード
  if (head.includes('ご利用カード') || head.includes('利用者区分') || head.includes('WAON')) return 'aeon';
  if (head.includes('ご利用店名') || (head.includes('お支払い区分') && head.includes('回払い'))) return 'aeon';

  // 三井住友カード (Vpass)
  if (head.includes('ご利用先・ご利用内容') || head.includes('今回のお支払金額')) return 'smbc';
  if (/\d{4}-\d{2}\*{2}-\*{4}-\*{4}/.test(head)) return 'smbc';

  const lines = head.split('\n');
  for (const line of lines) {
    const cols = line.split(',');
    if (cols.length >= 6 && /^\d{4}\/\d{1,2}\/\d{1,2}$/.test(cols[0].trim())) return 'smbc';
  }

  return null;
}

export function parseCSV(csvText: string, cardBrand: CardBrand): RawTransaction[] {
  switch (cardBrand) {
    case 'smbc':
    case 'olive':
    case 'nl-gold':
    case 'amazon-master':
      return parseSMBC(csvText);
    case 'aeon':
      return parseAEON(csvText);
    case 'epos':
      return parseEPOS(csvText);
    case 'paypay':
      return parsePayPay(csvText);
    case 'manual':
      return [];
  }
}

export function autoParseCSV(
  csvText: string,
  fileName?: string
): { transactions: RawTransaction[]; detectedBrand: CardBrand } | null {
  const brand = detectCardBrand(csvText, fileName);

  if (brand) {
    const transactions = parseCSV(csvText, brand);
    if (transactions.length > 0) {
      return { transactions, detectedBrand: brand };
    }
  }

  for (const b of ALL_BRANDS) {
    if (b === brand) continue;
    const transactions = parseCSV(csvText, b);
    if (transactions.length > 0) {
      return { transactions, detectedBrand: b };
    }
  }

  return null;
}

const JAPANESE_ENCODINGS = ['utf-8', 'shift-jis', 'euc-jp'] as const;

function countJapanese(text: string): number {
  const m = text.match(/[　-鿿豈-﫿＀-￯]/g);
  return m ? m.length : 0;
}

export function detectEncoding(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);

  // UTF-8 BOM
  if (bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
    return 'utf-8';
  }
  // UTF-16 LE BOM
  if (bytes[0] === 0xff && bytes[1] === 0xfe) {
    return 'utf-16le';
  }

  let bestEncoding = 'utf-8';
  let bestScore = -1;

  for (const enc of JAPANESE_ENCODINGS) {
    try {
      const text = new TextDecoder(enc).decode(buffer);
      const jpCount = countJapanese(text);
      const errorCount = (text.match(/�/g) || []).length;
      const score = jpCount * 2 - errorCount * 3;
      if (score > bestScore) {
        bestScore = score;
        bestEncoding = enc;
      }
    } catch {
      // encoding not supported
    }
  }

  return bestEncoding;
}

export async function readFileAsText(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const encoding = detectEncoding(buffer);
  const text = new TextDecoder(encoding).decode(buffer);
  console.log(`[家計簿] ファイル: ${file.name}, 検出エンコーディング: ${encoding}`);
  console.log(`[家計簿] デコード結果 1行目:`, text.split('\n')[0]);
  return text;
}
