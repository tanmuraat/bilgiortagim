-- =====================================================================
-- 010_personnel_data_sharing.sql
-- ---------------------------------------------------------------------
-- Personel (sub_users / profiles.is_sub_user) sistemi şimdiye kadar
-- sadece personel HESABI oluşturuyordu, ama personel giriş yapıp bir
-- işlem yaptığında (araç ekleme, kiralama, gider girme) bu veri kendi
-- auth.uid()'sine kaydediliyordu — ana firmanın verisine HİÇ
-- yansımıyordu. Bu migration bunu düzeltir:
--
-- 1) Her tabloya "performed_by" kolonu eklenir — işlemi GERÇEKTE kimin
--    yaptığını kalıcı olarak tutar (personel mi, ana firma mı).
-- 2) Trigger ile, insert anında user_id otomatik olarak "etkin firma"ya
--    (personelse onun bağlı olduğu ana firmaya, değilse kendisine)
--    yönlendirilir. Sayfa kodunun HİÇBİRİNE dokunmaya gerek kalmaz —
--    sayfalar zaten auth.uid()'yi user_id olarak yazıyordu, trigger bunu
--    gerektiğinde sessizce düzeltir.
-- 3) Personelin ana firmanın verisini okuyup yazabilmesi, ana firmanın
--    da personelin profilini (performed_by join'i için) görebilmesi
--    için RLS policy'leri eklenir.
-- =====================================================================


-- ---------------------------------------------------------------------
-- 1) PERFORMED_BY kolonları
-- ---------------------------------------------------------------------

alter table public.vehicles add column if not exists performed_by uuid references public.profiles (id) on delete set null;
alter table public.rentals add column if not exists performed_by uuid references public.profiles (id) on delete set null;
alter table public.transactions add column if not exists performed_by uuid references public.profiles (id) on delete set null;
alter table public.vehicle_km_logs add column if not exists performed_by uuid references public.profiles (id) on delete set null;

-- Var olan kayıtlar için performed_by = user_id (yani "kendisi yaptı" varsayımı)
update public.vehicles set performed_by = user_id where performed_by is null;
update public.rentals set performed_by = user_id where performed_by is null;
update public.transactions set performed_by = user_id where performed_by is null;
update public.vehicle_km_logs set performed_by = user_id where performed_by is null;


-- ---------------------------------------------------------------------
-- 2) Yardımcı fonksiyonlar (security definer — RLS recursion'ı önler)
-- ---------------------------------------------------------------------

-- Çağıran kullanıcı bir personelse, bağlı olduğu ana firmanın id'sini
-- döndürür; değilse kendi id'sini döndürür. "Bu işlem hangi firmanın
-- verisine yazılmalı?" sorusunun cevabıdır.
create or replace function public.get_effective_user_id() returns uuid as $$
  select coalesce(
    (select parent_user_id from public.profiles where id = auth.uid() and is_sub_user = true and parent_user_id is not null),
    auth.uid()
  );
$$ language sql stable security definer set search_path = public;

grant execute on function public.get_effective_user_id() to authenticated;

-- target_id, çağıranın personeli mi? (ana firma → personel görünürlüğü için)
create or replace function public.is_my_personnel(target_id uuid) returns boolean as $$
  select exists (
    select 1 from public.profiles
    where id = target_id and parent_user_id = auth.uid() and is_sub_user = true
  );
$$ language sql stable security definer set search_path = public;

grant execute on function public.is_my_personnel(uuid) to authenticated;

-- target_id, çağıranın bağlı olduğu ana firma mı? (personel → ana firma görünürlüğü için)
create or replace function public.is_my_parent(target_id uuid) returns boolean as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and parent_user_id = target_id and is_sub_user = true
  );
$$ language sql stable security definer set search_path = public;

grant execute on function public.is_my_parent(uuid) to authenticated;


-- ---------------------------------------------------------------------
-- 3) Trigger — insert anında user_id'yi "etkin firma"ya yönlendir
-- ---------------------------------------------------------------------

create or replace function public.set_effective_user_id() returns trigger as $$
begin
  if new.performed_by is null then
    new.performed_by := auth.uid();
  end if;
  new.user_id := public.get_effective_user_id();
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists trg_vehicles_effective_user on public.vehicles;
create trigger trg_vehicles_effective_user before insert on public.vehicles
  for each row execute function public.set_effective_user_id();

