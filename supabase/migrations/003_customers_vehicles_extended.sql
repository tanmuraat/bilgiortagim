-- Müşteri sorgulama + genişletilmiş araçlar + KM logları

create table if not exists public.customer_records (
  id uuid primary key default gen_random_uuid(),
  tc_hash text not null unique,
  full_name text not null,
  birth_date date,
  phone_encrypted text,
  email text,
  address text,
  risk_status text not null default 'safe' check (risk_status in ('safe', 'risky')),
  total_records integer not null default 0,
  negative_records integer not null default 0,
  total_debt numeric(12, 2) not null default 0,
  last_rental_at timestamptz,
  last_company_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.customer_record_items (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customer_records (id) on delete cascade,
  record_type text not null check (
    record_type in ('rental', 'negative', 'payment', 'damage')
  ),
  title text not null,
  description text,
  category_label text,
  company_name text not null,
  vehicle_plate text,
  amount numeric(12, 2) default 0,
  payment_status text check (
    payment_status in ('paid', 'unpaid', 'collected')
  ),
  occurred_at timestamptz not null default now()
);

create table if not exists public.query_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  tc_hash text not null,
  customer_id uuid references public.customer_records (id) on delete set null,
  result_found boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists idx_customer_records_tc_hash on public.customer_records (tc_hash);
create index if not exists idx_customer_record_items_customer on public.customer_record_items (customer_id);
create index if not exists idx_query_logs_user_created on public.query_logs (user_id, created_at);

alter table public.customer_records enable row level security;
alter table public.customer_record_items enable row level security;
alter table public.query_logs enable row level security;

-- Kayıtlar platform genelinde (hash ile sorgu)
create policy "customer_records_read_authenticated"
  on public.customer_records for select
  to authenticated
  using (true);

create policy "customer_record_items_read_authenticated"
  on public.customer_record_items for select
  to authenticated
  using (true);

create policy "query_logs_own"
  on public.query_logs for all
  using (auth.uid() = user_id);

-- Araç alanları
alter table public.vehicles add column if not exists color text;
alter table public.vehicles add column if not exists fuel_type text;
alter table public.vehicles add column if not exists transmission text;
alter table public.vehicles add column if not exists current_km integer not null default 0;
alter table public.vehicles add column if not exists insurance_expiry date;
alter table public.vehicles add column if not exists inspection_expiry date;
alter table public.vehicles add column if not exists notes text;

update public.vehicles set status = 'available' where status = 'active';

alter table public.vehicles drop constraint if exists vehicles_status_check;
alter table public.vehicles
  add constraint vehicles_status_check check (
    status in ('available', 'rented', 'maintenance', 'inactive')
  );

create table if not exists public.vehicle_km_logs (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references public.vehicles (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  previous_km integer not null,
  new_km integer not null,
  difference_km integer not null,
  note text,
  logged_at timestamptz not null default now()
);

create index if not exists idx_vehicle_km_logs_vehicle on public.vehicle_km_logs (vehicle_id, logged_at);

alter table public.vehicle_km_logs enable row level security;
create policy "vehicle_km_logs_own" on public.vehicle_km_logs for all using (auth.uid() = user_id);
