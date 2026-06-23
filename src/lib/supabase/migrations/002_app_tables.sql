-- Araçlar, kiralamalar, işlemler, bildirimler + tax-documents bucket

insert into storage.buckets (id, name, public)
values ('tax-documents', 'tax-documents', true)
on conflict (id) do nothing;

create table if not exists public.vehicles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  plate text not null,
  brand text not null,
  model text not null,
  year integer not null,
  status text not null default 'active' check (status in ('active', 'maintenance', 'inactive')),
  created_at timestamptz not null default now()
);

create table if not exists public.rentals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  vehicle_id uuid not null references public.vehicles (id) on delete cascade,
  customer_name text not null,
  start_date date not null,
  end_date date not null,
  status text not null default 'active' check (status in ('active', 'completed', 'cancelled')),
  total_amount numeric(12, 2) not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  rental_id uuid references public.rentals (id) on delete set null,
  vehicle_id uuid references public.vehicles (id) on delete set null,
  type text not null check (type in ('income', 'expense')),
  category text not null,
  amount numeric(12, 2) not null,
  description text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  title text not null,
  message text not null,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists idx_vehicles_user on public.vehicles (user_id);
create index if not exists idx_rentals_user on public.rentals (user_id);
create index if not exists idx_rentals_vehicle on public.rentals (vehicle_id);
create index if not exists idx_rentals_end_date on public.rentals (end_date);
create index if not exists idx_transactions_user on public.transactions (user_id);
create index if not exists idx_transactions_created on public.transactions (created_at);
create index if not exists idx_notifications_user on public.notifications (user_id, read);

alter table public.vehicles enable row level security;
alter table public.rentals enable row level security;
alter table public.transactions enable row level security;
alter table public.notifications enable row level security;

create policy "vehicles_own" on public.vehicles for all using (auth.uid() = user_id);
create policy "rentals_own" on public.rentals for all using (auth.uid() = user_id);
create policy "transactions_own" on public.transactions for all using (auth.uid() = user_id);
create policy "notifications_own" on public.notifications for all using (auth.uid() = user_id);

create policy "tax_documents_upload"
  on storage.objects for insert
  with check (bucket_id = 'tax-documents' and auth.role() = 'authenticated');

create policy "tax_documents_read"
  on storage.objects for select
  using (bucket_id = 'tax-documents');
