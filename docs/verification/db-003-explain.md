# DB-003: RPC EXPLAIN 検証メモ

対象: `public.get_daily_totals`, `public.confirm_subscription_tx`

前提:
- Authenticated ユーザーで `auth.uid()` が得られる状態
- household のメンバーであること（`household_members` に存在）

実測環境:
- Project: enmann (id: hvwxoksbnaqpzqjztunt)
- テストユーザー: e242d4c5-acaf-42b6-88aa-492866945f59
- household: 3daffdca-5a47-4185-8691-56ff3add9199
- subscription: da002204-a82f-4418-ad0f-c137de6d6697

## get_daily_totals

実行対象: household=3daffdca-5a47-4185-8691-56ff3add9199（seed）

```sql
EXPLAIN ANALYZE VERBOSE
select * from public.get_daily_totals('3daffdca-5a47-4185-8691-56ff3add9199', '2025-09-01');
```

期待:
- `transactions` の `idx_tx_household_date` / `idx_tx_kind_month` が活用され、日付レンジフィルタが Index Scan になる
- 1日31行の days 生成に対して、左結合+集計のコストが低いこと（数ms〜数十ms）

所見:
- [ ] Index Scan 確認（関数スキャンのため内部クエリは省略表示）
- [x] 実行時間 < 50ms (ローカル) 実測: 約 18.6ms

## confirm_subscription_tx

```sql
EXPLAIN ANALYZE VERBOSE
select * from public.confirm_subscription_tx(
  '3daffdca-5a47-4185-8691-56ff3add9199',
  'da002204-a82f-4418-ad0f-c137de6d6697',
  null,
  null
);
```

期待:
- subscription 単行検索は PK or household+id で Index Scan
- transactions 挿入は単発でコスト僅少

所見:
- [ ] Index Scan 確認（関数スキャンのため内部クエリは省略表示）
- [x] 実行時間 < 10ms (ローカル) 実測: 約 6.6ms

---

メモ:
- 本番では `ANALYZE` 状態やデータ量により変動あり
- クエリ統計/慢SQL監視は Supabase ダッシュボードで併用
