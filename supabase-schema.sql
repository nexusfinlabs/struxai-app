-- ============================================================
-- STRUXAI App - Schema completo
-- Ejecutar en Supabase Dashboard > SQL Editor de wlxnehlpkpfmlgaythng
-- ============================================================

create extension if not exists "uuid-ossp";

-- ---------- ENUMS ----------
do $$ begin
  if not exists (select 1 from pg_type where typname = 'plan_tier') then
    create type plan_tier as enum ('basic','pro','premium','freelance','studio','enterprise','academic');
  end if;
  if not exists (select 1 from pg_type where typname = 'subscription_status') then
    create type subscription_status as enum ('active','canceled','past_due','incomplete','trialing');
  end if;
  if not exists (select 1 from pg_type where typname = 'file_type') then
    create type file_type as enum ('cad','rvt');
  end if;
  if not exists (select 1 from pg_type where typname = 'file_status') then
    create type file_status as enum ('uploaded','processing','analyzed','failed');
  end if;
  if not exists (select 1 from pg_type where typname = 'output_kind') then
    create type output_kind as enum ('memoria_pdf','planos_dxf','modelo_ifc','fem_input');
  end if;
end $$;

-- ---------- PROFILES ----------
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

-- ---------- PLANS (7 planes) ----------
create table if not exists public.plans (
  id text primary key,
  tier plan_tier not null,
  display_name text not null,
  category text not null,
  monthly_price_eur integer not null,
  stripe_price_id text,
  max_files_per_month integer not null,
  max_compute_hours integer not null,
  max_storage_gb integer not null,
  max_engines integer not null,
  max_users integer default 1,
  features jsonb not null default '[]'::jsonb,
  active boolean default true,
  display_order integer default 100,
  created_at timestamp with time zone default now()
);

insert into public.plans (id, tier, display_name, category, monthly_price_eur, stripe_price_id, max_files_per_month, max_compute_hours, max_storage_gb, max_engines, max_users, features, display_order)
values
  ('academic','academic','Academic','special',49,'price_TBD_academic',10,3,5,1,1,
    '["1 motor calculo","10 archivos al mes","3h de calculo","5 GB storage","Memoria PDF con marca de agua academica","Solo entornos universitarios"]'::jsonb,1),
  ('freelance','freelance','Freelance','client',199,'price_TBD_freelance',5,3,2,1,1,
    '["1 motor (CYPECAD)","5 archivos al mes","3h calculo","2 GB storage","Memoria PDF basica","Normativa ES"]'::jsonb,2),
  ('basic','basic','Basic','volume',499,'price_TBD_basic',10,5,5,1,1,
    '["1 motor de calculo","10 archivos al mes","5h calculo","5 GB storage","Memoria PDF","Soporte email 48h"]'::jsonb,3),
  ('studio','studio','Studio','client',699,'studio_studio',25,15,25,2,3,
    '["2 motores simultaneos","25 archivos al mes","15h calculo","25 GB storage","Memoria PDF + DXF","Multi-usuario hasta 3","Soporte priorizado"]'::jsonb,4),
  ('pro','pro','Pro','volume',999,'price_TBD_pro',50,25,50,3,3,
    '["3 motores simultaneos","50 archivos al mes","25h calculo","50 GB storage","Memoria PDF + DXF","Comparativa de revisiones","Plugins Revit/CAD","Soporte priorizado"]'::jsonb,5),
  ('premium','premium','Premium','volume',1999,'price_TBD_premium',999999,200,500,99,10,
    '["Todos los motores","Archivos ilimitados","200h calculo","500 GB storage","Memoria + DXF + IFC + Revit sync","API access","Multi-usuario hasta 10","Onboarding 1:1","SLA 99.9%"]'::jsonb,6),
  ('enterprise','enterprise','Enterprise','client',2999,'price_TBD_enterprise',999999,500,2000,99,50,
    '["Todos los motores","Archivos ilimitados","500h calculo","2 TB storage","White-label memoria","API access ilimitada","Multi-usuario hasta 50","Onboarding dedicado","SLA 99.99%","Soporte 24/7"]'::jsonb,7)
on conflict (id) do nothing;

-- ---------- SUBSCRIPTIONS ----------
create table if not exists public.subscriptions (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users not null,
  plan_id text references public.plans not null,
  status subscription_status not null default 'incomplete',
  stripe_customer_id text unique,
  stripe_subscription_id text unique,
  current_period_start timestamp with time zone,
  current_period_end timestamp with time zone,
  cancel_at_period_end boolean default false,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);
create index if not exists idx_subscriptions_user on public.subscriptions(user_id);
create index if not exists idx_subscriptions_stripe on public.subscriptions(stripe_subscription_id);

