-- Auto-stamp user_id using auth.uid() so client can omit it
-- Run in Supabase SQL editor

-- Function to set user_id from current auth context
create or replace function public.set_user_progress_user_id()
returns trigger
language plpgsql
security definer
as $$
begin
  if new.user_id is null then
    new.user_id := auth.uid();
  end if;
  return new;
end;
$$;

-- Trigger before insert/update to apply the function
drop trigger if exists trg_set_user_progress_user_id_ins on public.user_progress;
drop trigger if exists trg_set_user_progress_user_id_upd on public.user_progress;

create trigger trg_set_user_progress_user_id_ins
before insert on public.user_progress
for each row
execute function public.set_user_progress_user_id();

create trigger trg_set_user_progress_user_id_upd
before update on public.user_progress
for each row
execute function public.set_user_progress_user_id();

-- Ensure RLS is enabled and policies exist (without IF NOT EXISTS for policies)
alter table public.user_progress enable row level security;

drop policy if exists "read own progress" on public.user_progress;
create policy "read own progress" on public.user_progress
  for select using (user_id = auth.uid());

drop policy if exists "insert own progress" on public.user_progress;
create policy "insert own progress" on public.user_progress
  for insert with check (user_id = auth.uid());

drop policy if exists "update own progress" on public.user_progress;
create policy "update own progress" on public.user_progress
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "delete own progress" on public.user_progress;
create policy "delete own progress" on public.user_progress
  for delete using (user_id = auth.uid());

-- Unique index by user + exercise bubble
create unique index if not exists user_progress_unique
  on public.user_progress (user_id, exercise_id, index);