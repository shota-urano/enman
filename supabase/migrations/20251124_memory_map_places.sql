-- 思い出マップ機能: placesテーブル新設およびtransactions拡張

-- 地理情報インデックス用拡張
create extension if not exists postgis;

-- 場所マスタ
create table if not exists public.places (
  place_id text primary key,
  name text not null,
  formatted_address text,
  lat double precision not null,
  lng double precision not null,
  source text not null default 'google_places_new',
  last_verified_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on table public.places is 'Google Place ID をキーとした場所マスタ';
comment on column public.places.place_id is 'Google Place ID';
comment on column public.places.source is '取得元識別子（例: google_places_new）';
comment on column public.places.last_verified_at is 'Place Details を取得した最終時刻';

create index if not exists idx_places_last_verified_at on public.places(last_verified_at desc);
create index if not exists idx_places_source on public.places(source);
create index if not exists idx_places_location on public.places
  using gist (ST_SetSRID(ST_MakePoint(lng, lat), 4326));

-- 取引テーブルの拡張
alter table public.transactions
  add column if not exists place_id text references public.places(place_id),
  add column if not exists memory_flag boolean not null default false;
comment on column public.transactions.place_id is 'places.place_id への参照';
comment on column public.transactions.memory_flag is '思い出マップ表示フラグ';

create index if not exists idx_transactions_place on public.transactions(place_id);
create index if not exists idx_transactions_memory_flag on public.transactions(household_id, memory_flag)
  where memory_flag is true;