-- ---------- PROJECTS ----------
create table if not exists public.projects (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users not null,
  name text not null,
  description text,
  jurisdiction text default 'ES',
  status text default 'draft',
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);
create index if not exists idx_projects_user on public.projects(user_id);

-- ---------- FILES ----------
create table if not exists public.files (
  id uuid default uuid_generate_v4() primary key,
  project_id uuid references public.projects on delete cascade,
  user_id uuid references auth.users not null,
  type file_type not null,
  filename text not null,
  storage_path text not null,
  size_bytes bigint not null,
  mime_type text,
  status file_status default 'uploaded',
  error_message text,
  uploaded_at timestamp with time zone default now()
);
create index if not exists idx_files_user on public.files(user_id);
create index if not exists idx_files_project on public.files(project_id);

-- ---------- USER SETTINGS ----------
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

-- ---------- OUTPUTS ----------
create table if not exists public.outputs (
  id uuid default uuid_generate_v4() primary key,
  project_id uuid references public.projects on delete cascade,
  user_id uuid references auth.users not null,
  source_file_id uuid references public.files on delete set null,
  kind output_kind not null,
  filename text not null,
  storage_path text not null,
  size_bytes bigint,
  metadata jsonb,
  created_at timestamp with time zone default now()
);
create index if not exists idx_outputs_user on public.outputs(user_id);

-- ---------- USAGE ----------
create table if not exists public.usage_monthly (
  user_id uuid references auth.users not null,
  year_month text not null,
  files_uploaded integer default 0,
  compute_hours numeric(10,2) default 0,
  storage_bytes bigint default 0,
  primary key (user_id, year_month)
);

-- ---------- TRIGGERS ----------
create or replace function public.handle_new_user()
returns trigger security definer set search_path = public language plpgsql as $$
begin
  insert into public.profiles (id, email, first_name, last_name)
  values (
    new.id, new.email,
    coalesce(new.raw_user_meta_data->>'first_name', split_part(new.email,'@',1)),
    coalesce(new.raw_user_meta_data->>'last_name', '')
  );
  insert into public.user_settings (user_id) values (new.id);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users for each row execute function public.handle_new_user();

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at before update on public.profiles for each row execute function public.set_updated_at();

drop trigger if exists projects_set_updated_at on public.projects;
create trigger projects_set_updated_at before update on public.projects for each row execute function public.set_updated_at();

drop trigger if exists subscriptions_set_updated_at on public.subscriptions;
create trigger subscriptions_set_updated_at before update on public.subscriptions for each row execute function public.set_updated_at();

drop trigger if exists user_settings_set_updated_at on public.user_settings;
create trigger user_settings_set_updated_at before update on public.user_settings for each row execute function public.set_updated_at();

-- ---------- RLS ----------
alter table public.profiles enable row level security;
alter table public.plans enable row level security;
alter table public.subscriptions enable row level security;
alter table public.projects enable row level security;
alter table public.files enable row level security;
alter table public.user_settings enable row level security;
alter table public.outputs enable row level security;
alter table public.usage_monthly enable row level security;

drop policy if exists "Plans are viewable by everyone" on public.plans;
create policy "Plans are viewable by everyone" on public.plans for select using (active = true);

drop policy if exists "Users view own profile" on public.profiles;
create policy "Users view own profile" on public.profiles for select using (auth.uid() = id);

drop policy if exists "Users update own profile" on public.profiles;
create policy "Users update own profile" on public.profiles for update using (auth.uid() = id);

drop policy if exists "Users view own subs" on public.subscriptions;
create policy "Users view own subs" on public.subscriptions for select using (auth.uid() = user_id);

drop policy if exists "Users CRUD own projects" on public.projects;
create policy "Users CRUD own projects" on public.projects for all using (auth.uid() = user_id);

drop policy if exists "Users CRUD own files" on public.files;
create policy "Users CRUD own files" on public.files for all using (auth.uid() = user_id);

drop policy if exists "Users view own settings" on public.user_settings;
create policy "Users view own settings" on public.user_settings for select using (auth.uid() = user_id);

drop policy if exists "Users update own settings" on public.user_settings;
create policy "Users update own settings" on public.user_settings for update using (auth.uid() = user_id);

drop policy if exists "Users insert own settings" on public.user_settings;
create policy "Users insert own settings" on public.user_settings for insert with check (auth.uid() = user_id);

drop policy if exists "Users view own outputs" on public.outputs;
create policy "Users view own outputs" on public.outputs for select using (auth.uid() = user_id);

drop policy if exists "Users view own usage" on public.usage_monthly;
create policy "Users view own usage" on public.usage_monthly for select using (auth.uid() = user_id);
