-- =====================================================================
-- 005_unified_schema_fix.sql
-- ---------------------------------------------------------------------
-- Bu migration, uygulama kodunun (src/app, src/components, src/lib)
-- gerçekte beklediği şemayı baz alarak önceki migration'lardaki
-- (001-004 ve src/lib/supabase/migrations/006, 008) eksiklikleri
-- ve tutarsızlıkları tek seferde giderir.
--
-- Tasarım ilkesi: hiçbir yerde DROP TABLE / DROP COLUMN kullanılmaz.
-- Var olan veri korunur. Tüm değişiklikler "add column if not exists",
-- "create table if not exists" ve constraint'lerin güvenli şekilde
-- drop+recreate edilmesiyle yapılır.
-- =====================================================================


-- ---------------------------------------------------------------------
-- 1) PROFILES — eksik kolonlar
-- ---------------------------------------------------------------------
-- Not: tc_number_encrypted, birth_date, tax_office, city, district,
-- website, fleet_size, kvkk_accepted*, contract_accepted* zaten
-- src/lib/supabase/migrations/008_profiles_extended.sql ile eklenmişti.
-- Burada onları da if-not-exists ile tekrar garantiye alıyoruz (proje
-- iki ayrı migration klasörü kullandığı için hangisinin çalıştığı
-- belirsizdi), ve gerçekten eksik olan kalan kolonları ekliyoruz.

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

-- Personel / alt kullanıcı sistemi (src/app/(app)/layout.tsx, api/personel)
alter table public.profiles
  add column if not exists is_sub_user boolean not null default false,
  add column if not exists parent_user_id uuid references public.profiles (id) on delete cascade,
  add column if not exists permissions jsonb not null default '[]'::jsonb;

-- Abonelik takibi (abonelik/page.tsx, ayarlar/page.tsx, admin/kullanicilar)
alter table public.profiles
  add column if not exists subscription_start date,
  add column if not exists subscription_end date,
  add column if not exists auto_renew boolean not null default false,
  add column if not exists auto_renew_plan text,
  add column if not exists sub_warning_sent boolean not null default false;

-- Red gerekçesi (admin/onay-bekleyenler)
alter table public.profiles
  add column if not exists rejection_reason text;

-- tax_document_path zaten 001'de vardı; storage path'i ayırmak için
-- bazı kodlar tax_document_url'ü hem path hem public url olarak
-- kullanabiliyor, bu yüzden ikisini de garantiye alıyoruz.
alter table public.profiles
  add column if not exists tax_document_path text;

-- status alanı: kod boyunca gerçekte kullanılan değerler
-- pending | approved | rejected | blocked
-- (eski check constraint pending/active/suspended idi — kodla uyumsuzdu)
update public.profiles set status = 'approved' where status = 'active';
update public.profiles set status = 'blocked' where status = 'suspended';

alter table public.profiles drop constraint if exists profiles_status_check;
alter table public.profiles
  add constraint profiles_status_check check (
    status in ('pending', 'approved', 'rejected', 'blocked')
  );

alter table public.profiles alter column status set default 'pending';

create index if not exists idx_profiles_parent_user on public.profiles (parent_user_id);
create index if not exists idx_profiles_status on public.profiles (status);


-- ---------------------------------------------------------------------
-- 2) SUB_USERS — Personel hesapları (src/app/(app)/layout.tsx, api/personel)
-- ---------------------------------------------------------------------
-- Not: Bu tablo personel listesi/yönetimi için "gölge" kayıt tutar.
-- auth_user_id, personel gerçekten Supabase Auth'a eklenip profiles'a
-- yazıldığında doldurulur (api/personel/route.ts).

