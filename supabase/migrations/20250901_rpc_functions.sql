-- enmann v1.0 RPC 関数実装
-- 参照: docs/design/base/v1.0/api.md, docs/design/detail/v1.0/feature/backend_detail.md

set check_function_bodies = off;

-- 日次集計: household に属するユーザーのみが呼び出せる想定
create or replace function public.get_daily_totals(
  _household uuid,
  _month text
)
returns table(
  day date,
  income bigint,
  expense bigint,
  diff bigint
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_start date;
  v_end date;
  v_dummy int;
begin
  -- 認証必須
  if auth.uid() is null then
    raise exception 'unauthenticated' using errcode = '28000';
  end if;

  -- household メンバーシップ検証
  select 1 into v_dummy
  from public.household_members m
  where m.household_id = _household
    and m.user_id = auth.uid()
  limit 1;
  if not found then
    raise exception 'forbidden: not a household member' using errcode = '42501';
  end if;

  v_start := date_trunc('month', _month::date)::date;
  v_end   := (date_trunc('month', _month::date) + interval '1 month - 1 day')::date;

  return query
  with days as (
    select generate_series(v_start, v_end, interval '1 day')::date as d
  )
  select d as day,
         coalesce(sum(case when t.kind = 'income'  then t.amount end), 0)::bigint as income,
         coalesce(sum(case when t.kind = 'expense' then t.amount end), 0)::bigint as expense,
         coalesce(sum(case when t.kind = 'income'  then t.amount end), 0)::bigint
       - coalesce(sum(case when t.kind = 'expense' then t.amount end), 0)::bigint as diff
  from days
  left join public.transactions t
    on t.household_id = _household
   and t.occurred_on = d
  group by d
  order by d;
end;
$$;

comment on function public.get_daily_totals(uuid, text)
  is '指定月の日別 収入/支出/差額 を返す（householdメンバーのみ）。';

-- 実行権限（アプリから呼び出す想定）
grant execute on function public.get_daily_totals(uuid, text) to authenticated;


-- サブスク当月確定登録: subscriptions -> transactions 挿入
create or replace function public.confirm_subscription_tx(
  _household uuid,
  _subscription uuid,
  _amount int default null,
  _occurred_on date default null
)
returns table(id uuid)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sub record;
  v_amount int;
  v_start date;
  v_last date;
  v_occurred_on date;
begin
  -- 認証必須
  if auth.uid() is null then
    raise exception 'unauthenticated' using errcode = '28000';
  end if;

  -- household メンバーシップ検証
  perform 1 from public.household_members
   where household_id = _household and user_id = auth.uid();
  if not found then
    raise exception 'forbidden: not a household member' using errcode = '42501';
  end if;

  -- サブスク存在確認（スコープ含む）
  select * into v_sub
  from public.subscriptions s
  where s.id = _subscription and s.household_id = _household;
  if not found then
    raise exception 'subscription not found' using errcode = 'NO_DATA_FOUND';
  end if;

  v_amount := coalesce(_amount, v_sub.expected_amount);
  if v_amount is null or v_amount < 0 then
    raise exception 'invalid amount' using errcode = '22003';
  end if;

  if _occurred_on is null then
    v_start := date_trunc('month', now())::date;
    v_last  := (v_start + interval '1 month - 1 day')::date;
    v_occurred_on := least(v_start + (v_sub.billing_day - 1), v_last);
  else
    v_occurred_on := _occurred_on;
  end if;

  insert into public.transactions(
    id, household_id, kind, occurred_on, amount, category_id, account_id, memo, created_by, updated_by
  ) values (
    gen_random_uuid(), _household, 'expense', v_occurred_on, v_amount, v_sub.category_id, v_sub.account_id, v_sub.name, auth.uid(), auth.uid()
  ) returning transactions.id into id;

  return next;
end;
$$;

comment on function public.confirm_subscription_tx(uuid, uuid, int, date)
  is 'サブスク定義から当月の取引を確定登録する（householdメンバーのみ）。';

grant execute on function public.confirm_subscription_tx(uuid, uuid, int, date) to authenticated;

-- EOF

