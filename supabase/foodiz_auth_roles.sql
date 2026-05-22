-- Foodiz Auth / Roles / Profile bootstrap
-- À exécuter dans Supabase SQL Editor avec current_user = postgres

-- 1. Tables minimales nécessaires
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('client', 'partner', 'courier', 'admin')),
  first_name text,
  last_name text,
  email text,
  phone text,
  status text default 'pending',
  points_balance integer default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.partner_applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  city text,
  status text default 'pending',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.courier_applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  city text,
  vehicle_type text,
  status text default 'pending',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 2. Trigger de création automatique du profil
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  user_role text;
  user_first_name text;
  user_last_name text;
  user_phone text;
begin
  user_role := coalesce(new.raw_user_meta_data->>'role', 'client');
  user_first_name := new.raw_user_meta_data->>'first_name';
  user_last_name := new.raw_user_meta_data->>'last_name';
  user_phone := new.raw_user_meta_data->>'phone';

  insert into public.profiles (
    id,
    role,
    first_name,
    last_name,
    email,
    phone,
    status,
    points_balance,
    created_at,
    updated_at
  )
  values (
    new.id,
    user_role,
    user_first_name,
    user_last_name,
    new.email,
    user_phone,
    case when user_role = 'client' then 'active' else 'pending' end,
    0,
    now(),
    now()
  )
  on conflict (id) do update set
    role = excluded.role,
    first_name = excluded.first_name,
    last_name = excluded.last_name,
    email = excluded.email,
    phone = excluded.phone,
    status = excluded.status,
    updated_at = now();

  if user_role = 'partner' then
    insert into public.partner_applications (
      user_id,
      city,
      status,
      created_at,
      updated_at
    ) values (
      new.id,
      null,
      'pending',
      now(),
      now()
    )
    on conflict do nothing;
  end if;

  if user_role = 'courier' then
    insert into public.courier_applications (
      user_id,
      city,
      vehicle_type,
      status,
      created_at,
      updated_at
    ) values (
      new.id,
      null,
      null,
      'pending',
      now(),
      now()
    )
    on conflict do nothing;
  end if;

  return new;
exception
  when others then
    raise log 'handle_new_user failed: %', sqlerrm;
    raise;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_user();

-- 3. RLS de base
alter table public.profiles enable row level security;
alter table public.partner_applications enable row level security;
alter table public.courier_applications enable row level security;

-- Profiles
create policy "Users can read own profile"
on public.profiles
for select
to authenticated
using (auth.uid() = id);

create policy "Users can update own profile"
on public.profiles
for update
to authenticated
using (auth.uid() = id);

-- Partner applications
create policy "Partner can read own application"
on public.partner_applications
for select
to authenticated
using (user_id = auth.uid());

create policy "Partner can update own application"
on public.partner_applications
for update
to authenticated
using (user_id = auth.uid());

-- Courier applications
create policy "Courier can read own application"
on public.courier_applications
for select
to authenticated
using (user_id = auth.uid());

create policy "Courier can update own application"
on public.courier_applications
for update
to authenticated
using (user_id = auth.uid());

-- 4. Backfill des comptes déjà créés
insert into public.profiles (
  id,
  role,
  first_name,
  last_name,
  email,
  phone,
  status,
  points_balance,
  created_at,
  updated_at
)
select
  u.id,
  coalesce((u.raw_user_meta_data->>'role')::text, 'client'),
  u.raw_user_meta_data->>'first_name',
  u.raw_user_meta_data->>'last_name',
  u.email,
  u.raw_user_meta_data->>'phone',
  case when coalesce((u.raw_user_meta_data->>'role')::text, 'client') = 'client' then 'active' else 'pending' end,
  0,
  now(),
  now()
from auth.users u
where not exists (
  select 1 from public.profiles p where p.id = u.id
);

insert into public.partner_applications (user_id, city, status, created_at, updated_at)
select p.id, null, 'pending', now(), now()
from public.profiles p
where p.role = 'partner'
and not exists (
  select 1 from public.partner_applications pa where pa.user_id = p.id
);

insert into public.courier_applications (user_id, city, vehicle_type, status, created_at, updated_at)
select p.id, null, null, 'pending', now(), now()
from public.profiles p
where p.role = 'courier'
and not exists (
  select 1 from public.courier_applications ca where ca.user_id = p.id
);