create table if not exists public.sub_users (
  id uuid primary key default gen_random_uuid(),
  parent_user_id uuid not null references public.profiles (id) on delete cascade,
  auth_user_id uuid references public.profiles (id) on delete set null,
  full_name text not null,
  email text not null,
  phone text,
  role text not null default 'staff' check (role in ('staff', 'manager')),
  permissions jsonb not null default '[]'::jsonb,
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_sub_users_parent on public.sub_users (parent_user_id);

alter table public.sub_users enable row level security;

drop policy if exists "sub_users_own" on public.sub_users;
create policy "sub_users_own" on public.sub_users for all using (auth.uid() = parent_user_id);


-- ---------------------------------------------------------------------
-- 3) CUSTOMER_RECORDS — yeni şemaya genişletme
-- ---------------------------------------------------------------------
-- musteri-sorgulama/page.tsx ve admin/musteri-listesi/page.tsx kodu
-- risk_level, tc_encrypted, rental_count, query_count, last_queried_at,
-- total_outstanding, last_rental_company, last_rental_date bekliyor.
--
-- NOT: Bu tablo bazı kurulumlarda 003_customers_vehicles_extended.sql
-- (risk_status, total_records, negative_records, total_debt, vb. eski
-- kolon adlarıyla) ile, bazılarında doğrudan yeni şemayla oluşturulmuş
-- olabilir. Aşağıdaki blok her iki durumda da güvenli çalışır: eski
-- kolonlar SADECE varsa okunur, yoksa o adım sessizce atlanır.

alter table public.customer_records
  add column if not exists tc_encrypted text,
  add column if not exists risk_level text,
  add column if not exists rental_count integer not null default 0,
  add column if not exists query_count integer not null default 0,
  add column if not exists last_queried_at timestamptz,
  add column if not exists total_outstanding numeric(12, 2) not null default 0,
  add column if not exists last_rental_company text,
  add column if not exists last_rental_date date;

-- Eski risk_status / total_records / negative_records / total_debt /
-- last_rental_at / last_company_name kolonları VARSA veriyi yeni
-- kolonlara taşı. Bu blok dinamik SQL ile çalışır, kolon yoksa hata
-- vermeden atlar (önceki sürümde burada sabit kolon adı kullanıldığı
-- için kolon yokken hata fırlatıp migration'ı durduruyordu).

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'customer_records' and column_name = 'risk_status'
  ) then
    execute 'update public.customer_records set risk_level = case when risk_status = ''risky'' then ''risky'' else ''clear'' end where risk_level is null';
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'customer_records' and column_name = 'total_records'
  ) then
    execute 'update public.customer_records set rental_count = coalesce(total_records, 0) where rental_count = 0';
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'customer_records' and column_name = 'total_debt'
  ) then
    execute 'update public.customer_records set total_outstanding = coalesce(total_debt, 0) where total_outstanding = 0';
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'customer_records' and column_name = 'last_company_name'
  ) then
    execute 'update public.customer_records set last_rental_company = last_company_name where last_rental_company is null';
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'customer_records' and column_name = 'last_rental_at'
  ) then
    execute 'update public.customer_records set last_rental_date = last_rental_at::date where last_rental_date is null';
  end if;
end $$;

update public.customer_records set risk_level = 'clear' where risk_level is null;
alter table public.customer_records alter column risk_level set default 'clear';
alter table public.customer_records alter column risk_level set not null;

alter table public.customer_records drop constraint if exists customer_records_risk_level_check;
alter table public.customer_records
  add constraint customer_records_risk_level_check check (
    risk_level in ('clear', 'moderate', 'risky', 'blacklisted')
  );

create index if not exists idx_customer_records_risk_level on public.customer_records (risk_level);


-- ---------------------------------------------------------------------
-- 4) CUSTOMER_INCIDENTS — Müşteri yorumları/olayları (yeni tablo)
-- ---------------------------------------------------------------------
-- musteri-sorgulama/page.tsx ve admin/musteri-listesi/page.tsx bu tabloyu
-- kullanıyor. Eski customer_record_items tablosuyla kavramsal olarak
-- örtüşüyor ama alan adları farklı; geriye dönük uyumluluğu bozmamak
-- için customer_record_items'a dokunmuyoruz, yeni tabloyu ayrıca kuruyoruz.

create table if not exists public.customer_incidents (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customer_records (id) on delete cascade,
  reported_by uuid not null references public.profiles (id) on delete set null,
  company_name text,
  incident_type text not null check (
    incident_type in ('payment_delay', 'damage', 'contract_breach', 'positive', 'other')
  ),
  amount numeric(12, 2),
  description text not null,
  incident_date date not null default current_date,
  document_url text,
  status text not null default 'open' check (status in ('open', 'resolved')),
  created_at timestamptz not null default now()
);

create index if not exists idx_customer_incidents_customer on public.customer_incidents (customer_id, incident_date);

alter table public.customer_incidents enable row level security;

