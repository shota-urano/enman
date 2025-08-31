セキュリティ詳細設計

方針と境界
- 認証は Supabase Auth。データアクセスは API → MCP → Supabase 経由で行い、秘密鍵はサーバのみ。
- 行レベル認可: household_id を持つ全業務テーブルに RLS を適用。
- 監査メタデータ: created_by/updated_by/created_at/updated_at を保持。

RLS 有効化
```sql
-- すべての対象テーブルで RLS を有効化
alter table public.households enable row level security;
alter table public.household_members enable row level security;
alter table public.categories enable row level security;
alter table public.accounts enable row level security;
alter table public.transactions enable row level security;
alter table public.comments enable row level security;
alter table public.reactions enable row level security;
alter table public.subscriptions enable row level security;
alter table public.notifications enable row level security;
```

RLS ポリシ（代表例）
```sql
-- households: メンバーのみ参照可、作成は本人のみ
create policy households_select on public.households
  for select using (
    exists (
      select 1 from public.household_members m
      where m.household_id = households.id
        and m.user_id = auth.uid()
    )
  );

create policy households_insert on public.households
  for insert with check (created_by = auth.uid());

-- household_members: 自世帯のみ参照/変更
create policy hm_select on public.household_members
  for select using (
    household_id in (select household_id from public.household_members where user_id = auth.uid())
  );
create policy hm_mod on public.household_members
  for all using (
    household_id in (select household_id from public.household_members where user_id = auth.uid())
  ) with check (
    household_id in (select household_id from public.household_members where user_id = auth.uid())
  );

-- transactions: 自世帯のみ参照/変更、作成/更新者整合
create policy tx_select on public.transactions
  for select using (
    household_id in (select household_id from public.household_members where user_id = auth.uid())
  );
create policy tx_mod on public.transactions
  for all using (
    household_id in (select household_id from public.household_members where user_id = auth.uid())
  ) with check (
    household_id in (select household_id from public.household_members where user_id = auth.uid())
    and created_by = auth.uid()
  );

-- comments/reactions/subscriptions/notifications も household_id ベースで同様
```

DB 制約/整合性
- CHECK: transactions.amount >= 0、categories.type IN ('income','expense','both')、billing_day BETWEEN 1 AND 31
- NOT NULL: household_id, created_by, updated_by, timestamps
- UNIQUE: reactions(transaction_id, user_id), household_members(household_id, user_id)

API 層の二重防御
- セッション検証: 未認証は 401。
- スコープ検証: session.user が household_members に属するか API 層でも確認し 403。
- 入力検証: Zod で型/値域検証し 400/422。

秘密情報の取り扱い
- `SUPABASE_SERVICE_ROLE`: サーバ専用。Vercel の環境変数に保存。クライアントへ露出禁止。
- MCP 認証情報: サーバのみ。API から MCP サーバへ接続する際に使用。
- `NEXT_PUBLIC_*` は Auth 用 anon 情報に限定。

通信/保管の保護
- TLS: Vercel/Supabase 標準のHTTPSを使用。
- 暗号化: Supabaseの既定に準拠（アプリ側で独自暗号化はしない）。

脅威モデルと対策
- 水平越権: RLS + household 検証の二重化。
- CSRF: 認証は Supabase セッション。API は same-site cookie 運用を前提、状態変更はPOST/DELETE。
- DoS/連打: フロントでのデバウンス、バックエンドでの入力サイズ制限、重い集計は RPC 化。
- 秘密鍵漏えい: クライアントに service role を渡さない。ローテーション手順を運用に定義。

監査/ログ
- 重要操作（作成/更新/削除）は API でログ出力（user_id, household_id, resource, action, id）。
- 将来: 論理削除/イベントソーシング導入余地あり（MVP外）。

テスト観点
- RLS: 他世帯データへの SELECT/UPDATE/DELETE が拒否されること。
- 制約: amount < 0 等で INSERT が失敗すること。
- API: household 帰属不一致で 403、未認証で 401。

トレーサビリティ
- 要件 A9: RLS/世帯境界/監査
- 要件 A3: コメント/スタンプ時の通知生成が自世帯に限定

