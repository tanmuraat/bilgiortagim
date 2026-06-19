-- Profiles tablosuna yeni alanlar ekle
alter table public.profiles
  add column if not exists tc_number_encrypted text,
  add column if not exists birth_date date,
  add column if not exists tax_office text,
  add column if not exists city text,
  add column if not exists district text,
  add column if not exists website text,
  add column if not exists fleet_size text,
  add column if not exists kvkk_accepted boolean not null default false,
  add column if not exists contract_accepted boolean not null default false,
  add column if not exists kvkk_accepted_at timestamptz,
  add column if not exists contract_accepted_at timestamptz;