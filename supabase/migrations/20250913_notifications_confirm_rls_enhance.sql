-- Gate writes by approved members only and fix RPC auth
-- 1) Add approved flag to household_members (default true for existing rows)
alter table if exists public.household_members
  add column if not exists approved boolean not null default false;

-- Backfill: mark current members as approved
update public.household_members set approved = true where approved is distinct from true;

comment on column public.household_members.approved is '世帯管理者により承認済みなら true。書き込み系操作の前提条件。';

-- 2) Tighten transactions RLS: only approved members can write
drop policy if exists tx_mod on public.transactions;
create policy tx_mod on public.transactions
  for all using (
    exists (
      select 1 from public.household_members hm
      where hm.household_id = transactions.household_id
        and hm.user_id = auth.uid()
        and hm.approved = true
    )
  ) with check (
    exists (
      select 1 from public.household_members hm
      where hm.household_id = transactions.household_id
        and hm.user_id = auth.uid()
        and hm.approved = true
    )
    and created_by = auth.uid()
  );

-- 3) Enforce approval in confirm_subscription_tx
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
  v_month date;
begin
  if auth.uid() is null then
    raise exception 'unauthenticated' using errcode = '28000';
  end if;

  perform 1 from public.household_members hm
   where hm.household_id = _household
     and hm.user_id = auth.uid()
     and hm.approved = true;
  if not found then
    raise exception 'forbidden: not an approved household member' using errcode = '42501';
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

  v_month := date_trunc('month', v_occurred_on)::date;

  insert into public.transactions(
    id, household_id, kind, occurred_on, occurred_month, amount, category_id, account_id, memo, subscription_id, created_by, updated_by
  ) values (
    gen_random_uuid(), _household, 'expense', v_occurred_on, v_month, v_amount, v_sub.category_id, v_sub.account_id, v_sub.name, v_sub.id, auth.uid(), auth.uid()
  )
  on conflict (household_id, subscription_id, occurred_month) do nothing
  returning transactions.id into id;

  if id is null then
    select t.id into id
    from public.transactions t
    where t.household_id = _household
      and t.subscription_id = _subscription
      and t.occurred_month = v_month
    limit 1;
  end if;

  if id is null then
    raise exception 'failed to confirm subscription' using errcode = '23505';
  end if;

  return next;
end;
$$;

comment on function public.confirm_subscription_tx(uuid, uuid, int, date)
  is 'サブスク定義から当月の取引を確定登録（重複防止・承認メンバーのみ）。';

grant usage on schema public to authenticated;
grant execute on function public.confirm_subscription_tx(uuid, uuid, int, date) to authenticated;

-- EOF
