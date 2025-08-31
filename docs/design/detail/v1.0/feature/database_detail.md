データベース詳細設計

テーブル設計詳細
households
```sql
-- households: 世帯
create table if not exists public.households (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_households_created_at on public.households(created_at desc);
comment on table public.households is '世帯（家計の共有単位）';
```

household_members
```sql
-- household_members: 世帯-ユーザー関係
create table if not exists public.household_members (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member',
  invited_at timestamptz,
  joined_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (household_id, user_id)
);
create index if not exists idx_household_members_household on public.household_members(household_id);
```

categories
```sql
-- categories: 収入/支出カテゴリ
create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  name text not null,
  type text not null check (type in ('income','expense','both')),
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_categories_scope on public.categories(household_id, type, sort_order);
```

accounts
```sql
-- accounts: 支払元/収入元
create table if not exists public.accounts (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  name text not null,
  type text not null check (type in ('cash','bank','card','other')),
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_accounts_scope on public.accounts(household_id, type, sort_order);
```

transactions
```sql
-- transactions: 収入/支出明細
create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  kind text not null check (kind in ('income','expense')),
  occurred_on date not null,
  amount integer not null check (amount >= 0),
  category_id uuid not null references public.categories(id),
  account_id uuid not null references public.accounts(id),
  place text,
  memo text,
  created_by uuid not null references auth.users(id),
  updated_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_tx_household_date on public.transactions(household_id, occurred_on);
create index if not exists idx_tx_kind_month on public.transactions(household_id, kind, occurred_on);
create index if not exists idx_tx_category on public.transactions(household_id, category_id);
```

comments
```sql
-- comments: 取引へのコメント
create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  transaction_id uuid not null references public.transactions(id) on delete cascade,
  household_id uuid not null references public.households(id) on delete cascade,
  body text not null,
  created_by uuid not null references auth.users(id),
  updated_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_comments_tx on public.comments(transaction_id, created_at);
```

reactions
```sql
-- reactions: スタンプ（絵文字リアクション）
create table if not exists public.reactions (
  id uuid primary key default gen_random_uuid(),
  transaction_id uuid not null references public.transactions(id) on delete cascade,
  household_id uuid not null references public.households(id) on delete cascade,
  emoji text not null,
  user_id uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  unique (transaction_id, user_id)
);
create index if not exists idx_reactions_tx on public.reactions(transaction_id);
```

subscriptions
```sql
-- subscriptions: サブスク定義
create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  name text not null,
  expected_amount integer not null check (expected_amount >= 0),
  category_id uuid not null references public.categories(id),
  account_id uuid not null references public.accounts(id),
  billing_day int not null check (billing_day between 1 and 31),
  note text,
  created_by uuid not null references auth.users(id),
  updated_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_subs_billing on public.subscriptions(household_id, billing_day);
```

notifications
```sql
-- notifications: アプリ内通知
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  user_id uuid not null references auth.users(id),
  type text not null check (type in ('subscription_reminder','comment','reaction')),
  payload jsonb not null default '{}'::jsonb,
  read boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists idx_notifications_user on public.notifications(user_id, read, created_at desc);
```

インデックス設計
- transactions: (household_id, occurred_on), (household_id, kind, occurred_on), (household_id, category_id)
- comments: (transaction_id, created_at)
- reactions: unique(transaction_id, user_id), 補助で(transaction_id)
- subscriptions: (household_id, billing_day)
- notifications: (user_id, read, created_at desc)

パフォーマンス最適化

複合インデックス: 月/日集計でフィルタに利用する household_id + occurred_on（範囲）/kind を最左に配置。カテゴリ別集計は category_id 複合を利用。

パーティショニング: MVPでは不要。将来的に transactions を月単位で RANGE パーティション化（household_id, occurred_on）を検討。

クエリ設計

頻出クエリパターン
```sql
-- 月の取引一覧（オプションで収入/支出種別）
select *
from public.transactions t
where t.household_id = :household
  and t.occurred_on >= date_trunc('month', :month::date)
  and t.occurred_on <  (date_trunc('month', :month::date) + interval '1 month')
  and (:kind is null or t.kind = :kind)
order by t.occurred_on asc, t.created_at asc;

-- 日別合計（RPCの内部実装例と同等）
with days as (
  select generate_series(date_trunc('month', :month::date)
                       , (date_trunc('month', :month::date) + interval '1 month - 1 day')::date
                       , interval '1 day')::date d
)
select d as day,
       coalesce(sum(case when t.kind='income' then t.amount end),0) as income,
       coalesce(sum(case when t.kind='expense' then t.amount end),0) as expense,
       coalesce(sum(case when t.kind='income' then t.amount end),0)
     - coalesce(sum(case when t.kind='expense' then t.amount end),0) as diff
from days
left join public.transactions t on t.household_id=:household and t.occurred_on=d
group by d
order by d;

-- 通知一覧（未読優先）
select *
from public.notifications
where user_id = :user
order by read asc, created_at desc
limit 50;
```

テスト観点
- インデックス利用確認: EXPLAIN で主要クエリが該当Indexを使用すること
- RLS 下の参照制限: household_id が異なるデータが見えないこと
- CHECK制約: amount >= 0、billing_day 1-31 を満たさないと失敗すること

トレーサビリティ
- 要件 A2/A5/A6/A7: 集計クエリ・インデックス設計
- 要件 A3: comments/reactions/notifications の関連と制約
- 要件 A4: subscriptions と当月確定登録に必要なキー/インデックス
- 要件 A9: household_id とRLS前提のカラム設計

