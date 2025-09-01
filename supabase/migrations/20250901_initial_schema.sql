-- enmann v1.0 初期スキーマ
-- 要件/設計: docs/design/base/v1.0/database.md, docs/design/detail/v1.0/feature/database_detail.md

-- 拡張
create extension if not exists pgcrypto;

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

-- EOF

