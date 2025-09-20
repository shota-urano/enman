-- Add requires_confirmation to subscriptions and link transactions to subscriptions
alter table if exists public.subscriptions
  add column if not exists requires_confirmation boolean not null default true;

alter table if exists public.transactions
  add column if not exists subscription_id uuid references public.subscriptions(id);

-- generated month column to support unique constraint per month
alter table if exists public.transactions
  add column if not exists occurred_month date generated always as (date_trunc('month', occurred_on)::date) stored;

-- unique per (household, subscription, month) to avoid duplicates (only when subscription_id is present)
do $$ begin
  create unique index if not exists uq_transactions_subscription_month
  on public.transactions(household_id, subscription_id, occurred_month)
  where subscription_id is not null;
exception when others then null; end $$;

-- Update RPC to populate subscription_id and avoid duplicate insertions
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
  if auth.uid() is null then
    raise exception 'unauthenticated' using errcode = '28000';
  end if;

  perform 1 from public.household_members
   where household_id = _household and user_id = auth.uid();
  if not found then
    raise exception 'forbidden: not a household member' using errcode = '42501';
  end if;

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

  -- Try insert; if already exists (same sub & month), return existing id
  insert into public.transactions(
    id, household_id, kind, occurred_on, amount, category_id, account_id, memo, subscription_id, created_by, updated_by
  ) values (
    gen_random_uuid(), _household, 'expense', v_occurred_on, v_amount, v_sub.category_id, v_sub.account_id, v_sub.name, v_sub.id, auth.uid(), auth.uid()
  )
  on conflict on constraint uq_transactions_subscription_month do nothing
  returning transactions.id into id;

  if id is null then
    select t.id into id
    from public.transactions t
    where t.household_id = _household
      and t.subscription_id = _subscription
      and t.occurred_month = date_trunc('month', v_occurred_on)::date
    limit 1;
  end if;

  if id is null then
    raise exception 'failed to confirm subscription' using errcode = '23505';
  end if;

  return next;
end;
$$;

comment on function public.confirm_subscription_tx(uuid, uuid, int, date)
  is 'サブスク定義から当月の取引を確定登録（重複防止付）。';

grant execute on function public.confirm_subscription_tx(uuid, uuid, int, date) to authenticated;

-- Daily scheduler entry point
-- _today: 処理対象日（JSTの当日を渡す想定）
create or replace function public.run_subscription_schedule(_today date default now()::date)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rec record;
  v_tomorrow date := _today + interval '1 day';
begin
  -- 1) 自動確定：確認不要（requires_confirmation=false）で当日が請求日のもの
  for v_rec in (
    select s.household_id, s.id as subscription_id
    from public.subscriptions s
    where s.requires_confirmation = false
      and s.billing_day = extract(day from _today)
  ) loop
    perform public.confirm_subscription_tx(v_rec.household_id, v_rec.subscription_id, null, _today);
  end loop;

  -- 2) 通知生成：確認が必要（requires_confirmation=true）かつ翌日が請求日のもの
  insert into public.notifications(household_id, user_id, type, payload)
  select s.household_id,
         hm.user_id,
         'subscription_reminder',
         jsonb_build_object(
           'subscription_id', s.id,
           'name', s.name,
           'billing_day', s.billing_day,
           'target_date', v_tomorrow
         )
  from public.subscriptions s
  join public.household_members hm on hm.household_id = s.household_id
  where s.requires_confirmation = true
    and s.billing_day = extract(day from v_tomorrow);
end;
$$;

grant execute on function public.run_subscription_schedule(date) to authenticated;

-- EOF

