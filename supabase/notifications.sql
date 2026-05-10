-- 29.school — Notification preferences schema
--
-- Apply via the Supabase SQL Editor. Safe to re-run.
-- Stores per-Canvas-user opt-in for email grade alerts. The Canvas access
-- token is stored encrypted-at-rest (AES-256-GCM, key derived from
-- SESSION_SECRET) so the cron job can poll Canvas while the user is offline.

create table if not exists public.notification_prefs (
  canvas_user_id      bigint primary key,
  email               text not null,
  token_ciphertext    text not null,
  alerts_enabled      boolean not null default true,
  last_grade_seen_at  timestamptz not null default now(),
  paused_at           timestamptz,
  pause_reason        text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index if not exists notification_prefs_enabled_idx
  on public.notification_prefs (alerts_enabled)
  where alerts_enabled = true and paused_at is null;

-- Same RLS posture as the rest of the schema: the app talks to Supabase via
-- the service-role key from a server-only context, so anon keys can't reach
-- this table even if leaked.
alter table public.notification_prefs enable row level security;

create or replace function public.touch_notification_prefs_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists notification_prefs_set_updated_at on public.notification_prefs;
create trigger notification_prefs_set_updated_at
  before update on public.notification_prefs
  for each row execute function public.touch_notification_prefs_updated_at();

notify pgrst, 'reload schema';
