Supabase CLI and Migrations
===========================

This directory contains Supabase CLI configuration and database migrations for the enmann project.

Requirements
- Supabase CLI installed: https://supabase.com/docs/guides/cli

Project Setup
- Set `project_id` in `supabase/config.toml` to your Supabase project ref (e.g., `abcdefghijklmnox`).
- Ensure app envs are set (see `web/.env.example` and `web/.env.local.example`):
  - Server: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE`
  - Client: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`

Local Workflow (recommended)
- Start local stack: `supabase start`
- Create a migration: `supabase migration new <name>`
- Apply migrations: `supabase migration up --local`
- Reset local DB: `supabase db reset --local --force`
- Generate types: `supabase gen types typescript --local --schema public > web/lib/types/supabase.ts`

Preview/Remote Workflow
- Link to your project: `supabase link --project-ref <your-project-ref>`
- Diff from local to remote: `supabase db diff -f <name>`
- Push migrations: `supabase db push` (prefer migration files over direct push for reviewability)

Notes
- MCP access uses Supabase as the backing DB per project constraints.
- The application should reference the enmann DB via the configured Supabase project.
- Do not commit secrets. Use `.env.local` for local dev and CI secrets via repository/provider secret store.

