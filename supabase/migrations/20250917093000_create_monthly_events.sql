-- Tabela de eventos mensais (agenda sem horários padrão)
create table if not exists public.monthly_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  event_date date not null,
  client_name text not null,
  amount numeric(10,2) not null default 0,
  start_time text not null, -- HH:mm
  end_time text not null,   -- HH:mm
  notes text,
  guests integer not null default 0,
  status text not null check (status in ('a_cobrar','pago','cancelado')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Trigger para updated_at
create or replace function public.set_monthly_events_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_monthly_events_updated_at on public.monthly_events;
create trigger trg_monthly_events_updated_at
before update on public.monthly_events
for each row execute function public.set_monthly_events_updated_at();

-- RLS
alter table public.monthly_events enable row level security;

drop policy if exists "Users can view own monthly_events" on public.monthly_events;
create policy "Users can view own monthly_events" on public.monthly_events
  for select using (auth.uid() = user_id);

drop policy if exists "Users can insert own monthly_events" on public.monthly_events;
create policy "Users can insert own monthly_events" on public.monthly_events
  for insert with check (auth.uid() = user_id);

drop policy if exists "Users can update own monthly_events" on public.monthly_events;
create policy "Users can update own monthly_events" on public.monthly_events
  for update using (auth.uid() = user_id);

drop policy if exists "Users can delete own monthly_events" on public.monthly_events;
create policy "Users can delete own monthly_events" on public.monthly_events
  for delete using (auth.uid() = user_id);

