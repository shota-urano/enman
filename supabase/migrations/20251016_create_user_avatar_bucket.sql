insert into storage.buckets (id, name, public)
values ('user-avatars', 'user-avatars', true)
on conflict (id) do nothing;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'Avatar public read'
  ) then
    create policy "Avatar public read"
      on storage.objects
      for select
      using (bucket_id = 'user-avatars');
  end if;
end
$$;
