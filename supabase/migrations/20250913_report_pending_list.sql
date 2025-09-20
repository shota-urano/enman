-- List pending-confirmation subscriptions for a given date
create or replace function public.get_pending_subscription_list(
  _household uuid,
  _date date
)
returns table(id uuid, name text, expected_amount int, billing_day int, occurred_on date)
language sql
security definer
set search_path = public
as $$
  with m as (
    select date_trunc('month', _date)::date as ms,
           (date_trunc('month', _date) + interval '1 month - 1 day')::date as me
  )
  select s.id, s.name, s.expected_amount, s.billing_day,
         least(m.ms + (s.billing_day - 1), m.me) as occurred_on
  from public.subscriptions s, m
  where s.household_id = _household
    and s.requires_confirmation = true
    and least(m.ms + (s.billing_day - 1), m.me) = _date
    and not exists (
      select 1 from public.transactions t
      where t.household_id = _household
        and t.subscription_id = s.id
        and t.occurred_month = m.ms
    )
  order by s.name;
$$;

comment on function public.get_pending_subscription_list(uuid, date)
  is '指定日の未確認サブスク一覧（requires_confirmation=true かつ 当月未登録、発生日=指定日）。';

grant execute on function public.get_pending_subscription_list(uuid, date) to authenticated;

-- EOF

