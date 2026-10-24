-- Run once in Supabase: SQL editor > New query > paste > Run.
-- One row per user holds all of that user's synced data.
create table if not exists public.user_data (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  data       jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- Row-level security: every user can only touch their own row.
alter table public.user_data enable row level security;

drop policy if exists "own row: read"   on public.user_data;
drop policy if exists "own row: insert" on public.user_data;
drop policy if exists "own row: update" on public.user_data;
drop policy if exists "own row: delete" on public.user_data;

create policy "own row: read"   on public.user_data for select using (auth.uid() = user_id);
create policy "own row: insert" on public.user_data for insert with check (auth.uid() = user_id);
create policy "own row: update" on public.user_data for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own row: delete" on public.user_data for delete using (auth.uid() = user_id);

-- Keep updated_at current.
create or replace function public.touch_updated_at() returns trigger as $$
begin new.updated_at = now(); return new; end; $$ language plpgsql;
drop trigger if exists user_data_touch on public.user_data;
create trigger user_data_touch before update on public.user_data
  for each row execute function public.touch_updated_at();
