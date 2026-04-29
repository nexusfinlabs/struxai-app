-- ============================================================
-- STRUXAI App - Migración 0001: Projects Overhaul
-- Aplicar en Supabase Dashboard > SQL Editor de wlxnehlpkpfmlgaythng
-- ============================================================
-- Cambios:
--   * projects.project_type, material_main, size_bytes, cover_color
--   * Ampliar enums file_type y output_kind para BIM/IFC y Memorias
--   * files: external_storage_provider, external_url, category, checksum
--   * user_settings: theme, density, language, professional_type, etc.
--   * Nueva tabla signed_documents (memorias firmadas con sello)
--   * Nuevos buckets y políticas Storage (cad/bim/memorias-in/out/firmadas)
--
-- Notas para aplicar:
--   - Pega cada bloque por separado en SQL Editor si te da error con
--     ALTER TYPE ADD VALUE en transacción.
--   - Las políticas storage están hardcoded por bucket (no usar loop
--     dinámico con format('%I') porque los guiones de los nombres de
--     bucket rompen el quoting).
-- ============================================================

-- ============================================================
-- BLOQUE A: enums (file_type y output_kind ya existen, ampliamos)
-- ============================================================
do $$ begin
  if not exists (select 1 from pg_enum e join pg_type t on e.enumtypid = t.oid
                 where t.typname='file_type' and e.enumlabel='bim') then
    alter type file_type add value 'bim';
  end if;
  if not exists (select 1 from pg_enum e join pg_type t on e.enumtypid = t.oid
                 where t.typname='file_type' and e.enumlabel='memoria_in') then
    alter type file_type add value 'memoria_in';
  end if;
  if not exists (select 1 from pg_enum e join pg_type t on e.enumtypid = t.oid
                 where t.typname='file_type' and e.enumlabel='memoria_out') then
    alter type file_type add value 'memoria_out';
  end if;
  if not exists (select 1 from pg_enum e join pg_type t on e.enumtypid = t.oid
                 where t.typname='file_type' and e.enumlabel='memoria_firmada') then
    alter type file_type add value 'memoria_firmada';
  end if;
  if not exists (select 1 from pg_enum e join pg_type t on e.enumtypid = t.oid
                 where t.typname='file_type' and e.enumlabel='otro') then
    alter type file_type add value 'otro';
  end if;
  if not exists (select 1 from pg_enum e join pg_type t on e.enumtypid = t.oid
                 where t.typname='output_kind' and e.enumlabel='ifc_out') then
    alter type output_kind add value 'ifc_out';
  end if;
  if not exists (select 1 from pg_enum e join pg_type t on e.enumtypid = t.oid
                 where t.typname='output_kind' and e.enumlabel='memoria_entrada') then
    alter type output_kind add value 'memoria_entrada';
  end if;
  if not exists (select 1 from pg_enum e join pg_type t on e.enumtypid = t.oid
                 where t.typname='output_kind' and e.enumlabel='memoria_salida') then
    alter type output_kind add value 'memoria_salida';
  end if;
  if not exists (select 1 from pg_enum e join pg_type t on e.enumtypid = t.oid
                 where t.typname='output_kind' and e.enumlabel='memoria_firmada') then
    alter type output_kind add value 'memoria_firmada';
  end if;
end $$;

-- ============================================================
-- BLOQUE B: nuevos enums + columnas en projects/files/user_settings
-- ============================================================
do $$ begin
  if not exists (select 1 from pg_type where typname = 'project_type') then
    create type project_type as enum ('residencial','comercial','industrial','infraestructura','rehabilitacion','otro');
  end if;
  if not exists (select 1 from pg_type where typname = 'material_main') then
    create type material_main as enum ('hormigon','metalica','mixta','madera','mamposteria','otro');
  end if;
  if not exists (select 1 from pg_type where typname = 'storage_provider') then
    create type storage_provider as enum ('supabase','r2','struxai_cloud');
  end if;
  if not exists (select 1 from pg_type where typname = 'professional_type') then
    create type professional_type as enum ('constructora','arquitectura','calculista','otro');
  end if;
  if not exists (select 1 from pg_type where typname = 'theme_pref') then
    create type theme_pref as enum ('light','dark','system');
  end if;
end $$;

alter table public.projects
  add column if not exists project_type project_type default 'otro',
  add column if not exists material_main material_main default 'hormigon',
  add column if not exists size_bytes bigint default 0,
  add column if not exists cover_color text default '#0ea5e9';

