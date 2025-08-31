# Supabase CLI / Migrations Setup

このディレクトリは Supabase CLI によるローカル・プレビュー環境およびマイグレーション管理のための設定を格納します。

## 前提
- Supabase CLI インストール: https://supabase.com/docs/guides/cli
  - macOS (Homebrew): `brew install supabase/tap/supabase`
  - npm: `npm i -g supabase`

## 初期設定（1回のみ）
1. ログイン（ブラウザ連携）
   ```bash
   supabase login
   ```
2. プロジェクト紐付け（Project Ref はダッシュボードから取得）
   ```bash
   supabase link --project-ref <your-project-ref>
   ```

## ローカル開発
1. サービス起動（Docker が必要）
   ```bash
   supabase start
   ```
2. マイグレーション適用
   ```bash
   supabase db reset   # 仕切り直し（初期化）
   # あるいは
   supabase db push    # 既存の migrations を適用
   ```
3. 停止
   ```bash
   supabase stop
   ```

## マイグレーション運用
- 生成:
  ```bash
  supabase migration new "<name>"
  # 例: supabase migration new "create_initial_schema"
  ```
- 適用:
  ```bash
  supabase db push
  ```

## プレビュー環境（任意）
- GitHub Actions 等で `supabase db push` を用いてプレビューDBへ適用する運用を想定。
- 環境変数（アクセストークン/プロジェクト参照）は CI の Secrets で管理してください。

## 構成
- `supabase/config.toml`: CLI 設定（ポート等）。必要に応じて編集。
- `supabase/migrations/`: 生成された SQL マイグレーションを格納。

