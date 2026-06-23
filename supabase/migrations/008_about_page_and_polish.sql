-- =====================================================================
-- 008_about_page_and_polish.sql
-- ---------------------------------------------------------------------
-- Bu migration sadece "Hakkımızda" sayfası için varsayılan içeriği
-- ekler. landing_content tablosu zaten var olduğu için 005'teki insert
-- bloğu (on conflict do nothing ile) bu satırı atlamış olabilir —
-- burada ayrıca, güvenli şekilde garantiye alıyoruz.
-- =====================================================================

insert into public.landing_content (section, key, value, display_order) values
  ('about', 'main', '{
    "title": "Hakkımızda",
    "subtitle": "Rent A Car sektörünün dijital güvencesi",
    "body": "BilgiOrtağım, araç kiralama sektöründe çalışan firmaların müşteri geçmişi sorgulama, kiralama takibi ve muhasebe süreçlerini tek bir platformda yönetmelerini sağlayan bir dijital çözümdür.\nSektördeki firmaların güvenilir müşteri verisine hızlıca ulaşabilmesi ve operasyonel süreçlerini daha verimli yönetebilmesi için geliştirildi.",
    "mission_title": "Misyonumuz",
    "mission_text": "Rent A Car firmalarına güvenilir müşteri verisi ve kolay filo yönetimi sağlayarak operasyonel verimliliği artırmak.",
    "vision_title": "Vizyonumuz",
    "vision_text": "Türkiye''deki araç kiralama sektörünün dijital altyapısında referans platform olmak."
  }'::jsonb, 1)
on conflict (section, key) do nothing;
