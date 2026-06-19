-- Notifications tablosunu güncelle
alter table public.notifications
  add column if not exists type text not null default 'info',
  add column if not exists is_read boolean not null default false,
  add column if not exists created_by uuid references public.profiles(id) on delete set null,
  add column if not exists source_type text default null,   -- 'insurance' | 'inspection'
  add column if not exists source_id uuid default null,     -- vehicle_id
  add column if not exists user_id_nullable uuid;          -- geçici, aşağıda açıklanır

-- Eski read sütununu is_read ile senkronize et (varsa)
update public.notifications set is_read = read where read is not null;

-- Tüm kullanıcılara bildirim gönderebilmek için user_id nullable yap
-- (mevcut kısıtı kaldırıp yeniden ekle)
alter table public.notifications alter column user_id drop not null;

-- Admin bildirimleri okuyabilsin (user_id null ise herkese görünsün)
drop policy if exists "notifications_own" on public.notifications;
create policy "notifications_select" on public.notifications
  for select using (
    auth.uid() = user_id
    or user_id is null
  );
create policy "notifications_insert" on public.notifications
  for insert with check (true);
create policy "notifications_update" on public.notifications
  for update using (auth.uid() = user_id or user_id is null);
create policy "notifications_delete" on public.notifications
  for delete using (true);