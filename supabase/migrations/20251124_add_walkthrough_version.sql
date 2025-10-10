-- ユーザー毎の最新ウォークスルー表示バージョンを保持
alter table public.user_profiles
  add column if not exists latest_walkthrough_version text;

create index if not exists idx_user_profiles_walkthrough_version
  on public.user_profiles(latest_walkthrough_version);

