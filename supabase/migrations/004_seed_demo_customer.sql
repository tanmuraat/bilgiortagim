-- Opsiyonel demo müşteri (test TC: 10000000146)
-- hashSHA256('10000000146') — uygulama içinde aynı algoritma ile üretilir

-- Önce ENCRYPTION_SECRET ile phone şifreleyip phone_encrypted alanına yapıştırın veya
-- API üzerinden kayıt sonrası admin panel ile ekleyin.

-- Örnek: tc_hash değerini uygulamada hashSHA256('10000000146') ile üretin ve aşağıya yazın.

/*
insert into public.customer_records (
  tc_hash, full_name, birth_date, email, address, risk_status,
  total_records, negative_records, total_debt, last_rental_at, last_company_name
) values (
  '<TC_HASH_BURAYA>',
  'AHMET ERDEM',
  '1985-03-15',
  'ahmet@ornek.com',
  'Kadıköy / İstanbul',
  'safe',
  8, 2, 12750.00,
  now() - interval '12 days',
  'ABC RENT A CAR'
) on conflict (tc_hash) do nothing;
*/
