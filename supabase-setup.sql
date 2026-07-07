-- Run once in Supabase SQL Editor (optional but recommended)

create table if not exists bot_users (
  chat_id bigint primary key,
  username text unique,
  first_name text,
  updated_at timestamptz default now()
);

alter table bot_users enable row level security;
drop policy if exists "Allow anon read bot_users" on bot_users;
create policy "Allow anon read bot_users"
  on bot_users for select to anon using (true);
drop policy if exists "Allow anon insert bot_users" on bot_users;
create policy "Allow anon insert bot_users"
  on bot_users for insert to anon with check (true);
drop policy if exists "Allow anon update bot_users" on bot_users;
create policy "Allow anon update bot_users"
  on bot_users for update to anon using (true) with check (true);

create table if not exists warehouse_stock (
  product_id bigint primary key,
  quantity integer not null default 0
);

alter table warehouse_stock enable row level security;
drop policy if exists "Allow anon select warehouse_stock" on warehouse_stock;
create policy "Allow anon select warehouse_stock"
  on warehouse_stock for select to anon using (true);
drop policy if exists "Allow anon insert warehouse_stock" on warehouse_stock;
create policy "Allow anon insert warehouse_stock"
  on warehouse_stock for insert to anon with check (true);
drop policy if exists "Allow anon update warehouse_stock" on warehouse_stock;
create policy "Allow anon update warehouse_stock"
  on warehouse_stock for update to anon using (true) with check (true);

alter table products add column if not exists stock integer default 0;
alter table products add column if not exists is_available boolean default true;

alter table products enable row level security;
drop policy if exists "Allow anon update products stock" on products;
create policy "Allow anon update products stock"
  on products for update to anon using (true) with check (true);
drop policy if exists "Allow anon select products" on products;
create policy "Allow anon select products"
  on products for select to anon using (true);

alter table orders add column if not exists contact text;
alter table orders add column if not exists contact_type text;
alter table orders add column if not exists client text;
alter table orders add column if not exists address text;
alter table orders add column if not exists status text default 'new';

alter table orders enable row level security;
drop policy if exists "Allow anon insert orders" on orders;
create policy "Allow anon insert orders"
  on orders for insert to anon with check (true);
drop policy if exists "Allow anon select orders" on orders;
create policy "Allow anon select orders"
  on orders for select to anon using (true);
drop policy if exists "Allow anon update orders" on orders;
create policy "Allow anon update orders"
  on orders for update to anon using (true) with check (true);
