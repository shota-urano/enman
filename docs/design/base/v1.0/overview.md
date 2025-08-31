基本設計書 - enmann（夫婦共有家計簿アプリ）

版数: v1.0 / 作成日: 2025-08-31
要件トレース: docs/requirements/20250831_v1.0.md, docs/requirements_ui/20250831_v1.0.md

システム概要
- 目的: 夫婦2名で同一世帯の家計を共有・可視化。コメント/スタンプで相互コミュニケーションを促進。
- 対象: スマホ向けWeb。日本語/JPY固定。MVPは無料枠（Vercel + Supabase）。

アーキテクチャ設計
- クライアント: Next.js 14 (App Router) + TypeScript + Tailwind CSS + shadcn/ui
- Backend/BaaS: Supabase (PostgreSQL, Auth, Storage, Edge Functions, RLS)
 - 通信: MCPゲートウェイ経由でSupabaseへアクセス（Browser → Next.js API → MCP → Supabase）
- 認証: Supabase Auth（メール/パスワード or 魔法リンク）
- データ保護: RLSにより世帯スコープを強制
- 通知: アプリ内通知（DBトリガ + Edge Function）

全体構成図（論理）
- Browser(Next.js) → Next.js API(サーバ) → MCPサーバ → Supabase(PostgREST, Auth, DB, Storage)
- Edge Function（Supabase）: サブスク通知/前日21:00実行, 集計補助RPC

技術スタック
- フロント: Next.js, TypeScript, Tailwind, shadcn/ui, lucide-react, framer-motion
- データ: PostgreSQL(Supabase), RLS, pg cron/scheduler（Edge Functions スケジュール）
- ホスティング: Vercel(Front) + Supabase(Back)

システム境界
- 内部: 認証/世帯管理, 収支/サブスク/コメント/スタンプ/通知, カレンダー/集計
- 外部: なし（外部IdP/決済/PWA/PushはMVP外）

機能分割・モジュール設計
- Auth/Household: サインアップ/ログイン, 世帯作成/参加, メンバーシップ
- Master: カテゴリ, アカウント（支払元/収入元）
- Transaction: 収入/支出登録, 編集/削除, 下書き保存
- Reaction: コメント, スタンプ
- Subscription: 定義/予定通知/確定登録
- Calendar/Report: 月表示, 日別明細, 月次サマリー
- Settings: 締め日, マスター編集, 招待管理
- Notification: アプリ内通知一覧

データフロー
1) 認証→世帯作成→招待リンク→相手参加
2) 取引登録: 入力→ローカル下書き保存→DB保存→UI楽観更新
3) サブスク: 定義→前日21:00通知→金額確認→当月分確定登録
4) カレンダー: 月クエリ→日別集計→日タップで明細取得

非機能要件への対応
- 一貫性: 後勝ち。updated_at + updated_byで監査
- 可観測性: UIトースト, Supabaseログ活用
- データ保護: RLS全テーブル適用, household_idに基づくポリシ

パフォーマンス設計（測定可能指標）
- 一覧/集計表示 P95 ≤ 1.0s, P99 ≤ 2.0s（主要クエリに複合Index, 期間/世帯/種別でフィルタ）
- 新規保存 P95 ≤ 1.0s, P99 ≤ 2.0s（ネットワークRTT + 単一INSERT目標）
- UI反映 ≤ 500ms（楽観的更新）
- ローカル下書き保存 ≤ 100ms（IndexedDB/localStorage）

セキュリティ設計（概要）
- 認証: Supabase Auth
- 認可: household_membersの参加者のみ各データへアクセス可（RLS）
- 監査: created_at/created_by/updated_at/updated_byの持続

可用性・拡張性
- 無保証（Free）。急増時: クエリ最適化/Index追加/Edge Functionバッチ化で対処
- 将来: PWA/Push, ロール, 外部IdP, 添付ファイル, 複数世帯

外部システム連携
- 現時点なし

接続方針（MCP経由）
- 目的: クライアントからSupabaseへの直接接続を避け、鍵・ロジックをサーバ側に集約。
- 経路: ブラウザ → アプリ内API（/api/*）→ MCPサーバ → Supabase（PostgREST/RPC）。
- 認証: Supabase Authは従来通り（公開anon key）を用い、データ操作はAPI/MCP経由。
- 効用: 秘密鍵の非露出、きめ細かい認可・レート制御、監査性の向上。

開発・デプロイ方針
- 環境: Vercel Preview/Production + Supabase Project
- IaC: Supabase migration(SQL)でスキーマ管理
- CI: Lint/Typecheck/Build, DBマイグレーション適用手順を明文化

トレーサビリティ
- 要件→設計マッピング
  - A1: 認証/世帯/招待 → Auth/Household, RLS, API: /auth, /households
  - A2: 収支登録/集計反映 → Transaction, Calendar/Report, Index設計
  - A3: コメント/スタンプ/通知 → Reaction, Notification, Edge Function
  - A4: サブスク通知→確定 → Subscription, Scheduler
  - A5: カレンダー月表示/日明細 → Calendar/Report
  - A6: 月次サマリー/締め日反映 → Calendar/Report, Settings
  - A7: 性能指標 → パフォーマンス設計/Index/キャッシュ戦略
  - A8: 下書きオフライン → クライアントローカル保存
  - A9: RLS世帯隔離 → セキュリティ設計
