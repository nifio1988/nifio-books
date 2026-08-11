-- ============================================================
-- NIFIO BOOKS — Supabase schema
--
-- Run this once in your Supabase project's SQL Editor
-- (Project → SQL Editor → New query → paste → Run).
--
-- What this does:
--   1. Creates a `profiles` table holding the public-facing
--      profile data (display name, avatar path) for each auth
--      user, kept separate from Supabase's internal `auth.users`.
--   2. Enables Row Level Security and adds policies so a user can
--      only ever read/update their OWN profile row.
--   3. Adds a trigger that auto-creates a profile row the moment
--      someone signs up, using their chosen display name (falling
--      back to the part of their email before the @).
--   4. Creates the `avatars` storage bucket (public read) with
--      storage policies so a user can only write/replace/delete
--      files inside their own `avatars/<their-user-id>/...` folder.
--
-- Nothing here is reachable without a valid Supabase session for
-- the row/file being touched — this is enforced by Postgres itself
-- via RLS, not by the frontend code.
-- ============================================================

create table if not exists public.profiles (
  id uuid references auth.users (id) on delete cascade primary key,
  display_name text,
  avatar_url text,
  updated_at timestamptz default now()
);

alter table public.profiles enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
  on public.profiles for select
  using (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
  on public.profiles for update
  using (auth.uid() = id);

-- Auto-provision a profile row on signup. Runs as the function
-- owner (security definer), so it can insert despite RLS — this
-- is the standard, documented Supabase pattern for this purpose.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1))
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Storage: public bucket for avatars, own-folder-only writes.
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

drop policy if exists "avatars_public_read" on storage.objects;
create policy "avatars_public_read"
  on storage.objects for select
  using (bucket_id = 'avatars');

drop policy if exists "avatars_insert_own" on storage.objects;
create policy "avatars_insert_own"
  on storage.objects for insert
  with check (
    bucket_id = 'avatars'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "avatars_update_own" on storage.objects;
create policy "avatars_update_own"
  on storage.objects for update
  using (
    bucket_id = 'avatars'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "avatars_delete_own" on storage.objects;
create policy "avatars_delete_own"
  on storage.objects for delete
  using (
    bucket_id = 'avatars'
    and auth.uid()::text = (storage.foldername(name))[1]
  );
