-- =====================================================================
-- 006_support_tickets.sql
-- ---------------------------------------------------------------------
-- Destek talebi sistemi: kullanıcılar bilgi/talep/şikâyet/yorum
-- gönderebilir, admin cevaplayabilir, her iki taraf da mesajlaşmaya
-- devam edebilir (ticket + thread mantığı).
-- =====================================================================


-- ---------------------------------------------------------------------
-- 1) SUPPORT_TICKETS — destek talebi başlıkları
-- ---------------------------------------------------------------------

create table if not exists public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  category text not null check (category in ('bilgi', 'talep', 'sikayet', 'yorum')),
  subject text not null,
  status text not null default 'open' check (status in ('open', 'answered', 'closed')),
  last_message_at timestamptz not null default now(),
  has_unread_admin_reply boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists idx_support_tickets_user on public.support_tickets (user_id, last_message_at desc);
create index if not exists idx_support_tickets_status on public.support_tickets (status, last_message_at desc);

alter table public.support_tickets enable row level security;

drop policy if exists "support_tickets_own_read" on public.support_tickets;
create policy "support_tickets_own_read"
  on public.support_tickets for select
  using (auth.uid() = user_id);

drop policy if exists "support_tickets_own_insert" on public.support_tickets;
create policy "support_tickets_own_insert"
  on public.support_tickets for insert
  with check (auth.uid() = user_id);

drop policy if exists "support_tickets_own_update" on public.support_tickets;
create policy "support_tickets_own_update"
  on public.support_tickets for update
  using (auth.uid() = user_id);

drop policy if exists "support_tickets_admin_all" on public.support_tickets;
create policy "support_tickets_admin_all"
  on public.support_tickets for all
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid() and profiles.role = 'admin'
    )
  );


-- ---------------------------------------------------------------------
-- 2) SUPPORT_MESSAGES — ticket içindeki mesaj geçmişi
-- ---------------------------------------------------------------------

create table if not exists public.support_messages (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.support_tickets (id) on delete cascade,
  sender_id uuid not null references public.profiles (id) on delete set null,
  sender_role text not null check (sender_role in ('user', 'admin')),
  message text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_support_messages_ticket on public.support_messages (ticket_id, created_at);

alter table public.support_messages enable row level security;

-- Kullanıcı sadece kendi ticket'ının mesajlarını okuyabilir/yazabilir
drop policy if exists "support_messages_own_read" on public.support_messages;
create policy "support_messages_own_read"
  on public.support_messages for select
  using (
    exists (
      select 1 from public.support_tickets
      where support_tickets.id = support_messages.ticket_id
        and support_tickets.user_id = auth.uid()
    )
  );

drop policy if exists "support_messages_own_insert" on public.support_messages;
create policy "support_messages_own_insert"
  on public.support_messages for insert
  with check (
    sender_id = auth.uid()
    and exists (
      select 1 from public.support_tickets
      where support_tickets.id = support_messages.ticket_id
        and support_tickets.user_id = auth.uid()
    )
  );

drop policy if exists "support_messages_admin_all" on public.support_messages;
create policy "support_messages_admin_all"
  on public.support_messages for all
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid() and profiles.role = 'admin'
    )
  );


-- ---------------------------------------------------------------------
-- 3) NOTIFICATIONS — kullanıcının kendi bildirimini silebilmesi
-- ---------------------------------------------------------------------
-- 005 migration'ında "notifications_delete" policy'si herkese açıktı
-- (using (true)) çünkü o noktada henüz silme özelliği UI'da yoktu.
-- Şimdi kullanıcı sadece kendi bildirimini silebilsin, sistem geneli
-- (user_id is null) bildirimleri ise silemesin (herkese görünmesi gerekiyor).

drop policy if exists "notifications_delete" on public.notifications;
create policy "notifications_delete" on public.notifications
  for delete using (auth.uid() = user_id);

-- source_type/source_id zaten 005'te eklenmişti; destek cevabı bildirimleri
-- bu alanları kullanacak (source_type = 'support_ticket', source_id = ticket id).
