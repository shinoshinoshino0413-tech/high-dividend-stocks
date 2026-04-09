# 高配当株モニター

スプレッドシート運用で詰まりやすい `実行時間制限` や `ログの見づらさ` を避けるために、Next.js で作る最小構成のWebアプリ雛形です。

## 技術構成

- Next.js App Router
- TypeScript
- Tailwind CSS
- Prisma
- SQLite
- Yahoo Finance / stooq / 株探 / IR Bank のフォールバック取得

## できること

- 銘柄一覧の表示
- コード・企業名での検索
- Google Sheets から銘柄コードと目安利回りを取込
- Google Sheets 取込後にそのまま株価・年間配当を更新
- 手動更新ボタンから株価・年間配当を再取得
- 現在利回り、目安株価の自動計算
- 更新ログの保存

## 初期セットアップ手順

1. Node.js 20系以上を入れる
2. このプロジェクト直下で `.env` を作る
3. 依存関係をインストールする
4. Prisma Client とSQLite DBを作る
5. サンプルデータを投入する
6. 開発サーバーを起動する

### 1. `.env` を作成

`.env.example` をコピーして `.env` を作ります。  
`DATABASE_URL` は Prisma と日本語パスの相性回避のため、最初は `/tmp` のSQLiteを使う設定にしています。

```bash
cp .env.example .env
```

### 2. パッケージをインストール

```bash
npm install
```

### 3. DBを作成

```bash
npm run db:generate
npm run db:push
npm run db:seed
```

もし `prisma db push` が環境依存で落ちる場合は、次の回避手順を使います。

```bash
npm run db:generate
npm run db:init
```

### 4. 開発サーバーを起動

```bash
npm run dev
```

起動後、[http://localhost:3000](http://localhost:3000) を開きます。

## Google Sheets 取込手順

`一覧` シートの `A列=コード` `B列=企業名` `Y列=目安利回り` を取り込みます。  
行の読み取り開始はスプレッドシートと同じく `5行目` 前提です。

### 方式1: 公開CSVで取り込む

1. Google Sheets で対象スプレッドシートを開く
2. URL から `SPREADSHEET_ID` を確認する
3. 対象シート `一覧` の `gid` を確認する
4. 次の形式で CSV URL を作る
5. `.env` の `SHEETS_CSV_URL` に設定する
6. `/stocks` 画面の `Google Sheets から取込して更新` を押す

CSV URL の形式:

```txt
https://docs.google.com/spreadsheets/d/<SPREADSHEET_ID>/export?format=csv&gid=<SHEET_GID>
```

`SPREADSHEET_ID` は、たとえば次の URL の `/d/` と `/edit` の間です。

```txt
https://docs.google.com/spreadsheets/d/xxxxxxxxxxxxxxxxxxxx/edit#gid=123456789
```

`gid` は URL 末尾の `#gid=123456789` の数字です。

この方式は、少なくとも対象シートをCSVとして読める公開設定が必要です。

### 方式2: 非公開シートを Google Sheets API で取り込む

公開したくない場合はサービスアカウント方式を使います。  
このアプリは `SHEETS_CSV_URL` が空のとき、以下の `.env` が揃っていれば Google Sheets API を使います。

```env
GOOGLE_SPREADSHEET_ID="..."
GOOGLE_SHEET_NAME="一覧"
GOOGLE_SERVICE_ACCOUNT_EMAIL="..."
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

手順:

1. Google Cloud でプロジェクトを作る
2. Google Sheets API を有効化する
3. サービスアカウントを作る
4. JSON キーを発行する
5. スプレッドシートをそのサービスアカウントのメールアドレスに共有する
6. JSON の `client_email` を `GOOGLE_SERVICE_ACCOUNT_EMAIL` に設定する
7. JSON の `private_key` を `GOOGLE_PRIVATE_KEY` に設定する
8. スプレッドシートIDを `GOOGLE_SPREADSHEET_ID` に設定する
9. `/stocks` 画面の `Google Sheets から取込して更新` を押す

`GOOGLE_PRIVATE_KEY` は `.env` では改行を `\n` として入れてください。

優先順位は次の通りです。

1. `SHEETS_CSV_URL` があれば CSV 取込
2. なければ Google Sheets API 取込

## 画面構成

- `/`
  導入ページ
- `/stocks`
  銘柄一覧ページ
- `/stocks/[code]`
  銘柄詳細ページ

## API

- `GET /api/stocks`
  一覧取得
- `POST /api/scrape`
  全銘柄更新
- `POST /api/scrape` with `{ "code": "8058" }`
  単一銘柄更新
- `POST /api/import/sheets`
  Google Sheets から銘柄一覧を取込
- `POST /api/cron`
  定期実行用
- `GET /api/cron`
  Vercel Cron 用

## 定期実行の考え方

このプロジェクトは `Vercel Cron` 前提で毎朝自動実行できるようにしてあります。

- `/api/cron` は `GET` / `POST` の両方に対応
- `Authorization: Bearer <CRON_SECRET>` が必要
- Google Sheets 設定が入っていれば `Sheets同期 → 株価・配当金更新`
- 未設定なら `株価・配当金更新` のみ実行

`vercel.json` では次の設定を入れています。

```json
{
  "crons": [
    {
      "path": "/api/cron",
      "schedule": "0 22 * * *"
    }
  ]
}
```

これは `UTC 22:00` 実行なので、日本時間では `毎朝 7:00` です。

### Vercel に設定するもの

1. このリポジトリを Vercel にデプロイ
2. Vercel の Project Settings → Environment Variables を開く
3. 少なくとも次を登録する

```env
CRON_SECRET="任意の長いランダム文字列"
DATABASE_URL="本番DBの接続先"
```

4. Google Sheets API 方式なら、`.env` に入れた以下も Vercel に同じように登録する

```env
GOOGLE_SPREADSHEET_ID="..."
GOOGLE_SHEET_NAME="一覧"
GOOGLE_DIVIDEND_SHEET_NAME="配当"
GOOGLE_SERVICE_ACCOUNT_EMAIL="..."
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

### 動作確認

デプロイ後、手動で叩くなら次のように実行できます。

```bash
curl -H "Authorization: Bearer <CRON_SECRET>" https://<your-domain>/api/cron
```

## 今後の拡張候補

- CSVインポート
- Google Sheets 書き戻し
- 条件通知
- セクター別比較
- 配当履歴グラフ

## 実装メモ

- Yahoo Finance が取れないケースに備えて、価格は `stooq`、名称は `IR Bank`、配当は `株探` にフォールバックします。
- スクレイピング元のHTML構造は変わることがあるので、取得処理は `src/server/scrape/` に分離しています。
