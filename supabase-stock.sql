-- Добавить колонку остатков (если ещё нет)
alter table products add column if not exists stock integer default 0;

-- Разрешить обновление остатков с сайта склада
alter table products enable row level security;

drop policy if exists "Allow anon update products stock" on products;
create policy "Allow anon update products stock"
  on products for update to anon
  using (true) with check (true);

drop policy if exists "Allow anon select products" on products;
create policy "Allow anon select products"
  on products for select to anon using (true);
