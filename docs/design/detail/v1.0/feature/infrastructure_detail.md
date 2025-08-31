インフラ詳細設計

構成概要
- Frontend: Vercel（Next.js 14 App Router）
- Backend: Supabase（PostgreSQL, Auth, Storage, Edge Functions）
- Gateway: MCP サーバ（アプリAPI → MCP → Supabase 委譲）

環境変数
- クライアント公開（Vercel Project → Environment Variables）
  - `NEXT_PUBLIC_SUPABASE_URL`: Supabase URL（Auth用）
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Supabase anon key（Auth用）

- サーバ専用（Vercel → Server-side Env）
  - `SUPABASE_URL`: Supabase API ベースURL
  - `SUPABASE_SERVICE_ROLE`: Service role key（厳重管理）
  - `MCP_ENDPOINT`: MCP サーバURL
  - `MCP_AUTH_TOKEN`: MCP 認証トークン（必要時）

Supabase スキーマ/マイグレーション
- ツール: Supabase CLI（migrations/にSQLを保存）
- 運用: `supabase db push` で本番に適用（Free枠）
- バージョン: 20250831_v1.0 を初期スキーマタグとして管理

ジョブ/スケジューラ
- Edge Function: `subscription_reminder`
  - 目的: billing_day の前日 21:00 JST に `notifications` を生成
  - 擬似コード（Deno）:
    ```ts
    Deno.serve(async () => {
      const todayJst = new Date(new Date().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' }))
      const target = addDays(startOfDay(todayJst), 1)
      // billing_day = target.day の households/subscriptions を抽出→notifications へ insert
      return new Response(JSON.stringify({ ok: true }))
    })
    ```
  - スケジュール: Supabase のスケジューラ（あるいは外部cron）で `0 21 * * *` (Asia/Tokyo)

RPC 関数
- `get_daily_totals(household uuid, month text)`（既存）
- `confirm_subscription_tx(_household uuid, _subscription uuid, _amount int, _occurred_on date, _user uuid)`（backend_detail.md 参照）

デプロイフロー
1) Git push → Vercel ビルド（lint/typecheck/build）
2) 環境変数設定（Vercel/Supabase/MCP）
3) Supabase migration 適用（CLI）
4) Edge Function デプロイ（必要時）
5) 動作確認（/api/health など簡易ヘルスチェック）

監視/ログ
- Vercel: Functions/Edge logs, Analytics（簡易）
- Supabase: ダッシュボード（クエリ統計、エラーログ）
- MCP: アプリAPI→MCP間のアクセスログ（household_id, user_id, action）

バックアップ/BCP
- Free枠: 自動バックアップSLAなし。重要データは受容リスク。
- 手動: スナップショット/エクスポートは管理画面から都度実施（必要時）。

レート/コスト
- レート制限: 厳格なサーバ側レートは未実装（MVP）。フロントでデバウンス
- コスト: Free枠上限で運用し、必要時にクエリ最適化とデータアーカイブで抑制

IaC/設定管理
- DBスキーマは migration SQL を唯一の真実源とする
- App 設定は .env（VercelのEnv管理）と README/Runbook に手順化

テスト観点
- Migration: ローカル/プレビューで適用→差分ゼロを確認
- Edge Function: 手動起動で通知生成の整合性
- 監視: エラーログのしきい値検証、主要APIのP95/P99確認

トレーサビリティ
- 要件 A4: サブスク前日通知（Edge Function）
- 要件 A7: 性能監視（ログ/統計）
- 非機能: 環境変数/鍵管理、デプロイ手順の明文化

