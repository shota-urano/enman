-- Pending confirmation counts per day for a month
create or replace function public.get_pending_subscription_confirms(
  _household uuid,
  _month text
)
returns table(day date, pending_count int)
language sql
security definer
set search_path = public
as $$
  with m as (
    select date_trunc('month', (_month||'-01')::date)::date as ms,
           (date_trunc('month', (_month||'-01')::date) + interval '1 month - 1 day')::date as me
  ), subs as (
    select s.id, s.household_id, s.billing_day,
           least(m.ms + (s.billing_day - 1), m.me) as occurred_on
    from public.subscriptions s, m
    where s.household_id = _household
      and s.requires_confirmation = true
  ), pending as (
    select s.occurred_on
    from subs s, m
    where not exists (
      select 1 from public.transactions t
      where t.household_id = _household
        and t.subscription_id = s.id
        and t.occurred_month = m.ms
    )
  )
  select occurred_on as day, count(*)::int as pending_count
  from pending
  group by occurred_on
  order by day;
$$;

comment on function public.get_pending_subscription_confirms(uuid, text)
  is '指定月の各日に対して、未確認（requires_confirmation=true かつ 当月未登録）のサブスク件数を返す。';

grant execute on function public.get_pending_subscription_confirms(uuid, text) to authenticated;

-- EOF

