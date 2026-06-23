-- =====================================================================
-- 011_subscription_addons.sql
-- ---------------------------------------------------------------------
-- Plan limitleri güncellendi (kullanıcı onayıyla):
--   - Pro planda personel eklenemez (özellik kapalı), şube de yok.
--   - Premium planda 1 personel ve 2 şube dahildir.
--   - Daha fazla personel/şube isteyen kullanıcı, abonelik sayfasından
--     ek ücretli "ekstra personel" / "ekstra şube" satın alabilir.
-- =====================================================================

alter table public.profiles
  add column if not exists extra_personnel_slots integer not null default 0,
  add column if not exists extra_branch_slots integer not null default 0;

-- Ekstra slot fiyatlarını yönetebilmek için system_settings'e varsayılan ekle
insert into public.system_settings (key, value, description)
values (
  'subscription_addons',
  '{"extra_personnel_price_monthly": 199, "extra_branch_price_monthly": 349}'::jsonb,
  'Premium plana ek olarak satın alınabilen ekstra personel ve şube hakkının aylık fiyatı (TL).'
)
on conflict (key) do nothing;
