-- ── Aarisha Admin: Products Schema ──
-- This is the shared products table that both The-aarisha (storefront)
-- and The-aarisha-admin (this project) read/write.
-- The admin panel manages products; the storefront displays them.

create extension if not exists pgcrypto;

create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  price numeric(10,2) not null check (price > 0),
  category text not null check (category in ('rings', 'necklaces', 'bracelets', 'earrings')),
  image_url text not null,
  description text,
  in_stock boolean not null default true,
  created_at timestamptz default now()
);

alter table products enable row level security;

-- Public read access so the storefront can fetch products directly from Supabase.
-- All writes go through the FastAPI backend using the service_role key.
drop policy if exists "public product read" on products;
create policy "public product read" on products for select using (true);
