-- Run this SQL in your Supabase project:
-- Dashboard → SQL Editor → New query → paste and Run

create table if not exists public.app_storage (
  key        text primary key,
  value      text not null,
  updated_at timestamptz default now()
);

-- Enable Row Level Security
alter table public.app_storage enable row level security;

-- Allow full access with the anon (public) key
create policy "Allow all for anon"
  on public.app_storage
  for all
  using (true)
  with check (true);
