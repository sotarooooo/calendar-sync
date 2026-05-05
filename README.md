# Calendar Sync

TimeTree と Google Calendar の予定を自動同期するフルスタック Web アプリケーション。
重複する予定のインテリジェントな検出・トリミング・分割を行い、複数カレンダー間のスケジュール管理を自動化します。

## 動機

複数のカレンダーサービス（TimeTree と Google Calendar）を併用していると、予定の二重管理や衝突の確認に手間がかかります。本アプリは、カレンダー間の同期ルールを設定するだけで、予定の重複検出・削除・コピーを自動で行い、手動管理のコストをゼロにします。

## アーキテクチャ

```
┌─────────────┐         ┌──────────────┐         ┌─────────────────┐
│  TimeTree   │────────▶│  SyncEngine  │────────▶│ Google Calendar │
│  (source)   │         │              │         │   (target)      │
└─────────────┘         └──────┬───────┘         └─────────────────┘
                               │
                      ┌────────▼────────┐
                      │    Supabase     │
                      │ (rules + logs)  │
                      └─────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│  GitHub Actions (cron: 5分間隔)                                  │
│  run-sync.ts → SyncEngine → ルールに基づき自動同期               │
└──────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│  Next.js Dashboard (Vercel)                                      │
│  ダッシュボード / ルール管理 / ログ履歴 / カレンダープレビュー    │
│  Supabase Auth によるアクセス制御                                │
└──────────────────────────────────────────────────────────────────┘
```

## 技術スタック

| カテゴリ | 技術 |
|---------|------|
| フロントエンド | Next.js 16 (App Router), React 19, Tailwind CSS 4 |
| バックエンド | Next.js API Routes, Supabase (PostgreSQL) |
| 認証 | Supabase Auth (email/password) |
| カレンダー連携 | Google Calendar API (サービスアカウント), TimeTree 内部 API |
| 同期エンジン | カスタム overlap 検出 + trim/split ロジック |
| スケジューリング | GitHub Actions cron (5分間隔) |
| テスト | Vitest |

## 主な機能

- **2つの同期モード**: `delete_overlap`（重複する target 側イベントを削除/トリミング）と `copy`（source のイベントを target に複製）
- **インテリジェントな重複処理**: 完全重複 → 削除、部分重複 → トリミング、中間重複 → 分割
- **ダッシュボード**: 同期状況のリアルタイム確認、ルールの CRUD、同期ログ履歴
- **カレンダープレビュー**: TimeTree と Google Calendar の予定を統合表示
- **認証**: Supabase Auth によるログイン保護

## セットアップ

### 前提条件

- Node.js 20+
- Supabase プロジェクト
- Google Cloud サービスアカウント（Calendar API 有効化済み）
- TimeTree アカウント

### インストール

```bash
git clone https://github.com/sotarooooo/calendar-sync.git
cd calendar-sync
npm install
```

### Supabase テーブル作成

Supabase の SQL Editor で以下を実行してください:

```sql
CREATE TABLE sync_rules (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  source_provider TEXT NOT NULL,
  target_provider TEXT NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('delete_overlap', 'copy')),
  look_ahead_days INTEGER NOT NULL DEFAULT 30,
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE sync_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  rule_id UUID REFERENCES sync_rules(id),
  action TEXT NOT NULL,
  event_title TEXT,
  event_start TIMESTAMPTZ,
  event_end TIMESTAMPTZ,
  status TEXT NOT NULL CHECK (status IN ('success', 'error')),
  message TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### 環境変数

`.env.local` を作成して以下を設定:

| 変数名 | 説明 |
|--------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase プロジェクトの URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase の anon キー |
| `SUPABASE_SERVICE_KEY` | Supabase の service role キー |
| `GOOGLE_SERVICE_ACCOUNT_KEY` | サービスアカウントの JSON キー全体 |
| `GOOGLE_CALENDAR_ID` | 同期対象の Google Calendar ID |
| `GOOGLE_OWNER_EMAIL` | カレンダーオーナーのメールアドレス |
| `TIMETREE_EMAIL` | TimeTree のログインメールアドレス |
| `TIMETREE_PASSWORD` | TimeTree のパスワード |
| `TIMETREE_CALENDAR_ID` | TimeTree のカレンダー ID（省略可） |
| `TIMETREE_AUTHOR_ID` | フィルタ対象の著者 ID（省略可） |

### 認証ユーザーの作成

Supabase ダッシュボード → Authentication → Users → Create User でログイン用アカウントを作成してください。

### デプロイ

- **Vercel**: リポジトリを接続し、環境変数を設定
- **GitHub Actions**: リポジトリの Settings → Secrets に同じ環境変数を設定

## 開発

```bash
npm run dev        # 開発サーバー起動
npm run sync       # 手動同期実行
npm test           # ユニットテスト実行
npm run build      # プロダクションビルド
```

## 設計の工夫

### Provider パターン
`CalendarProvider` インターフェースにより、TimeTree と Google Calendar を統一的に扱えます。新しいカレンダーサービスを追加する場合は、このインターフェースを実装するだけで対応可能です。

### SyncEngine の overlap 検出
単純な「重複したら削除」ではなく、部分重複の場合は予定をトリミングし、予定の中間に重複がある場合は分割して残すロジックを実装しています。

### サービスアカウント認証
OAuth2 のリフレッシュトークン失効問題を回避するため、Google Calendar API にはサービスアカウント（JWT 認証）を採用しています。
