-- San Antonio High School Inventory System
-- Run this entire script in Supabase > SQL Editor.
-- Create user accounts in Supabase Authentication first. New profiles default to requester.
-- Promote trusted staff by running:
-- update public.profiles set role = 'admin' where id = '<AUTH_USER_UUID>';
-- Allowed roles: admin, staff, requester.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default 'School User',
  role text not null default 'requester' check (role in ('admin','staff','requester')),
  created_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, role)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email,'@',1)), 'requester')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
for each row execute procedure public.handle_new_user();

create or replace function public.current_user_role()
returns text language sql stable security definer set search_path = public
as $$ select role from public.profiles where id = auth.uid() $$;

create table if not exists public.inventory_items (
  id uuid primary key default gen_random_uuid(),
  seq_no text,
  school_id text,
  district text,
  school_name text,
  old_property_no text,
  item_code text,
  serial_no text,
  model_no text,
  date_acquired text,
  uacs text,
  account_category text,
  account_classification text,
  account_title text,
  article text,
  name text not null,
  category text not null default 'Other',
  description text,
  unit text not null default 'pcs',
  unit_value numeric(14,2),
  qty_property_card integer not null default 0,
  quantity integer not null default 0 check (quantity >= 0),
  reorder_level integer not null default 0 check (reorder_level >= 0),
  location text,
  condition text,
  useful_life text,
  remarks text,
  available_documents text,
  fund_source text,
  fund text,
  accountable_hris_id text,
  accountable_person text,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Ensure all DepEd ICF columns exist if the table was created earlier:
alter table public.inventory_items drop constraint if exists inventory_items_item_code_key;
alter table public.inventory_items add column if not exists seq_no text;
alter table public.inventory_items add column if not exists school_id text;
alter table public.inventory_items add column if not exists district text;
alter table public.inventory_items add column if not exists school_name text;
alter table public.inventory_items add column if not exists old_property_no text;
alter table public.inventory_items add column if not exists serial_no text;
alter table public.inventory_items add column if not exists model_no text;
alter table public.inventory_items add column if not exists date_acquired text;
alter table public.inventory_items add column if not exists uacs text;
alter table public.inventory_items add column if not exists account_category text;
alter table public.inventory_items add column if not exists account_classification text;
alter table public.inventory_items add column if not exists account_title text;
alter table public.inventory_items add column if not exists article text;
alter table public.inventory_items add column if not exists unit_value numeric(14,2);
alter table public.inventory_items add column if not exists qty_property_card integer not null default 0;
alter table public.inventory_items add column if not exists condition text;
alter table public.inventory_items add column if not exists useful_life text;
alter table public.inventory_items add column if not exists remarks text;
alter table public.inventory_items add column if not exists available_documents text;
alter table public.inventory_items add column if not exists fund_source text;
alter table public.inventory_items add column if not exists fund text;
alter table public.inventory_items add column if not exists accountable_hris_id text;
alter table public.inventory_items add column if not exists accountable_person text;

create table if not exists public.stock_transactions (
  id uuid primary key default gen_random_uuid(),
  item_id uuid references public.inventory_items(id) on delete set null,
  type text not null check (type in ('in','out')),
  quantity integer not null check (quantity > 0),
  reference text,
  notes text,
  recorded_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create table if not exists public.item_requests (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.inventory_items(id),
  requested_by uuid not null references public.profiles(id),
  quantity integer not null check (quantity > 0),
  note text,
  status text not null default 'pending' check (status in ('pending','approved','fulfilled','rejected')),
  reviewed_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  action text not null check (action in ('added','imported','updated','deleted')),
  item_name text not null,
  item_code text,
  details text,
  actor_id uuid references public.profiles(id) on delete set null,
  actor_name text not null,
  created_at timestamptz not null default now()
);

create index if not exists inventory_items_name_idx on public.inventory_items(name);
create index if not exists stock_transactions_created_idx on public.stock_transactions(created_at desc);
create index if not exists item_requests_created_idx on public.item_requests(created_at desc);
create index if not exists audit_logs_created_idx on public.audit_logs(created_at desc);

alter table public.profiles enable row level security;
alter table public.inventory_items enable row level security;
alter table public.stock_transactions enable row level security;
alter table public.item_requests enable row level security;
alter table public.audit_logs enable row level security;

-- Profiles: authenticated users can read profile names for audit/history display.
drop policy if exists "profiles_select" on public.profiles;
create policy "profiles_select" on public.profiles for select to authenticated
using (true);
drop policy if exists "profiles_insert_self" on public.profiles;
create policy "profiles_insert_self" on public.profiles for insert to authenticated
with check (id = auth.uid() and role = 'requester');
drop policy if exists "profiles_update_self" on public.profiles;
create policy "profiles_update_self" on public.profiles for update to authenticated
using (id = auth.uid()) with check (id = auth.uid() and role = public.current_user_role());
drop policy if exists "profiles_admin_update" on public.profiles;
create policy "profiles_admin_update" on public.profiles for update to authenticated
using (public.current_user_role() = 'admin') with check (public.current_user_role() = 'admin');

-- Inventory is visible to authenticated school users; only staff/admin can mutate it.
drop policy if exists "inventory_read" on public.inventory_items;
create policy "inventory_read" on public.inventory_items for select to authenticated using (true);
drop policy if exists "inventory_insert" on public.inventory_items;
create policy "inventory_insert" on public.inventory_items for insert to authenticated
with check (public.current_user_role() in ('admin','staff'));
drop policy if exists "inventory_update" on public.inventory_items;
create policy "inventory_update" on public.inventory_items for update to authenticated
using (public.current_user_role() in ('admin','staff')) with check (public.current_user_role() in ('admin','staff'));
drop policy if exists "inventory_delete" on public.inventory_items;
create policy "inventory_delete" on public.inventory_items for delete to authenticated
using (public.current_user_role() in ('admin','staff'));

-- Transactions: visible to authenticated users; inserted only through the checked RPC below.
drop policy if exists "transactions_read" on public.stock_transactions;
create policy "transactions_read" on public.stock_transactions for select to authenticated using (true);

-- Audit Logs: visible to all authenticated users; staff/admin can insert audit logs.
drop policy if exists "audit_logs_read" on public.audit_logs;
create policy "audit_logs_read" on public.audit_logs for select to authenticated using (true);
drop policy if exists "audit_logs_insert" on public.audit_logs;
create policy "audit_logs_insert" on public.audit_logs for insert to authenticated
with check (public.current_user_role() in ('admin','staff'));

-- Requests: users can create and read their own; staff/admin can review all.
drop policy if exists "requests_read" on public.item_requests;
create policy "requests_read" on public.item_requests for select to authenticated
using (requested_by = auth.uid() or public.current_user_role() in ('admin','staff'));
drop policy if exists "requests_insert" on public.item_requests;
create policy "requests_insert" on public.item_requests for insert to authenticated
with check (requested_by = auth.uid());
drop policy if exists "requests_review" on public.item_requests;
create policy "requests_review" on public.item_requests for update to authenticated
using (public.current_user_role() in ('admin','staff')) with check (public.current_user_role() in ('admin','staff'));

-- Atomic stock movement: prevents negative stock and writes an audit transaction.
create or replace function public.record_stock_transaction(
  p_item_id uuid, p_type text, p_quantity integer,
  p_reference text default null, p_notes text default null
) returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  v_item public.inventory_items%rowtype;
  v_transaction_id uuid;
begin
  if auth.uid() is null or public.current_user_role() not in ('admin','staff') then
    raise exception 'You do not have permission to record stock transactions.';
  end if;
  if p_type not in ('in','out') or p_quantity is null or p_quantity <= 0 then
    raise exception 'Invalid transaction type or quantity.';
  end if;
  select * into v_item from public.inventory_items where id = p_item_id for update;
  if not found then raise exception 'Inventory item not found.'; end if;
  if p_type = 'out' and v_item.quantity < p_quantity then
    raise exception 'Insufficient stock. Available quantity: %', v_item.quantity;
  end if;
  update public.inventory_items
    set quantity = quantity + case when p_type = 'in' then p_quantity else -p_quantity end,
        updated_at = now()
    where id = p_item_id;
  insert into public.stock_transactions(item_id,type,quantity,reference,notes,recorded_by)
    values(p_item_id,p_type,p_quantity,p_reference,p_notes,auth.uid())
    returning id into v_transaction_id;
  return v_transaction_id;
end;
$$;

revoke all on function public.record_stock_transaction(uuid,text,integer,text,text) from public;
grant execute on function public.record_stock_transaction(uuid,text,integer,text,text) to authenticated;

-- Updated timestamp helper.
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$ begin new.updated_at = now(); return new; end; $$;
drop trigger if exists inventory_updated_at on public.inventory_items;
create trigger inventory_updated_at before update on public.inventory_items
for each row execute procedure public.set_updated_at();
drop trigger if exists request_updated_at on public.item_requests;
create trigger request_updated_at before update on public.item_requests
for each row execute procedure public.set_updated_at();

-- Note: to create the first administrator:
-- 1. Create an account in Authentication > Users.
-- 2. Copy its UUID.
-- 3. Run: update public.profiles set role='admin', full_name='Inventory Administrator' where id='UUID';
