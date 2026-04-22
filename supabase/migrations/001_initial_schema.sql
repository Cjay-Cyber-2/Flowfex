create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text null,
  avatar_url text null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.sessions (
  id uuid primary key default gen_random_uuid(),
  auth_id uuid null references public.profiles(id) on delete set null,
  anonymous_token text null unique,
  status text not null default 'active',
  graph_state jsonb not null default '{}'::jsonb,
  execution_pointer text null,
  connected_agents jsonb not null default '[]'::jsonb,
  constraints jsonb not null default '[]'::jsonb,
  mode text not null default 'live',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  last_active_at timestamptz not null default timezone('utc', now()),
  constraint sessions_status_check check (status in ('active', 'paused', 'completed', 'error'))
);

create table if not exists public.execution_events (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions(id) on delete cascade,
  event_type text not null,
  node_id text null,
  edge_id text null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.usage_tracking (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null unique references public.sessions(id) on delete cascade,
  auth_id uuid null references public.profiles(id) on delete set null,
  anonymous_token text null,
  executions_count integer not null default 0,
  nodes_processed integer not null default 0,
  session_duration_seconds integer not null default 0,
  period_start timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.api_keys (
  id uuid primary key default gen_random_uuid(),
  auth_id uuid not null references public.profiles(id) on delete cascade,
  key_hash text not null unique,
  key_prefix text not null,
  label text not null,
  last_used_at timestamptz null,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.flows (
  id uuid primary key default gen_random_uuid(),
  auth_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  description text null,
  graph_state jsonb not null,
  is_public boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row
execute function public.set_updated_at();

drop trigger if exists sessions_set_updated_at on public.sessions;
create trigger sessions_set_updated_at
before update on public.sessions
for each row
execute function public.set_updated_at();

drop trigger if exists flows_set_updated_at on public.flows;
create trigger flows_set_updated_at
before update on public.flows
for each row
execute function public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.sessions enable row level security;
alter table public.execution_events enable row level security;
alter table public.usage_tracking enable row level security;
alter table public.api_keys enable row level security;
alter table public.flows enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
on public.profiles
for select
to authenticated
using (id = auth.uid());

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
on public.profiles
for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
on public.profiles
for insert
to authenticated
with check (id = auth.uid());

drop policy if exists "sessions_select_own" on public.sessions;
create policy "sessions_select_own"
on public.sessions
for select
to authenticated
using (auth_id = auth.uid());

drop policy if exists "sessions_update_own" on public.sessions;
create policy "sessions_update_own"
on public.sessions
for update
to authenticated
using (auth_id = auth.uid())
with check (auth_id = auth.uid());

drop policy if exists "sessions_delete_own" on public.sessions;
create policy "sessions_delete_own"
on public.sessions
for delete
to authenticated
using (auth_id = auth.uid());

drop policy if exists "sessions_insert_own" on public.sessions;
create policy "sessions_insert_own"
on public.sessions
for insert
to authenticated
with check (auth_id = auth.uid());

drop policy if exists "execution_events_select_own" on public.execution_events;
create policy "execution_events_select_own"
on public.execution_events
for select
to authenticated
using (
  exists (
    select 1
    from public.sessions
    where sessions.id = execution_events.session_id
      and sessions.auth_id = auth.uid()
  )
);

drop policy if exists "usage_tracking_select_own" on public.usage_tracking;
create policy "usage_tracking_select_own"
on public.usage_tracking
for select
to authenticated
using (auth_id = auth.uid());

drop policy if exists "api_keys_select_own" on public.api_keys;
create policy "api_keys_select_own"
on public.api_keys
for select
to authenticated
using (auth_id = auth.uid());

drop policy if exists "api_keys_insert_own" on public.api_keys;
create policy "api_keys_insert_own"
on public.api_keys
for insert
to authenticated
with check (auth_id = auth.uid());

drop policy if exists "api_keys_update_own" on public.api_keys;
create policy "api_keys_update_own"
on public.api_keys
for update
to authenticated
using (auth_id = auth.uid())
with check (auth_id = auth.uid());

drop policy if exists "api_keys_delete_own" on public.api_keys;
create policy "api_keys_delete_own"
on public.api_keys
for delete
to authenticated
using (auth_id = auth.uid());

drop policy if exists "flows_select_own_or_public" on public.flows;
create policy "flows_select_own_or_public"
on public.flows
for select
to authenticated
using (auth_id = auth.uid() or is_public = true);

drop policy if exists "flows_insert_own" on public.flows;
create policy "flows_insert_own"
on public.flows
for insert
to authenticated
with check (auth_id = auth.uid());

drop policy if exists "flows_update_own" on public.flows;
create policy "flows_update_own"
on public.flows
for update
to authenticated
using (auth_id = auth.uid())
with check (auth_id = auth.uid());

drop policy if exists "flows_delete_own" on public.flows;
create policy "flows_delete_own"
on public.flows
for delete
to authenticated
using (auth_id = auth.uid());

create index if not exists sessions_auth_id_idx on public.sessions (auth_id);
create index if not exists sessions_anonymous_token_idx on public.sessions (anonymous_token);
create index if not exists sessions_last_active_at_idx on public.sessions (last_active_at);
create index if not exists execution_events_session_id_idx on public.execution_events (session_id);
create index if not exists execution_events_created_at_idx on public.execution_events (created_at);
create index if not exists usage_tracking_auth_id_idx on public.usage_tracking (auth_id);
create index if not exists usage_tracking_session_id_idx on public.usage_tracking (session_id);
create index if not exists api_keys_key_hash_idx on public.api_keys (key_hash);

create or replace function public.normalize_persisted_session_status(input_status text)
returns text
language sql
immutable
as $$
  select case
    when input_status in ('paused') then 'paused'
    when input_status in ('completed') then 'completed'
    when input_status in ('failed', 'error') then 'error'
    else 'active'
  end;
$$;

create or replace function public.create_anonymous_session(
  p_anonymous_token text,
  p_mode text default 'live'
)
returns table(session_id uuid, anonymous_token text)
language plpgsql
security definer
set search_path = public
as $$
declare
  new_session_id uuid;
begin
  insert into public.sessions (
    anonymous_token,
    status,
    graph_state,
    connected_agents,
    constraints,
    mode
  )
  values (
    p_anonymous_token,
    'active',
    '{}'::jsonb,
    '[]'::jsonb,
    '[]'::jsonb,
    coalesce(nullif(trim(p_mode), ''), 'live')
  )
  returning id into new_session_id;

  insert into public.usage_tracking (
    session_id,
    anonymous_token
  )
  values (
    new_session_id,
    p_anonymous_token
  );

  return query
  select new_session_id, p_anonymous_token;
end;
$$;

create or replace function public.save_session_graph_state(
  p_session_id uuid,
  p_graph_state jsonb,
  p_execution_pointer text default null,
  p_connected_agents jsonb default '[]'::jsonb,
  p_constraints jsonb default '[]'::jsonb,
  p_mode text default 'live',
  p_status text default 'active',
  p_snapshot jsonb default '{}'::jsonb
)
returns public.sessions
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized_mode text;
  normalized_status text;
  upserted_session public.sessions%rowtype;
begin
  normalized_mode := coalesce(nullif(trim(p_mode), ''), 'live');
  normalized_status := public.normalize_persisted_session_status(coalesce(p_status, 'active'));

  insert into public.sessions (
    id,
    status,
    graph_state,
    execution_pointer,
    connected_agents,
    constraints,
    mode,
    last_active_at
  )
  values (
    p_session_id,
    normalized_status,
    coalesce(p_graph_state, '{}'::jsonb),
    p_execution_pointer,
    coalesce(p_connected_agents, '[]'::jsonb),
    coalesce(p_constraints, '[]'::jsonb),
    normalized_mode,
    timezone('utc', now())
  )
  on conflict (id) do update
  set status = excluded.status,
      graph_state = excluded.graph_state,
      execution_pointer = excluded.execution_pointer,
      connected_agents = excluded.connected_agents,
      constraints = excluded.constraints,
      mode = excluded.mode,
      updated_at = timezone('utc', now()),
      last_active_at = timezone('utc', now())
  returning * into upserted_session;

  if p_snapshot <> '{}'::jsonb then
    insert into public.execution_events (
      session_id,
      event_type,
      node_id,
      edge_id,
      payload
    )
    values (
      p_session_id,
      'state_snapshot',
      null,
      null,
      p_snapshot
    );
  end if;

  return upserted_session;
end;
$$;

create or replace function public.increment_usage_tracking(
  p_session_id uuid,
  p_auth_id uuid default null,
  p_anonymous_token text default null,
  p_executions_increment integer default 1,
  p_nodes_processed_increment integer default 0,
  p_duration_seconds_increment integer default 0
)
returns public.usage_tracking
language plpgsql
security definer
set search_path = public
as $$
declare
  updated_row public.usage_tracking%rowtype;
begin
  insert into public.usage_tracking (
    session_id,
    auth_id,
    anonymous_token,
    executions_count,
    nodes_processed,
    session_duration_seconds
  )
  values (
    p_session_id,
    p_auth_id,
    p_anonymous_token,
    greatest(p_executions_increment, 0),
    greatest(p_nodes_processed_increment, 0),
    greatest(p_duration_seconds_increment, 0)
  )
  on conflict (session_id) do update
  set auth_id = coalesce(excluded.auth_id, usage_tracking.auth_id),
      anonymous_token = coalesce(excluded.anonymous_token, usage_tracking.anonymous_token),
      executions_count = usage_tracking.executions_count + greatest(p_executions_increment, 0),
      nodes_processed = usage_tracking.nodes_processed + greatest(p_nodes_processed_increment, 0),
      session_duration_seconds = usage_tracking.session_duration_seconds + greatest(p_duration_seconds_increment, 0)
  returning * into updated_row;

  return updated_row;
end;
$$;

create or replace function public.upgrade_anonymous_session(
  p_anonymous_token text,
  p_auth_id uuid,
  p_display_name text default null,
  p_avatar_url text default null
)
returns public.sessions
language plpgsql
security definer
set search_path = public
as $$
declare
  upgraded_session public.sessions%rowtype;
begin
  insert into public.profiles (
    id,
    display_name,
    avatar_url
  )
  values (
    p_auth_id,
    p_display_name,
    p_avatar_url
  )
  on conflict (id) do update
  set display_name = coalesce(excluded.display_name, profiles.display_name),
      avatar_url = coalesce(excluded.avatar_url, profiles.avatar_url),
      updated_at = timezone('utc', now());

  update public.sessions
  set auth_id = p_auth_id,
      anonymous_token = null,
      updated_at = timezone('utc', now()),
      last_active_at = timezone('utc', now())
  where anonymous_token = p_anonymous_token
  returning * into upgraded_session;

  update public.usage_tracking
  set auth_id = p_auth_id,
      anonymous_token = null
  where anonymous_token = p_anonymous_token;

  return upgraded_session;
end;
$$;

create or replace function public.touch_session_activity(
  p_session_id uuid,
  p_status text default null,
  p_execution_pointer text default null
)
returns public.sessions
language plpgsql
security definer
set search_path = public
as $$
declare
  touched_session public.sessions%rowtype;
begin
  update public.sessions
  set status = coalesce(public.normalize_persisted_session_status(p_status), status),
      execution_pointer = coalesce(p_execution_pointer, execution_pointer),
      updated_at = timezone('utc', now()),
      last_active_at = timezone('utc', now())
  where id = p_session_id
  returning * into touched_session;

  return touched_session;
end;
$$;
