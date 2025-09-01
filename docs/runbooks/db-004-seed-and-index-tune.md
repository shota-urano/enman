# DB-004 Runbook: 初期データ投入/最適化

対象: categories/accounts 初期マスタ投入、主要クエリの EXPLAIN 確認

## 前提
- 既存スキーマ/インデックスが適用済み（DB-001/002/003 完了）
- Supabase SQL Editor または psql から実行可能

## 初期データ投入（世帯単位）
`public.seed_initial_masters(household_id uuid)` を呼び出すと、
指定した世帯に冪等に初期カテゴリ/アカウントを投入します。

```sql
-- household_id を適宜差し替え
select public.seed_initial_masters('00000000-0000-0000-0000-000000000000');
```

投入内容:
- categories（expense）: 食費/日用品/交通/住居/水道光熱/通信/医療/教育/娯楽/交際/その他
- categories（income）: 給与/賞与/その他収入
- accounts: 口座（bank）/クレジットカード（card）/現金（cash）

いずれも household 内に同名がなければ追加されます（冪等）。

## 主要クエリの EXPLAIN 確認

月次一覧（任意で kind フィルタ）
```sql
explain analyze
select *
from public.transactions t
where t.household_id = :household
  and t.occurred_on >= date_trunc('month', :month::date)
  and t.occurred_on <  (date_trunc('month', :month::date) + interval '1 month')
  and (:kind is null or t.kind = :kind)
order by t.occurred_on asc, t.created_at asc;
```
期待するインデックス:
- `idx_tx_household_date` または `idx_tx_kind_month`

日次集計（RPC と同等）
```sql
explain analyze verbose
select * from public.get_daily_totals(:household, :month);
```

EXPLAIN の確認ポイント:
- Index Scan 利用（フィルタ列: household_id/occurred_on/kind）
- 実行時間: ローカル/軽量データで数十 ms 程度

## トラブルシュート
- 期待する Index が使われない場合:
  - `analyze public.transactions;` を実施
  - フィルタ条件の型/式が最左列を活用する形になっているか確認
- シードが重複する場合:
  - household/name/type の組み合わせを確認し、既存レコードの重複を整理

