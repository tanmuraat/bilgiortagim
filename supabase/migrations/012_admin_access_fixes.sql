-- =====================================================================
-- 012_admin_access_fixes.sql
-- ---------------------------------------------------------------------
-- Bu migration iki ayrı, gerçek admin panel hatasını düzeltir:
--
-- 1) "transactions" tablosunda admin için HİÇ select policy'si yoktu
--    (diğer tüm tablolarda customer_records, customer_incidents,
--    rentals, vehicles için "Admins ... " policy'si varken transactions
--    unutulmuştu). Bu, admin panelindeki finansal özet/firma detayı
--    gibi transactions verisine bağımlı her yerin veri görememesine
--    sebep oluyordu.
--
-- 2) 010_personnel_data_sharing.sql ile vehicles/rentals/transactions/
--    query_logs tablolarına "performed_by" kolonu (ve profiles'a FK'si)
--    eklendiğinde, bu tablolardan profiles'a artık İKİ foreign key
--    (user_id ve performed_by) olmuş oldu. PostgREST, hedefte iki FK
--    olduğunda hangisini kullanacağını otomatik seçemez ve örtük
--    "profiles(...)" join'i hata verir — bu yüzden admin panelindeki
--    "Son Müşteri Sorguları" listesi ve sorgu logları sayfası boş
--    görünüyordu. Kod tarafında bu join'leri profiles!fkey_adi(...)
--    şeklinde açık hale getirdim (ayrı bir kod teslimi ile); bu
--    migration'ın görevi sadece eksik admin policy'sini eklemek.
-- =====================================================================

drop policy if exists "transactions_admin_read" on public.transactions;
create policy "transactions_admin_read"
  on public.transactions for select
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid() and profiles.role = 'admin'
    )
  );
