-- Replace partial unique index with a proper unique constraint usable by ON CONFLICT
do $$ begin
  drop index if exists public.uq_transactions_subscription_month;
exception when others then null; end $$;

alter table public.transactions
  add constraint uq_tx_sub_month unique (household_id, subscription_id, occurred_month);

-- Update user RPC to use the constraint name
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

  v_month := date_trunc('month', v_occurred_on)::date;

  insert into public.transactions(
    id, household_id, kind, occurred_on, occurred_month, amount, category_id, account_id, memo, subscription_id, created_by, updated_by
  ) values (
    gen_random_uuid(), _household, 'expense', v_occurred_on, v_month, v_amount, v_sub.category_id, v_sub.account_id, v_sub.name, v_sub.id, auth.uid(), auth.uid()
  )
  on conflict on constraint uq_tx_sub_month do nothing
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

grant execute on function public.confirm_subscription_tx(uuid, uuid, int, date) to authenticated;

-- Update system RPC too
create or replace function public.confirm_subscription_tx_system(
  _household uuid,
  _subscription uuid,
  _occurred_on date
)
returns table(id uuid)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sub record;
  v_amount int;
  v_occurred_on date;
  v_month date;
  v_actor uuid;
begin
  select * into v_sub
  from public.subscriptions s
  where s.id = _subscription and s.household_id = _household;
  if not found then
    raise exception 'subscription not found' using errcode = 'NO_DATA_FOUND';
  end if;

  v_amount := v_sub.expected_amount;
  if v_amount is null or v_amount < 0 then
    raise exception 'invalid amount' using errcode = '22003';
  end if;

  if _occurred_on is null then
    v_occurred_on := least(date_trunc('month', now())::date + (v_sub.billing_day - 1),
                           (date_trunc('month', now())::date + interval '1 month - 1 day')::date);
  else
    v_occurred_on := _occurred_on;
  end if;

  v_month := date_trunc('month', v_occurred_on)::date;
  v_actor := coalesce(v_sub.updated_by, v_sub.created_by);

  insert into public.transactions(
    id, household_id, kind, occurred_on, occurred_month, amount, category_id, account_id, memo, subscription_id, created_by, updated_by
  ) values (
    gen_random_uuid(), _household, 'expense', v_occurred_on, v_month, v_amount, v_sub.category_id, v_sub.account_id, v_sub.name, v_sub.id, v_actor, v_actor
  )
  on conflict on constraint uq_tx_sub_month do nothing
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
    raise exception 'failed to confirm subscription (system)' using errcode = '23505';
  end if;

  return next;
end;
$$;

grant execute on function public.confirm_subscription_tx_system(uuid, uuid, date) to authenticated;

-- EOF

