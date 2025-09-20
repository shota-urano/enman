-- System variant to confirm subscription without auth context
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
  -- Fetch subscription within scope
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

  -- use provided date, fallback to current month billing day if null
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
    raise exception 'failed to confirm subscription (system)' using errcode = '23505';
  end if;

  return next;
end;
$$;

grant execute on function public.confirm_subscription_tx_system(uuid, uuid, date) to authenticated;

-- Update scheduler to use system variant for auto-confirm
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
  -- Auto-confirm for requires_confirmation = false
  for v_rec in (
    select s.household_id, s.id as subscription_id
    from public.subscriptions s
    where s.requires_confirmation = false
      and s.billing_day = extract(day from _today)
  ) loop
    perform public.confirm_subscription_tx_system(v_rec.household_id, v_rec.subscription_id, _today);
  end loop;

  -- Reminder notifications for requires_confirmation = true, billed tomorrow
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

