-- Install pg_cron and schedule daily subscription job

-- 1. Enable pg_cron (Supabase requires extensions schema)
create extension if not exists pg_cron with schema extensions;

-- 2. Grant privileges so service role (postgres) can manage jobs
grant usage on schema cron to postgres;
grant select, update, delete on cron.job to postgres;
grant select on cron.job_run_details to postgres;

-- 3. Ensure daily job exists (21:00 JST = 12:00 UTC)
do $$
declare
  v_job_id int;
begin
  select jobid into v_job_id from cron.job where jobname = 'subscription_schedule_daily';

  if v_job_id is null then
    perform cron.schedule(
      'subscription_schedule_daily',
      '0 12 * * *',
      'select public.run_subscription_schedule((now() at time zone ''Asia/Tokyo'')::date);'
    );
  end if;
end $$;

-- EOF
