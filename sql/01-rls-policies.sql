-- RLS policies idempotentes para STRUXAI App.
-- Pegar y ejecutar en https://supabase.com/dashboard/project/wlxnehlpkpfmlgaythng/sql
--
-- Cubre:
--  1) public.files — cada user solo ve/inserta sus propios files
--  2) storage.objects para cad-uploads — cada user solo escribe en su carpeta uid()
--  3) storage.objects para rvt-uploads — idem
--
-- Es idempotente: cada policy se borra (drop if exists) antes de crearla,
-- así puedes correr este script N veces sin romper nada.

-- =====================
-- public.files
-- =====================
alter table public.files enable row level security;

drop policy if exists "users insert own files" on public.files;
create policy "users insert own files"
  on public.files for insert
  to authenticated
  with check (user_id = auth.uid());

drop policy if exists "users read own files" on public.files;
create policy "users read own files"
  on public.files for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists "users update own files" on public.files;
create policy "users update own files"
  on public.files for update
  to authenticated
  using (user_id = auth.uid());

drop policy if exists "users delete own files" on public.files;
create policy "users delete own files"
  on public.files for delete
  to authenticated
  using (user_id = auth.uid());

-- =====================
-- storage.objects · bucket cad-uploads
-- Estructura de paths: cad-uploads/<auth.uid>/<timestamp>-<filename>
-- =====================
drop policy if exists "cad-uploads users insert" on storage.objects;
create policy "cad-uploads users insert"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'cad-uploads'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "cad-uploads users read" on storage.objects;
create policy "cad-uploads users read"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'cad-uploads'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "cad-uploads users delete" on storage.objects;
create policy "cad-uploads users delete"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'cad-uploads'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- =====================
-- storage.objects · bucket rvt-uploads
-- =====================
drop policy if exists "rvt-uploads users insert" on storage.objects;
create policy "rvt-uploads users insert"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'rvt-uploads'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "rvt-uploads users read" on storage.objects;
create policy "rvt-uploads users read"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'rvt-uploads'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "rvt-uploads users delete" on storage.objects;
create policy "rvt-uploads users delete"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'rvt-uploads'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Verificación rápida: lista las policies aplicadas
select schemaname, tablename, policyname
from pg_policies
where (schemaname = 'public' and tablename = 'files')
   or (schemaname = 'storage' and tablename = 'objects' and policyname like '%uploads%')
order by schemaname, tablename, policyname;
