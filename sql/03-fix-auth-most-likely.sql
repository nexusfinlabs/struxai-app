-- Fix más probable para "Database error querying schema".
-- Solo ejecuta esto SI el diagnóstico (02-diagnose-auth.sql) muestra:
--   - falta la tabla user_settings o profiles, O
--   - el trigger on_auth_user_created está dropped, O
--   - handle_new_user no es security definer.
--
-- Es idempotente: usa create-or-replace y if-not-exists. Si todo está bien
-- ya, no rompe nada — solo confirma el estado correcto.

-- Asegura que la tabla profiles existe con la estructura correcta.
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  first_name text,
  last_name text,
  phone text,
  address_line1 text,
  address_line2 text,
  city text,
  postal_code text,
  country text default 'ES',
  company_name text,
  vat_number text,
  email text not null,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Asegura que la tabla user_settings existe.
create table if not exists public.user_settings (
  user_id uuid references auth.users on delete cascade primary key,
  enabled_engines jsonb default '["sap2000"]'::jsonb,
  enabled_normatives jsonb default '["cte","ehe-08"]'::jsonb,
  enabled_plugins jsonb default '[]'::jsonb,
  default_jurisdiction text default 'ES',
  preferred_pdf_template text default 'standard',
  notification_email boolean default true,
  notification_inapp boolean default true,
  updated_at timestamp with time zone default now()
);

-- (Re)crea la función con security definer y search_path = public.
-- Esto es CRÍTICO: sin search_path explícito Supabase Auth puede romper
-- al buscar profiles/user_settings en otro schema.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, first_name, last_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'first_name', split_part(new.email,'@',1)),
    coalesce(new.raw_user_meta_data->>'last_name', '')
  )
  on conflict (id) do nothing;

  insert into public.user_settings (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

-- (Re)crea el trigger. drop+create para forzar el bind a la nueva función.
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Habilita RLS y policies básicas si faltan.
alter table public.profiles enable row level security;
alter table public.user_settings enable row level security;

drop policy if exists "Users view own profile" on public.profiles;
create policy "Users view own profile" on public.profiles
  for select using (auth.uid() = id);

drop policy if exists "Users update own profile" on public.profiles;
create policy "Users update own profile" on public.profiles
  for update using (auth.uid() = id);

drop policy if exists "Users view own settings" on public.user_settings;
create policy "Users view own settings" on public.user_settings
  for select using (auth.uid() = user_id);

drop policy if exists "Users update own settings" on public.user_settings;
create policy "Users update own settings" on public.user_settings
  for update using (auth.uid() = user_id);

-- (Re)backfill: si hay users en auth.users sin profile/settings, créalos.
-- Útil si ya tenías test1/test2/test3 antes de que el trigger funcionara.
insert into public.profiles (id, email, first_name, last_name)
select u.id, u.email,
       coalesce(u.raw_user_meta_data->>'first_name', split_part(u.email,'@',1)),
       coalesce(u.raw_user_meta_data->>'last_name', '')
from auth.users u
left join public.profiles p on p.id = u.id
where p.id is null
on conflict (id) do nothing;

insert into public.user_settings (user_id)
select u.id
from auth.users u
left join public.user_settings s on s.user_id = u.id
where s.user_id is null
on conflict (user_id) do nothing;

-- Verificación final
select 'profiles' as tabla, count(*) as filas from public.profiles
union all
select 'user_settings', count(*) from public.user_settings
union all
select 'auth.users', count(*) from auth.users;
