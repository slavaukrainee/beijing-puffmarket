-- Optional: run in Supabase SQL Editor if order insert fails (RLS)

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

alter table orders add column if not exists contact_type text;
alter table orders add column if not exists client text;
alter table orders add column if not exists address text;