-- Platform genelinde okunabilir (müşteri sorgulamada tüm firmalar görür)
drop policy if exists "customer_incidents_read_authenticated" on public.customer_incidents;
create policy "customer_incidents_read_authenticated"
  on public.customer_incidents for select
  to authenticated
  using (true);

drop policy if exists "customer_incidents_insert_own" on public.customer_incidents;
create policy "customer_incidents_insert_own"
  on public.customer_incidents for insert
  to authenticated
  with check (auth.uid() = reported_by);

drop policy if exists "customer_incidents_delete_own" on public.customer_incidents;
create policy "customer_incidents_delete_own"
  on public.customer_incidents for delete
  using (auth.uid() = reported_by);


-- ---------------------------------------------------------------------
-- 5) QUERY_LOGS — eksik kolonlar
-- ---------------------------------------------------------------------
-- Kod genelinde created_at yerine queried_at kullanılıyor, ayrıca
-- customer_name de cache'leniyor (admin/page.tsx, sorgu-loglari).

alter table public.query_logs
  add column if not exists queried_at timestamptz,
  add column if not exists customer_name text;

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'query_logs' and column_name = 'created_at'
  ) then
    execute 'update public.query_logs set queried_at = created_at where queried_at is null';
  end if;
end $$;

update public.query_logs set queried_at = now() where queried_at is null;
alter table public.query_logs alter column queried_at set default now();
alter table public.query_logs alter column queried_at set not null;

create index if not exists idx_query_logs_queried_at on public.query_logs (user_id, queried_at);


-- ---------------------------------------------------------------------
-- 6) RENTALS — eksik kolonlar (en kapsamlı fark)
-- ---------------------------------------------------------------------
-- 002 migration'daki basit şema (customer_name, total_amount) yerine
-- kiralama-takvimi/page.tsx ve mini-muhasebe/page.tsx çok daha geniş
-- bir alan seti bekliyor: müşteri TC hash'i, şifreli telefon, günlük
-- fiyat, depozito, ödeme durumu/yöntemi, sözleşme dosyası, teslim KM'si.

alter table public.rentals
  add column if not exists customer_tc_hash text,
  add column if not exists customer_phone_encrypted text,
  add column if not exists pickup_km integer,
  add column if not exists return_km integer,
  add column if not exists daily_price numeric(12, 2) not null default 0,
  add column if not exists total_price numeric(12, 2),
  add column if not exists deposit numeric(12, 2) not null default 0,
  add column if not exists payment_status text not null default 'pending',
  add column if not exists payment_method text,
  add column if not exists paid_amount numeric(12, 2) not null default 0,
  add column if not exists contract_url text,
  add column if not exists notes text;

-- Eski total_amount verisini yeni total_price'a taşı (varsa)
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'rentals' and column_name = 'total_amount'
  ) then
    execute 'update public.rentals set total_price = total_amount where total_price is null and total_amount is not null';
  end if;
end $$;

update public.rentals set total_price = 0 where total_price is null;
alter table public.rentals alter column total_price set not null;
alter table public.rentals alter column total_price set default 0;

alter table public.rentals drop constraint if exists rentals_payment_status_check;
alter table public.rentals
  add constraint rentals_payment_status_check check (
    payment_status in ('pending', 'partial', 'paid')
  );

create index if not exists idx_rentals_customer_tc_hash on public.rentals (customer_tc_hash);
create index if not exists idx_rentals_payment_status on public.rentals (payment_status);


-- ---------------------------------------------------------------------
-- 7) TRANSACTIONS — eksik kolonlar
-- ---------------------------------------------------------------------
-- mini-muhasebe/page.tsx, raporlar/page.tsx, kar-analizi/page.tsx hepsi
-- transaction_date (created_at değil) üzerinden filtreliyor, ayrıca
-- receipt_url ve status bekliyor. category de 002'de free-text iken
-- kod sabit anahtar listeleri (akaryakit, arac_bakim, ...) kullanıyor —
-- bu zaten text olduğu için constraint sorunu yok, sadece değer kümesi
-- kod tarafında (constants) güncellenecek.

alter table public.transactions
  add column if not exists transaction_date date,
  add column if not exists receipt_url text,
  add column if not exists status text not null default 'completed';

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'transactions' and column_name = 'created_at'
  ) then
    execute 'update public.transactions set transaction_date = created_at::date where transaction_date is null';
  end if;
end $$;

