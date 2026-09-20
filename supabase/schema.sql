-- Money Recovery: private per-user storage with Row Level Security
create table if not exists public.transactions (
  user_id uuid not null references auth.users(id) on delete cascade,
  hash text not null,
  d date not null,
  descr text not null default '',
  amount numeric not null,
  cat text not null default '',
  remark text not null default '',
  inserted_at timestamptz not null default now(),
  primary key (user_id, hash)
);
create table if not exists public.meta (
  user_id uuid not null references auth.users(id) on delete cascade,
  k text not null,
  v jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (user_id, k)
);
alter table public.transactions enable row level security;
alter table public.meta enable row level security;
create policy "own rows" on public.transactions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own meta" on public.meta
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
