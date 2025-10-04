-- Adjust FK: transactions.subscription_id should not block subscription deletion
-- Rationale: When a subscription is deleted, its historical transactions should remain
-- but lose the optional link. Use ON DELETE SET NULL to preserve data integrity.

alter table if exists public.transactions
  drop constraint if exists transactions_subscription_id_fkey;

alter table if exists public.transactions
  add constraint transactions_subscription_id_fkey
  foreign key (subscription_id)
  references public.subscriptions(id)
  on delete set null;

-- EOF