update public.transactions set transaction_date = current_date where transaction_date is null;
alter table public.transactions alter column transaction_date set default current_date;
alter table public.transactions alter column transaction_date set not null;

alter table public.transactions drop constraint if exists transactions_status_check;
alter table public.transactions
  add constraint transactions_status_check check (status in ('completed', 'cancelled'));

create index if not exists idx_transactions_transaction_date on public.transactions (user_id, transaction_date);


-- ---------------------------------------------------------------------
-- 8) VEHICLE_KM_LOGS — kolon adı uyumsuzluğu
-- ---------------------------------------------------------------------
-- 003 migration'da previous_km/new_km/difference_km/logged_at var.
-- Aktif kullanılan sayfalar (araclarim/page.tsx, kiralama-takvimi/page.tsx)
-- km_value/km_difference/logged_date bekliyor. src/actions/vehicles.ts
-- (ölü kod, hiçbir yerden çağrılmıyor) eski adları kullanıyor.
-- Yeni adları ekleyip mevcut veriyi taşıyoruz; eski kolonlara dokunmuyoruz
-- ki geriye dönük bir şey varsa kırılmasın.

alter table public.vehicle_km_logs
  add column if not exists km_value integer,
  add column if not exists km_difference integer,
  add column if not exists logged_date date;

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'vehicle_km_logs' and column_name = 'new_km'
  ) then
    execute 'update public.vehicle_km_logs set km_value = new_km, km_difference = difference_km, logged_date = logged_at::date where km_value is null';
  end if;
end $$;

update public.vehicle_km_logs set logged_date = current_date where logged_date is null;
alter table public.vehicle_km_logs alter column logged_date set default current_date;

create index if not exists idx_vehicle_km_logs_logged_date on public.vehicle_km_logs (vehicle_id, logged_date);


-- ---------------------------------------------------------------------
-- 9) SUBSCRIPTIONS — abonelik geçmişi (yeni tablo)
-- ---------------------------------------------------------------------
-- abonelik/page.tsx, admin/kullanicilar/page.tsx, admin/abonelikler/page.tsx,
-- admin/page.tsx (aylık gelir hesaplaması) bu tabloyu kullanıyor.

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  plan text not null check (plan in ('pro', 'premium')),
  months integer not null default 1,
  price numeric(12, 2) not null default 0,
  payment_method text not null default 'online' check (payment_method in ('online', 'manual')),
  payment_status text not null default 'pending' check (payment_status in ('pending', 'completed', 'failed', 'refunded')),
  starts_at date not null,
  ends_at date not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_subscriptions_user on public.subscriptions (user_id, created_at);
create index if not exists idx_subscriptions_payment_status on public.subscriptions (payment_status, created_at);

alter table public.subscriptions enable row level security;

drop policy if exists "subscriptions_own_read" on public.subscriptions;
create policy "subscriptions_own_read"
  on public.subscriptions for select
  using (auth.uid() = user_id);

drop policy if exists "subscriptions_own_insert" on public.subscriptions;
create policy "subscriptions_own_insert"
  on public.subscriptions for insert
  with check (auth.uid() = user_id);

-- Admin tüm abonelikleri okuyup yazabilmeli (admin sayfaları service-role
-- olmadan client'tan çağrılıyor); rolü profiles üzerinden kontrol ediyoruz.
drop policy if exists "subscriptions_admin_all" on public.subscriptions;
create policy "subscriptions_admin_all"
  on public.subscriptions for all
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid() and profiles.role = 'admin'
    )
  );


-- ---------------------------------------------------------------------
-- 10) SYSTEM_SETTINGS — sistem ayarları / sorgu limitleri (yeni tablo)
-- ---------------------------------------------------------------------
-- musteri-sorgulama/page.tsx, admin/abonelikler/page.tsx kullanıyor.
-- key alanı unique olmalı (upsert onConflict ile çalışıyor).

create table if not exists public.system_settings (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  value jsonb not null default '{}'::jsonb,
  description text,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles (id) on delete set null
);

alter table public.system_settings enable row level security;

-- Tüm authenticated kullanıcılar okuyabilir (limit hesaplaması için gerekli)
drop policy if exists "system_settings_read_authenticated" on public.system_settings;
create policy "system_settings_read_authenticated"
  on public.system_settings for select
  to authenticated
  using (true);

