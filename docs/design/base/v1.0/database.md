データベース設計（Supabase / PostgreSQL）

ER図・データモデル（主要テーブル）
- users（Supabase標準auth.usersを利用）
- households: 世帯
- household_members: 世帯-ユーザー関係
- categories: カテゴリ（ユーザー/世帯カスタム）
- accounts: アカウント（支払元/収入元）
- transactions: 収入/支出明細
- comments: コメント
- reactions: スタンプ（絵文字リアクション）
- subscriptions: サブスク定義
- notifications: アプリ内通知

テーブル定義（DDLイメージ）
-- households
- id (uuid, pk, default uuid_generate_v4())
- name (text)
- created_by (uuid, fk -> auth.users)
- created_at (timestamptz default now())
- updated_at (timestamptz default now())

-- household_members
- id (uuid, pk)
- household_id (uuid, fk -> households)
- user_id (uuid, fk -> auth.users)
- role (text default 'member')
- invited_at (timestamptz)
- joined_at (timestamptz)
- unique (household_id, user_id)

-- categories
- id (uuid, pk)
- household_id (uuid, fk)
- name (text)
- type (text) -- 'income' | 'expense' | 'both'
- sort_order (int)
- created_at (timestamptz default now())
- updated_at (timestamptz default now())
- index (household_id, type, sort_order)

-- accounts
- id (uuid, pk)
- household_id (uuid, fk)
- name (text)
- type (text) -- 'cash' | 'bank' | 'card' | 'other'
- sort_order (int)
- created_at/updated_at (timestamptz)
- index (household_id, type, sort_order)

-- transactions
- id (uuid, pk)
- household_id (uuid, fk)
- kind (text) -- 'income' | 'expense'
- occurred_on (date)
- amount (integer) -- JPY整数
- category_id (uuid, fk -> categories)
- account_id (uuid, fk -> accounts)
- place (text nullable) -- 支出のみ
- memo (text nullable)
- created_by (uuid, fk -> auth.users)
- updated_by (uuid, fk -> auth.users)
- created_at/updated_at (timestamptz)
- index (household_id, occurred_on)
- index (household_id, kind, occurred_on)
- index (household_id, category_id)

-- comments
- id (uuid, pk)
- transaction_id (uuid, fk -> transactions)
- household_id (uuid, fk)
- body (text)
- created_by (uuid)
- created_at/updated_at (timestamptz)
- index (transaction_id, created_at)

-- reactions
- id (uuid, pk)
- transaction_id (uuid, fk)
- household_id (uuid, fk)
- emoji (text) -- e.g. '👍', '❤️'
- user_id (uuid, fk)
- created_at (timestamptz default now())
- unique (transaction_id, user_id) -- 1人1種/再押下で差替

-- subscriptions
- id (uuid, pk)
- household_id (uuid, fk)
- name (text)
- expected_amount (integer)
- category_id (uuid, fk)
- account_id (uuid, fk)
- billing_day (int) -- 1-31 or 固定
- note (text nullable)
- created_by/created_at/updated_at
- index (household_id, billing_day)

-- notifications
- id (uuid, pk)
- household_id (uuid, fk)
- user_id (uuid, fk)
- type (text) -- 'subscription_reminder' | 'comment' | 'reaction'
- payload (jsonb)
- read (boolean default false)
- created_at (timestamptz default now())
- index (user_id, read, created_at desc)

インデックス設計
- transactions: (household_id, occurred_on), (household_id, kind, occurred_on) で月次/日別集計を高速化
- comments: (transaction_id, created_at)
- reactions: unique(transaction_id, user_id)
- notifications: (user_id, read, created_at desc)

RLS/セキュリティ設計（要点）
- すべての業務テーブルに household_id を持たせる
- household_members に基づき、行レベルで household_id が一致する行のみ SELECT/INSERT/UPDATE/DELETE を許可
- created_by/updated_by は auth.uid() と整合することをチェック

データ移行計画
- 初期データ: categories/accounts に初期マスタを投入（INSERTスクリプト）
- マイグレーション: Supabase migration でDDL管理（バージョンタグ: v1.0 初期）
- 将来拡張: 添付ファイル（storage）/複数世帯/ロール追加時は新テーブル/列を追加

