-- =====================================================================
-- 009_branches.sql
-- ---------------------------------------------------------------------
-- Şube (branch) sistemi.
--
-- Tasarım kararı (kullanıcı onayıyla):
-- - Personel (sub_users) ve Şube (branch) tamamen ayrı kavramlar.
--   Personel her zaman ana firmanın verisiyle çalışır. Şube kendi
--   bağımsız hesabı, kendi araç/kiralama/muhasebe verisiyle çalışan
--   AYRI bir profiles kaydıdır (normal bir kullanıcı gibi giriş yapar).
-- - Şube, kendi personelini EKLEYEMEZ (sub_users sayfası şubeler için
--   kapalı olacak — kod tarafında engellenecek).
-- - Ana firma (parent), kendi şubelerinin TÜM verisini salt-okunur
--   olarak görebilir (Mini Muhasebe → Şubelerim sekmesi).
-- - Pro planda 0, Premium planda 2 şubeye kadar açılabilir.
-- - Şubenin günlük müşteri sorgu limiti, kendi araç sayısına göre
--   hesaplanır (ana firmanınkinden bağımsız bir havuz).
-- =====================================================================

alter table public.profiles
  add column if not exists is_branch boolean not null default false,
  add column if not exists branch_of_user_id uuid references public.profiles (id) on delete cascade,
  add column if not exists branch_name text;

create index if not exists idx_profiles_branch_of on public.profiles (branch_of_user_id);

-- Bir ana firmanın kaç şubesi olduğunu hızlıca saymak için kısmi indeks
create index if not exists idx_profiles_is_branch on public.profiles (is_branch) where is_branch = true;

-- ---------------------------------------------------------------------
-- RLS: Ana firma kendi şubelerinin verisini SALT OKUNUR görebilmeli.
-- ---------------------------------------------------------------------
-- vehicles, rentals, transactions, vehicle_km_logs, customer_record_items
-- tablolarında zaten "kendi user_id'si" bazlı select policy'leri var.
-- Buraya EK olarak "branch_of_user_id eşleşirse de oku" policy'si ekliyoruz.
-- Var olan policy'lere dokunmuyoruz, sadece yeni bir select policy daha
-- ekliyoruz (Postgres'te aynı tablo üzerinde birden fazla select policy
-- OR mantığıyla birleşir).

drop policy if exists "vehicles_branch_parent_read" on public.vehicles;
create policy "vehicles_branch_parent_read"
  on public.vehicles for select
  using (
    user_id in (
      select id from public.profiles where branch_of_user_id = auth.uid()
    )
  );

drop policy if exists "rentals_branch_parent_read" on public.rentals;
create policy "rentals_branch_parent_read"
  on public.rentals for select
  using (
    user_id in (
      select id from public.profiles where branch_of_user_id = auth.uid()
    )
  );

drop policy if exists "transactions_branch_parent_read" on public.transactions;
create policy "transactions_branch_parent_read"
  on public.transactions for select
  using (
    user_id in (
      select id from public.profiles where branch_of_user_id = auth.uid()
    )
  );

drop policy if exists "vehicle_km_logs_branch_parent_read" on public.vehicle_km_logs;
create policy "vehicle_km_logs_branch_parent_read"
  on public.vehicle_km_logs for select
  using (
    user_id in (
      select id from public.profiles where branch_of_user_id = auth.uid()
    )
  );

-- Ana firmanın kendi şube profillerini (isim, email vb.) görebilmesi için
drop policy if exists "profiles_branch_parent_read" on public.profiles;
create policy "profiles_branch_parent_read"
  on public.profiles for select
  using (branch_of_user_id = auth.uid());