-- Sadece admin yazabilir
drop policy if exists "system_settings_admin_write" on public.system_settings;
create policy "system_settings_admin_write"
  on public.system_settings for all
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid() and profiles.role = 'admin'
    )
  );

-- Varsayılan sorgu limiti ayarını ekle (admin/abonelikler/page.tsx default'larıyla aynı)
insert into public.system_settings (key, value, description)
values (
  'query_limits',
  '{"pro": {"per_vehicle": 1, "min_limit": 5}, "premium": {"per_vehicle": 3, "min_limit": 15}}'::jsonb,
  'Plan bazlı günlük müşteri sorgu limiti. per_vehicle: araç başına sorgu hakkı, min_limit: araç sayısı az olsa bile garanti edilen minimum hak.'
)
on conflict (key) do nothing;


-- ---------------------------------------------------------------------
-- 11) LANDING_CONTENT — Ana sayfa / pazarlama içerikleri (yeni tablo)
-- ---------------------------------------------------------------------
-- app/page.tsx (landing), abonelik/page.tsx, admin/site-yonetimi/page.tsx
-- kullanıyor. (section, key) çifti unique olmalı (upsert onConflict).

create table if not exists public.landing_content (
  id uuid primary key default gen_random_uuid(),
  section text not null,
  key text not null,
  value jsonb not null default '{}'::jsonb,
  display_order integer not null default 0,
  updated_at timestamptz not null default now(),
  unique (section, key)
);

create index if not exists idx_landing_content_section on public.landing_content (section, display_order);

-- unique (section, key) constraint'i tablo daha önce farklı bir şekilde
-- oluşturulmuş olabileceği için ayrıca, koşullu olarak ekleniyor.
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.landing_content'::regclass
      and contype = 'u'
      and pg_get_constraintdef(oid) ilike '%section%key%'
  ) then
    alter table public.landing_content add constraint landing_content_section_key_unique unique (section, key);
  end if;
end $$;

alter table public.landing_content enable row level security;

-- Herkes (giriş yapmamış kullanıcılar dahil) okuyabilmeli — ana sayfa public
drop policy if exists "landing_content_read_public" on public.landing_content;
create policy "landing_content_read_public"
  on public.landing_content for select
  using (true);

drop policy if exists "landing_content_admin_write" on public.landing_content;
create policy "landing_content_admin_write"
  on public.landing_content for all
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid() and profiles.role = 'admin'
    )
  );

-- Varsayılan içerik — app/page.tsx tüm alanları opsiyonel okuduğu için
-- (hero.badge && ...) boş bırakılması sorun değil, ama en azından
-- pricing.pro / pricing.premium dolu olmazsa abonelik sayfası fallback'e
-- düşer. Burada minimal, mantıklı bir varsayılan set sağlıyoruz.
insert into public.landing_content (section, key, value, display_order) values
  ('hero', 'main', '{
    "badge": "Rent A Car Yönetim Platformu",
    "title_line1": "Araç Kiralama İşinizi",
    "title_line2_highlight": "Dijitalleştirin",
    "description": "Müşteri sorgulama, kiralama takibi ve muhasebe yönetimini tek platformda yapın.",
    "cta_primary": "Ücretsiz Başla",
    "cta_secondary": "Özellikleri Gör"
  }'::jsonb, 0),
  ('pricing', 'pro', '{
    "name": "Pro",
    "price_monthly": 999,
    "price_yearly": 9990,
    "features": ["5 araca kadar takip", "Müşteri sorgulama", "Bildirimler"]
  }'::jsonb, 1),
  ('pricing', 'premium', '{
    "name": "Premium",
    "price_monthly": 1999,
    "price_yearly": 19990,
    "features": ["Sınırsız araç takibi", "Kiralama takvimi", "Mini muhasebe", "Raporlar", "Sınırsız müşteri sorgulama"]
  }'::jsonb, 2)
on conflict (section, key) do nothing;


-- ---------------------------------------------------------------------
-- 12) AUDIT_LOGS — dosya erişim / güvenlik logları (yeni tablo)
-- ---------------------------------------------------------------------
-- src/lib/audit.ts (writeAuditLog), api/file/route.ts, admin/sorgu-loglari
-- kullanıyor. Service-role ile yazılıyor (RLS bypass), admin panelden
-- client tarafında okunuyor.

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles (id) on delete set null,
  company_name text,
  action text not null,
  resource_type text,
  resource_id text,
  ip_address text,
  user_agent text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_audit_logs_created_at on public.audit_logs (created_at);
