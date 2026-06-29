import type { ClassificationRule, ExpenseType, Transaction } from '../types';
import type { RawTransaction } from '../parsers';

let idCounter = 0;

function normalize(s: string): string {
  return s
    .replace(/[Ａ-Ｚａ-ｚ０-９]/g, (ch) =>
      String.fromCharCode(ch.charCodeAt(0) - 0xfee0)
    )
    .replace(/[＊＃＆＠＋＝]/g, (ch) =>
      String.fromCharCode(ch.charCodeAt(0) - 0xfee0)
    )
    .replace(/[　]/g, ' ')
    .replace(/[－ー―‐–—]/g, '-')
    .replace(/[．]/g, '.')
    .replace(/[，]/g, ',')
    .replace(/[／]/g, '/')
    .replace(/[（(]/g, '(')
    .replace(/[）)]/g, ')')
    .toUpperCase();
}

const KEYWORD_HINTS: { keywords: string[]; category: string; expenseType: ExpenseType }[] = [
  // 光熱費
  { keywords: ['電気', '電力', 'ガス', '水道', '光熱', 'TEPCO', 'エナジー', 'エネルギー', '関電', '東電', '中電', '九電', '東北電', '北電', '四電', '北陸電'], category: '光熱費', expenseType: 'fixed' },
  // 通信費
  { keywords: ['通信', '携帯', 'モバイル', 'MOBILE', 'WIFI', 'WI-FI', 'インターネット', '料金プラン', '回線'], category: '通信費', expenseType: 'fixed' },
  // 保険
  { keywords: ['保険', '共済', 'INSURANCE'], category: '保険料', expenseType: 'fixed' },
  // 住居
  { keywords: ['家賃', '賃貸', '不動産', 'マンション管理', '住宅'], category: '住居費', expenseType: 'fixed' },
  // サブスク
  { keywords: ['月額', 'サブスク', 'SUBSCRIPTION', 'PREMIUM', 'MEMBERSHIP', 'MONTHLY', '定額', '有料会員'], category: 'サブスク', expenseType: 'fixed' },
  // 食費
  { keywords: ['食品', '食料', '青果', '精肉', '鮮魚', 'グロサリー', 'GROCERY', 'フード', 'FOOD'], category: '食費', expenseType: 'variable' },
  // 外食
  { keywords: ['飲食', '食堂', '弁当', 'ランチ', 'ディナー', 'RESTAURANT', 'DINING', 'CAFE', 'COFFEE', 'デリバリー', 'DELIVERY', 'EATS', '居酒屋', '焼肉', '寿司', 'すし', 'ラーメン', 'うどん', 'そば', 'ピザ', 'PIZZA', 'バーガー', 'BURGER'], category: '外食費', expenseType: 'variable' },
  // 交通
  { keywords: ['タクシー', '鉄道', '航空', '高速', 'TAXI', 'TRAIN', 'AIRLINE', 'FLIGHT', 'バス', 'BUS', '乗車', '運賃', '定期券'], category: '交通費', expenseType: 'variable' },
  // 日用品
  { keywords: ['ドラッグ', 'DRUG', '日用品', '洗剤', 'ホームセンター', 'DIY', 'HOMECENTER'], category: '日用品', expenseType: 'variable' },
  // 医療
  { keywords: ['医療', '診療', '処方', '薬', 'CLINIC', 'HOSPITAL', 'PHARMACY', '調剤', '検査', '健診'], category: '医療費', expenseType: 'variable' },
  // 投資
  { keywords: ['証券', '投信', '株式', 'ファンド', 'FUND', 'STOCK', '運用', 'NISA', 'IDECO'], category: '投資', expenseType: 'fixed' },
  // 教育
  { keywords: ['学費', '受講', '教材', '参考書', 'SCHOOL', 'ACADEMY', '研修', 'セミナー', '講座'], category: '教育費', expenseType: 'variable' },
  // 娯楽
  { keywords: ['映画', 'シネマ', 'ライブ', 'チケット', 'TICKET', 'CINEMA', 'ENTERTAINMENT', 'ゲーム', 'GAME', 'アミューズ', '遊園地', 'テーマパーク', 'スポーツ', 'SPORT', 'フィットネス', 'FITNESS'], category: '娯楽費', expenseType: 'variable' },
  // ショッピング
  { keywords: ['ショッピング', 'SHOPPING', 'STORE', 'SHOP', 'モール', 'MALL', '百貨店', 'デパート', 'アウトレット'], category: 'ショッピング', expenseType: 'variable' },
];

function inferCategory(normalizedPayee: string): { category: string; expenseType: ExpenseType } {
  for (const hint of KEYWORD_HINTS) {
    if (hint.keywords.some((kw) => normalizedPayee.includes(normalize(kw)))) {
      return { category: hint.category, expenseType: hint.expenseType };
    }
  }
  return { category: 'その他', expenseType: 'variable' };
}

export function classifyTransaction(
  raw: RawTransaction,
  rules: ClassificationRule[]
): Transaction {
  const normalizedPayee = normalize(raw.payee);

  for (const rule of rules) {
    if (normalizedPayee.includes(normalize(rule.pattern))) {
      return {
        id: `txn-${++idCounter}`,
        date: raw.date,
        payee: raw.payee,
        amount: raw.amount,
        cardBrand: raw.cardBrand,
        category: rule.category,
        expenseType: rule.expenseType,
        memo: raw.memo,
      };
    }
  }

  const inferred = inferCategory(normalizedPayee);

  return {
    id: `txn-${++idCounter}`,
    date: raw.date,
    payee: raw.payee,
    amount: raw.amount,
    cardBrand: raw.cardBrand,
    category: inferred.category,
    expenseType: inferred.expenseType,
    memo: raw.memo,
  };
}

export function classifyTransactions(
  rawTransactions: RawTransaction[],
  rules: ClassificationRule[]
): Transaction[] {
  return rawTransactions.map((raw) => classifyTransaction(raw, rules));
}