alter table public.files
  add column if not exists external_storage_provider storage_provider default 'supabase',
  add column if not exists external_url text,
  add column if not exists category text default 'cad',
  add column if not exists checksum_sha256 text,
  add column if not exists original_extension text;

create index if not exists idx_files_category on public.files(category);
create index if not exists idx_files_provider on public.files(external_storage_provider);

alter table public.user_settings
  add column if not exists theme theme_pref default 'system',
  add column if not exists density text default 'comfortable',
  add column if not exists language text default 'es',
  add column if not exists professional_type professional_type default 'calculista',
  add column if not exists enabled_materials jsonb default '["hormigon","metalica"]'::jsonb,
  add column if not exists enabled_template text default 'standard',
  add column if not exists struxai_cloud_optin boolean default true,
  add column if not exists struxai_cloud_quota_gb integer default 100;

update public.user_settings
  set enabled_normatives = '["cte-db-se","cte-db-se-ae","cte-db-si","ehe-08","eae","ncse-02"]'::jsonb
  where enabled_normatives is null
     or enabled_normatives = '[]'::jsonb
     or enabled_normatives::text = '["cte","ehe-08"]';

-- ============================================================
-- BLOQUE C: signed_documents + buckets + políticas storage + trigger
-- ============================================================
create table if not exists public.signed_documents (
  id uuid default uuid_generate_v4() primary key,
  project_id uuid references public.projects on delete cascade,
  user_id uuid references auth.users not null,
  original_file_id uuid references public.files on delete set null,
  filename text not null,
  storage_path text not null,
  external_storage_provider storage_provider default 'supabase',
  signer_name text,
  signer_role text,
  signature_date timestamp with time zone default now(),
  certificate_serial text,
  size_bytes bigint,
  metadata jsonb,
  created_at timestamp with time zone default now()
);
create index if not exists idx_signed_docs_user on public.signed_documents(user_id);
create index if not exists idx_signed_docs_project on public.signed_documents(project_id);

alter table public.signed_documents enable row level security;

drop policy if exists "Users CRUD own signed_docs" on public.signed_documents;
create policy "Users CRUD own signed_docs" on public.signed_documents
  for all using (auth.uid() = user_id);

-- Buckets (privados, signed URLs).
insert into storage.buckets (id, name, public, file_size_limit)
values
  ('cad-uploads','cad-uploads', false, 52428800),
  ('bim-uploads','bim-uploads', false, 52428800),
  ('memorias-in','memorias-in', false, 52428800),
  ('memorias-out','memorias-out', false, 52428800),
  ('memorias-firmadas','memorias-firmadas', false, 52428800)
on conflict (id) do nothing;

-- Políticas storage por bucket (hardcoded; el loop con format('%I') rompía
-- el quoting de nombres con guiones).
-- cad-uploads
drop policy if exists "user select cad-uploads" on storage.objects;
drop policy if exists "user insert cad-uploads" on storage.objects;
drop policy if exists "user update cad-uploads" on storage.objects;
drop policy if exists "user delete cad-uploads" on storage.objects;
create policy "user select cad-uploads" on storage.objects
  for select using (bucket_id = 'cad-uploads' and (auth.uid()::text = (storage.foldername(name))[1]));
create policy "user insert cad-uploads" on storage.objects
  for insert with check (bucket_id = 'cad-uploads' and (auth.uid()::text = (storage.foldername(name))[1]));
create policy "user update cad-uploads" on storage.objects
  for update using (bucket_id = 'cad-uploads' and (auth.uid()::text = (storage.foldername(name))[1]));
create policy "user delete cad-uploads" on storage.objects
  for delete using (bucket_id = 'cad-uploads' and (auth.uid()::text = (storage.foldername(name))[1]));

-- bim-uploads
drop policy if exists "user select bim-uploads" on storage.objects;
drop policy if exists "user insert bim-uploads" on storage.objects;
drop policy if exists "user update bim-uploads" on storage.objects;
drop policy if exists "user delete bim-uploads" on storage.objects;
create policy "user select bim-uploads" on storage.objects
  for select using (bucket_id = 'bim-uploads' and (auth.uid()::text = (storage.foldername(name))[1]));
create policy "user insert bim-uploads" on storage.objects
  for insert with check (bucket_id = 'bim-uploads' and (auth.uid()::text = (storage.foldername(name))[1]));