create index if not exists idx_audit_logs_user_action on public.audit_logs (user_id, action, created_at);

alter table public.audit_logs enable row level security;

-- Sadece admin okuyabilir; yazma işlemleri service-role client'tan
-- yapıldığı için RLS'i zaten bypass eder, burada sadece select policy
-- tanımlamak yeterli (insert için ekstra bir client-side policy gerekmez).
drop policy if exists "audit_logs_admin_read" on public.audit_logs;
create policy "audit_logs_admin_read"
  on public.audit_logs for select
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid() and profiles.role = 'admin'
    )
  );


-- ---------------------------------------------------------------------
-- 13) RATE_LIMITS — dakika/saat/gün bazlı rate limit sayaçları (yeni tablo)
-- ---------------------------------------------------------------------
-- src/lib/audit.ts (checkRateLimit) kullanıyor. Service-role ile okunup
-- yazılıyor; client tarafından doğrudan erişilmiyor, RLS sıkı tutulur.

create table if not exists public.rate_limits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  action text not null,
  window_type text not null check (window_type in ('minute', 'hour', 'day')),
  window_start timestamptz not null,
  count integer not null default 1,
  updated_at timestamptz not null default now(),
  unique (user_id, action, window_type, window_start)
);

create index if not exists idx_rate_limits_lookup on public.rate_limits (user_id, action, window_type, window_start);

alter table public.rate_limits enable row level security;

-- Bu tabloya hiçbir client-side erişim olmamalı (sadece service-role).
-- RLS açık ve hiçbir policy tanımlamıyoruz, böylece varsayılan olarak
-- her şey reddedilir; service-role anahtarı RLS'i baştan bypass eder.


-- ---------------------------------------------------------------------
-- 14) STORAGE BUCKETS — receipts, contracts (eksikti, bu yüzden dosya
--     yüklemeleri "Bucket not found" hatasıyla sessizce başarısız oluyordu)
-- ---------------------------------------------------------------------

insert into storage.buckets (id, name, public)
values
  ('receipts', 'receipts', true),
  ('contracts', 'contracts', true)
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

drop policy if exists "contracts_upload_authenticated" on storage.objects;
create policy "contracts_upload_authenticated"
  on storage.objects for insert
  with check (bucket_id = 'contracts' and auth.role() = 'authenticated');

drop policy if exists "contracts_read_public" on storage.objects;
create policy "contracts_read_public"
  on storage.objects for select
  using (bucket_id = 'contracts');

drop policy if exists "contracts_update_own" on storage.objects;
create policy "contracts_update_own"
  on storage.objects for update
  using (bucket_id = 'contracts' and auth.role() = 'authenticated');

drop policy if exists "contracts_delete_own" on storage.objects;
create policy "contracts_delete_own"
  on storage.objects for delete
  using (bucket_id = 'contracts' and auth.role() = 'authenticated');


-- ---------------------------------------------------------------------
-- 15) NOTIFICATIONS — 006_notifications_upgrade.sql'in burada da
--     garantiye alınması (iki ayrı migration klasörü olduğu için
--     hangisinin gerçekten çalıştığı belirsizdi)
-- ---------------------------------------------------------------------

alter table public.notifications
  add column if not exists type text not null default 'info',
  add column if not exists is_read boolean not null default false,
  add column if not exists created_by uuid references public.profiles (id) on delete set null,
  add column if not exists source_type text,
  add column if not exists source_id uuid;

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'notifications' and column_name = 'read'
  ) then
    execute 'update public.notifications set is_read = true where is_read is false and read is true';
  end if;
end $$;

alter table public.notifications alter column user_id drop not null;

drop policy if exists "notifications_own" on public.notifications;
drop policy if exists "notifications_select" on public.notifications;
create policy "notifications_select" on public.notifications
  for select using (auth.uid() = user_id or user_id is null);

drop policy if exists "notifications_insert" on public.notifications;
create policy "notifications_insert" on public.notifications
  for insert with check (true);

drop policy if exists "notifications_update" on public.notifications;
create policy "notifications_update" on public.notifications
  for update using (auth.uid() = user_id or user_id is null);

drop policy if exists "notifications_delete" on public.notifications;
create policy "notifications_delete" on public.notifications
  for delete using (true);


