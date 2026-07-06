-- Run once in Supabase SQL Editor
create table if not exists bot_users (
  chat_id bigint primary key,
  username text unique,
  first_name text,
  updated_at timestamptz default now()
);

alter table bot_users enable row level security;

create policy "Allow anon read bot_users"
  on bot_users for select to anon using (true);

create policy "Allow anon insert bot_users"
  on bot_users for insert to anon with check (true);

create policy "Allow anon update bot_users"
  on bot_users for update to anon using (true);
