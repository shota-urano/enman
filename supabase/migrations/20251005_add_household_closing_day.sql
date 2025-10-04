-- Add closing_day column to households for monthly closing settings
alter table public.households
  add column if not exists closing_day int not null default 31 check (closing_day between 1 and 31);

-- Ensure existing rows have a valid value (in case column existed but was nullable)
update public.households
  set closing_day = 31
  where closing_day is null;
