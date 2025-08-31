セキュリティ設計

方針
- Supabase Auth による認証、RLS による行レベル認可を全テーブルへ適用
- household_members に基づいたスコープ制御
- 監査メタデータ（created_by/updated_by/created_at/updated_at）を保持
- クライアントはSupabaseへ直接接続せず、API → MCP → Supabaseの経路で秘密情報をサーバに限定

RLS ポリシ（例）
-- households（read: メンバーのみ, write: 作成者/管理者）
USING (exists(select 1 from household_members m where m.household_id=id and m.user_id=auth.uid()))
WITH CHECK (auth.uid() = created_by)

-- household_members（read/write: 自世帯に限定）
USING (household_id in (select household_id from household_members where user_id=auth.uid()))
WITH CHECK (household_id in (select household_id from household_members where user_id=auth.uid()))

-- transactions（read/write: 自世帯のみ）
USING (household_id in (select household_id from household_members where user_id=auth.uid()))
WITH CHECK (
  household_id in (select household_id from household_members where user_id=auth.uid())
  and created_by = auth.uid()
)

-- comments, reactions, subscriptions, notifications 同様に household_id ベースで制御

データ保護
- 通信: TLS（Supabase/Vercel 標準）
- 保管: Supabase管理の暗号化に準拠
- 秘密管理: SUPABASE_SERVICE_ROLE/MCPトークンはサーバ側のみで保持し、クライアントへ露出しない

入力検証/整合性
- DB制約: NOT NULL, CHECK(amount >= 0), CHECK(kind in ('income','expense')), billing_day 1-31
- アプリ: 二重送信防止, フォーム妥当性

監査
- 全テーブルで created_at/created_by/updated_at/updated_by を保持
- 重要操作（削除）を論理削除へ拡張可能（将来）

脅威と対策
- 水平越権: RLS により household_id 境界で遮断
- CSRF: セッションは Supabase クライアント側管理、APIキーは環境変数管理
- DoS: クライアント側レート制限/デバウンス、重い集計はRPC化
- 認可強化: API層で household_id 帰属確認/レート制限を追加、MCP 経由での操作を監査ログ化
