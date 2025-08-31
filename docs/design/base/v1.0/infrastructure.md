インフラ・運用設計

構成
- フロント: Vercel（Next.js）
- バックエンド: Supabase（PostgreSQL, Auth, Storage, Edge Functions）
- ゲートウェイ: MCP サーバ（アプリAPIからのDBアクセス委譲）

環境変数（Vercel）
- NEXT_PUBLIC_SUPABASE_URL（Auth用途）
- NEXT_PUBLIC_SUPABASE_ANON_KEY（Auth用途）

サーバ環境変数（非公開）
- SUPABASE_URL（DB/APIエンドポイント）
- SUPABASE_SERVICE_ROLE（サーバ専用鍵、クライアントへは露出しない）
- MCP_ENDPOINT（MCPサーバのURL）
- MCP_AUTH_TOKEN（必要に応じて）

スキーマ/マイグレーション
- Supabase CLI による migration 管理（v1.0 初期スキーマ）
- 主要テーブル: households, household_members, categories, accounts, transactions, comments, reactions, subscriptions, notifications

ジョブ/スケジューラ
- Edge Function: subscription_reminder
  - 実行: 毎日 20:59 JST に起動 → 対象 household の billing_day=翌日 を抽出し notifications を作成
  - タイムゾーン: Asia/Tokyo
- RPC: get_daily_totals で集計を提供

デプロイ
- 開発: Vercel Preview + Supabase Project + MCP サーバ（同一または別サービス）
- 本番: Vercel Production + Supabase Project + MCP サーバ
- 手順: git push → Vercel Build → 環境変数/鍵設定（MCP/Supabase鍵はサーバのみ）→ DBマイグレーション適用 → MCP サーバ設定

監視/運用
- メトリクス: Supabase ダッシュボード（クエリ統計/エラー）
- ログ: Vercel/Supabase の標準ログ
- アラート: Free枠のため手動監視中心

バックアップ/BCP
- Free枠: 自動バックアップSLAなし。重要データは受容リスクとして明示

コスト/制約
- 無料枠上限に留意（RPS/ストレージ）。上限到達時は手動でデータアーカイブ/クエリ最適化
