API設計（Supabase / PostgREST + RPC）

API全体設計方針
- データ操作はサーバ経由（Next.js API → MCP → Supabase）。クライアントからの直接PostgREST呼び出しは行わない。
- 集計/確認系は RPC（SQL関数）をサーバ側で呼出し、結果をAPIレスポンスで返却。
- クライアントはアプリ内API（/api/*）を呼び、サーバ側でSupabase SDKを使用。
- すべて RLS 下で household_id によりアクセス制御。必要に応じてサーバ側でもスコープ検証を二重化。

接続レイヤ（MCP）
- サーバは MCP サーバへ接続し、定義済みの「supabase」ツール経由で PostgREST/RPC を委譲。
- APIハンドラは以下を責務分担:
  - 入力検証（Zod等）/セッション確認
  - household_id の帰属チェック
  - MCP 経由でのDB操作実行
  - エラーの正規化（ドメインエラー/バリデーション/システム）

エンドポイント仕様（論理）
注: Supabaseでは実エンドポイントはテーブル/ビュー/RPC名になる。ここでは論理名で記載。

認証/世帯
- POST /auth/signup, /auth/signin（Supabase Auth に委譲）
- POST /households: 世帯作成（name）
- POST /households/invite: 招待リンク発行（household_id, email or token）
- POST /households/join: 招待参加（token）
- GET /households/me: 自分の所属世帯取得

マスター
- GET/POST/PATCH /categories
- GET/POST/PATCH /accounts

取引
- GET /transactions?month=YYYY-MM&kind=income|expense
- POST /transactions {kind, occurred_on, amount, category_id, account_id, place?, memo?}
- PATCH /transactions/:id
- DELETE /transactions/:id
- RPC get_daily_totals(month, household_id) → 日別 収入/支出/差額

コメント/スタンプ
- GET/POST/DELETE /comments (transaction_id)
- GET/POST/DELETE /reactions (transaction_id, emoji) — 同一ユーザーは1件に制限

サブスク
- GET/POST/PATCH/DELETE /subscriptions
- RPC schedule_subscription_notifications() — 前日21:00 通知生成
- POST /subscriptions/:id/confirm {amount?} — 当月分 transactions へ確定登録

通知
- GET /notifications?read=false
- POST /notifications/:id/read

認証・認可方式
- Supabase Auth のセッション/JWTを用い、RLSポリシで household_members のみアクセス可
- INSERT/UPDATE 時に created_by/updated_by = auth.uid() を強制
- クライアント→API間はBearerセッション/クッキーで認証、API→MCP→Supabase間でサービス権限を用いる（秘密鍵はサーバ限定）。

エラーハンドリング
- クライアント: APIの標準化エラーを分類し、トーストに整形表示
- バリデーション: 型/範囲（amount ≥ 0, billing_day 1-31 等）をDB制約 + フロントで二重化

レート制限・監視
- Free枠のため網羅的なレート制限なし。フロントで急連打防止（1sのデバウンス）
- 監視: Supabase ダッシュボードのログ/クエリ統計、Vercel Analytics を参照

主要スキーマ断片（参考: RPC）
-- 日別合計
CREATE OR REPLACE FUNCTION public.get_daily_totals(_household uuid, _month text)
RETURNS TABLE(day date, income bigint, expense bigint, diff bigint)
LANGUAGE sql SECURITY DEFINER AS $$
  with days as (
    select generate_series(date_trunc('month', _month::date)
                         , (date_trunc('month', _month::date) + interval '1 month - 1 day')::date
                         , interval '1 day')::date d
  )
  select d as day,
         coalesce(sum(case when t.kind='income' then t.amount end),0) as income,
         coalesce(sum(case when t.kind='expense' then t.amount end),0) as expense,
         coalesce(sum(case when t.kind='income' then t.amount end),0)
       - coalesce(sum(case when t.kind='expense' then t.amount end),0) as diff
  from days
  left join transactions t on t.household_id=_household and t.occurred_on=d
  group by d
  order by d;
$$;
