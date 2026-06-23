-- =====================================================================
-- 007_fix_real_schema.sql
-- ---------------------------------------------------------------------
-- Bu migration, 005_unified_schema_fix.sql çalıştırılırken
-- "customer_records" bloğunda hata verip durması nedeniyle
-- eksik kalan parçaları, GERÇEK veritabanı şemasını (Supabase'den
-- information_schema.columns ile alınan) baz alarak tamamlar.
--
-- 005'teki customer_records bloğu YANLIŞ bir varsayıma dayanıyordu
-- (003 migration'ının çalıştığını ve risk_status/total_records gibi
-- eski kolonların var olduğunu düşünüyordu). Gerçekte tablo zaten
-- risk_level/tc_encrypted/rental_count/query_count/total_outstanding/
-- last_rental_company/last_rental_date kolonlarıyla doğru kurulmuştu.
-- Bu migration customer_records'a HİÇBİR ŞEY EKLEMEZ — zaten doğru.
--
-- Sadece şunları tamamlar:
--   1) receipts storage bucket'ı (hâlâ eksikti)
--   2) notifications "kendi bildirimini silebilme" policy'si
--      (005'te bu policy customer_records hatasından sonra geldiği
--       için hiç uygulanmamış olabilir)
-- =====================================================================


-- ---------------------------------------------------------------------
-- 1) RECEIPTS STORAGE BUCKET
-- ---------------------------------------------------------------------
-- contracts bucket'ı zaten mevcut (kontrol ettin), receipts eksikti.

insert into storage.buckets (id, name, public)
values ('receipts', 'receipts', true)
on conflict (id) do nothing;

drop policy if exists "receipts_upload_authenticated" on storage.objects;
create policy "receipts_upload_authenticated"
  on storage.objects for insert
  with check (bucket_id = 'receipts' and auth.role() = 'authenticated');

drop policy if exists "receipts_read_public" on storage.objects;
create policy "receipts_read_public"
  on storage.objects for select
  using (bucket_id = 'receipts');

drop policy if exists "receipts_update_own" on storage.objects;
create policy "receipts_update_own"
  on storage.objects for update
  using (bucket_id = 'receipts' and auth.role() = 'authenticated');

drop policy if exists "receipts_delete_own" on storage.objects;
create policy "receipts_delete_own"
  on storage.objects for delete
  using (bucket_id = 'receipts' and auth.role() = 'authenticated');


-- ---------------------------------------------------------------------
-- 2) NOTIFICATIONS — kullanıcının kendi bildirimini silebilmesi
-- ---------------------------------------------------------------------
-- 006_support_tickets.sql'de bu policy zaten tanımlıydı ve 006'nın
-- hatasız çalıştığını belirttin, bu yüzden bu blok muhtemelen zaten
-- uygulanmış durumda. "drop + create" idempotent olduğu için tekrar
-- çalıştırmak güvenli ve zararsızdır.

drop policy if exists "notifications_delete" on public.notifications;
create policy "notifications_delete" on public.notifications
  for delete using (auth.uid() = user_id);
