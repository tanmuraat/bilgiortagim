-- BilgiOrtağım: profiles tablosu ve vergi levhası storage

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null,
  company_name text not null,
  tax_number text not null,
  phone text not null,
  email text not null,
  tax_document_url text,
  tax_document_path text,
  status text not null default 'pending' check (status in ('pending', 'active', 'suspended')),
  role text not null default 'user' check (role in ('user', 'admin')),
  subscription_plan text not null default 'none' check (subscription_plan in ('none', 'pro', 'premium')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Users can read own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

insert into storage.buckets (id, name, public)
values ('vergi-levhalari', 'vergi-levhalari', true)
on conflict (id) do nothing;

create policy "Authenticated users can upload tax documents"
  on storage.objects for insert
  with check (
    bucket_id = 'vergi-levhalari'
    and auth.role() = 'authenticated'
  );

create policy "Public read tax documents"
  on storage.objects for select
  using (bucket_id = 'vergi-levhalari');