create policy "user update bim-uploads" on storage.objects
  for update using (bucket_id = 'bim-uploads' and (auth.uid()::text = (storage.foldername(name))[1]));
create policy "user delete bim-uploads" on storage.objects
  for delete using (bucket_id = 'bim-uploads' and (auth.uid()::text = (storage.foldername(name))[1]));

-- memorias-in
drop policy if exists "user select memorias-in" on storage.objects;
drop policy if exists "user insert memorias-in" on storage.objects;
drop policy if exists "user update memorias-in" on storage.objects;
drop policy if exists "user delete memorias-in" on storage.objects;
create policy "user select memorias-in" on storage.objects
  for select using (bucket_id = 'memorias-in' and (auth.uid()::text = (storage.foldername(name))[1]));
create policy "user insert memorias-in" on storage.objects
  for insert with check (bucket_id = 'memorias-in' and (auth.uid()::text = (storage.foldername(name))[1]));
create policy "user update memorias-in" on storage.objects
  for update using (bucket_id = 'memorias-in' and (auth.uid()::text = (storage.foldername(name))[1]));
create policy "user delete memorias-in" on storage.objects
  for delete using (bucket_id = 'memorias-in' and (auth.uid()::text = (storage.foldername(name))[1]));

-- memorias-out
drop policy if exists "user select memorias-out" on storage.objects;
drop policy if exists "user insert memorias-out" on storage.objects;
drop policy if exists "user update memorias-out" on storage.objects;
drop policy if exists "user delete memorias-out" on storage.objects;
create policy "user select memorias-out" on storage.objects
  for select using (bucket_id = 'memorias-out' and (auth.uid()::text = (storage.foldername(name))[1]));
create policy "user insert memorias-out" on storage.objects
  for insert with check (bucket_id = 'memorias-out' and (auth.uid()::text = (storage.foldername(name))[1]));
create policy "user update memorias-out" on storage.objects
  for update using (bucket_id = 'memorias-out' and (auth.uid()::text = (storage.foldername(name))[1]));
create policy "user delete memorias-out" on storage.objects
  for delete using (bucket_id = 'memorias-out' and (auth.uid()::text = (storage.foldername(name))[1]));

-- memorias-firmadas
drop policy if exists "user select memorias-firmadas" on storage.objects;
drop policy if exists "user insert memorias-firmadas" on storage.objects;
drop policy if exists "user update memorias-firmadas" on storage.objects;
drop policy if exists "user delete memorias-firmadas" on storage.objects;
create policy "user select memorias-firmadas" on storage.objects
  for select using (bucket_id = 'memorias-firmadas' and (auth.uid()::text = (storage.foldername(name))[1]));
create policy "user insert memorias-firmadas" on storage.objects
  for insert with check (bucket_id = 'memorias-firmadas' and (auth.uid()::text = (storage.foldername(name))[1]));
create policy "user update memorias-firmadas" on storage.objects
  for update using (bucket_id = 'memorias-firmadas' and (auth.uid()::text = (storage.foldername(name))[1]));
create policy "user delete memorias-firmadas" on storage.objects
  for delete using (bucket_id = 'memorias-firmadas' and (auth.uid()::text = (storage.foldername(name))[1]));

-- Trigger: actualizar projects.size_bytes
create or replace function public.update_project_size()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op in ('INSERT','UPDATE') and new.project_id is not null then
    update public.projects
      set size_bytes = coalesce((select sum(size_bytes) from public.files where project_id = new.project_id), 0),
          updated_at = now()
      where id = new.project_id;
  end if;
  if tg_op = 'DELETE' and old.project_id is not null then
    update public.projects
      set size_bytes = coalesce((select sum(size_bytes) from public.files where project_id = old.project_id), 0),
          updated_at = now()
      where id = old.project_id;
  end if;
  return coalesce(new, old);
end $$;

drop trigger if exists files_update_project_size on public.files;
create trigger files_update_project_size
  after insert or update or delete on public.files
  for each row execute function public.update_project_size();

-- ============================================================
-- Verificación rápida:
-- select id, name, project_type, material_main, size_bytes from public.projects limit 5;
-- select id, type, category, external_storage_provider from public.files limit 5;
-- select user_id, theme, professional_type, struxai_cloud_optin from public.user_settings limit 5;
-- ============================================================
