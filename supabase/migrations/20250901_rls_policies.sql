-- enmann v1.0 RLS ポリシ適用
-- 参照: docs/design/detail/v1.0/feature/security_detail.md

-- RLS 有効化
alter table if exists public.households enable row level security;
alter table if exists public.household_members enable row level security;
alter table if exists public.categories enable row level security;
alter table if exists public.accounts enable row level security;
alter table if exists public.transactions enable row level security;
alter table if exists public.comments enable row level security;
alter table if exists public.reactions enable row level security;
alter table if exists public.subscriptions enable row level security;
alter table if exists public.notifications enable row level security;

-- households: メンバーのみ参照可、作成は本人のみ
drop policy if exists households_select on public.households;
drop policy if exists households_insert on public.households;
create policy households_select on public.households
  for select using (
    exists (
      select 1 from public.household_members m
      where m.household_id = households.id
        and m.user_id = auth.uid()
    )
  );
create policy households_insert on public.households
  for insert with check (created_by = auth.uid());

-- household_members: 自世帯のみ参照/変更
drop policy if exists hm_select on public.household_members;
drop policy if exists hm_mod on public.household_members;
create policy hm_select on public.household_members
  for select using (
    household_id in (
      select household_id from public.household_members where user_id = auth.uid()
    )
  );
create policy hm_mod on public.household_members
  for all using (
    household_id in (
      select household_id from public.household_members where user_id = auth.uid()
    )
  ) with check (
    household_id in (
      select household_id from public.household_members where user_id = auth.uid()
    )
  );

-- categories: 自世帯のみ参照/変更
drop policy if exists categories_all on public.categories;
drop policy if exists categories_select on public.categories;
create policy categories_select on public.categories
  for select using (
    household_id in (
      select household_id from public.household_members where user_id = auth.uid()
    )
  );
create policy categories_all on public.categories
  for all using (
    household_id in (
      select household_id from public.household_members where user_id = auth.uid()
    )
  ) with check (
    household_id in (
      select household_id from public.household_members where user_id = auth.uid()
    )
  );

-- accounts: 自世帯のみ参照/変更
drop policy if exists accounts_all on public.accounts;
drop policy if exists accounts_select on public.accounts;
create policy accounts_select on public.accounts
  for select using (
    household_id in (
      select household_id from public.household_members where user_id = auth.uid()
    )
  );
create policy accounts_all on public.accounts
  for all using (
    household_id in (
      select household_id from public.household_members where user_id = auth.uid()
    )
  ) with check (
    household_id in (
      select household_id from public.household_members where user_id = auth.uid()
    )
  );

-- transactions: 自世帯のみ参照/変更、作成/更新者整合
drop policy if exists tx_select on public.transactions;
drop policy if exists tx_mod on public.transactions;
create policy tx_select on public.transactions
  for select using (
    household_id in (
      select household_id from public.household_members where user_id = auth.uid()
    )
  );
create policy tx_mod on public.transactions
  for all using (
    household_id in (
      select household_id from public.household_members where user_id = auth.uid()
    )
  ) with check (
    household_id in (
      select household_id from public.household_members where user_id = auth.uid()
    )
    and created_by = auth.uid()
  );

-- comments: 自世帯のみ参照、作成/更新/削除は本人
drop policy if exists comments_select on public.comments;
drop policy if exists comments_mod on public.comments;
drop policy if exists comments_delete on public.comments;
create policy comments_select on public.comments
  for select using (
    household_id in (
      select household_id from public.household_members where user_id = auth.uid()
    )
  );
create policy comments_mod on public.comments
  for insert with check (
    household_id in (
      select household_id from public.household_members where user_id = auth.uid()
    ) and created_by = auth.uid()
  );
create policy comments_delete on public.comments
  for delete using (
    household_id in (
      select household_id from public.household_members where user_id = auth.uid()
    ) and created_by = auth.uid()
  );

-- reactions: 自世帯かつ自身のリアクションのみ作成/削除
drop policy if exists reactions_select on public.reactions;
drop policy if exists reactions_mod on public.reactions;
drop policy if exists reactions_delete on public.reactions;
create policy reactions_select on public.reactions
  for select using (
    household_id in (
      select household_id from public.household_members where user_id = auth.uid()
    )
  );
create policy reactions_mod on public.reactions
  for insert with check (
    household_id in (
      select household_id from public.household_members where user_id = auth.uid()
    ) and user_id = auth.uid()
  );
create policy reactions_delete on public.reactions
  for delete using (
    household_id in (
      select household_id from public.household_members where user_id = auth.uid()
    ) and user_id = auth.uid()
  );

-- subscriptions: 自世帯のみ参照/変更、作成/更新者整合
drop policy if exists subs_select on public.subscriptions;
drop policy if exists subs_mod on public.subscriptions;
create policy subs_select on public.subscriptions
  for select using (
    household_id in (
      select household_id from public.household_members where user_id = auth.uid()
    )
  );
create policy subs_mod on public.subscriptions
  for all using (
    household_id in (
      select household_id from public.household_members where user_id = auth.uid()
    )
  ) with check (
    household_id in (
      select household_id from public.household_members where user_id = auth.uid()
    ) and created_by = auth.uid()
  );

-- notifications: 自分宛のみ参照/変更
drop policy if exists notifications_select on public.notifications;
drop policy if exists notifications_mod on public.notifications;
create policy notifications_select on public.notifications
  for select using (user_id = auth.uid());
create policy notifications_mod on public.notifications
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- EOF

