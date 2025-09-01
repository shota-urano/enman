# DB-003: RPC EXPLAIN 検証メモ

対象: `public.get_daily_totals`, `public.confirm_subscription_tx`

前提:
- Authenticated ユーザーで `auth.uid()` が得られる状態
- household のメンバーであること（`household_members` に存在）

## get_daily_totals

```sql
-- 例: 2025-09, household=00000000-0000-0000-0000-000000000000
EXPLAIN analyze verbose
select * from public.get_daily_totals('00000000-0000-0000-0000-000000000000', '2025-09');
```

期待:
- `transactions` の `idx_tx_household_date` / `idx_tx_kind_month` が活用され、日付レンジフィルタが Index Scan になる
- 1日31行の days 生成に対して、左結合+集計のコストが低いこと（数ms〜数十ms）

所見:
- [ ] Index Scan 確認
- [ ] 実行時間 < 50ms (ローカル)

## confirm_subscription_tx

```sql
-- 例: household/subscription は実データに置換
EXPLAIN analyze verbose
select * from public.confirm_subscription_tx(
  '00000000-0000-0000-0000-000000000000',
  '11111111-1111-1111-1111-111111111111',
  null,
  null
);
```

期待:
- subscription 単行検索は PK or household+id で Index Scan
- transactions 挿入は単発でコスト僅少

所見:
- [ ] Index Scan 確認
- [ ] 実行時間 < 10ms (ローカル)

---

メモ:
- 本番では `ANALYZE` 状態やデータ量により変動あり
- クエリ統計/慢SQL監視は Supabase ダッシュボードで併用

