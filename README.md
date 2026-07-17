# 家計簿アプリ（kakeibo）

クレジットカードの利用明細CSVを取り込んで、支出の自動分類・可視化・AI分析までできる家計簿Webアプリです。データはすべてブラウザのローカルストレージに保存されるため、サーバーに家計データが残りません。

## 公開URL

| 環境 | URL | 備考 |
|---|---|---|
| Vercel | https://kakeibo-app-sandy.vercel.app | **AI家計分析が使えるのはこちら** |
| GitHub Pages | https://masatotodaka.github.io/kakeibo/ | 静的ホスティング（AI分析は不可） |

## 主な機能

### 明細CSVの取り込み
各カード会社の利用明細CSVをドラッグ&ドロップで取り込めます。文字コード（UTF-8 / Shift_JIS / EUC-JP）とカード種別は自動判定され、同じファイルの二重取り込みも防止されます。

対応フォーマット:

- **三井住友カード（Vpass）** — Olive / NLゴールド / Amazon Masterのサブカードも明細内のカード情報から自動判別
- **イオンカード**
- **エポスカード**
- **PayPay** — クレジット払いはPayPayカード、PayPay残高からの支払いは「現金・PayPay・口座引落」として計上。チャージ・ポイント利用・個人間送金は自動で除外
- **手動入力** — 現金支出や口座引落は画面から直接追加可能

### 支出の自動分類
- 支払先名のキーワードから18カテゴリ（食費・外食費・住居費・通信費・ガソリン代・美容院・お土産代など）に自動分類し、固定費/変動費も判定
- 分類ルールは画面から自由に追加・編集でき、変更は既存明細に即時反映
- 明細一覧でカテゴリを手動変更すると、その支払先のルールが自動登録され、同じ支払先の他の明細にも一括適用

### 可視化・集計
- 月別・年度別（4月始まり）の切り替え表示
- カテゴリ別円グラフ、カード別内訳、支払先別集計、月次推移グラフ
- 年間収支サマリー（収入・支出・収支バランス）
- 銀行口座残高・収入の記録

### AI家計分析（Vercel版のみ）
Google Gemini APIを使って、収支バランスや資産形成についてファイナンシャルプランナー視点のアドバイスを生成します。

- 分析対象を「全期間 / 年度 / 月」から選択でき、選んだ範囲のデータだけをAIに送信
- 分析の観点は自由記述のプロンプトでカスタマイズ可能
- APIキーはサーバーレス関数側で保持し、ブラウザには露出しません

## 技術スタック

- **フロントエンド**: React 19 + TypeScript + Vite + Tailwind CSS v4
- **グラフ**: Recharts
- **CSVパース**: PapaParse
- **AI**: Google Gemini API（gemini-2.5-flash-lite）を Vercel Serverless Functions 経由で呼び出し
- **データ保存**: ブラウザの localStorage（サーバーには保存しない）

## 開発環境のセットアップ

```bash
npm install
npm run dev
```

AI分析をローカルで動かす場合は、Gemini APIキーを用意して `vercel dev` を使います。

```bash
# .env.local を作成
echo "GEMINI_API_KEY=<your-api-key>" > .env.local

npx vercel dev
```

APIキーは [Google AI Studio](https://aistudio.google.com/apikey) で無料で取得できます。

## ビルド・デプロイ

```bash
# 型チェック + ビルド
npx tsc --noEmit && npx vite build
```

### Vercel（AI分析あり）

```bash
vercel --prod
```

環境変数 `GEMINI_API_KEY` をVercelのプロジェクト設定（Production）に登録してください。

### GitHub Pages（静的版）

`master` ブランチにpushすると、GitHub Actions（[.github/workflows/deploy.yml](.github/workflows/deploy.yml)）が `GITHUB_PAGES=1` 付きでビルドして自動デプロイします。ベースパスは [vite.config.ts](vite.config.ts) で環境変数により `/kakeibo/` と `/` を切り替えています。

## プロジェクト構成

```
├── api/
│   └── advice.ts            # AI分析用サーバーレス関数（Gemini APIプロキシ）
├── src/
│   ├── components/          # UIコンポーネント（明細一覧・グラフ・AI分析など）
│   ├── parsers/             # カード別CSVパーサ（smbc / aeon / epos / paypay）
│   ├── utils/
│   │   ├── classifier.ts    # 支出の自動分類ロジック
│   │   ├── aggregation.ts   # 月次・年度集計（4月始まり）
│   │   └── storage.ts       # localStorage永続化
│   ├── config/
│   │   └── classificationRules.ts  # カテゴリ定義・初期分類ルール
│   └── types/               # 型定義（カード銘柄・明細・ルールなど）
└── vercel.json              # Vercelビルド設定
```

## データの取り扱い

- 明細・口座・収入などの家計データはすべて**ブラウザのlocalStorage**に保存されます。別の端末・ブラウザとは同期されません
- AI分析実行時のみ、選択した範囲の集計サマリー（カテゴリ別金額など）がサーバーレス関数経由でGemini APIに送信されます。明細の生データは送信されません
- 「全データ削除」ボタンでローカルデータを完全に消去できます