drop trigger if exists trg_rentals_effective_user on public.rentals;
create trigger trg_rentals_effective_user before insert on public.rentals
  for each row execute function public.set_effective_user_id();

drop trigger if exists trg_transactions_effective_user on public.transactions;
create trigger trg_transactions_effective_user before insert on public.transactions
  for each row execute function public.set_effective_user_id();

drop trigger if exists trg_vehicle_km_logs_effective_user on public.vehicle_km_logs;
create trigger trg_vehicle_km_logs_effective_user before insert on public.vehicle_km_logs
  for each row execute function public.set_effective_user_id();

-- query_logs için de aynı mantık: personel sorgu yaptığında, bu sorgu hakkı
-- ana firmanın günlük limit havuzundan düşmeli (limit zaten ana firmanın
-- araç sayısına göre hesaplanıyor, ortak bir havuz olmalı).
alter table public.query_logs add column if not exists performed_by uuid references public.profiles (id) on delete set null;
update public.query_logs set performed_by = user_id where performed_by is null;

drop trigger if exists trg_query_logs_effective_user on public.query_logs;
create trigger trg_query_logs_effective_user before insert on public.query_logs
  for each row execute function public.set_effective_user_id();


-- ---------------------------------------------------------------------
-- 4) RLS — personel, ana firmanın verisini okuyup yazabilsin
-- ---------------------------------------------------------------------
-- RLS'in aktif olduğunu garantiye al (003 migration'ı bazı ortamlarda
-- hiç çalışmadığı için query_logs üzerinde RLS aktif olmayabilirdi).
alter table public.vehicles enable row level security;
alter table public.rentals enable row level security;
alter table public.transactions enable row level security;
alter table public.vehicle_km_logs enable row level security;
alter table public.query_logs enable row level security;
alter table public.profiles enable row level security;

-- NOT: Bu policy'ler "for all" — yani personel sadece görmekle kalmaz,
-- yetkisi olan modüllerde (permissions, UI seviyesinde kontrol edilir)
-- ana firma adına kayıt da oluşturabilir. Trigger zaten user_id'yi
-- doğru firmaya yönlendirdiği için, bu policy'ler personelin kendi
-- yazdığı (ama artık ana firmaya ait olan) satırı geri okuyabilmesini
-- de sağlar.

drop policy if exists "vehicles_personnel_access" on public.vehicles;
create policy "vehicles_personnel_access"
  on public.vehicles for all
  using (
    user_id in (
      select parent_user_id from public.profiles
      where id = auth.uid() and is_sub_user = true and parent_user_id is not null
    )
  );

drop policy if exists "rentals_personnel_access" on public.rentals;
create policy "rentals_personnel_access"
  on public.rentals for all
  using (
    user_id in (
      select parent_user_id from public.profiles
      where id = auth.uid() and is_sub_user = true and parent_user_id is not null
    )
  );

drop policy if exists "transactions_personnel_access" on public.transactions;
create policy "transactions_personnel_access"
  on public.transactions for all
  using (
    user_id in (
      select parent_user_id from public.profiles
      where id = auth.uid() and is_sub_user = true and parent_user_id is not null
    )
  );

drop policy if exists "vehicle_km_logs_personnel_access" on public.vehicle_km_logs;
create policy "vehicle_km_logs_personnel_access"
  on public.vehicle_km_logs for all
  using (
    user_id in (
      select parent_user_id from public.profiles
      where id = auth.uid() and is_sub_user = true and parent_user_id is not null
    )
  );

drop policy if exists "query_logs_personnel_access" on public.query_logs;
create policy "query_logs_personnel_access"
  on public.query_logs for all
  using (
    user_id in (
      select parent_user_id from public.profiles
      where id = auth.uid() and is_sub_user = true and parent_user_id is not null
    )
  );


-- ---------------------------------------------------------------------
-- 5) RLS — profiles: ana firma ↔ personel karşılıklı görünürlük
-- ---------------------------------------------------------------------

drop policy if exists "profiles_parent_sees_personnel" on public.profiles;
create policy "profiles_parent_sees_personnel"
  on public.profiles for select
  using (public.is_my_personnel(id));

drop policy if exists "profiles_personnel_sees_parent" on public.profiles;
create policy "profiles_personnel_sees_parent"
  on public.profiles for select
  using (public.is_my_parent(id));
